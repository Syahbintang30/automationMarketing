<template>
  <div class="suppression-view fade-in">
    <div class="view-header">
      <div>
        <h1 class="page-title">Suppression & Opt-Out Registry</h1>
        <p class="page-subtitle">UU PDP & UU ITE Compliance: Automatically blocks outreach to contacts that requested unsubscription.</p>
      </div>
      <button class="btn btn-primary" @click="showAddModal = true">
        ➕ Add Manual Suppression
      </button>
    </div>

    <!-- Info Notice -->
    <div class="alert-banner alert-info">
      🛡️ <strong>Compliance Guarantee:</strong> Any recipient in this list is automatically filtered out before sending and will never be contacted during automated campaigns.
    </div>

    <!-- Suppression List Table -->
    <div class="glass-panel card-section mt-4">
      <div class="table-header-filter">
        <input
          v-model="searchQuery"
          class="form-input max-w-sm"
          placeholder="Cari email suppressed..."
          @input="debouncedFetch"
        />
        <button class="btn btn-secondary btn-sm" @click="fetchSuppression">🔄 Refresh</button>
      </div>

      <div class="data-table-wrapper mt-4">
        <table class="data-table">
          <thead>
            <tr>
              <th>Normalized Email</th>
              <th>Suppression Reason</th>
              <th>Source</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.id">
              <td>
                <span class="font-mono text-cyan">{{ entry.normalizedEmail }}</span>
              </td>
              <td>
                <span class="badge badge-rose">{{ entry.reason }}</span>
              </td>
              <td>{{ entry.source }}</td>
              <td class="text-xs text-dim">{{ new Date(entry.createdAt).toLocaleString('id-ID') }}</td>
            </tr>
            <tr v-if="!entries.length">
              <td colspan="4" class="text-center py-8 text-dim">Tidak ada kontak yang diblokir saat ini.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-card glass-panel">
        <div class="modal-header">
          <h3>Add Email to Suppression List</h3>
          <button class="close-btn" @click="showAddModal = false">✕</button>
        </div>
        <form @submit.prevent="addEntry" class="modal-body">
          <div class="form-group">
            <label>Email Address *</label>
            <input v-model="form.email" type="email" required class="form-input" placeholder="e.g. info@client.co.id" />
          </div>
          <div class="form-group">
            <label>Suppression Reason *</label>
            <input v-model="form.reason" required class="form-input" placeholder="e.g. USER_OPT_OUT / DO_NOT_CONTACT" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Add to Suppression List</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import type { SuppressionEntryDTO } from '@wardell/shared';

const entries = ref<SuppressionEntryDTO[]>([]);
const searchQuery = ref('');
const showAddModal = ref(false);

const form = ref({
  email: '',
  reason: 'MANUAL_OPT_OUT',
});

let debounceTimer: any = null;
const debouncedFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchSuppression, 300);
};

const fetchSuppression = async () => {
  try {
    const res = await api.getSuppressionList({ search: searchQuery.value || undefined });
    entries.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const addEntry = async () => {
  try {
    await api.addSuppression(form.value.email, form.value.reason);
    showAddModal.value = false;
    form.value.email = '';
    await fetchSuppression();
    alert('Email berhasil dimasukkan ke daftar suppression!');
  } catch (err: any) {
    alert('Gagal: ' + err.message);
  }
};

onMounted(fetchSuppression);
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
.alert-banner { padding: 12px 18px; border-radius: var(--radius-md); font-size: 14px; }
.alert-info { background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); color: #38bdf8; }
.table-header-filter { display: flex; justify-content: space-between; align-items: center; }
.max-w-sm { max-width: 320px; }
.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
.text-cyan { color: var(--accent-cyan); }
.text-dim { color: var(--text-dim); }
.text-xs { font-size: 11px; }
.mt-4 { margin-top: 16px; }
.btn-sm { padding: 6px 12px; font-size: 12px; }

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
.modal-card { width: 480px; max-width: 90vw; padding: 28px; background: #0f172a; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { font-size: 18px; color: #fff; }
.close-btn { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; }
.modal-body { display: flex; flex-direction: column; gap: 16px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }
</style>
