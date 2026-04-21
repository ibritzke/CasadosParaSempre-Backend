import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

router.patch('/me', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    spouseName: z.string().optional(),
    coupleCode: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: { id: true, name: true, email: true, role: true, spouseName: true, coupleCode: true, isAdmin: true },
  });
  return res.json({ user });
});

export default router;
