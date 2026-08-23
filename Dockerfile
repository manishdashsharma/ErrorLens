FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.js ./
COPY src ./src

# prisma generate only needs the schema to resolve, not a live connection —
# ARG stays build-scoped and never leaks into the final image's runtime
# environment (unlike ENV, which persists in every layer after it).
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN DATABASE_URL=$DATABASE_URL npx prisma generate

RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
