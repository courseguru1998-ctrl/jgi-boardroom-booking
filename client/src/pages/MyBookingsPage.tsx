import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Download,
  FileSpreadsheet,
  CalendarDays,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Plus,
  CalendarCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { bookingsApi } from '@/services/bookings';
import { exportApi } from '@/services/export';
import { BookingModal } from '@/components/booking/BookingModal';
import { CheckInButton } from '@/components/booking/CheckInButton';
import { toast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import type { Booking } from '@/types';

type StatusFilter = 'all' | 'upcoming' | 'past' | 'CANCELLED';

// Format relative date
function getRelativeDate(date: Date) {
  if (isToday(date)) return { label: 'Today', color: 'text-jgi-gold bg-jgi-gold/10' };
  if (isTomorrow(date)) return { label: 'Tomorrow', color: 'text-emerald-600 bg-emerald-50' };
  if (isPast(date)) return { label: 'Past', color: 'text-foreground-muted bg-muted' };
  return { label: format(date, 'MMM d'), color: 'text-primary bg-primary/10' };
}

export function MyBookingsPage() {
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const bookingIdFromUrl = searchParams.get('bookingId');

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings', statusFilter],
    queryFn: () =>
      bookingsApi.getMyBookings({
        status: statusFilter === 'CANCELLED' ? 'CANCELLED' : statusFilter === 'all' ? undefined : 'CONFIRMED',
        limit: 100,
      }),
  });

  const { data: bookingFromUrl } = useQuery({
    queryKey: ['booking', bookingIdFromUrl],
    queryFn: () => bookingsApi.getById(bookingIdFromUrl!),
    enabled: !!bookingIdFromUrl,
  });

  // Filter bookings based on status
  const filteredBookings = data?.data?.filter((booking) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'CANCELLED') return booking.status === 'CANCELLED';
    if (statusFilter === 'upcoming') {
      return booking.status === 'CONFIRMED' && isFuture(new Date(booking.startTime));
    }
    if (statusFilter === 'past') {
      return booking.status === 'CONFIRMED' && isPast(new Date(booking.endTime));
    }
    return true;
  });

  // Group bookings by date
  const bookingsByDate = filteredBookings?.reduce((acc, booking) => {
    const dateKey = format(new Date(booking.startTime), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  const bookingToShow = bookingFromUrl?.data || selectedBooking;

  // Stats
  const totalUpcoming = data?.data?.filter(
    (b) => b.status === 'CONFIRMED' && isFuture(new Date(b.startTime))
  ).length || 0;
  const todayCount = data?.data?.filter(
    (b) => b.status === 'CONFIRMED' && isToday(new Date(b.startTime))
  ).length || 0;

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportApi.downloadBookingsExcel({
        status: statusFilter === 'CANCELLED' ? 'CANCELLED' : statusFilter === 'all' ? undefined : 'CONFIRMED',
      });
      toast({ title: 'Export downloaded successfully', variant: 'success' });
    } catch {
      toast({ title: 'Failed to export bookings', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportApi.downloadBookingsCSV({
        status: statusFilter === 'CANCELLED' ? 'CANCELLED' : statusFilter === 'all' ? undefined : 'CONFIRMED',
      });
      toast({ title: 'Export downloaded successfully', variant: 'success' });
    } catch {
      toast({ title: 'Failed to export bookings', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const filterOptions: { value: StatusFilter; label: string; icon: typeof Calendar }[] = [
    { value: 'upcoming', label: 'Upcoming', icon: CalendarCheck },
    { value: 'past', label: 'Past', icon: Clock },
    { value: 'CANCELLED', label: 'Cancelled', icon: XCircle },
    { value: 'all', label: 'All', icon: CalendarDays },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            My Bookings
          </h1>
          <p className="text-foreground-secondary mt-1 ml-14">
            {totalUpcoming} upcoming • {todayCount} today
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || !filteredBookings?.length}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting || !filteredBookings?.length}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>

          <div className="w-px h-8 bg-border hidden sm:block" />

          <Link to="/calendar">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                    statusFilter === option.value
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground-muted hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-foreground-muted mt-4 font-medium">Loading bookings...</p>
        </div>
      ) : !bookingsByDate || Object.keys(bookingsByDate).length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="p-4 rounded-full bg-muted inline-flex mb-4">
              <Calendar className="h-10 w-10 text-foreground-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No bookings found</h3>
            <p className="text-foreground-muted mt-2 max-w-md mx-auto">
              {statusFilter === 'upcoming'
                ? "You don't have any upcoming bookings. Book a room to get started!"
                : statusFilter === 'past'
                ? "You don't have any past bookings."
                : statusFilter === 'CANCELLED'
                ? "You don't have any cancelled bookings."
                : "You haven't made any bookings yet."}
            </p>
            <Link to="/calendar">
              <Button className="mt-6 gap-2">
                <Plus className="h-4 w-4" />
                Book a Room
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(bookingsByDate)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([dateKey, bookings]) => {
              const date = new Date(dateKey);
              const dateInfo = getRelativeDate(date);

              return (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-semibold',
                          dateInfo.color
                        )}
                      >
                        {dateInfo.label}
                      </div>
                      <span className="text-foreground-muted text-sm">
                        {format(date, 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-foreground-muted bg-muted px-2 py-1 rounded-full">
                      {bookings.length} booking{bookings.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Bookings for this date */}
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <Card
                        key={booking.id}
                        className={cn(
                          'group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                          booking.status === 'CANCELLED' && 'opacity-60'
                        )}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row">
                            {/* Time Column */}
                            <div className="sm:w-32 flex-shrink-0 p-5 sm:border-r border-border bg-muted/30 flex sm:flex-col items-center sm:justify-center gap-2 sm:gap-1">
                              <p className="text-2xl font-bold text-foreground">
                                {format(new Date(booking.startTime), 'h:mm')}
                              </p>
                              <p className="text-xs font-medium text-foreground-muted uppercase">
                                {format(new Date(booking.startTime), 'a')}
                              </p>
                              <p className="text-xs text-foreground-muted hidden sm:block mt-1">
                                {format(new Date(booking.endTime), 'h:mm a')}
                              </p>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-5">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                                      {booking.title}
                                    </h3>
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0',
                                        booking.status === 'CONFIRMED'
                                          ? 'bg-success-bg text-success'
                                          : 'bg-destructive/10 text-destructive'
                                      )}
                                    >
                                      {booking.status === 'CONFIRMED' ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : (
                                        <XCircle className="h-3 w-3" />
                                      )}
                                      {booking.status}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-4 w-4 text-jgi-gold" />
                                      <span className="font-medium text-foreground-secondary">
                                        {booking.room.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-4 w-4" />
                                      <span>
                                        {format(new Date(booking.startTime), 'h:mm a')} -{' '}
                                        {format(new Date(booking.endTime), 'h:mm a')}
                                      </span>
                                    </div>
                                    {booking.attendees?.length > 0 && (
                                      <div className="flex items-center gap-1.5">
                                        <Users className="h-4 w-4" />
                                        <span>
                                          {booking.attendees.length} attendee{booking.attendees.length > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {booking.description && (
                                    <p className="mt-2 text-sm text-foreground-muted line-clamp-1">
                                      {booking.description}
                                    </p>
                                  )}
                                </div>

                                {/* Actions */}
                                <div
                                  className="flex items-center gap-3 flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CheckInButton
                                    bookingId={booking.id}
                                    startTime={booking.startTime}
                                    endTime={booking.endTime}
                                    status={booking.status}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => setSelectedBooking(booking)}
                                  >
                                    Details
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Booking Modal */}
      {bookingToShow && (
        <BookingModal
          booking={bookingToShow}
          open={!!bookingToShow}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
