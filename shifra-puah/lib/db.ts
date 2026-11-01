import { PrismaClient } from "@prisma/client";

// מופע יחיד של Prisma גם בזמן פיתוח (hot reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
