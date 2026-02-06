import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service.js';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  BookingFilterInput,
} from '../validators/booking.validators.js';

export class BookingController {
  async create(
    req: Request<object, object, CreateBookingInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const booking = await bookingService.create(req.user!.userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async findAll(
    req: Request<object, object, object, BookingFilterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await bookingService.findAll(req.query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async findMyBookings(
    req: Request<object, object, object, Omit<BookingFilterInput, 'userId'>>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await bookingService.findByUser(req.user!.userId, req.query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async findById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const booking = await bookingService.findById(req.params.id);

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: Request<{ id: string }, object, UpdateBookingInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const booking = await bookingService.update(
        req.params.id,
        req.user!.userId,
        req.user!.role === 'ADMIN',
        req.body
      );

      res.json({
        success: true,
        message: 'Booking updated successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const booking = await bookingService.cancel(
        req.params.id,
        req.user!.userId,
        req.user!.role === 'ADMIN'
      );

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();
