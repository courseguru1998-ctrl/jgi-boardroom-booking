import { z } from 'zod';

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
} as const;

// Sanitize string input
const sanitizeString = (str: string): string => {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
};

// Common weak passwords to block
const WEAK_PASSWORDS = [
  'password', 'password123', '12345678', 'qwerty123', 'admin123',
  'letmein', 'welcome', 'monkey', 'dragon', 'master',
  'abc12345', 'password1', 'iloveyou', 'trustno1', 'sunshine',
];

// Password schema with comprehensive validation
const passwordSchema = z
  .string()
  .min(PASSWORD_REQUIREMENTS.MIN_LENGTH, `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`)
  .max(PASSWORD_REQUIREMENTS.MAX_LENGTH, `Password cannot exceed ${PASSWORD_REQUIREMENTS.MAX_LENGTH} characters`)
  .refine(
    (password) => /[A-Z]/.test(password),
    { message: 'Password must contain at least one uppercase letter (A-Z)' }
  )
  .refine(
    (password) => /[a-z]/.test(password),
    { message: 'Password must contain at least one lowercase letter (a-z)' }
  )
  .refine(
    (password) => /[0-9]/.test(password),
    { message: 'Password must contain at least one number (0-9)' }
  )
  .refine(
    (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    { message: 'Password must contain at least one special character (!@#$%^&*...)' }
  )
  .refine(
    (password) => !WEAK_PASSWORDS.includes(password.toLowerCase()),
    { message: 'This password is too common. Please choose a stronger password.' }
  )
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    { message: 'Password cannot contain more than 2 repeated characters in a row' }
  );

// Email validation
const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(254, 'Email address is too long')
  .toLowerCase()
  .transform((val) => val.trim())
  .refine(
    (email) => {
      // Block disposable email domains
      const blockedDomains = [
        'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
        'fakeinbox.com', '10minutemail.com', 'trashmail.com',
      ];
      const domain = email.split('@')[1];
      return !blockedDomains.includes(domain);
    },
    { message: 'Please use a non-disposable email address' }
  );

// Name validation - only letters, spaces, hyphens, apostrophes
const nameSchema = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .max(100, `${fieldName} cannot exceed 100 characters`)
    .regex(
      /^[a-zA-Z\s\-'\.]+$/,
      `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`
    )
    .transform((val) => sanitizeString(val));

// Department validation
const departmentSchema = z
  .string()
  .max(100, 'Department name cannot exceed 100 characters')
  .regex(
    /^[a-zA-Z0-9\s\-&]+$/,
    'Department can only contain letters, numbers, spaces, hyphens, and ampersands'
  )
  .optional()
  .transform((val) => (val ? sanitizeString(val) : val));

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: nameSchema('First name'),
    lastName: nameSchema('Last name'),
    department: departmentSchema,
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    { message: 'Passwords do not match', path: ['confirmPassword'] }
  )
  .refine(
    (data) => {
      // Password should not contain user's name or email
      const lowerPassword = data.password.toLowerCase();
      const lowerFirstName = data.firstName.toLowerCase();
      const lowerLastName = data.lastName.toLowerCase();
      const emailLocal = data.email.split('@')[0].toLowerCase();

      return (
        !lowerPassword.includes(lowerFirstName) &&
        !lowerPassword.includes(lowerLastName) &&
        !lowerPassword.includes(emailLocal)
      );
    },
    { message: 'Password cannot contain your name or email', path: ['password'] }
  );

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .transform((val) => val.trim()),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(PASSWORD_REQUIREMENTS.MAX_LENGTH, 'Invalid password'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
    .max(1000, 'Invalid refresh token'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(
    (data) => data.newPassword === data.confirmNewPassword,
    { message: 'New passwords do not match', path: ['confirmNewPassword'] }
  )
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    { message: 'New password must be different from current password', path: ['newPassword'] }
  );

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(
    (data) => data.newPassword === data.confirmNewPassword,
    { message: 'Passwords do not match', path: ['confirmNewPassword'] }
  );

export const updateProfileSchema = z.object({
  firstName: nameSchema('First name').optional(),
  lastName: nameSchema('Last name').optional(),
  department: departmentSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
