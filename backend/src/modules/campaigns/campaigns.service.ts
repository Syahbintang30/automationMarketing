import { prisma } from '../../db/prisma';
import { CampaignStatus, Prisma } from '@prisma/client';
import { AppError } from '../../middleware/error.middleware';
import { AuditService } from '../audit/audit.service';

export interface CreateCampaignInput {
  name: string;
  description?: string;
  targetProvince: string;
  targetCity?: string;
  businessCategory: string;
  serviceOffering: string;
  dailySendLimit?: number;
  discoverySettings?: Prisma.InputJsonValue;
  scheduleSettings?: Prisma.InputJsonValue;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  targetProvince?: string;
  targetCity?: string;
  businessCategory?: string;
  serviceOffering?: string;
  status?: CampaignStatus;
  dailySendLimit?: number;
  isPaused?: boolean;
  discoverySettings?: Prisma.InputJsonValue;
  scheduleSettings?: Prisma.InputJsonValue;
}

export class CampaignsService {
  static async listCampaigns() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            leadCampaigns: true,
            emailDrafts: true,
            sendLogs: true,
          },
        },
      },
    });
  }

  static async getCampaignById(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            leadCampaigns: true,
            emailDrafts: true,
            sendLogs: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'NOT_FOUND');
    }

    return campaign;
  }

  static async createCampaign(input: CreateCampaignInput, actorId?: string) {
    const campaign = await prisma.campaign.create({
      data: {
        name: input.name,
        description: input.description,
        targetProvince: input.targetProvince,
        targetCity: input.targetCity,
        businessCategory: input.businessCategory,
        serviceOffering: input.serviceOffering,
        dailySendLimit: input.dailySendLimit || 30,
        discoverySettings: input.discoverySettings || {},
        scheduleSettings: input.scheduleSettings || {},
        status: CampaignStatus.ACTIVE,
      },
    });

    await AuditService.record({
      actorId,
      action: 'CAMPAIGN_CREATED',
      entityType: 'CAMPAIGN',
      entityId: campaign.id,
      metadata: { name: campaign.name, targetProvince: campaign.targetProvince },
    });

    return campaign;
  }

  static async updateCampaign(id: string, input: UpdateCampaignInput, actorId?: string) {
    await this.getCampaignById(id);

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...input,
      },
    });

    await AuditService.record({
      actorId,
      action: 'CAMPAIGN_UPDATED',
      entityType: 'CAMPAIGN',
      entityId: updated.id,
      metadata: { changed: Object.keys(input) },
    });

    return updated;
  }

  static async togglePause(id: string, isPaused: boolean, actorId?: string) {
    const campaign = await this.getCampaignById(id);
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        isPaused,
        status: isPaused ? CampaignStatus.PAUSED : CampaignStatus.ACTIVE,
      },
    });

    await AuditService.record({
      actorId,
      action: isPaused ? 'CAMPAIGN_PAUSED' : 'CAMPAIGN_RESUMED',
      entityType: 'CAMPAIGN',
      entityId: campaign.id,
    });

    return updated;
  }

  static async archiveCampaign(id: string, actorId?: string) {
    await this.getCampaignById(id);
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ARCHIVED, isPaused: true },
    });

    await AuditService.record({
      actorId,
      action: 'CAMPAIGN_ARCHIVED',
      entityType: 'CAMPAIGN',
      entityId: id,
    });

    return updated;
  }
}
