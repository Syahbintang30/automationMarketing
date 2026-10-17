export interface DiscoveryCriteria {
  province: string;
  city?: string;
  businessCategory: string;
  searchKeywords?: string[];
  maxResults?: number;
  requireWebsite?: boolean;
}

export interface DiscoveredBusiness {
  businessName: string;
  businessCategory: string;
  province: string;
  city: string;
  businessAddress?: string | null;
  websiteUrl?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  emailSourceUrl?: string | null;
  dataSource: string;
  sourceRecordId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  complianceNotice: string;
  supportsPersistentEmailStorage: boolean;
  requiresApiKey: boolean;
}

export interface QuotaStatus {
  available: boolean;
  remainingDailyQuota?: number;
  resetTime?: string;
}

export interface BusinessDataProvider {
  getMetadata(): ProviderMetadata;
  checkQuota(): Promise<QuotaStatus>;
  searchBusinesses(criteria: DiscoveryCriteria): Promise<DiscoveredBusiness[]>;
}
