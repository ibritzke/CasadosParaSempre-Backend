import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const eventSchema = z.object({
  type: z.enum(['SEX', 'PERIOD', 'CYCLE', 'NOTE']),
  date: z.string().datetime(),
  note: z.string().max(1000).optional(),
});

export async function getEvents(req: AuthRequest, res: Response) {
  const { month, year } = req.query;
  const userId = req.user!.id;

  const where: Record<string, unknown> = { userId };
  if (month && year) {
    const start = new Date(Number(year), Number(month), 1);
    const end = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { date: 'asc' },
  });
  return res.json({ events });
}

export async function createEvent(req: AuthRequest, res: Response) {
  try {
    const data = eventSchema.parse(req.body);
    const event = await prisma.calendarEvent.create({
      data: { userId: req.user!.id, type: data.type, date: new Date(data.date), note: data.note },
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
  const updated = await prisma.calendarEvent.update({ where: { id }, data });
  return res.json({ event: updated });
}

export async function deleteEvent(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user!.id } });
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  await prisma.calendarEvent.delete({ where: { id } });
  return res.json({ message: 'Evento removido' });
}
