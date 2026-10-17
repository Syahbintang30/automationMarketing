import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { ExportService } from '../src/modules/export/export.service';

describe('Phase 2: Campaigns, Leads & Excel Export', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@wardell.tech', password: 'WardellAdmin2026!' });
    authToken = loginRes.body.data.token;
  });

  it('GET /api/v1/campaigns should list existing seeded campaigns', async () => {
    const res = await request(app)
      .get('/api/v1/campaigns')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/leads should create and deduplicate leads properly', async () => {
    // 1. Create a lead
    const lead1Res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        businessName: 'PT Maju Digital Nusantara',
        businessCategory: 'IT Consultant & Software',
        province: 'Jawa Barat',
        city: 'Kota Bandung',
        contactEmail: 'Kontak@MajuDigital.co.id', // mixed case to test normalization
        websiteUrl: 'https://majudigital.co.id',
        emailSourceUrl: 'https://majudigital.co.id/contact',
        dataSource: 'DIRECT_DISCOVERY',
      });

    expect(lead1Res.status).toBe(201);
    expect(lead1Res.body.data.normalizedEmail).toBe('kontak@majudigital.co.id');

    const leadId = lead1Res.body.data.id;

    // 2. Upsert same lead with same email: should deduplicate (update) rather than duplicate
    const lead2Res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        businessName: 'PT Maju Digital Nusantara Updated',
        businessCategory: 'IT Consultant & Software',
        province: 'Jawa Barat',
        city: 'Kota Bandung',
        contactEmail: 'kontak@majudigital.co.id',
        businessAddress: 'Jl. Asia Afrika No. 120, Bandung',
        dataSource: 'ENRICHMENT_UPDATE',
      });

    expect(lead2Res.status).toBe(201);
    expect(lead2Res.body.data.id).toBe(leadId); // Same ID!
    expect(lead2Res.body.data.businessAddress).toBe('Jl. Asia Afrika No. 120, Bandung');
  });

  it('ExportService should sanitize formula injection characters', () => {
    expect(ExportService.sanitizeCellValue('=1+1')).toBe("'=1+1");
    expect(ExportService.sanitizeCellValue('+100')).toBe("'+100");
    expect(ExportService.sanitizeCellValue('-SUM(A1:A10)')).toBe("'-SUM(A1:A10)");
    expect(ExportService.sanitizeCellValue('@HYPERLINK("evil.com")')).toBe("'@HYPERLINK(\"evil.com\")");
    expect(ExportService.sanitizeCellValue('PT Wardell Tech')).toBe('PT Wardell Tech');
  });

  it('GET /api/v1/exports/leads should generate valid XLSX attachment', async () => {
    const res = await request(app)
      .get('/api/v1/exports/leads')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body).toBeDefined();
  });

  it('GET /api/v1/exports/leads?format=csv should generate valid CSV attachment', async () => {
    const res = await request(app)
      .get('/api/v1/exports/leads?format=csv')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Nama Instansi / Perusahaan');
    expect(res.text).toContain('Maju Digital Nusantara');
  });

  it('PATCH /api/v1/leads/:id/screening should update cold call status and notes', async () => {
    const leads = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${authToken}`);

    const targetLead = leads.body.data[0];
    const res = await request(app)
      .patch(`/api/v1/leads/${targetLead.id}/screening`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        coldCallStatus: 'TERTARIK',
        coldCallNotes: 'Sudah bicara dengan bagian TU, follow up hari Rabu.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.coldCallStatus).toBe('TERTARIK');
    expect(res.body.data.coldCallNotes).toContain('bagian TU');
  });
});
