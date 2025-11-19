import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export type PrismaClientType = typeof prisma;

export default prisma;

