import { prisma } from '../../db/prisma';
import {
  EmailVerificationStatus,
  QualificationStatus,
  OutreachStatus,
  Prisma,
} from '@prisma/client';
import { AppError } from '../../middleware/error.middleware';

export interface LeadFilterParams {
  campaignId?: string;
  province?: string;
  city?: string;
  businessCategory?: string;
  outreachStatus?: OutreachStatus;
  qualificationStatus?: QualificationStatus;
  coldCallStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpsertLeadInput {
  businessName: string;
  businessCategory: string;
  province: string;
  city: string;
  businessAddress?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  emailSourceUrl?: string | null;
  emailVerificationStatus?: EmailVerificationStatus;
  dataSource: string;
  sourceRecordId?: string | null;
  qualificationStatus?: QualificationStatus;
  campaignId?: string;
}

export class LeadsService {
  /**
   * Normalize an email address for matching and uniqueness
   */
  static normalizeEmail(email?: string | null): string | null {
    if (!email) return null;
    const trimmed = email.trim().toLowerCase();
    // Validate basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? trimmed : null;
  }

  /**
   * List leads with filtering and pagination
   */
  static async listLeads(params: LeadFilterParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {};

    if (params.province) {
      where.province = { equals: params.province, mode: 'insensitive' };
    }
    if (params.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }
    if (params.businessCategory) {
      where.businessCategory = { contains: params.businessCategory, mode: 'insensitive' };
    }
    if (params.outreachStatus) {
      where.outreachStatus = params.outreachStatus;
    }
    if (params.qualificationStatus) {
      where.qualificationStatus = params.qualificationStatus;
    }
    if (params.coldCallStatus) {
      where.coldCallStatus = params.coldCallStatus;
    }
    if (params.campaignId) {
      where.leadCampaigns = {
        some: { campaignId: params.campaignId },
      };
    }
    if (params.search) {
      where.OR = [
        { businessName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { contactEmail: { contains: params.search, mode: 'insensitive' } },
        { websiteUrl: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
        { businessCategory: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leadCampaigns: {
            include: {
              campaign: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single lead by ID
   */
  static async getLeadById(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        leadCampaigns: {
          include: { campaign: true },
        },
        emailDrafts: {
          orderBy: { createdAt: 'desc' },
        },
        sendLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404, 'NOT_FOUND');
    }

    return lead;
  }

  /**
   * Upsert a single lead with deduplication logic
   */
  static async upsertLead(input: UpsertLeadInput) {
    const normalizedEmail = this.normalizeEmail(input.contactEmail);

    let existingLead = null;

    // 1. Deduplicate by normalizedEmail if available
    if (normalizedEmail) {
      existingLead = await prisma.lead.findUnique({
        where: { normalizedEmail },
      });
    }

    // 2. If no email, deduplicate by Business Name + City
    if (!existingLead) {
      existingLead = await prisma.lead.findFirst({
        where: {
          businessName: { equals: input.businessName.trim(), mode: 'insensitive' },
          city: { equals: input.city.trim(), mode: 'insensitive' },
        },
      });
    }

    let lead;

    if (existingLead) {
      // Enrich existing record with new details if previously missing
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          websiteUrl: existingLead.websiteUrl || input.websiteUrl,
          contactEmail: existingLead.contactEmail || input.contactEmail,
          normalizedEmail: existingLead.normalizedEmail || normalizedEmail,
          emailSourceUrl: existingLead.emailSourceUrl || input.emailSourceUrl,
          businessAddress: existingLead.businessAddress || input.businessAddress,
          emailVerificationStatus:
            existingLead.emailVerificationStatus === EmailVerificationStatus.VERIFIED
              ? EmailVerificationStatus.VERIFIED
              : input.emailVerificationStatus || existingLead.emailVerificationStatus,
          qualificationStatus: input.qualificationStatus || existingLead.qualificationStatus,
        },
      });
    } else {
      // Create fresh lead
      lead = await prisma.lead.create({
        data: {
          businessName: input.businessName.trim(),
          businessCategory: input.businessCategory.trim(),
          province: input.province.trim(),
          city: input.city.trim(),
          businessAddress: input.businessAddress || null,
          websiteUrl: input.websiteUrl || null,
          contactEmail: input.contactEmail || null,
          normalizedEmail,
          emailSourceUrl: input.emailSourceUrl || null,
          emailVerificationStatus: input.emailVerificationStatus || EmailVerificationStatus.UNVERIFIED,
          dataSource: input.dataSource,
          sourceRecordId: input.sourceRecordId || null,
          qualificationStatus: input.qualificationStatus || QualificationStatus.QUALIFIED,
          outreachStatus: OutreachStatus.NOT_CONTACTED,
        },
      });
    }

    // Link lead to campaign if campaignId provided
    if (input.campaignId) {
      await prisma.leadCampaign.upsert({
        where: {
          campaignId_leadId: {
            campaignId: input.campaignId,
            leadId: lead.id,
          },
        },
        update: {},
        create: {
          campaignId: input.campaignId,
          leadId: lead.id,
        },
      });
    }

    return lead;
  }

  /**
   * Bulk upsert leads
   */
  static async bulkUpsertLeads(leads: UpsertLeadInput[]) {
    const results = [];
    for (const item of leads) {
      try {
        const lead = await this.upsertLead(item);
        results.push(lead);
      } catch (err) {
        // Continue processing others
      }
    }
    return results;
  }

  /**
   * Update lead screening / cold call data
   */
  static async updateScreening(
    id: string,
    data: { coldCallStatus?: string; coldCallNotes?: string }
  ) {
    await this.getLeadById(id);
    return prisma.lead.update({
      where: { id },
      data: {
        ...(data.coldCallStatus ? { coldCallStatus: data.coldCallStatus } : {}),
        ...(data.coldCallNotes !== undefined ? { coldCallNotes: data.coldCallNotes } : {}),
      },
    });
  }

  /**
   * Delete a single lead (screening removal)
   */
  static async deleteLead(id: string) {
    await this.getLeadById(id);
    return prisma.lead.delete({
      where: { id },
    });
  }

  /**
   * Bulk delete leads (discard during screening)
   */
  static async bulkDeleteLeads(ids: string[]) {
    return prisma.lead.deleteMany({
      where: { id: { in: ids } },
    });
  }

  /**
   * Update lead qualification or outreach status
   */
  static async updateLeadStatus(
    id: string,
    data: { qualificationStatus?: QualificationStatus; outreachStatus?: OutreachStatus }
  ) {
    await this.getLeadById(id);
    return prisma.lead.update({
      where: { id },
      data,
    });
  }
}
