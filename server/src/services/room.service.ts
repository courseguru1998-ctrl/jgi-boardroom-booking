import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import type {
  CreateRoomInput,
  UpdateRoomInput,
  RoomFilterInput,
} from '../validators/room.validators.js';

interface RoomWithParsedAmenities {
  id: string;
  name: string;
  capacity: number;
  floor: string | null;
  building: string | null;
  amenities: string[];
  isActive: boolean;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function parseRoom(room: { amenities: string } & Record<string, unknown>): RoomWithParsedAmenities {
  return {
    ...room,
    amenities: JSON.parse(room.amenities as string || '[]'),
  } as RoomWithParsedAmenities;
}

export class RoomService {
  async create(data: CreateRoomInput) {
    const room = await prisma.room.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        floor: data.floor,
        building: data.building,
        amenities: JSON.stringify(data.amenities || []),
        imageUrl: data.imageUrl,
      },
    });
    return parseRoom(room);
  }

  async findById(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    return parseRoom(room);
  }

  async findAll(filters: RoomFilterInput) {
    const where: Record<string, unknown> = {};

    if (filters.capacity) {
      where.capacity = { gte: filters.capacity };
    }

    if (filters.building) {
      where.building = filters.building;
    }

    if (filters.floor) {
      where.floor = filters.floor;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    } else {
      where.isActive = true;
    }

    // For SQLite, we filter amenities in memory after fetching
    const allRooms = await prisma.room.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    let filteredRooms = allRooms.map(parseRoom);

    // Filter by amenities in memory for SQLite compatibility
    // Note: filters.amenities is already string[] after zod transform
    if (filters.amenities && filters.amenities.length > 0) {
      filteredRooms = filteredRooms.filter((room) =>
        filters.amenities!.every((amenity: string) => room.amenities.includes(amenity))
      );
    }

    // Apply pagination after filtering
    const paginatedRooms = filteredRooms.slice(
      (filters.page - 1) * filters.limit,
      filters.page * filters.limit
    );

    return {
      data: paginatedRooms,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: filteredRooms.length,
        totalPages: Math.ceil(filteredRooms.length / filters.limit),
      },
    };
  }

  async update(id: string, data: UpdateRoomInput) {
    await this.findById(id);

    const updateData: Record<string, unknown> = { ...data };
    if (data.amenities) {
      updateData.amenities = JSON.stringify(data.amenities);
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
    });
    return parseRoom(room);
  }

  async delete(id: string) {
    await this.findById(id);

    const room = await prisma.room.update({
      where: { id },
      data: { isActive: false },
    });
    return parseRoom(room);
  }

  async getAvailability(id: string, date: string) {
    await this.findById(id);

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const bookings = await prisma.booking.findMany({
      where: {
        roomId: id,
        status: 'CONFIRMED',
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      date,
      bookings: bookings.map((b) => ({
        id: b.id,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        bookedBy: `${b.user.firstName} ${b.user.lastName}`,
      })),
    };
  }
}

export const roomService = new RoomService();
