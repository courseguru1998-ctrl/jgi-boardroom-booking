import rrule from 'rrule';
const { RRule } = rrule;
import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { emailQueue } from '../jobs/email.queue.js';
import { waitlistService } from './waitlist.service.js';
import { calendarService } from './calendar.service.js';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  BookingFilterInput,
} from '../validators/booking.validators.js';

export class BookingService {
  async create(userId: string, data: CreateBookingInput) {
    // Check room exists
    const room = await prisma.room.findUnique({
      where: { id: data.roomId, isActive: true },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    // Check for conflicts
    const hasConflict = await this.checkConflict(data.roomId, startTime, endTime);
    if (hasConflict) {
      throw new ConflictError('Room is already booked for this time slot');
    }

    // Create booking with attendees
    const booking = await prisma.booking.create({
      data: {
        userId,
        roomId: data.roomId,
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        recurrenceRule: data.recurrenceRule,
        attendees: {
          create: data.attendees.map((a) => ({
            email: a.email,
            name: a.name,
          })),
        },
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attendees: true,
      },
    });

    // Handle recurring bookings
    if (data.recurrenceRule) {
      await this.createRecurringInstances(booking);
    }

    // Queue confirmation email
    await emailQueue.addBookingConfirmation({
      bookingId: booking.id,
      userEmail: booking.user.email,
      userName: `${booking.user.firstName} ${booking.user.lastName}`,
      roomName: booking.room.name,
      title: booking.title,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    });

    // Queue attendee invitations
    for (const attendee of booking.attendees) {
      await emailQueue.addAttendeeInvitation({
        bookingId: booking.id,
        attendeeEmail: attendee.email,
        attendeeName: attendee.name,
        organizerName: `${booking.user.firstName} ${booking.user.lastName}`,
        roomName: booking.room.name,
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
      });
    }

    // Sync to external calendars
    try {
      await calendarService.syncBookingToCalendars(userId, booking.id, {
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime,
        endTime: booking.endTime,
        room: booking.room,
        attendees: booking.attendees,
      });
    } catch (error) {
      console.error('Failed to sync booking to calendars:', error);
    }

    return booking;
  }

  async findById(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attendees: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return {
      ...booking,
      googleEventId: booking.googleEventId,
      microsoftEventId: booking.microsoftEventId,
    };
  }

  async findAll(filters: BookingFilterInput) {
    const where: Record<string, unknown> = {};

    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate) {
      where.startTime = {
        ...((where.startTime as object) || {}),
        gte: new Date(`${filters.startDate}T00:00:00.000Z`),
      };
    }

    if (filters.endDate) {
      where.endTime = {
        ...((where.endTime as object) || {}),
        lte: new Date(`${filters.endDate}T23:59:59.999Z`),
      };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              capacity: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          attendees: true,
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { startTime: 'asc' },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findByUser(userId: string, filters: Omit<BookingFilterInput, 'userId'>) {
    return this.findAll({ ...filters, userId });
  }

  async update(id: string, userId: string, isAdmin: boolean, data: UpdateBookingInput) {
    const booking = await this.findById(id);

    // Authorization check
    if (booking.userId !== userId && !isAdmin) {
      throw new ForbiddenError('You can only modify your own bookings');
    }

    const startTime = data.startTime ? new Date(data.startTime) : booking.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : booking.endTime;

    // Check for conflicts if time changed
    if (data.startTime || data.endTime) {
      const hasConflict = await this.checkConflict(
        booking.roomId,
        startTime,
        endTime,
        id
      );
      if (hasConflict) {
        throw new ConflictError('Room is already booked for this time slot');
      }
    }

    // Update attendees if provided
    if (data.attendees) {
      await prisma.bookingAttendee.deleteMany({
        where: { bookingId: id },
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        ...(data.attendees && {
          attendees: {
            create: data.attendees.map((a) => ({
              email: a.email,
              name: a.name,
            })),
          },
        }),
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attendees: true,
      },
    });

    // Sync update to external calendars
    try {
      await calendarService.updateBookingInCalendars(
        booking.userId,
        id,
        booking.googleEventId,
        booking.microsoftEventId,
        {
          title: updatedBooking.title,
          description: updatedBooking.description,
          startTime: updatedBooking.startTime,
          endTime: updatedBooking.endTime,
          room: updatedBooking.room,
          attendees: updatedBooking.attendees,
        }
      );
    } catch (error) {
      console.error('Failed to update booking in calendars:', error);
    }

    return updatedBooking;
  }

  async cancel(id: string, userId: string, isAdmin: boolean) {
    const booking = await this.findById(id);

    // Authorization check
    if (booking.userId !== userId && !isAdmin) {
      throw new ForbiddenError('You can only cancel your own bookings');
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        attendees: true,
      },
    });

    // Queue cancellation emails
    await emailQueue.addBookingCancellation({
      bookingId: booking.id,
      userEmail: booking.user.email,
      userName: `${booking.user.firstName} ${booking.user.lastName}`,
      roomName: booking.room.name,
      title: booking.title,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    });

    // Notify waitlist users about the available slot
    try {
      await waitlistService.notifyWaitlist(
        booking.roomId,
        booking.startTime,
        booking.endTime
      );
    } catch (error) {
      console.error('Failed to notify waitlist:', error);
    }

    // Delete from external calendars
    try {
      await calendarService.deleteBookingFromCalendars(
        booking.userId,
        booking.googleEventId,
        booking.microsoftEventId
      );
    } catch (error) {
      console.error('Failed to delete booking from calendars:', error);
    }

    return updatedBooking;
  }

  private async checkConflict(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId,
        status: 'CONFIRMED',
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        OR: [
          {
            // New booking starts during existing booking
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            // New booking ends during existing booking
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            // New booking contains existing booking
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });

    return !!conflictingBooking;
  }

  private async createRecurringInstances(parentBooking: {
    id: string;
    userId: string;
    roomId: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    recurrenceRule: string | null;
  }) {
    if (!parentBooking.recurrenceRule) return;

    try {
      const rule = RRule.fromString(parentBooking.recurrenceRule);
      const duration =
        parentBooking.endTime.getTime() - parentBooking.startTime.getTime();

      // Get next occurrences (excluding first one which is the parent)
      const occurrences = rule.all((_, i) => i < 52); // Limit to 52 occurrences (1 year weekly)

      for (let i = 1; i < occurrences.length; i++) {
        const instanceStart = occurrences[i];
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        // Check for conflicts before creating
        const hasConflict = await this.checkConflict(
          parentBooking.roomId,
          instanceStart,
          instanceEnd
        );

        if (!hasConflict) {
          await prisma.booking.create({
            data: {
              userId: parentBooking.userId,
              roomId: parentBooking.roomId,
              title: parentBooking.title,
              description: parentBooking.description,
              startTime: instanceStart,
              endTime: instanceEnd,
              parentId: parentBooking.id,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to create recurring instances:', error);
    }
  }
}

export const bookingService = new BookingService();
