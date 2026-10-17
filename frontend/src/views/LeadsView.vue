<template>
  <div class="leads-view fade-in">
    <!-- View Header -->
    <div class="view-header">
      <div>
        <h1 class="page-title">🎯 Prospect Discovery & Client Reachout Hub</h1>
        <p class="page-subtitle">
          Temukan calon klien bisnis & instansi real-time dari Google Maps untuk cold call, WhatsApp, dan outreach otomatis.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="exportData('csv')">
          📄 Export CSV
        </button>
        <button class="btn btn-emerald" @click="exportData('xlsx')">
          📊 Export Excel {{ filters.province ? '(' + filters.province + ')' : '(.xlsx)' }}
        </button>
      </div>
    </div>

    <!-- Prospect Discovery & Search Engine Card -->
    <div class="glass-panel prospect-search-card">
      <div class="prospect-search-header">
        <div class="header-badge-title">
          <span class="pulse-dot"></span>
          <span class="badge-text">GOOGLE MAPS LEAD ENGINE</span>
          <span class="card-headline">Mesin Pencari Calon Klien</span>
        </div>
        <div class="status-summary-tag" v-if="isScraping">
          <span class="spinner-small"></span>
          <span>Sedang Mengekstrak Prospek...</span>
        </div>
      </div>

      <form class="prospect-form" @submit.prevent="runGmapsScraper">
        <!-- 1. Primary Hero Search Omnibar -->
        <div class="search-omnibar-group">
          <label class="omnibar-label">
            <span>🎯 SIAPA CALON KLIEN YANG INGIN ANDA JANGKAU?</span>
            <span class="text-xs text-dim">Ketik jenis bisnis, profesi, atau kata kunci target klien Anda</span>
          </label>
          <div class="search-omnibar">
            <span class="omnibar-icon">🔍</span>
            <input
              v-model="targetCategory"
              class="omnibar-input"
              placeholder="Ketik target klien (misal: Klinik Kecantikan, Software House, Hotel Bintang, Kontraktor, Pabrik...)"
              :disabled="isScraping"
            />
            <button
              v-if="targetCategory"
              type="button"
              class="omnibar-clear"
              @click="targetCategory = ''"
              title="Bersihkan input"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 2. Location & Limit Parameter Controls -->
        <div class="search-parameters-row">
          <!-- Wilayah / Provinsi -->
          <div class="param-item">
            <label class="param-label">📍 WILAYAH / PROVINSI</label>
            <select v-model="targetProvince" class="form-select param-select" :disabled="isScraping">
              <option value="">🌐 Seluruh Indonesia (Fleksibel)</option>
              <option v-for="prov in INDONESIAN_PROVINCES" :key="'p-' + prov" :value="prov">
                {{ prov }}
              </option>
            </select>
          </div>

          <!-- Kota / Kabupaten -->
          <div class="param-item">
            <label class="param-label">🏙️ KOTA / KABUPATEN (OPSIONAL)</label>
            <input
              v-model="targetCity"
              class="form-input param-input"
              placeholder="Semua kota (atau ketik: Bandung, Surabaya...)"
              :disabled="isScraping"
            />
          </div>

          <!-- Target Jumlah Data -->
          <div class="param-item limit-item">
            <label class="param-label">🎯 JUMLAH PROSPEK</label>
            <div class="limit-chips">
              <button
                type="button"
                v-for="l in [10, 20, 30, 50]"
                :key="l"
                :class="['limit-chip', { active: scrapeLimit === l }]"
                @click="scrapeLimit = l"
                :disabled="isScraping"
              >
                {{ l }} Data
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="param-item submit-item">
            <label class="param-label">&nbsp;</label>
            <button
              type="submit"
              class="btn btn-primary prospect-search-btn"
              :disabled="isScraping || (!targetCategory.trim() && !targetProvince)"
            >
              <span v-if="isScraping" class="spinner-small"></span>
              <span>{{ isScraping ? 'Mencari...' : '🚀 Cari Calon Klien' }}</span>
            </button>
          </div>
        </div>
      </form>

      <!-- 3. Categorized Niche Inspiration Bar (Client Reachout Ideas) -->
      <div class="niche-inspiration-section">
        <div class="niche-header">
          <span class="niche-title">💡 Inspirasi Target Klien untuk Reachout:</span>
          <div class="niche-tabs">
            <button
              type="button"
              v-for="tab in nicheTabs"
              :key="tab.id"
              :class="['niche-tab-btn', { active: activeNicheTab === tab.id }]"
              @click="activeNicheTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
        <div class="niche-pills">
          <button
            type="button"
            v-for="idea in visibleNiches"
            :key="idea.label"
            :class="['niche-pill', { selected: targetCategory === idea.category }]"
            @click="selectNiche(idea.category)"
            :disabled="isScraping"
          >
            <span>{{ idea.icon }}</span>
            <span>{{ idea.label }}</span>
          </button>
        </div>
      </div>

      <!-- 4. Transparency Live Search Preview -->
      <div class="search-preview-bar">
        <div v-if="targetCategory || targetProvince" class="preview-active">
          <span class="preview-badge">TARGET PROSPEK</span>
          <span class="preview-text">
            {{ searchQueryPreview }}
          </span>
        </div>
        <div v-else class="preview-idle">
          <span>💡</span>
          <span>Ketik jenis bisnis atau klik salah satu inspirasi industri di atas untuk memulai pencarian prospek.</span>
        </div>
      </div>

      <!-- Scrape Status Banner -->
      <div v-if="scrapeMessage" :class="['scrape-alert', scrapeSuccess ? 'alert-success' : 'alert-error']">
        <div class="alert-content">
          <span>{{ scrapeSuccess ? '✅' : '⚠️' }}</span>
          <span>{{ scrapeMessage }}</span>
        </div>
        <button class="alert-close" @click="scrapeMessage = ''">×</button>
      </div>
    </div>

    <!-- KPI / Screening Stat Chips -->
    <div class="stats-row">
      <div class="stat-pill" @click="clearStatusFilter">
        <span class="pill-label">Total Data</span>
        <span class="pill-value font-mono">{{ pagination.total }}</span>
      </div>
      <div class="stat-pill" @click="setStatusFilter('BELUM_DIHUBUNGI')">
        <span class="pill-label">⏳ Belum Dihubungi</span>
        <span class="pill-value text-amber font-mono">{{ countByStatus('BELUM_DIHUBUNGI') }}</span>
      </div>
      <div class="stat-pill" @click="setStatusFilter('TERTARIK')">
        <span class="pill-label">🎯 Tertarik / Prospek</span>
        <span class="pill-value text-emerald font-mono">{{ countByStatus('TERTARIK') }}</span>
      </div>
      <div class="stat-pill" @click="setStatusFilter('FOLLOW_UP')">
        <span class="pill-label">📞 Follow Up</span>
        <span class="pill-value text-cyan font-mono">{{ countByStatus('FOLLOW_UP') }}</span>
      </div>
      <div class="stat-pill" @click="setStatusFilter('TIDAK_DIANGKAT')">
        <span class="pill-label">📵 Tidak Diangkat</span>
        <span class="pill-value text-dim font-mono">{{ countByStatus('TIDAK_DIANGKAT') }}</span>
      </div>
    </div>

    <!-- Filters & Bulk Screening Actions Bar -->
    <div class="glass-panel filter-panel">
      <div class="filter-controls">
        <div class="search-box">
          <label>Cari Instansi, Telp, atau Alamat</label>
          <input
            v-model="filters.search"
            class="form-input"
            placeholder="Ketik nama instansi, nomor telepon, atau kota..."
            @input="debouncedFetch"
          />
        </div>

        <div>
          <label>Filter Provinsi</label>
          <select v-model="filters.province" class="form-select" @change="fetchLeads">
            <option value="">Semua Provinsi (Seluruh Indonesia)</option>
            <option v-for="prov in INDONESIAN_PROVINCES" :key="'f-' + prov" :value="prov">
              {{ prov }}
            </option>
          </select>
        </div>

        <div>
          <label>Filter Kota / Wilayah</label>
          <input
            v-model="filters.city"
            class="form-input"
            placeholder="e.g. Bandung, Jakarta"
            @change="fetchLeads"
          />
        </div>

        <div>
          <label>Status Cold Call</label>
          <select v-model="filters.coldCallStatus" class="form-select" @change="fetchLeads">
            <option value="">Semua Status</option>
            <option value="BELUM_DIHUBUNGI">⏳ Belum Dihubungi</option>
            <option value="TERTARIK">🎯 Tertarik / Prospek</option>
            <option value="FOLLOW_UP">📞 Follow Up</option>
            <option value="TIDAK_DIANGKAT">📵 Tidak Diangkat / Sibuk</option>
            <option value="NOMOR_SALAH">❌ Nomor Salah / Tutup</option>
            <option value="BUKAN_TARGET">🚫 Bukan Target</option>
          </select>
        </div>
      </div>

      <!-- Bulk Actions when selected -->
      <div v-if="selectedIds.length > 0" class="bulk-action-bar">
        <div class="bulk-info">
          <span>Terpilih: <strong>{{ selectedIds.length }}</strong> data</span>
        </div>
        <div class="bulk-buttons">
          <button class="btn btn-danger btn-sm" @click="confirmBulkDelete">
            🗑️ Hapus yang Dipilih (Screening)
          </button>
        </div>
      </div>
    </div>

    <!-- Leads & Screening Table -->
    <div class="glass-panel card-section">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th>Nama Instansi / Perusahaan</th>
              <th>📞 Nomor Telepon (Cold Call)</th>
              <th>Status Cold Call</th>
              <th>Catatan Screening / Telepon</th>
              <th>Provinsi & Kota</th>
              <th>Rating ⭐</th>
              <th style="text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id" :class="{ 'row-selected': selectedIds.includes(lead.id) }">
              <!-- Checkbox -->
              <td style="text-align: center;">
                <input
                  type="checkbox"
                  :value="lead.id"
                  v-model="selectedIds"
                />
              </td>

              <!-- Nama Instansi & Alamat -->
              <td>
                <div class="font-bold text-white lead-name">{{ lead.businessName }}</div>
                <div v-if="lead.businessAddress" class="text-xs text-dim address-text" :title="lead.businessAddress">
                  📍 {{ lead.businessAddress }}
                </div>
                <div class="links-row">
                  <span class="badge badge-category">{{ lead.businessCategory }}</span>
                  <a v-if="lead.mapsUrl" :href="lead.mapsUrl" target="_blank" class="mini-link text-cyan">
                    🗺️ Google Maps ↗
                  </a>
                  <a v-if="lead.websiteUrl" :href="lead.websiteUrl" target="_blank" class="mini-link text-emerald">
                    🌐 Website ↗
                  </a>
                </div>
              </td>

              <!-- Nomor Telepon (The most critical field) -->
              <td>
                <div v-if="lead.phone" class="phone-action-container">
                  <div class="phone-box">
                    <a :href="'tel:' + lead.phone" class="phone-link" title="Panggil via Telepon">
                      📞 {{ lead.phone }}
                    </a>
                    <button class="copy-btn" @click="copyPhone(lead.phone)" title="Salin nomor telepon">
                      📋
                    </button>
                  </div>
                  <!-- Direct WhatsApp button if mobile number -->
                  <a
                    v-if="getWhatsAppUrl(lead.phone, lead.businessName)"
                    :href="getWhatsAppUrl(lead.phone, lead.businessName)!"
                    target="_blank"
                    class="wa-btn"
                    title="Buka Chat WhatsApp untuk Outreach"
                  >
                    💬 WhatsApp
                  </a>
                </div>
                <div v-else class="text-dim text-xs">
                  <span class="badge badge-slate">Tidak ada telp</span>
                </div>
              </td>

              <!-- Status Cold Call (Dropdown inline) -->
              <td>
                <select
                  class="status-dropdown"
                  :value="lead.coldCallStatus || 'BELUM_DIHUBUNGI'"
                  @change="(e) => handleStatusChange(lead.id, (e.target as HTMLSelectElement).value)"
                >
                  <option value="BELUM_DIHUBUNGI">⏳ Belum Dihubungi</option>
                  <option value="TERTARIK">🎯 Tertarik</option>
                  <option value="FOLLOW_UP">📞 Follow Up</option>
                  <option value="TIDAK_DIANGKAT">📵 Tidak Diangkat</option>
                  <option value="NOMOR_SALAH">❌ Nomor Salah</option>
                  <option value="BUKAN_TARGET">🚫 Bukan Target</option>
                </select>
              </td>

              <!-- Catatan Cold Call (Inline editing) -->
              <td>
                <div class="note-input-wrapper">
                  <input
                    class="note-inline-input"
                    :value="lead.coldCallNotes || ''"
                    placeholder="Tulis hasil telp..."
                    @blur="(e) => handleNoteBlur(lead.id, (e.target as HTMLInputElement).value)"
                    @keydown.enter="(e) => (e.target as HTMLInputElement).blur()"
                  />
                </div>
              </td>

              <!-- Provinsi & Kota -->
              <td>
                <div class="text-white font-semibold text-xs">{{ lead.province }}</div>
                <div class="text-xs text-dim">{{ lead.city }}</div>
              </td>

              <!-- Rating & Reviews -->
              <td>
                <div v-if="lead.rating" class="rating-display">
                  <span class="rating-val font-mono">⭐ {{ lead.rating }}</span>
                  <span v-if="lead.reviewCount" class="text-dim text-xs">({{ lead.reviewCount }})</span>
                </div>
                <div v-else class="text-dim text-xs">-</div>
              </td>

              <!-- Actions -->
              <td style="text-align: right;">
                <button
                  class="btn-icon-danger"
                  @click="deleteSingleLead(lead.id, lead.businessName)"
                  title="Hapus dari screening"
                >
                  🗑️
                </button>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="!leads.length && !loading">
              <td colspan="8" class="text-center py-12 text-dim">
                <div class="empty-box">
                  <div class="empty-icon">🗺️</div>
                  <div class="empty-text">Belum ada data untuk filter saat ini.</div>
                  <div class="empty-sub">Pilih Provinsi di panel atas dan klik "Mulai Scraping" untuk menarik data Google Maps.</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination-footer">
        <span class="text-sm text-dim">
          Menampilkan halaman <strong>{{ pagination.page }}</strong> dari <strong>{{ pagination.totalPages }}</strong> (Total: {{ pagination.total }} data)
        </span>
        <div class="btn-group">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
          >
            ← Sebelumnya
          </button>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
          >
            Berikutnya →
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Toast Notification for Copy / Feedback -->
    <transition name="toast-fade">
      <div v-if="toastMessage" class="floating-toast">
        <span class="toast-icon">📋</span>
        <span class="toast-text">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { api } from '@/api/client';
import { INDONESIAN_PROVINCES } from '@/constants/provinces';
import type { LeadDTO } from '@wardell/shared';

const leads = ref<LeadDTO[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 });
const loading = ref(false);

// Scraper state with clean default state for outreach
const targetProvince = ref('');
const targetCategory = ref('');
const targetCity = ref('');
const scrapeLimit = ref(20);
const isScraping = ref(false);
const scrapeMessage = ref('');
const scrapeSuccess = ref(true);

// Toast notification for user actions & feedback
const toastMessage = ref('');
let toastTimeout: any = null;
const showToast = (msg: string) => {
  toastMessage.value = msg;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
};

// Niche inspiration categories for client outreach
const activeNicheTab = ref('all');
const nicheTabs = [
  { id: 'all', label: 'Semua Bidang' },
  { id: 'b2b', label: '💼 B2B & Tech' },
  { id: 'health', label: '🏥 Medis & Klinik' },
  { id: 'hospitality', label: '☕ F&B & Hotel' },
  { id: 'service', label: '⚖️ Jasa Profesional' },
  { id: 'gov', label: '🏛️ Instansi Publik' },
];

interface NicheIdea {
  label: string;
  category: string;
  group: 'b2b' | 'health' | 'hospitality' | 'service' | 'gov';
  icon: string;
}

const nicheIdeas: NicheIdea[] = [
  // B2B & Tech
  { label: 'Software House', category: 'Software House IT Konsultan', group: 'b2b', icon: '💻' },
  { label: 'Agensi Marketing', category: 'Digital Marketing Agency', group: 'b2b', icon: '🚀' },
  { label: 'Distributor / Supplier', category: 'Distributor Supplier', group: 'b2b', icon: '📦' },
  { label: 'Kontraktor Bangunan', category: 'Kontraktor & Konstruksi', group: 'b2b', icon: '🏗️' },
  { label: 'Pabrik & Manufaktur', category: 'Pabrik Manufaktur', group: 'b2b', icon: '🏭' },

  // Kesehatan & Klinik
  { label: 'Klinik Kecantikan', category: 'Klinik Kecantikan & Estetika', group: 'health', icon: '✨' },
  { label: 'Klinik Gigi', category: 'Klinik Gigi Dental Care', group: 'health', icon: '🦷' },
  { label: 'Rumah Sakit Swasta', category: 'Rumah Sakit Swasta', group: 'health', icon: '🏥' },

  // Hospitality & F&B
  { label: 'Hotel Bintang', category: 'Hotel Bintang', group: 'hospitality', icon: '🏨' },
  { label: 'Restoran & Cafe', category: 'Restoran & Cafe', group: 'hospitality', icon: '☕' },
  { label: 'Catering Service', category: 'Catering Service', group: 'hospitality', icon: '🍱' },

  // Jasa Profesional
  { label: 'Kantor Notaris', category: 'Kantor Notaris & PPAT', group: 'service', icon: '⚖️' },
  { label: 'Konsultan Pajak', category: 'Konsultan Pajak & Keuangan', group: 'service', icon: '📊' },
  { label: 'Arsitek & Interior', category: 'Arsitek Desain Interior', group: 'service', icon: '📐' },

  // Instansi & Pendidikan
  { label: 'Sekolah Swasta', category: 'Sekolah Swasta International School', group: 'gov', icon: '🎓' },
  { label: 'Dinas Pendidikan', category: 'Dinas Pendidikan', group: 'gov', icon: '🏛️' },
  { label: 'Dinas Kesehatan', category: 'Dinas Kesehatan', group: 'gov', icon: '🏥' },
  { label: 'Kantor Dinas Pemda', category: 'Kantor Dinas Pemerintah', group: 'gov', icon: '🏛️' },
];

const visibleNiches = computed(() => {
  if (activeNicheTab.value === 'all') return nicheIdeas;
  return nicheIdeas.filter((n) => n.group === activeNicheTab.value);
});

const selectNiche = (category: string) => {
  targetCategory.value = category;
  showToast(`Kategori "${category}" dipilih`);
};

const searchQueryPreview = computed(() => {
  const cat = targetCategory.value.trim();
  const prov = targetProvince.value;
  const city = targetCity.value.trim();

  if (!cat && !prov && !city) {
    return '';
  }

  const parts: string[] = [];
  if (cat) {
    parts.push(`"${cat}"`);
  } else {
    parts.push('Perusahaan & Bisnis');
  }

  if (city && prov) {
    parts.push(`di ${city}, ${prov}`);
  } else if (city) {
    parts.push(`di ${city}`);
  } else if (prov) {
    parts.push(`di ${prov}`);
  } else {
    parts.push('(Seluruh Indonesia)');
  }

  return `Pencarian: ${parts.join(' ')} • Target: ${scrapeLimit.value} data prospek`;
});

const getWhatsAppUrl = (phone: string | null | undefined, businessName: string) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9]/g, '');
  let waNumber = '';
  if (cleaned.startsWith('08')) {
    waNumber = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('628')) {
    waNumber = cleaned;
  } else if (cleaned.startsWith('8')) {
    waNumber = '62' + cleaned;
  }
  if (!waNumber || waNumber.length < 10) return null;
  const greeting = encodeURIComponent(`Halo ${businessName}, perkenalkan saya ingin menanyakan terkait penawaran & kerja sama...`);
  return `https://wa.me/${waNumber}?text=${greeting}`;
};

// Selection state
const selectedIds = ref<string[]>([]);

// Filter state
const filters = ref({
  search: '',
  province: '',
  city: '',
  coldCallStatus: '',
});

const isAllSelected = computed(() => {
  return leads.value.length > 0 && selectedIds.value.length === leads.value.length;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = leads.value.map((l) => l.id);
  }
};

const countByStatus = (status: string) => {
  return leads.value.filter((l) => (l.coldCallStatus || 'BELUM_DIHUBUNGI') === status).length;
};

const clearStatusFilter = () => {
  filters.value.coldCallStatus = '';
  fetchLeads();
};

const setStatusFilter = (status: string) => {
  filters.value.coldCallStatus = status;
  fetchLeads();
};

let debounceTimer: any = null;
const debouncedFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pagination.value.page = 1;
    fetchLeads();
  }, 300);
};

const fetchLeads = async () => {
  loading.value = true;
  try {
    const res = await api.getLeads({
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: filters.value.search || undefined,
      province: filters.value.province || undefined,
      city: filters.value.city || undefined,
      coldCallStatus: filters.value.coldCallStatus || undefined,
    });
    leads.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    console.error('Failed to fetch leads', err);
  } finally {
    loading.value = false;
  }
};

const changePage = (newPage: number) => {
  pagination.value.page = newPage;
  selectedIds.value = [];
  fetchLeads();
};

let pollTimer: any = null;

const startStatusPolling = () => {
  stopStatusPolling();
  pollTimer = setInterval(async () => {
    try {
      const res = await api.getScrapeStatus();
      if (res.data) {
        const status = res.data;
        if (status.isRunning) {
          isScraping.value = true;
          scrapeMessage.value = status.progressMessage || 'Sedang mengekstrak data dari Google Maps... (Aman di-refresh, proses tetap berjalan)';
        } else {
          stopStatusPolling();
          isScraping.value = false;
          if (status.lastResult) {
            scrapeSuccess.value = status.lastResult.success;
            scrapeMessage.value = status.lastResult.message;
            if (status.lastResult.success) {
              pagination.value.page = 1;
              fetchLeads();
            }
          }
        }
      }
    } catch {
      // Continue polling silently
    }
  }, 2000);
};

const stopStatusPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const runGmapsScraper = async () => {
  if (isScraping.value) return;

  isScraping.value = true;
  scrapeMessage.value = 'Mempersiapkan proses scraping Google Maps...';
  scrapeSuccess.value = true;

  // Start polling immediately so page refresh or status update stays seamless
  startStatusPolling();

  try {
    const res = await api.scrapeGmaps({
      province: targetProvince.value || undefined,
      category: targetCategory.value || undefined,
      city: targetCity.value || undefined,
      limit: scrapeLimit.value,
    });

    if ((res as any).isRunning) {
      scrapeMessage.value = res.message || 'Scraping sedang berjalan di latar belakang...';
    } else {
      scrapeSuccess.value = true;
      scrapeMessage.value = res.message || `Berhasil menarik ${res.data?.length || 0} data dari Google Maps!`;
      
      // Reset to page 1 so the newest scraped entries immediately appear at the very top
      pagination.value.page = 1;
      filters.value.search = '';
      filters.value.coldCallStatus = '';
      
      // Automatically filter to this province to inspect new results
      if (targetProvince.value) {
        filters.value.province = targetProvince.value;
      }
      await fetchLeads();
    }
  } catch (err: any) {
    scrapeSuccess.value = false;
    scrapeMessage.value = err.message || 'Gagal melakukan scraping Google Maps. Pastikan Chrome terinstall.';
    stopStatusPolling();
    isScraping.value = false;
  }
};

const handleStatusChange = async (leadId: string, status: string) => {
  try {
    await api.updateScreening(leadId, { coldCallStatus: status });
    const target = leads.value.find((l) => l.id === leadId);
    if (target) target.coldCallStatus = status;
  } catch (err) {
    console.error('Failed to update screening status', err);
  }
};

const handleNoteBlur = async (leadId: string, notes: string) => {
  try {
    await api.updateScreening(leadId, { coldCallNotes: notes });
    const target = leads.value.find((l) => l.id === leadId);
    if (target) target.coldCallNotes = notes;
  } catch (err) {
    console.error('Failed to save notes', err);
  }
};

const deleteSingleLead = async (leadId: string, name: string) => {
  if (!confirm(`Hapus "${name}" dari daftar screening?`)) return;
  try {
    await api.deleteLead(leadId);
    leads.value = leads.value.filter((l) => l.id !== leadId);
    selectedIds.value = selectedIds.value.filter((id) => id !== leadId);
    pagination.value.total = Math.max(0, pagination.value.total - 1);
  } catch (err) {
    console.error('Failed to delete lead', err);
  }
};

const confirmBulkDelete = async () => {
  if (!confirm(`Hapus ${selectedIds.value.length} data yang dipilih dari screening?`)) return;
  try {
    await api.bulkDeleteLeads(selectedIds.value);
    leads.value = leads.value.filter((l) => !selectedIds.value.includes(l.id));
    selectedIds.value = [];
    await fetchLeads();
  } catch (err) {
    console.error('Failed bulk delete', err);
  }
};

const copyPhone = async (phone: string) => {
  try {
    await navigator.clipboard.writeText(phone);
    showToast(`Nomor telepon ${phone} berhasil disalin!`);
  } catch {
    showToast(`Nomor telepon: ${phone}`);
  }
};

const exportData = async (format: 'xlsx' | 'csv') => {
  await api.downloadExport(format, {
    search: filters.value.search,
    province: filters.value.province,
    city: filters.value.city,
    coldCallStatus: filters.value.coldCallStatus,
  });
};

onMounted(async () => {
  fetchLeads();

  // Restore active background scraping state if page was refreshed during scraping
  try {
    const res = await api.getScrapeStatus();
    if (res.data?.isRunning) {
      isScraping.value = true;
      scrapeMessage.value = res.data.progressMessage || 'Melanjutkan pantauan scraping dari latar belakang... (Aman di-refresh)';
      startStatusPolling();
    }
  } catch {
    // Ignore error on initial status check
  }
});

onUnmounted(() => {
  stopStatusPolling();
});
</script>

<style scoped>
.leads-view {
  padding-bottom: 40px;
}
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-title {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}
.page-subtitle {
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 4px;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.btn-emerald {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}
.btn-emerald:hover {
  background: linear-gradient(135deg, #059669, #047857);
}

/* Prospect Search Card & Command Center */
.prospect-search-card {
  padding: 24px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 1px solid rgba(56, 189, 248, 0.28);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 36px -10px rgba(0, 0, 0, 0.6), 0 0 25px rgba(14, 165, 233, 0.08);
  margin-bottom: 24px;
}

.prospect-search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.header-badge-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--accent-cyan);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--accent-cyan);
  animation: pulseGlow 2s infinite;
}

@keyframes pulseGlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.badge-text {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: var(--accent-cyan);
  background: rgba(14, 165, 233, 0.12);
  border: 1px solid rgba(14, 165, 233, 0.3);
  padding: 3px 8px;
  border-radius: 6px;
}

.card-headline {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.3px;
}

.status-summary-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid rgba(14, 165, 233, 0.35);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

/* 1. Primary Hero Search Omnibar */
.search-omnibar-group {
  margin-bottom: 16px;
}

.omnibar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.search-omnibar {
  position: relative;
  display: flex;
  align-items: center;
}

.omnibar-icon {
  position: absolute;
  left: 16px;
  font-size: 18px;
  pointer-events: none;
  opacity: 0.8;
}

.omnibar-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.95);
  border: 1.5px solid rgba(56, 189, 248, 0.3);
  border-radius: var(--radius-md);
  padding: 14px 44px 14px 48px;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  outline: none;
  transition: all 0.25s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.omnibar-input:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 20px rgba(14, 165, 233, 0.35), 0 4px 16px rgba(0, 0, 0, 0.4);
  background: rgba(15, 23, 42, 1);
}

.omnibar-clear {
  position: absolute;
  right: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--text-muted);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.omnibar-clear:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #fff;
}

/* 2. Parameter Controls Row */
.search-parameters-row {
  display: grid;
  grid-template-columns: 1.4fr 1.3fr 1.5fr 1.2fr;
  gap: 14px;
  align-items: flex-end;
  margin-bottom: 16px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.param-select {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid var(--border-card);
  color: #38bdf8;
  font-weight: 600;
  height: 42px;
}

.param-input {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid var(--border-card);
  height: 42px;
}

.limit-chips {
  display: flex;
  gap: 6px;
  background: rgba(15, 23, 42, 0.7);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-card);
  height: 42px;
  align-items: center;
}

.limit-chip {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.limit-chip:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.limit-chip.active {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(2, 132, 199, 0.3));
  border: 1px solid var(--accent-cyan);
  color: #fff;
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.2);
}

.prospect-search-btn {
  height: 42px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

/* 3. Niche Inspiration Section */
.niche-inspiration-section {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 14px;
}

.niche-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.niche-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
}

.niche-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.niche-tab-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.niche-tab-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.niche-tab-btn.active {
  background: rgba(14, 165, 233, 0.15);
  border-color: rgba(14, 165, 233, 0.3);
  color: var(--accent-cyan);
  font-weight: 700;
}

.niche-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.niche-pill {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.niche-pill:hover {
  background: rgba(14, 165, 233, 0.18);
  border-color: var(--accent-cyan);
  color: #fff;
  transform: translateY(-1px);
}

.niche-pill.selected {
  background: rgba(14, 165, 233, 0.25);
  border-color: var(--accent-cyan);
  color: #38bdf8;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.2);
}

/* 4. Live Search Preview Bar */
.search-preview-bar {
  background: rgba(15, 23, 42, 0.7);
  border: 1px dashed rgba(56, 189, 248, 0.25);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
}

.preview-active {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.preview-text {
  color: #e2e8f0;
  font-weight: 600;
}

.preview-idle {
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 6px;
}

.scrape-alert {
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.alert-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}
.alert-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}
.alert-content {
  display: flex;
  gap: 8px;
  align-items: center;
}
.alert-close {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.stat-pill {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid var(--border-card);
  padding: 10px 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.stat-pill:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(255, 255, 255, 0.2);
}
.pill-label {
  font-size: 12px;
  color: var(--text-muted);
}
.pill-value {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

/* Filters & Bulk */
.filter-panel {
  padding: 16px 20px;
  margin-bottom: 20px;
}
.filter-controls {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.2fr 1.2fr;
  gap: 16px;
}
.filter-controls label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.bulk-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-card);
  background: rgba(239, 68, 68, 0.08);
  padding: 10px 14px;
  border-radius: 8px;
}
.bulk-info {
  font-size: 13px;
  color: #fff;
}
.btn-danger {
  background: #ef4444;
  color: #fff;
}
.btn-danger:hover {
  background: #dc2626;
}

/* Table */
.card-section {
  padding: 20px;
}
.row-selected {
  background: rgba(14, 165, 233, 0.06);
}
.lead-name {
  font-size: 14px;
  margin-bottom: 2px;
}
.address-text {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.links-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.mini-link {
  font-size: 11px;
  text-decoration: none;
}
.mini-link:hover {
  text-decoration: underline;
}

/* Phone box */
.phone-box {
  display: flex;
  align-items: center;
  gap: 6px;
}
.phone-link {
  color: #38bdf8;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  text-decoration: none;
  background: rgba(56, 189, 248, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.2);
  transition: all 0.2s;
}
.phone-link:hover {
  background: rgba(56, 189, 248, 0.25);
  color: #fff;
}
.copy-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.copy-btn:hover {
  opacity: 1;
}

/* Phone & WhatsApp outreach container */
.phone-action-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  text-decoration: none;
  width: fit-content;
  transition: all 0.2s;
}

.wa-btn:hover {
  background: rgba(34, 197, 94, 0.25);
  color: #fff;
  border-color: #4ade80;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
}

/* Floating Toast Notification */
.floating-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1e293b;
  color: #fff;
  padding: 12px 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--accent-cyan);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(14, 165, 233, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  z-index: 9999;
}

.toast-fade-enter-active, .toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translateY(15px);
}

/* Status Dropdown */
.status-dropdown {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid var(--border-card);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}
.status-dropdown:focus {
  border-color: var(--accent-cyan);
}

/* Note input */
.note-input-wrapper {
  max-width: 220px;
}
.note-inline-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid transparent;
  color: #e2e8f0;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}
.note-inline-input:hover {
  border-color: rgba(255, 255, 255, 0.15);
}
.note-inline-input:focus {
  background: rgba(15, 23, 42, 1);
  border-color: var(--accent-cyan);
}

/* Badges */
.badge-category {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  font-size: 10px;
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Ratings */
.rating-display {
  display: flex;
  align-items: center;
  gap: 4px;
}
.rating-val {
  color: #fbbf24;
  font-weight: 700;
  font-size: 12px;
}

/* Action button */
.btn-icon-danger {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.5;
  transition: all 0.2s;
}
.btn-icon-danger:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Empty state */
.empty-box {
  padding: 30px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-icon {
  font-size: 36px;
}
.empty-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
.empty-sub {
  font-size: 13px;
  color: var(--text-dim);
}

/* Pagination */
.pagination-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-card);
}
.btn-group {
  display: flex;
  gap: 8px;
}
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.text-white { color: #fff; }
.text-dim { color: var(--text-dim); }
.text-cyan { color: var(--accent-cyan); }
.text-emerald { color: var(--accent-emerald); }
.text-amber { color: var(--accent-amber); }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-mono { font-family: 'JetBrains Mono', monospace; }
</style>
