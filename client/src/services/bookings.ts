import api from './api';
import type { ApiResponse, Booking, Pagination } from '@/types';

export interface BookingFilters {
  roomId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'CONFIRMED' | 'CANCELLED' | 'PENDING';
  page?: number;
  limit?: number;
}

export interface CreateBookingData {
  roomId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  recurrenceRule?: string;
  attendees?: { email: string; name?: string }[];
}

export interface UpdateBookingData {
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  attendees?: { email: string; name?: string }[];
}

export const bookingsApi = {
  getAll: async (
    filters: BookingFilters = {}
  ): Promise<ApiResponse<Booking[]> & { pagination: Pagination }> => {
    const response = await api.get('/bookings', { params: filters });
    return response.data;
  },

  getMyBookings: async (
    filters: Omit<BookingFilters, 'userId'> = {}
  ): Promise<ApiResponse<Booking[]> & { pagination: Pagination }> => {
    const response = await api.get('/bookings/my', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Booking>> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  create: async (data: CreateBookingData): Promise<ApiResponse<Booking>> => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateBookingData
  ): Promise<ApiResponse<Booking>> => {
    const response = await api.patch(`/bookings/${id}`, data);
    return response.data;
  },

  cancel: async (id: string): Promise<ApiResponse<Booking>> => {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  },
};
