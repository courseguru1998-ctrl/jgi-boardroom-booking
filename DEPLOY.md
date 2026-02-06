# JGI Boardroom Booking - Deployment Guide

## Quick Deploy (Frontend Only)

### Option 1: Vercel CLI

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project root**:
   ```bash
   cd boardroom-booking
   vercel deploy --prod
   ```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from Git or drag-drop the project folder
4. Configure:
   - Framework: Vite
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/dist`
5. Click Deploy

---

## Full Stack Deployment

### Frontend (Vercel)
Follow the steps above.

### Backend (Railway/Render)

The backend requires:
- PostgreSQL database
- Redis (for email queues)
- Persistent server (for background workers)

#### Railway Deployment:

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Add Redis
5. Deploy from GitHub or CLI
6. Set environment variables:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
PORT=3001
```

#### Render Deployment:

1. Go to [render.com](https://render.com)
2. Create Web Service
3. Connect repository
4. Configure:
   - Build Command: `cd server && npm install && npx prisma generate && npm run build`
   - Start Command: `cd server && npm start`
5. Add PostgreSQL and Redis from Render dashboard
6. Set environment variables

---

## Environment Variables Reference

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., `https://api.example.com/api/v1`) |

### Backend
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL (for migrations) |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `NODE_ENV` | Yes | Set to `production` |
| `SENDGRID_API_KEY` | No | For email notifications |
| `SENDGRID_FROM_EMAIL` | No | Sender email address |

---

## Database Setup

After deploying the backend:

1. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Seed initial data:
   ```bash
   npm run db:seed
   ```

---

## Test Credentials

After seeding:
- **Admin**: admin@jgi.edu / Admin123!
- **User**: john.doe@jgi.edu / Password123!

---

## Troubleshooting

### CORS Errors
Ensure `FRONTEND_URL` matches your Vercel domain exactly.

### Database Connection
Use `?sslmode=require` in your PostgreSQL URL for cloud databases.

### Redis Connection
Use TLS-enabled Redis URLs for production (Upstash recommended).
