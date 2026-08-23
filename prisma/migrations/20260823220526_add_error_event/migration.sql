-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('NEW', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "error_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "fileName" TEXT,
    "lineNumber" INTEGER,
    "codeSnippet" TEXT,
    "environment" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "status" "ErrorStatus" NOT NULL DEFAULT 'NEW',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "error_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_events_projectId_isActive_idx" ON "error_events"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "error_events_projectId_createdAt_idx" ON "error_events"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "error_events_projectId_status_idx" ON "error_events"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "error_events_projectId_fingerprint_key" ON "error_events"("projectId", "fingerprint");

-- AddForeignKey
ALTER TABLE "error_events" ADD CONSTRAINT "error_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
