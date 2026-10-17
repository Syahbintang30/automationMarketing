import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import CampaignsView from '../views/CampaignsView.vue';
import LeadsView from '../views/LeadsView.vue';
import EmailReviewView from '../views/EmailReviewView.vue';
import SendingQueueView from '../views/SendingQueueView.vue';
import IntegrationsView from '../views/IntegrationsView.vue';
import JobMonitoringView from '../views/JobMonitoringView.vue';
import SuppressionView from '../views/SuppressionView.vue';

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/campaigns', name: 'campaigns', component: CampaignsView },
  { path: '/leads', name: 'leads', component: LeadsView },
  { path: '/email-review', name: 'email-review', component: EmailReviewView },
  { path: '/sending-queue', name: 'sending-queue', component: SendingQueueView },
  { path: '/integrations', name: 'integrations', component: IntegrationsView },
  { path: '/job-monitoring', name: 'job-monitoring', component: JobMonitoringView },
  { path: '/suppression', name: 'suppression', component: SuppressionView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
