import api from './api';

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  roomId?: string;
  status?: string;
}

export const exportApi = {
  /**
   * Download single booking as PDF
   */
  downloadBookingPDF: async (bookingId: string): Promise<void> => {
    const response = await api.get(`/export/booking/${bookingId}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${bookingId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Download bookings as Excel
   */
  downloadBookingsExcel: async (filters: ExportFilters = {}): Promise<void> => {
    const response = await api.get('/export/bookings/excel', {
      params: filters,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Download bookings as CSV
   */
  downloadBookingsCSV: async (filters: ExportFilters = {}): Promise<void> => {
    const response = await api.get('/export/bookings/csv', {
      params: filters,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
