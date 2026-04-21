import { Router } from 'express';
import { getStats, getUsers, toggleUserAdmin, toggleUserActive, getPillStats } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/pill-stats', getPillStats);
router.patch('/users/:id/admin', toggleUserAdmin);
router.patch('/users/:id/active', toggleUserActive);

export default router;
