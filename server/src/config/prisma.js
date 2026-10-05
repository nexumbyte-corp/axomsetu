import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { getRequestContext } from '../middleware/context.middleware.js';

const globalForPrisma = globalThis;

const rawPrisma =
  globalForPrisma.rawPrisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.rawPrisma = rawPrisma;

export const prisma =
  globalForPrisma.prisma ||
  rawPrisma.$extends({
    query: {
      auditLog: {
        async create({ args, query }) {
          const ctx = getRequestContext();
          if (ctx) {
            if (!args.data.ipAddress && ctx.ipAddress) {
              args.data.ipAddress = ctx.ipAddress;
            }
            if (!args.data.userAgent && ctx.userAgent) {
              args.data.userAgent = ctx.userAgent;
            }
            if (!args.data.userId && ctx.userId) {
              args.data.userId = ctx.userId;
            }
            if (!args.data.schoolId && ctx.schoolId) {
              args.data.schoolId = ctx.schoolId;
            }
          }
          return query(args);
        },
        async createMany({ args, query }) {
          const ctx = getRequestContext();
          if (ctx && Array.isArray(args.data)) {
            for (const item of args.data) {
              if (!item.ipAddress && ctx.ipAddress) item.ipAddress = ctx.ipAddress;
              if (!item.userAgent && ctx.userAgent) item.userAgent = ctx.userAgent;
              if (!item.userId && ctx.userId) item.userId = ctx.userId;
              if (!item.schoolId && ctx.schoolId) item.schoolId = ctx.schoolId;
            }
          }
          return query(args);
        },
      },
    },
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

