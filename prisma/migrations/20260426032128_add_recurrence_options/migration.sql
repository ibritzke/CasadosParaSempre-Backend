-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'CELEBRATION';

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "recurrence" TEXT NOT NULL DEFAULT 'none';
