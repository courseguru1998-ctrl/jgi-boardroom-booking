import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      department: 'IT',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create regular user
  const userPassword = await bcrypt.hash('User123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: 'USER',
      department: 'Engineering',
    },
  });
  console.log('Created regular user:', user.email);

  // Create sample rooms
  const rooms = [
    {
      name: 'Conference Room A',
      capacity: 10,
      floor: '1',
      building: 'Main Building',
      amenities: ['projector', 'whiteboard', 'video-conferencing'],
    },
    {
      name: 'Conference Room B',
      capacity: 6,
      floor: '1',
      building: 'Main Building',
      amenities: ['tv-screen', 'whiteboard'],
    },
    {
      name: 'Board Room',
      capacity: 20,
      floor: '3',
      building: 'Main Building',
      amenities: ['projector', 'video-conferencing', 'audio-system', 'whiteboard'],
    },
    {
      name: 'Meeting Room 1',
      capacity: 4,
      floor: '2',
      building: 'Main Building',
      amenities: ['tv-screen'],
    },
    {
      name: 'Meeting Room 2',
      capacity: 4,
      floor: '2',
      building: 'Main Building',
      amenities: ['tv-screen'],
    },
    {
      name: 'Training Room',
      capacity: 30,
      floor: '2',
      building: 'Annex',
      amenities: ['projector', 'whiteboard', 'audio-system', 'video-conferencing'],
    },
  ];

  for (const roomData of rooms) {
    const room = await prisma.room.upsert({
      where: { id: roomData.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        ...roomData,
        amenities: JSON.stringify(roomData.amenities),
      },
    });
    console.log('Created room:', room.name);
  }

  // Create sample bookings for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const conferenceRoomA = await prisma.room.findFirst({
    where: { name: 'Conference Room A' },
  });

  if (conferenceRoomA) {
    const booking1Start = new Date(today);
    booking1Start.setHours(9, 0, 0, 0);
    const booking1End = new Date(today);
    booking1End.setHours(10, 0, 0, 0);

    await prisma.booking.upsert({
      where: { id: 'sample-booking-1' },
      update: {},
      create: {
        id: 'sample-booking-1',
        userId: user.id,
        roomId: conferenceRoomA.id,
        title: 'Team Standup',
        description: 'Daily standup meeting',
        startTime: booking1Start,
        endTime: booking1End,
        status: 'CONFIRMED',
      },
    });
    console.log('Created sample booking: Team Standup');

    const booking2Start = new Date(today);
    booking2Start.setHours(14, 0, 0, 0);
    const booking2End = new Date(today);
    booking2End.setHours(15, 30, 0, 0);

    await prisma.booking.upsert({
      where: { id: 'sample-booking-2' },
      update: {},
      create: {
        id: 'sample-booking-2',
        userId: admin.id,
        roomId: conferenceRoomA.id,
        title: 'Project Review',
        description: 'Quarterly project review meeting',
        startTime: booking2Start,
        endTime: booking2End,
        status: 'CONFIRMED',
        attendees: {
          create: [
            { email: user.email, name: `${user.firstName} ${user.lastName}` },
          ],
        },
      },
    });
    console.log('Created sample booking: Project Review');
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
