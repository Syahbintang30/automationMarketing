<template>
  <div class="sending-queue-view fade-in">
    <div class="view-header">
      <div>
        <h1 class="page-title">Sending Queue & Dispatch Monitor</h1>
        <p class="page-subtitle">Inspect outbound approved email dispatch, daily quotas, error logs, and global pause/resume controls.</p>
      </div>
      <div class="header-actions">
        <button
          :class="['btn', isGloballyPaused ? 'btn-success' : 'btn-danger']"
          @click="toggleGlobalPause"
        >
          {{ isGloballyPaused ? '▶ Resume Global Sending' : '⏸ Pause Global Sending' }}
        </button>
        <button class="btn btn-primary" :disabled="isGloballyPaused" @click="processQueue">
          ⚡ Process Queue Now
        </button>
      </div>
    </div>

    <!-- Live Status Banner -->
    <div v-if="isGloballyPaused" class="alert-banner alert-warning">
      ⏸️ <strong>Global Dispatch Paused:</strong> Background workers will not send any emails until resumed.
    </div>

    <!-- Logs Table -->
    <div class="glass-panel card-section">
      <div class="section-header-flex">
        <h3 class="section-title">Outreach Message Logs</h3>
        <button class="btn btn-secondary btn-sm" @click="fetchQueue">🔄 Refresh</button>
      </div>

      <div class="data-table-wrapper mt-4">
        <table class="data-table">
          <thead>
            <tr>
              <th>Recipient Business</th>
              <th>Campaign</th>
              <th>Email Subject</th>
              <th>Dispatch Status</th>
              <th>Simulation / Mode</th>
              <th>Provider Message ID</th>
              <th>Sent At</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in sendLogs" :key="log.id">
              <td>
                <div class="font-bold text-white">{{ log.lead?.businessName || 'Unknown Lead' }}</div>
                <div class="text-xs font-mono text-cyan">{{ log.lead?.contactEmail }}</div>
              </td>
              <td>{{ log.campaign?.name }}</td>
              <td class="text-sm max-w-xs truncate">{{ log.emailDraft?.subject || '-' }}</td>
              <td>
                <span :class="['badge', getStatusBadge(log.status)]">{{ log.status }}</span>
                <div v-if="log.errorMessage" class="text-xs text-rose mt-1">{{ log.errorMessage }}</div>
              </td>
              <td>
                <span :class="['badge', log.isDryRun ? 'badge-amber' : 'badge-emerald']">
                  {{ log.isDryRun ? '🛡️ DRY_RUN' : '🚀 LIVE_SEND' }}
                </span>
              </td>
              <td class="font-mono text-xs text-dim">{{ log.providerMessageId || '-' }}</td>
              <td class="text-xs text-dim">{{ log.sentAt ? new Date(log.sentAt).toLocaleString('id-ID') : '-' }}</td>
            </tr>
            <tr v-if="!sendLogs.length">
              <td colspan="7" class="text-center py-8 text-dim">Belum ada riwayat pengiriman email.</td>
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
import type { EmailSendLogDTO } from '@wardell/shared';

const sendLogs = ref<EmailSendLogDTO[]>([]);
const isGloballyPaused = ref(false);

const fetchQueue = async () => {
  try {
    const res = await api.getSendingQueue({ limit: 50 });
    sendLogs.value = res.data;

    const statsRes = await api.getDashboardStats();
    isGloballyPaused.value = statsRes.data.isSendingPausedGlobally;
  } catch (err) {
    console.error('Failed to fetch sending queue', err);
  }
};

const processQueue = async () => {
  try {
    const res = await api.processSendingQueue();
    alert(res.message);
    await fetchQueue();
  } catch (err: any) {
    alert('Gagal memproses antrean: ' + err.message);
  }
};

const toggleGlobalPause = async () => {
  try {
    await api.toggleGlobalSendingPause(!isGloballyPaused.value);
    await fetchQueue();
  } catch (err: any) {
    alert(err.message);
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'SENT': return 'badge-emerald';
    case 'QUEUED': return 'badge-cyan';
    case 'SENDING': return 'badge-amber';
    case 'SUPPRESSED': return 'badge-rose';
    case 'FAILED': return 'badge-rose';
    default: return 'badge-slate';
  }
};

onMounted(fetchQueue);
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
.card-section { padding: 24px; }
.section-title { font-size: 16px; font-weight: 700; color: #fff; }
.section-header-flex { display: flex; justify-content: space-between; align-items: center; }
.font-bold { font-weight: 700; }
.text-white { color: #fff; }
.text-cyan { color: var(--accent-cyan); }
.text-dim { color: var(--text-dim); }
.text-rose { color: var(--accent-rose); }
.font-mono { font-family: 'JetBrains Mono', monospace; }
.text-xs { font-size: 11px; }
.text-sm { font-size: 13px; }
.mt-1 { margin-top: 4px; }
.mt-4 { margin-top: 16px; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.max-w-xs { max-width: 220px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert-banner { padding: 12px 18px; border-radius: var(--radius-md); margin-bottom: 20px; font-size: 14px; }
.alert-warning { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; }
</style>
