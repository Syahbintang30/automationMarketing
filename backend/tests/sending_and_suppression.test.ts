import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { encryptToken, decryptToken } from '../src/modules/sending/crypto.util';
import { GmailService } from '../src/modules/sending/gmail.service';
import { DraftsService } from '../src/modules/ai/drafts.service';
import { prisma } from '../src/db/prisma';

describe('Phase 5: Gmail Sending Pipeline, Suppression & Opt-Out', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@wardell.tech', password: 'WardellAdmin2026!' });
    authToken = loginRes.body.data.token;
  });

  it('AES-256-GCM crypto utility should securely encrypt and decrypt tokens', () => {
    const originalToken = 'ya29.a0AcM6123456789SecretRefreshToken';
    const encrypted = encryptToken(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted).toContain(':'); // IV:Tag:Ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('GmailService.createMimeMessage should format RFC 2822 base64url messages', () => {
    const mime = GmailService.createMimeMessage({
      from: 'Wardell Tech <contact@wardell.tech>',
      to: 'client@example.co.id',
      subject: 'Penawaran Solusi Digital',
      body: 'Halo rekan bisnis,\n\nIni adalah pesan resmi.',
    });

    expect(typeof mime).toBe('string');
    expect(mime.length).toBeGreaterThan(20);
    // Base64url should not contain standard base64 +, /, or =
    expect(mime).not.toContain('+');
    expect(mime).not.toContain('/');
    expect(mime).not.toContain('=');
  });

  it('GET /api/v1/opt-out should validate token and suppress email', async () => {
    const testEmail = 'unsubscribe-test@perusahaan.co.id';
    const token = DraftsService.generateOptOutToken(testEmail);

    const res = await request(app).get(`/api/v1/opt-out?email=${encodeURIComponent(testEmail)}&token=${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Berhasil Berhenti Berlangganan');

    // Verify it is in suppression table
    const entry = await prisma.suppressionEntry.findUnique({
      where: { normalizedEmail: testEmail },
    });
    expect(entry).toBeDefined();
    expect(entry?.source).toBe('UNSUBSCRIBE_LINK');
  });

  it('POST /api/v1/sending-queue/pause and resume should update global state', async () => {
    const pauseRes = await request(app)
      .post('/api/v1/sending-queue/pause')
      .set('Authorization', `Bearer ${authToken}`);

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.isPaused).toBe(true);

    const resumeRes = await request(app)
      .post('/api/v1/sending-queue/resume')
      .set('Authorization', `Bearer ${authToken}`);

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.isPaused).toBe(false);
  });

  it('POST /api/v1/sending-queue/process should process approved queue under DRY_RUN mode safely', async () => {
    const res = await request(app)
      .post('/api/v1/sending-queue/process')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('processed');
    expect(res.body.data).toHaveProperty('sent');
  });
});
