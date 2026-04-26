-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HUSBAND', 'WIFE', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SEX', 'PERIOD', 'NOTE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "spouseName" TEXT,
    "coupleCode" TEXT,
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pill_draws" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pillId" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "pill_draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pill_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "when" TIMESTAMP(3) NOT NULL,
    "how" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pill_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "pill_draws_userId_weekNumber_year_key" ON "pill_draws"("userId", "weekNumber", "year");

-- AddForeignKey
ALTER TABLE "pill_draws" ADD CONSTRAINT "pill_draws_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pill_draws" ADD CONSTRAINT "pill_draws_pillId_fkey" FOREIGN KEY ("pillId") REFERENCES "pills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pill_records" ADD CONSTRAINT "pill_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pill_records" ADD CONSTRAINT "pill_records_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "pill_draws"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
