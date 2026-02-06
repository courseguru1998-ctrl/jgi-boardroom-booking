import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Building2,
  Trash2,
  Bell,
  BellRing,
  CalendarClock,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { waitlistApi } from '@/services/waitlist';
import { toast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

// Status configuration
const STATUS_CONFIG = {
  WAITING: {
    label: 'Waiting',
    icon: Clock,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-400',
  },
  NOTIFIED: {
    label: 'Available!',
    icon: BellRing,
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-400',
  },
  BOOKED: {
    label: 'Booked',
    icon: CheckCircle2,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-400',
  },
  EXPIRED: {
    label: 'Expired',
    icon: AlertCircle,
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-300',
  },
};

// Get relative date badge
function getDateBadge(date: Date) {
  if (isToday(date)) return { label: 'Today', color: 'bg-jgi-gold/10 text-jgi-gold' };
  if (isTomorrow(date)) return { label: 'Tomorrow', color: 'bg-emerald-50 text-emerald-600' };
  if (isPast(date)) return { label: 'Past', color: 'bg-gray-100 text-gray-500' };
  return { label: format(date, 'MMM d'), color: 'bg-primary/10 text-primary' };
}

export function WaitlistPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-waitlist'],
    queryFn: waitlistApi.getMyWaitlist,
  });

  const removeMutation = useMutation({
    mutationFn: waitlistApi.removeFromWaitlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-waitlist'] });
      toast({ title: 'Removed from waitlist', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Failed to remove from waitlist', variant: 'destructive' });
    },
  });

  // Stats
  const waitingCount = data?.data?.filter((e) => e.status === 'WAITING').length || 0;
  const notifiedCount = data?.data?.filter((e) => e.status === 'NOTIFIED').length || 0;

  // Group by status - notified first, then waiting
  const notifiedEntries = data?.data?.filter((e) => e.status === 'NOTIFIED') || [];
  const waitingEntries = data?.data?.filter((e) => e.status === 'WAITING') || [];
  const otherEntries = data?.data?.filter((e) => !['NOTIFIED', 'WAITING'].includes(e.status)) || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
              <Bell className="h-6 w-6 text-white" />
            </div>
            My Waitlist
          </h1>
          <p className="text-foreground-secondary mt-1 ml-14">
            {waitingCount} waiting • {notifiedCount} available
          </p>
        </div>

        <Link to="/calendar">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Browse Rooms
          </Button>
        </Link>
      </div>

      {/* Notified Alert Banner */}
      {notifiedCount > 0 && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-800">
                  {notifiedCount} slot{notifiedCount > 1 ? 's' : ''} now available!
                </h3>
                <p className="text-sm text-emerald-600">
                  Rooms you were waiting for have opened up. Book before they're taken!
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-foreground-muted mt-4 font-medium">Loading waitlist...</p>
        </div>
      ) : data?.data?.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="p-4 rounded-full bg-muted inline-flex mb-4">
              <CalendarClock className="h-10 w-10 text-foreground-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No waitlist entries</h3>
            <p className="text-foreground-muted mt-2 max-w-md mx-auto">
              When a room you want is fully booked, you can join the waitlist to get notified when it becomes available.
            </p>
            <Link to="/calendar">
              <Button className="mt-6 gap-2">
                <Plus className="h-4 w-4" />
                Browse Available Rooms
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Available Now Section */}
          {notifiedEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-700">
                  Available Now
                </div>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-foreground-muted bg-muted px-2 py-1 rounded-full">
                  {notifiedEntries.length} slot{notifiedEntries.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3">
                {notifiedEntries.map((entry) => (
                  <WaitlistCard
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeMutation.mutate(entry.id)}
                    isRemoving={removeMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Waiting Section */}
          {waitingEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-100 text-amber-700">
                  Waiting
                </div>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-foreground-muted bg-muted px-2 py-1 rounded-full">
                  {waitingEntries.length} slot{waitingEntries.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3">
                {waitingEntries.map((entry) => (
                  <WaitlistCard
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeMutation.mutate(entry.id)}
                    isRemoving={removeMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other (Expired/Booked) Section */}
          {otherEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-500">
                  History
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-3">
                {otherEntries.map((entry) => (
                  <WaitlistCard
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeMutation.mutate(entry.id)}
                    isRemoving={removeMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Waitlist Card Component
function WaitlistCard({
  entry,
  onRemove,
  isRemoving,
}: {
  entry: {
    id: string;
    status: string;
    startTime: string;
    endTime: string;
    roomId: string;
    room: {
      id: string;
      name: string;
      capacity: number;
      building: string | null;
      floor: string | null;
    };
  };
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const statusConfig = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.WAITING;
  const StatusIcon = statusConfig.icon;
  const dateBadge = getDateBadge(new Date(entry.startTime));
  const isAvailable = entry.status === 'NOTIFIED';

  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:shadow-lg',
        isAvailable && 'ring-2 ring-emerald-400 ring-offset-2',
        entry.status === 'EXPIRED' && 'opacity-60'
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Status Indicator Column */}
          <div
            className={cn(
              'sm:w-28 flex-shrink-0 p-5 sm:border-r border-border flex sm:flex-col items-center sm:justify-center gap-2 sm:gap-1',
              statusConfig.bg
            )}
          >
            <StatusIcon className={cn('h-6 w-6', statusConfig.text)} />
            <span className={cn('text-sm font-semibold', statusConfig.text)}>
              {statusConfig.label}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                    {entry.room.name}
                  </h3>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', dateBadge.color)}>
                    {dateBadge.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                  {entry.room.building && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-jgi-gold" />
                      <span className="font-medium text-foreground-secondary">
                        {entry.room.building}
                        {entry.room.floor && `, Floor ${entry.room.floor}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{format(new Date(entry.startTime), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(entry.startTime), 'h:mm a')} - {format(new Date(entry.endTime), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{entry.room.capacity} people</span>
                  </div>
                </div>

                {isAvailable && (
                  <p className="mt-3 text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    This slot is now available! Book it before someone else does.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAvailable && (
                  <Link to={`/calendar?roomId=${entry.roomId}`}>
                    <Button className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Book Now
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  disabled={isRemoving}
                  className="text-foreground-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
