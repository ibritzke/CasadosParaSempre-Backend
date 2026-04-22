import { Router } from 'express';
import { register, login, googleAuth, completeGoogleProfile, me, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/google/complete', completeGoogleProfile);
router.get('/me', authenticate, me);
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
export default router;
