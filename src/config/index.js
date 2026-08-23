import 'dotenv/config';

const config = {
  env: process.env.ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  database: {
    url: process.env.DATABASE_URL,
    readUrl: process.env.DATABASE_READ_URL,
  },
  redis: {
    clusterUrls: process.env.REDIS_CLUSTER_URLS?.split(',') || [],
    password: process.env.REDIS_PASSWORD,
  },

  adminSecret: process.env.ADMIN_SECRET,

  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY,
    signingKey: process.env.INNGEST_SIGNING_KEY,
    baseUrl: process.env.INNGEST_BASE_URL,
    serveOrigin: process.env.INNGEST_SERVE_ORIGIN,
  },

  github: {
    token: process.env.GITHUB_TOKEN,
  },
  ai: {
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
    model: process.env.AI_MODEL || 'openai/gpt-oss-120b',
  },

  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  cors: {
    origins: process.env.CORS_ORIGIN?.split(',') || ['*'],
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  }
};

const requiredEnvVars = ['DATABASE_URL', 'ADMIN_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}


export default config;
