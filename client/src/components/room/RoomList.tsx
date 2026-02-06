import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, Building2 } from 'lucide-react';
import { roomsApi } from '@/services/rooms';
import { RoomCard } from './RoomCard';
import { Input } from '@/components/common/Input';

export function RoomList() {
  const [filters, setFilters] = useState({
    capacity: undefined as number | undefined,
    building: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', filters],
    queryFn: () =>
      roomsApi.getAll({
        capacity: filters.capacity,
        building: filters.building || undefined,
        limit: 50,
      }),
  });

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-card rounded-2xl shadow-apple border border-border/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Filters</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <Input
              placeholder="Search by building..."
              className="pl-11"
              value={filters.building}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, building: e.target.value }))
              }
            />
          </div>
          <div className="w-48">
            <Input
              type="number"
              placeholder="Min capacity"
              min={1}
              value={filters.capacity || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  capacity: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-foreground-muted mt-4">Loading rooms...</span>
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/30">
          <Building2 className="mx-auto h-12 w-12 text-border mb-4" />
          <p className="text-foreground-muted font-medium">No rooms found</p>
          <p className="text-sm text-foreground-muted mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data?.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
