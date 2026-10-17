export interface DraftGenerationInput {
  businessName: string;
  businessCategory: string;
  city: string;
  province: string;
  websiteUrl?: string | null;
  serviceOffering: string;
  targetObjective?: string;
  recipientEmail: string;
  optOutUrl: string;
}

export interface GeneratedEmailDraft {
  subject: string;
  body: string;
  model: string;
  aiProvider: string;
}

export interface EmailGenerationProvider {
  getProviderId(): string;
  generateDraft(input: DraftGenerationInput): Promise<GeneratedEmailDraft>;
}
