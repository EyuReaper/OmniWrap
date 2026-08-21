import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Prisma 7 dropped `datasourceUrl` in favour of driver adapters — the
// constructor throws if constructed without one. PrismaPg wraps a `pg` pool
// (created lazily from the connection string) and lets the client manage it.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;