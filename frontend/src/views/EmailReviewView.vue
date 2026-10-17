<template>
  <div class="email-review-view fade-in">
    <div class="view-header">
      <div>
        <h1 class="page-title">Email Review & Approval</h1>
        <p class="page-subtitle">Inspect AI-generated B2B draft messages, perform human review, edit text, and grant sending approvals.</p>
      </div>
      <div class="header-actions">
        <select v-model="filterStatus" class="form-select" @change="fetchDrafts">
          <option value="PENDING">PENDING APPROVAL</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button class="btn btn-secondary" @click="fetchDrafts">🔄 Refresh</button>
      </div>
    </div>

    <div class="review-layout">
      <!-- Left List of Drafts -->
      <div class="drafts-sidebar glass-panel">
        <div class="sidebar-header">
          <h3>Drafts Queue ({{ drafts.length }})</h3>
        </div>
        <div class="draft-items-list">
          <div
            v-for="d in drafts"
            :key="d.id"
            :class="['draft-item', selectedDraft?.id === d.id ? 'active' : '']"
            @click="selectDraft(d)"
          >
            <div class="item-top">
              <span class="business-name">{{ d.lead?.businessName }}</span>
              <span :class="['badge badge-xs', getBadgeClass(d.approvalStatus)]">{{ d.approvalStatus }}</span>
            </div>
            <div class="item-subject">{{ d.subject }}</div>
            <div class="item-meta">
              <span>{{ d.lead?.city }}</span> • <span>{{ d.lead?.contactEmail }}</span>
            </div>
          </div>
          <div v-if="!drafts.length" class="empty-list">Tidak ada draf dalam status ini.</div>
        </div>
      </div>

      <!-- Right Detail & Edit Area -->
      <div class="draft-preview-panel glass-panel">
        <div v-if="selectedDraft" class="preview-content">
          <!-- Metadata Bar -->
          <div class="recipient-bar">
            <div class="recipient-info">
              <div><strong>Recipient:</strong> {{ selectedDraft.lead?.businessName }} &lt;{{ selectedDraft.lead?.contactEmail }}&gt;</div>
              <div class="text-xs text-dim">Location: {{ selectedDraft.lead?.city }}, {{ selectedDraft.lead?.province }} • Category: {{ selectedDraft.lead?.businessCategory }}</div>
              <div class="text-xs text-cyan mt-1">AI Model: {{ selectedDraft.aiProvider }} ({{ selectedDraft.model }})</div>
            </div>
            <div class="status-indicator">
              <span :class="['badge', getBadgeClass(selectedDraft.approvalStatus)]">
                {{ selectedDraft.approvalStatus }}
              </span>
            </div>
          </div>

          <!-- Subject Editor -->
          <div class="editor-section mt-4">
            <label class="section-label">Email Subject</label>
            <input v-model="editSubject" class="form-input font-bold" />
          </div>

          <!-- Body Editor -->
          <div class="editor-section mt-4">
            <label class="section-label">Email Body (Indonesian)</label>
            <textarea v-model="editBody" rows="14" class="form-input form-textarea font-mono"></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="action-footer mt-6">
            <button class="btn btn-secondary" @click="saveDraftEdits">
              💾 Save Changes
            </button>
            <div class="btn-group">
              <button
                v-if="selectedDraft.approvalStatus !== 'REJECTED'"
                class="btn btn-danger"
                @click="rejectDraft"
              >
                ✕ Reject Draft
              </button>
              <button
                v-if="selectedDraft.approvalStatus !== 'APPROVED'"
                class="btn btn-primary"
                @click="approveDraft"
              >
                ✓ Approve & Move to Queue
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-preview">
          <div class="empty-icon">✉️</div>
          <h3>Select a draft from the list</h3>
          <p>Click on any business draft on the left panel to review or edit its content.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import type { EmailDraftDTO, ApprovalStatus } from '@wardell/shared';

const drafts = ref<EmailDraftDTO[]>([]);
const selectedDraft = ref<EmailDraftDTO | null>(null);
const filterStatus = ref<ApprovalStatus>('PENDING');

const editSubject = ref('');
const editBody = ref('');

const fetchDrafts = async () => {
  try {
    const res = await api.getDrafts({ approvalStatus: filterStatus.value, limit: 50 });
    drafts.value = res.data;
    if (drafts.value.length > 0 && (!selectedDraft.value || !drafts.value.some(d => d.id === selectedDraft.value?.id))) {
      selectDraft(drafts.value[0]);
    } else if (drafts.value.length === 0) {
      selectedDraft.value = null;
    }
  } catch (err) {
    console.error('Failed to fetch drafts', err);
  }
};

const selectDraft = (d: EmailDraftDTO) => {
  selectedDraft.value = d;
  editSubject.value = d.subject;
  editBody.value = d.body;
};

const saveDraftEdits = async () => {
  if (!selectedDraft.value) return;
  try {
    await api.updateDraft(selectedDraft.value.id, {
      subject: editSubject.value,
      body: editBody.value,
    });
    alert('Perubahan draf berhasil disimpan!');
    await fetchDrafts();
  } catch (err: any) {
    alert('Gagal menyimpan: ' + err.message);
  }
};

const approveDraft = async () => {
  if (!selectedDraft.value) return;
  try {
    // Save edits first if any
    await api.updateDraft(selectedDraft.value.id, {
      subject: editSubject.value,
      body: editBody.value,
    });
    await api.approveDraft(selectedDraft.value.id);
    alert('Draf berhasil disetujui! Telah dimasukkan ke antrean pengiriman.');
    await fetchDrafts();
  } catch (err: any) {
    alert('Gagal menyetujui: ' + err.message);
  }
};

const rejectDraft = async () => {
  if (!selectedDraft.value) return;
  const reason = prompt('Masukkan alasan penolakan draf (opsional):', 'Perlu penyesuaian penawaran');
  try {
    await api.rejectDraft(selectedDraft.value.id, reason || undefined);
    alert('Draf ditolak.');
    await fetchDrafts();
  } catch (err: any) {
    alert('Gagal menolak: ' + err.message);
  }
};

const getBadgeClass = (status: string) => {
  switch (status) {
    case 'APPROVED': return 'badge-emerald';
    case 'PENDING': return 'badge-amber';
    case 'REJECTED': return 'badge-rose';
    default: return 'badge-slate';
  }
};

onMounted(fetchDrafts);
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

.review-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;
  height: calc(100vh - 220px);
}
.drafts-sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-card);
}
.sidebar-header h3 { font-size: 14px; color: #fff; }
.draft-items-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.draft-item {
  padding: 12px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
}
.draft-item:hover {
  background: rgba(30, 41, 59, 0.8);
}
.draft-item.active {
  border-color: var(--accent-cyan);
  background: rgba(14, 165, 233, 0.1);
}
.item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.business-name { font-weight: 700; font-size: 13px; color: #fff; }
.badge-xs { font-size: 10px; padding: 2px 6px; }
.item-subject {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.item-meta { font-size: 11px; color: var(--text-dim); }
.empty-list { text-align: center; color: var(--text-dim); padding: 30px 12px; font-size: 13px; }

.draft-preview-panel {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.recipient-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-card);
}
.recipient-info { font-size: 14px; color: #fff; }
.section-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.form-textarea { resize: vertical; line-height: 1.6; }
.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
.action-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-card);
}
.btn-group { display: flex; gap: 10px; }
.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-dim);
  text-align: center;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-preview h3 { color: #fff; margin-bottom: 6px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-1 { margin-top: 4px; }
.text-cyan { color: var(--accent-cyan); }
.text-dim { color: var(--text-dim); }
.text-xs { font-size: 11px; }
.font-bold { font-weight: 700; }
</style>
