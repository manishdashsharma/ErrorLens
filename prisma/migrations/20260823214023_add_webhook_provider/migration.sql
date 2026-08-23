-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('SLACK', 'TEAMS', 'DISCORD', 'CUSTOM');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "webhookProvider" "WebhookProvider";
