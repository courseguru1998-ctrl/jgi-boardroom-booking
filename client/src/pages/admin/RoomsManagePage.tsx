import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Image,
  Presentation,
  Monitor,
  Volume2,
  Wifi,
  Grid3X3,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/Modal';
import { Label } from '@/components/common/Label';
import { roomsApi, CreateRoomData } from '@/services/rooms';
import { toast } from '@/hooks/useToast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { cn } from '@/utils/cn';
import type { Room } from '@/types';

const roomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  floor: z.string().optional(),
  building: z.string().optional(),
  amenities: z.string().optional(),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type RoomFormData = z.infer<typeof roomSchema>;

const amenityOptions = [
  { value: 'projector', label: 'Projector', icon: Presentation, color: 'text-blue-500' },
  { value: 'whiteboard', label: 'Whiteboard', icon: Grid3X3, color: 'text-emerald-500' },
  { value: 'video-conferencing', label: 'Video Conferencing', icon: Wifi, color: 'text-violet-500' },
  { value: 'tv-screen', label: 'TV Screen', icon: Monitor, color: 'text-amber-500' },
  { value: 'audio-system', label: 'Audio System', icon: Volume2, color: 'text-rose-500' },
];

export function RoomsManagePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', 'admin', search],
    queryFn: () =>
      roomsApi.getAll({
        isActive: undefined, // Get all rooms including inactive
        limit: 100,
      }),
  });

  const filteredRooms = data?.data?.filter(
    (room) =>
      room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.building?.toLowerCase().includes(search.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRoomData) => roomsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room created successfully', variant: 'success' });
      handleCloseModal();
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast({
        title: 'Failed to create room',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoomData> }) =>
      roomsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room updated successfully', variant: 'success' });
      handleCloseModal();
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast({
        title: 'Failed to update room',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room deactivated', variant: 'success' });
    },
  });

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setSelectedAmenities([]);
    reset({
      name: '',
      capacity: 10,
      floor: '',
      building: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setSelectedAmenities(room.amenities);
    reset({
      name: room.name,
      capacity: room.capacity,
      floor: room.floor || '',
      building: room.building || '',
      imageUrl: room.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setSelectedAmenities([]);
    reset();
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const onSubmit = (data: RoomFormData) => {
    const payload: CreateRoomData = {
      name: data.name,
      capacity: data.capacity,
      floor: data.floor || undefined,
      building: data.building || undefined,
      amenities: selectedAmenities,
      imageUrl: data.imageUrl || null,
    };

    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Stats
  const totalRooms = data?.data?.length || 0;
  const activeRooms = data?.data?.filter((r) => r.isActive).length || 0;
  const totalCapacity = data?.data?.reduce((sum, r) => sum + r.capacity, 0) || 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            Room Management
          </h1>
          <p className="text-foreground-secondary mt-1 ml-14">
            {totalRooms} rooms • {activeRooms} active • {totalCapacity} total capacity
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Total Rooms</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalRooms}</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-100">
                <Building2 className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Active</p>
                <p className="text-2xl font-bold text-foreground mt-1">{activeRooms}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Total Capacity</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalCapacity}</p>
              </div>
              <div className="p-3 rounded-xl bg-jgi-gold/10">
                <Users className="h-6 w-6 text-jgi-gold" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
            <Input
              placeholder="Search rooms by name or building..."
              className="pl-12 h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="text-foreground-muted mt-4">Loading rooms...</p>
            </div>
          ) : filteredRooms?.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                <Building2 className="h-8 w-8 text-foreground-muted" />
              </div>
              <h3 className="font-semibold text-foreground">No rooms found</h3>
              <p className="text-foreground-muted mt-1">
                {search ? 'Try a different search term' : 'Add your first room to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Room</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Capacity</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Location</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Amenities</th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground-muted text-sm">Status</th>
                    <th className="text-right py-4 px-4 font-semibold text-foreground-muted text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms?.map((room) => (
                    <tr
                      key={room.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {room.imageUrl ? (
                            <img
                              src={room.imageUrl}
                              alt={room.name}
                              className="w-12 h-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-jgi-blue/15 via-jgi-gold/10 to-jgi-blue/5 flex items-center justify-center">
                              <Image className="h-5 w-5 text-jgi-blue/40" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{room.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-jgi-gold" />
                          <span className="font-medium text-foreground">{room.capacity}</span>
                          <span className="text-foreground-muted text-sm">people</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-foreground-secondary">
                          <MapPin className="h-4 w-4" />
                          {room.building && room.floor
                            ? `${room.building}, Floor ${room.floor}`
                            : room.building || room.floor || '-'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {room.amenities.slice(0, 3).map((amenity) => {
                            const config = amenityOptions.find((a) => a.value === amenity);
                            if (!config) return null;
                            const Icon = config.icon;
                            return (
                              <div
                                key={amenity}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs"
                                title={config.label}
                              >
                                <Icon className={cn('h-3 w-3', config.color)} />
                                <span className="text-foreground-secondary">{config.label}</span>
                              </div>
                            );
                          })}
                          {room.amenities.length > 3 && (
                            <span className="px-2 py-1 rounded-lg bg-muted text-xs text-foreground-muted">
                              +{room.amenities.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                            room.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {room.isActive ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {room.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(room)}
                            className="text-foreground-muted hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {room.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(room.id)}
                              className="text-foreground-muted hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Room Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              {editingRoom ? 'Edit Room' : 'Create New Room'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Room Name *</Label>
              <Input error={errors.name?.message} {...register('name')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity *</Label>
                <Input
                  type="number"
                  error={errors.capacity?.message}
                  {...register('capacity')}
                />
              </div>
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input {...register('floor')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Building</Label>
              <Input {...register('building')} />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/room-image.jpg"
                error={errors.imageUrl?.message}
                {...register('imageUrl')}
              />
              <p className="text-xs text-foreground-muted">
                Enter a URL to an image of the room
              </p>
            </div>

            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {amenityOptions.map((amenity) => {
                  const Icon = amenity.icon;
                  const isSelected = selectedAmenities.includes(amenity.value);
                  return (
                    <button
                      key={amenity.value}
                      type="button"
                      onClick={() => toggleAmenity(amenity.value)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-foreground-secondary hover:bg-muted/80'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isSelected ? 'text-primary-foreground' : amenity.color)} />
                      {amenity.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingRoom ? 'Update Room' : 'Create Room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
