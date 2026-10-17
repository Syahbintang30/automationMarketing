import { Router, Request, Response, NextFunction } from 'express';
import { ExportService } from './export.service';
import { authenticate } from '../../middleware/auth.middleware';
import { OutreachStatus, QualificationStatus } from '@prisma/client';

export const exportRouter = Router();

// GET /api/v1/exports/leads
exportRouter.get('/leads', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId, province, city, category, outreachStatus, qualificationStatus, format } = req.query;

    const workbook = await ExportService.generateLeadsWorkbook(
      {
        campaignId: campaignId as string | undefined,
        province: province as string | undefined,
        city: city as string | undefined,
        businessCategory: category as string | undefined,
        outreachStatus: outreachStatus as OutreachStatus | undefined,
        qualificationStatus: qualificationStatus as QualificationStatus | undefined,
      },
      req.user?.userId
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const isCsv = format === 'csv';

    if (isCsv) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="wardell_leads_${timestamp}.csv"`);
      await workbook.csv.write(res);
      return res.end();
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="wardell_leads_${timestamp}.xlsx"`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    return next(err);
  }
});
