import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Label } from '@/components/common/Label';
import { PasswordStrengthIndicator } from '@/components/common/PasswordStrengthIndicator';
import { authApi } from '@/services/auth';
import { toast } from '@/hooks/useToast';
import { AxiosError } from 'axios';
import { Eye, EyeOff } from 'lucide-react';

// Blocked disposable email domains
const BLOCKED_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwaway.com',
  'mailinator.com',
  'guerrillamail.com',
  'fakeinbox.com',
  '10minutemail.com',
  'trashmail.com',
];

// Common weak passwords
const WEAK_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome',
];

const registerSchema = z
  .object({
    email: z
      .string()
      .email('Please enter a valid email address')
      .max(254, 'Email address is too long')
      .toLowerCase()
      .transform((val) => val.trim())
      .refine(
        (email) => {
          const domain = email.split('@')[1];
          return !BLOCKED_EMAIL_DOMAINS.includes(domain);
        },
        { message: 'Please use a non-disposable email address' }
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter (A-Z)')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter (a-z)')
      .regex(/[0-9]/, 'Password must contain at least one number (0-9)')
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        'Password must contain at least one special character (!@#$%^&*...)'
      )
      .refine(
        (password) => !WEAK_PASSWORDS.includes(password.toLowerCase()),
        { message: 'This password is too common. Please choose a stronger password.' }
      )
      .refine(
        (password) => !/(.)\1{2,}/.test(password),
        { message: 'Password cannot contain more than 2 repeated characters in a row' }
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name cannot exceed 100 characters')
      .regex(
        /^[a-zA-Z\s\-'\.]+$/,
        'First name can only contain letters, spaces, hyphens, apostrophes, and periods'
      )
      .transform((val) => val.trim()),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name cannot exceed 100 characters')
      .regex(
        /^[a-zA-Z\s\-'\.]+$/,
        'Last name can only contain letters, spaces, hyphens, apostrophes, and periods'
      )
      .transform((val) => val.trim()),
    department: z
      .string()
      .max(100, 'Department name cannot exceed 100 characters')
      .regex(
        /^[a-zA-Z0-9\s\-&]*$/,
        'Department can only contain letters, numbers, spaces, hyphens, and ampersands'
      )
      .optional()
      .transform((val) => (val ? val.trim() : val)),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
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

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const password = watch('password', '');

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast({
        title: 'Registration successful',
        description: 'You can now log in with your credentials',
        variant: 'success',
      });
      navigate('/login');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast({
        title: 'Registration failed',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword: _, ...submitData } = data;
    mutation.mutate(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            placeholder="John"
            error={errors.firstName?.message}
            autoComplete="given-name"
            {...register('firstName')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            error={errors.lastName?.message}
            autoComplete="family-name"
            {...register('lastName')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          autoComplete="email"
          {...register('email')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department (optional)</Label>
        <Input
          id="department"
          placeholder="Engineering"
          error={errors.department?.message}
          autoComplete="organization"
          {...register('department')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            error={errors.password?.message}
            autoComplete="new-password"
            className="pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <PasswordStrengthIndicator password={password} showRequirements={true} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            className="pr-10"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Create Account
        </Button>
      </div>

      <p className="text-center text-sm text-foreground-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
