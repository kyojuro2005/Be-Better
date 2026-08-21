/**
 * settings.js — Settings view: theme, data export/import, app info
 */

import { Settings, Objectives, Checkins } from './db.js';
import { toast } from './ui.js';
import { icon } from './icons.js';

export async function initSettings() {
  _render();
  _bindEvents();
}

export async function refreshSettings() {
  _render();
  _bindEvents();
}

function _render() {
  const container = document.getElementById('view-settings');
  if (!container) return;

  const isDark = document.documentElement.dataset.theme !== 'light';

  container.innerHTML = `
    <div class="page-header">
      <h1>Paramètres</h1>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Apparence</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Thème sombre</div>
          <div class="settings-row-hint">Noir brillant & bleu fluorescent</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="toggle-theme" ${isDark ? 'checked' : ''}>
          <div class="toggle-track"></div>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Données</div>
      <div class="settings-row" id="btn-export" style="cursor:pointer">
        <div>
          <div class="settings-row-label">Exporter les données</div>
          <div class="settings-row-hint">Sauvegarder en fichier JSON</div>
        </div>
        <span style="color:var(--accent)">${icon('download', 18)}</span>
      </div>
      <div class="settings-row" id="btn-import" style="cursor:pointer">
        <div>
          <div class="settings-row-label">Importer des données</div>
          <div class="settings-row-hint">Restaurer depuis un fichier JSON</div>
        </div>
        <span style="color:var(--accent)">${icon('upload', 18)}</span>
      </div>
      <div class="settings-row" id="btn-reset" style="cursor:pointer">
        <div>
          <div class="settings-row-label" style="color:var(--danger)">Effacer toutes les données</div>
          <div class="settings-row-hint">Supprime objectifs et historique</div>
        </div>
        <span style="color:var(--danger)">${icon('trash', 18)}</span>
      </div>
      <input type="file" id="import-file" accept=".json" style="display:none">
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Application</div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Be Better</div>
          <div class="settings-row-hint">Version 1.0 · Données 100% locales</div>
        </div>
      </div>
      <div class="settings-row" id="btn-install" style="cursor:pointer;display:none">
        <div>
          <div class="settings-row-label">Installer l'application</div>
          <div class="settings-row-hint">Ajouter à l'écran d'accueil</div>
        </div>
        <span style="color:var(--accent)">${icon('smartphone', 18)}</span>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:.76rem">
      Toutes vos données restent sur cet appareil.<br>Aucune connexion requise.
    </div>
  `;

  _bindEvents();
}

function _bindEvents() {
  // Theme toggle
  const themeToggle = document.getElementById('toggle-theme');
  if (themeToggle) {
    themeToggle.onchange = async (e) => {
      const dark = e.target.checked;
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      await Settings.set('theme', dark ? 'dark' : 'light');
      toast(`Thème ${dark ? 'sombre' : 'clair'} activé.`, 'default', 1500);
    };
  }

  // Export
  document.getElementById('btn-export')?.addEventListener('click', _exportData);

  // Import
  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });
  document.getElementById('import-file')?.addEventListener('change', _importData);

  // Reset
  document.getElementById('btn-reset')?.addEventListener('click', async () => {
    const { confirm } = await import('./ui.js');
    confirm('Effacer TOUTES les données ? Cette action est irréversible.', async () => {
      const objs = await Objectives.getAll();
      const cks  = await Checkins.getAll();
      for (const o of objs) await Objectives.delete(o.id);
      for (const c of cks)  await Checkins.delete(c.id);
      toast('Données effacées.', 'success');
      window.dispatchEvent(new CustomEvent('app:refresh'));
    });
  });

  // Install button (shown if deferred prompt available)
  const installBtn = document.getElementById('btn-install');
  if (installBtn && window.__installPrompt__) {
    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', async () => {
      window.__installPrompt__.prompt();
      const choice = await window.__installPrompt__.userChoice;
      if (choice.outcome === 'accepted') {
        window.__installPrompt__ = null;
        installBtn.style.display = 'none';
        toast('Application installée.', 'success');
      }
    });
  }
}

async function _exportData() {
  const objs = await Objectives.getAll();
  const cks  = await Checkins.getAll();
  const data = { version: 1, exportedAt: new Date().toISOString(), objectives: objs, checkins: cks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `be-better-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Export réussi.', 'success');
}

async function _importData(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.objectives || !data.checkins) throw new Error('Format invalide');

    for (const obj of data.objectives) await Objectives.save(obj);
    for (const ck  of data.checkins)   await Checkins.save(ck);

    toast(`Import réussi — ${data.objectives.length} objectifs.`, 'success');
    window.dispatchEvent(new CustomEvent('app:refresh'));
  } catch (err) {
    toast('Erreur lors de l\'import : fichier invalide.', 'error');
  }
  e.target.value = '';
}
