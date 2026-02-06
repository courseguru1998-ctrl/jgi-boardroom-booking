import sgMail from '@sendgrid/mail';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

interface EmailData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  bookingId?: string;
}

export class EmailService {
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates');

    const templateFiles = [
      'booking-confirmation',
      'booking-reminder',
      'booking-cancellation',
      'attendee-invitation',
    ];

    for (const templateName of templateFiles) {
      try {
        const templatePath = path.join(templatesDir, `${templateName}.hbs`);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.templates.set(templateName, Handlebars.compile(templateContent));
        }
      } catch (error) {
        logger.warn(`Failed to load template ${templateName}:`, error);
      }
    }
  }

  async send(data: EmailData): Promise<boolean> {
    const { to, subject, template, context, bookingId } = data;

    try {
      let html: string;

      const compiledTemplate = this.templates.get(template);
      if (compiledTemplate) {
        html = compiledTemplate(context);
      } else {
        // Fallback to basic HTML
        html = this.generateFallbackHtml(template, context);
      }

      if (!config.sendgrid.apiKey) {
        logger.info(`[DEV] Email would be sent to ${to}: ${subject}`);
        logger.debug('Email content:', html);
        return true;
      }

      await sgMail.send({
        to,
        from: {
          email: config.sendgrid.fromEmail,
          name: config.sendgrid.fromName,
        },
        subject,
        html,
      });

      // Log successful send
      await prisma.emailLog.create({
        data: {
          bookingId,
          to,
          subject,
          template,
          status: 'sent',
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);

      // Log failed send
      await prisma.emailLog.create({
        data: {
          bookingId,
          to,
          subject,
          template,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return false;
    }
  }

  private generateFallbackHtml(
    template: string,
    context: Record<string, unknown>
  ): string {
    switch (template) {
      case 'booking-confirmation':
        return `
          <h1>Booking Confirmed</h1>
          <p>Hello ${context.userName},</p>
          <p>Your booking has been confirmed:</p>
          <ul>
            <li><strong>Room:</strong> ${context.roomName}</li>
            <li><strong>Title:</strong> ${context.title}</li>
            <li><strong>Date:</strong> ${context.date}</li>
            <li><strong>Time:</strong> ${context.startTime} - ${context.endTime}</li>
          </ul>
          <p>Thank you for using Boardroom Booking!</p>
        `;

      case 'booking-reminder':
        return `
          <h1>Booking Reminder</h1>
          <p>Hello ${context.userName},</p>
          <p>This is a reminder for your upcoming booking:</p>
          <ul>
            <li><strong>Room:</strong> ${context.roomName}</li>
            <li><strong>Title:</strong> ${context.title}</li>
            <li><strong>Date:</strong> ${context.date}</li>
            <li><strong>Time:</strong> ${context.startTime} - ${context.endTime}</li>
          </ul>
        `;

      case 'booking-cancellation':
        return `
          <h1>Booking Cancelled</h1>
          <p>Hello ${context.userName},</p>
          <p>Your booking has been cancelled:</p>
          <ul>
            <li><strong>Room:</strong> ${context.roomName}</li>
            <li><strong>Title:</strong> ${context.title}</li>
            <li><strong>Date:</strong> ${context.date}</li>
            <li><strong>Time:</strong> ${context.startTime} - ${context.endTime}</li>
          </ul>
        `;

      case 'attendee-invitation':
        return `
          <h1>Meeting Invitation</h1>
          <p>Hello${context.attendeeName ? ` ${context.attendeeName}` : ''},</p>
          <p>You have been invited to a meeting by ${context.organizerName}:</p>
          <ul>
            <li><strong>Room:</strong> ${context.roomName}</li>
            <li><strong>Title:</strong> ${context.title}</li>
            <li><strong>Date:</strong> ${context.date}</li>
            <li><strong>Time:</strong> ${context.startTime} - ${context.endTime}</li>
          </ul>
        `;

      case 'waitlist-notification':
        return `
          <h1>Room Available!</h1>
          <p>Hello ${context.userName},</p>
          <p>Great news! A time slot you were waiting for is now available:</p>
          <ul>
            <li><strong>Room:</strong> ${context.roomName}</li>
            <li><strong>Date:</strong> ${context.date}</li>
            <li><strong>Time:</strong> ${context.startTime} - ${context.endTime}</li>
          </ul>
          <p>Book quickly before someone else takes it!</p>
          <p><a href="${context.bookingUrl}">Book Now</a></p>
        `;

      default:
        return `<pre>${JSON.stringify(context, null, 2)}</pre>`;
    }
  }

  async sendWaitlistNotification(
    email: string,
    userName: string,
    roomName: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    return this.send({
      to: email,
      subject: `Room Now Available: ${roomName}`,
      template: 'waitlist-notification',
      context: {
        userName,
        roomName,
        date: formatDate(startTime),
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        bookingUrl: `${config.frontendUrl}/calendar`,
      },
    });
  }
}

export const emailService = new EmailService();
