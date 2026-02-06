import { z } from 'zod';

// Room configuration
export const ROOM_RULES = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_CAPACITY: 1,
  MAX_CAPACITY: 500,
  MAX_FLOOR_LENGTH: 20,
  MAX_BUILDING_LENGTH: 100,
  MAX_AMENITIES: 20,
} as const;

// Valid amenities list
export const VALID_AMENITIES = [
  'projector',
  'whiteboard',
  'video-conferencing',
  'audio-system',
  'tv-screen',
  'air-conditioning',
  'wifi',
  'phone',
  'printer',
  'coffee-machine',
  'water-dispenser',
  'natural-light',
  'accessibility',
  'standing-desk',
  'recording-equipment',
] as const;

// Sanitize string input
const sanitizeString = (str: string): string => {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
};

// Image URL validation
const imageUrlSchema = z
  .string()
  .url('Please enter a valid URL')
  .max(500, 'URL is too long')
  .refine(
    (url) => {
      // Only allow https URLs for security
      return url.startsWith('https://');
    },
    { message: 'Only HTTPS URLs are allowed for security' }
  )
  .refine(
    (url) => {
      // Check for common image extensions or known image hosting services
      const imagePattern = /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i;
      const imageHosts = ['imgur.com', 'cloudinary.com', 'unsplash.com', 'brandfetch.io', 'amazonaws.com', 'googleapis.com'];
      const isImageUrl = imagePattern.test(url);
      const isImageHost = imageHosts.some((host) => url.includes(host));
      return isImageUrl || isImageHost;
    },
    { message: 'URL must point to an image file (jpg, png, gif, webp, svg) or a trusted image hosting service' }
  )
  .optional()
  .nullable();

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(ROOM_RULES.MIN_NAME_LENGTH, `Room name must be at least ${ROOM_RULES.MIN_NAME_LENGTH} characters`)
    .max(ROOM_RULES.MAX_NAME_LENGTH, `Room name cannot exceed ${ROOM_RULES.MAX_NAME_LENGTH} characters`)
    .regex(
      /^[a-zA-Z0-9\s\-_\.]+$/,
      'Room name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
    )
    .transform((val) => sanitizeString(val)),
  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .min(ROOM_RULES.MIN_CAPACITY, `Capacity must be at least ${ROOM_RULES.MIN_CAPACITY}`)
    .max(ROOM_RULES.MAX_CAPACITY, `Capacity cannot exceed ${ROOM_RULES.MAX_CAPACITY}`),
  floor: z
    .string()
    .max(ROOM_RULES.MAX_FLOOR_LENGTH, `Floor cannot exceed ${ROOM_RULES.MAX_FLOOR_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9\-]+$/, 'Floor can only contain letters, numbers, and hyphens')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : val)),
  building: z
    .string()
    .max(ROOM_RULES.MAX_BUILDING_LENGTH, `Building name cannot exceed ${ROOM_RULES.MAX_BUILDING_LENGTH} characters`)
    .regex(
      /^[a-zA-Z0-9\s\-\.]+$/,
      'Building name can only contain letters, numbers, spaces, hyphens, and periods'
    )
    .optional()
    .transform((val) => (val ? sanitizeString(val) : val)),
  amenities: z
    .array(z.string().max(50))
    .max(ROOM_RULES.MAX_AMENITIES, `Cannot have more than ${ROOM_RULES.MAX_AMENITIES} amenities`)
    .default([]),
  imageUrl: imageUrlSchema,
  isActive: z.boolean().default(true),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .min(ROOM_RULES.MIN_NAME_LENGTH, `Room name must be at least ${ROOM_RULES.MIN_NAME_LENGTH} characters`)
    .max(ROOM_RULES.MAX_NAME_LENGTH, `Room name cannot exceed ${ROOM_RULES.MAX_NAME_LENGTH} characters`)
    .regex(
      /^[a-zA-Z0-9\s\-_\.]+$/,
      'Room name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
    )
    .transform((val) => sanitizeString(val))
    .optional(),
  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .min(ROOM_RULES.MIN_CAPACITY, `Capacity must be at least ${ROOM_RULES.MIN_CAPACITY}`)
    .max(ROOM_RULES.MAX_CAPACITY, `Capacity cannot exceed ${ROOM_RULES.MAX_CAPACITY}`)
    .optional(),
  floor: z
    .string()
    .max(ROOM_RULES.MAX_FLOOR_LENGTH, `Floor cannot exceed ${ROOM_RULES.MAX_FLOOR_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9\-]*$/, 'Floor can only contain letters, numbers, and hyphens')
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeString(val) : val)),
  building: z
    .string()
    .max(ROOM_RULES.MAX_BUILDING_LENGTH, `Building name cannot exceed ${ROOM_RULES.MAX_BUILDING_LENGTH} characters`)
    .regex(
      /^[a-zA-Z0-9\s\-\.]*$/,
      'Building name can only contain letters, numbers, spaces, hyphens, and periods'
    )
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeString(val) : val)),
  amenities: z
    .array(z.string().max(50))
    .max(ROOM_RULES.MAX_AMENITIES, `Cannot have more than ${ROOM_RULES.MAX_AMENITIES} amenities`)
    .optional(),
  imageUrl: imageUrlSchema,
  isActive: z.boolean().optional(),
});

export const roomFilterSchema = z.object({
  building: z.string().max(100).optional(),
  floor: z.string().max(20).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  minCapacity: z.coerce.number().int().min(1).optional(),
  maxCapacity: z.coerce.number().int().max(ROOM_RULES.MAX_CAPACITY).optional(),
  amenities: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').filter(Boolean) : undefined)),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const roomAvailabilitySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: 'Invalid date' }
    ),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type RoomFilterInput = z.infer<typeof roomFilterSchema>;
