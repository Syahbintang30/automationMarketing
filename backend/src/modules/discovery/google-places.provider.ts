import {
  BusinessDataProvider,
  DiscoveryCriteria,
  DiscoveredBusiness,
  ProviderMetadata,
  QuotaStatus,
} from './provider.interface';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class GooglePlacesProvider implements BusinessDataProvider {
  getMetadata(): ProviderMetadata {
    return {
      id: 'google-places-new',
      name: 'Google Places API (New)',
      complianceNotice:
        'Google Maps Platform Policy: Only place_id may be retained permanently. Full CRM contact records require independent verification or enrichment.',
      supportsPersistentEmailStorage: false,
      requiresApiKey: true,
    };
  }

  async checkQuota(): Promise<QuotaStatus> {
    if (!env.GOOGLE_PLACES_API_KEY) {
      return { available: false };
    }
    return { available: true };
  }

  async searchBusinesses(criteria: DiscoveryCriteria): Promise<DiscoveredBusiness[]> {
    if (!env.GOOGLE_PLACES_API_KEY) {
      logger.warn('Google Places API key is not configured. Returning empty results.');
      return [];
    }

    const locationText = criteria.city
      ? `${criteria.city}, ${criteria.province}, Indonesia`
      : `${criteria.province}, Indonesia`;
    const textQuery = `${criteria.businessCategory} in ${locationText}`;

    logger.info({ textQuery }, 'Executing Google Places API (New) Text Search');

    try {
      // Official Google Places API (New) endpoint
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
          // Field mask specifying strictly needed basic fields
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.primaryType',
        },
        body: JSON.stringify({
          textQuery,
          pageSize: Math.min(criteria.maxResults || 20, 20),
          languageCode: 'id',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error({ status: response.status, errorBody }, 'Google Places API request failed');
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();
      const places = data.places || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return places.map((place: any): DiscoveredBusiness => {
        return {
          businessName: place.displayName?.text || 'Unknown Business',
          businessCategory: place.primaryType || criteria.businessCategory,
          province: criteria.province,
          city: criteria.city || criteria.province,
          businessAddress: place.formattedAddress || null,
          websiteUrl: place.websiteUri || null,
          phone: place.nationalPhoneNumber || null,
          contactEmail: null, // Places API does not provide email addresses directly
          dataSource: 'GOOGLE_PLACES_API_NEW',
          sourceRecordId: place.id, // place_id is permitted for storage
          metadata: {
            placeId: place.id,
            verifiedAt: new Date().toISOString(),
          },
        };
      });
    } catch (err) {
      logger.error({ err }, 'Exception while querying Google Places API');
      return [];
    }
  }
}
