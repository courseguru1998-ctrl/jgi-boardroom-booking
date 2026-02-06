import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addJgiUsers() {
  console.log('Adding JGI users...');

  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const userPassword = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jgi.edu' },
    update: {},
    create: {
      email: 'admin@jgi.edu',
      passwordHash: adminPassword,
      firstName: 'JGI',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'Administration',
    },
  });
  console.log('Created admin:', admin.email);

  const user = await prisma.user.upsert({
    where: { email: 'john.doe@jgi.edu' },
    update: {},
    create: {
      email: 'john.doe@jgi.edu',
      passwordHash: userPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      department: 'Faculty',
    },
  });
  console.log('Created user:', user.email);

  await prisma.$disconnect();
  console.log('JGI users added successfully!');
}

addJgiUsers().catch(console.error);
