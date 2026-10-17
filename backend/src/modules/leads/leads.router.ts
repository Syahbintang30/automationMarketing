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
    const {
      campaignId,
      province,
      city,
      category,
      outreachStatus,
      qualificationStatus,
      coldCallStatus,
      search,
      page,
      limit,
    } = req.query;

    const result = await LeadsService.listLeads({
      campaignId: campaignId as string | undefined,
      province: province as string | undefined,
      city: city as string | undefined,
      businessCategory: category as string | undefined,
      outreachStatus: outreachStatus as OutreachStatus | undefined,
      qualificationStatus: qualificationStatus as QualificationStatus | undefined,
      coldCallStatus: coldCallStatus as string | undefined,
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

// POST /api/v1/leads/scrape-gmaps
leadsRouter.post('/scrape-gmaps', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, limit } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Query pencarian Google Maps minimal 3 karakter (contoh: "dinas perhubungan bandung")',
      });
    }

    const { GmapsScraperService } = await import('../discovery/gmaps-scraper.service');
    const result = await GmapsScraperService.scrape(query.trim(), limit ? parseInt(limit, 10) : 20);

    return res.status(200).json({
      success: true,
      message: `Berhasil scrape Google Maps: ${result.places.length} data ditemukan (${result.savedCount} baru, ${result.updatedCount} diupdate)`,
      data: result.places,
      meta: {
        totalFound: result.places.length,
        savedCount: result.savedCount,
        updatedCount: result.updatedCount,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/v1/leads/:id/screening
leadsRouter.patch('/:id/screening', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { coldCallStatus, coldCallNotes } = req.body;
    const updated = await LeadsService.updateScreening(req.params.id, {
      coldCallStatus,
      coldCallNotes,
    });
    return res.status(200).json({ success: true, data: updated, message: 'Status screening & catatan cold call berhasil disimpan' });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/v1/leads/:id
leadsRouter.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await LeadsService.deleteLead(req.params.id);
    return res.status(200).json({ success: true, message: 'Lead berhasil dihapus dari screening' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/leads/bulk-delete
leadsRouter.post('/bulk-delete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Pilih minimal 1 lead untuk dihapus' });
    }
    const result = await LeadsService.bulkDeleteLeads(ids);
    return res.status(200).json({
      success: true,
      message: `${result.count} data lead berhasil dihapus dari screening`,
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
