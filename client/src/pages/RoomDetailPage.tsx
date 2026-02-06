import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Users,
  MapPin,
  Building2,
  ArrowLeft,
  Clock,
  CalendarDays,
  Presentation,
  Monitor,
  Volume2,
  Wifi,
  Grid3X3,
  Sparkles,
  CheckCircle2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { roomsApi } from '@/services/rooms';
import { cn } from '@/utils/cn';

// Amenity configuration with icons and colors
const AMENITY_CONFIG: Record<string, { icon: typeof Monitor; label: string; color: string; bg: string }> = {
  projector: { icon: Presentation, label: 'Projector', color: 'text-blue-600', bg: 'bg-blue-100' },
  whiteboard: { icon: Grid3X3, label: 'Whiteboard', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  'video-conferencing': { icon: Wifi, label: 'Video Conferencing', color: 'text-violet-600', bg: 'bg-violet-100' },
  'tv-screen': { icon: Monitor, label: 'TV Screen', color: 'text-amber-600', bg: 'bg-amber-100' },
  'audio-system': { icon: Volume2, label: 'Audio System', color: 'text-rose-600', bg: 'bg-rose-100' },
};

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsApi.getById(id!),
    enabled: !!id,
  });

  const { data: availability } = useQuery({
    queryKey: ['room', id, 'availability', format(new Date(), 'yyyy-MM-dd')],
    queryFn: () =>
      roomsApi.getAvailability(id!, format(new Date(), 'yyyy-MM-dd')),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-foreground-muted mt-4 font-medium">Loading room details...</p>
      </div>
    );
  }

  if (!room?.data) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <div className="p-4 rounded-full bg-muted inline-flex mb-4">
            <Building2 className="h-10 w-10 text-foreground-muted" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Room not found</h3>
          <p className="text-foreground-muted mt-2">
            The room you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/rooms">
            <Button variant="outline" className="mt-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Rooms
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const roomData = room.data;
  const todayBookings = availability?.data?.bookings || [];

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link to="/rooms" className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back to Rooms</span>
      </Link>

      {/* Hero Section */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Room Image or Gradient */}
          <div className="h-64 sm:h-80 relative overflow-hidden">
            {roomData.imageUrl ? (
              <img
                src={roomData.imageUrl}
                alt={roomData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-jgi-blue via-jgi-blue/90 to-jgi-gold/30 flex items-center justify-center">
                <Building2 className="h-24 w-24 text-white/20" />
              </div>
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Room Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    {roomData.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-white/80">
                    {roomData.building && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        <span>{roomData.building}</span>
                      </div>
                    )}
                    {roomData.floor && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>Floor {roomData.floor}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Link to={`/calendar?roomId=${roomData.id}`}>
                  <Button className="gap-2 bg-jgi-gold hover:bg-jgi-gold-light text-jgi-blue font-semibold shadow-lg">
                    <Sparkles className="h-4 w-4" />
                    Book This Room
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Capacity Badge */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
            <Users className="h-5 w-5 text-jgi-gold" />
            <span className="text-lg font-bold text-foreground">{roomData.capacity}</span>
            <span className="text-sm text-foreground-muted">people</span>
          </div>
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Room Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <Users className="h-8 w-8 text-jgi-gold mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{roomData.capacity}</p>
                <p className="text-sm text-foreground-muted">Capacity</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <CalendarDays className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{todayBookings.length}</p>
                <p className="text-sm text-foreground-muted">Today's Bookings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{roomData.amenities.length}</p>
                <p className="text-sm text-foreground-muted">Amenities</p>
              </CardContent>
            </Card>
          </div>

          {/* Amenities Section */}
          {roomData.amenities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Available Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {roomData.amenities.map((amenity) => {
                    const config = AMENITY_CONFIG[amenity];
                    if (!config) {
                      return (
                        <div
                          key={amenity}
                          className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-gray-500" />
                          </div>
                          <span className="font-medium text-foreground">{amenity}</span>
                        </div>
                      );
                    }
                    const Icon = config.icon;
                    return (
                      <div
                        key={amenity}
                        className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-border hover:shadow-sm transition-all"
                      >
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bg)}>
                          <Icon className={cn('h-5 w-5', config.color)} />
                        </div>
                        <span className="font-medium text-foreground">{config.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Book Card */}
          <Card className="border-jgi-gold/30 bg-gradient-to-r from-jgi-gold/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-jgi-gold/10">
                    <Calendar className="h-6 w-6 text-jgi-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Ready to book?</h3>
                    <p className="text-sm text-foreground-muted">
                      Check availability and reserve this room for your meeting
                    </p>
                  </div>
                </div>
                <Link to={`/calendar?roomId=${roomData.id}`}>
                  <Button className="gap-2">
                    View Calendar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Today's Schedule */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Today's Schedule
                </span>
                <span className="text-sm font-normal text-foreground-muted">
                  {format(new Date(), 'MMM d')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-3 rounded-full bg-emerald-100 inline-flex mb-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="font-medium text-foreground">All day available</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    No bookings scheduled for today
                  </p>
                  <Link to={`/calendar?roomId=${roomData.id}`}>
                    <Button size="sm" className="mt-4 gap-2">
                      <Sparkles className="h-4 w-4" />
                      Book Now
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.map((booking, index) => (
                    <div
                      key={booking.id}
                      className="relative pl-4 pb-4 last:pb-0"
                    >
                      {/* Timeline line */}
                      {index < todayBookings.length - 1 && (
                        <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-border" />
                      )}
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />

                      <div className="ml-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h4 className="font-medium text-foreground truncate">
                            {booking.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground-muted">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {format(new Date(booking.startTime), 'h:mm a')} -{' '}
                            {format(new Date(booking.endTime), 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-muted mt-2">
                          Booked by {booking.bookedBy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Room Location Card */}
          {(roomData.building || roomData.floor) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-jgi-gold" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roomData.building && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Building2 className="h-5 w-5 text-foreground-muted" />
                      <div>
                        <p className="text-xs text-foreground-muted">Building</p>
                        <p className="font-medium text-foreground">{roomData.building}</p>
                      </div>
                    </div>
                  )}
                  {roomData.floor && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-5 w-5 text-foreground-muted" />
                      <div>
                        <p className="text-xs text-foreground-muted">Floor</p>
                        <p className="font-medium text-foreground">Floor {roomData.floor}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
