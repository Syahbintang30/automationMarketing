import { prisma } from '../../db/prisma';
import { GooglePlacesProvider } from './google-places.provider';
import { PublicDirectoryProvider } from './public-directory.provider';
import { BusinessDataProvider, DiscoveryCriteria } from './provider.interface';
import { LeadsService } from '../leads/leads.service';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { logger } from '../../config/logger';
import { JobStatus, JobType, OutreachStatus, Prisma } from '@prisma/client';

export class DiscoveryService {
  private static providers: Record<string, BusinessDataProvider> = {
    'google-places-new': new GooglePlacesProvider(),
    'indonesia-public-directory': new PublicDirectoryProvider(),
  };

  static getProvider(id = 'indonesia-public-directory'): BusinessDataProvider {
    return this.providers[id] || this.providers['indonesia-public-directory'];
  }

  static async runDiscoveryForCampaign(campaignId: string, providerId = 'indonesia-public-directory') {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign with id ${campaignId} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const discoverySettings: any = campaign.discoverySettings || {};
    const criteria: DiscoveryCriteria = {
      province: campaign.targetProvince,
      city: campaign.targetCity || undefined,
      businessCategory: campaign.businessCategory,
      maxResults: discoverySettings.maxResults || 25,
      requireWebsite: discoverySettings.requireWebsite || false,
    };

    // Create JobExecution record
    const job = await prisma.jobExecution.create({
      data: {
        jobType: JobType.LEAD_DISCOVERY,
        campaignId: campaign.id,
        status: JobStatus.ACTIVE,
        startedAt: new Date(),
        metadata: { providerId, criteria: criteria as unknown as Prisma.InputJsonValue },
      },
    });

    logger.info({ campaignId, providerId }, 'Starting lead discovery job');

    let processedCount = 0;
    let failedCount = 0;

    try {
      const provider = this.getProvider(providerId);
      const businesses = await provider.searchBusinesses(criteria);

      for (const biz of businesses) {
        try {
          let contactEmail = biz.contactEmail;
          let emailSourceUrl = biz.emailSourceUrl;
          let verificationStatus = biz.contactEmail ? 'VERIFIED' : 'UNVERIFIED';

          // If lead has website but no email yet, enrich from website
          if (!contactEmail && biz.websiteUrl) {
            const enriched = await EnrichmentService.enrichFromWebsite(biz.websiteUrl);
            if (enriched.contactEmail) {
              contactEmail = enriched.contactEmail;
              emailSourceUrl = enriched.emailSourceUrl;
              verificationStatus = enriched.verificationStatus;
            }
          }

          // Check if normalized email is in suppression list
          const normalizedEmail = LeadsService.normalizeEmail(contactEmail);
          let outreachStatus: OutreachStatus = OutreachStatus.NOT_CONTACTED;

          if (normalizedEmail) {
            const isSuppressed = await prisma.suppressionEntry.findUnique({
              where: { normalizedEmail },
            });
            if (isSuppressed) {
              outreachStatus = OutreachStatus.OPTED_OUT;
            }
          }

          // Save to database
          await LeadsService.upsertLead({
            businessName: biz.businessName,
            businessCategory: biz.businessCategory,
            province: biz.province,
            city: biz.city,
            businessAddress: biz.businessAddress,
            websiteUrl: biz.websiteUrl,
            contactEmail,
            emailSourceUrl,
            // @ts-expect-error verification enum match
            emailVerificationStatus: verificationStatus,
            dataSource: biz.dataSource,
            sourceRecordId: biz.sourceRecordId,
            campaignId: campaign.id,
          });

          // Update outreach status if suppressed
          if (outreachStatus === OutreachStatus.OPTED_OUT && normalizedEmail) {
            await prisma.lead.update({
              where: { normalizedEmail },
              data: { outreachStatus: OutreachStatus.OPTED_OUT },
            });
          }

          processedCount++;
        } catch (err) {
          logger.warn({ err, biz: biz.businessName }, 'Error saving discovered lead');
          failedCount++;
        }
      }

      await prisma.jobExecution.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          processedCount,
          failedCount,
        },
      });

      return {
        jobId: job.id,
        status: JobStatus.COMPLETED,
        processedCount,
        failedCount,
      };
    } catch (err: unknown) {
      await prisma.jobExecution.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          completedAt: new Date(),
          errorSummary: (err as Error).message,
        },
      });
      throw err;
    }
  }
}
