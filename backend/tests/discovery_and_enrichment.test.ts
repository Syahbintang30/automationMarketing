import { describe, it, expect, beforeAll } from 'vitest';
import { PublicDirectoryProvider } from '../src/modules/discovery/public-directory.provider';
import { GooglePlacesProvider } from '../src/modules/discovery/google-places.provider';
import { EnrichmentService } from '../src/modules/enrichment/enrichment.service';
import { DiscoveryService } from '../src/modules/discovery/discovery.service';
import { prisma } from '../src/db/prisma';

describe('Phase 3: Discovery, Providers & Enrichment', () => {
  let campaignId: string;

  beforeAll(async () => {
    // Find or create a test campaign
    const campaign = await prisma.campaign.findFirst();
    if (campaign) {
      campaignId = campaign.id;
    }
  });

  it('GooglePlacesProvider should enforce Google Maps Platform compliance policies', async () => {
    const provider = new GooglePlacesProvider();
    const meta = provider.getMetadata();

    expect(meta.id).toBe('google-places-new');
    expect(meta.supportsPersistentEmailStorage).toBe(false);
    expect(meta.requiresApiKey).toBe(true);
    expect(meta.complianceNotice).toContain('Only place_id may be retained permanently');
  });

  it('PublicDirectoryProvider should return valid Indonesian business leads', async () => {
    const provider = new PublicDirectoryProvider();
    const meta = provider.getMetadata();

    expect(meta.id).toBe('indonesia-public-directory');
    expect(meta.supportsPersistentEmailStorage).toBe(true);

    const businesses = await provider.searchBusinesses({
      province: 'Jawa Barat',
      city: 'Kota Bandung',
      businessCategory: 'IT Solution',
      maxResults: 5,
    });

    expect(businesses.length).toBeGreaterThan(0);
    const first = businesses[0];
    expect(first).toHaveProperty('businessName');
    expect(first).toHaveProperty('province');
    expect(first).toHaveProperty('city');
    expect(first).toHaveProperty('dataSource');
  });

  it('EnrichmentService should gracefully handle non-existent or invalid websites', async () => {
    const res = await EnrichmentService.enrichFromWebsite('https://invalid-domain-that-does-not-exist-12345.id');
    expect(res.contactEmail).toBeNull();
    expect(res.verificationStatus).toBe('UNAVAILABLE');
  });

  it('DiscoveryService.runDiscoveryForCampaign should discover leads, save to DB and link to campaign', async () => {
    expect(campaignId).toBeDefined();

    const result = await DiscoveryService.runDiscoveryForCampaign(campaignId, 'indonesia-public-directory');
    expect(result.status).toBe('COMPLETED');
    expect(result.processedCount).toBeGreaterThanOrEqual(1);

    // Verify lead campaign junction was created
    const leadCampaigns = await prisma.leadCampaign.findMany({
      where: { campaignId },
    });
    expect(leadCampaigns.length).toBeGreaterThanOrEqual(1);
  });
});
