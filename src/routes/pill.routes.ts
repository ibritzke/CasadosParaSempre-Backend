import { Router } from 'express';
import { drawPill, getCurrentDraw, cancelDraw, getHistory, getAllPills, createRecord, deleteRecord, updateRecord } from '../controllers/pill.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getAllPills);
router.post('/draw', drawPill);
router.get('/current', getCurrentDraw);
router.patch('/draw/:id/cancel', cancelDraw);
router.get('/history', getHistory);
router.post('/records', createRecord);
router.put('/records/:id', updateRecord);
router.delete('/records/:id', deleteRecord);

export default router;
