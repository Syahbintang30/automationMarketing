import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma';
import { authenticate } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import { ApprovalStatus, JobStatus, OutreachStatus, SendStatus } from '@prisma/client';

export const dashboardRouter = Router();

// GET /api/v1/dashboard/stats
dashboardRouter.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalEligibleLeads,
      draftsAwaitingApproval,
      emailsSent,
      failedSends,
      suppressedContacts,
      activeJobsCount,
      pauseConfig,
      leadsByProvinceRaw,
      leadsByCategoryRaw,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.emailDraft.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
      prisma.emailSendLog.count({ where: { status: SendStatus.SENT } }),
      prisma.emailSendLog.count({ where: { status: SendStatus.FAILED } }),
      prisma.suppressionEntry.count(),
      prisma.jobExecution.count({ where: { status: JobStatus.ACTIVE } }),
      prisma.appConfig.findUnique({ where: { key: 'GLOBAL_SENDING_PAUSED' } }),
      prisma.lead.groupBy({ by: ['province'], _count: { id: true } }),
      prisma.lead.groupBy({ by: ['businessCategory'], _count: { id: true } }),
    ]);

    const isSendingPausedGlobally = pauseConfig?.value === 'true';

    return res.status(200).json({
      success: true,
      data: {
        totalEligibleLeads,
        draftsAwaitingApproval,
        emailsSent,
        failedSends,
        suppressedContacts,
        activeJobsCount,
        isSendingPausedGlobally,
        isDryRun: env.DRY_RUN,
        leadsByProvince: leadsByProvinceRaw.map((p) => ({ province: p.province, count: p._count.id })),
        leadsByCategory: leadsByCategoryRaw.map((c) => ({ category: c.businessCategory, count: c._count.id })),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/jobs
dashboardRouter.get('/jobs', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const [total, jobs] = await Promise.all([
      prisma.jobExecution.count(),
      prisma.jobExecution.findMany({
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { campaign: { select: { id: true, name: true } } },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/v1/audit-logs
dashboardRouter.get('/audit-logs', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});
