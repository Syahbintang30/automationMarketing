<template>
  <div class="leads-view fade-in">
    <!-- View Header -->
    <div class="view-header">
      <div>
        <h1 class="page-title">🗺️ Google Maps Scraper & Cold Call Hub</h1>
        <p class="page-subtitle">
          Scraping data instansi pemerintah & perusahaan real-time <strong>per provinsi</strong> dari Google Maps, screening data, dan export langsung ke Excel (.xlsx).
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

    <!-- Scraper Panel (Top Card) with Explicit Province Selection -->
    <div class="glass-panel scraper-panel">
      <div class="scraper-header">
        <div class="scraper-title">
          <span class="scraper-badge">LIVE GOOGLE MAPS</span>
          <h3>Tarik Data Baru per Provinsi</h3>
        </div>
        <div class="quick-presets">
          <span class="text-xs text-dim">Contoh Cepat:</span>
          <button class="preset-chip" @click="setPreset('Jawa Barat', 'Dinas Kesehatan')">📍 Jabar - Dinas Kesehatan</button>
          <button class="preset-chip" @click="setPreset('DKI Jakarta', 'Rumah Sakit')">📍 Jakarta - Rumah Sakit</button>
          <button class="preset-chip" @click="setPreset('Jawa Barat', 'Dinas Perhubungan', 'Bandung')">📍 Bandung - Dishub</button>
          <button class="preset-chip" @click="setPreset('Jawa Timur', 'PT Manufaktur')">📍 Jatim - Manufaktur</button>
          <button class="preset-chip" @click="setPreset('Banten', 'Pabrik Industri', 'Cilegon')">📍 Banten - Pabrik</button>
        </div>
      </div>

      <form class="scraper-form-grid" @submit.prevent="runGmapsScraper">
        <!-- 1. Dropdown Provinsi -->
        <div class="form-group">
          <label class="form-label">📍 PROVINSI TARGET</label>
          <select v-model="targetProvince" class="form-select province-select" :disabled="isScraping">
            <option value="">-- Pilih Provinsi --</option>
            <option v-for="prov in INDONESIAN_PROVINCES" :key="prov" :value="prov">
              {{ prov }}
            </option>
          </select>
        </div>

        <!-- 2. Kategori / Instansi / Bisnis -->
        <div class="form-group flex-2">
          <label class="form-label">🏢 KATEGORI / INSTANSI / PERUSAHAAN</label>
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              v-model="targetCategory"
              class="scrape-input"
              placeholder="Contoh: Dinas Kesehatan, Dinas Pendidikan, PT Kontraktor, Rumah Sakit..."
              :disabled="isScraping"
            />
          </div>
        </div>

        <!-- 3. Kota / Kabupaten (Opsional) -->
        <div class="form-group">
          <label class="form-label">🏙️ KOTA / KAB (OPSIONAL)</label>
          <input
            v-model="targetCity"
            class="form-input"
            placeholder="Semua kota di provinsi ini"
            :disabled="isScraping"
          />
        </div>

        <!-- 4. Limit Selector -->
        <div class="form-group limit-group">
          <label class="form-label">🎯 JUMLAH DATA</label>
          <select v-model="scrapeLimit" class="form-select" :disabled="isScraping">
            <option :value="10">10 Data</option>
            <option :value="20">20 Data</option>
            <option :value="30">30 Data</option>
            <option :value="50">50 Data</option>
          </select>
        </div>

        <!-- Submit Button -->
        <div class="form-group submit-group">
          <label class="form-label">&nbsp;</label>
          <button
            type="submit"
            class="btn btn-primary scrape-submit-btn"
            :disabled="isScraping || (!targetCategory.trim() && !targetProvince)"
          >
            <span v-if="isScraping" class="spinner-small"></span>
            <span>{{ isScraping ? 'Mengekstrak...' : '🚀 Mulai Scraping' }}</span>
          </button>
        </div>
      </form>

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
                <div v-if="lead.phone" class="phone-box">
                  <a :href="'tel:' + lead.phone" class="phone-link">
                    📞 {{ lead.phone }}
                  </a>
                  <button class="copy-btn" @click="copyPhone(lead.phone)" title="Salin nomor telepon">
                    📋
                  </button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/api/client';
import { INDONESIAN_PROVINCES } from '@/constants/provinces';
import type { LeadDTO } from '@wardell/shared';

const leads = ref<LeadDTO[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 });
const loading = ref(false);

// Scraper state with Province & Category focus
const targetProvince = ref('Jawa Barat');
const targetCategory = ref('Dinas Kesehatan');
const targetCity = ref('');
const scrapeLimit = ref(20);
const isScraping = ref(false);
const scrapeMessage = ref('');
const scrapeSuccess = ref(true);

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

const setPreset = (prov: string, cat: string, city: string = '') => {
  targetProvince.value = prov;
  targetCategory.value = cat;
  targetCity.value = city;
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

const runGmapsScraper = async () => {
  if (isScraping.value) return;

  isScraping.value = true;
  scrapeMessage.value = '';

  try {
    const res = await api.scrapeGmaps({
      province: targetProvince.value || undefined,
      category: targetCategory.value || undefined,
      city: targetCity.value || undefined,
      limit: scrapeLimit.value,
    });

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
  } catch (err: any) {
    scrapeSuccess.value = false;
    scrapeMessage.value = err.message || 'Gagal melakukan scraping Google Maps. Pastikan Chrome terinstall.';
  } finally {
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

const copyPhone = (phone: string) => {
  navigator.clipboard.writeText(phone);
  alert(`Nomor disalin: ${phone}`);
};

const exportData = async (format: 'xlsx' | 'csv') => {
  await api.downloadExport(format, {
    search: filters.value.search,
    province: filters.value.province,
    city: filters.value.city,
    coldCallStatus: filters.value.coldCallStatus,
  });
};

onMounted(fetchLeads);
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

/* Scraper Panel */
.scraper-panel {
  padding: 20px 24px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
  border: 1px solid rgba(56, 189, 248, 0.25);
  margin-bottom: 20px;
}
.scraper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.scraper-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.scraper-title h3 {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
.scraper-badge {
  background: rgba(14, 165, 233, 0.15);
  color: var(--accent-cyan);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(14, 165, 233, 0.3);
}
.quick-presets {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.preset-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.preset-chip:hover {
  background: rgba(14, 165, 233, 0.2);
  color: #fff;
  border-color: var(--accent-cyan);
}

/* Form Grid */
.scraper-form-grid {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1.3fr 1fr 1.3fr;
  gap: 14px;
  align-items: flex-end;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.flex-2 {
  flex: 2;
}
.form-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}
.province-select {
  font-weight: 600;
  color: #38bdf8;
}
.search-input-wrapper {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
}
.scrape-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid var(--border-card);
  padding: 10px 14px 10px 38px;
  border-radius: var(--radius-md);
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: var(--transition);
}
.scrape-input:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.25);
}
.scrape-submit-btn {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
}
.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
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
