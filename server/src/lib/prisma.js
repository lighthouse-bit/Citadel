// server/src/lib/prisma.js  ← create this file
const { PrismaClient } = require('@prisma/client');

// ✅ Prevent multiple Prisma instances in serverless/dev
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;