import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import config from './index.js';
import { logger } from '../shared/index.js';

let prisma;
let readPrisma;

function initializePrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: config.database.url }),
      log:
        config.env === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  if (!readPrisma && config.database.readUrl) {
    readPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: config.database.readUrl }),
      log:
        config.env === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  return { prisma, readPrisma: readPrisma || prisma };
}

async function connectDatabases() {
  try {
    logger.info('🔌 Connecting to database...');

    const { prisma: writeDB, readPrisma: readDB } = initializePrisma();
    await writeDB.$connect();
    logger.success('PostgreSQL (write) connected');

    if (readDB !== writeDB) {
      await readDB.$connect();
      logger.success('PostgreSQL (read) connected');
    }
  } catch (error) {
    logger.error(`❌ Database connection failed: ${error.message}`);
    throw error;
  }
}

function getWriteDB() {
  if (!prisma) {
    const { prisma: writeDB } = initializePrisma();
    return writeDB;
  }
  return prisma;
}

function getReadDB() {
  if (!readPrisma) {
    const { readPrisma: readDB } = initializePrisma();
    return readDB;
  }
  return readPrisma;
}

async function checkDatabaseHealth() {
  const health = {
    write: false,
    read: false,
    writeLatency: null,
    readLatency: null,
    errors: [],
  };

  try {
    const writeStart = Date.now();
    await getWriteDB().$queryRaw`SELECT 1`;
    health.write = true;
    health.writeLatency = Date.now() - writeStart;

    const readStart = Date.now();
    await getReadDB().$queryRaw`SELECT 1`;
    health.read = true;
    health.readLatency = Date.now() - readStart;
  } catch (error) {
    health.errors.push(`PostgreSQL: ${error.message}`);
  }

  return health;
}

async function disconnectDatabases() {
  try {
    logger.info('Disconnecting from database...');

    if (prisma) {
      await prisma.$disconnect();
      logger.info('✅ PostgreSQL (write) disconnected');
    }
    if (readPrisma) {
      await readPrisma.$disconnect();
      logger.info('✅ PostgreSQL (read) disconnected');
    }
  } catch (error) {
    logger.error('❌ Error disconnecting from database:', error);
  }
}

export {
  connectDatabases,
  disconnectDatabases,
  getWriteDB,
  getReadDB,
  checkDatabaseHealth,
};
