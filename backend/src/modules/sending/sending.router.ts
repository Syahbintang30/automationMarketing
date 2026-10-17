import { Router, Request, Response, NextFunction } from 'express';
import { SendingQueueService } from './sending-queue.service';
import { GmailService } from './gmail.service';
import { authenticate } from '../../middleware/auth.middleware';
import { SendStatus } from '@prisma/client';

export const sendingRouter = Router();

// GET /api/v1/sending-queue
sendingRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId, status, page, limit } = req.query;
    const result = await SendingQueueService.listSendLogs({
      campaignId: campaignId as string | undefined,
      status: status as SendStatus | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/sending-queue/process
sendingRouter.post('/process', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId } = req.body;
    const result = await SendingQueueService.processApprovedQueue(campaignId, req.user?.userId);
    return res.status(200).json({
      success: true,
      message: `Queue processed: ${result.sent} sent, ${result.suppressed} suppressed, ${result.failed} failed`,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/sending-queue/pause
sendingRouter.post('/pause', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SendingQueueService.setGlobalPause(true, req.user?.userId);
    return res.status(200).json({ success: true, message: 'Global sending paused', data: result });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/sending-queue/resume
sendingRouter.post('/resume', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SendingQueueService.setGlobalPause(false, req.user?.userId);
    return res.status(200).json({ success: true, message: 'Global sending resumed', data: result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/integrations/gmail/status
sendingRouter.get('/integrations/gmail/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await GmailService.getConnectionStatus();
    return res.status(200).json({ success: true, data: status });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/integrations/gmail/auth-url
sendingRouter.get('/integrations/gmail/auth-url', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = GmailService.getAuthUrl();
    return res.status(200).json({ success: true, data: { url } });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/integrations/gmail/callback
sendingRouter.post('/integrations/gmail/callback', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;
    const connection = await GmailService.handleAuthCallback(code);
    return res.status(200).json({ success: true, message: 'Gmail connected successfully', data: connection });
  } catch (err) {
    return next(err);
  }
});
