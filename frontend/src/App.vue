<template>
  <div class="app-container">
    <!-- Sidebar Navigation -->
    <aside class="app-sidebar">
      <div class="brand-section">
        <div class="brand-logo">⚡</div>
        <div class="brand-info">
          <div class="brand-name">WARDELL</div>
          <div class="brand-tag">LEAD ENGINE</div>
        </div>
      </div>

      <nav class="nav-menu">
        <router-link to="/" class="nav-item">
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </router-link>

        <router-link to="/campaigns" class="nav-item">
          <span class="nav-icon">🎯</span>
          <span>Campaigns</span>
        </router-link>

        <router-link to="/leads" class="nav-item">
          <span class="nav-icon">🗺️</span>
          <span>GMaps & Cold Call</span>
        </router-link>

        <router-link to="/email-review" class="nav-item">
          <span class="nav-icon">✉️</span>
          <span>Email Review</span>
        </router-link>

        <router-link to="/sending-queue" class="nav-item">
          <span class="nav-icon">🚀</span>
          <span>Sending Queue</span>
        </router-link>

        <router-link to="/suppression" class="nav-item">
          <span class="nav-icon">🛡️</span>
          <span>Suppression List</span>
        </router-link>

        <router-link to="/job-monitoring" class="nav-item">
          <span class="nav-icon">⚙️</span>
          <span>Job Monitoring</span>
        </router-link>

        <router-link to="/integrations" class="nav-item">
          <span class="nav-icon">🔌</span>
          <span>Integrations</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="system-status-indicator">
          <span class="pulse-dot"></span>
          <span>B2B Engine Online</span>
        </div>
        <div class="text-xs text-dim mt-1">v1.0 • Wardell Tech</div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { api } from '@/api/client';

onMounted(async () => {
  // Ensure default dev credentials are authenticated
  try {
    await api.login();
  } catch {
    // Ignore if already logged in or backend booting
  }
});
</script>

<style scoped>
.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 24px 12px;
  border-bottom: 1px solid var(--border-card);
  margin-bottom: 16px;
}
.brand-logo {
  font-size: 24px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
}
.brand-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #fff;
}
.brand-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-cyan);
  letter-spacing: 0.5px;
}
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}
.nav-item.router-link-active {
  background: rgba(14, 165, 233, 0.12);
  color: var(--accent-cyan);
  border-left: 3px solid var(--accent-cyan);
}
.nav-icon {
  font-size: 17px;
}
.sidebar-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border-card);
}
.system-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-emerald);
}
.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: var(--accent-emerald);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--accent-emerald);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}
.mt-1 { margin-top: 4px; }
.text-dim { color: var(--text-dim); }
.text-xs { font-size: 11px; }
</style>
