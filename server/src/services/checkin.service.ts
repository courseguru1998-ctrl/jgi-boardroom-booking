import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';

export class CheckInService {
  /**
   * Check in to a booking
   */
  async checkIn(bookingId: string, userId: string) {
    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        attendees: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify the booking is confirmed
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestError('Cannot check in to a cancelled booking');
    }

    // Verify the user is authorized (organizer or attendee)
    const isOrganizer = booking.userId === userId;

    // Check if user is an attendee (by userId linkage)
    const isAttendee = booking.attendees.some((a) => a.userId === userId);

    if (!isOrganizer && !isAttendee) {
      throw new ForbiddenError('You are not authorized to check in to this booking');
    }

    // Verify it's the right time window (within 15 minutes before start to end of booking)
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const checkInWindowStart = new Date(startTime.getTime() - 15 * 60 * 1000); // 15 mins before

    if (now < checkInWindowStart) {
      throw new BadRequestError('Check-in is not available yet. You can check in 15 minutes before the meeting starts.');
    }

    if (now > endTime) {
      throw new BadRequestError('This booking has already ended');
    }

    // Check if already checked in
    const existingCheckIn = await prisma.bookingCheckIn.findUnique({
      where: {
        bookingId_userId: {
          bookingId,
          userId,
        },
      },
    });

    if (existingCheckIn) {
      throw new BadRequestError('You have already checked in to this booking');
    }

    // Create check-in record
    const checkIn = await prisma.bookingCheckIn.create({
      data: {
        bookingId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      id: checkIn.id,
      checkedInAt: checkIn.checkedInAt,
      user: checkIn.user,
    };
  }

  /**
   * Get check-in status for a booking
   */
  async getCheckInStatus(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        checkIns: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        attendees: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Calculate expected attendees (organizer + attendees)
    const totalExpected = 1 + booking.attendees.length;
    const totalCheckedIn = booking.checkIns.length;

    return {
      bookingId,
      totalExpected,
      totalCheckedIn,
      checkIns: booking.checkIns.map((c) => ({
        id: c.id,
        checkedInAt: c.checkedInAt,
        user: c.user,
      })),
    };
  }

  /**
   * Check if a user is checked in to a booking
   */
  async isUserCheckedIn(bookingId: string, userId: string): Promise<boolean> {
    const checkIn = await prisma.bookingCheckIn.findUnique({
      where: {
        bookingId_userId: {
          bookingId,
          userId,
        },
      },
    });

    return !!checkIn;
  }

  /**
   * Get user's check-ins for today
   */
  async getUserCheckInsToday(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkIns = await prisma.bookingCheckIn.findMany({
      where: {
        userId,
        checkedInAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        booking: {
          include: {
            room: true,
          },
        },
      },
      orderBy: {
        checkedInAt: 'desc',
      },
    });

    return checkIns.map((c) => ({
      id: c.id,
      checkedInAt: c.checkedInAt,
      booking: {
        id: c.booking.id,
        title: c.booking.title,
        roomName: c.booking.room.name,
        startTime: c.booking.startTime,
        endTime: c.booking.endTime,
      },
    }));
  }
}

export const checkInService = new CheckInService();
