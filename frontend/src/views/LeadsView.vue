<template>
  <div class="leads-view fade-in">
    <div class="view-header">
      <div>
        <h1 class="page-title">Lead Management</h1>
        <p class="page-subtitle">Discovered Indonesian business prospects, contact verification status, and provenance records.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="exportData('csv')">
          📄 Export CSV
        </button>
        <button class="btn btn-primary" @click="exportData('xlsx')">
          📊 Export Excel (XLSX)
        </button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="glass-panel filter-panel">
      <div class="filter-grid">
        <div>
          <label>Search Business / Email</label>
          <input
            v-model="filters.search"
            class="form-input"
            placeholder="Ketik nama bisnis, email, web..."
            @input="debouncedFetch"
          />
        </div>
        <div>
          <label>Province</label>
          <input
            v-model="filters.province"
            class="form-input"
            placeholder="e.g. Jawa Barat"
            @change="fetchLeads"
          />
        </div>
        <div>
          <label>City / Regency</label>
          <input
            v-model="filters.city"
            class="form-input"
            placeholder="e.g. Bandung"
            @change="fetchLeads"
          />
        </div>
        <div>
          <label>Outreach Status</label>
          <select v-model="filters.outreachStatus" class="form-select" @change="fetchLeads">
            <option value="">All Statuses</option>
            <option value="NOT_CONTACTED">NOT CONTACTED</option>
            <option value="AWAITING_APPROVAL">AWAITING APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SENT">SENT</option>
            <option value="OPTED_OUT">OPTED OUT</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Leads Table -->
    <div class="glass-panel card-section mt-4">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Location</th>
              <th>Category</th>
              <th>Contact Email</th>
              <th>Website</th>
              <th>Provenance / Source</th>
              <th>Outreach Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id">
              <td>
                <div class="font-bold text-white">{{ lead.businessName }}</div>
                <div v-if="lead.businessAddress" class="text-xs text-dim truncate max-w-xs">
                  {{ lead.businessAddress }}
                </div>
              </td>
              <td>
                <div>{{ lead.city }}</div>
                <div class="text-xs text-dim">{{ lead.province }}</div>
              </td>
              <td>
                <span class="badge badge-slate">{{ lead.businessCategory }}</span>
              </td>
              <td>
                <div v-if="lead.contactEmail" class="email-cell">
                  <span class="font-mono text-cyan">{{ lead.contactEmail }}</span>
                  <span
                    :class="[
                      'badge text-xs',
                      lead.emailVerificationStatus === 'VERIFIED' ? 'badge-emerald' : 'badge-amber',
                    ]"
                  >
                    {{ lead.emailVerificationStatus }}
                  </span>
                </div>
                <div v-else class="text-dim text-xs">Belum ada email</div>
              </td>
              <td>
                <a
                  v-if="lead.websiteUrl"
                  :href="lead.websiteUrl"
                  target="_blank"
                  class="link-website"
                >
                  {{ lead.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') }} ↗
                </a>
                <span v-else class="text-dim text-xs">-</span>
              </td>
              <td>
                <div class="text-xs font-semibold">{{ lead.dataSource }}</div>
                <a
                  v-if="lead.emailSourceUrl"
                  :href="lead.emailSourceUrl"
                  target="_blank"
                  class="text-xs text-dim link-provenance"
                  title="Source Provenance Link"
                >
                  Provenance Link ↗
                </a>
              </td>
              <td>
                <span :class="['badge', getStatusBadgeClass(lead.outreachStatus)]">
                  {{ lead.outreachStatus }}
                </span>
              </td>
            </tr>
            <tr v-if="!leads.length">
              <td colspan="7" class="text-center py-10 text-dim">
                Tidak ada data leads ditemukan dengan filter saat ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination-footer">
        <span class="text-sm text-dim">
          Showing page <strong>{{ pagination.page }}</strong> of <strong>{{ pagination.totalPages }}</strong> (Total: {{ pagination.total }} leads)
        </span>
        <div class="btn-group">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
          >
            ← Previous
          </button>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import type { LeadDTO } from '@wardell/shared';

const leads = ref<LeadDTO[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 });

const filters = ref({
  search: '',
  province: '',
  city: '',
  outreachStatus: '',
});

let debounceTimer: any = null;
const debouncedFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchLeads, 300);
};

const fetchLeads = async () => {
  try {
    const res = await api.getLeads({
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: filters.value.search || undefined,
      province: filters.value.province || undefined,
      city: filters.value.city || undefined,
      outreachStatus: filters.value.outreachStatus || undefined,
    });
    leads.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    console.error('Failed to fetch leads', err);
  }
};

const changePage = (newPage: number) => {
  pagination.value.page = newPage;
  fetchLeads();
};

const exportData = async (format: 'xlsx' | 'csv') => {
  await api.downloadExport(format, {
    search: filters.value.search,
    province: filters.value.province,
    city: filters.value.city,
    outreachStatus: filters.value.outreachStatus,
  });
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'SENT': return 'badge-emerald';
    case 'APPROVED': return 'badge-cyan';
    case 'AWAITING_APPROVAL': return 'badge-amber';
    case 'OPTED_OUT': return 'badge-rose';
    default: return 'badge-slate';
  }
};

onMounted(fetchLeads);
</script>

<style scoped>
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-title { font-size: 26px; font-weight: 800; color: #fff; }
.page-subtitle { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
.header-actions { display: flex; gap: 12px; }
.filter-panel { padding: 18px 24px; margin-bottom: 20px; }
.filter-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1.2fr; gap: 16px; }
.filter-grid label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; }
.card-section { padding: 24px; }
.font-bold { font-weight: 700; }
.text-white { color: #fff; }
.text-dim { color: var(--text-dim); }
.text-cyan { color: var(--accent-cyan); }
.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.max-w-xs { max-width: 200px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.email-cell { display: flex; flex-direction: column; gap: 4px; }
.link-website { color: var(--accent-cyan); text-decoration: none; font-size: 13px; }
.link-website:hover { text-decoration: underline; }
.link-provenance { text-decoration: none; display: block; }
.link-provenance:hover { color: #fff; }
.pagination-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-card);
}
.btn-group { display: flex; gap: 8px; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.mt-4 { margin-top: 16px; }
</style>
