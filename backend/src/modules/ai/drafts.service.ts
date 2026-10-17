import { prisma } from '../../db/prisma';
import { GeminiProvider } from './gemini.provider';
import { EmailGenerationProvider } from './ai.interface';
import { AppError } from '../../middleware/error.middleware';
import { AuditService } from '../audit/audit.service';
import { env } from '../../config/env';
import { ApprovalStatus, DraftStatus, OutreachStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

export class DraftsService {
  private static aiProvider: EmailGenerationProvider = new GeminiProvider();

  static generateOptOutToken(email: string): string {
    return crypto
      .createHmac('sha256', env.ENCRYPTION_KEY)
      .update(email.toLowerCase())
      .digest('hex')
      .substring(0, 16);
  }

  static getOptOutUrl(email: string): string {
    const token = this.generateOptOutToken(email);
    return `${env.APP_BASE_URL}/api/v1/opt-out?email=${encodeURIComponent(email)}&token=${token}`;
  }

  static async generateDraftsForCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        leadCampaigns: {
          include: { lead: true },
        },
      },
    });

    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'NOT_FOUND');
    }

    // Filter leads eligible for email drafting
    const eligibleLeads = campaign.leadCampaigns
      .map((lc) => lc.lead)
      .filter(
        (lead) =>
          lead.contactEmail &&
          lead.outreachStatus !== OutreachStatus.OPTED_OUT &&
          lead.outreachStatus !== OutreachStatus.SENT
      );

    const generatedDrafts = [];

    for (const lead of eligibleLeads) {
      // Check if draft already exists
      const existingDraft = await prisma.emailDraft.findFirst({
        where: {
          campaignId: campaign.id,
          leadId: lead.id,
          approvalStatus: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
        },
      });

      if (existingDraft) continue;

      const optOutUrl = this.getOptOutUrl(lead.contactEmail!);

      const aiDraft = await this.aiProvider.generateDraft({
        businessName: lead.businessName,
        businessCategory: lead.businessCategory,
        city: lead.city,
        province: lead.province,
        websiteUrl: lead.websiteUrl,
        serviceOffering: campaign.serviceOffering,
        targetObjective: campaign.description || undefined,
        recipientEmail: lead.contactEmail!,
        optOutUrl,
      });

      const draft = await prisma.emailDraft.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          subject: aiDraft.subject,
          body: aiDraft.body,
          aiProvider: aiDraft.aiProvider,
          model: aiDraft.model,
          generationStatus: DraftStatus.GENERATED,
          approvalStatus: ApprovalStatus.PENDING,
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: { outreachStatus: OutreachStatus.AWAITING_APPROVAL },
      });

      generatedDrafts.push(draft);
    }

    return generatedDrafts;
  }

  static async listDrafts(params: {
    campaignId?: string;
    approvalStatus?: ApprovalStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EmailDraftWhereInput = {};
    if (params.campaignId) where.campaignId = params.campaignId;
    if (params.approvalStatus) where.approvalStatus = params.approvalStatus;

    const [total, drafts] = await Promise.all([
      prisma.emailDraft.count({ where }),
      prisma.emailDraft.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: true,
          campaign: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      data: drafts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getDraftById(id: string) {
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: {
        lead: true,
        campaign: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!draft) {
      throw new AppError('Email draft not found', 404, 'NOT_FOUND');
    }

    return draft;
  }

  static async updateDraft(id: string, input: { subject?: string; body?: string }) {
    await this.getDraftById(id);

    return prisma.emailDraft.update({
      where: { id },
      data: {
        ...input,
      },
    });
  }

  static async approveDraft(id: string, actorId?: string) {
    const draft = await this.getDraftById(id);

    // Pre-flight check: ensure lead is not suppressed
    if (draft.lead.normalizedEmail) {
      const isSuppressed = await prisma.suppressionEntry.findUnique({
        where: { normalizedEmail: draft.lead.normalizedEmail },
      });
      if (isSuppressed) {
        throw new AppError(
          `Cannot approve draft: recipient email ${draft.lead.normalizedEmail} is suppressed (${isSuppressed.reason})`,
          400,
          'RECIPIENT_SUPPRESSED'
        );
      }
    }

    const updated = await prisma.emailDraft.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedById: actorId || null,
        approvedAt: new Date(),
      },
    });

    await prisma.lead.update({
      where: { id: draft.leadId },
      data: { outreachStatus: OutreachStatus.APPROVED },
    });

    await AuditService.record({
      actorId,
      action: 'DRAFT_APPROVED',
      entityType: 'EMAIL_DRAFT',
      entityId: draft.id,
      metadata: { leadId: draft.leadId, campaignId: draft.campaignId },
    });

    return updated;
  }

  static async rejectDraft(id: string, reason?: string, actorId?: string) {
    const draft = await this.getDraftById(id);

    const updated = await prisma.emailDraft.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        rejectionReason: reason || 'Rejected by operator',
      },
    });

    await AuditService.record({
      actorId,
      action: 'DRAFT_REJECTED',
      entityType: 'EMAIL_DRAFT',
      entityId: draft.id,
      metadata: { reason },
    });

    return updated;
  }
}
