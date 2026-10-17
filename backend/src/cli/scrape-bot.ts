import { GmapsScraperService } from '../modules/discovery/gmaps-scraper.service';
import { ExportService } from '../modules/export/export.service';
import { prisma } from '../db/prisma';
import path from 'path';
import fs from 'fs';

// Parse command-line flags
function parseArgs() {
  const args = process.argv.slice(2);
  let query = 'dinas kesehatan bandung';
  let limit = 20;
  let format: 'xlsx' | 'csv' = 'xlsx';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--query=')) {
      query = arg.split('=')[1];
    } else if (arg === '--query' && args[i + 1]) {
      query = args[i + 1];
      i++;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--csv') {
      format = 'csv';
    } else if (!arg.startsWith('--') && i === 0) {
      query = arg;
    }
  }

  return { query, limit, format };
}

async function runBot() {
  const opts = parseArgs();

  console.log('===============================================================');
  console.log('🤖 GOOGLE MAPS REAL SCRAPER BOT — FOR COLD CALLING');
  console.log('===============================================================');
  console.log(`🔍 Target Query     : "${opts.query}"`);
  console.log(`🎯 Limit Target     : ${opts.limit} entri`);
  console.log(`📊 Output Format    : ${opts.format.toUpperCase()}`);
  console.log('---------------------------------------------------------------\n');

  console.log('🚀 [1/2] Membuka Google Maps & mengekstrak data...');
  const scrapeResult = await GmapsScraperService.scrape(opts.query, opts.limit);

  console.log(`\n✅ Selesai mengekstrak: ${scrapeResult.places.length} data ditemukan`);
  console.log(`💾 Tersimpan di DB : ${scrapeResult.savedCount} data baru, ${scrapeResult.updatedCount} diupdate\n`);

  console.log('📊 Ringkasan Data yang Ditemukan:');
  scrapeResult.places.slice(0, 5).forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.businessName}`);
    console.log(`       📞 Telp    : ${p.phone || '(Belum ada di kartu)'}`);
    console.log(`       📍 Alamat  : ${p.businessAddress || p.city}`);
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
  const sanitizedQuery = opts.query.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `gmaps_${sanitizedQuery}_${timestamp}.${opts.format}`;
  const targetFilePath = path.join(exportDir, filename);

  const workbook = await ExportService.generateLeadsWorkbook({});

  if (opts.format === 'csv') {
    await workbook.csv.writeFile(targetFilePath);
  } else {
    await workbook.xlsx.writeFile(targetFilePath);
  }

  console.log('===============================================================');
  console.log(`🎉 SCRAPING SELESAI & FILE SIAP DIPAKAI COLD CALL!`);
  console.log(`📁 File Excel tersimpan di : ${targetFilePath}`);
  console.log(`📈 Total Leads             : ${scrapeResult.places.length}`);
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
