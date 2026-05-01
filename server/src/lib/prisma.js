// server/src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient({
    // In production (Vercel), we silence query logs to save cost/logs
    // In development, we see what's happening
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
};

// Prevent multiple instances in development (hot reload)
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;