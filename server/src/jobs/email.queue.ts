import { Queue } from 'bullmq';
import { getRedis } from '../config/redis.js';

const connection = getRedis();

// Only create queue if Redis is available
export const emailQueueInstance = connection
  ? new Queue('email', { connection })
  : null;

interface BookingEmailData {
  bookingId: string;
  userEmail: string;
  userName: string;
  roomName: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface AttendeeEmailData {
  bookingId: string;
  attendeeEmail: string;
  attendeeName: string | null;
  organizerName: string;
  roomName: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface ReminderEmailData {
  bookingId: string;
  userEmail: string;
  userName: string;
  roomName: string;
  title: string;
  startTime: string;
  endTime: string;
  reminderType: '24h' | '1h';
}

export const emailQueue = {
  async addBookingConfirmation(data: BookingEmailData) {
    if (!emailQueueInstance) {
      console.log('Email queue not available, skipping:', data);
      return;
    }
    await emailQueueInstance.add('booking-confirmation', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  },

  async addBookingCancellation(data: BookingEmailData) {
    if (!emailQueueInstance) {
      console.log('Email queue not available, skipping:', data);
      return;
    }
    await emailQueueInstance.add('booking-cancellation', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  },

  async addAttendeeInvitation(data: AttendeeEmailData) {
    if (!emailQueueInstance) {
      console.log('Email queue not available, skipping:', data);
      return;
    }
    await emailQueueInstance.add('attendee-invitation', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  },

  async addBookingReminder(data: ReminderEmailData) {
    if (!emailQueueInstance) {
      console.log('Email queue not available, skipping:', data);
      return;
    }
    await emailQueueInstance.add('booking-reminder', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  },
};
