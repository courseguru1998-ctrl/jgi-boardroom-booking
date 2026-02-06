import api from './api';
import type { ApiResponse, Room, Pagination } from '@/types';

export interface RoomFilters {
  capacity?: number;
  amenities?: string;
  building?: string;
  floor?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateRoomData {
  name: string;
  capacity: number;
  floor?: string;
  building?: string;
  amenities?: string[];
  imageUrl?: string | null;
}

export interface RoomAvailability {
  date: string;
  bookings: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    bookedBy: string;
  }[];
}

export const roomsApi = {
  getAll: async (
    filters: RoomFilters = {}
  ): Promise<ApiResponse<Room[]> & { pagination: Pagination }> => {
    const response = await api.get('/rooms', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Room>> => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  getAvailability: async (
    id: string,
    date: string
  ): Promise<ApiResponse<RoomAvailability>> => {
    const response = await api.get(`/rooms/${id}/availability`, {
      params: { date },
    });
    return response.data;
  },

  create: async (data: CreateRoomData): Promise<ApiResponse<Room>> => {
    const response = await api.post('/admin/rooms', data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<CreateRoomData>
  ): Promise<ApiResponse<Room>> => {
    const response = await api.patch(`/admin/rooms/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.patch(`/admin/rooms/${id}`, { isActive: false });
    return response.data;
  },
};
