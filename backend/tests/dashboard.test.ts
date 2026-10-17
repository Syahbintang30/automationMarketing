import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Phase 6: Dashboard Metrics & Observability', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@wardell.tech', password: 'WardellAdmin2026!' });
    authToken = loginRes.body.data.token;
  });

  it('GET /api/v1/stats should return complete executive KPI summary', async () => {
    const res = await request(app)
      .get('/api/v1/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalEligibleLeads');
    expect(res.body.data).toHaveProperty('draftsAwaitingApproval');
    expect(res.body.data).toHaveProperty('emailsSent');
    expect(res.body.data).toHaveProperty('failedSends');
    expect(res.body.data).toHaveProperty('suppressedContacts');
    expect(res.body.data).toHaveProperty('isDryRun');
    expect(Array.isArray(res.body.data.leadsByProvince)).toBe(true);
    expect(Array.isArray(res.body.data.leadsByCategory)).toBe(true);
  });

  it('GET /api/v1/jobs should return paginated background job execution history', async () => {
    const res = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  it('GET /api/v1/audit-logs should return paginated audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
