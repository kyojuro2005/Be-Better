/**
 * app.js — Application entry point
 * Bootstraps DB, theme, navigation, views, PWA.
 */

import { openDB, Settings } from './db.js';
import { initDashboard, refreshDashboard } from './dashboard.js';
import { initObjectives, refreshObjectives } from './objectives.js';
import { initSettings, refreshSettings } from './settings.js';
import { initForm, openForm } from './form.js';
import { showView } from './ui.js';
import { initPWA } from './pwa.js';
import { icon } from './icons.js';

/* ---- Boot ---- */

async function boot() {
  await openDB();
  await _applyTheme();
  _buildShell();          // DOM must exist before binding events
  _initNavigation();
  initForm(_onObjectiveSaved);
  initPWA();

  // Load initial view
  await initDashboard();
  await initObjectives();
  await initSettings();
  showView('dashboard');

  // Global refresh event (import/reset)
  window.addEventListener('app:refresh', async () => {
    await refreshDashboard();
    await refreshObjectives();
    await refreshSettings();
  });
}

/* ---- Theme ---- */

async function _applyTheme() {
  const theme = await Settings.get('theme', 'dark');
  document.documentElement.dataset.theme = theme;
}

/* ---- Shell HTML ---- */

function _buildShell() {
  document.getElementById('app').innerHTML = `
    <!-- Top bar -->
    <header class="topbar">
      <img src="images/logo.png" class="topbar-logo" alt="Be Better">
      <span class="topbar-title">Be Better</span>
      <div class="topbar-actions">
        <button class="icon-btn" id="theme-toggle" title="Changer de thème">${icon('sun')}</button>
      </div>
    </header>

    <!-- Main content -->
    <main class="main-content">
      <section class="view active" id="view-dashboard"></section>
      <section class="view"        id="view-objectives"></section>
      <section class="view"        id="view-settings"></section>
    </main>

    <!-- FAB -->
    <button class="fab" id="fab-add" title="Nouvel objectif">
      ${icon('plus', 24)}
      <span class="fab-label">Nouvel objectif</span>
    </button>

    <!-- Bottom nav -->
    <nav class="bottom-nav">
      <button class="nav-item active" data-view="dashboard">
        ${icon('grid', 20)}
        <span>Tableau</span>
      </button>
      <button class="nav-item" data-view="objectives">
        ${icon('target', 20)}
        <span>Objectifs</span>
      </button>
      <button class="nav-item" data-view="settings">
        ${icon('settings', 20)}
        <span>Réglages</span>
      </button>
    </nav>
  `;
}

/* ---- Navigation ---- */

function _initNavigation() {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      showView(view);
    });
  });

  // FAB
  document.getElementById('fab-add')?.addEventListener('click', () => openForm());

  // Theme toggle (quick access in topbar)
  document.getElementById('theme-toggle')?.addEventListener('click', async () => {
    const current = document.documentElement.dataset.theme;
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    await Settings.set('theme', next);
    // Update icon
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
    refreshSettings();
  });

  // Set correct icon on boot
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    const current = document.documentElement.dataset.theme;
    themeBtn.innerHTML = icon(current === 'dark' ? 'sun' : 'moon');
  }
}

/* ---- Callbacks ---- */

async function _onObjectiveSaved() {
  await refreshDashboard();
  await refreshObjectives();
}

/* ---- Start ---- */
boot().catch(err => {
  console.error('Boot failed:', err);
  document.getElementById('app').innerHTML = `
    <div style="padding:32px;text-align:center;color:#f0f0f0">
      <p>Erreur au démarrage. Rechargez la page.</p>
      <p style="font-size:.8rem;color:#666;margin-top:8px">${err.message}</p>
    </div>
  `;
});
