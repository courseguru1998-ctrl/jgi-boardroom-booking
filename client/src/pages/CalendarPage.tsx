import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfDay,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  Monitor,
  Wifi,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { roomsApi } from '@/services/rooms';
import { bookingsApi } from '@/services/bookings';
import { cn } from '@/utils/cn';

// Room color palette for visual distinction
const ROOM_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-500' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-500' },
  { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-500' },
  { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-500' },
  { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-500' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-500' },
];

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomId = searchParams.get('roomId') || undefined;
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll({ limit: 100 }),
  });

  // Get booking stats for mini calendar
  const { data: monthBookings } = useQuery({
    queryKey: ['bookings', 'month', format(miniCalendarDate, 'yyyy-MM')],
    queryFn: () =>
      bookingsApi.getAll({
        startDate: format(startOfMonth(miniCalendarDate), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(miniCalendarDate), 'yyyy-MM-dd'),
        status: 'CONFIRMED',
        limit: 500,
      }),
  });

  // Count bookings per day for mini calendar dots
  const bookingsByDate = monthBookings?.data?.reduce((acc, booking) => {
    const date = format(new Date(booking.startTime), 'yyyy-MM-dd');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const handleRoomSelect = (id: string | null) => {
    if (id) {
      setSearchParams({ roomId: id });
    } else {
      setSearchParams({});
    }
  };

  // Generate mini calendar days
  const monthStart = startOfMonth(miniCalendarDate);
  const monthEnd = endOfMonth(miniCalendarDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedRoom = roomsData?.data?.find((r) => r.id === roomId);
  const roomColorIndex = roomsData?.data?.findIndex((r) => r.id === roomId) ?? -1;

  // Today's bookings count
  const todayBookings = monthBookings?.data?.filter((b) =>
    isSameDay(new Date(b.startTime), new Date())
  ).length || 0;

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-jgi-blue to-jgi-blue-light">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              Calendar
            </h1>
            <p className="text-foreground-secondary mt-1 ml-14">
              Select a room and time to make a booking
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-foreground-secondary">
                <strong className="text-foreground">{todayBookings}</strong> bookings today
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar - Mini Calendar & Rooms */}
        <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
          {/* Mini Calendar - Cal.com/Google Calendar inspired */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            {/* Mini Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                {format(miniCalendarDate, 'MMMM yyyy')}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const prevMonth = subMonths(miniCalendarDate, 1);
                    // Only allow going back if the previous month contains today or future dates
                    if (!isBefore(endOfMonth(prevMonth), startOfDay(new Date()))) {
                      setMiniCalendarDate(prevMonth);
                    }
                  }}
                  disabled={isBefore(endOfMonth(subMonths(miniCalendarDate, 1)), startOfDay(new Date()))}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isBefore(endOfMonth(subMonths(miniCalendarDate, 1)), startOfDay(new Date()))
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-muted"
                  )}
                >
                  <ChevronLeft className="h-4 w-4 text-foreground-muted" />
                </button>
                <button
                  onClick={() => setMiniCalendarDate(new Date())}
                  className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setMiniCalendarDate(addMonths(miniCalendarDate, 1))}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-foreground-muted" />
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-foreground-muted py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const hasBookings = bookingsByDate[dateKey] > 0;
                const bookingCount = bookingsByDate[dateKey] || 0;
                const isCurrentMonth = isSameMonth(day, miniCalendarDate);
                const isSelected = isSameDay(day, selectedDate);
                const dayIsToday = isToday(day);
                const dayIsPast = isBefore(day, startOfDay(new Date())) && !dayIsToday;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !dayIsPast && setSelectedDate(day)}
                    disabled={dayIsPast}
                    className={cn(
                      'relative h-9 w-full rounded-lg text-sm font-medium transition-all duration-200',
                      dayIsPast && 'text-foreground-muted/30 cursor-not-allowed line-through',
                      !isCurrentMonth && !dayIsPast && 'text-foreground-muted/40',
                      isCurrentMonth && !isSelected && !dayIsPast && 'text-foreground hover:bg-muted',
                      isSelected && !dayIsPast && 'bg-primary text-primary-foreground shadow-md',
                      dayIsToday && !isSelected && 'bg-jgi-gold/20 text-jgi-gold font-bold'
                    )}
                  >
                    {format(day, 'd')}
                    {/* Booking indicator dots */}
                    {hasBookings && !isSelected && !dayIsPast && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {[...Array(Math.min(bookingCount, 3))].map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-1 h-1 rounded-full',
                              dayIsToday ? 'bg-jgi-gold' : 'bg-primary'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Selection - Calendly inspired cards */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-jgi-gold" />
              Select Room
            </h3>

            <div className="space-y-2">
              {/* All Rooms Option */}
              <button
                onClick={() => handleRoomSelect(null)}
                className={cn(
                  'w-full p-3 rounded-xl border-2 transition-all duration-200 text-left',
                  !roomId
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-transparent bg-muted/50 hover:bg-muted hover:border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      !roomId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border border-border'
                    )}
                  >
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">All Rooms</p>
                    <p className="text-xs text-foreground-muted">
                      View all {roomsData?.data?.length || 0} rooms
                    </p>
                  </div>
                </div>
              </button>

              {/* Individual Rooms */}
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {roomsData?.data?.map((room, index) => {
                  const colors = ROOM_COLORS[index % ROOM_COLORS.length];
                  const isSelected = roomId === room.id;

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleRoomSelect(room.id)}
                      className={cn(
                        'w-full p-3 rounded-xl border-2 transition-all duration-200 text-left',
                        isSelected
                          ? `${colors.border} ${colors.light} shadow-sm`
                          : 'border-transparent bg-muted/50 hover:bg-muted hover:border-border'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                            colors.bg
                          )}
                        >
                          <span className="text-sm font-bold">
                            {room.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {room.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-foreground-muted">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {room.capacity}
                            </span>
                            {room.building && (
                              <span className="truncate">{room.building}</span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className={cn('w-2 h-2 rounded-full', colors.bg)} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Room Details */}
          {selectedRoom && (
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-3">Room Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-foreground-muted" />
                  <span className="text-foreground-secondary">
                    Capacity: <strong className="text-foreground">{selectedRoom.capacity}</strong>
                  </span>
                </div>
                {selectedRoom.building && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-foreground-muted" />
                    <span className="text-foreground-secondary">
                      {selectedRoom.building}
                      {selectedRoom.floor && `, Floor ${selectedRoom.floor}`}
                    </span>
                  </div>
                )}
                {selectedRoom.amenities.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-foreground-muted mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRoom.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs text-foreground-secondary"
                        >
                          {amenity === 'projector' && <Monitor className="h-3 w-3" />}
                          {amenity === 'video-conferencing' && <Wifi className="h-3 w-3" />}
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 min-w-0">
          {/* Mobile Room Selector */}
          <div className="lg:hidden mb-4">
            <select
              className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={roomId || ''}
              onChange={(e) => handleRoomSelect(e.target.value || null)}
            >
              <option value="">All Rooms</option>
              {roomsData?.data?.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity} people)
                </option>
              ))}
            </select>
          </div>

          <BookingCalendar
            roomId={roomId}
            selectedDate={selectedDate}
            roomColor={roomColorIndex >= 0 ? ROOM_COLORS[roomColorIndex % ROOM_COLORS.length] : undefined}
          />
        </div>
      </div>
    </div>
  );
}
