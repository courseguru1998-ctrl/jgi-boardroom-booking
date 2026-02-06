// =============================================================================
// FRONTEND VALIDATION UTILITIES
// Professional-grade validation for JGI Boardroom Booking System
// =============================================================================

// -----------------------------------------------------------------------------
// Validation Rules Configuration (should match backend)
// -----------------------------------------------------------------------------

export const VALIDATION_RULES = {
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  },
  name: {
    minLength: 1,
    maxLength: 100,
  },
  email: {
    maxLength: 254,
  },
  booking: {
    minDurationMinutes: 15,
    maxDurationHours: 8,
    maxAdvanceBookingDays: 90,
    businessHoursStart: 7, // 7 AM
    businessHoursEnd: 21, // 9 PM
    maxTitleLength: 200,
    maxDescriptionLength: 2000,
    maxAttendees: 50,
  },
  room: {
    minNameLength: 2,
    maxNameLength: 100,
    minCapacity: 1,
    maxCapacity: 500,
  },
} as const;

// -----------------------------------------------------------------------------
// Validation Result Types
// -----------------------------------------------------------------------------

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FieldValidation {
  value: string;
  touched: boolean;
  error: string | null;
  isValid: boolean;
}

// -----------------------------------------------------------------------------
// Email Validation
// -----------------------------------------------------------------------------

const BLOCKED_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwaway.com',
  'mailinator.com',
  'guerrillamail.com',
  'fakeinbox.com',
  '10minutemail.com',
  'trashmail.com',
];

export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length > VALIDATION_RULES.email.maxLength) {
    return { isValid: false, error: 'Email address is too long' };
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  const domain = trimmedEmail.split('@')[1];
  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
    return { isValid: false, error: 'Please use a non-disposable email address' };
  }

  return { isValid: true };
}

// -----------------------------------------------------------------------------
// Password Validation
// -----------------------------------------------------------------------------

const WEAK_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'abc12345',
  'password1',
  'iloveyou',
  'trustno1',
  'sunshine',
];

export interface PasswordStrength {
  score: number; // 0-5
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  feedback: string[];
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  const { minLength, maxLength } = VALIDATION_RULES.password;

  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters` };
  }

  if (password.length > maxLength) {
    return { isValid: false, error: `Password cannot exceed ${maxLength} characters` };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z)' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter (a-z)' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number (0-9)' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*...)' };
  }

  if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
    return { isValid: false, error: 'This password is too common. Please choose a stronger password.' };
  }

  if (/(.)\1{2,}/.test(password)) {
    return { isValid: false, error: 'Password cannot contain more than 2 repeated characters in a row' };
  }

  return { isValid: true };
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      color: '#ef4444',
      feedback: ['Enter a password'],
    };
  }

  // Length scoring
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 0.5;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 0.5;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 0.5;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 0.5;
  else feedback.push('Add special characters');

  // Penalty for common patterns
  if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common passwords');
  }

  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid repeated characters');
  }

  // Normalize score to 0-5
  score = Math.min(5, Math.round(score));

  const strengthMap: Record<number, { label: PasswordStrength['label']; color: string }> = {
    0: { label: 'Very Weak', color: '#ef4444' },
    1: { label: 'Weak', color: '#f97316' },
    2: { label: 'Fair', color: '#eab308' },
    3: { label: 'Strong', color: '#22c55e' },
    4: { label: 'Very Strong', color: '#16a34a' },
    5: { label: 'Very Strong', color: '#16a34a' },
  };

  return {
    score,
    ...strengthMap[score],
    feedback: feedback.length > 0 ? feedback : ['Great password!'],
  };
}

// -----------------------------------------------------------------------------
// Name Validation
// -----------------------------------------------------------------------------

export function validateName(name: string, fieldName = 'Name'): ValidationResult {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > VALIDATION_RULES.name.maxLength) {
    return { isValid: false, error: `${fieldName} cannot exceed ${VALIDATION_RULES.name.maxLength} characters` };
  }

  // Only allow letters, spaces, hyphens, apostrophes, and periods
  if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`,
    };
  }

  return { isValid: true };
}

// -----------------------------------------------------------------------------
// Booking Validation
// -----------------------------------------------------------------------------

export function validateBookingTitle(title: string): ValidationResult {
  if (!title || title.trim() === '') {
    return { isValid: false, error: 'Title is required' };
  }

  if (title.trim().length < 3) {
    return { isValid: false, error: 'Title must be at least 3 characters' };
  }

  if (title.length > VALIDATION_RULES.booking.maxTitleLength) {
    return { isValid: false, error: `Title cannot exceed ${VALIDATION_RULES.booking.maxTitleLength} characters` };
  }

  return { isValid: true };
}

export function validateBookingTime(startTime: Date, endTime: Date): ValidationResult {
  const now = new Date();
  const minStart = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

  if (startTime < minStart) {
    return { isValid: false, error: 'Booking must start at least 5 minutes from now' };
  }

  if (endTime <= startTime) {
    return { isValid: false, error: 'End time must be after start time' };
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  if (durationMinutes < VALIDATION_RULES.booking.minDurationMinutes) {
    return {
      isValid: false,
      error: `Booking must be at least ${VALIDATION_RULES.booking.minDurationMinutes} minutes`,
    };
  }

  if (durationMinutes > VALIDATION_RULES.booking.maxDurationHours * 60) {
    return {
      isValid: false,
      error: `Booking cannot exceed ${VALIDATION_RULES.booking.maxDurationHours} hours`,
    };
  }

  // Check business hours
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();
  const endMinutes = endTime.getMinutes();

  const { businessHoursStart, businessHoursEnd } = VALIDATION_RULES.booking;

  if (startHour < businessHoursStart || startHour >= businessHoursEnd) {
    return {
      isValid: false,
      error: `Bookings must be within business hours (${businessHoursStart}:00 - ${businessHoursEnd}:00)`,
    };
  }

  if (endHour > businessHoursEnd || (endHour === businessHoursEnd && endMinutes > 0)) {
    return {
      isValid: false,
      error: `Bookings must end by ${businessHoursEnd}:00`,
    };
  }

  // Check advance booking limit
  const maxAdvanceDate = new Date();
  maxAdvanceDate.setDate(maxAdvanceDate.getDate() + VALIDATION_RULES.booking.maxAdvanceBookingDays);

  if (startTime > maxAdvanceDate) {
    return {
      isValid: false,
      error: `Cannot book more than ${VALIDATION_RULES.booking.maxAdvanceBookingDays} days in advance`,
    };
  }

  return { isValid: true };
}

export function validateAttendeeEmail(email: string, existingEmails: string[] = []): ValidationResult {
  const emailResult = validateEmail(email);
  if (!emailResult.isValid) {
    return emailResult;
  }

  if (existingEmails.map((e) => e.toLowerCase()).includes(email.toLowerCase())) {
    return { isValid: false, error: 'This attendee has already been added' };
  }

  return { isValid: true };
}

// -----------------------------------------------------------------------------
// Sanitization Utilities
// -----------------------------------------------------------------------------

export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

export function sanitizeForDisplay(input: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return input.replace(/[&<>"']/g, (char) => entities[char] || char);
}

// -----------------------------------------------------------------------------
// Form Validation Hook Helper
// -----------------------------------------------------------------------------

export function createFieldValidator<T>(
  validators: ((value: T) => ValidationResult)[]
): (value: T) => ValidationResult {
  return (value: T) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  };
}

// -----------------------------------------------------------------------------
// Debounce utility for real-time validation
// -----------------------------------------------------------------------------

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}
