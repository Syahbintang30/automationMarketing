import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Authentication Flow', () => {
  it('POST /api/v1/auth/login should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@wardell.tech', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/v1/auth/login should succeed with valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@wardell.tech', password: 'WardellAdmin2026!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('admin@wardell.tech');
    expect(res.body.data.user.role).toBe('ADMIN');

    // Test protected route GET /api/v1/auth/me with the token
    const token = res.body.data.token;
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe('admin@wardell.tech');
  });

  it('GET /api/v1/auth/me should reject request without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
