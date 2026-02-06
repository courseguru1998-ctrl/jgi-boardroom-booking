import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Clock, Users, FileText, Building, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Label } from '@/components/common/Label';
import { bookingsApi } from '@/services/bookings';
import { roomsApi } from '@/services/rooms';
import { exportApi } from '@/services/export';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/auth';
import type { Booking } from '@/types';
import { AxiosError } from 'axios';

const bookingSchema = z.object({
  roomId: z.string().min(1, 'Room is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().min(1, 'Start time is required').refine((val) => {
    const date = new Date(val);
    return date >= new Date(new Date().setSeconds(0, 0));
  }, 'Start time must be in the future'),
  endTime: z.string().min(1, 'End time is required'),
  attendees: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  booking?: Booking;
  defaultValues?: Partial<BookingFormData>;
}

export function BookingModal({
  open,
  onClose,
  booking,
  defaultValues,
}: BookingModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEditing = !!booking;
  const canEdit = !booking || booking.userId === user?.id || user?.role === 'ADMIN';

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: defaultValues || {},
  });

  useEffect(() => {
    if (booking) {
      reset({
        roomId: booking.roomId,
        title: booking.title,
        description: booking.description || '',
        startTime: format(new Date(booking.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(booking.endTime), "yyyy-MM-dd'T'HH:mm"),
        attendees: booking.attendees?.map((a) => a.email).join(', ') || '',
      });
    } else if (defaultValues) {
      reset({
        ...defaultValues,
        startTime: defaultValues.startTime
          ? format(new Date(defaultValues.startTime), "yyyy-MM-dd'T'HH:mm")
          : '',
        endTime: defaultValues.endTime
          ? format(new Date(defaultValues.endTime), "yyyy-MM-dd'T'HH:mm")
          : '',
      });
    }
  }, [booking, defaultValues, reset]);

  const createMutation = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({
        title: 'Booking created',
        description: 'Your booking has been confirmed',
        variant: 'success',
      });
      onClose();
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast({
        title: 'Failed to create booking',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof bookingsApi.update>[1] }) =>
      bookingsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({
        title: 'Booking updated',
        description: 'Your booking has been updated',
        variant: 'success',
      });
      onClose();
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast({
        title: 'Failed to update booking',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({
        title: 'Booking cancelled',
        description: 'Your booking has been cancelled',
        variant: 'success',
      });
      onClose();
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast({
        title: 'Failed to cancel booking',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    const attendees = data.attendees
      ? data.attendees.split(',').map((email) => ({ email: email.trim() }))
      : [];

    const payload = {
      roomId: data.roomId,
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      attendees,
    };

    if (isEditing && booking) {
      updateMutation.mutate({ id: booking.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    if (booking) {
      cancelMutation.mutate(booking.id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleDownloadPDF = async () => {
    if (!booking) return;
    try {
      await exportApi.downloadBookingPDF(booking.id);
      toast({ title: 'PDF downloaded successfully', variant: 'success' });
    } catch {
      toast({ title: 'Failed to download PDF', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            {isEditing ? 'Booking Details' : 'New Booking'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Room Selection */}
          <div className="space-y-2">
            <Label htmlFor="roomId" className="flex items-center gap-2">
              <Building className="h-4 w-4 text-foreground-muted" />
              Room
            </Label>
            <select
              id="roomId"
              className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isEditing || !canEdit}
              {...register('roomId')}
            >
              <option value="">Select a room</option>
              {roomsData?.data?.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} (Capacity: {room.capacity})
                </option>
              ))}
            </select>
            {errors.roomId && (
              <p className="text-sm text-destructive">{errors.roomId.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-foreground-muted" />
              Meeting Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., Weekly Team Standup"
              disabled={!canEdit}
              error={errors.title?.message}
              {...register('title')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              className="flex min-h-[100px] w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Add meeting agenda or notes..."
              disabled={!canEdit}
              {...register('description')}
            />
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-foreground-muted" />
                Start Time
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                disabled={!canEdit || isEditing}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                error={errors.startTime?.message}
                {...register('startTime')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-foreground-muted" />
                End Time
              </Label>
              <Input
                id="endTime"
                type="datetime-local"
                disabled={!canEdit || isEditing}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                error={errors.endTime?.message}
                {...register('endTime')}
              />
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor="attendees" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-foreground-muted" />
              Attendees (optional)
            </Label>
            <Input
              id="attendees"
              placeholder="john@example.com, jane@example.com"
              disabled={!canEdit}
              {...register('attendees')}
            />
            <p className="text-xs text-foreground-muted">Separate email addresses with commas</p>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t border-border/50">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPDF}
                className="mr-auto"
              >
                <Download className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
            )}
            {isEditing && canEdit && booking?.status !== 'CANCELLED' && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
                loading={cancelMutation.isPending}
              >
                Cancel Booking
              </Button>
            )}
            {canEdit && booking?.status !== 'CANCELLED' && (
              <Button type="submit" variant="accent" loading={isPending}>
                {isEditing ? 'Update Booking' : 'Create Booking'}
              </Button>
            )}
            {!canEdit && (
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
