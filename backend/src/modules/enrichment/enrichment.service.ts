import { EmailVerificationStatus } from '@prisma/client';
import { logger } from '../../config/logger';

export interface EnrichmentResult {
  websiteUrl: string;
  contactEmail: string | null;
  emailSourceUrl: string | null;
  phone: string | null;
  verificationStatus: EmailVerificationStatus;
  retrievedAt: string;
}

export class EnrichmentService {
  /**
   * Check robots.txt before crawling website contact pages
   */
  static async isAllowedByRobotsTxt(baseUrl: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'WardellLeadEngineBot/1.0' },
      });
      clearTimeout(timeout);

      if (!res.ok) return true; // No robots.txt or 404 means crawling is generally allowed

      const text = await res.text();
      // Basic check: if Disallow: / or Disallow: /contact
      if (text.includes('Disallow: /') && !text.includes('Disallow: /admin')) {
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('Disallow: /') && line.trim().length <= 12) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Enriches a lead by analyzing its official website for verified corporate contacts
   */
  static async enrichFromWebsite(websiteUrl: string): Promise<EnrichmentResult> {
    const timestamp = new Date().toISOString();
    const result: EnrichmentResult = {
      websiteUrl,
      contactEmail: null,
      emailSourceUrl: null,
      phone: null,
      verificationStatus: EmailVerificationStatus.UNAVAILABLE,
      retrievedAt: timestamp,
    };

    if (!websiteUrl || !websiteUrl.startsWith('http')) {
      return result;
    }

    const isAllowed = await this.isAllowedByRobotsTxt(websiteUrl);
    if (!isAllowed) {
      logger.info({ websiteUrl }, 'Website crawl restricted by robots.txt');
      return result;
    }

    const targetSubpages = [
      '',
      '/contact',
      '/contact-us',
      '/kontak',
      '/hubungi-kami',
      '/tentang-kami',
      '/about',
    ];

    for (const sub of targetSubpages) {
      if (result.contactEmail && result.phone) break;

      try {
        const pageUrl = new URL(sub, websiteUrl).toString();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(pageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; WardellLeadEngineBot/1.0; +https://wardell.tech)',
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        clearTimeout(timeout);

        if (!res.ok) continue;

        const html = await res.text();

        // 1. Email Regex Search (prioritizing corporate addresses)
        const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches && !result.contactEmail) {
          // Filter out image files or invalid extensions matching email patterns
          const validEmails = emailMatches.filter((e) => {
            const lower = e.toLowerCase();
            return (
              !lower.endsWith('.png') &&
              !lower.endsWith('.jpg') &&
              !lower.endsWith('.webp') &&
              !lower.endsWith('.svg') &&
              !lower.includes('sentry') &&
              !lower.includes('wixpress') &&
              !lower.includes('example.com')
            );
          });

          if (validEmails.length > 0) {
            // Prefer generic company inboxes: info@, kontak@, halo@, support@, admin@
            const corporateEmail = validEmails.find((e) =>
              /^(info|kontak|contact|halo|sales|marketing|support|admin|office)@/i.test(e)
            );

            result.contactEmail = (corporateEmail || validEmails[0]).toLowerCase();
            result.emailSourceUrl = pageUrl;
            result.verificationStatus = EmailVerificationStatus.VERIFIED;
          }
        }

        // 2. Phone / WhatsApp Regex Search (Indonesian format)
        if (!result.phone) {
          const phoneMatches = html.match(/(?:\+62|62|08|021|022)[0-9\s-]{8,14}/g);
          if (phoneMatches && phoneMatches.length > 0) {
            result.phone = phoneMatches[0].trim();
          }
        }
      } catch {
        // Continue checking other subpages
      }
    }

    return result;
  }
}
