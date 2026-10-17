import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmailGenerationProvider, DraftGenerationInput, GeneratedEmailDraft } from './ai.interface';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class GeminiProvider implements EmailGenerationProvider {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  getProviderId(): string {
    return 'gemini';
  }

  async generateDraft(input: DraftGenerationInput): Promise<GeneratedEmailDraft> {
    const modelName = env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (!this.genAI) {
      logger.info(
        { businessName: input.businessName },
        'GEMINI_API_KEY not set. Using verified structured template engine.'
      );
      return this.generateTemplateDraft(input, 'template-engine');
    }

    const prompt = `
Anda adalah AI Outreach Specialist untuk Wardell Tech, sebuah konsultan dan software house pengembangan web & sistem digital di Indonesia.
Tugas Anda adalah menulis draf email outreach B2B yang sopan, ringkas, natural dalam Bahasa Indonesia resmi namun bersahabat.

Pedoman Penting:
1. Penerima: ${input.businessName} (Kategori: ${input.businessCategory}, Lokasi: ${input.city}, ${input.province}).
2. Website mereka: ${input.websiteUrl || 'Belum terdeteksi atau sedang dalam pengembangan'}.
3. Layanan Wardell Tech yang ditawarkan: ${input.serviceOffering}.
4. JANGAN pernah mengarang masalah fiktif tentang bisnis mereka.
5. JANGAN membuat klaim palsu bahwa Anda pernah bertemu atau berbicara sebelumnya.
6. Buat Call To Action (CTA) yang santai: diskusi singkat 10 menit atau sekadar bertukar ide via online meet / WhatsApp.
7. Di bagian penutup, wajib sertakan tautan opt-out: "${input.optOutUrl}".

Format Respons Wajib (JSON murni):
{
  "subject": "Judul email yang relevan dan tidak clickbait",
  "body": "Isi lengkap email dalam Bahasa Indonesia dengan format paragraf rapi"
}
`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);

      return {
        subject: parsed.subject,
        body: parsed.body,
        model: modelName,
        aiProvider: 'gemini',
      };
    } catch (err) {
      logger.warn({ err }, 'Gemini API call failed, falling back to structured template');
      return this.generateTemplateDraft(input, `${modelName}-fallback`);
    }
  }

  private generateTemplateDraft(input: DraftGenerationInput, model: string): GeneratedEmailDraft {
    const subject = `Eksplorasi Solusi Digital & Pengembangan Sistem untuk ${input.businessName}`;
    const body = `Yth. Tim Manajemen ${input.businessName},

Perkenalkan, saya dari Wardell Tech. Kami adalah tim konsultan teknologi dan software house yang berfokus membantu bisnis di ${input.city} dan sekitarnya mengoptimalkan operasional melalui solusi web dan aplikasi kustom.

Melihat pertumbuhan bisnis ${input.businessName} di bidang ${input.businessCategory}, kami ingin menawarkan kolaborasi strategis terkait layanan kami:
- ${input.serviceOffering}

Solusi yang kami bangun berorientasi pada kecepatan implementasi, desain modern yang responsif, serta integrasi sistem internal yang efisien untuk mendukung produktivitas perusahaan Anda.

Jika Anda berkenan, kami sangat terbuka untuk diskusi singkat santai (10-15 menit) guna memahami kebutuhan teknologi atau pembaruan sistem yang sedang direncanakan di ${input.businessName}.

Terima kasih atas waktu dan perhatian Anda. Semoga bisnis Anda senantiasa berkembang sukses.

Salam hangat,
Tim Kemitraan Digital — Wardell Tech
Website: https://wardell.tech
Email: contact@wardell.tech

---
Jika Anda tidak ingin menerima informasi kemitraan ini lagi, silakan berhenti berlangganan di sini:
${input.optOutUrl}`;

    return {
      subject,
      body,
      model,
      aiProvider: 'gemini-template',
    };
  }
}
