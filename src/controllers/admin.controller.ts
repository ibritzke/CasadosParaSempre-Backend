import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../lib/supabase';

export async function getStats(_req: AuthRequest, res: Response) {
  const [totalUsers, husbands, wives, totalDraws, totalRecords, totalEvents] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'HUSBAND' } }),
    prisma.user.count({ where: { role: 'WIFE' } }),
    prisma.pillDraw.count({ where: { cancelled: false } }),
    prisma.pillRecord.count(),
    prisma.calendarEvent.count(),
  ]);

  return res.json({ stats: { totalUsers, husbands, wives, couples: Math.min(husbands, wives), totalDraws, totalRecords, totalEvents } });
}

export async function getUsers(req: AuthRequest, res: Response) {
  const { page = '1', limit = '20', search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = search
    ? { OR: [{ name: { contains: String(search), mode: 'insensitive' as const } }, { email: { contains: String(search), mode: 'insensitive' as const } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, spouseName: true, isAdmin: true, isActive: true, createdAt: true, _count: { select: { pillDraws: true, pillRecords: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function toggleUserAdmin(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (id === req.user!.id) return res.status(400).json({ error: 'Não pode alterar seu próprio admin' });
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const updated = await prisma.user.update({ where: { id }, data: { isAdmin: !user.isAdmin } });
  return res.json({ user: { id: updated.id, isAdmin: updated.isAdmin } });
}

export async function toggleUserActive(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (id === req.user!.id) return res.status(400).json({ error: 'Não pode desativar sua própria conta' });
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  return res.json({ user: { id: updated.id, isActive: updated.isActive } });
}

export async function getPillStats(_req: AuthRequest, res: Response) {
  const pillStats = await prisma.pillDraw.groupBy({
    by: ['pillId'],
    _count: { pillId: true },
    where: { cancelled: false },
    orderBy: { _count: { pillId: 'desc' } },
  });

  const pills = await prisma.pill.findMany({ select: { id: true, name: true, emoji: true, color: true } });
  const pillMap = Object.fromEntries(pills.map(p => [p.id, p]));

  return res.json({
    pillStats: pillStats.map(s => ({ ...pillMap[s.pillId], count: s._count.pillId })),
  });
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params;

  if (id === req.user!.id) {
    return res.status(400).json({ error: 'Não pode excluir sua própria conta' });
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  // 1. Remove do Supabase primeiro
  if (user.googleId) {
    const { error } = await supabase.auth.admin.deleteUser(user.googleId);

    if (error) {
      return res.status(500).json({
        error: 'Erro ao remover usuário do Supabase',
        details: error.message,
      });
    }
  }

  // 2. Remove do banco
  await prisma.user.delete({ where: { id } });

  return res.json({ message: 'Conta removida com sucesso' });
}