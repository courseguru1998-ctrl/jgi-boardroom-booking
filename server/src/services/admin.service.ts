import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserFilterInput,
  AnalyticsQueryInput,
} from '../validators/admin.validators.js';

export class AdminService {
  async createUser(data: CreateUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        department: data.department,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getUsers(filters: UserFilterInput) {
    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.department) {
      where.department = filters.department;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { bookings: true },
          },
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async updateUser(id: string, data: UpdateUserInput) {
    await this.getUserById(id);

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deactivateUser(id: string) {
    await this.getUserById(id);

    return prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });
  }

  async getAnalytics(query: AnalyticsQueryInput) {
    const startDate = new Date(`${query.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${query.endDate}T23:59:59.999Z`);

    const whereBase = {
      startTime: { gte: startDate },
      endTime: { lte: endDate },
      status: 'CONFIRMED' as const,
      ...(query.roomId && { roomId: query.roomId }),
    };

    // Total bookings
    const totalBookings = await prisma.booking.count({ where: whereBase });

    // Cancelled bookings (for cancellation rate)
    const cancelledBookings = await prisma.booking.count({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: 'CANCELLED',
        ...(query.roomId && { roomId: query.roomId }),
      },
    });

    // Total bookings including cancelled for rate calculation
    const totalAllBookings = totalBookings + cancelledBookings;
    const cancellationRate = totalAllBookings > 0
      ? Math.round((cancelledBookings / totalAllBookings) * 100)
      : 0;

    // Bookings by room with capacity info
    const bookingsByRoom = await prisma.booking.groupBy({
      by: ['roomId'],
      where: whereBase,
      _count: { id: true },
    });

    const rooms = await prisma.room.findMany({
      where: {
        id: { in: bookingsByRoom.map((b) => b.roomId) },
      },
      select: { id: true, name: true, capacity: true },
    });

    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    // All bookings for detailed analysis
    const allBookings = await prisma.booking.findMany({
      where: whereBase,
      select: {
        startTime: true,
        endTime: true,
        roomId: true,
        user: {
          select: { department: true }
        }
      },
    });

    // Bookings by day of week
    const bookingsByDayOfWeek = Array(7).fill(0);
    allBookings.forEach((booking) => {
      const day = booking.startTime.getUTCDay();
      bookingsByDayOfWeek[day]++;
    });

    // Peak hours analysis (hour-by-hour distribution)
    const peakHours = Array(24).fill(0);
    allBookings.forEach((booking) => {
      const hour = booking.startTime.getUTCHours();
      peakHours[hour]++;
    });

    // Department analytics
    const departmentCounts: Record<string, number> = {};
    allBookings.forEach((booking) => {
      const dept = booking.user.department || 'Unassigned';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    const departmentAnalytics = Object.entries(departmentCounts)
      .map(([department, count]) => ({ department, bookingCount: count }))
      .sort((a, b) => b.bookingCount - a.bookingCount);

    // Average duration
    const totalDurationMs = allBookings.reduce((sum, b) => {
      return sum + (b.endTime.getTime() - b.startTime.getTime());
    }, 0);
    const avgDurationMinutes =
      allBookings.length > 0
        ? Math.round(totalDurationMs / allBookings.length / 60000)
        : 0;

    // Room utilization percentage (based on business hours: 9am-6pm, Mon-Fri)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const workDays = Math.ceil(daysDiff * (5/7)); // Approximate work days
    const availableHoursPerRoom = workDays * 9; // 9 hours per work day (9am-6pm)

    // Calculate hours booked per room
    const roomHoursBooked: Record<string, number> = {};
    allBookings.forEach((booking) => {
      const hours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
      roomHoursBooked[booking.roomId] = (roomHoursBooked[booking.roomId] || 0) + hours;
    });

    // Calculate utilization rate for each room
    const roomUtilization = bookingsByRoom.map((b) => {
      const room = roomMap.get(b.roomId);
      const hoursBooked = roomHoursBooked[b.roomId] || 0;
      const utilizationPercent = availableHoursPerRoom > 0
        ? Math.min(Math.round((hoursBooked / availableHoursPerRoom) * 100), 100)
        : 0;

      return {
        roomId: b.roomId,
        roomName: room?.name || 'Unknown',
        bookingCount: b._count.id,
        capacity: room?.capacity || 0,
        hoursBooked: Math.round(hoursBooked * 10) / 10,
        utilizationPercent,
      };
    });

    // Booking trends (weekly aggregation)
    const weeklyTrends: Record<string, number> = {};
    allBookings.forEach((booking) => {
      // Get the week start date (Sunday)
      const bookingDate = new Date(booking.startTime);
      const weekStart = new Date(bookingDate);
      weekStart.setUTCDate(bookingDate.getUTCDate() - bookingDate.getUTCDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyTrends[weekKey] = (weeklyTrends[weekKey] || 0) + 1;
    });

    const bookingTrends = Object.entries(weeklyTrends)
      .map(([weekStart, count]) => ({ weekStart, bookingCount: count }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Most active users
    const topUsers = await prisma.booking.groupBy({
      by: ['userId'],
      where: whereBase,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const users = await prisma.user.findMany({
      where: {
        id: { in: topUsers.map((u) => u.userId) },
      },
      select: { id: true, firstName: true, lastName: true, department: true },
    });

    const userMap = new Map(
      users.map((u) => [u.id, { name: `${u.firstName} ${u.lastName}`, department: u.department }])
    );

    return {
      summary: {
        totalBookings,
        avgDurationMinutes,
        cancellationRate,
        cancelledBookings,
        period: { startDate: query.startDate, endDate: query.endDate },
      },
      roomUtilization,
      bookingsByDayOfWeek: [
        { day: 'Sunday', count: bookingsByDayOfWeek[0] },
        { day: 'Monday', count: bookingsByDayOfWeek[1] },
        { day: 'Tuesday', count: bookingsByDayOfWeek[2] },
        { day: 'Wednesday', count: bookingsByDayOfWeek[3] },
        { day: 'Thursday', count: bookingsByDayOfWeek[4] },
        { day: 'Friday', count: bookingsByDayOfWeek[5] },
        { day: 'Saturday', count: bookingsByDayOfWeek[6] },
      ],
      peakHours: peakHours.map((count, hour) => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        bookingCount: count,
      })),
      departmentAnalytics,
      bookingTrends,
      topUsers: topUsers.map((u) => ({
        userId: u.userId,
        userName: userMap.get(u.userId)?.name || 'Unknown',
        department: userMap.get(u.userId)?.department || null,
        bookingCount: u._count.id,
      })),
    };
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    entityType?: string
  ) {
    const where = entityType ? { entityType } : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const adminService = new AdminService();
