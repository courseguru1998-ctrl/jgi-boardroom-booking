// Vercel Serverless API Handler
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// JWT Config
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

// Auth Middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AUTH ROUTES
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, department: user.department },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, department } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), passwordHash, firstName, lastName, department, role: 'USER' },
    });

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, department: user.department },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const storedToken = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: decoded.userId },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = storedToken.user;
    const newAccessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: { userId: user.id, token: newRefreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

app.get('/api/v1/auth/me', authenticate, (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, department: user.department },
  });
});

// ROOM ROUTES
app.get('/api/v1/rooms', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const roomsWithAmenities = rooms.map(room => ({ ...room, amenities: JSON.parse(room.amenities || '[]') }));
    res.json({ success: true, data: roomsWithAmenities });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rooms' });
  }
});

app.get('/api/v1/rooms/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: { ...room, amenities: JSON.parse(room.amenities || '[]') } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch room' });
  }
});

// BOOKING ROUTES
app.get('/api/v1/bookings', authenticate, async (req, res) => {
  try {
    const { roomId, startDate, endDate } = req.query;
    const where = { status: { not: 'CANCELLED' } };

    if (roomId) where.roomId = roomId;
    if (startDate && endDate) {
      where.startTime = { gte: new Date(startDate) };
      where.endTime = { lte: new Date(endDate) };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        attendees: { select: { id: true, email: true, name: true } }
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

app.get('/api/v1/bookings/my', authenticate, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: {
        room: true,
        attendees: { select: { id: true, email: true, name: true } }
      },
      orderBy: { startTime: 'desc' },
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

app.post('/api/v1/bookings', authenticate, async (req, res) => {
  try {
    const { roomId, title, description, startTime, endTime, attendees } = req.body;

    // Check for conflicts
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        status: { not: 'CANCELLED' },
        OR: [
          { startTime: { lt: new Date(endTime) }, endTime: { gt: new Date(startTime) } },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: 'Room is already booked for this time' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        roomId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'CONFIRMED',
      },
      include: {
        room: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        attendees: { select: { id: true, email: true, name: true } }
      },
    });

    // Add attendees if provided
    if (attendees && attendees.length > 0) {
      await prisma.bookingAttendee.createMany({
        data: attendees.map(a => ({ bookingId: booking.id, email: a.email, name: a.name })),
      });
    }

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

app.patch('/api/v1/bookings/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include: {
        room: true,
        attendees: { select: { id: true, email: true, name: true } }
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

// ADMIN ROUTES
app.get('/api/v1/admin/users', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

app.get('/api/v1/admin/analytics', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const [totalBookings, totalUsers, totalRooms, recentBookings] = await Promise.all([
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.room.count({ where: { isActive: true } }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { room: true, user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: { totalBookings, totalUsers, totalRooms, recentBookings, bookingsByRoom: [], bookingsByDay: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// DELETE booking (cancel via DELETE)
app.delete('/api/v1/bookings/:id', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include: {
        room: true,
        attendees: { select: { id: true, email: true, name: true } }
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

// GET single booking
app.get('/api/v1/bookings/:id', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        room: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        attendees: { select: { id: true, email: true, name: true } }
      },
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch booking' });
  }
});

// WAITLIST ROUTES
app.get('/api/v1/waitlist/my', authenticate, async (req, res) => {
  try {
    const entries = await prisma.waitlistEntry.findMany({
      where: { userId: req.user.id, status: 'WAITING' },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch waitlist' });
  }
});

app.post('/api/v1/waitlist', authenticate, async (req, res) => {
  try {
    const { roomId, startTime, endTime } = req.body;
    const entry = await prisma.waitlistEntry.create({
      data: {
        userId: req.user.id,
        roomId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'WAITING',
      },
      include: { room: true },
    });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to join waitlist' });
  }
});

app.delete('/api/v1/waitlist/:id', authenticate, async (req, res) => {
  try {
    const entry = await prisma.waitlistEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (entry.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await prisma.waitlistEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Removed from waitlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove from waitlist' });
  }
});

// EXPORT ROUTES (simplified - returns JSON for now, PDF generation would need additional libraries)
app.get('/api/v1/export/booking/:id/pdf', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        room: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        attendees: { select: { email: true, name: true } },
      },
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Generate simple text-based PDF content
    const content = `
BOOKING CONFIRMATION
====================

Title: ${booking.title}
Room: ${booking.room.name}
Date: ${new Date(booking.startTime).toLocaleDateString()}
Time: ${new Date(booking.startTime).toLocaleTimeString()} - ${new Date(booking.endTime).toLocaleTimeString()}
Status: ${booking.status}

Organizer: ${booking.user.firstName} ${booking.user.lastName} (${booking.user.email})

${booking.description ? `Description: ${booking.description}` : ''}

${booking.attendees.length > 0 ? `Attendees: ${booking.attendees.map(a => a.email).join(', ')}` : ''}

---
Generated by JGI Boardroom Booking System
    `.trim();

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${booking.id}.txt"`);
    res.send(content);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

app.get('/api/v1/export/bookings/excel', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, roomId, status } = req.query;
    const where = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.startTime = { gte: new Date(startDate) };
      where.endTime = { lte: new Date(endDate) };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Generate CSV content (Excel can open CSV)
    const header = 'Title,Room,Start Time,End Time,Status,Organizer,Email\n';
    const rows = bookings.map(b =>
      `"${b.title}","${b.room.name}","${new Date(b.startTime).toISOString()}","${new Date(b.endTime).toISOString()}","${b.status}","${b.user.firstName} ${b.user.lastName}","${b.user.email}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(header + rows);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

app.get('/api/v1/export/bookings/csv', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, roomId, status } = req.query;
    const where = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.startTime = { gte: new Date(startDate) };
      where.endTime = { lte: new Date(endDate) };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const header = 'Title,Room,Start Time,End Time,Status,Organizer,Email\n';
    const rows = bookings.map(b =>
      `"${b.title}","${b.room.name}","${new Date(b.startTime).toISOString()}","${new Date(b.endTime).toISOString()}","${b.status}","${b.user.firstName} ${b.user.lastName}","${b.user.email}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(header + rows);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

// ADMIN: Create/Update Room
app.post('/api/v1/admin/rooms', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { name, capacity, floor, building, amenities, imageUrl } = req.body;
    const room = await prisma.room.create({
      data: {
        name,
        capacity: parseInt(capacity),
        floor,
        building,
        amenities: JSON.stringify(amenities || []),
        imageUrl,
      },
    });
    res.status(201).json({ success: true, data: { ...room, amenities: JSON.parse(room.amenities) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create room' });
  }
});

app.patch('/api/v1/admin/rooms/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { name, capacity, floor, building, amenities, imageUrl, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (capacity !== undefined) data.capacity = parseInt(capacity);
    if (floor !== undefined) data.floor = floor;
    if (building !== undefined) data.building = building;
    if (amenities !== undefined) data.amenities = JSON.stringify(amenities);
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (isActive !== undefined) data.isActive = isActive;

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: { ...room, amenities: JSON.parse(room.amenities || '[]') } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update room' });
  }
});

// CHECK-IN ROUTES
app.post('/api/v1/checkins', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Check if booking exists and user is authorized
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { attendees: true },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if already checked in
    const existing = await prisma.bookingCheckIn.findUnique({
      where: { bookingId_userId: { bookingId, userId: req.user.id } },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already checked in' });
    }

    const checkIn = await prisma.bookingCheckIn.create({
      data: {
        bookingId,
        userId: req.user.id,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.status(201).json({ success: true, data: checkIn });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Failed to check in' });
  }
});

app.get('/api/v1/checkins/booking/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        checkIns: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        attendees: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      data: {
        bookingId,
        totalExpected: (booking.attendees?.length || 0) + 1, // attendees + organizer
        totalCheckedIn: booking.checkIns.length,
        checkIns: booking.checkIns.map((c) => ({
          id: c.id,
          checkedInAt: c.checkedInAt,
          user: c.user,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get check-in status' });
  }
});

app.get('/api/v1/checkins/booking/:bookingId/me', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const checkIn = await prisma.bookingCheckIn.findUnique({
      where: { bookingId_userId: { bookingId, userId: req.user.id } },
    });

    res.json({ success: true, data: { isCheckedIn: !!checkIn } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check status' });
  }
});

app.get('/api/v1/checkins/my/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkIns = await prisma.bookingCheckIn.findMany({
      where: {
        userId: req.user.id,
        checkedInAt: { gte: today, lt: tomorrow },
      },
      include: {
        booking: {
          include: { room: { select: { name: true } } },
        },
      },
    });

    res.json({
      success: true,
      data: checkIns.map((c) => ({
        id: c.id,
        checkedInAt: c.checkedInAt,
        booking: {
          id: c.booking.id,
          title: c.booking.title,
          roomName: c.booking.room.name,
          startTime: c.booking.startTime,
          endTime: c.booking.endTime,
        },
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get check-ins' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Export for Vercel
module.exports = app;
