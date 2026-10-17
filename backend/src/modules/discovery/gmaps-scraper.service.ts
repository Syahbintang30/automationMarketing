import puppeteer, { Browser, Page } from 'puppeteer-core';
import fs from 'fs';
import { prisma } from '../../db/prisma';

export interface ScrapedPlace {
  businessName: string;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  businessAddress: string | null;
  businessCategory: string;
  city: string;
  province: string;
  websiteUrl: string | null;
  mapsUrl: string;
}

export interface ScrapeGmapsInput {
  query?: string;
  province?: string;
  city?: string;
  category?: string;
  limit?: number;
}

export class GmapsScraperService {
  /**
   * Resolve local Google Chrome binary path on macOS / Linux
   */
  private static getChromeExecutablePath(): string {
    const candidates = [
      process.env.CHROME_PATH,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ].filter(Boolean) as string[];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error(
      'Google Chrome tidak ditemukan di sistem. Harap pastikan Google Chrome terinstall di Mac Anda.'
    );
  }

  /**
   * Infer city and province from Indonesian text or query
   */
  private static inferLocation(text: string, query: string): { city: string; province: string } {
    const combined = `${text} ${query}`.toLowerCase();

    const indonesianLocations = [
      { city: 'Kota Bandung', prov: 'Jawa Barat', kw: ['bandung', 'gedebage', 'soekarno hatta', 'jabar'] },
      { city: 'Kota Cimahi', prov: 'Jawa Barat', kw: ['cimahi'] },
      { city: 'Kabupaten Bekasi', prov: 'Jawa Barat', kw: ['cikarang', 'bekasi'] },
      { city: 'Kabupaten Karawang', prov: 'Jawa Barat', kw: ['karawang'] },
      { city: 'Kota Bogor', prov: 'Jawa Barat', kw: ['bogor'] },
      { city: 'Kota Depok', prov: 'Jawa Barat', kw: ['depok'] },
      { city: 'Kota Jakarta Selatan', prov: 'DKI Jakarta', kw: ['jakarta selatan', 'jaksel'] },
      { city: 'Kota Jakarta Pusat', prov: 'DKI Jakarta', kw: ['jakarta pusat', 'jakpus'] },
      { city: 'Kota Jakarta Barat', prov: 'DKI Jakarta', kw: ['jakarta barat', 'jakbar'] },
      { city: 'Kota Jakarta Timur', prov: 'DKI Jakarta', kw: ['jakarta timur', 'jaktim'] },
      { city: 'Kota Jakarta Utara', prov: 'DKI Jakarta', kw: ['jakarta utara', 'jakut'] },
      { city: 'DKI Jakarta', prov: 'DKI Jakarta', kw: ['jakarta'] },
      { city: 'Kota Surabaya', prov: 'Jawa Timur', kw: ['surabaya', 'jatim'] },
      { city: 'Kota Semarang', prov: 'Jawa Tengah', kw: ['semarang', 'jateng'] },
      { city: 'Kota Medan', prov: 'Sumatera Utara', kw: ['medan', 'sumut'] },
      { city: 'Kota Tangerang', prov: 'Banten', kw: ['tangerang', 'bsd', 'banten'] },
      { city: 'Kota Denpasar', prov: 'Bali', kw: ['denpasar', 'bali'] },
      { city: 'Kota Makassar', prov: 'Sulawesi Selatan', kw: ['makassar'] },
      { city: 'Kota Yogyakarta', prov: 'DI Yogyakarta', kw: ['yogyakarta', 'jogja'] },
    ];

    for (const loc of indonesianLocations) {
      if (loc.kw.some((k) => combined.includes(k))) {
        return { city: loc.city, province: loc.prov };
      }
    }

    return { city: 'Indonesia', province: 'Indonesia' };
  }

  /**
   * Scrapes Google Maps live for companies, government institutions, or businesses
   * Supports structured Province, City, and Category inputs
   */
  static async scrape(
    input: string | ScrapeGmapsInput,
    limitParam: number = 20
  ): Promise<{ places: ScrapedPlace[]; savedCount: number; updatedCount: number; queryUsed: string; targetProvince?: string }> {
    let finalQuery = '';
    let targetProvince = '';
    let targetCity = '';
    let limit = limitParam;

    if (typeof input === 'string') {
      finalQuery = input.trim();
      limit = limitParam;
    } else {
      targetProvince = input.province?.trim() || '';
      targetCity = input.city?.trim() || '';
      const cat = (input.category || input.query || '').trim();
      limit = input.limit || limitParam || 20;

      if (cat && targetCity && targetProvince) {
        finalQuery = `${cat} ${targetCity} ${targetProvince}`;
      } else if (cat && targetProvince) {
        finalQuery = `${cat} di Provinsi ${targetProvince}`;
      } else if (cat && targetCity) {
        finalQuery = `${cat} ${targetCity}`;
      } else if (cat) {
        finalQuery = cat;
      } else if (targetProvince) {
        finalQuery = `kantor instansi dan perusahaan di ${targetProvince}`;
      } else {
        finalQuery = 'kantor dinas pemerintah';
      }
    }

    const executablePath = this.getChromeExecutablePath();

    const browser: Browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--lang=id-ID,id',
      ],
    });

    const places: ScrapedPlace[] = [];

    try {
      const page: Page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 900 });

      // Navigate to Google Maps search in Indonesian
      const targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(finalQuery)}?hl=id`;
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });

      // Check if we got a Feed list OR a Direct Place Page
      const feedExists = await page.waitForSelector('div[role="feed"]', { timeout: 7000 }).catch(() => null);

      if (feedExists) {
        // --- CASE A: Feed of multiple places ---
        const scrollIterations = Math.min(Math.ceil(limit / 5) + 1, 8);
        for (let i = 0; i < scrollIterations; i++) {
          await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) feed.scrollTop = feed.scrollHeight;
          });
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        // Get all place link handles
        const placeHandles = await page.$$('a[href*="/maps/place/"]');
        const countToInspect = Math.min(placeHandles.length, limit);

        for (let i = 0; i < countToInspect; i++) {
          try {
            const handle = placeHandles[i];
            const rawName = await handle.evaluate((el) => el.getAttribute('aria-label') || el.textContent?.trim());
            const mapsUrl = await handle.evaluate((el) => (el as HTMLAnchorElement).href.split('?')[0]);

            if (!rawName || places.some((p) => p.businessName === rawName)) continue;

            // Click the card to open detail pane
            await handle.click().catch(() => null);
            await new Promise((r) => setTimeout(r, 900));

            // Extract detail from active place pane
            const detail = await page.evaluate((fallbackName) => {
              // Exact Place Title
              const titleEl = document.querySelector('div[role="main"] h1, h1[class*="fontHeadlineLarge"]');
              const name = titleEl?.textContent?.trim() || fallbackName;

              // Full text in pane
              const mainPane = document.querySelector('div[role="main"]') as HTMLElement | null;
              const fullText = mainPane?.innerText || (document.body as HTMLElement).innerText || '';

              // Phone number
              const phoneBtn = document.querySelector(
                'button[data-tooltip*="Salin nomor telepon"], button[aria-label*="Telepon:"], button[data-item-id*="phone"]'
              );
              let phone = phoneBtn ? (phoneBtn.getAttribute('aria-label') || '').replace(/^Telepon:\s*/i, '').trim() : null;
              if (!phone) {
                const phoneMatch = fullText.match(/(?:\+62|62|08|\(0\d{2,3}\)|0\d{2,3})[\s-]?\d{3,4}[\s-]?\d{3,5}/);
                phone = phoneMatch ? phoneMatch[0].trim() : null;
              }

              // Address
              const addrBtn = document.querySelector(
                'button[data-tooltip*="Salin alamat"], button[aria-label*="Alamat:"], button[data-item-id*="address"]'
              );
              const address = addrBtn
                ? (addrBtn.getAttribute('aria-label') || '').replace(/^Alamat:\s*/i, '').trim()
                : null;

              // Website
              const webA = document.querySelector(
                'a[data-tooltip*="Buka situs web"], a[aria-label*="Situs web:"], a[data-item-id*="authority"]'
              );
              const website = webA ? (webA.getAttribute('href') || '').trim() : null;

              // Category
              const catBtn = document.querySelector('button[jsaction*="category"]');
              const category = catBtn?.textContent?.trim() || 'Instansi / Bisnis';

              // Rating & Review
              const ratingEl = document.querySelector('span[aria-hidden="true"][class*="fontDisplayLarge"], div[role="main"] span[aria-label*="bintang"]');
              const ratingText = ratingEl?.textContent?.trim() || '';
              const ratingMatch = ratingText.match(/\b([1-5][,\.]\d)\b/) || fullText.match(/\b([1-5][,\.]\d)\b/);
              const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null;

              const reviewMatch = fullText.match(/\((\d+[\.,]?\d*)\s*ulasan\)/i) || fullText.match(/\((\d+[\.,]?\d*)\)/);
              const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/[\.,]/g, ''), 10) : null;

              return { name, phone, address, website, category, rating, reviewCount };
            }, rawName);

            const location = this.inferLocation(detail.address || '', finalQuery);
            const resolvedName = (detail.name && detail.name !== 'Hasil') ? detail.name : rawName;
            const resolvedProvince = targetProvince || location.province;
            const resolvedCity = targetCity || location.city;

            places.push({
              businessName: resolvedName,
              phone: detail.phone,
              rating: detail.rating,
              reviewCount: detail.reviewCount,
              businessAddress: detail.address,
              businessCategory: detail.category || 'Instansi / Bisnis',
              city: resolvedCity,
              province: resolvedProvince,
              websiteUrl: detail.website,
              mapsUrl,
            });
          } catch {
            // Continue next item
          }
        }
      } else {
        // --- CASE B: Single Place direct view ---
        const singleDetail = await page.evaluate(() => {
          const titleEl = document.querySelector('h1');
          const name = titleEl?.textContent?.trim();
          if (!name || name === 'Hasil') return null;

          const fullText = (document.body as HTMLElement).innerText || '';

          const phoneBtn = document.querySelector(
            'button[data-tooltip*="Salin nomor telepon"], button[aria-label*="Telepon:"], button[data-item-id*="phone"]'
          );
          let phone = phoneBtn ? (phoneBtn.getAttribute('aria-label') || '').replace(/^Telepon:\s*/i, '').trim() : null;
          if (!phone) {
            const phoneMatch = fullText.match(/(?:\+62|62|08|\(0\d{2,3}\)|0\d{2,3})[\s-]?\d{3,4}[\s-]?\d{3,5}/);
            phone = phoneMatch ? phoneMatch[0].trim() : null;
          }

          const addrBtn = document.querySelector(
            'button[data-tooltip*="Salin alamat"], button[aria-label*="Alamat:"], button[data-item-id*="address"]'
          );
          const address = addrBtn
            ? (addrBtn.getAttribute('aria-label') || '').replace(/^Alamat:\s*/i, '').trim()
            : null;

          const webA = document.querySelector(
            'a[data-tooltip*="Buka situs web"], a[aria-label*="Situs web:"], a[data-item-id*="authority"]'
          );
          const website = webA ? (webA.getAttribute('href') || '').trim() : null;

          const catBtn = document.querySelector('button[jsaction*="category"]');
          const category = catBtn?.textContent?.trim() || 'Instansi / Bisnis';

          const ratingMatch = fullText.match(/\b([1-5][,\.]\d)\b/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null;

          const reviewMatch = fullText.match(/\((\d+[\.,]?\d*)\s*ulasan\)/i) || fullText.match(/\((\d+[\.,]?\d*)\)/);
          const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/[\.,]/g, ''), 10) : null;

          return { name, phone, address, website, category, rating, reviewCount };
        });

        if (singleDetail) {
          const location = this.inferLocation(singleDetail.address || '', finalQuery);
          const resolvedProvince = targetProvince || location.province;
          const resolvedCity = targetCity || location.city;

          places.push({
            businessName: singleDetail.name,
            phone: singleDetail.phone,
            rating: singleDetail.rating,
            reviewCount: singleDetail.reviewCount,
            businessAddress: singleDetail.address,
            businessCategory: singleDetail.category,
            city: resolvedCity,
            province: resolvedProvince,
            websiteUrl: singleDetail.website,
            mapsUrl: page.url().split('?')[0],
          });
        }
      }
    } finally {
      await browser.close().catch(() => null);
    }

    // Upsert into Database (Lead Table)
    let savedCount = 0;
    let updatedCount = 0;

    for (const place of places) {
      const existing = await prisma.lead.findFirst({
        where: {
          OR: [
            ...(place.mapsUrl ? [{ mapsUrl: place.mapsUrl }] : []),
            ...(place.phone ? [{ phone: place.phone }] : []),
            {
              businessName: { equals: place.businessName, mode: 'insensitive' },
              city: { equals: place.city, mode: 'insensitive' },
            },
          ],
        },
      });

      if (existing) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            phone: place.phone || existing.phone,
            rating: place.rating ?? existing.rating,
            reviewCount: place.reviewCount ?? existing.reviewCount,
            businessAddress: place.businessAddress || existing.businessAddress,
            websiteUrl: place.websiteUrl || existing.websiteUrl,
            mapsUrl: place.mapsUrl || existing.mapsUrl,
            dataSource: 'GOOGLE_MAPS_REAL',
          },
        });
        updatedCount++;
      } else {
        await prisma.lead.create({
          data: {
            businessName: place.businessName,
            businessCategory: place.businessCategory,
            phone: place.phone,
            rating: place.rating,
            reviewCount: place.reviewCount,
            businessAddress: place.businessAddress,
            city: place.city,
            province: place.province,
            websiteUrl: place.websiteUrl,
            mapsUrl: place.mapsUrl,
            dataSource: 'GOOGLE_MAPS_REAL',
            qualificationStatus: 'QUALIFIED',
            coldCallStatus: 'BELUM_DIHUBUNGI',
          },
        });
        savedCount++;
      }
    }

    return { places, savedCount, updatedCount, queryUsed: finalQuery, targetProvince: targetProvince || undefined };
  }
}
