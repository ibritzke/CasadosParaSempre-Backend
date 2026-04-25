import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { week, year: d.getFullYear() };
}

function getNextMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

export async function drawPill(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { week, year } = getISOWeek(new Date());

  // Check if already has a draw this week
  const existing = await prisma.pillDraw.findUnique({
    where: { userId_weekNumber_year: { userId, weekNumber: week, year } },
    include: { pill: true },
  });

  if (existing && !existing.cancelled) {
    return res.status(409).json({ error: 'Você já sorteou uma pílula esta semana', draw: existing });
  }

  // Get pills not drawn recently (last 4 weeks)
  const recentDraws = await prisma.pillDraw.findMany({
    where: { userId, cancelled: false, drawnAt: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) } },
    select: { pillId: true },
  });
  const recentPillIds = recentDraws.map(d => d.pillId);

  const allPills = await prisma.pill.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
  const availablePills = allPills.filter(p => !recentPillIds.includes(p.id));
  const pool = availablePills.length > 0 ? availablePills : allPills;

  const pill = pool[Math.floor(Math.random() * pool.length)];
  const expiresAt = getNextMonday();

  const draw = await prisma.pillDraw.create({
    data: { userId, pillId: pill.id, weekNumber: week, year, expiresAt },
    include: { pill: true },
  });

  return res.status(201).json({ draw });
}

export async function getCurrentDraw(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { week, year } = getISOWeek(new Date());

  const draw = await prisma.pillDraw.findUnique({
    where: { userId_weekNumber_year: { userId, weekNumber: week, year } },
    include: { pill: true, records: { orderBy: { when: 'desc' } } },
  });

  return res.json({ draw: draw?.cancelled ? null : draw });
}

export async function cancelDraw(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { id } = req.params;

  const draw = await prisma.pillDraw.findFirst({ where: { id, userId } });
  if (!draw) return res.status(404).json({ error: 'Sorteio não encontrado' });

  await prisma.pillDraw.update({
    where: { id },
    data: { cancelled: true, cancelledAt: new Date() },
  });

  return res.json({ message: 'Pílula cancelada' });
}

export async function getHistory(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const draws = await prisma.pillDraw.findMany({
    where: { userId },
    include: { pill: true, records: { orderBy: { when: 'desc' } } },
    orderBy: { drawnAt: 'desc' },
  });
  return res.json({ draws });
}

export async function getAllPills(_req: AuthRequest, res: Response) {
  const pills = await prisma.pill.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
  return res.json({ pills });
}

// Records
const recordSchema = z.object({
  drawId: z.string(),
  what: z.string().min(1).max(2000),
  when: z.string().datetime(),
  how: z.string().max(2000).optional(),
});

export async function createRecord(req: AuthRequest, res: Response) {
  try {
    const data = recordSchema.parse(req.body);
    const draw = await prisma.pillDraw.findFirst({ where: { id: data.drawId, userId: req.user!.id } });
    if (!draw) return res.status(404).json({ error: 'Sorteio não encontrado' });

    const record = await prisma.pillRecord.create({
      data: { userId: req.user!.id, drawId: data.drawId, what: data.what, when: new Date(data.when), how: data.how },
    });
    return res.status(201).json({ record });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    throw err;
  }
}

export async function deleteRecord(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const record = await prisma.pillRecord.findFirst({ where: { id, userId: req.user!.id } });
  if (!record) return res.status(404).json({ error: 'Registro não encontrado' });
  await prisma.pillRecord.delete({ where: { id } });
  return res.json({ message: 'Registro removido' });
}

export async function updateRecord(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = recordSchema.parse(req.body);
    
    const record = await prisma.pillRecord.findFirst({ where: { id, userId: req.user!.id } });
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' });

    const updated = await prisma.pillRecord.update({
      where: { id },
      data: { what: data.what, when: new Date(data.when), how: data.how },
    });
    return res.json({ record: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    throw err;
  }
}
