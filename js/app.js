import { isAuthenticated, saveConfig, clearConfig, verifyAuth, getConfig } from './github.js';
import { renderDashboard } from './dashboard.js';
import { renderDetail } from './detail.js';
import { renderLogger } from './logger.js';

const app = document.getElementById('app');
const authModal = document.getElementById('auth-modal');
const settingsModal = document.getElementById('settings-modal');
const backBtn = document.getElementById('back-btn');
const pageTitle = document.getElementById('page-title');
const tabs = document.querySelectorAll('.tab');

let currentView = 'dashboard';
let viewStack = [];

// --- Init ---
async function init() {
  if (!isAuthenticated()) {
    showAuth();
    return;
  }
  navigate('dashboard');
}

// --- Auth ---
function showAuth() {
  authModal.classList.remove('hidden');
  const cfg = getConfig();
  if (cfg) {
    document.getElementById('owner-input').value = cfg.owner || '';
    document.getElementById('repo-input').value = cfg.repo || '';
  }
}

document.getElementById('auth-save').addEventListener('click', async () => {
  const token = document.getElementById('pat-input').value.trim();
  const owner = document.getElementById('owner-input').value.trim();
  const repo = document.getElementById('repo-input').value.trim();
  const errEl = document.getElementById('auth-error');

  if (!token || !owner || !repo) {
    errEl.textContent = 'All fields required.';
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');
  saveConfig(token, owner, repo);

  try {
    await verifyAuth();
    authModal.classList.add('hidden');
    navigate('dashboard');
  } catch {
    errEl.textContent = 'Invalid token or no access. Check your PAT permissions.';
    errEl.classList.remove('hidden');
    clearConfig();
  }
});

// --- Settings ---
document.getElementById('settings-btn').addEventListener('click', () => {
  const cfg = getConfig();
  document.getElementById('settings-user').textContent = cfg ? cfg.owner : '—';
  document.getElementById('settings-repo').textContent = cfg ? `${cfg.owner}/${cfg.repo}` : '—';
  settingsModal.classList.remove('hidden');
});

document.getElementById('settings-close').addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

document.getElementById('disconnect-btn').addEventListener('click', () => {
  clearConfig();
  settingsModal.classList.add('hidden');
  showAuth();
});

// --- Navigation ---
function navigate(view, params = {}) {
  currentView = view;

  // Update tabs
  tabs.forEach(t => t.classList.toggle('active', t.dataset.view === view || (view === 'detail' && t.dataset.view === 'dashboard')));

  // Update header
  if (view === 'detail') {
    backBtn.classList.remove('hidden');
    pageTitle.textContent = 'Workout Detail';
    viewStack.push({ view: 'dashboard' });
  } else {
    backBtn.classList.add('hidden');
    viewStack = [];
  }

  if (view === 'dashboard') {
    pageTitle.textContent = 'Hyrox Log';
    renderDashboard(app, (issueNumber) => navigate('detail', { issueNumber }));
  } else if (view === 'detail') {
    renderDetail(app, params.issueNumber);
  } else if (view === 'logger') {
    pageTitle.textContent = 'Log Workout';
    renderLogger(app, () => navigate('dashboard'));
  }
}

// Tab clicks
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    navigate(tab.dataset.view);
  });
});

// Back button
backBtn.addEventListener('click', () => {
  const prev = viewStack.pop();
  if (prev) {
    navigate(prev.view, prev.params || {});
  } else {
    navigate('dashboard');
  }
});

// --- Start ---
init();
