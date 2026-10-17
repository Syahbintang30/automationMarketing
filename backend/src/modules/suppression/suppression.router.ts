import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SuppressionService } from './suppression.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

export const suppressionRouter = Router();

const manualSuppressionSchema = z.object({
  email: z.string().email(),
  reason: z.string().min(3),
});

// GET /api/v1/opt-out (Public Unsubscribe Handler)
suppressionRouter.get('/opt-out', async (req: Request, res: Response) => {
  const { email, token } = req.query;

  if (!email || !token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head><meta charset="utf-8"><title>Permintaan Tidak Valid</title><style>body{font-family:sans-serif;padding:40px;text-align:center;color:#333;}</style></head>
      <body>
        <h2>Tautan Berhenti Berlangganan Tidak Valid</h2>
        <p>Parameter email atau token keamanan tidak lengkap.</p>
      </body>
      </html>
    `);
  }

  try {
    await SuppressionService.processOptOut(email as string, token as string);

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Berhasil Berhenti Berlangganan — Wardell Tech</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 40px; border-radius: 12px; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center; border: 1px solid #334155; }
          h2 { color: #38bdf8; margin-top: 0; }
          p { color: #94a3b8; line-height: 1.6; }
          .badge { display: inline-block; background: #064e3b; color: #34d399; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓ Permintaan Diterima</div>
          <h2>Berhasil Berhenti Berlangganan</h2>
          <p>Alamat email <strong>${email}</strong> telah kami tambahkan ke daftar penghentian pengiriman (suppression list).</p>
          <p>Anda tidak akan lagi menerima email informasi kemitraan atau penawaran layanan dari Wardell Tech.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err: unknown) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head><meta charset="utf-8"><title>Gagal Berhenti Berlangganan</title><style>body{font-family:sans-serif;padding:40px;text-align:center;color:#333;}</style></head>
      <body>
        <h2>Gagal Memproses Permintaan</h2>
        <p>${(err as Error).message}</p>
      </body>
      </html>
    `);
  }
});

// GET /api/v1/suppression-list (Admin)
suppressionRouter.get('/suppression-list', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search } = req.query;
    const result = await SuppressionService.listSuppressionEntries(
      page ? parseInt(page as string, 10) : 1,
      limit ? parseInt(limit as string, 10) : 25,
      search as string | undefined
    );
    return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    return next(err);
  }
});

// POST /api/v1/suppression-list (Admin)
suppressionRouter.post(
  '/suppression-list',
  authenticate,
  validateRequest({ body: manualSuppressionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await SuppressionService.addManualSuppression(
        req.body.email,
        req.body.reason,
        req.user?.userId
      );
      return res.status(201).json({ success: true, data: entry, message: 'Email added to suppression list' });
    } catch (err) {
      return next(err);
    }
  }
);
