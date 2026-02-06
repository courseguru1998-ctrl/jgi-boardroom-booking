import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  BarChart3,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  XCircle,
  Building2,
  Percent,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { adminApi } from '@/services/admin';
import { roomsApi } from '@/services/rooms';
import { cn } from '@/utils/cn';

type DateRange = '7d' | '30d' | '90d';

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();

  const endDate = new Date();
  const startDate = subDays(
    endDate,
    dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
  );

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', dateRange, selectedRoomId],
    queryFn: () =>
      adminApi.getAnalytics({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        roomId: selectedRoomId,
      }),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll({ limit: 100 }),
  });

  const data = analytics?.data;

  // Get max values for peak hours chart
  const maxPeakHour = data?.peakHours
    ? Math.max(...data.peakHours.map((h) => h.bookingCount))
    : 0;

  // Average utilization
  const avgUtilization = data?.roomUtilization?.length
    ? Math.round(
        data.roomUtilization.reduce((sum, r) => sum + r.utilizationPercent, 0) /
          data.roomUtilization.length
      )
    : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-jgi-blue to-jgi-blue/80">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Analytics
          </h1>
          <p className="text-foreground-secondary mt-1 ml-14">
            Room booking statistics and insights
          </p>
        </div>

        {/* Date Range Filter */}
        <Card className="p-1">
          <div className="flex items-center gap-1">
            {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  dateRange === range
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-foreground-muted hover:text-foreground hover:bg-muted'
                )}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Room Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-jgi-gold" />
            <span className="font-medium text-foreground">Filter by Room:</span>
            <select
              className="flex-1 max-w-xs rounded-xl border-2 border-input bg-background px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={selectedRoomId || ''}
              onChange={(e) => setSelectedRoomId(e.target.value || undefined)}
            >
              <option value="">All Rooms</option>
              {rooms?.data?.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-foreground-muted mt-4 font-medium">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-foreground-muted">
                  Total Bookings
                </CardTitle>
                <Calendar className="h-5 w-5 text-jgi-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {data?.summary.totalBookings || 0}
                </div>
                <p className="text-sm text-foreground-muted mt-1">
                  in the last{' '}
                  {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-foreground-muted">
                  Avg Duration
                </CardTitle>
                <Clock className="h-5 w-5 text-jgi-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {data?.summary.avgDurationMinutes || 0} min
                </div>
                <p className="text-sm text-foreground-muted mt-1">
                  average meeting length
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-foreground-muted">
                  Avg Utilization
                </CardTitle>
                <Percent className="h-5 w-5 text-jgi-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {avgUtilization}%
                </div>
                <p className="text-sm text-foreground-muted mt-1">
                  room usage rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-foreground-muted">
                  Cancellation Rate
                </CardTitle>
                <XCircle className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {data?.summary.cancellationRate || 0}%
                </div>
                <p className="text-sm text-foreground-muted mt-1">
                  {data?.summary.cancelledBookings || 0} cancelled
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Peak Hours Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-jgi-blue" />
                Peak Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.peakHours?.some((h) => h.bookingCount > 0) ? (
                <p className="text-foreground-muted text-center py-6">
                  No data available
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-1 flex-wrap">
                    {data?.peakHours
                      ?.filter((h) => h.hour >= 8 && h.hour <= 20)
                      .map((hour) => {
                        const intensity =
                          maxPeakHour > 0 ? hour.bookingCount / maxPeakHour : 0;
                        const bgColor =
                          intensity === 0
                            ? 'bg-gray-100'
                            : intensity < 0.25
                            ? 'bg-jgi-gold/20'
                            : intensity < 0.5
                            ? 'bg-jgi-gold/40'
                            : intensity < 0.75
                            ? 'bg-jgi-gold/60'
                            : 'bg-jgi-gold';

                        return (
                          <div
                            key={hour.hour}
                            className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg ${bgColor} transition-colors`}
                            title={`${hour.label}: ${hour.bookingCount} bookings`}
                          >
                            <span className="text-xs font-medium text-foreground-secondary">
                              {hour.label}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {hour.bookingCount}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <span>Low</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded bg-gray-100" />
                      <div className="w-4 h-4 rounded bg-jgi-gold/20" />
                      <div className="w-4 h-4 rounded bg-jgi-gold/40" />
                      <div className="w-4 h-4 rounded bg-jgi-gold/60" />
                      <div className="w-4 h-4 rounded bg-jgi-gold" />
                    </div>
                    <span>High</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Room Utilization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-jgi-blue" />
                  Room Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.roomUtilization?.length === 0 ? (
                  <p className="text-foreground-muted text-center py-6">
                    No data available
                  </p>
                ) : (
                  <div className="space-y-5">
                    {data?.roomUtilization?.map((room) => (
                      <div key={room.roomId}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-foreground font-medium">
                            {room.roomName}
                          </span>
                          <span className="text-foreground-muted">
                            {room.utilizationPercent}% ({room.hoursBooked}h)
                          </span>
                        </div>
                        <div className="h-2.5 bg-background-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-jgi-blue rounded-full transition-all duration-500"
                            style={{ width: `${room.utilizationPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-foreground-muted mt-1">
                          <span>{room.bookingCount} bookings</span>
                          <span>Capacity: {room.capacity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-jgi-blue" />
                  Bookings by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.departmentAnalytics?.length ? (
                  <p className="text-foreground-muted text-center py-6">
                    No data available
                  </p>
                ) : (
                  <div className="space-y-5">
                    {data?.departmentAnalytics?.slice(0, 6).map((dept) => {
                      const maxDept = Math.max(
                        ...data.departmentAnalytics.map((d) => d.bookingCount)
                      );
                      const percentage = (dept.bookingCount / maxDept) * 100;

                      return (
                        <div key={dept.department}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-foreground font-medium">
                              {dept.department}
                            </span>
                            <span className="text-foreground-muted">
                              {dept.bookingCount}
                            </span>
                          </div>
                          <div className="h-2.5 bg-background-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-jgi-gold rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bookings by Day of Week */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-jgi-blue" />
                  Bookings by Day of Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.bookingsByDayOfWeek?.every((d) => d.count === 0) ? (
                  <p className="text-foreground-muted text-center py-6">
                    No data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data?.bookingsByDayOfWeek?.map((day) => {
                      const maxCount = Math.max(
                        ...data.bookingsByDayOfWeek.map((d) => d.count)
                      );
                      const percentage =
                        maxCount > 0 ? (day.count / maxCount) * 100 : 0;

                      return (
                        <div key={day.day}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-foreground font-medium">
                              {day.day}
                            </span>
                            <span className="text-foreground-muted">{day.count}</span>
                          </div>
                          <div className="h-2.5 bg-background-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-jgi-blue" />
                  Weekly Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.bookingTrends?.length ? (
                  <p className="text-foreground-muted text-center py-6">
                    No data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data?.bookingTrends?.map((week) => {
                      const maxWeek = Math.max(
                        ...data.bookingTrends.map((w) => w.bookingCount)
                      );
                      const percentage = (week.bookingCount / maxWeek) * 100;

                      return (
                        <div key={week.weekStart}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground-secondary">
                              Week of {format(new Date(week.weekStart), 'MMM d')}
                            </span>
                            <span className="text-foreground font-medium">
                              {week.bookingCount}
                            </span>
                          </div>
                          <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-jgi-blue to-jgi-gold rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-jgi-blue" />
                Top Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.topUsers?.length === 0 ? (
                <p className="text-foreground-muted text-center py-6">
                  No data available
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 font-medium text-foreground-muted">
                          Rank
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground-muted">
                          User
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground-muted">
                          Department
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-foreground-muted">
                          Bookings
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.topUsers?.map((user, index) => (
                        <tr
                          key={user.userId}
                          className="border-b border-border/30 hover:bg-background-secondary transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0
                                  ? 'bg-jgi-gold text-white'
                                  : index === 1
                                  ? 'bg-gray-300 text-gray-700'
                                  : index === 2
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-foreground font-medium">
                            {user.userName}
                          </td>
                          <td className="py-3 px-4 text-foreground-secondary">
                            {user.department || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                              {user.bookingCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
