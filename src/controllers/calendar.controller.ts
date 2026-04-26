import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const eventSchema = z.object({
  type: z.enum(['SEX', 'PERIOD', 'NOTE', 'CELEBRATION']),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  recurrence: z.enum(['none', 'monthly', 'annual']).optional(),
  note: z.string().max(1000).optional(),
});

export async function getEvents(req: AuthRequest, res: Response) {
  const { month, year } = req.query;
  const userId = req.user!.id;

  const where: Record<string, unknown> = { userId };
  let exactEvents: any[] = [];
  if (month && year) {
    const start = new Date(Number(year), Number(month), 1);
    const end = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);
    where.OR = [
      { date: { gte: start, lte: end } },
      { endDate: { gte: start, lte: end } },
      { AND: [{ date: { lte: start } }, { endDate: { gte: end } }] },
    ];
  }

  exactEvents = await prisma.calendarEvent.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  // Handle recurring mappings
  let events = [...exactEvents];
  if (month && year) {
    const recurringEvents = await prisma.calendarEvent.findMany({
      where: { userId, recurrence: { in: ['monthly', 'annual'] }, date: { lt: new Date(Number(year), Number(month) + 1, 1) } }
    });
    
    const remappedRecurring = recurringEvents.flatMap(e => {
      const isMatch = e.recurrence === 'monthly' || (e.recurrence === 'annual' && e.date.getMonth() === Number(month));
      if (!isMatch) return [];
      
      const isPast = e.date.getFullYear() < Number(year) || (e.date.getFullYear() === Number(year) && e.date.getMonth() < Number(month));
      if (!isPast) return [];

      return {
        ...e,
        date: new Date(Number(year), Number(month), e.date.getDate(), e.date.getHours(), e.date.getMinutes(), e.date.getSeconds()),
        endDate: null,
      };
    });

    events = [...exactEvents, ...remappedRecurring].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

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

  // Predict next period dates and fertile windows
  const predictedPeriods: string[] = [];
  const fertileWindows: { start: string; end: string }[] = [];

  if (avgCycleDays && allPeriods.length >= 1) {
    // 1. Calculate historical/current fertile windows for recorded periods (except the very first one where we don't know the prior cycle)
    for (let i = 1; i < allPeriods.length; i++) {
      const currentPeriod = allPeriods[i].date;
      const ovulation = new Date(currentPeriod.getTime() - 14 * 24 * 60 * 60 * 1000);
      const fStart = new Date(ovulation.getTime() - 5 * 24 * 60 * 60 * 1000);
      const fEnd = new Date(ovulation.getTime() + 1 * 24 * 60 * 60 * 1000);
      fertileWindows.push({ start: fStart.toISOString(), end: fEnd.toISOString() });
    }

    // 2. Project future cycles (e.g. next 3 cycles)
    const lastPeriod = allPeriods[allPeriods.length - 1].date;
    let nextDateObj = new Date(lastPeriod.getTime() + avgCycleDays * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 3; i++) {
      predictedPeriods.push(nextDateObj.toISOString());
      
      const ovulation = new Date(nextDateObj.getTime() - 14 * 24 * 60 * 60 * 1000);
      const fStart = new Date(ovulation.getTime() - 5 * 24 * 60 * 60 * 1000);
      const fEnd = new Date(ovulation.getTime() + 1 * 24 * 60 * 60 * 1000);
      fertileWindows.push({ start: fStart.toISOString(), end: fEnd.toISOString() });
      
      nextDateObj = new Date(nextDateObj.getTime() + avgCycleDays * 24 * 60 * 60 * 1000);
    }
  }

  return res.json({ events, avgCycleDays, predictedPeriods, fertileWindows });
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
        recurrence: data.recurrence || 'none',
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
