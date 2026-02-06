import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { BadRequestError } from '../utils/errors.js';

type CalendarProvider = 'GOOGLE' | 'MICROSOFT';

// Microsoft token response type
interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

export class CalendarService {
  // Google Calendar
  getGoogleAuthUrl(userId: string): string {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new BadRequestError('Google Calendar integration not configured');
    }

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state: userId,
      prompt: 'consent',
    });
  }

  async handleGoogleCallback(code: string, userId: string) {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new BadRequestError('Google Calendar integration not configured');
    }

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    await prisma.calendarSync.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'GOOGLE',
        },
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
      },
      create: {
        userId,
        provider: 'GOOGLE',
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    return { success: true, provider: 'google' };
  }

  // Microsoft Calendar
  getMicrosoftAuthUrl(userId: string): string {
    if (!config.microsoft.clientId || !config.microsoft.clientSecret) {
      throw new BadRequestError('Microsoft Calendar integration not configured');
    }

    const params = new URLSearchParams({
      client_id: config.microsoft.clientId,
      response_type: 'code',
      redirect_uri: config.microsoft.redirectUri!,
      scope: 'offline_access Calendars.ReadWrite',
      state: userId,
    });

    return `https://login.microsoftonline.com/${config.microsoft.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  async handleMicrosoftCallback(code: string, userId: string) {
    if (!config.microsoft.clientId || !config.microsoft.clientSecret) {
      throw new BadRequestError('Microsoft Calendar integration not configured');
    }

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${config.microsoft.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.microsoft.clientId,
          client_secret: config.microsoft.clientSecret,
          code,
          redirect_uri: config.microsoft.redirectUri!,
          grant_type: 'authorization_code',
        }),
      }
    );

    const tokens = await tokenResponse.json() as MicrosoftTokenResponse;

    if (tokens.error) {
      throw new BadRequestError(`Microsoft auth failed: ${tokens.error_description || tokens.error}`);
    }

    await prisma.calendarSync.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'MICROSOFT',
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
      },
      create: {
        userId,
        provider: 'MICROSOFT',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return { success: true, provider: 'microsoft' };
  }

  async disconnect(userId: string, provider: CalendarProvider) {
    await prisma.calendarSync.updateMany({
      where: { userId, provider },
      data: { isActive: false },
    });

    return { success: true };
  }

  async getConnections(userId: string) {
    const connections = await prisma.calendarSync.findMany({
      where: { userId, isActive: true },
      select: {
        provider: true,
        createdAt: true,
      },
    });

    return connections;
  }

  // Refresh Google token if expired
  private async refreshGoogleToken(connection: {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }) {
    if (!connection.refreshToken) return connection.accessToken;

    // Check if token is expired or about to expire (within 5 minutes)
    if (connection.expiresAt && new Date(connection.expiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
      return connection.accessToken;
    }

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update stored tokens
    await prisma.calendarSync.update({
      where: {
        userId_provider: {
          userId: connection.userId,
          provider: 'GOOGLE',
        },
      },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    });

    return credentials.access_token!;
  }

  // Sync booking to external calendars (create)
  async syncBookingToCalendars(
    userId: string,
    bookingId: string,
    booking: {
      title: string;
      description: string | null;
      startTime: Date;
      endTime: Date;
      room: { name: string };
      attendees: { email: string; name: string | null }[];
    }
  ) {
    const connections = await prisma.calendarSync.findMany({
      where: { userId, isActive: true },
    });

    for (const connection of connections) {
      try {
        if (connection.provider === 'GOOGLE') {
          const eventId = await this.createGoogleEvent(connection, booking);
          if (eventId) {
            await prisma.booking.update({
              where: { id: bookingId },
              data: { googleEventId: eventId },
            });
          }
        } else if (connection.provider === 'MICROSOFT') {
          const eventId = await this.createMicrosoftEvent(connection, booking);
          if (eventId) {
            await prisma.booking.update({
              where: { id: bookingId },
              data: { microsoftEventId: eventId },
            });
          }
        }
      } catch (error) {
        console.error(`Failed to sync to ${connection.provider}:`, error);
      }
    }
  }

  // Update booking in external calendars
  async updateBookingInCalendars(
    userId: string,
    _bookingId: string,
    googleEventId: string | null,
    microsoftEventId: string | null,
    booking: {
      title: string;
      description: string | null;
      startTime: Date;
      endTime: Date;
      room: { name: string };
      attendees: { email: string; name: string | null }[];
    }
  ) {
    const connections = await prisma.calendarSync.findMany({
      where: { userId, isActive: true },
    });

    for (const connection of connections) {
      try {
        if (connection.provider === 'GOOGLE' && googleEventId) {
          await this.updateGoogleEvent(connection, googleEventId, booking);
        } else if (connection.provider === 'MICROSOFT' && microsoftEventId) {
          await this.updateMicrosoftEvent(connection, microsoftEventId, booking);
        }
      } catch (error) {
        console.error(`Failed to update in ${connection.provider}:`, error);
      }
    }
  }

  // Delete booking from external calendars
  async deleteBookingFromCalendars(
    userId: string,
    googleEventId: string | null,
    microsoftEventId: string | null
  ) {
    const connections = await prisma.calendarSync.findMany({
      where: { userId, isActive: true },
    });

    for (const connection of connections) {
      try {
        if (connection.provider === 'GOOGLE' && googleEventId) {
          await this.deleteGoogleEvent(connection, googleEventId);
        } else if (connection.provider === 'MICROSOFT' && microsoftEventId) {
          await this.deleteMicrosoftEvent(connection, microsoftEventId);
        }
      } catch (error) {
        console.error(`Failed to delete from ${connection.provider}:`, error);
      }
    }
  }

  private async createGoogleEvent(
    connection: {
      id: string;
      userId: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
    },
    booking: {
      title: string;
      description: string | null;
      startTime: Date;
      endTime: Date;
      room: { name: string };
      attendees: { email: string; name: string | null }[];
    }
  ): Promise<string | null> {
    const accessToken = await this.refreshGoogleToken(connection);

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: booking.title,
        description: `${booking.description || ''}\n\nRoom: ${booking.room.name}`,
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: booking.attendees.map((a) => ({ email: a.email })),
      },
    });

    return response.data.id || null;
  }

  private async updateGoogleEvent(
    connection: {
      id: string;
      userId: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
    },
    eventId: string,
    booking: {
      title: string;
      description: string | null;
      startTime: Date;
      endTime: Date;
      room: { name: string };
      attendees: { email: string; name: string | null }[];
    }
  ) {
    const accessToken = await this.refreshGoogleToken(connection);

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: booking.title,
        description: `${booking.description || ''}\n\nRoom: ${booking.room.name}`,
        start: {
          dateTime: booking.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: booking.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: booking.attendees.map((a) => ({ email: a.email })),
      },
    });
  }

  private async deleteGoogleEvent(
    connection: {
      id: string;
      userId: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
    },
    eventId: string
  ) {
    const accessToken = await this.refreshGoogleToken(connection);

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }

  private async createMicrosoftEvent(
    connection: {
      accessToken: string;
    },
    booking: {
      title: string;
      description: string | null;
      startTime: Date;
      endTime: Date;
      room: { name: string };
      attendees: { email: string; name: string | null }[];
    }
  ): Promise<string | null> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, connection.accessToken);
      },
    });

    const response = await client.api('/me/events').post({
      subject: booking.title,
      body: {
        contentType: 'Text',
        content: `${booking.description || ''}\n\nRoom: ${booking.room.name}`,
      },
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: booking.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: 'required',
      })),
    });

    return response.id || null;
  }

  private async updateMicrosoftEvent(
    connection: {
      accessToken: string;
    },
    eventId: string,
    booking: {
      title: string;
      description: string | null;
      startTime: Date;
      endTime: Date;
      room: { name: string };
      attendees: { email: string; name: string | null }[];
    }
  ) {
    const client = Client.init({
      authProvider: (done) => {
        done(null, connection.accessToken);
      },
    });

    await client.api(`/me/events/${eventId}`).patch({
      subject: booking.title,
      body: {
        contentType: 'Text',
        content: `${booking.description || ''}\n\nRoom: ${booking.room.name}`,
      },
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: booking.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: 'required',
      })),
    });
  }

  private async deleteMicrosoftEvent(
    connection: {
      accessToken: string;
    },
    eventId: string
  ) {
    const client = Client.init({
      authProvider: (done) => {
        done(null, connection.accessToken);
      },
    });

    await client.api(`/me/events/${eventId}`).delete();
  }
}

export const calendarService = new CalendarService();
