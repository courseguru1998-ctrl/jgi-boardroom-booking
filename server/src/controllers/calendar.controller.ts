import { Request, Response, NextFunction } from 'express';
import { calendarService } from '../services/calendar.service.js';
import { config } from '../config/index.js';
import { BadRequestError } from '../utils/errors.js';

type CalendarProvider = 'google' | 'microsoft';

export class CalendarController {
  async connect(
    req: Request<{ provider: CalendarProvider }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { provider } = req.params;
      let authUrl: string;

      switch (provider) {
        case 'google':
          authUrl = calendarService.getGoogleAuthUrl(req.user!.userId);
          break;
        case 'microsoft':
          authUrl = calendarService.getMicrosoftAuthUrl(req.user!.userId);
          break;
        default:
          throw new BadRequestError('Invalid calendar provider');
      }

      res.json({
        success: true,
        data: { authUrl },
      });
    } catch (error) {
      next(error);
    }
  }

  async callback(
    req: Request<{ provider: CalendarProvider }, object, object, { code: string; state: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { provider } = req.params;
      const { code, state: userId } = req.query;

      if (!code || !userId) {
        throw new BadRequestError('Missing authorization code or state');
      }

      switch (provider) {
        case 'google':
          await calendarService.handleGoogleCallback(code, userId);
          break;
        case 'microsoft':
          await calendarService.handleMicrosoftCallback(code, userId);
          break;
        default:
          throw new BadRequestError('Invalid calendar provider');
      }

      // Redirect to frontend settings page
      res.redirect(`${config.frontendUrl}/settings?calendar=${provider}&connected=true`);
    } catch {
      // Redirect to frontend with error
      res.redirect(`${config.frontendUrl}/settings?calendar=error`);
    }
  }

  async disconnect(
    req: Request<{ provider: CalendarProvider }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { provider } = req.params;

      if (provider !== 'google' && provider !== 'microsoft') {
        throw new BadRequestError('Invalid calendar provider');
      }

      await calendarService.disconnect(
        req.user!.userId,
        provider.toUpperCase() as 'GOOGLE' | 'MICROSOFT'
      );

      res.json({
        success: true,
        message: `${provider} calendar disconnected`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getConnections(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const connections = await calendarService.getConnections(req.user!.userId);

      res.json({
        success: true,
        data: connections,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const calendarController = new CalendarController();
