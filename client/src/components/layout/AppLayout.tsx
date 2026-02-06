import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Home,
  Settings,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  BarChart3,
  Bell,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/common/Button';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { cn } from '@/utils/cn';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Rooms', href: '/rooms', icon: Building2 },
  { name: 'My Bookings', href: '/my-bookings', icon: Calendar },
  { name: 'Waitlist', href: '/waitlist', icon: Bell },
];

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Rooms', href: '/admin/rooms', icon: Building2 },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';

  // Get user initials for avatar
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border/50 lg:hidden transform transition-transform duration-300 ease-out-expo shadow-apple-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col items-center py-6 px-6 border-b border-border/50">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-foreground-muted" />
          </button>
          <div className="bg-white dark:bg-white/10 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-white/20 mb-2 w-full max-w-[200px]">
            <img
              src="https://www.jainuniversity.ac.in/jain/theme/assets/images/Jain-logo.png"
              alt="Jain University"
              className="w-full h-auto max-h-10 object-contain"
            />
          </div>
          <p className="text-xs text-jgi-gold font-semibold">Boardroom Booking</p>
        </div>
        <nav className="flex flex-col gap-1.5 p-5">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                location.pathname === item.href
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-foreground-secondary hover:bg-accent/10 hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-border/50" />
              <span className="px-4 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Admin
              </span>
              {adminNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground-secondary hover:bg-accent/10 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-border/50 bg-card px-6 pb-4">
          {/* Logo Section - HD Horizontal Logo */}
          <div className="flex flex-col items-center pt-6 pb-4 border-b border-border/50">
            <div className="bg-white dark:bg-white/10 p-4 rounded-2xl shadow-lg border border-gray-100 dark:border-white/20 mb-3 w-full">
              <img
                src="https://www.jainuniversity.ac.in/jain/theme/assets/images/Jain-logo.png"
                alt="Jain University"
                className="w-full h-auto max-h-12 object-contain"
              />
            </div>
            <p className="text-sm text-jgi-gold font-semibold">Boardroom Booking</p>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-8">
              <li>
                <ul className="space-y-1.5">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                          location.pathname === item.href
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-foreground-secondary hover:bg-accent/10 hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              {isAdmin && (
                <li>
                  <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider px-4 mb-3">
                    Admin
                  </div>
                  <ul className="space-y-1.5">
                    {adminNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                            location.pathname === item.href
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-foreground-secondary hover:bg-accent/10 hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              <li className="mt-auto">
                <Link
                  to="/settings"
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    location.pathname === '/settings'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground-secondary hover:bg-accent/10 hover:text-foreground'
                  )}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/50 bg-card/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex flex-1 justify-end gap-x-4 lg:gap-x-6">
            <div className="flex items-center gap-x-4">
              {/* Theme toggle */}
              <ThemeToggle />
              {/* User avatar with initials */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {initials}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
