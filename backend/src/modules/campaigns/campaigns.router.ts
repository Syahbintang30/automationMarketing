import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CampaignsService } from './campaigns.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { DraftsService } from '../ai/drafts.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

export const campaignsRouter = Router();

// Campaign validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  targetProvince: z.string().min(2),
  targetCity: z.string().optional(),
  businessCategory: z.string().min(2),
  serviceOffering: z.string().min(3),
  dailySendLimit: z.number().min(1).max(500).optional(),
  discoverySettings: z.record(z.unknown()).optional(),
  scheduleSettings: z.record(z.unknown()).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial().extend({
  isPaused: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
});

// GET /api/v1/campaigns
campaignsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = await CampaignsService.listCampaigns();
    return res.status(200).json({ success: true, data: campaigns });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/campaigns/:id
campaignsRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await CampaignsService.getCampaignById(req.params.id);
    return res.status(200).json({ success: true, data: campaign });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/campaigns
campaignsRouter.post(
  '/',
  authenticate,
  validateRequest({ body: createCampaignSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await CampaignsService.createCampaign(req.body, req.user?.userId);
      return res.status(201).json({ success: true, data: campaign, message: 'Campaign created successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

// PUT /api/v1/campaigns/:id
campaignsRouter.put(
  '/:id',
  authenticate,
  validateRequest({ body: updateCampaignSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await CampaignsService.updateCampaign(req.params.id, req.body, req.user?.userId);
      return res.status(200).json({ success: true, data: campaign, message: 'Campaign updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

// POST /api/v1/campaigns/:id/pause
campaignsRouter.post('/:id/pause', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await CampaignsService.togglePause(req.params.id, true, req.user?.userId);
    return res.status(200).json({ success: true, data: campaign, message: 'Campaign paused' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/campaigns/:id/resume
campaignsRouter.post('/:id/resume', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await CampaignsService.togglePause(req.params.id, false, req.user?.userId);
    return res.status(200).json({ success: true, data: campaign, message: 'Campaign resumed' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/campaigns/:id/discover
campaignsRouter.post('/:id/discover', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { providerId } = req.body;
    const result = await DiscoveryService.runDiscoveryForCampaign(req.params.id, providerId);
    return res.status(200).json({
      success: true,
      message: `Lead discovery completed. Processed: ${result.processedCount}, Failed: ${result.failedCount}`,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/campaigns/:id/drafts
campaignsRouter.post('/:id/drafts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drafts = await DraftsService.generateDraftsForCampaign(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Generated ${drafts.length} drafts for review`,
      data: drafts,
    });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/v1/campaigns/:id
campaignsRouter.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await CampaignsService.archiveCampaign(req.params.id, req.user?.userId);
    return res.status(200).json({ success: true, data: campaign, message: 'Campaign archived' });
  } catch (err) {
    return next(err);
  }
});
