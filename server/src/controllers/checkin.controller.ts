import { Request, Response, NextFunction } from 'express';
import { checkInService } from '../services/checkin.service.js';

export class CheckInController {
  /**
   * Check in to a booking
   */
  async checkIn(
    req: Request<object, object, { bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { bookingId } = req.body;

      const checkIn = await checkInService.checkIn(bookingId, userId);

      res.status(201).json({
        success: true,
        message: 'Checked in successfully',
        data: checkIn,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get check-in status for a booking
   */
  async getCheckInStatus(
    req: Request<{ bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = await checkInService.getCheckInStatus(req.params.bookingId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if current user is checked in
   */
  async isCheckedIn(
    req: Request<{ bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const isCheckedIn = await checkInService.isUserCheckedIn(
        req.params.bookingId,
        userId
      );

      res.json({
        success: true,
        data: { isCheckedIn },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's check-ins for today
   */
  async getMyCheckInsToday(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const checkIns = await checkInService.getUserCheckInsToday(userId);

      res.json({
        success: true,
        data: checkIns,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const checkInController = new CheckInController();
