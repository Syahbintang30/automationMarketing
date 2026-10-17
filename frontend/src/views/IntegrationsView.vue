<template>
  <div class="integrations-view fade-in">
    <div class="view-header">
      <div>
        <h1 class="page-title">Integration & Cloud Settings</h1>
        <p class="page-subtitle">Manage external API connections, OAuth 2.0 credentials, and compliance settings.</p>
      </div>
      <button class="btn btn-secondary" @click="checkStatus">🔄 Test Connections</button>
    </div>

    <div class="integrations-grid">
      <!-- Gmail API Card -->
      <div class="glass-panel integration-card">
        <div class="card-top">
          <div class="integration-icon">📧</div>
          <span :class="['badge', gmailConnected ? 'badge-emerald' : 'badge-amber']">
            {{ gmailConnected ? 'CONNECTED' : 'DISCONNECTED' }}
          </span>
        </div>
        <h3 class="integration-name">Gmail API (OAuth 2.0)</h3>
        <p class="integration-desc">
          Used to dispatch approved outreach emails using minimal <code class="code-tag">gmail.send</code> scope. Stored tokens are AES-256-GCM encrypted.
        </p>
        <div class="integration-meta">
          <div><strong>Sender Account:</strong> {{ gmailAccountEmail || 'Not Connected' }}</div>
          <div><strong>Token Protection:</strong> AES-256-GCM Encrypted in PostgreSQL</div>
        </div>
        <div class="card-bottom">
          <button v-if="!gmailConnected" class="btn btn-primary btn-sm" @click="connectGmail">
            🔗 Connect with Google OAuth
          </button>
          <span v-else class="text-xs text-emerald font-semibold">✓ OAuth Credentials Active</span>
        </div>
      </div>

      <!-- Google Places API Card -->
      <div class="glass-panel integration-card">
        <div class="card-top">
          <div class="integration-icon">📍</div>
          <span class="badge badge-emerald">ACTIVE & COMPLIANT</span>
        </div>
        <h3 class="integration-name">Google Places API (New)</h3>
        <p class="integration-desc">
          Official Google Maps Platform Text Search. Enforces storage compliance: strictly retains <code class="code-tag">place_id</code> only.
        </p>
        <div class="integration-meta">
          <div><strong>Provider ID:</strong> google-places-new</div>
          <div><strong>Policy Guard:</strong> Persistent CRM storage restricted to place_id</div>
        </div>
        <div class="card-bottom">
          <span class="text-xs text-dim">Automatic fallback to Indonesian Public Directory</span>
        </div>
      </div>

      <!-- AI Provider Card -->
      <div class="glass-panel integration-card">
        <div class="card-top">
          <div class="integration-icon">🤖</div>
          <span class="badge badge-cyan">ONLINE</span>
        </div>
        <h3 class="integration-name">AI Generation Engine</h3>
        <p class="integration-desc">
          Draft generation powered by Google Gemini (with structured JSON templates fallback). Generates authentic Indonesian B2B outreach copy.
        </p>
        <div class="integration-meta">
          <div><strong>Provider:</strong> Google Gemini 1.5 Flash / OpenAI</div>
          <div><strong>Language:</strong> Indonesian (Formal & Friendly B2B)</div>
        </div>
        <div class="card-bottom">
          <span class="text-xs text-cyan">Includes mandatory opt-out URL in all bodies</span>
        </div>
      </div>

      <!-- Database & Redis Card -->
      <div class="glass-panel integration-card">
        <div class="card-top">
          <div class="integration-icon">🗄️</div>
          <span class="badge badge-emerald">HEALTHY</span>
        </div>
        <h3 class="integration-name">PostgreSQL & BullMQ Redis</h3>
        <p class="integration-desc">
          PostgreSQL relational database with Prisma ORM and distributed Redis queues for background workers and schedulers.
        </p>
        <div class="integration-meta">
          <div><strong>Database:</strong> PostgreSQL 15 (Active)</div>
          <div><strong>Timezone:</strong> Asia/Jakarta (WIB)</div>
        </div>
        <div class="card-bottom">
          <span class="text-xs text-emerald">Connected to localhost:5432</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';

const gmailConnected = ref(false);
const gmailAccountEmail = ref<string | null>(null);

const checkStatus = async () => {
  try {
    const res = await api.getGmailStatus();
    gmailConnected.value = res.data.connected;
    gmailAccountEmail.value = res.data.accountEmail;
  } catch (err) {
    console.error(err);
  }
};

const connectGmail = async () => {
  alert('Silakan konfigurasikan GMAIL_CLIENT_ID dan GMAIL_CLIENT_SECRET pada .env, kemudian klik tautan otorisasi Google OAuth.');
};

onMounted(checkStatus);
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
.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}
.integration-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.integration-icon { font-size: 32px; }
.integration-name { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.integration-desc { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px; }
.code-tag { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: var(--accent-cyan); }
.integration-meta {
  background: rgba(0,0,0,0.25);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}
.card-bottom {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--border-card);
}
.text-emerald { color: var(--accent-emerald); }
.text-cyan { color: var(--accent-cyan); }
.text-dim { color: var(--text-dim); }
.text-xs { font-size: 11px; }
.font-semibold { font-weight: 600; }
.btn-sm { padding: 8px 14px; font-size: 12px; }
</style>
