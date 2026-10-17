<template>
  <div class="campaigns-view fade-in">
    <div class="view-header">
      <div>
        <h1 class="page-title">Campaign Management</h1>
        <p class="page-subtitle">Configure targeted B2B discovery, qualification criteria, and email outreach schedules.</p>
      </div>
      <button class="btn btn-primary" @click="showModal = true">
        ➕ New Campaign
      </button>
    </div>

    <!-- Campaigns List -->
    <div class="glass-panel card-section">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Target Location</th>
              <th>Business Category</th>
              <th>Service Offering</th>
              <th>Daily Limit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c.id">
              <td>
                <div class="font-bold text-white">{{ c.name }}</div>
                <div class="text-dim text-xs">{{ c.description || 'No description' }}</div>
              </td>
              <td>{{ c.targetCity ? `${c.targetCity}, ` : '' }}<strong>{{ c.targetProvince }}</strong></td>
              <td><span class="badge badge-slate">{{ c.businessCategory }}</span></td>
              <td class="text-sm max-w-xs truncate">{{ c.serviceOffering }}</td>
              <td>{{ c.dailySendLimit }} / day</td>
              <td>
                <span :class="['badge', c.isPaused ? 'badge-amber' : 'badge-emerald']">
                  {{ c.isPaused ? 'PAUSED' : c.status }}
                </span>
              </td>
              <td>
                <div class="btn-group">
                  <button class="btn btn-secondary btn-sm" @click="triggerScrape(c.id)" title="Run Discovery & Scraper">
                    🔍 Scrape
                  </button>
                  <button class="btn btn-primary btn-sm" @click="triggerDrafts(c.id)" title="Generate AI Drafts">
                    🤖 Draft
                  </button>
                  <button
                    :class="['btn btn-sm', c.isPaused ? 'btn-success' : 'btn-danger']"
                    @click="togglePause(c)"
                  >
                    {{ c.isPaused ? '▶ Resume' : '⏸ Pause' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!campaigns.length">
              <td colspan="7" class="text-center py-8 text-dim">Belum ada kampanye dibuat.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Campaign Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-card glass-panel">
        <div class="modal-header">
          <h3>Create New Outreach Campaign</h3>
          <button class="close-btn" @click="showModal = false">✕</button>
        </div>
        <form @submit.prevent="createCampaign" class="modal-body">
          <div class="form-group">
            <label>Campaign Name *</label>
            <input v-model="form.name" required class="form-input" placeholder="e.g. Digitalisasi UMKM Kuliner Bandung" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Target Province *</label>
              <select v-model="form.targetProvince" required class="form-select">
                <option value="Jawa Barat">Jawa Barat</option>
                <option value="DKI Jakarta">DKI Jakarta</option>
                <option value="Jawa Timur">Jawa Timur</option>
                <option value="Jawa Tengah">Jawa Tengah</option>
                <option value="Banten">Banten</option>
                <option value="Bali">Bali</option>
                <option value="Sumatera Utara">Sumatera Utara</option>
              </select>
            </div>
            <div class="form-group">
              <label>Target City / Regency</label>
              <input v-model="form.targetCity" class="form-input" placeholder="e.g. Kota Bandung" />
            </div>
          </div>

          <div class="form-group">
            <label>Business Category / Target Keywords *</label>
            <input v-model="form.businessCategory" required class="form-input" placeholder="e.g. Cafe & Resto, Hotel, Software House, Pabrik" />
          </div>

          <div class="form-group">
            <label>Wardell Tech Service Offering *</label>
            <input v-model="form.serviceOffering" required class="form-input" placeholder="e.g. Pembuatan Website Profil Perusahaan & Sistem Dashboard Internal" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Daily Email Send Limit</label>
              <input v-model.number="form.dailySendLimit" type="number" min="5" max="100" class="form-input" />
            </div>
            <div class="form-group">
              <label>Campaign Objective</label>
              <input v-model="form.description" class="form-input" placeholder="Deskripsi ringkas tujuan kampanye" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Campaign</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import type { CampaignDTO } from '@wardell/shared';

const campaigns = ref<CampaignDTO[]>([]);
const showModal = ref(false);

const form = ref({
  name: '',
  targetProvince: 'Jawa Barat',
  targetCity: 'Kota Bandung',
  businessCategory: '',
  serviceOffering: 'Pembuatan Website Profil Perusahaan Modern & Custom Web Application',
  dailySendLimit: 30,
  description: '',
});

const fetchCampaigns = async () => {
  try {
    const res = await api.getCampaigns();
    campaigns.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const createCampaign = async () => {
  try {
    await api.createCampaign(form.value);
    showModal.value = false;
    await fetchCampaigns();
    alert('Kampanye berhasil dibuat!');
  } catch (err: any) {
    alert('Gagal membuat kampanye: ' + err.message);
  }
};

const togglePause = async (c: CampaignDTO) => {
  try {
    await api.toggleCampaignPause(c.id, !c.isPaused);
    await fetchCampaigns();
  } catch (err: any) {
    alert(err.message);
  }
};

const triggerScrape = async (id: string) => {
  try {
    alert('Memulai automated lead scraper untuk kampanye ini...');
    await api.triggerDiscovery(id);
    alert('Scraping selesai! Data lead berhasil diperbarui.');
  } catch (err: any) {
    alert('Error: ' + err.message);
  }
};

const triggerDrafts = async (id: string) => {
  try {
    alert('Menghasilkan draf email AI...');
    await api.triggerDraftGeneration(id);
    alert('Draf email selesai dibuat! Buka halaman Email Review.');
  } catch (err: any) {
    alert('Error: ' + err.message);
  }
};

onMounted(fetchCampaigns);
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
.card-section { padding: 24px; }
.btn-group { display: flex; gap: 6px; }
.btn-sm { padding: 6px 10px; font-size: 12px; }
.font-bold { font-weight: 700; }
.text-white { color: #fff; }
.text-dim { color: var(--text-dim); }
.text-xs { font-size: 11px; }
.text-sm { font-size: 13px; }
.max-w-xs { max-width: 220px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-card {
  width: 580px;
  max-width: 90vw;
  padding: 28px;
  background: #0f172a;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.modal-header h3 { font-size: 18px; color: #fff; }
.close-btn { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; }
.modal-body { display: flex; flex-direction: column; gap: 16px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }
</style>
