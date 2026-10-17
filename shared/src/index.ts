// User & Roles
export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

// Campaign Types
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface DiscoverySettings {
  maxResults?: number;
  requireWebsite?: boolean;
  minRating?: number;
  searchKeywords?: string[];
}

export interface ScheduleSettings {
  cronExpression?: string;
  enabled?: boolean;
  timezone?: string; // default "Asia/Jakarta"
}

export interface CampaignDTO {
  id: string;
  name: string;
  description?: string | null;
  targetProvince: string;
  targetCity?: string | null;
  businessCategory: string;
  serviceOffering: string;
  status: CampaignStatus;
  discoverySettings: DiscoverySettings;
  scheduleSettings: ScheduleSettings;
  dailySendLimit: number;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    leadCampaigns?: number;
    emailDrafts?: number;
    sendLogs?: number;
  };
}

export const INDONESIAN_PROVINCES = [
  'Jawa Barat',
  'DKI Jakarta',
  'Jawa Timur',
  'Jawa Tengah',
  'Banten',
  'DI Yogyakarta',
  'Bali',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Sumatera Selatan',
  'Lampung',
  'Jambi',
  'Bengkulu',
  'Bangka Belitung',
  'Aceh',
  'Kalimantan Barat',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Tengah',
  'Kalimantan Utara',
  'Sulawesi Selatan',
  'Sulawesi Utara',
  'Sulawesi Tengah',
  'Sulawesi Tenggara',
  'Sulawesi Barat',
  'Gorontalo',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya',
] as const;

export type IndonesianProvince = typeof INDONESIAN_PROVINCES[number];

// Lead Types
export type EmailVerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'UNAVAILABLE' | 'INVALID';
export type QualificationStatus = 'UNQUALIFIED' | 'QUALIFIED' | 'NEEDS_WEBSITE' | 'DISQUALIFIED';
export type OutreachStatus = 
  | 'NOT_CONTACTED'
  | 'DRAFT_CREATED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'BOUNCED'
  | 'OPTED_OUT';

export interface LeadDTO {
  id: string;
  businessName: string;
  businessCategory: string;
  province: string;
  city: string;
  businessAddress?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  normalizedEmail?: string | null;
  emailSourceUrl?: string | null;
  emailVerificationStatus: EmailVerificationStatus;
  dataSource: string;
  sourceRecordId?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  mapsUrl?: string | null;
  coldCallStatus: string;
  coldCallNotes?: string | null;
  qualificationStatus: QualificationStatus;
  outreachStatus: OutreachStatus;
  lastContactedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Draft Types
export type DraftStatus = 'PENDING' | 'GENERATED' | 'FAILED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REGENERATION_REQUESTED';

export interface EmailDraftDTO {
  id: string;
  campaignId: string;
  leadId: string;
  subject: string;
  body: string;
  aiProvider: string;
  model: string;
  generationStatus: DraftStatus;
  approvalStatus: ApprovalStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: LeadDTO;
  campaign?: {
    id: string;
    name: string;
  };
}

// Sending Types
export type SendStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'SUPPRESSED' | 'CANCELLED';

export interface EmailSendLogDTO {
  id: string;
  campaignId: string;
  leadId: string;
  emailDraftId: string;
  providerMessageId?: string | null;
  status: SendStatus;
  attemptCount: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  isDryRun: boolean;
  sentAt?: string | null;
  createdAt: string;
  lead?: {
    businessName: string;
    contactEmail?: string | null;
  };
  campaign?: {
    name: string;
  };
  emailDraft?: {
    subject: string;
  };
}

// Suppression Types
export interface SuppressionEntryDTO {
  id: string;
  normalizedEmail: string;
  reason: string;
  source: string;
  createdAt: string;
}

// Job Types
export type JobType = 
  | 'LEAD_DISCOVERY'
  | 'LEAD_ENRICHMENT'
  | 'EMAIL_DRAFT_GENERATION'
  | 'EXCEL_EXPORT'
  | 'APPROVED_EMAIL_SENDING'
  | 'CLEANUP_RETENTION'
  | 'CAMPAIGN_SUMMARY';

export type JobStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface JobExecutionDTO {
  id: string;
  jobType: JobType;
  campaignId?: string | null;
  campaign?: {
    id: string;
    name: string;
  } | null;
  status: JobStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  processedCount: number;
  failedCount: number;
  errorSummary?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard Summary KPI
export interface DashboardKPIs {
  totalEligibleLeads: number;
  leadsByProvince: { province: string; count: number }[];
  leadsByCategory: { category: string; count: number }[];
  draftsAwaitingApproval: number;
  emailsSent: number;
  failedSends: number;
  suppressedContacts: number;
  activeJobsCount: number;
  isSendingPausedGlobally: boolean;
  isDryRun: boolean;
}
