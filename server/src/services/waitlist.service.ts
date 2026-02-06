import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { emailService } from './email.service.js';

export class WaitlistService {
  /**
   * Add user to waitlist for a room/time slot
   */
  async addToWaitlist(
    roomId: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ) {
    // Verify the room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Check if the slot is actually unavailable
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId,
        status: 'CONFIRMED',
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (!conflictingBooking) {
      throw new BadRequestError('This time slot is available. You can book directly.');
    }

    // Check if user already has a waitlist entry for this exact slot
    const existingEntry = await prisma.waitlistEntry.findFirst({
      where: {
        roomId,
        userId,
        startTime,
        endTime,
        status: 'WAITING',
      },
    });

    if (existingEntry) {
      throw new ConflictError('You are already on the waitlist for this time slot');
    }

    // Create waitlist entry
    const entry = await prisma.waitlistEntry.create({
      data: {
        roomId,
        userId,
        startTime,
        endTime,
      },
      include: {
        room: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return entry;
  }

  /**
   * Remove user from waitlist
   */
  async removeFromWaitlist(entryId: string, userId: string) {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('Waitlist entry not found');
    }

    if (entry.userId !== userId) {
      throw new BadRequestError('You can only remove your own waitlist entries');
    }

    await prisma.waitlistEntry.delete({
      where: { id: entryId },
    });

    return { success: true };
  }

  /**
   * Get user's waitlist entries
   */
  async getMyWaitlist(userId: string) {
    const entries = await prisma.waitlistEntry.findMany({
      where: {
        userId,
        status: { in: ['WAITING', 'NOTIFIED'] },
        startTime: { gte: new Date() }, // Only future entries
      },
      include: {
        room: {
          select: { id: true, name: true, building: true, floor: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return entries;
  }

  /**
   * Notify waitlist users when a slot becomes available
   * Called when a booking is cancelled
   */
  async notifyWaitlist(roomId: string, startTime: Date, endTime: Date) {
    // Find users waiting for this slot
    const waitingUsers = await prisma.waitlistEntry.findMany({
      where: {
        roomId,
        status: 'WAITING',
        AND: [
          { startTime: { lte: endTime } },
          { endTime: { gte: startTime } },
        ],
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        room: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'asc' }, // First come, first served
    });

    // Notify each user (mark as NOTIFIED)
    for (const entry of waitingUsers) {
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'NOTIFIED' },
      });

      // Send notification email
      try {
        await emailService.sendWaitlistNotification(
          entry.user.email,
          entry.user.firstName,
          entry.room.name,
          entry.startTime,
          entry.endTime
        );
      } catch (error) {
        console.error('Failed to send waitlist notification:', error);
      }
    }

    return waitingUsers.length;
  }

  /**
   * Mark entry as booked (when user books from waitlist)
   */
  async markAsBooked(entryId: string) {
    await prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'BOOKED' },
    });
  }

  /**
   * Clean up expired waitlist entries
   */
  async cleanupExpired() {
    const result = await prisma.waitlistEntry.updateMany({
      where: {
        status: { in: ['WAITING', 'NOTIFIED'] },
        startTime: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return result.count;
  }

  /**
   * Check if user is on waitlist for a slot
   */
  async isOnWaitlist(
    roomId: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const entry = await prisma.waitlistEntry.findFirst({
      where: {
        roomId,
        userId,
        status: { in: ['WAITING', 'NOTIFIED'] },
        startTime: { lte: endTime },
        endTime: { gte: startTime },
      },
    });

    return !!entry;
  }
}

export const waitlistService = new WaitlistService();
