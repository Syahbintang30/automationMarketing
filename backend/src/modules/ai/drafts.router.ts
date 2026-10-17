import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DraftsService } from './drafts.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { ApprovalStatus } from '@prisma/client';

export const draftsRouter = Router();

const updateDraftSchema = z.object({
  subject: z.string().min(3).optional(),
  body: z.string().min(10).optional(),
});

const rejectDraftSchema = z.object({
  reason: z.string().optional(),
});

// GET /api/v1/drafts
draftsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId, approvalStatus, page, limit } = req.query;
    const result = await DraftsService.listDrafts({
      campaignId: campaignId as string | undefined,
      approvalStatus: approvalStatus as ApprovalStatus | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/drafts/:id
draftsRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draft = await DraftsService.getDraftById(req.params.id);
    return res.status(200).json({ success: true, data: draft });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/v1/drafts/:id
draftsRouter.put(
  '/:id',
  authenticate,
  validateRequest({ body: updateDraftSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const draft = await DraftsService.updateDraft(req.params.id, req.body);
      return res.status(200).json({ success: true, data: draft, message: 'Draft updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

// POST /api/v1/drafts/:id/approve
draftsRouter.post('/:id/approve', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draft = await DraftsService.approveDraft(req.params.id, req.user?.userId);
    return res.status(200).json({ success: true, data: draft, message: 'Draft approved successfully' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/drafts/:id/reject
draftsRouter.post(
  '/:id/reject',
  authenticate,
  validateRequest({ body: rejectDraftSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const draft = await DraftsService.rejectDraft(req.params.id, req.body.reason, req.user?.userId);
      return res.status(200).json({ success: true, data: draft, message: 'Draft rejected' });
    } catch (err) {
      return next(err);
    }
  }
);
