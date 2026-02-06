import api from './api';
import type { ApiResponse, User, Pagination, Analytics } from '@/types';

export interface UserFilters {
  search?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
  department?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'ADMIN' | 'USER';
  department?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'USER';
  department?: string | null;
  isActive?: boolean;
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  roomId?: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export const adminApi = {
  getUsers: async (
    filters: UserFilters = {}
  ): Promise<ApiResponse<(User & { _count: { bookings: number } })[]> & { pagination: Pagination }> => {
    const response = await api.get('/admin/users', { params: filters });
    return response.data;
  },

  getUserById: async (
    id: string
  ): Promise<ApiResponse<User & { _count: { bookings: number } }>> => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserData): Promise<ApiResponse<User>> => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (
    id: string,
    data: UpdateUserData
  ): Promise<ApiResponse<User>> => {
    const response = await api.patch(`/admin/users/${id}`, data);
    return response.data;
  },

  deactivateUser: async (id: string): Promise<ApiResponse<User>> => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getAnalytics: async (
    query: AnalyticsQuery
  ): Promise<ApiResponse<Analytics>> => {
    const response = await api.get('/admin/analytics', { params: query });
    return response.data;
  },

  getAuditLogs: async (
    page = 1,
    limit = 50,
    entityType?: string
  ): Promise<ApiResponse<AuditLog[]> & { pagination: Pagination }> => {
    const response = await api.get('/admin/audit-logs', {
      params: { page, limit, entityType },
    });
    return response.data;
  },
};
