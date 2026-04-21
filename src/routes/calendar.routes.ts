import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getEvents);
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
