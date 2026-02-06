import { Request, Response, NextFunction } from 'express';
import { roomService } from '../services/room.service.js';
import type {
  CreateRoomInput,
  UpdateRoomInput,
  RoomFilterInput,
} from '../validators/room.validators.js';

export class RoomController {
  async create(
    req: Request<object, object, CreateRoomInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const room = await roomService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  async findAll(
    req: Request<object, object, object, RoomFilterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await roomService.findAll(req.query);

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
      const room = await roomService.findById(req.params.id);

      res.json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: Request<{ id: string }, object, UpdateRoomInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const room = await roomService.update(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await roomService.delete(req.params.id);

      res.json({
        success: true,
        message: 'Room deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(
    req: Request<{ id: string }, object, object, { date: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const availability = await roomService.getAvailability(
        req.params.id,
        req.query.date
      );

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const roomController = new RoomController();
