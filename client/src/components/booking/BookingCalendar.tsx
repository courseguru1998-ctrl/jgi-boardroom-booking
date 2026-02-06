import { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/services/bookings';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, LayoutGrid, Calendar, Clock } from 'lucide-react';
import { BookingModal } from './BookingModal';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';
import type { Booking } from '@/types';

interface BookingCalendarProps {
  roomId?: string;
  selectedDate?: Date;
  roomColor?: {
    bg: string;
    light: string;
    text: string;
    border: string;
  };
}

// Color palette for different rooms when viewing all
const EVENT_COLORS = [
  { bg: '#3b82f6', border: '#2563eb' }, // blue
  { bg: '#10b981', border: '#059669' }, // emerald
  { bg: '#8b5cf6', border: '#7c3aed' }, // violet
  { bg: '#f59e0b', border: '#d97706' }, // amber
  { bg: '#ef4444', border: '#dc2626' }, // rose
  { bg: '#06b6d4', border: '#0891b2' }, // cyan
];

export function BookingCalendar({ roomId, selectedDate }: BookingCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<'timeGridWeek' | 'timeGridDay' | 'dayGridMonth'>('timeGridWeek');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Navigate to selected date when it changes
  useEffect(() => {
    if (selectedDate && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(selectedDate);
    }
  }, [selectedDate]);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'calendar', dateRange.start, dateRange.end, roomId],
    queryFn: () =>
      bookingsApi.getAll({
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
        roomId,
        status: 'CONFIRMED',
        limit: 500,
      }),
  });

  // Create a map of room IDs to colors
  const roomColorMap = new Map<string, typeof EVENT_COLORS[0]>();
  data?.data?.forEach((booking) => {
    if (!roomColorMap.has(booking.roomId)) {
      roomColorMap.set(booking.roomId, EVENT_COLORS[roomColorMap.size % EVENT_COLORS.length]);
    }
  });

  const events =
    data?.data?.map((booking) => {
      const colors = roomColorMap.get(booking.roomId) || EVENT_COLORS[0];
      return {
        id: booking.id,
        title: booking.title,
        start: booking.startTime,
        end: booking.endTime,
        backgroundColor: booking.status === 'CANCELLED' ? '#9ca3af' : colors.bg,
        borderColor: booking.status === 'CANCELLED' ? '#6b7280' : colors.border,
        textColor: '#ffffff',
        extendedProps: {
          booking,
          roomName: booking.room.name,
        },
      };
    }) || [];

  const handleDateChange = (arg: { start: Date; end: Date }) => {
    setDateRange({ start: arg.start, end: arg.end });
  };

  const handleEventClick = (info: any) => {
    const booking = info.event.extendedProps?.booking;
    if (booking) {
      setSelectedBooking(booking);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    const start = selectInfo.start;
    const end = selectInfo.end;

    if (start >= new Date(new Date().setHours(0, 0, 0, 0))) {
      setSelectedSlot({ start, end });
      setIsCreateModalOpen(true);
    }
  };

  const handleDateClick = (info: any) => {
    const start = info.date;
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    if (start >= new Date(new Date().setHours(0, 0, 0, 0))) {
      setSelectedSlot({ start, end });
      setIsCreateModalOpen(true);
    }
  };

  const handleNewBooking = () => {
    setSelectedSlot(null);
    setIsCreateModalOpen(true);
  };

  const handleViewChange = (view: 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth') => {
    setCurrentView(view);
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(view);
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  };

  const handlePrev = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
    }
  };

  // Custom event content renderer
  const renderEventContent = (eventInfo: any) => {
    const roomName = eventInfo.event.extendedProps?.roomName;
    const isWeekOrDay = currentView !== 'dayGridMonth';

    return (
      <div className="p-1.5 h-full overflow-hidden">
        <div className="font-semibold text-xs leading-tight truncate">
          {eventInfo.event.title}
        </div>
        {isWeekOrDay && roomName && (
          <div className="text-[10px] opacity-90 truncate mt-0.5">
            {roomName}
          </div>
        )}
        {isWeekOrDay && (
          <div className="text-[10px] opacity-75 mt-0.5">
            {eventInfo.timeText}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Calendar Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Custom Header - Inspired by Google Calendar / Cal.com */}
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-card to-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left: Navigation */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="font-medium"
              >
                Today
              </Button>
              <div className="flex items-center">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground-muted" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-foreground-muted" />
                </button>
              </div>
            </div>

            {/* Center: View Toggles - Pill style like Cal.com */}
            <div className="flex items-center bg-muted rounded-xl p-1">
              <button
                onClick={() => handleViewChange('dayGridMonth')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  currentView === 'dayGridMonth'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <span className="hidden sm:inline">Month</span>
                <LayoutGrid className="h-4 w-4 sm:hidden" />
              </button>
              <button
                onClick={() => handleViewChange('timeGridWeek')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  currentView === 'timeGridWeek'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <span className="hidden sm:inline">Week</span>
                <Calendar className="h-4 w-4 sm:hidden" />
              </button>
              <button
                onClick={() => handleViewChange('timeGridDay')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  currentView === 'timeGridDay'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <span className="hidden sm:inline">Day</span>
                <Clock className="h-4 w-4 sm:hidden" />
              </button>
            </div>

            {/* Right: New Booking */}
            <Button onClick={handleNewBooking} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Booking</span>
            </Button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-card/90 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <span className="text-sm font-medium text-foreground-muted">Loading schedule...</span>
            </div>
          </div>
        )}

        {/* FullCalendar with custom styling */}
        <div className="fc-wrapper">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            events={events}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            datesSet={handleDateChange}
            eventClick={handleEventClick}
            select={handleDateSelect}
            dateClick={handleDateClick}
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={false}
            height="auto"
            contentHeight={600}
            nowIndicator={true}
            eventContent={renderEventContent}
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            snapDuration="00:15:00"
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }}
            selectOverlap={false}
            unselectAuto={true}
            longPressDelay={100}
            selectLongPressDelay={100}
            expandRows={true}
            stickyHeaderDates={true}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: '09:00',
              endTime: '18:00',
            }}
          />
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-foreground-muted">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-jgi-gold/50" />
                <span className="text-foreground-muted">Business hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-0.5 bg-destructive" />
                <span className="text-foreground-muted">Now</span>
              </div>
            </div>
            <p className="text-xs text-foreground-muted">
              Click or drag to book a time slot
            </p>
          </div>
        </div>
      </div>

      {/* View existing booking */}
      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {/* Create new booking */}
      {isCreateModalOpen && (
        <BookingModal
          open={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedSlot(null);
          }}
          defaultValues={
            selectedSlot
              ? {
                  startTime: selectedSlot.start.toISOString(),
                  endTime: selectedSlot.end.toISOString(),
                  roomId,
                }
              : {
                  roomId,
                }
          }
        />
      )}
    </div>
  );
}
