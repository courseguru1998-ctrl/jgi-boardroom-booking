import { Worker, Job, Queue } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { emailQueue } from './email.queue.js';
import { logger } from '../utils/logger.js';

let worker: Worker | null = null;
let reminderQueue: Queue | null = null;

async function processReminderCheck(_job: Job): Promise<void> {
  const now = new Date();

  // Find bookings starting in the next hour (for 1h reminders)
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const oneHourFifteenFromNow = new Date(now.getTime() + 75 * 60 * 1000);

  const upcomingIn1h = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      startTime: {
        gte: oneHourFromNow,
        lt: oneHourFifteenFromNow,
      },
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      room: {
        select: {
          name: true,
        },
      },
      attendees: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  // Find bookings starting in 24 hours (for 24h reminders)
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twentyFourHoursFifteenFromNow = new Date(
    now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000
  );

  const upcomingIn24h = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      startTime: {
        gte: twentyFourHoursFromNow,
        lt: twentyFourHoursFifteenFromNow,
      },
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      room: {
        select: {
          name: true,
        },
      },
      attendees: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  // Queue 1h reminder emails
  for (const booking of upcomingIn1h) {
    // Send to organizer
    await emailQueue.addBookingReminder({
      bookingId: booking.id,
      userEmail: booking.user.email,
      userName: `${booking.user.firstName} ${booking.user.lastName}`,
      roomName: booking.room.name,
      title: booking.title,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      reminderType: '1h',
    });

    // Send to attendees
    for (const attendee of booking.attendees) {
      await emailQueue.addBookingReminder({
        bookingId: booking.id,
        userEmail: attendee.email,
        userName: attendee.name || attendee.email.split('@')[0],
        roomName: booking.room.name,
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        reminderType: '1h',
      });
    }
  }

  // Queue 24h reminder emails
  for (const booking of upcomingIn24h) {
    // Send to organizer
    await emailQueue.addBookingReminder({
      bookingId: booking.id,
      userEmail: booking.user.email,
      userName: `${booking.user.firstName} ${booking.user.lastName}`,
      roomName: booking.room.name,
      title: booking.title,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      reminderType: '24h',
    });

    // Send to attendees
    for (const attendee of booking.attendees) {
      await emailQueue.addBookingReminder({
        bookingId: booking.id,
        userEmail: attendee.email,
        userName: attendee.name || attendee.email.split('@')[0],
        roomName: booking.room.name,
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        reminderType: '24h',
      });
    }
  }

  logger.info(
    `Processed reminders: ${upcomingIn1h.length} (1h), ${upcomingIn24h.length} (24h)`
  );
}

export function startReminderWorker(): void {
  const connection = getRedis();

  reminderQueue = new Queue('reminder-check', { connection });

  // Schedule reminder checks every 15 minutes
  reminderQueue.add(
    'check-reminders',
    {},
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes
      },
    }
  );

  worker = new Worker('reminder-check', processReminderCheck, {
    connection,
    concurrency: 1,
  });

  worker.on('completed', (job) => {
    logger.debug(`Reminder check completed`, { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error(`Reminder check failed`, { jobId: job?.id, error });
  });

  logger.info('Reminder worker started');
}

export async function stopReminderWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (reminderQueue) {
    await reminderQueue.close();
    reminderQueue = null;
  }
  logger.info('Reminder worker stopped');
}
