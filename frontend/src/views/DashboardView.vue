<template>
  <div class="dashboard-view fade-in">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="page-title">Executive Dashboard</h1>
        <p class="page-subtitle">Real-time overview of business lead generation, enrichment, and outreach automation.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="downloadXlsx">
          📥 Export Leads (Excel)
        </button>
        <button class="btn btn-secondary" @click="fetchStats">
          🔄 Refresh
        </button>
      </div>
    </div>

    <!-- Status Banners -->
    <div v-if="stats?.isDryRun" class="alert-banner alert-info">
      🛡️ <strong>Dry Run Mode Active:</strong> Outbound emails are securely simulated. No real messages are sent to recipient inboxes.
    </div>

    <div v-if="stats?.isSendingPausedGlobally" class="alert-banner alert-warning">
      ⏸️ <strong>Global Sending Paused:</strong> Outbound message dispatch is currently paused by operator.
    </div>

    <!-- KPI Metric Cards -->
    <div class="kpi-grid">
      <div class="kpi-card glass-panel">
        <div class="kpi-label">Total Leads Discovered</div>
        <div class="kpi-value text-cyan">{{ stats?.totalEligibleLeads || 0 }}</div>
        <div class="kpi-hint">Saved in PostgreSQL</div>
      </div>

      <div class="kpi-card glass-panel">
        <div class="kpi-label">Drafts Awaiting Approval</div>
        <div class="kpi-value text-amber">{{ stats?.draftsAwaitingApproval || 0 }}</div>
        <div class="kpi-hint">Human-in-the-loop review</div>
      </div>

      <div class="kpi-card glass-panel">
        <div class="kpi-label">Emails Dispatched</div>
        <div class="kpi-value text-emerald">{{ stats?.emailsSent || 0 }}</div>
        <div class="kpi-hint">Compliant B2B sends</div>
      </div>

      <div class="kpi-card glass-panel">
        <div class="kpi-label">Suppressed / Opt-Out</div>
        <div class="kpi-value text-rose">{{ stats?.suppressedContacts || 0 }}</div>
        <div class="kpi-hint">UU PDP compliance list</div>
      </div>
    </div>

    <!-- Charts / Breakdown Section -->
    <div class="grid-2-col">
      <!-- Province Breakdown -->
      <div class="glass-panel card-section">
        <h3 class="section-title">📍 Leads by Indonesian Province</h3>
        <div class="distribution-list">
          <div v-for="item in stats?.leadsByProvince || []" :key="item.province" class="dist-row">
            <span class="dist-name">{{ item.province }}</span>
            <div class="dist-bar-wrapper">
              <div class="dist-bar bg-cyan" :style="{ width: getPercentage(item.count) + '%' }"></div>
            </div>
            <span class="dist-count">{{ item.count }}</span>
          </div>
          <div v-if="!stats?.leadsByProvince?.length" class="empty-state">Belum ada data leads per provinsi.</div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="glass-panel card-section">
        <h3 class="section-title">🏢 Leads by Business Category</h3>
        <div class="distribution-list">
          <div v-for="item in stats?.leadsByCategory || []" :key="item.category" class="dist-row">
            <span class="dist-name">{{ item.category }}</span>
            <div class="dist-bar-wrapper">
              <div class="dist-bar bg-purple" :style="{ width: getPercentage(item.count) + '%' }"></div>
            </div>
            <span class="dist-count">{{ item.count }}</span>
          </div>
          <div v-if="!stats?.leadsByCategory?.length" class="empty-state">Belum ada data leads per kategori.</div>
        </div>
      </div>
    </div>

    <!-- Active Campaigns Quick Action -->
    <div class="glass-panel card-section mt-6">
      <div class="section-header-flex">
        <h3 class="section-title">🚀 Quick Execution: Active Campaigns</h3>
        <router-link to="/campaigns" class="btn btn-secondary btn-sm">View All Campaigns</router-link>
      </div>

      <div class="data-table-wrapper mt-4">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Target Location</th>
              <th>Category</th>
              <th>Status</th>
              <th>Daily Limit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c.id">
              <td class="font-semibold">{{ c.name }}</td>
              <td>{{ c.targetCity ? `${c.targetCity}, ` : '' }}{{ c.targetProvince }}</td>
              <td>{{ c.businessCategory }}</td>
              <td>
                <span :class="['badge', c.isPaused ? 'badge-amber' : 'badge-emerald']">
                  {{ c.isPaused ? 'PAUSED' : c.status }}
                </span>
              </td>
              <td>{{ c.dailySendLimit }} emails/day</td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-secondary btn-sm" @click="runDiscovery(c.id)">🔍 Scrape</button>
                  <button class="btn btn-primary btn-sm" @click="runDraft(c.id)">🤖 Draft AI</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import type { DashboardKPIs, CampaignDTO } from '@wardell/shared';

const stats = ref<DashboardKPIs | null>(null);
const campaigns = ref<CampaignDTO[]>([]);

const fetchStats = async () => {
  try {
    const res = await api.getDashboardStats();
    stats.value = res.data;
  } catch (err) {
    console.error('Failed to fetch dashboard stats', err);
  }
};

const fetchCampaigns = async () => {
  try {
    const res = await api.getCampaigns();
    campaigns.value = res.data;
  } catch (err) {
    console.error('Failed to fetch campaigns', err);
  }
};

const runDiscovery = async (id: string) => {
  try {
    alert('Memulai proses automated discovery & scraper...');
    await api.triggerDiscovery(id);
    await fetchStats();
    alert('Proses scraping selesai! Leads baru telah disimpan.');
  } catch (err: any) {
    alert('Error: ' + err.message);
  }
};

const runDraft = async (id: string) => {
  try {
    alert('Menjalankan pembuatan AI draft email...');
    await api.triggerDraftGeneration(id);
    await fetchStats();
    alert('Draf AI berhasil dibuat! Silakan cek halaman Review Email untuk menyetujui.');
  } catch (err: any) {
    alert('Error: ' + err.message);
  }
};

const downloadXlsx = async () => {
  await api.downloadExport('xlsx');
};

const getPercentage = (count: number) => {
  const total = stats.value?.totalEligibleLeads || 1;
  return Math.min(100, Math.round((count / total) * 100));
};

onMounted(() => {
  fetchStats();
  fetchCampaigns();
});
</script>

<style scoped>
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-title {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
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
.alert-banner {
  padding: 12px 18px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  font-size: 14px;
}
.alert-info {
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid rgba(14, 165, 233, 0.3);
  color: #38bdf8;
}
.alert-warning {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
.kpi-card {
  padding: 22px;
}
.kpi-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.kpi-value {
  font-size: 32px;
  font-weight: 800;
  margin: 8px 0;
}
.text-cyan { color: var(--accent-cyan); }
.text-amber { color: var(--accent-amber); }
.text-emerald { color: var(--accent-emerald); }
.text-rose { color: var(--accent-rose); }
.kpi-hint {
  font-size: 12px;
  color: var(--text-dim);
}
.grid-2-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.card-section {
  padding: 24px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}
.section-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dist-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.dist-name {
  width: 140px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dist-bar-wrapper {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}
.dist-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}
.bg-cyan { background: var(--accent-cyan); }
.bg-purple { background: var(--accent-purple); }
.dist-count {
  width: 40px;
  text-align: right;
  font-weight: 700;
  color: #fff;
}
.empty-state {
  color: var(--text-dim);
  font-style: italic;
  font-size: 13px;
  padding: 12px 0;
}
.mt-6 { margin-top: 24px; }
.mt-4 { margin-top: 16px; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-group { display: flex; gap: 8px; }
.font-semibold { font-weight: 600; }
</style>
