import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Settings,
  User,
  Mail,
  Building2,
  Shield,
  Calendar,
  Link2,
  Unlink,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { calendarApi } from '@/services/calendar';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

export function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const calendarConnected = searchParams.get('calendar');
  const connected = searchParams.get('connected');

  useEffect(() => {
    if (calendarConnected === 'google' && connected === 'true') {
      toast({
        title: 'Google Calendar connected',
        description: 'Your bookings will now sync with Google Calendar',
        variant: 'success',
      });
      setSearchParams({});
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
    } else if (calendarConnected === 'microsoft' && connected === 'true') {
      toast({
        title: 'Microsoft Calendar connected',
        description: 'Your bookings will now sync with Outlook Calendar',
        variant: 'success',
      });
      setSearchParams({});
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
    } else if (calendarConnected === 'error') {
      toast({
        title: 'Connection failed',
        description: 'Failed to connect calendar. Please try again.',
        variant: 'destructive',
      });
      setSearchParams({});
    }
  }, [calendarConnected, connected, setSearchParams, queryClient]);

  const { data: connections } = useQuery({
    queryKey: ['calendar-connections'],
    queryFn: calendarApi.getConnections,
  });

  const connectMutation = useMutation({
    mutationFn: calendarApi.connect,
    onSuccess: (data) => {
      if (data.data?.authUrl) {
        window.location.href = data.data.authUrl;
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: calendarApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast({
        title: 'Calendar disconnected',
        variant: 'success',
      });
    },
  });

  const isGoogleConnected = connections?.data?.some(
    (c) => c.provider === 'GOOGLE'
  );
  const isMicrosoftConnected = connections?.data?.some(
    (c) => c.provider === 'MICROSOFT'
  );

  // Get user initials for avatar
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700">
            <Settings className="h-6 w-6 text-white" />
          </div>
          Settings
        </h1>
        <p className="text-foreground-secondary mt-1 ml-14">
          Manage your account and integrations
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-0">
          {/* Profile Header with Gradient */}
          <div className="relative h-32 bg-gradient-to-r from-jgi-blue via-jgi-blue/90 to-jgi-gold/30 rounded-t-xl">
            <div className="absolute -bottom-12 left-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-jgi-gold to-jgi-gold-light flex items-center justify-center text-jgi-blue text-3xl font-bold shadow-lg border-4 border-card">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-16 pb-6 px-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-foreground-muted flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                    user?.role === 'ADMIN'
                      ? 'bg-jgi-gold/10 text-jgi-gold'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Shield className="h-4 w-4" />
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Profile Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <ProfileField
                icon={User}
                label="First Name"
                value={user?.firstName || '-'}
              />
              <ProfileField
                icon={User}
                label="Last Name"
                value={user?.lastName || '-'}
              />
              <ProfileField
                icon={Building2}
                label="Department"
                value={user?.department || 'Not set'}
              />
              <ProfileField
                icon={Shield}
                label="Account Type"
                value={user?.role || 'USER'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Integrations */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Calendar Integrations</CardTitle>
              <CardDescription>
                Connect your calendars to automatically sync bookings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Calendar */}
          <CalendarIntegrationCard
            name="Google Calendar"
            description="Sync with your Google Calendar"
            icon={
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
            }
            iconBg="bg-red-100"
            iconColor="text-red-600"
            isConnected={isGoogleConnected}
            onConnect={() => connectMutation.mutate('google')}
            onDisconnect={() => disconnectMutation.mutate('google')}
            isLoading={connectMutation.isPending || disconnectMutation.isPending}
          />

          {/* Microsoft Outlook */}
          <CalendarIntegrationCard
            name="Microsoft Outlook"
            description="Sync with your Outlook Calendar"
            icon={
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.02V2.63q0-.46.33-.8.33-.33.8-.33h14.72q.46 0 .8.33.33.34.33.8V12zM7.88 8.5q-.5 0-.91.16-.4.16-.68.45-.26.3-.42.72-.16.42-.16.95 0 .53.15.97.15.44.42.73.27.3.67.47.41.16.92.16.5 0 .89-.16.39-.17.66-.47.27-.3.42-.72.15-.42.15-.94 0-.52-.15-.95-.15-.43-.42-.74-.28-.31-.68-.47-.41-.16-.86-.16zm4.87-.1H1v4.1h11.75V8.4zm4.88.7h-3.63v5.74h.83v-2.19h2.8v-.8h-2.8v-1.92h2.8v-.83zm5.37.2q-.33 0-.6.1-.27.11-.48.28-.21.18-.34.4-.14.22-.22.46h-.02V8.6h-.85v5.8h.85V11.9q0-.32.1-.61.12-.28.31-.49.2-.2.47-.33.27-.12.6-.12.6 0 .87.38.27.38.27 1.1v2.57h.84v-2.63q0-.46-.12-.84-.11-.38-.34-.64-.23-.27-.57-.41-.33-.15-.77-.15z" />
              </svg>
            }
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            isConnected={isMicrosoftConnected}
            onConnect={() => connectMutation.mutate('microsoft')}
            onDisconnect={() => disconnectMutation.mutate('microsoft')}
            isLoading={connectMutation.isPending || disconnectMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Sync Info Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Auto-Sync Enabled</h3>
              <p className="text-sm text-foreground-muted mt-1">
                When you connect a calendar, all your room bookings will automatically appear in your personal calendar.
                You'll receive reminders and can manage everything in one place.
              </p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-foreground-secondary">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Automatic event creation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Real-time updates</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Attendee invitations</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Profile Field Component
function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-foreground-muted" />
        <span className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-foreground font-medium">{value}</p>
    </div>
  );
}

// Calendar Integration Card Component
function CalendarIntegrationCard({
  name,
  description,
  icon,
  iconBg,
  iconColor,
  isConnected,
  onConnect,
  onDisconnect,
  isLoading,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  isConnected?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-5 rounded-xl border transition-all duration-200',
        isConnected
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-border/50 hover:border-border hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg, iconColor)}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">{name}</h4>
            {isConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>
          <p className="text-sm text-foreground-muted">{description}</p>
        </div>
      </div>
      {isConnected ? (
        <Button
          variant="outline"
          onClick={onDisconnect}
          disabled={isLoading}
          className="gap-2"
        >
          <Unlink className="h-4 w-4" />
          Disconnect
        </Button>
      ) : (
        <Button
          onClick={onConnect}
          disabled={isLoading}
          className="gap-2"
        >
          <Link2 className="h-4 w-4" />
          Connect
        </Button>
      )}
    </div>
  );
}
