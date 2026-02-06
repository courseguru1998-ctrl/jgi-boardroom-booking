import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addUsers() {
  console.log('Adding new users...');

  const password = await bcrypt.hash('Password123!', 12);

  const santhosh = await prisma.user.upsert({
    where: { email: 'ms.santhosh@jgi.edu' },
    update: {},
    create: {
      email: 'ms.santhosh@jgi.edu',
      passwordHash: password,
      firstName: 'MS',
      lastName: 'Santhosh',
      role: 'USER',
      department: 'Faculty',
    },
  });
  console.log('Created:', santhosh.email);

  const prajwal = await prisma.user.upsert({
    where: { email: 'prajwal.raghu@jgi.edu' },
    update: {},
    create: {
      email: 'prajwal.raghu@jgi.edu',
      passwordHash: password,
      firstName: 'Prajwal',
      lastName: 'Raghu',
      role: 'USER',
      department: 'Faculty',
    },
  });
  console.log('Created:', prajwal.email);

  await prisma.$disconnect();
  console.log('Users added successfully!');
}

addUsers().catch(console.error);
