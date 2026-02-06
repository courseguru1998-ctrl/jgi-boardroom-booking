# Boardroom Booking System

A full-stack web application for booking meeting rooms in an organization.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + BullMQ
- **Calendar**: Google Calendar API + Microsoft Graph API
- **Email**: SendGrid

## Getting Started

### Prerequisites

- Node.js >= 18
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository and install dependencies:

```bash
cd boardroom-booking
npm install
```

2. Start the database and Redis services:

```bash
docker-compose up -d
```

3. Set up the database:

```bash
cd server
npx prisma migrate dev
npx prisma generate
npm run db:seed
```

4. Start the development servers:

```bash
# From the root directory
npm run dev
```

This will start:
- Backend API at http://localhost:3000
- Frontend at http://localhost:5173

### Default Users

After seeding, you can login with:

- **Admin**: admin@example.com / Admin123!
- **User**: user@example.com / User123!

## Project Structure

```
boardroom-booking/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand stores
│   │   └── types/         # TypeScript types
│   └── ...
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── validators/    # Zod schemas
│   │   ├── jobs/          # Background workers
│   │   └── templates/     # Email templates
│   └── prisma/            # Database schema
└── docker-compose.yml      # Docker services
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Current user

### Rooms
- `GET /api/v1/rooms` - List rooms
- `GET /api/v1/rooms/:id` - Room details
- `GET /api/v1/rooms/:id/availability` - Room availability
- `POST /api/v1/rooms` - Create room (admin)
- `PATCH /api/v1/rooms/:id` - Update room (admin)
- `DELETE /api/v1/rooms/:id` - Delete room (admin)

### Bookings
- `GET /api/v1/bookings` - List all bookings
- `GET /api/v1/bookings/my` - Current user's bookings
- `GET /api/v1/bookings/:id` - Booking details
- `POST /api/v1/bookings` - Create booking
- `PATCH /api/v1/bookings/:id` - Update booking
- `DELETE /api/v1/bookings/:id` - Cancel booking

### Calendar Integration
- `GET /api/v1/calendar/connections` - List connections
- `GET /api/v1/calendar/connect/:provider` - OAuth connect
- `DELETE /api/v1/calendar/disconnect/:provider` - Disconnect

### Admin
- `GET /api/v1/admin/users` - List users
- `POST /api/v1/admin/users` - Create user
- `PATCH /api/v1/admin/users/:id` - Update user
- `DELETE /api/v1/admin/users/:id` - Deactivate user
- `GET /api/v1/admin/analytics` - Analytics dashboard
- `GET /api/v1/admin/audit-logs` - Audit logs

## Features

- User authentication with JWT and refresh tokens
- Room management with filtering by capacity, amenities, building
- Booking creation with conflict detection
- Recurring bookings support (RRULE)
- Email notifications (confirmation, reminders, cancellation)
- Google Calendar and Microsoft Outlook integration
- Admin dashboard with analytics
- Responsive design

## Environment Variables

See `.env.example` for all configuration options.

## License

MIT
