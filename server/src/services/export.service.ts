import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { format } from 'date-fns';

interface BookingFilters {
  startDate?: string;
  endDate?: string;
  roomId?: string;
  userId?: string;
  status?: string;
}

export class ExportService {
  /**
   * Generate a PDF for a single booking
   */
  async generateBookingPDF(bookingId: string): Promise<Buffer> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        attendees: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with JGI branding
      doc
        .fillColor('#001c54')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('JGI Boardroom Booking', { align: 'center' });

      doc
        .fillColor('#db9653')
        .fontSize(12)
        .font('Helvetica')
        .text('Jain (Deemed-to-be University)', { align: 'center' });

      doc.moveDown(2);

      // Title
      doc
        .fillColor('#001c54')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Booking Confirmation');

      doc.moveDown();

      // Booking details
      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);

      const details = [
        { label: 'Booking ID', value: booking.id },
        { label: 'Title', value: booking.title },
        { label: 'Status', value: booking.status },
        { label: 'Room', value: booking.room.name },
        {
          label: 'Location',
          value: `${booking.room.building || 'N/A'}, Floor ${booking.room.floor || 'N/A'}`,
        },
        { label: 'Capacity', value: `${booking.room.capacity} people` },
        { label: 'Date', value: format(startTime, 'EEEE, MMMM d, yyyy') },
        {
          label: 'Time',
          value: `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`,
        },
        {
          label: 'Organizer',
          value: `${booking.user.firstName} ${booking.user.lastName}`,
        },
        { label: 'Email', value: booking.user.email },
        { label: 'Department', value: booking.user.department || 'N/A' },
      ];

      doc.fillColor('#333333').fontSize(11).font('Helvetica');

      details.forEach(({ label, value }) => {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value);
        doc.moveDown(0.3);
      });

      // Description
      if (booking.description) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Description:');
        doc.font('Helvetica').text(booking.description);
      }

      // Attendees
      if (booking.attendees.length > 0) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Attendees:');
        booking.attendees.forEach((attendee) => {
          doc
            .font('Helvetica')
            .text(`  - ${attendee.name || attendee.email} (${attendee.email})`);
        });
      }

      // Footer
      doc.moveDown(3);
      doc
        .fillColor('#999999')
        .fontSize(9)
        .text(`Generated on ${format(new Date(), 'PPpp')}`, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generate an Excel file for multiple bookings
   */
  async generateBookingsExcel(filters: BookingFilters): Promise<Buffer> {
    const bookings = await this.getFilteredBookings(filters);

    const worksheetData = [
      [
        'Booking ID',
        'Title',
        'Status',
        'Room',
        'Building',
        'Floor',
        'Date',
        'Start Time',
        'End Time',
        'Duration (min)',
        'Organizer',
        'Email',
        'Department',
        'Attendees',
        'Created At',
      ],
      ...bookings.map((booking) => {
        const startTime = new Date(booking.startTime);
        const endTime = new Date(booking.endTime);
        const durationMinutes = Math.round(
          (endTime.getTime() - startTime.getTime()) / 60000
        );

        return [
          booking.id,
          booking.title,
          booking.status,
          booking.room.name,
          booking.room.building || '',
          booking.room.floor || '',
          format(startTime, 'yyyy-MM-dd'),
          format(startTime, 'HH:mm'),
          format(endTime, 'HH:mm'),
          durationMinutes,
          `${booking.user.firstName} ${booking.user.lastName}`,
          booking.user.email,
          booking.user.department || '',
          booking.attendees.map((a) => a.email).join(', '),
          format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm'),
        ];
      }),
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 36 }, // Booking ID
      { wch: 30 }, // Title
      { wch: 12 }, // Status
      { wch: 20 }, // Room
      { wch: 15 }, // Building
      { wch: 8 }, // Floor
      { wch: 12 }, // Date
      { wch: 10 }, // Start Time
      { wch: 10 }, // End Time
      { wch: 12 }, // Duration
      { wch: 20 }, // Organizer
      { wch: 30 }, // Email
      { wch: 15 }, // Department
      { wch: 40 }, // Attendees
      { wch: 18 }, // Created At
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * Generate a CSV file for multiple bookings
   */
  async generateBookingsCSV(filters: BookingFilters): Promise<string> {
    const bookings = await this.getFilteredBookings(filters);

    const headers = [
      'Booking ID',
      'Title',
      'Status',
      'Room',
      'Building',
      'Floor',
      'Date',
      'Start Time',
      'End Time',
      'Duration (min)',
      'Organizer',
      'Email',
      'Department',
      'Attendees',
      'Created At',
    ];

    const rows = bookings.map((booking) => {
      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);
      const durationMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / 60000
      );

      return [
        booking.id,
        `"${booking.title.replace(/"/g, '""')}"`,
        booking.status,
        `"${booking.room.name.replace(/"/g, '""')}"`,
        booking.room.building || '',
        booking.room.floor || '',
        format(startTime, 'yyyy-MM-dd'),
        format(startTime, 'HH:mm'),
        format(endTime, 'HH:mm'),
        durationMinutes,
        `"${booking.user.firstName} ${booking.user.lastName}"`,
        booking.user.email,
        booking.user.department || '',
        `"${booking.attendees.map((a) => a.email).join(', ')}"`,
        format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm'),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get filtered bookings for export
   */
  private async getFilteredBookings(filters: BookingFilters) {
    const where: Record<string, unknown> = {};

    if (filters.startDate) {
      where.startTime = {
        ...(where.startTime as Record<string, unknown> || {}),
        gte: new Date(`${filters.startDate}T00:00:00.000Z`),
      };
    }

    if (filters.endDate) {
      where.endTime = {
        ...(where.endTime as Record<string, unknown> || {}),
        lte: new Date(`${filters.endDate}T23:59:59.999Z`),
      };
    }

    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.booking.findMany({
      where,
      include: {
        room: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        attendees: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }
}

export const exportService = new ExportService();
