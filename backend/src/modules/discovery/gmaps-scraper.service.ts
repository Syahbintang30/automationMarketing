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

export interface ScrapeJobStatus {
  isRunning: boolean;
  queryUsed?: string;
  targetProvince?: string;
  targetCategory?: string;
  progressMessage: string;
  startedAt?: string;
  lastResult?: {
    success: boolean;
    count: number;
    savedCount: number;
    updatedCount: number;
    message: string;
    completedAt: string;
  } | null;
}

export class GmapsScraperService {
  private static activeJobStatus: ScrapeJobStatus = {
    isRunning: false,
    progressMessage: 'Siap melakukan scraping',
    lastResult: null,
  };

  /**
   * Get current background scraping status
   */
  static getStatus(): ScrapeJobStatus {
    return this.activeJobStatus;
  }
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
   * Geolocation coordinates for Indonesian provinces to center Google Maps search
   */
  static readonly PROVINCE_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
    'Jawa Barat': { lat: -6.9175, lng: 107.6191, zoom: 10 },
    'DKI Jakarta': { lat: -6.2088, lng: 106.8456, zoom: 11 },
    'Jawa Timur': { lat: -7.2575, lng: 112.7521, zoom: 10 },
    'Jawa Tengah': { lat: -6.9667, lng: 110.4167, zoom: 10 },
    'Banten': { lat: -6.1153, lng: 106.1503, zoom: 10 },
    'DI Yogyakarta': { lat: -7.7956, lng: 110.3695, zoom: 11 },
    'Bali': { lat: -8.6705, lng: 115.2126, zoom: 11 },
    'Sumatera Utara': { lat: 3.5952, lng: 98.6722, zoom: 10 },
    'Sumatera Barat': { lat: -0.9471, lng: 100.4172, zoom: 10 },
    'Riau': { lat: 0.5071, lng: 101.4478, zoom: 10 },
    'Kepulauan Riau': { lat: 1.0828, lng: 104.0305, zoom: 10 },
    'Sumatera Selatan': { lat: -2.9761, lng: 104.7754, zoom: 10 },
    'Lampung': { lat: -5.4500, lng: 105.2667, zoom: 10 },
    'Jambi': { lat: -1.6101, lng: 103.6131, zoom: 10 },
    'Bengkulu': { lat: -3.8004, lng: 102.2655, zoom: 10 },
    'Bangka Belitung': { lat: -2.1316, lng: 106.1169, zoom: 10 },
    'Aceh': { lat: 5.5483, lng: 95.3238, zoom: 10 },
    'Kalimantan Barat': { lat: -0.0263, lng: 109.3425, zoom: 10 },
    'Kalimantan Selatan': { lat: -3.3194, lng: 114.5908, zoom: 10 },
    'Kalimantan Timur': { lat: -0.5022, lng: 117.1536, zoom: 10 },
    'Kalimantan Tengah': { lat: -2.2161, lng: 113.9139, zoom: 10 },
    'Kalimantan Utara': { lat: 2.8441, lng: 117.3647, zoom: 10 },
    'Sulawesi Selatan': { lat: -5.1477, lng: 119.4327, zoom: 10 },
    'Sulawesi Utara': { lat: 1.4748, lng: 124.8421, zoom: 10 },
    'Sulawesi Tengah': { lat: -0.8917, lng: 119.8707, zoom: 10 },
    'Sulawesi Tenggara': { lat: -3.9985, lng: 122.5126, zoom: 10 },
    'Sulawesi Barat': { lat: -2.6775, lng: 118.8895, zoom: 10 },
    'Gorontalo': { lat: 0.5435, lng: 123.0568, zoom: 10 },
    'Nusa Tenggara Barat': { lat: -8.5833, lng: 116.1167, zoom: 10 },
    'Nusa Tenggara Timur': { lat: -10.1772, lng: 123.6070, zoom: 10 },
    'Maluku': { lat: -3.6954, lng: 128.1814, zoom: 10 },
    'Maluku Utara': { lat: 0.7893, lng: 127.3610, zoom: 10 },
    'Papua': { lat: -2.5489, lng: 140.7197, zoom: 10 },
    'Papua Barat': { lat: -0.8615, lng: 134.0620, zoom: 10 },
    'Papua Selatan': { lat: -8.4991, lng: 140.4010, zoom: 10 },
    'Papua Tengah': { lat: -3.3667, lng: 135.5000, zoom: 10 },
    'Papua Pegunungan': { lat: -4.0833, lng: 138.9333, zoom: 10 },
    'Papua Barat Daya': { lat: -0.8762, lng: 131.2558, zoom: 10 },
  };

  /**
   * Parse ground-truth province and city directly from official Indonesian address
   */
  static parseIndonesianAddress(
    address: string,
    fallbackProvince?: string,
    fallbackCity?: string
  ): { city: string; province: string } {
    if (!address) {
      return {
        city: fallbackCity || 'Indonesia',
        province: fallbackProvince || 'Indonesia',
      };
    }

    const clean = address.replace(/\s+/g, ' ');
    let detectedProvince: string | null = null;
    let detectedCity: string | null = null;

    // 1. Precise Province Matching against all Indonesian Provinces
    const provincePatterns: [RegExp, string][] = [
      [/\b(DKI\s+Jakarta|Jakarta\s+Pusat|Jakarta\s+Selatan|Jakarta\s+Barat|Jakarta\s+Timur|Jakarta\s+Utara|Daerah\s+Khusus\s+Ibukota\s+Jakarta|Jakarta)\b/i, 'DKI Jakarta'],
      [/\b(Jawa\s+Barat|Jabar)\b/i, 'Jawa Barat'],
      [/\b(Jawa\s+Tengah|Jateng)\b/i, 'Jawa Tengah'],
      [/\b(Jawa\s+Timur|Jatim)\b/i, 'Jawa Timur'],
      [/\b(Banten)\b/i, 'Banten'],
      [/\b(D\.?I\.?\s*Yogyakarta|Yogyakarta|Jogja|Daerah\s+Istimewa\s+Yogyakarta)\b/i, 'DI Yogyakarta'],
      [/\b(Bali)\b/i, 'Bali'],
      [/\b(Sumatera\s+Utara|Sumut)\b/i, 'Sumatera Utara'],
      [/\b(Sumatera\s+Barat|Sumbar)\b/i, 'Sumatera Barat'],
      [/\b(Sumatera\s+Selatan|Sumsel)\b/i, 'Sumatera Selatan'],
      [/\b(Riau)\b/i, 'Riau'],
      [/\b(Kepulauan\s+Riau|Kepri)\b/i, 'Kepulauan Riau'],
      [/\b(Lampung)\b/i, 'Lampung'],
      [/\b(Jambi)\b/i, 'Jambi'],
      [/\b(Bengkulu)\b/i, 'Bengkulu'],
      [/\b(Bangka\s+Belitung|Babel)\b/i, 'Bangka Belitung'],
      [/\b(Aceh|Nanggroe\s+Aceh\s+Darussalam)\b/i, 'Aceh'],
      [/\b(Kalimantan\s+Barat|Kalbar)\b/i, 'Kalimantan Barat'],
      [/\b(Kalimantan\s+Selatan|Kalsel)\b/i, 'Kalimantan Selatan'],
      [/\b(Kalimantan\s+Timur|Kaltim)\b/i, 'Kalimantan Timur'],
      [/\b(Kalimantan\s+Tengah|Kalteng)\b/i, 'Kalimantan Tengah'],
      [/\b(Kalimantan\s+Utara|Kaltara)\b/i, 'Kalimantan Utara'],
      [/\b(Sulawesi\s+Selatan|Sulsel)\b/i, 'Sulawesi Selatan'],
      [/\b(Sulawesi\s+Utara|Sulut)\b/i, 'Sulawesi Utara'],
      [/\b(Sulawesi\s+Tengah|Sulteng)\b/i, 'Sulawesi Tengah'],
      [/\b(Sulawesi\s+Tenggara|Sultra)\b/i, 'Sulawesi Tenggara'],
      [/\b(Sulawesi\s+Barat|Sulbar)\b/i, 'Sulawesi Barat'],
      [/\b(Gorontalo)\b/i, 'Gorontalo'],
      [/\b(Nusa\s+Tenggara\s+Barat|NTB)\b/i, 'Nusa Tenggara Barat'],
      [/\b(Nusa\s+Tenggara\s+Timur|NTT)\b/i, 'Nusa Tenggara Timur'],
      [/\b(Maluku\s+Utara)\b/i, 'Maluku Utara'],
      [/\b(Maluku)\b/i, 'Maluku'],
      [/\b(Papua\s+Barat\s+Daya)\b/i, 'Papua Barat Daya'],
      [/\b(Papua\s+Barat)\b/i, 'Papua Barat'],
      [/\b(Papua\s+Selatan)\b/i, 'Papua Selatan'],
      [/\b(Papua\s+Tengah)\b/i, 'Papua Tengah'],
      [/\b(Papua\s+Pegunungan)\b/i, 'Papua Pegunungan'],
      [/\b(Papua)\b/i, 'Papua'],
    ];

    for (const [pattern, prov] of provincePatterns) {
      if (pattern.test(clean)) {
        detectedProvince = prov;
        break;
      }
    }

    // 2. City / Regency Matching from Address
    const cityRegex = /(?:Kota|Kabupaten|Kab\.)\s+([A-Za-z\s]+?)(?:,|$|\d)/i;
    const cityMatch = clean.match(cityRegex);
    if (cityMatch && cityMatch[1]) {
      const rawCityName = cityMatch[1].trim();
      if (rawCityName.length > 2 && rawCityName.length < 30) {
        const isKab = /Kabupaten|Kab\./i.test(cityMatch[0]);
        detectedCity = (isKab ? 'Kabupaten ' : 'Kota ') + rawCityName;
      }
    }

    if (!detectedCity) {
      const knownCities = [
        { name: 'Kota Bandung', kw: ['bandung', 'cimahi'] },
        { name: 'Kota Bogor', kw: ['bogor'] },
        { name: 'Kota Bekasi', kw: ['bekasi', 'cikarang'] },
        { name: 'Kota Depok', kw: ['depok'] },
        { name: 'Kota Tangerang', kw: ['tangerang', 'bsd', 'serpong'] },
        { name: 'Kota Tangerang Selatan', kw: ['tangerang selatan', 'tangsel', 'pamulang', 'ciputat', 'bintaro'] },
        { name: 'Kota Jakarta Selatan', kw: ['jakarta selatan', 'jaksel'] },
        { name: 'Kota Jakarta Pusat', kw: ['jakarta pusat', 'jakpus'] },
        { name: 'Kota Jakarta Barat', kw: ['jakarta barat', 'jakbar'] },
        { name: 'Kota Jakarta Timur', kw: ['jakarta timur', 'jaktim'] },
        { name: 'Kota Jakarta Utara', kw: ['jakarta utara', 'jakut'] },
        { name: 'Kota Surabaya', kw: ['surabaya'] },
        { name: 'Kota Semarang', kw: ['semarang'] },
        { name: 'Kota Medan', kw: ['medan'] },
        { name: 'Kota Denpasar', kw: ['denpasar', 'kuta', 'badung'] },
        { name: 'Kota Makassar', kw: ['makassar'] },
        { name: 'Kota Yogyakarta', kw: ['yogyakarta', 'sleman', 'bantul'] },
      ];
      for (const c of knownCities) {
        if (c.kw.some((k) => clean.toLowerCase().includes(k))) {
          detectedCity = c.name;
          break;
        }
      }
    }

    // 3. Known City-to-Province associations
    if (!detectedProvince && detectedCity) {
      if (detectedCity.includes('Tangerang')) detectedProvince = 'Banten';
      else if (detectedCity.includes('Jakarta')) detectedProvince = 'DKI Jakarta';
      else if (detectedCity.includes('Bandung') || detectedCity.includes('Bogor') || detectedCity.includes('Bekasi') || detectedCity.includes('Depok')) detectedProvince = 'Jawa Barat';
      else if (detectedCity.includes('Semarang')) detectedProvince = 'Jawa Tengah';
      else if (detectedCity.includes('Surabaya')) detectedProvince = 'Jawa Timur';
      else if (detectedCity.includes('Denpasar')) detectedProvince = 'Bali';
      else if (detectedCity.includes('Medan')) detectedProvince = 'Sumatera Utara';
      else if (detectedCity.includes('Yogyakarta')) detectedProvince = 'DI Yogyakarta';
      else if (detectedCity.includes('Makassar')) detectedProvince = 'Sulawesi Selatan';
    }

    return {
      province: detectedProvince || fallbackProvince || 'Indonesia',
      city: detectedCity || fallbackCity || 'Indonesia',
    };
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
    let targetCategory = '';
    let limit = limitParam;

    if (typeof input === 'string') {
      finalQuery = input.trim();
      targetCategory = input.trim();
      limit = limitParam;
    } else {
      targetProvince = input.province?.trim() || '';
      targetCity = input.city?.trim() || '';
      targetCategory = (input.category || input.query || '').trim();
      limit = input.limit || limitParam || 20;

      // Smart Query Mapping for Government & Institutions:
      // Google Maps indexes official institutions under "kantor dinas pemerintah", "dinas [kategori]", or "kantor pemerintah"
      let searchCategory = targetCategory ? targetCategory.trim() : '';
      const lowerCat = searchCategory.toLowerCase();
      if (lowerCat === 'instansi' || lowerCat === 'instansi pemerintah' || lowerCat === 'kantor instansi') {
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
      } else if (targetCity && targetProvince) {
        finalQuery = `perusahaan dan bisnis di ${targetCity} ${targetProvince}`;
      } else if (targetProvince) {
        finalQuery = `perusahaan dan bisnis di ${targetProvince}`;
      } else {
        finalQuery = 'perusahaan dan bisnis';
      }
    }

    if (this.activeJobStatus.isRunning) {
      throw new Error(
        `Scraping Google Maps saat ini sedang berjalan untuk "${this.activeJobStatus.queryUsed}". Halaman dapat di-refresh dan hasil akan otomatis muncul.`
      );
    }

    this.activeJobStatus = {
      isRunning: true,
      queryUsed: finalQuery,
      targetProvince: targetProvince || undefined,
      targetCategory: targetCategory || undefined,
      progressMessage: `Sedang membuka Google Maps untuk "${finalQuery}"...`,
      startedAt: new Date().toISOString(),
      lastResult: this.activeJobStatus.lastResult,
    };

    let browser: Browser | null = null;
    const places: ScrapedPlace[] = [];

    try {
      const executablePath = this.getChromeExecutablePath();

      browser = await puppeteer.launch({
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

      const page: Page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 900 });

      // Navigate to Google Maps search in Indonesian, centered on target province coordinates if specified
      let targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(finalQuery)}?hl=id`;
      if (targetProvince && GmapsScraperService.PROVINCE_COORDINATES[targetProvince]) {
        const coord = GmapsScraperService.PROVINCE_COORDINATES[targetProvince];
        await page.setGeolocation({ latitude: coord.lat, longitude: coord.lng }).catch(() => null);
        targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(finalQuery)}/@${coord.lat},${coord.lng},${coord.zoom}z?hl=id`;
      }
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

              // Extract actual review count
              let cardReviewCount: number | null = null;
              if (starEl) {
                const starLabel = starEl.getAttribute('aria-label') || '';
                const reviewMatch = starLabel.match(/(\d+[\.,]?\d*)\s*(?:ulasan|reviews)/i);
                if (reviewMatch) cardReviewCount = parseInt(reviewMatch[1].replace(/[\.,]/g, ''), 10);
              }

              if (cardReviewCount === null) {
                const reviewEl = parent?.querySelector('span[aria-label*="ulasan"], span[aria-label*="reviews"], span.UY7F9');
                if (reviewEl) {
                  const reviewLabel = reviewEl.getAttribute('aria-label') || reviewEl.textContent || '';
                  const reviewMatch = reviewLabel.match(/(\d+[\.,]?\d*)/);
                  if (reviewMatch) {
                    cardReviewCount = parseInt(reviewMatch[1].replace(/[\.,]/g, ''), 10);
                  }
                }
              }

              if (cardReviewCount === null && starEl) {
                const parentText = (parent as HTMLElement)?.innerText || '';
                const parenMatch = parentText.match(/\(([0-9\.,]+)\)/);
                if (parenMatch && !parenMatch[1].startsWith('02') && !parenMatch[1].startsWith('03') && !parenMatch[1].startsWith('08')) {
                  cardReviewCount = parseInt(parenMatch[1].replace(/[\.,]/g, ''), 10);
                }
              }

              // Extract real category from card subtitle, validating it is NOT address text
              const w4divs = Array.from(parent?.querySelectorAll('div.W4Efsd') || []);
              let cardCategory: string | null = null;
              const cleanCategoryCandidate = (raw: string | null | undefined): string | null => {
                if (!raw) return null;
                const trimmed = raw.trim();
                if (trimmed.length < 2 || trimmed.length > 40) return null;
                const invalidKeywords = ['jl.', 'jalan', 'rt.', 'rw.', 'no.', 'km', 'samping', 'dekat', 'buka', 'tutup', '24 jam', 'hasil', 'ulasan'];
                if (invalidKeywords.some(k => trimmed.toLowerCase().includes(k))) return null;
                return trimmed;
              };

              for (const div of w4divs) {
                const text = div.textContent || '';
                if (text.includes('·')) {
                  const parts = text.split('·').map(p => p.trim());
                  for (const part of parts) {
                    const candidate = cleanCategoryCandidate(part);
                    if (candidate) {
                      cardCategory = candidate;
                      break;
                    }
                  }
                }
                if (cardCategory) break;
              }

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

              // Phone number with validation
              const phoneBtn = document.querySelector(
                'button[data-tooltip*="Salin nomor telepon"], button[aria-label*="Telepon:"], button[data-item-id*="phone"]'
              );
              let phone = phoneBtn ? (phoneBtn.getAttribute('aria-label') || phoneBtn.textContent || '').replace(/^Telepon:\s*/i, '').trim() : null;
              if (!phone) {
                const phoneMatch = fullText.match(/(?:\+62|62|08|\(0\d{2,3}\)|0\d{2,3})[\s-]?\d{3,4}[\s-]?\d{3,5}/);
                if (phoneMatch) {
                  const raw = phoneMatch[0].trim();
                  const digits = raw.replace(/\D/g, '');
                  if (digits.length >= 9 && digits.length <= 13) {
                    phone = raw;
                  }
                }
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

              // Category in detail pane (official Google button)
              const catBtn = document.querySelector('button[jsaction*="category"], button[class*="DkEaL"]');
              let category = catBtn?.textContent?.trim() || null;
              if (category && (category.includes('·') || category.length > 40 || category.toLowerCase().includes('jl.'))) {
                category = null;
              }

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
                const reviewEl = document.querySelector('button[jsaction*="review"], span[aria-label*="ulasan"], button[data-tab-index="0"]');
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

            const location = GmapsScraperService.parseIndonesianAddress(detail.address || '', targetProvince, targetCity);
            const resolvedName = (detail.name && detail.name !== 'Hasil') ? detail.name : cardData.rawName;
            const resolvedProvince = location.province;
            const resolvedCity = location.city;
            const resolvedRating = cardData.cardRating ?? detail.paneRating ?? null;
            const resolvedReviewCount = cardData.cardReviewCount ?? detail.paneReviewCount ?? null;
            const resolvedCategory = detail.category || cardData.cardCategory || (targetCategory || 'Bisnis / Perusahaan');

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
          let category: string | null = catBtn?.textContent?.trim() || null;
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
          const location = GmapsScraperService.parseIndonesianAddress(singleDetail.address || '', targetProvince, targetCity);
          const resolvedCategory = singleDetail.category || (targetCategory || 'Bisnis / Perusahaan');

          places.push({
            businessName: singleDetail.name,
            phone: singleDetail.phone,
            rating: singleDetail.rating,
            reviewCount: singleDetail.reviewCount,
            businessAddress: singleDetail.address,
            businessCategory: resolvedCategory,
            city: location.city,
            province: location.province,
            websiteUrl: singleDetail.website,
            mapsUrl: page.url().split('?')[0],
          });
        }
      }

      if (browser) {
        await browser.close().catch(() => null);
        browser = null;
      }

      // Upsert into Database (Lead Table)
      let savedCount = 0;
      let updatedCount = 0;

      this.activeJobStatus.progressMessage = `Menyimpan ${places.length} data ke database leads...`;

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
              rating: place.rating !== null ? place.rating : existing.rating,
              reviewCount: place.reviewCount !== null ? place.reviewCount : existing.reviewCount,
              businessAddress: place.businessAddress || existing.businessAddress,
              businessCategory: place.businessCategory || existing.businessCategory,
              city: place.city || existing.city,
              province: place.province || existing.province,
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

      this.activeJobStatus = {
        isRunning: false,
        progressMessage: `Selesai: ${places.length} data ditemukan (${savedCount} baru, ${updatedCount} diupdate).`,
        lastResult: {
          success: true,
          count: places.length,
          savedCount,
          updatedCount,
          message: `Berhasil menarik ${places.length} data (${savedCount} baru, ${updatedCount} diupdate)!`,
          completedAt: new Date().toISOString(),
        },
      };

      return { places, savedCount, updatedCount, queryUsed: finalQuery, targetProvince: targetProvince || undefined };
    } catch (err: any) {
      this.activeJobStatus = {
        isRunning: false,
        progressMessage: 'Gagal melakukan scraping',
        lastResult: {
          success: false,
          count: 0,
          savedCount: 0,
          updatedCount: 0,
          message: err.message || 'Gagal mengekstrak data dari Google Maps.',
          completedAt: new Date().toISOString(),
        },
      };
      throw err;
    } finally {
      if (browser) {
        await browser.close().catch(() => null);
      }
    }
  }
}

