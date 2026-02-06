import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Building2,
  Clock,
  ArrowRight,
  CalendarCheck,
  TrendingUp,
  Users,
  Zap,
  ChevronRight,
  MapPin,
  Plus,
} from 'lucide-react';
import { format, isToday, isTomorrow, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { bookingsApi } from '@/services/bookings';
import { roomsApi } from '@/services/rooms';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/utils/cn';

// Greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Format relative date
function getRelativeDate(date: Date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: upcomingBookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () =>
      bookingsApi.getMyBookings({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'CONFIRMED',
        limit: 10,
      }),
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', 'available'],
    queryFn: () => roomsApi.getAll({ limit: 100 }),
  });

  const { data: todayBookings } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: () =>
      bookingsApi.getAll({
        startDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfDay(new Date()), 'yyyy-MM-dd'),
        status: 'CONFIRMED',
        limit: 100,
      }),
  });

  const upcomingCount = upcomingBookings?.data?.length || 0;
  const roomCount = roomsData?.data?.length || 0;
  const todayCount = todayBookings?.data?.length || 0;

  // Get next upcoming booking
  const nextBooking = upcomingBookings?.data?.[0];
  const minutesUntilNext = nextBooking
    ? differenceInMinutes(new Date(nextBooking.startTime), new Date())
    : null;

  // Group bookings by date for the timeline
  const bookingsByDate = upcomingBookings?.data?.reduce((acc, booking) => {
    const dateKey = format(new Date(booking.startTime), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, typeof upcomingBookings.data>);

  // Top rooms (mock data - could come from analytics)
  const topRooms = roomsData?.data?.slice(0, 3) || [];

  return (
    <div className="space-y-8">
      {/* Hero Section - Personalized Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-jgi-blue via-[#002366] to-[#001040] p-8 lg:p-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-jgi-gold rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-white rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-jgi-gold font-medium mb-1">{getGreeting()}</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-white/70 text-lg">
                {upcomingCount > 0
                  ? `You have ${upcomingCount} upcoming booking${upcomingCount > 1 ? 's' : ''}`
                  : 'No upcoming bookings scheduled'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/calendar">
                <Button
                  size="lg"
                  className="bg-jgi-gold hover:bg-jgi-gold-light text-jgi-blue font-semibold gap-2 w-full sm:w-auto"
                >
                  <Plus className="h-5 w-5" />
                  Book a Room
                </Button>
              </Link>
              <Link to="/my-bookings">
                <Button
                  variant="outline-light"
                  size="lg"
                  className="gap-2 w-full sm:w-auto"
                >
                  <Calendar className="h-5 w-5" />
                  My Bookings
                </Button>
              </Link>
            </div>
          </div>

          {/* Next Meeting Alert */}
          {nextBooking && minutesUntilNext !== null && minutesUntilNext > 0 && minutesUntilNext <= 60 && (
            <div className="mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-jgi-gold/20">
                  <Zap className="h-6 w-6 text-jgi-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{nextBooking.title}</p>
                  <p className="text-white/70 text-sm">
                    Starting in {minutesUntilNext} minutes • {nextBooking.room.name}
                  </p>
                </div>
                <Link to={`/my-bookings?bookingId=${nextBooking.id}`}>
                  <Button size="sm" className="bg-white text-jgi-blue hover:bg-white/90">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-[100px]" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground-muted">Today's Bookings</p>
                <p className="text-3xl font-bold text-foreground mt-1">{todayCount}</p>
                <p className="text-xs text-foreground-muted mt-1">across all rooms</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <CalendarCheck className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-[100px]" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground-muted">My Upcoming</p>
                <p className="text-3xl font-bold text-foreground mt-1">{upcomingCount}</p>
                <p className="text-xs text-foreground-muted mt-1">scheduled meetings</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <Calendar className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-[100px]" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground-muted">Available Rooms</p>
                <p className="text-3xl font-bold text-foreground mt-1">{roomCount}</p>
                <p className="text-xs text-foreground-muted mt-1">ready to book</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                <Building2 className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-[100px]" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground-muted">This Week</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {upcomingBookings?.data?.filter(
                    (b) => new Date(b.startTime) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ).length || 0}
                </p>
                <p className="text-xs text-foreground-muted mt-1">meetings scheduled</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Upcoming Bookings Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Upcoming Schedule</CardTitle>
                  <p className="text-sm text-foreground-muted">Your next meetings</p>
                </div>
              </div>
              <Link to="/my-bookings">
                <Button variant="ghost" size="sm" className="gap-1">
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : !bookingsByDate || Object.keys(bookingsByDate).length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                    <Calendar className="h-8 w-8 text-foreground-muted" />
                  </div>
                  <p className="text-foreground-muted font-medium">No upcoming bookings</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    Book a room to get started
                  </p>
                  <Link to="/calendar">
                    <Button variant="outline" className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Book a Room
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(bookingsByDate).slice(0, 3).map(([dateKey, bookings]) => (
                    <div key={dateKey}>
                      {/* Date Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-semibold',
                            isToday(new Date(dateKey))
                              ? 'bg-jgi-gold/20 text-jgi-gold'
                              : 'bg-muted text-foreground-muted'
                          )}
                        >
                          {getRelativeDate(new Date(dateKey))}
                        </div>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      {/* Bookings for this date */}
                      <div className="space-y-3 pl-2">
                        {bookings?.map((booking) => (
                          <Link
                            key={booking.id}
                            to={`/my-bookings?bookingId=${booking.id}`}
                            className="block"
                          >
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-background-secondary border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 group">
                              {/* Time */}
                              <div className="text-center min-w-[60px]">
                                <p className="text-lg font-bold text-foreground">
                                  {format(new Date(booking.startTime), 'h:mm')}
                                </p>
                                <p className="text-xs text-foreground-muted uppercase">
                                  {format(new Date(booking.startTime), 'a')}
                                </p>
                              </div>

                              {/* Divider */}
                              <div className="w-1 self-stretch rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {booking.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 text-sm text-foreground-muted">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {booking.room.name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(booking.startTime), 'h:mm a')} -{' '}
                                    {format(new Date(booking.endTime), 'h:mm a')}
                                  </span>
                                </div>
                                {booking.attendees?.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-foreground-muted">
                                    <Users className="h-3.5 w-3.5" />
                                    {booking.attendees.length} attendee{booking.attendees.length > 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>

                              {/* Arrow */}
                              <ChevronRight className="h-5 w-5 text-foreground-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access & Popular Rooms */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-jgi-gold/10">
                  <Zap className="h-5 w-5 text-jgi-gold" />
                </div>
                <CardTitle>Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/calendar" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary hover:bg-muted transition-colors group">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="flex-1 font-medium text-foreground">New Booking</span>
                  <ArrowRight className="h-4 w-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to="/rooms" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary hover:bg-muted transition-colors group">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Building2 className="h-4 w-4 text-violet-500" />
                  </div>
                  <span className="flex-1 font-medium text-foreground">Browse Rooms</span>
                  <ArrowRight className="h-4 w-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to="/waitlist" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary hover:bg-muted transition-colors group">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="flex-1 font-medium text-foreground">My Waitlist</span>
                  <ArrowRight className="h-4 w-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Popular Rooms */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Popular Rooms</CardTitle>
                  <p className="text-sm text-foreground-muted">Frequently booked</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topRooms.map((room, index) => (
                <Link key={room.id} to={`/rooms/${room.id}`} className="block">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background-secondary hover:bg-muted transition-colors group">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold',
                        index === 0
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                          : index === 1
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                          : 'bg-gradient-to-br from-amber-600 to-amber-800'
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{room.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {room.capacity} people • {room.building || 'Main Building'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-foreground-muted group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
              <Link to="/rooms">
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  View All Rooms
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
