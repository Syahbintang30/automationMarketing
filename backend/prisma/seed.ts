import { PrismaClient, Role, CampaignStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const INDONESIA_LOCATIONS: Record<string, string[]> = {
  'DKI Jakarta': [
    'Jakarta Pusat',
    'Jakarta Selatan',
    'Jakarta Barat',
    'Jakarta Timur',
    'Jakarta Utara',
    'Kepulauan Seribu',
  ],
  'Jawa Barat': [
    'Kota Bandung',
    'Kota Bekasi',
    'Kota Bogor',
    'Kota Depok',
    'Kota Cimahi',
    'Kota Cirebon',
    'Kota Sukabumi',
    'Kota Tasikmalaya',
    'Kota Banjar',
    'Kabupaten Bandung',
    'Kabupaten Bandung Barat',
    'Kabupaten Bekasi',
    'Kabupaten Bogor',
    'Kabupaten Ciamis',
    'Kabupaten Cianjur',
    'Kabupaten Cirebon',
    'Kabupaten Garut',
    'Kabupaten Indramayu',
    'Kabupaten Karawang',
    'Kabupaten Kuningan',
    'Kabupaten Majalengka',
    'Kabupaten Pangandaran',
    'Kabupaten Purwakarta',
    'Kabupaten Subang',
    'Kabupaten Sukabumi',
    'Kabupaten Sumedang',
    'Kabupaten Tasikmalaya',
  ],
  'Jawa Timur': [
    'Kota Surabaya',
    'Kota Malang',
    'Kota Kediri',
    'Kota Blitar',
    'Kota Madiun',
    'Kota Mojokerto',
    'Kota Pasuruan',
    'Kota Probolinggo',
    'Kota Batu',
    'Kabupaten Sidoarjo',
    'Kabupaten Gresik',
    'Kabupaten Malang',
  ],
  'Jawa Tengah': [
    'Kota Semarang',
    'Kota Surakarta (Solo)',
    'Kota Magelang',
    'Kota Pekalongan',
    'Kota Salatiga',
    'Kota Tegal',
    'Kabupaten Banyumas',
    'Kabupaten Kudus',
  ],
  'Banten': [
    'Kota Tangerang',
    'Kota Tangerang Selatan',
    'Kota Serang',
    'Kota Cilegon',
    'Kabupaten Tangerang',
    'Kabupaten Serang',
    'Kabupaten Lebak',
    'Kabupaten Pandeglang',
  ],
  'D.I. Yogyakarta': [
    'Kota Yogyakarta',
    'Kabupaten Sleman',
    'Kabupaten Bantul',
    'Kabupaten Gunungkidul',
    'Kabupaten Kulon Progo',
  ],
  'Bali': [
    'Kota Denpasar',
    'Kabupaten Badung',
    'Kabupaten Gianyar',
    'Kabupaten Tabanan',
    'Kabupaten Buleleng',
  ],
  'Sumatera Utara': [
    'Kota Medan',
    'Kota Binjai',
    'Kota Pematangsiantar',
    'Kabupaten Deli Serdang',
  ],
  'Sumatera Barat': [
    'Kota Padang',
    'Kota Bukittinggi',
  ],
  'Riau': [
    'Kota Pekanbaru',
    'Kota Dumai',
  ],
  'Sulawesi Selatan': [
    'Kota Makassar',
    'Kota Parepare',
    'Kota Palopo',
  ],
};

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create or update Default Admin User
  const passwordHash = await bcrypt.hash('WardellAdmin2026!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@wardell.tech' },
    update: {},
    create: {
      email: 'admin@wardell.tech',
      name: 'Wardell Lead Engine Administrator',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin user ready: ${adminUser.email} (Password: WardellAdmin2026!)`);

  // 2. Save Indonesian Location reference to AppConfig
  await prisma.appConfig.upsert({
    where: { key: 'INDONESIA_LOCATIONS' },
    update: { value: JSON.stringify(INDONESIA_LOCATIONS) },
    create: {
      key: 'INDONESIA_LOCATIONS',
      value: JSON.stringify(INDONESIA_LOCATIONS),
    },
  });
  console.log('✅ Indonesian location dataset seeded');

  // 3. Create Sample Starter Campaign
  const sampleCampaign = await prisma.campaign.upsert({
    where: { id: 'c0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'Digitalisasi Bisnis & Website UMKM Jawa Barat',
      description: 'Kampanye penawaran pembuatan website profil perusahaan, aplikasi web custom, dan sistem dashboard internal untuk bisnis di Jawa Barat & Jakarta.',
      targetProvince: 'Jawa Barat',
      targetCity: 'Kota Bandung',
      businessCategory: 'Software House, Konsultan Bisnis, Hotel & Resto, Pabrik & Manufaktur',
      serviceOffering: 'Pembuatan Website Profil Perusahaan Modern, Aplikasi Web Custom, Digitalisasi Alur Operasional, Dashboard Internal',
      status: CampaignStatus.ACTIVE,
      dailySendLimit: 25,
      discoverySettings: {
        maxResults: 50,
        requireWebsite: false,
        searchKeywords: ['jasa', 'konsultan', 'distributor', 'kantor', 'klinik', 'manufaktur'],
      },
      scheduleSettings: {
        cronExpression: '0 9 * * 1-5', // Every Mon-Fri at 09:00 WIB
        enabled: false,
        timezone: 'Asia/Jakarta',
      },
    },
  });
  console.log(`✅ Starter campaign created: "${sampleCampaign.name}"`);

  // 4. Default suppression entries
  await prisma.suppressionEntry.upsert({
    where: { normalizedEmail: 'optout@example.com' },
    update: {},
    create: {
      normalizedEmail: 'optout@example.com',
      reason: 'SYSTEM_DEFAULT',
      source: 'SEED',
    },
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
