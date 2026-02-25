import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

console.log('[Prisma] Initializing client...');
export const prisma = globalForPrisma.prisma || new PrismaClient();
console.log('[Prisma] Client ready.');

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
