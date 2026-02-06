import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { roomRouter } from './routes/room.routes.js';
import { bookingRouter } from './routes/booking.routes.js';
import { calendarRouter } from './routes/calendar.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { exportRouter } from './routes/export.routes.js';
import { checkInRouter } from './routes/checkin.routes.js';
import { waitlistRouter } from './routes/waitlist.routes.js';
import {
  authRateLimit,
  bookingRateLimit,
  exportRateLimit,
} from './middleware/rateLimit.js';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow any localhost port in development
        if (origin.match(/^http:\/\/localhost:\d+$/)) {
          return callback(null, true);
        }
        // Allow Vercel preview and production URLs
        if (origin.match(/^https:\/\/.*\.vercel\.app$/)) {
          return callback(null, true);
        }
        if (config.frontendUrl && origin === config.frontendUrl) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  });
  app.use('/api', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes with specific rate limiters
  app.use('/api/v1/auth', authRateLimit, authRouter);
  app.use('/api/v1/rooms', roomRouter);
  app.use('/api/v1/bookings', bookingRateLimit, bookingRouter);
  app.use('/api/v1/calendar', calendarRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/export', exportRateLimit, exportRouter);
  app.use('/api/v1/checkins', checkInRouter);
  app.use('/api/v1/waitlist', waitlistRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
