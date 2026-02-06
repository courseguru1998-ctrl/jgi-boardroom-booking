import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Building2,
  Users,
  MapPin,
  Grid3X3,
  List,
  Monitor,
  Wifi,
  Presentation,
  Volume2,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { roomsApi } from '@/services/rooms';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { cn } from '@/utils/cn';
import type { Room } from '@/types';

// Amenity configuration
const AMENITY_CONFIG: Record<string, { icon: typeof Monitor; label: string; color: string }> = {
  projector: { icon: Presentation, label: 'Projector', color: 'text-blue-500' },
  whiteboard: { icon: Grid3X3, label: 'Whiteboard', color: 'text-emerald-500' },
  'video-conferencing': { icon: Wifi, label: 'Video Call', color: 'text-violet-500' },
  'tv-screen': { icon: Monitor, label: 'TV Screen', color: 'text-amber-500' },
  'audio-system': { icon: Volume2, label: 'Audio', color: 'text-rose-500' },
};

// Capacity filters
const CAPACITY_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '1-4', value: 4 },
  { label: '5-10', value: 10 },
  { label: '11-20', value: 20 },
  { label: '20+', value: 21 },
];

// Room Card Component
function RoomCard({ room, viewMode }: { room: Room; viewMode: 'grid' | 'list' }) {
  const isGrid = viewMode === 'grid';

  return (
    <Link to={`/rooms/${room.id}`}>
      <Card
        className={cn(
          'group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
          isGrid ? '' : 'flex'
        )}
      >
        {/* Image Section */}
        <div
          className={cn(
            'relative overflow-hidden',
            isGrid ? 'h-48' : 'w-48 h-full flex-shrink-0'
          )}
        >
          {room.imageUrl ? (
            <img
              src={room.imageUrl}
              alt={room.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br from-jgi-blue via-jgi-blue/80 to-jgi-gold/20 flex items-center justify-center',
              room.imageUrl ? 'hidden' : ''
            )}
          >
            <Building2 className="h-16 w-16 text-white/30" />
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Capacity Badge */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
            <Users className="h-4 w-4 text-jgi-gold" />
            <span className="text-sm font-bold text-foreground">{room.capacity}</span>
          </div>

          {/* Quick Book on Hover (Grid only) */}
          {isGrid && (
            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <Link to={`/calendar?roomId=${room.id}`} onClick={(e) => e.stopPropagation()}>
                <Button className="w-full bg-jgi-gold hover:bg-jgi-gold-light text-jgi-blue font-semibold shadow-lg">
                  Book Now
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Content Section */}
        <CardContent className={cn('p-5', !isGrid && 'flex-1 flex flex-col')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {room.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-foreground-muted">
                {room.building && (
                  <>
                    <Building2 className="h-4 w-4" />
                    <span>{room.building}</span>
                  </>
                )}
                {room.floor && (
                  <>
                    <span className="text-border">•</span>
                    <MapPin className="h-4 w-4" />
                    <span>Floor {room.floor}</span>
                  </>
                )}
              </div>
            </div>
            {!isGrid && (
              <ChevronRight className="h-5 w-5 text-foreground-muted group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
            )}
          </div>

          {/* Amenities */}
          {room.amenities.length > 0 && (
            <div className={cn('flex flex-wrap gap-2', isGrid ? 'mt-4' : 'mt-3')}>
              {room.amenities.slice(0, isGrid ? 4 : 5).map((amenity) => {
                const config = AMENITY_CONFIG[amenity];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div
                    key={amenity}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium"
                    title={config.label}
                  >
                    <Icon className={cn('h-3.5 w-3.5', config.color)} />
                    <span className="text-foreground-secondary">{config.label}</span>
                  </div>
                );
              })}
              {room.amenities.length > (isGrid ? 4 : 5) && (
                <div className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground-muted">
                  +{room.amenities.length - (isGrid ? 4 : 5)} more
                </div>
              )}
            </div>
          )}

          {/* List View Actions */}
          {!isGrid && (
            <div className="flex items-center gap-3 mt-auto pt-4">
              <Link to={`/calendar?roomId=${room.id}`} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Book Now
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-2">
                View Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function RoomsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState<number | undefined>();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', searchQuery, selectedCapacity],
    queryFn: () =>
      roomsApi.getAll({
        capacity: selectedCapacity,
        building: searchQuery || undefined,
        limit: 50,
      }),
  });

  // Filter by amenities locally
  const filteredRooms = data?.data?.filter((room) => {
    if (selectedAmenities.length === 0) return true;
    return selectedAmenities.every((amenity) => room.amenities.includes(amenity));
  });

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            Meeting Rooms
          </h1>
          <p className="text-foreground-secondary mt-1 ml-14">
            {filteredRooms?.length || 0} rooms available for booking
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'grid'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal className="h-5 w-5 text-jgi-gold" />
            <span className="font-semibold text-foreground">Filter Rooms</span>
          </div>

          <div className="space-y-5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
              <Input
                placeholder="Search by name or building..."
                className="pl-12 h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Capacity Filter */}
            <div>
              <p className="text-sm font-medium text-foreground-muted mb-3">Capacity</p>
              <div className="flex flex-wrap gap-2">
                {CAPACITY_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setSelectedCapacity(option.value)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      selectedCapacity === option.value
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-foreground-secondary hover:bg-muted/80'
                    )}
                  >
                    {option.label === 'Any' ? 'Any Size' : `${option.label} people`}
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities Filter */}
            <div>
              <p className="text-sm font-medium text-foreground-muted mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(AMENITY_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedAmenities.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleAmenity(key)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-foreground-secondary hover:bg-muted/80'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isSelected ? 'text-primary-foreground' : config.color)} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedCapacity || selectedAmenities.length > 0 || searchQuery) && (
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <span className="text-sm text-foreground-muted">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="hover:text-primary/70">×</button>
                    </span>
                  )}
                  {selectedCapacity && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {CAPACITY_OPTIONS.find((o) => o.value === selectedCapacity)?.label} people
                      <button onClick={() => setSelectedCapacity(undefined)} className="hover:text-primary/70">×</button>
                    </span>
                  )}
                  {selectedAmenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {AMENITY_CONFIG[amenity]?.label}
                      <button onClick={() => toggleAmenity(amenity)} className="hover:text-primary/70">×</button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCapacity(undefined);
                    setSelectedAmenities([]);
                  }}
                  className="text-xs text-destructive hover:underline ml-auto"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-foreground-muted mt-4 font-medium">Loading rooms...</p>
        </div>
      ) : filteredRooms?.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="p-4 rounded-full bg-muted inline-flex mb-4">
              <Building2 className="h-10 w-10 text-foreground-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No rooms found</h3>
            <p className="text-foreground-muted mt-2 max-w-md mx-auto">
              Try adjusting your filters or search query to find available rooms.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearchQuery('');
                setSelectedCapacity(undefined);
                setSelectedAmenities([]);
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
              : 'space-y-4'
          )}
        >
          {filteredRooms?.map((room) => (
            <RoomCard key={room.id} room={room} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
}
