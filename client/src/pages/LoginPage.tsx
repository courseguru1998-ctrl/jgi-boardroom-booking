import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/common/Card';
import { LoginForm } from '@/components/auth/LoginForm';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuthStore } from '@/store/auth';

// Official Jain University logo from their website
const JAIN_LOGO_URL = 'https://www.jainuniversity.ac.in/jain/theme/assets/images/Jain-logo.png';

// Professional boardroom image
const BOARDROOM_IMAGE_URL = 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?q=80&w=2070&auto=format&fit=crop';

export function LoginPage() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding with Boardroom Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BOARDROOM_IMAGE_URL})` }}
        />

        {/* Navy Blue Overlay matching JGI colors */}
        <div className="absolute inset-0 bg-gradient-to-br from-jgi-blue/95 via-[#002366]/90 to-[#001040]/95" />

        {/* Decorative gold accents */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-jgi-gold rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-jgi-gold rounded-full blur-[100px]" />
        </div>

        {/* Content - Centered Logo and Tagline */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo Container */}
          <div className="bg-white p-8 rounded-3xl shadow-2xl mb-8 max-w-md">
            <img
              src={JAIN_LOGO_URL}
              alt="Jain University"
              className="w-full h-auto max-h-28 object-contain"
            />
          </div>

          {/* Gold accent line */}
          <div className="w-32 h-1.5 bg-gradient-to-r from-transparent via-jgi-gold to-transparent rounded-full mb-6" />

          {/* Simple Tagline */}
          <h2 className="text-4xl font-bold text-white text-center tracking-tight">
            Boardroom Booking
          </h2>
          <p className="text-jgi-gold/90 text-lg mt-3 font-medium">
            Reserve. Collaborate. Succeed.
          </p>
        </div>

        {/* Bottom decorative border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-jgi-gold to-transparent" />
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-4 py-8 relative">
        {/* Theme toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          {/* Mobile Logo - Only visible on small screens */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="bg-white dark:bg-card p-5 rounded-2xl shadow-lg border border-border mb-4 max-w-xs">
              <img
                src={JAIN_LOGO_URL}
                alt="Jain University"
                className="w-full h-auto max-h-16 object-contain"
              />
            </div>
            <p className="text-jgi-gold font-semibold text-lg">Boardroom Booking</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                <p className="text-foreground-muted mt-1">Sign in to your account to continue</p>
              </div>
              <LoginForm />
            </CardContent>
          </Card>

          <p className="text-center text-sm text-foreground-muted mt-6">
            &copy; {new Date().getFullYear()} Jain (Deemed-to-be University). All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
