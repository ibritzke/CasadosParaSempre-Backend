import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['HUSBAND', 'WIFE']),
  spouseName: z.string().optional(),
  coupleCode: z.string().optional(),
});

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        spouseName: data.spouseName,
        coupleCode: data.coupleCode,
        isAdmin: false,
      },
      select: { id: true, name: true, email: true, role: true, spouseName: true, isAdmin: true, createdAt: true },
    });

    const token = signToken(user.id);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    throw err;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Email ou senha incorretos' });
    if (!user.isActive) return res.status(401).json({ error: 'Conta desativada' });

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Email ou senha incorretos' });

    const token = signToken(user.id);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, spouseName: user.spouseName, isAdmin: user.isAdmin, createdAt: user.createdAt },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    throw err;
  }
}

export async function googleAuth(req: Request, res: Response) {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Token do Google não fornecido' });

    // Verify token with Supabase
    const { data: { user: sbUser }, error } = await supabase.auth.getUser(accessToken);
    if (error || !sbUser) return res.status(401).json({ error: 'Token Google inválido' });

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: sbUser.id }, { email: sbUser.email! }] },
    });

    if (!user) {
      // New user - needs role selection
      return res.status(206).json({
        message: 'complete_profile',
        googleId: sbUser.id,
        name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
        email: sbUser.email,
        avatarUrl: sbUser.user_metadata?.avatar_url,
      });
    }

    // Update googleId if missing
    if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: sbUser.id } });
    }

    const token = signToken(user.id);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, spouseName: user.spouseName, isAdmin: user.isAdmin, createdAt: user.createdAt },
    });
  } catch (err) {
    throw err;
  }
}

const completeProfileSchema = z.object({
  googleId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  avatarUrl: z.string().optional(),
  role: z.enum(['HUSBAND', 'WIFE']),
  spouseName: z.string().optional(),
  coupleCode: z.string().optional(),
});

export async function completeGoogleProfile(req: Request, res: Response) {
  try {
    const data = completeProfileSchema.parse(req.body);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        googleId: data.googleId,
        avatarUrl: data.avatarUrl,
        role: data.role,
        spouseName: data.spouseName,
        coupleCode: data.coupleCode,
        isAdmin: false,
      },
      select: { id: true, name: true, email: true, role: true, spouseName: true, isAdmin: true, createdAt: true },
    });

    const token = signToken(user.id);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
    throw err;
  }
}

import { AuthRequest } from '../middleware/auth.middleware';
export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, spouseName: true, coupleCode: true, avatarUrl: true, isAdmin: true, createdAt: true },
  });
  return res.json({ user });
}
