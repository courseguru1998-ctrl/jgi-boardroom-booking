import { Request, Response, NextFunction } from 'express';
import { exportService } from '../services/export.service.js';
import { format } from 'date-fns';

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  roomId?: string;
  status?: string;
}

export class ExportController {
  /**
   * Export single booking as PDF
   */
  async exportBookingPDF(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const pdf = await exportService.generateBookingPDF(req.params.id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=booking-${req.params.id}.pdf`
      );
      res.send(pdf);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export bookings as Excel
   */
  async exportBookingsExcel(
    req: Request<object, object, object, ExportFilters>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // For non-admin users, only export their own bookings
      const userId = req.user?.role === 'ADMIN' ? undefined : req.user?.id;

      const excel = await exportService.generateBookingsExcel({
        ...req.query,
        userId,
      });

      const filename = `bookings-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(excel);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export bookings as CSV
   */
  async exportBookingsCSV(
    req: Request<object, object, object, ExportFilters>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // For non-admin users, only export their own bookings
      const userId = req.user?.role === 'ADMIN' ? undefined : req.user?.id;

      const csv = await exportService.generateBookingsCSV({
        ...req.query,
        userId,
      });

      const filename = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const exportController = new ExportController();
