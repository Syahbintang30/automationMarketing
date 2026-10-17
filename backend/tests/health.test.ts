import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Health and System Routes', () => {
  it('GET /api/v1/health should return ok and system status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('dryRun', true);
  });

  it('GET /api/v1/ready should verify PostgreSQL database readiness', async () => {
    const res = await request(app).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks).toHaveProperty('database', 'healthy');
  });

  it('GET / should serve frontend SPA index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Wardell Lead Engine');
  });
});
