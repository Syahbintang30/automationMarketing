import { GmapsScraperService } from '../modules/discovery/gmaps-scraper.service';
import { ExportService } from '../modules/export/export.service';
import { prisma } from '../db/prisma';
import path from 'path';
import fs from 'fs';

// Parse command-line flags
function parseArgs() {
  const args = process.argv.slice(2);
  let query = '';
  let province = '';
  let city = '';
  let category = '';
  let limit = 20;
  let format: 'xlsx' | 'csv' = 'xlsx';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--province=')) {
      province = arg.substring('--province='.length);
    } else if (arg === '--province' && args[i + 1]) {
      province = args[++i];
    } else if (arg.startsWith('--city=')) {
      city = arg.substring('--city='.length);
    } else if (arg === '--city' && args[i + 1]) {
      city = args[++i];
    } else if (arg.startsWith('--category=')) {
      category = arg.substring('--category='.length);
    } else if (arg === '--category' && args[i + 1]) {
      category = args[++i];
    } else if (arg.startsWith('--query=')) {
      query = arg.substring('--query='.length);
    } else if (arg === '--query' && args[i + 1]) {
      query = args[++i];
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.substring('--limit='.length), 10);
    } else if (arg === '--limit' && args[i + 1]) {
      limit = parseInt(args[++i], 10);
    } else if (arg === '--csv' || arg === '--format=csv') {
      format = 'csv';
    } else if (!arg.startsWith('--') && i === 0) {
      query = arg;
    }
  }

  // Default fallback if completely empty
  if (!query && !category && !province) {
    province = 'Jawa Barat';
    category = 'Dinas Kesehatan';
  }

  return { query, province, city, category, limit, format };
}

async function runBot() {
  const opts = parseArgs();

  console.log('===============================================================');
  console.log('🤖 GOOGLE MAPS REAL SCRAPER BOT — PER PROVINSI & KATEGORI');
  console.log('===============================================================');
  if (opts.province) console.log(`📍 Target Provinsi   : ${opts.province}`);
  if (opts.city)     console.log(`🏙️  Target Kota/Kab   : ${opts.city}`);
  if (opts.category) console.log(`🏢 Target Kategori   : ${opts.category}`);
  if (opts.query)    console.log(`🔍 Direct Query      : "${opts.query}"`);
  console.log(`🎯 Limit Target      : ${opts.limit} entri`);
  console.log(`📊 Output Format     : ${opts.format.toUpperCase()}`);
  console.log('---------------------------------------------------------------\n');

  console.log('🚀 [1/2] Membuka Google Maps & mengekstrak data...');
  const scrapeResult = await GmapsScraperService.scrape({
    query: opts.query || undefined,
    province: opts.province || undefined,
    city: opts.city || undefined,
    category: opts.category || undefined,
    limit: opts.limit,
  });

  console.log(`🔍 Query yang dipakai : "${scrapeResult.queryUsed}"`);
  console.log(`✅ Selesai mengekstrak : ${scrapeResult.places.length} data ditemukan`);
  console.log(`💾 Tersimpan di DB   : ${scrapeResult.savedCount} data baru, ${scrapeResult.updatedCount} diupdate\n`);

  console.log('📊 Ringkasan Data yang Ditemukan:');
  scrapeResult.places.slice(0, 5).forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.businessName}`);
    console.log(`       📞 Telp    : ${p.phone || '(Belum ada di kartu)'}`);
    console.log(`       📍 Wilayah : ${p.city}, ${p.province}`);
    console.log(`       🏷️  Kategori: ${p.businessCategory}`);
  });
  if (scrapeResult.places.length > 5) {
    console.log(`   ... dan ${scrapeResult.places.length - 5} data lainnya.\n`);
  }

  console.log('\n📁 [2/2] Mengenerate file spreadsheet...');
  const exportDir = path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetTag = (opts.province ? `${opts.province}_` : '') + (opts.category || opts.query || 'leads');
  const sanitizedTag = targetTag.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `gmaps_${sanitizedTag}_${timestamp}.${opts.format}`;
  const targetFilePath = path.join(exportDir, filename);

  // Filter workbook by the requested province if specified
  const workbook = await ExportService.generateLeadsWorkbook({
    province: opts.province || scrapeResult.targetProvince || undefined,
  });

  if (opts.format === 'csv') {
    await workbook.csv.writeFile(targetFilePath);
  } else {
    await workbook.xlsx.writeFile(targetFilePath);
  }

  console.log('===============================================================');
  console.log(`🎉 SCRAPING SELESAI & FILE SIAP DIPAKAI COLD CALL!`);
  console.log(`📁 File Excel tersimpan di : ${targetFilePath}`);
  console.log(`📈 Total Leads             : ${scrapeResult.places.length}`);
  if (opts.province) {
    console.log(`📍 Wilayah Provinsi        : ${opts.province}`);
  }
  console.log('===============================================================');
}

runBot()
  .catch((err) => {
    console.error('❌ Bot error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
