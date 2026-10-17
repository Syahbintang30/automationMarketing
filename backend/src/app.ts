import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { healthRouter } from './routes/health.router';
import { authRouter } from './modules/auth/auth.router';
import { campaignsRouter } from './modules/campaigns/campaigns.router';
import { leadsRouter } from './modules/leads/leads.router';
import { exportRouter } from './modules/export/export.router';
import { draftsRouter } from './modules/ai/drafts.router';
import { suppressionRouter } from './modules/suppression/suppression.router';
import { sendingRouter } from './modules/sending/sending.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// API routes
app.use('/api/v1', healthRouter);
app.use('/api/v1', suppressionRouter);
app.use('/api/v1', dashboardRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/exports', exportRouter);
app.use('/api/v1/drafts', draftsRouter);
app.use('/api/v1/sending-queue', sendingRouter);

// Serve Frontend SPA static assets if built
import path from 'path';
import fs from 'fs';
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);
