import api from './api';
import type { ApiResponse, CalendarConnection } from '@/types';

export const calendarApi = {
  getConnections: async (): Promise<ApiResponse<CalendarConnection[]>> => {
    const response = await api.get('/calendar/connections');
    return response.data;
  },

  connect: async (
    provider: 'google' | 'microsoft'
  ): Promise<ApiResponse<{ authUrl: string }>> => {
    const response = await api.get(`/calendar/connect/${provider}`);
    return response.data;
  },

  disconnect: async (
    provider: 'google' | 'microsoft'
  ): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/calendar/disconnect/${provider}`);
    return response.data;
  },
};
