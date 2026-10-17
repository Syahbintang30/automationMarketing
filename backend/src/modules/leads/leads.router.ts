import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LeadsService } from './leads.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { OutreachStatus, QualificationStatus } from '@prisma/client';

export const leadsRouter = Router();

const createLeadSchema = z.object({
  businessName: z.string().min(2),
  businessCategory: z.string().min(2),
  province: z.string().min(2),
  city: z.string().min(2),
  businessAddress: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  emailSourceUrl: z.string().url().optional().nullable(),
  dataSource: z.string().default('MANUAL_ENTRY'),
  qualificationStatus: z.enum(['UNQUALIFIED', 'QUALIFIED', 'NEEDS_WEBSITE', 'DISQUALIFIED']).optional(),
  campaignId: z.string().uuid().optional(),
});

// GET /api/v1/leads
leadsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId, province, city, category, outreachStatus, qualificationStatus, search, page, limit } =
      req.query;

    const result = await LeadsService.listLeads({
      campaignId: campaignId as string | undefined,
      province: province as string | undefined,
      city: city as string | undefined,
      businessCategory: category as string | undefined,
      outreachStatus: outreachStatus as OutreachStatus | undefined,
      qualificationStatus: qualificationStatus as QualificationStatus | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/leads/:id
leadsRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await LeadsService.getLeadById(req.params.id);
    return res.status(200).json({ success: true, data: lead });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/leads
leadsRouter.post(
  '/',
  authenticate,
  validateRequest({ body: createLeadSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = await LeadsService.upsertLead(req.body);
      return res.status(201).json({ success: true, data: lead, message: 'Lead created or updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

// PATCH /api/v1/leads/:id/status
leadsRouter.patch('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qualificationStatus, outreachStatus } = req.body;
    const updated = await LeadsService.updateLeadStatus(req.params.id, {
      qualificationStatus,
      outreachStatus,
    });
    return res.status(200).json({ success: true, data: updated, message: 'Lead status updated' });
  } catch (err) {
    return next(err);
  }
});
