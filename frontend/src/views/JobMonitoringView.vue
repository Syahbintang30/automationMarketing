<template>
  <div class="jobs-view fade-in">
    <div class="view-header">
      <div>
        <h1 class="page-title">Job Execution Monitor</h1>
        <p class="page-subtitle">Inspect distributed BullMQ background jobs: discovery, enrichment, drafting, and sending.</p>
      </div>
      <button class="btn btn-secondary" @click="fetchJobs">🔄 Refresh Logs</button>
    </div>

    <!-- Job Table -->
    <div class="glass-panel card-section">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job Type</th>
              <th>Campaign</th>
              <th>Status</th>
              <th>Processed / Succeeded</th>
              <th>Failed</th>
              <th>Execution Time</th>
              <th>Error Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id">
              <td>
                <span class="badge badge-slate font-mono">{{ job.jobType }}</span>
              </td>
              <td>{{ job.campaign?.name || 'Global Job' }}</td>
              <td>
                <span :class="['badge', getStatusBadge(job.status)]">{{ job.status }}</span>
              </td>
              <td class="font-bold text-emerald">{{ job.processedCount }}</td>
              <td :class="job.failedCount > 0 ? 'text-rose font-bold' : 'text-dim'">{{ job.failedCount }}</td>
              <td class="text-xs text-dim">
                <div>Start: {{ job.startedAt ? new Date(job.startedAt).toLocaleTimeString('id-ID') : '-' }}</div>
                <div v-if="job.completedAt">End: {{ new Date(job.completedAt).toLocaleTimeString('id-ID') }}</div>
              </td>
              <td class="text-xs text-rose max-w-xs truncate">{{ job.errorSummary || '-' }}</td>
            </tr>
            <tr v-if="!jobs.length">
              <td colspan="7" class="text-center py-8 text-dim">Belum ada riwayat eksekusi background job.</td>
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
import type { JobExecutionDTO } from '@wardell/shared';

const jobs = ref<JobExecutionDTO[]>([]);

const fetchJobs = async () => {
  try {
    const res = await api.getJobs({ limit: 50 });
    jobs.value = res.data;
  } catch (err) {
    console.error(err);
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'badge-emerald';
    case 'ACTIVE': return 'badge-cyan';
    case 'FAILED': return 'badge-rose';
    default: return 'badge-amber';
  }
};

onMounted(fetchJobs);
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
.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.font-bold { font-weight: 700; }
.text-emerald { color: var(--accent-emerald); }
.text-rose { color: var(--accent-rose); }
.text-dim { color: var(--text-dim); }
.text-xs { font-size: 11px; }
.max-w-xs { max-width: 250px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
