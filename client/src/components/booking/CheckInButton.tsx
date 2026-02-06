import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, UserCheck } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { checkInsApi } from '@/services/checkins';
import { toast } from '@/hooks/useToast';
import { format, isToday, isBefore, isAfter, subMinutes } from 'date-fns';

interface CheckInButtonProps {
  bookingId: string;
  startTime: string;
  endTime: string;
  status: string;
  showStatus?: boolean;
}

export function CheckInButton({
  bookingId,
  startTime,
  endTime,
  status,
  showStatus = true,
}: CheckInButtonProps) {
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  // Check-in window: 15 minutes before start to end of booking
  const checkInWindowStart = subMinutes(start, 15);
  const isWithinCheckInWindow =
    isAfter(now, checkInWindowStart) && isBefore(now, end);
  const isTodayBooking = isToday(start);

  // Only show button for today's confirmed bookings
  const shouldShowButton =
    status === 'CONFIRMED' && isTodayBooking;

  const { data: checkInData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['checkin-status', bookingId],
    queryFn: () => checkInsApi.isCheckedIn(bookingId),
    enabled: shouldShowButton,
  });

  const isCheckedIn = checkInData?.data?.isCheckedIn ?? false;

  const { data: statusData } = useQuery({
    queryKey: ['checkin-full-status', bookingId],
    queryFn: () => checkInsApi.getCheckInStatus(bookingId),
    enabled: showStatus && shouldShowButton,
  });

  const checkInMutation = useMutation({
    mutationFn: () => checkInsApi.checkIn(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-status', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['checkin-full-status', bookingId] });
      toast({
        title: 'Checked in successfully',
        description: 'You have been marked as present for this meeting',
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Check-in failed',
        description: error.response?.data?.message || 'Unable to check in',
        variant: 'destructive',
      });
    },
  });

  if (!shouldShowButton) {
    return null;
  }

  if (isLoadingStatus) {
    return (
      <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
    );
  }

  if (isCheckedIn) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success-bg text-success rounded-lg text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>Checked In</span>
        </div>
        {showStatus && statusData?.data && (
          <span className="text-xs text-foreground-muted">
            {statusData.data.totalCheckedIn}/{statusData.data.totalExpected} attendees
          </span>
        )}
      </div>
    );
  }

  if (!isWithinCheckInWindow) {
    const timeUntilCheckIn = isBefore(now, checkInWindowStart)
      ? `Available at ${format(checkInWindowStart, 'h:mm a')}`
      : 'Check-in expired';

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled
          className="opacity-60"
        >
          <UserCheck className="h-4 w-4 mr-1.5" />
          Check In
        </Button>
        <span className="text-xs text-foreground-muted">{timeUntilCheckIn}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="accent"
        size="sm"
        onClick={() => checkInMutation.mutate()}
        loading={checkInMutation.isPending}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={isHovered ? 'scale-105' : ''}
      >
        <UserCheck className="h-4 w-4 mr-1.5" />
        Check In
      </Button>
      {showStatus && statusData?.data && statusData.data.totalCheckedIn > 0 && (
        <span className="text-xs text-foreground-muted">
          {statusData.data.totalCheckedIn}/{statusData.data.totalExpected} checked in
        </span>
      )}
    </div>
  );
}
