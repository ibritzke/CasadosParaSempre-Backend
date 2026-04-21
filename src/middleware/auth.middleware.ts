import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; isAdmin: boolean };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isAdmin: true, isActive: true },
    });

    if (!user || !user.isActive) return res.status(401).json({ error: 'Usuário inválido' });

    req.user = { id: user.id, email: user.email, role: user.role, isAdmin: user.isAdmin };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Acesso negado' });
  next();
}
