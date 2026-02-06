export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  department: string | null;
  isActive: boolean;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: string | null;
  building: string | null;
  amenities: string[];
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  roomId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'PENDING';
  recurrenceRule: string | null;
  room: {
    id: string;
    name: string;
    capacity: number;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  attendees: Attendee[];
  createdAt: string;
  updatedAt: string;
}

export interface Attendee {
  id: string;
  email: string;
  name: string | null;
}

export interface CalendarConnection {
  provider: 'GOOGLE' | 'MICROSOFT';
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: Pagination;
  errors?: Record<string, string[]>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface Analytics {
  summary: {
    totalBookings: number;
    avgDurationMinutes: number;
    cancellationRate: number;
    cancelledBookings: number;
    period: {
      startDate: string;
      endDate: string;
    };
  };
  roomUtilization: {
    roomId: string;
    roomName: string;
    bookingCount: number;
    capacity: number;
    hoursBooked: number;
    utilizationPercent: number;
  }[];
  bookingsByDayOfWeek: {
    day: string;
    count: number;
  }[];
  peakHours: {
    hour: number;
    label: string;
    bookingCount: number;
  }[];
  departmentAnalytics: {
    department: string;
    bookingCount: number;
  }[];
  bookingTrends: {
    weekStart: string;
    bookingCount: number;
  }[];
  topUsers: {
    userId: string;
    userName: string;
    department: string | null;
    bookingCount: number;
  }[];
}
