import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import pillRoutes from './routes/pill.routes';
import calendarRoutes from './routes/calendar.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://casados-para-sempre.vercel.app',
  ],
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições, tente novamente em alguns minutos.' },
}));
app.use(express.json({ limit: '10kb' }));

// Health
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pills', pillRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

export default app;
