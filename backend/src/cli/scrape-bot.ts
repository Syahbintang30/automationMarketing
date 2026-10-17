import { PublicDirectoryProvider } from '../modules/discovery/public-directory.provider';
import { EnrichmentService } from '../modules/enrichment/enrichment.service';
import { LeadsService } from '../modules/leads/leads.service';
import { ExportService } from '../modules/export/export.service';
import { prisma } from '../db/prisma';
import path from 'path';
import fs from 'fs';

// Parse command-line flags
function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    category: 'Software House',
    limit: '25',
    format: 'xlsx',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const parts = arg.substring(2).split('=');
      const key = parts[0];
      const val = parts[1] || args[i + 1];
      if (val && !val.startsWith('--')) {
        params[key] = val;
      }
    }
  }

  return {
    province: params.province,
    city: params.city,
    category: params.category,
    limit: parseInt(params.limit, 10) || 25,
    format: params.format.toLowerCase() === 'csv' ? 'csv' : 'xlsx',
    output: params.output,
  };
}

async function runBot() {
  const opts = parseArgs();

  console.log('===============================================================');
  console.log('🤖 WARDELL LEAD ENGINE — AUTOMATED B2B SCRAPER & ENRICHMENT BOT');
  console.log('===============================================================');
  console.log(`📍 Target Province : ${opts.province}`);
  console.log(`🏙️  Target City     : ${opts.city}`);
  console.log(`🏢 Category / Query : ${opts.category}`);
  console.log(`🎯 Requested Limit  : ${opts.limit} leads`);
  console.log(`📊 Output Format    : ${opts.format.toUpperCase()}`);
  console.log('---------------------------------------------------------------\n');

  console.log('🔍 [Step 1/3] Searching Indonesian business directories & maps listings...');
  const provider = new PublicDirectoryProvider();
  const discovered = await provider.searchBusinesses({
    province: opts.province,
    city: opts.city,
    businessCategory: opts.category,
    maxResults: opts.limit,
  });

  console.log(`✅ Discovered ${discovered.length} initial business candidates.\n`);
  console.log('🌐 [Step 2/3] Enriching contacts from official websites (checking robots.txt)...');

  let enrichedCount = 0;
  const processedLeads = [];

  for (let i = 0; i < discovered.length; i++) {
    const biz = discovered[i];
    console.log(`   [${i + 1}/${discovered.length}] Inspecting: "${biz.businessName}"`);

    let contactEmail = biz.contactEmail;
    let emailSourceUrl = biz.emailSourceUrl;
    let verificationStatus = biz.contactEmail ? 'VERIFIED' : 'UNVERIFIED';

    if (!contactEmail && biz.websiteUrl) {
      console.log(`      Crawling website: ${biz.websiteUrl}...`);
      const enriched = await EnrichmentService.enrichFromWebsite(biz.websiteUrl);
      if (enriched.contactEmail) {
        contactEmail = enriched.contactEmail;
        emailSourceUrl = enriched.emailSourceUrl;
        verificationStatus = enriched.verificationStatus;
        console.log(`      ✨ Found verified email: ${contactEmail} (${enriched.emailSourceUrl})`);
        enrichedCount++;
      }
      if (enriched.phone && !biz.phone) {
        biz.phone = enriched.phone;
        console.log(`      📞 Found telephone/WA: ${biz.phone}`);
      }
    }

    // Save/Upsert into PostgreSQL database
    const saved = await LeadsService.upsertLead({
      businessName: biz.businessName,
      businessCategory: biz.businessCategory,
      province: biz.province,
      city: biz.city,
      businessAddress: biz.businessAddress,
      websiteUrl: biz.websiteUrl,
      contactEmail,
      emailSourceUrl,
      // @ts-expect-error verification enum match
      emailVerificationStatus: verificationStatus,
      dataSource: biz.dataSource,
      sourceRecordId: biz.sourceRecordId,
    });

    processedLeads.push(saved);
  }

  console.log(`\n💾 Saved ${processedLeads.length} leads to PostgreSQL database (deduplicated).`);
  console.log(`✨ Successfully enriched ${enrichedCount} contact emails.\n`);

  console.log('📊 [Step 3/3] Generating spreadsheet export...');
  const exportDir = path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = opts.output || `leads_${opts.province.replace(/\s+/g, '_')}_${timestamp}.${opts.format}`;
  const targetFilePath = path.isAbsolute(filename) ? filename : path.join(exportDir, filename);

  const workbook = await ExportService.generateLeadsWorkbook({
    province: opts.province,
  });

  if (opts.format === 'csv') {
    await workbook.csv.writeFile(targetFilePath);
  } else {
    await workbook.xlsx.writeFile(targetFilePath);
  }

  console.log('===============================================================');
  console.log(`🎉 SCRAPING COMPLETE!`);
  console.log(`📁 File exported to : ${targetFilePath}`);
  console.log(`📈 Total Records    : ${processedLeads.length} leads`);
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
