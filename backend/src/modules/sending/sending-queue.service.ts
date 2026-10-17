import { prisma } from '../../db/prisma';
import { GmailService } from './gmail.service';
import { SuppressionService } from '../suppression/suppression.service';
import { AppError } from '../../middleware/error.middleware';
import { AuditService } from '../audit/audit.service';
import { logger } from '../../config/logger';
import { ApprovalStatus, CampaignStatus, OutreachStatus, SendStatus, Prisma } from '@prisma/client';

export class SendingQueueService {
  /**
   * Check if global sending is paused
   */
  static async isGloballyPaused(): Promise<boolean> {
    const config = await prisma.appConfig.findUnique({
      where: { key: 'GLOBAL_SENDING_PAUSED' },
    });
    return config?.value === 'true';
  }

  /**
   * Set global sending pause status
   */
  static async setGlobalPause(isPaused: boolean, actorId?: string) {
    await prisma.appConfig.upsert({
      where: { key: 'GLOBAL_SENDING_PAUSED' },
      update: { value: isPaused ? 'true' : 'false' },
      create: { key: 'GLOBAL_SENDING_PAUSED', value: isPaused ? 'true' : 'false' },
    });

    await AuditService.record({
      actorId,
      action: isPaused ? 'GLOBAL_SENDING_PAUSED' : 'GLOBAL_SENDING_RESUMED',
      entityType: 'SENDING_QUEUE',
    });

    return { isPaused };
  }

  /**
   * Process all eligible approved drafts across active campaigns
   */
  static async processApprovedQueue(campaignId?: string, actorId?: string) {
    if (await this.isGloballyPaused()) {
      throw new AppError('Global email sending is currently paused', 400, 'SENDING_PAUSED');
    }

    const whereDraft: Prisma.EmailDraftWhereInput = {
      approvalStatus: ApprovalStatus.APPROVED,
      campaign: {
        status: CampaignStatus.ACTIVE,
        isPaused: false,
      },
    };

    if (campaignId) {
      whereDraft.campaignId = campaignId;
    }

    const approvedDrafts = await prisma.emailDraft.findMany({
      where: whereDraft,
      include: {
        lead: true,
        campaign: true,
      },
      take: 50,
    });

    logger.info({ count: approvedDrafts.length }, 'Processing approved email drafts in sending queue');

    const results = {
      processed: 0,
      sent: 0,
      suppressed: 0,
      failed: 0,
      skipped: 0,
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const draft of approvedDrafts) {
      results.processed++;

      // 1. Recipient check
      if (!draft.lead.contactEmail) {
        results.skipped++;
        continue;
      }

      // 2. Pre-flight Suppression Check
      const isSuppressed = await SuppressionService.isSuppressed(draft.lead.contactEmail);
      if (isSuppressed) {
        await prisma.emailSendLog.create({
          data: {
            campaignId: draft.campaignId,
            leadId: draft.leadId,
            emailDraftId: draft.id,
            status: SendStatus.SUPPRESSED,
            errorMessage: 'Recipient email is in suppression list',
          },
        });
        await prisma.lead.update({
          where: { id: draft.leadId },
          data: { outreachStatus: OutreachStatus.OPTED_OUT },
        });
        results.suppressed++;
        continue;
      }

      // 3. Pre-flight Duplicate Send Check
      const alreadySent = await prisma.emailSendLog.findFirst({
        where: {
          campaignId: draft.campaignId,
          leadId: draft.leadId,
          status: SendStatus.SENT,
        },
      });
      if (alreadySent) {
        logger.warn(
          { leadId: draft.leadId, campaignId: draft.campaignId },
          'Duplicate send prevented: Lead already contacted in this campaign'
        );
        results.skipped++;
        continue;
      }

      // 4. Pre-flight Daily Send Limit Check
      const todaySentCount = await prisma.emailSendLog.count({
        where: {
          campaignId: draft.campaignId,
          status: SendStatus.SENT,
          sentAt: { gte: todayStart },
        },
      });

      if (todaySentCount >= draft.campaign.dailySendLimit) {
        logger.info(
          { campaignId: draft.campaignId, limit: draft.campaign.dailySendLimit },
          'Daily sending limit reached for campaign'
        );
        results.skipped++;
        continue;
      }

      // 5. Dispatch via GmailService
      try {
        const sendResult = await GmailService.sendApprovedEmail({
          toEmail: draft.lead.contactEmail,
          subject: draft.subject,
          body: draft.body,
        });

        // Record successful send log
        await prisma.emailSendLog.create({
          data: {
            campaignId: draft.campaignId,
            leadId: draft.leadId,
            emailDraftId: draft.id,
            providerMessageId: sendResult.messageId,
            status: SendStatus.SENT,
            isDryRun: sendResult.isDryRun,
            sentAt: new Date(),
          },
        });

        // Update lead outreach status
        await prisma.lead.update({
          where: { id: draft.leadId },
          data: {
            outreachStatus: OutreachStatus.SENT,
            lastContactedAt: new Date(),
          },
        });

        results.sent++;
      } catch (err: unknown) {
        logger.error({ err, leadId: draft.leadId }, 'Failed to dispatch email');

        await prisma.emailSendLog.create({
          data: {
            campaignId: draft.campaignId,
            leadId: draft.leadId,
            emailDraftId: draft.id,
            status: SendStatus.FAILED,
            errorMessage: (err as Error).message,
          },
        });

        await prisma.lead.update({
          where: { id: draft.leadId },
          data: { outreachStatus: OutreachStatus.FAILED },
        });

        results.failed++;
      }
    }

    await AuditService.record({
      actorId,
      action: 'SENDING_QUEUE_PROCESSED',
      entityType: 'SENDING_QUEUE',
      metadata: results,
    });

    return results;
  }

  /**
   * List email send logs with pagination
   */
  static async listSendLogs(params: {
    campaignId?: string;
    status?: SendStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EmailSendLogWhereInput = {};
    if (params.campaignId) where.campaignId = params.campaignId;
    if (params.status) where.status = params.status;

    const [total, logs] = await Promise.all([
      prisma.emailSendLog.count({ where }),
      prisma.emailSendLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { businessName: true, contactEmail: true, city: true } },
          campaign: { select: { name: true } },
          emailDraft: { select: { subject: true } },
        },
      }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
