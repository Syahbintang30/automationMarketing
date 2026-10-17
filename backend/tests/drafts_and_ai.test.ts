import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';

describe('Phase 4: AI Email Draft Generation & Review Workflow', () => {
  let authToken: string;
  let campaignId: string;
  let testDraftId: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@wardell.tech', password: 'WardellAdmin2026!' });
    authToken = loginRes.body.data.token;

    const campaign = await prisma.campaign.findFirst({
      include: { leadCampaigns: { include: { lead: true } } },
    });
    campaignId = campaign!.id;

    // Reset drafts for test idempotency
    await prisma.emailDraft.deleteMany({ where: { campaignId } });
  });

  it('POST /api/v1/campaigns/:id/drafts should generate AI drafts for eligible leads', async () => {
    const res = await request(app)
      .post(`/api/v1/campaigns/${campaignId}/drafts`)
      .set('Authorization', `Bearer ${authToken}`);

    if (res.status !== 200) {
      console.error('DEBUG ERROR:', res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/v1/drafts should list pending drafts with full metadata', async () => {
    const res = await request(app)
      .get('/api/v1/drafts')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const first = res.body.data[0];
    testDraftId = first.id;

    expect(first).toHaveProperty('subject');
    expect(first).toHaveProperty('body');
    expect(first.body).toContain('berhenti berlangganan');
    expect(first).toHaveProperty('aiProvider');
    expect(first).toHaveProperty('model');
    expect(first).toHaveProperty('lead');
  });

  it('PUT /api/v1/drafts/:id should allow human review & text editing', async () => {
    expect(testDraftId).toBeDefined();

    const res = await request(app)
      .put(`/api/v1/drafts/${testDraftId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        subject: '[Revisi Reviewer] Penawaran Pembuatan Website Profil Modern',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.subject).toBe('[Revisi Reviewer] Penawaran Pembuatan Website Profil Modern');
  });

  it('POST /api/v1/drafts/:id/approve should transition draft to APPROVED status', async () => {
    expect(testDraftId).toBeDefined();

    const res = await request(app)
      .post(`/api/v1/drafts/${testDraftId}/approve`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.approvalStatus).toBe('APPROVED');
    expect(res.body.data.approvedById).toBeDefined();
    expect(res.body.data.approvedAt).toBeDefined();
  });
});
