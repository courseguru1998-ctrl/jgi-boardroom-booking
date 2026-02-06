import { Worker, Job } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { emailService } from '../services/email.service.js';
import { logger } from '../utils/logger.js';

let worker: Worker | null = null;

function formatDateTime(isoString: string): { date: string; time: string } {
  const date = new Date(isoString);
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

async function processJob(job: Job): Promise<void> {
  const { name, data } = job;

  logger.info(`Processing email job: ${name}`, { jobId: job.id });

  try {
    switch (name) {
      case 'booking-confirmation': {
        const start = formatDateTime(data.startTime);
        const end = formatDateTime(data.endTime);
        await emailService.send({
          to: data.userEmail,
          subject: `Booking Confirmed: ${data.title}`,
          template: 'booking-confirmation',
          bookingId: data.bookingId,
          context: {
            userName: data.userName,
            roomName: data.roomName,
            title: data.title,
            date: start.date,
            startTime: start.time,
            endTime: end.time,
          },
        });
        break;
      }

      case 'booking-cancellation': {
        const start = formatDateTime(data.startTime);
        const end = formatDateTime(data.endTime);
        await emailService.send({
          to: data.userEmail,
          subject: `Booking Cancelled: ${data.title}`,
          template: 'booking-cancellation',
          bookingId: data.bookingId,
          context: {
            userName: data.userName,
            roomName: data.roomName,
            title: data.title,
            date: start.date,
            startTime: start.time,
            endTime: end.time,
          },
        });
        break;
      }

      case 'attendee-invitation': {
        const start = formatDateTime(data.startTime);
        const end = formatDateTime(data.endTime);
        await emailService.send({
          to: data.attendeeEmail,
          subject: `Meeting Invitation: ${data.title}`,
          template: 'attendee-invitation',
          bookingId: data.bookingId,
          context: {
            attendeeName: data.attendeeName,
            organizerName: data.organizerName,
            roomName: data.roomName,
            title: data.title,
            date: start.date,
            startTime: start.time,
            endTime: end.time,
          },
        });
        break;
      }

      case 'booking-reminder': {
        const start = formatDateTime(data.startTime);
        const end = formatDateTime(data.endTime);
        await emailService.send({
          to: data.userEmail,
          subject: `Reminder: ${data.title} - ${data.reminderType === '24h' ? 'Tomorrow' : 'Starting Soon'}`,
          template: 'booking-reminder',
          bookingId: data.bookingId,
          context: {
            userName: data.userName,
            roomName: data.roomName,
            title: data.title,
            date: start.date,
            startTime: start.time,
            endTime: end.time,
            reminderTime: data.reminderType === '24h' ? '24 hours' : '1 hour',
          },
        });
        break;
      }

      default:
        logger.warn(`Unknown email job type: ${name}`);
    }
  } catch (error) {
    logger.error(`Failed to process email job ${name}:`, error);
    throw error;
  }
}

export function startEmailWorker(): void {
  const connection = getRedis();

  if (!connection) {
    logger.info('Email worker not started: Redis not available');
    return;
  }

  worker = new Worker('email', processJob, {
    connection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info(`Email job completed: ${job.name}`, { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error(`Email job failed: ${job?.name}`, { jobId: job?.id, error });
  });

  logger.info('Email worker started');
}

export async function stopEmailWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Email worker stopped');
  }
}
