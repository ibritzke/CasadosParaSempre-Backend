import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const eventSchema = z.object({
  type: z.enum(['SEX', 'PERIOD', 'NOTE']),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  note: z.string().max(1000).optional(),
});

export async function getEvents(req: AuthRequest, res: Response) {
  const { month, year } = req.query;
  const userId = req.user!.id;

  const where: Record<string, unknown> = { userId };
  if (month && year) {
    // Include events that START or END within the month, or span across it
    const start = new Date(Number(year), Number(month), 1);
    const end = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);
    where.OR = [
      { date: { gte: start, lte: end } },
      { endDate: { gte: start, lte: end } },
      // Period spans entire month
      { AND: [{ date: { lte: start } }, { endDate: { gte: end } }] },
    ];
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  // Calculate average cycle length from PERIOD start dates
  const allPeriods = await prisma.calendarEvent.findMany({
    where: { userId, type: 'PERIOD' },
    orderBy: { date: 'asc' },
    select: { date: true },
  });

  let avgCycleDays: number | null = null;
  if (allPeriods.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < allPeriods.length; i++) {
      const diffMs = allPeriods[i].date.getTime() - allPeriods[i - 1].date.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 14 && diffDays <= 60) gaps.push(diffDays); // Sanity check
    }
    if (gaps.length > 0) {
      avgCycleDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }
  }

  // Predict next period date
  let nextPeriodDate: string | null = null;
  if (avgCycleDays && allPeriods.length >= 1) {
    const lastPeriod = allPeriods[allPeriods.length - 1].date;
    const next = new Date(lastPeriod.getTime() + avgCycleDays * 24 * 60 * 60 * 1000);
    nextPeriodDate = next.toISOString();
  }

  return res.json({ events, avgCycleDays, nextPeriodDate });
}

export async function createEvent(req: AuthRequest, res: Response) {
  try {
    const data = eventSchema.parse(req.body);
    const event = await prisma.calendarEvent.create({
      data: {
        userId: req.user!.id,
        type: data.type,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        note: data.note,
      },
    });
    return res.status(201).json({ event });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    throw err;
  }
}

export async function updateEvent(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user!.id } });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  const data = eventSchema.partial().parse(req.body);
  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...data,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  return res.json({ event: updated });
}

export async function deleteEvent(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user!.id } });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  await prisma.calendarEvent.delete({ where: { id } });
  return res.json({ message: 'Evento removido' });
}
