import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
    if (origin.match(/^https:\/\/.*\.vercel\.app$/)) return callback(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true);
    callback(null, true); // Allow all origins for now
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: 'vercel' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: 'vercel' });
});

// Import and use routes dynamically
let routesLoaded = false;

async function loadRoutes() {
  if (routesLoaded) return;

  try {
    const { authRouter } = await import('../server/src/routes/auth.routes.js');
    const { roomRouter } = await import('../server/src/routes/room.routes.js');
    const { bookingRouter } = await import('../server/src/routes/booking.routes.js');
    const { adminRouter } = await import('../server/src/routes/admin.routes.js');
    const { checkInRouter } = await import('../server/src/routes/checkin.routes.js');
    const { waitlistRouter } = await import('../server/src/routes/waitlist.routes.js');
    const { exportRouter } = await import('../server/src/routes/export.routes.js');

    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/rooms', roomRouter);
    app.use('/api/v1/bookings', bookingRouter);
    app.use('/api/v1/admin', adminRouter);
    app.use('/api/v1/checkins', checkInRouter);
    app.use('/api/v1/waitlist', waitlistRouter);
    app.use('/api/v1/export', exportRouter);

    routesLoaded = true;
  } catch (error) {
    console.error('Failed to load routes:', error);
  }
}

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await loadRoutes();
  return new Promise<void>((resolve) => {
    app(req as unknown as Request, res as unknown as Response, () => {
      resolve();
    });
  });
}
