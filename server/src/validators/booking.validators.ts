import { z } from 'zod';

// Business rules configuration
export const BOOKING_RULES = {
  MIN_DURATION_MINUTES: 15,
  MAX_DURATION_HOURS: 8,
  MAX_ADVANCE_BOOKING_DAYS: 90,
  BUSINESS_HOURS_START: 7, // 7 AM
  BUSINESS_HOURS_END: 21, // 9 PM
  MAX_ATTENDEES: 50,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;

// Helper to check if time is within business hours
const isWithinBusinessHours = (date: Date): boolean => {
  const hours = date.getHours();
  return hours >= BOOKING_RULES.BUSINESS_HOURS_START && hours < BOOKING_RULES.BUSINESS_HOURS_END;
};

// Helper to check if booking is not too far in advance
const isWithinAdvanceLimit = (date: Date): boolean => {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + BOOKING_RULES.MAX_ADVANCE_BOOKING_DAYS);
  return date <= maxDate;
};

// Helper to calculate duration in minutes
const getDurationMinutes = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / (1000 * 60);
};

// Sanitize string input - remove potential XSS
const sanitizeString = (str: string): string => {
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
        '&': '&amp;',
      };
      return entities[char] || char;
    })
    .trim();
};

// Custom Zod transformer for sanitized strings with min length
const sanitizedStringWithMin = (minLength: number, maxLength: number, minMessage: string) =>
  z
    .string()
    .min(minLength, minMessage)
    .max(maxLength)
    .transform((val) => sanitizeString(val));

// Custom Zod transformer for sanitized strings without min
const sanitizedStringOptional = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .transform((val) => sanitizeString(val));

// Email validation with common patterns
const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(254, 'Email is too long')
  .toLowerCase()
  .refine(
    (email) => {
      // Block obviously fake/temporary email domains
      const blockedDomains = ['tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com'];
      const domain = email.split('@')[1];
      return !blockedDomains.includes(domain);
    },
    { message: 'Please use a valid email address' }
  );

// Attendee schema with validation
const attendeeSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .max(100, 'Name is too long')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : val)),
});

export const createBookingSchema = z
  .object({
    roomId: z.string().uuid('Invalid room ID format'),
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(BOOKING_RULES.MAX_TITLE_LENGTH, `Title cannot exceed ${BOOKING_RULES.MAX_TITLE_LENGTH} characters`)
      .transform((val) => sanitizeString(val)),
    description: z
      .string()
      .max(BOOKING_RULES.MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${BOOKING_RULES.MAX_DESCRIPTION_LENGTH} characters`)
      .optional()
      .transform((val) => (val ? sanitizeString(val) : val)),
    startTime: z.string().datetime('Invalid start time format (ISO 8601 required)'),
    endTime: z.string().datetime('Invalid end time format (ISO 8601 required)'),
    recurrenceRule: z
      .string()
      .max(500, 'Recurrence rule is too long')
      .regex(/^RRULE:/i, 'Invalid recurrence rule format')
      .optional(),
    attendees: z
      .array(attendeeSchema)
      .max(BOOKING_RULES.MAX_ATTENDEES, `Cannot have more than ${BOOKING_RULES.MAX_ATTENDEES} attendees`)
      .default([]),
  })
  // Validate end time is after start time
  .refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    { message: 'End time must be after start time', path: ['endTime'] }
  )
  // Validate start time is in the future
  .refine(
    (data) => {
      const startTime = new Date(data.startTime);
      const now = new Date();
      // Allow bookings starting at least 5 minutes from now
      now.setMinutes(now.getMinutes() + 5);
      return startTime >= now;
    },
    { message: 'Booking must start at least 5 minutes from now', path: ['startTime'] }
  )
  // Validate minimum duration
  .refine(
    (data) => {
      const duration = getDurationMinutes(new Date(data.startTime), new Date(data.endTime));
      return duration >= BOOKING_RULES.MIN_DURATION_MINUTES;
    },
    { message: `Booking must be at least ${BOOKING_RULES.MIN_DURATION_MINUTES} minutes`, path: ['endTime'] }
  )
  // Validate maximum duration
  .refine(
    (data) => {
      const duration = getDurationMinutes(new Date(data.startTime), new Date(data.endTime));
      return duration <= BOOKING_RULES.MAX_DURATION_HOURS * 60;
    },
    { message: `Booking cannot exceed ${BOOKING_RULES.MAX_DURATION_HOURS} hours`, path: ['endTime'] }
  )
  // Validate within business hours
  .refine(
    (data) => {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      return isWithinBusinessHours(startTime) && isWithinBusinessHours(endTime);
    },
    {
      message: `Bookings must be within business hours (${BOOKING_RULES.BUSINESS_HOURS_START}:00 - ${BOOKING_RULES.BUSINESS_HOURS_END}:00)`,
      path: ['startTime'],
    }
  )
  // Validate not too far in advance
  .refine(
    (data) => isWithinAdvanceLimit(new Date(data.startTime)),
    {
      message: `Cannot book more than ${BOOKING_RULES.MAX_ADVANCE_BOOKING_DAYS} days in advance`,
      path: ['startTime'],
    }
  )
  // Validate no duplicate attendee emails
  .refine(
    (data) => {
      const emails = data.attendees.map((a) => a.email.toLowerCase());
      return new Set(emails).size === emails.length;
    },
    { message: 'Duplicate attendee emails are not allowed', path: ['attendees'] }
  );

export const updateBookingSchema = z
  .object({
    title: sanitizedStringWithMin(3, BOOKING_RULES.MAX_TITLE_LENGTH, 'Title must be at least 3 characters').optional(),
    description: sanitizedStringOptional(BOOKING_RULES.MAX_DESCRIPTION_LENGTH).optional().nullable(),
    startTime: z.string().datetime('Invalid start time format').optional(),
    endTime: z.string().datetime('Invalid end time format').optional(),
    attendees: z
      .array(attendeeSchema)
      .max(BOOKING_RULES.MAX_ATTENDEES, `Cannot have more than ${BOOKING_RULES.MAX_ATTENDEES} attendees`)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime);
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endTime'] }
  )
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const duration = getDurationMinutes(new Date(data.startTime), new Date(data.endTime));
        return duration >= BOOKING_RULES.MIN_DURATION_MINUTES;
      }
      return true;
    },
    { message: `Booking must be at least ${BOOKING_RULES.MIN_DURATION_MINUTES} minutes`, path: ['endTime'] }
  )
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const duration = getDurationMinutes(new Date(data.startTime), new Date(data.endTime));
        return duration <= BOOKING_RULES.MAX_DURATION_HOURS * 60;
      }
      return true;
    },
    { message: `Booking cannot exceed ${BOOKING_RULES.MAX_DURATION_HOURS} hours`, path: ['endTime'] }
  )
  .refine(
    (data) => {
      if (data.attendees) {
        const emails = data.attendees.map((a) => a.email.toLowerCase());
        return new Set(emails).size === emails.length;
      }
      return true;
    },
    { message: 'Duplicate attendee emails are not allowed', path: ['attendees'] }
  );

export const bookingFilterSchema = z.object({
  roomId: z.string().uuid('Invalid room ID format').optional(),
  userId: z.string().uuid('Invalid user ID format').optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: 'Invalid date' }
    ),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: 'Invalid date' }
    ),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'PENDING'], {
    errorMap: () => ({ message: 'Status must be CONFIRMED, CANCELLED, or PENDING' }),
  }).optional(),
  page: z.coerce
    .number()
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>;
