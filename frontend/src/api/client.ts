import {
  DashboardKPIs,
  CampaignDTO,
  LeadDTO,
  EmailDraftDTO,
  EmailSendLogDTO,
  JobExecutionDTO,
  SuppressionEntryDTO,
  PaginatedResponse,
  ApiResponse,
} from '@wardell/shared';

const BASE_URL = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('wardell_auth_token') || 'dev_token';
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('wardell_auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Auto login with default credentials if in dev
      await this.login('admin@wardell.tech', 'WardellAdmin2026!');
      return this.request<T>(endpoint, options);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'API request failed');
    }

    return res.json();
  }

  // Auth
  async login(email = 'admin@wardell.tech', password = 'WardellAdmin2026!') {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      this.setToken(data.data.token);
    }
    return data;
  }

  async getMe() {
    return this.request<ApiResponse<any>>('/auth/me');
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardKPIs>> {
    return this.request<ApiResponse<DashboardKPIs>>('/stats');
  }

  // Campaigns
  async getCampaigns(): Promise<ApiResponse<CampaignDTO[]>> {
    return this.request<ApiResponse<CampaignDTO[]>>('/campaigns');
  }

  async createCampaign(data: Partial<CampaignDTO>): Promise<ApiResponse<CampaignDTO>> {
    return this.request<ApiResponse<CampaignDTO>>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async triggerDiscovery(campaignId: string, providerId = 'indonesia-public-directory') {
    return this.request<ApiResponse<any>>(`/campaigns/${campaignId}/discover`, {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  }

  async triggerDraftGeneration(campaignId: string) {
    return this.request<ApiResponse<any>>(`/campaigns/${campaignId}/drafts`, {
      method: 'POST',
    });
  }

  async toggleCampaignPause(campaignId: string, isPaused: boolean) {
    const action = isPaused ? 'pause' : 'resume';
    return this.request<ApiResponse<CampaignDTO>>(`/campaigns/${campaignId}/${action}`, {
      method: 'POST',
    });
  }

  // Leads
  async getLeads(params: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<LeadDTO>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) query.append(key, String(val));
    });
    return this.request<PaginatedResponse<LeadDTO>>(`/leads?${query.toString()}`);
  }

  // Export Download Helper
  getExportUrl(format: 'xlsx' | 'csv' = 'xlsx', params: Record<string, string> = {}): string {
    const query = new URLSearchParams({ format, ...params });
    return `${BASE_URL}/exports/leads?${query.toString()}`;
  }

  async downloadExport(format: 'xlsx' | 'csv' = 'xlsx', params: Record<string, string> = {}) {
    const url = this.getExportUrl(format, params);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url, { headers });
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `wardell_leads_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Drafts
  async getDrafts(params: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<EmailDraftDTO>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) query.append(key, String(val));
    });
    return this.request<PaginatedResponse<EmailDraftDTO>>(`/drafts?${query.toString()}`);
  }

  async approveDraft(draftId: string) {
    return this.request<ApiResponse<EmailDraftDTO>>(`/drafts/${draftId}/approve`, {
      method: 'POST',
    });
  }

  async rejectDraft(draftId: string, reason?: string) {
    return this.request<ApiResponse<EmailDraftDTO>>(`/drafts/${draftId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async updateDraft(draftId: string, data: { subject?: string; body?: string }) {
    return this.request<ApiResponse<EmailDraftDTO>>(`/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Sending Queue
  async getSendingQueue(params: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<EmailSendLogDTO>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) query.append(key, String(val));
    });
    return this.request<PaginatedResponse<EmailSendLogDTO>>(`/sending-queue?${query.toString()}`);
  }

  async processSendingQueue(campaignId?: string) {
    return this.request<ApiResponse<any>>('/sending-queue/process', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
  }

  async toggleGlobalSendingPause(isPaused: boolean) {
    const action = isPaused ? 'pause' : 'resume';
    return this.request<ApiResponse<any>>(`/sending-queue/${action}`, {
      method: 'POST',
    });
  }

  // Suppression
  async getSuppressionList(params: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<SuppressionEntryDTO>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) query.append(key, String(val));
    });
    return this.request<PaginatedResponse<SuppressionEntryDTO>>(`/suppression-list?${query.toString()}`);
  }

  async addSuppression(email: string, reason: string) {
    return this.request<ApiResponse<any>>('/suppression-list', {
      method: 'POST',
      body: JSON.stringify({ email, reason }),
    });
  }

  // Jobs & Monitoring
  async getJobs(params: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<JobExecutionDTO>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) query.append(key, String(val));
    });
    return this.request<PaginatedResponse<JobExecutionDTO>>(`/jobs?${query.toString()}`);
  }

  async getGmailStatus() {
    return this.request<ApiResponse<any>>('/sending-queue/integrations/gmail/status');
  }
}

export const api = new ApiClient();
