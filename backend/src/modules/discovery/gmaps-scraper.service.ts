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

      // Smart Query Mapping for Government & Institutions:
      // Google Maps indexes official institutions under "kantor dinas pemerintah", "dinas [kategori]", or "kantor pemerintah"
      let searchCategory = cat;
      const lowerCat = cat.toLowerCase();
      if (!lowerCat || lowerCat === 'instansi' || lowerCat === 'instansi pemerintah' || lowerCat === 'kantor instansi') {
        searchCategory = 'kantor dinas pemerintah';
      } else if (lowerCat === 'pemda' || lowerCat === 'pemerintah daerah' || lowerCat === 'pemerintah') {
        searchCategory = 'kantor dinas pemerintah daerah';
      }

      if (searchCategory && targetCity && targetProvince) {
        finalQuery = `${searchCategory} ${targetCity} ${targetProvince}`;
      } else if (searchCategory && targetProvince) {
        finalQuery = `${searchCategory} di ${targetProvince}`;
      } else if (searchCategory && targetCity) {
        finalQuery = `${searchCategory} ${targetCity}`;
      } else if (searchCategory) {
        finalQuery = searchCategory;
      } else if (targetProvince) {
        finalQuery = `kantor dinas pemerintah di ${targetProvince}`;
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
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('a[href*="/maps/place/"], div[role="feed"], h1', { timeout: 20000 }).catch(() => null);

      // Check if we got a Feed list OR a Direct Place Page
      const feedExists = await page.$('div[role="feed"], a[href*="/maps/place/"]');

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
            
            // Extract card-level data directly from the listing
            const cardData = await handle.evaluate((el) => {
              const rawName = el.getAttribute('aria-label') || el.textContent?.trim() || '';
              const mapsUrl = (el as HTMLAnchorElement).href.split('?')[0];
              const parent = el.closest('div[jsaction]') || el.parentElement;

              // Extract actual star rating from aria-label e.g. "3,4 bintang" or "4,5 bintang"
              const starEl = parent?.querySelector(
                'span[role="img"][aria-label*="bintang"], span[aria-label*="bintang"], span[aria-label*="stars"], span.ZkP5Je, span.MW4etd'
              );
              let cardRating: number | null = null;
              if (starEl) {
                const starLabel = starEl.getAttribute('aria-label') || starEl.textContent || '';
                const starMatch = starLabel.match(/([1-5][,\.]\d)/);
                if (starMatch) cardRating = parseFloat(starMatch[1].replace(',', '.'));
              }

              // Extract actual review count - MUST NOT match telephone area codes like (021), (022), etc.
              const reviewEl = parent?.querySelector('span[aria-label*="ulasan"], span[aria-label*="reviews"], span.UY7F9');
              let cardReviewCount: number | null = null;
              if (reviewEl) {
                const reviewLabel = reviewEl.getAttribute('aria-label') || reviewEl.textContent || '';
                const reviewMatch = reviewLabel.match(/(\d+[\.,]?\d*)/);
                if (reviewMatch) {
                  cardReviewCount = parseInt(reviewMatch[1].replace(/[\.,]/g, ''), 10);
                }
              } else {
                // Only match if explicitly followed by ulasan or reviews, never standalone parentheses like phone code
                const parentText = (parent as HTMLElement)?.innerText || '';
                const explicitReviewMatch = parentText.match(/\((\d+[\.,]?\d*)\s*(?:ulasan|reviews)\)/i) || 
                                            parentText.match(/(\d+[\.,]?\d*)\s+(?:ulasan|reviews)/i);
                if (explicitReviewMatch) {
                  cardReviewCount = parseInt(explicitReviewMatch[1].replace(/[\.,]/g, ''), 10);
                }
              }

              // Extract real category from card subtitle e.g. "Dewan pendidikan ·  · Jl. A. Yani"
              const w4divs = Array.from(parent?.querySelectorAll('div.W4Efsd') || []);
              const catDiv = w4divs.find((d) => d.textContent?.includes('·'));
              const catText = catDiv?.textContent || '';
              const cardCategory = catText ? catText.split('·')[0].trim() : null;

              return { rawName, mapsUrl, cardRating, cardReviewCount, cardCategory };
            });

            if (!cardData.rawName || places.some((p) => p.businessName === cardData.rawName)) continue;

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

              // Category in detail pane
              const catBtn = document.querySelector('button[jsaction*="category"], button[class*="DkEaL"]');
              const category = catBtn?.textContent?.trim() || null;

              // Detailed Rating if not found on card
              const starEl = document.querySelector(
                'div[role="main"] span.ZkP5Je, div[role="main"] span[role="img"][aria-label*="bintang"], div[role="main"] span[aria-label*="bintang"], span[aria-hidden="true"][class*="fontDisplayLarge"]'
              );
              let paneRating: number | null = null;
              let paneReviewCount: number | null = null;
              if (starEl) {
                const label = starEl.getAttribute('aria-label') || starEl.textContent || '';
                const match = label.match(/([1-5][,\.]\d)/);
                if (match) paneRating = parseFloat(match[1].replace(',', '.'));

                const reviewMatch = label.match(/(\d+[\.,]?\d*)\s*(?:ulasan|reviews)/i);
                if (reviewMatch) paneReviewCount = parseInt(reviewMatch[1].replace(/[\.,]/g, ''), 10);
              }

              // Detailed Review count if not found on card
              if (paneReviewCount === null) {
                const reviewEl = document.querySelector('button[jsaction*="review"], span[aria-label*="ulasan"]');
                if (reviewEl) {
                  const label = reviewEl.getAttribute('aria-label') || reviewEl.textContent || '';
                  if (!label.toLowerCase().includes('tidak ada') && !label.toLowerCase().includes('tulis') && !label.toLowerCase().includes('pelajari')) {
                    const match = label.match(/(\d+[\.,]?\d*)/);
                    if (match) paneReviewCount = parseInt(match[1].replace(/[\.,]/g, ''), 10);
                  }
                }
              }

              return { name, phone, address, website, category, paneRating, paneReviewCount };
            }, cardData.rawName);

            const location = this.inferLocation(detail.address || '', finalQuery);
            const resolvedName = (detail.name && detail.name !== 'Hasil') ? detail.name : cardData.rawName;
            const resolvedProvince = targetProvince || location.province;
            const resolvedCity = targetCity || location.city;
            const resolvedRating = cardData.cardRating ?? detail.paneRating ?? null;
            const resolvedReviewCount = cardData.cardReviewCount ?? detail.paneReviewCount ?? null;
            const resolvedCategory = cardData.cardCategory || detail.category || (cat || 'Kantor Pemerintah');

            places.push({
              businessName: resolvedName,
              phone: detail.phone,
              rating: resolvedRating,
              reviewCount: resolvedReviewCount,
              businessAddress: detail.address,
              businessCategory: resolvedCategory,
              city: resolvedCity,
              province: resolvedProvince,
              websiteUrl: detail.website,
              mapsUrl: cardData.mapsUrl,
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

          const catBtn = document.querySelector('button[jsaction*="category"], button[class*="DkEaL"]');
          let category = catBtn?.textContent?.trim();
          if (!category) {
            const h1 = document.querySelector('h1');
            const subBtn = h1?.closest('div[role="main"]')?.querySelector('button[class*="fontTitleSmall"], div[class*="fontBodyMedium"] button');
            category = subBtn?.textContent?.trim() || null;
          }

          // Extract real star rating and review count from aria-label
          const starEl = document.querySelector('span.ZkP5Je, span[role="img"][aria-label*="bintang"], span[aria-label*="bintang"], span[aria-hidden="true"][class*="fontDisplayLarge"]');
          let rating: number | null = null;
          let reviewCount: number | null = null;
          if (starEl) {
            const label = starEl.getAttribute('aria-label') || starEl.textContent || '';
            const match = label.match(/([1-5][,\.]\d)/);
            if (match) rating = parseFloat(match[1].replace(',', '.'));

            const starReviewMatch = label.match(/(\d+[\.,]?\d*)\s*(?:ulasan|reviews)/i);
            if (starReviewMatch) reviewCount = parseInt(starReviewMatch[1].replace(/[\.,]/g, ''), 10);
          }

          if (reviewCount === null) {
            const reviewEl = document.querySelector('button[jsaction*="review"], span[aria-label*="ulasan"]');
            if (reviewEl) {
              const label = reviewEl.getAttribute('aria-label') || reviewEl.textContent || '';
              if (!label.toLowerCase().includes('tidak ada') && !label.toLowerCase().includes('tulis') && !label.toLowerCase().includes('pelajari')) {
                const match = label.match(/(\d+[\.,]?\d*)/);
                if (match) reviewCount = parseInt(match[1].replace(/[\.,]/g, ''), 10);
              }
            }
          }

          return { name, phone, address, website, category, rating, reviewCount };
        });

        if (singleDetail) {
          const location = this.inferLocation(singleDetail.address || '', finalQuery);
          const resolvedProvince = targetProvince || location.province;
          const resolvedCity = targetCity || location.city;
          const resolvedCategory = singleDetail.category || (cat || 'Kantor Pemerintah');

          places.push({
            businessName: singleDetail.name,
            phone: singleDetail.phone,
            rating: singleDetail.rating,
            reviewCount: singleDetail.reviewCount,
            businessAddress: singleDetail.address,
            businessCategory: resolvedCategory,
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

    const baseTime = Date.now();
    for (let index = 0; index < places.length; index++) {
      const place = places[index];
      // Ensure the first scraped place has the latest timestamp so it shows at the very top of page 1
      const itemTimestamp = new Date(baseTime + (places.length - index) * 1000);

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
            rating: place.rating !== undefined ? place.rating : existing.rating,
            reviewCount: place.reviewCount !== undefined ? place.reviewCount : existing.reviewCount,
            businessAddress: place.businessAddress || existing.businessAddress,
            websiteUrl: place.websiteUrl || existing.websiteUrl,
            mapsUrl: place.mapsUrl || existing.mapsUrl,
            dataSource: 'GOOGLE_MAPS_REAL',
            createdAt: itemTimestamp,
            updatedAt: itemTimestamp,
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
            createdAt: itemTimestamp,
            updatedAt: itemTimestamp,
          },
        });
        savedCount++;
      }
    }

    return { places, savedCount, updatedCount, queryUsed: finalQuery, targetProvince: targetProvince || undefined };
  }
}
