/**
 * dashboard.js — Dashboard view: global score, objective cards, checkin logic
 */

import { Objectives, Checkins } from './db.js';
import { generatePeriods, scoreObjective, scoreGlobal, scoreColor } from './periods.js';
import { suggestSubCriteria } from './subcriteria.js';
import { openForm } from './form.js';
import { toast, renderRing } from './ui.js';
import { icon } from './icons.js';
import { fromISO, formatShort, isoWeek, monthKey, toISO } from './dates.js';

let _objectives = [];
let _checkins   = [];

/* ---- Public API ---- */

export async function initDashboard() {
  await _loadData();
  _render();
}

export async function refreshDashboard() {
  await _loadData();
  _render();
}

/* ---- Data ---- */

async function _loadData() {
  _objectives = await Objectives.getAll();
  _checkins   = await Checkins.getAll();
}

/* ---- Render ---- */

function _render() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const global = scoreGlobal(_objectives, _checkins);
  const active = _objectives.filter(o => {
    const today = toISO(new Date());
    return o.endDate >= today;
  });

  const ringColor = global >= 75 ? 'var(--success)' : global >= 40 ? 'var(--warning)' : 'var(--danger)';

  container.innerHTML = `
    <div class="page-header">
      <h1>Tableau de bord</h1>
      <p>Fenêtre de 4 mois — discipline & régularité</p>
    </div>

    ${_renderHero(global, ringColor, active.length)}
    ${_renderStats()}
    ${_renderObjectiveList()}
  `;

  _bindCardEvents();
}

function _renderHero(global, ringColor, count) {
  return `
    <div class="dashboard-hero">
      <div class="hero-ring">
        ${renderRing(global, 80, ringColor, `${global}%`)}
      </div>
      <div class="hero-info">
        <div class="hero-score">${global}%</div>
        <div class="hero-label">Score de discipline</div>
        <div class="hero-subtitle">${count} objectif${count !== 1 ? 's' : ''} actif${count !== 1 ? 's' : ''} · ${_heroMessage(global)}</div>
      </div>
    </div>
  `;
}

function _heroMessage(score) {
  if (score >= 90) return 'Excellente constance';
  if (score >= 75) return 'Très bonne régularité';
  if (score >= 50) return 'En progression';
  if (score >= 25) return 'Des efforts à maintenir';
  if (score > 0)   return 'Encore peu de données';
  return 'Aucune donnée encore';
}

function _renderStats() {
  const today = toISO(new Date());
  const active  = _objectives.filter(o => o.endDate >= today).length;
  const total   = _objectives.length;
  const done    = _checkins.filter(c => c.checked).length;
  const missed  = _objectives.reduce((acc, obj) => {
    const cks     = _checkins.filter(c => c.objectiveId === obj.id);
    const periods = generatePeriods(obj);
    const checkedIds = new Set(cks.filter(c => c.checked).map(c => c.periodId));
    const pastPeriods = periods.filter(p => p.isPast);
    acc += pastPeriods.filter(p => !checkedIds.has(p.id)).length;
    return acc;
  }, 0);

  return `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value accent">${active}</div>
        <div class="stat-label">Actifs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value success">${done}</div>
        <div class="stat-label">Cochés</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--danger)">${missed}</div>
        <div class="stat-label">Manqués</div>
      </div>
    </div>
  `;
}

function _renderObjectiveList() {
  if (!_objectives.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('target', 48)}</div>
        <h3>Aucun objectif</h3>
        <p>Appuyez sur + pour créer votre premier objectif.</p>
      </div>
    `;
  }

  const today = toISO(new Date());
  const sorted = [..._objectives].sort((a, b) => {
    // Active first, then by score ascending (need attention first)
    const aActive = a.endDate >= today;
    const bActive = b.endDate >= today;
    if (aActive !== bActive) return aActive ? -1 : 1;
    const aCks = _checkins.filter(c => c.objectiveId === a.id);
    const bCks = _checkins.filter(c => c.objectiveId === b.id);
    return scoreObjective(a, aCks).score - scoreObjective(b, bCks).score;
  });

  return `
    <div class="section-label">Objectifs</div>
    <div id="obj-list">
      ${sorted.map(obj => _renderObjectiveCard(obj)).join('')}
    </div>
  `;
}

function _renderObjectiveCard(obj) {
  const cks    = _checkins.filter(c => c.objectiveId === obj.id);
  const { score, checked, elapsed, total, periods } = scoreObjective(obj, cks);
  const color  = obj.categoryColor || 'var(--accent)';
  const sColor = scoreColor(score);
  const checkedIds = new Set(cks.filter(c => c.checked).map(c => c.periodId));

  const today      = toISO(new Date());
  const isActive   = obj.endDate >= today;
  const isPast     = obj.endDate < today;

  // Determine current period
  const currentPeriod = periods.find(p => p.isCurrent);
  const recentPeriods = periods.filter(p => !p.isFuture).slice(-12);

  const periodLabel = obj.periodType === 'weekly' ? 'semaines' : obj.periodType === 'monthly' ? 'mois' : 'jours';
  const tagText     = obj.periodType === 'weekly' ? 'Hebdo' : obj.periodType === 'monthly' ? 'Mensuel' : 'Jours fixes';

  return `
    <div class="obj-card animate-in" data-obj-id="${obj.id}">
      <div class="obj-card-header" data-toggle="${obj.id}">
        <div class="obj-card-color" style="background:${color}"></div>
        <div class="obj-card-main">
          <div class="obj-card-title">${obj.title}</div>
          <div class="obj-card-meta">
            <span class="tag tag-neutral">${tagText}</span>
            <span class="tag tag-neutral">${obj.category}</span>
            ${isPast ? '<span class="tag tag-neutral">Terminé</span>' : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <div class="obj-card-rate" style="color:${sColor === 'success' ? 'var(--success)' : sColor === 'warning' ? 'var(--warning)' : 'var(--danger)'}">${score}%</div>
          <div style="font-size:.7rem;color:var(--text-muted)">${checked}/${elapsed} ${periodLabel}</div>
        </div>
      </div>

      <div class="obj-card-body" id="body-${obj.id}">
        <!-- Progress bar -->
        <div class="progress-bar" style="margin-bottom:14px">
          <div class="progress-fill ${sColor}" style="width:${score}%"></div>
        </div>

        <!-- Sub-criteria hint (weekly/monthly only) -->
        ${_renderSubCriteriaHint(obj)}

        <!-- Current period check -->
        ${_renderCurrentChecks(obj, periods, checkedIds)}

        <!-- History timeline -->
        ${_renderTimeline(obj, recentPeriods, checkedIds)}

        <!-- Penalty -->
        ${obj.penalty ? `
          <div class="penalty-badge">
            ${icon('alertTriangle', 14)}
            <span>Pénalité : ${obj.penalty}</span>
          </div>
        ` : ''}

        <!-- Actions -->
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-secondary" style="flex:1;font-size:.8rem" data-edit="${obj.id}">
            ${icon('edit', 14)} Modifier
          </button>
          <button class="btn btn-danger" style="font-size:.8rem" data-delete="${obj.id}">
            ${icon('trash', 14)}
          </button>
        </div>
      </div>
    </div>
  `;
}

function _renderSubCriteriaHint(obj) {
  if (obj.periodType === 'fixed_days') return '';
  const hints = suggestSubCriteria(obj.category || '', obj.title || '');
  if (!hints || !hints.length) return '';
  return `
    <div class="sub-criteria" style="margin-bottom:12px">
      <p class="sub-criteria-title">Critères indicatifs :</p>
      <div class="sub-criteria-list">
        ${hints.map(h => `<div class="sub-criteria-item">${h}</div>`).join('')}
      </div>
    </div>
  `;
}

function _renderCurrentChecks(obj, periods, checkedIds) {
  const now          = new Date(); now.setHours(0,0,0,0);
  const actionable   = periods.filter(p => !p.isFuture).slice(-5); // last 5 actionable
  if (!actionable.length) return `<p style="font-size:.8rem;color:var(--text-muted);margin-bottom:12px">Aucune période écoulée.</p>`;

  return `
    <div class="checks-section">
      <div class="checks-label">Périodes à valider</div>
      <div class="checks-list">
        ${actionable.map(p => {
          const isChecked = checkedIds.has(p.id);
          const isMissed  = p.isPast && !isChecked;
          const isCurrent = p.isCurrent;
          return `
            <div class="check-item ${isChecked ? 'is-checked' : isMissed ? 'is-missed' : ''}"
                 data-checkin="${p.id}" data-obj="${obj.id}">
              <div class="check-toggle">
                ${isChecked ? icon('check', 12) : ''}
              </div>
              <div class="check-item-label">${p.label}</div>
              ${isCurrent ? '<span class="tag tag-accent" style="font-size:.68rem">En cours</span>' : ''}
              ${isMissed  ? '<span class="tag tag-danger"  style="font-size:.68rem">Manqué</span>'  : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function _renderTimeline(obj, periods, checkedIds) {
  if (periods.length < 2) return '';
  const cells = periods.map(p => {
    const cls = checkedIds.has(p.id) ? 'done' : p.isCurrent ? 'current' : p.isPast ? 'missed' : 'future';
    return `<div class="timeline-cell ${cls}" title="${p.label}"></div>`;
  }).join('');

  return `
    <div class="timeline-grid" style="margin-top:14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="checks-label" style="margin-bottom:0">Historique</span>
        <div class="timeline-cells">${cells}</div>
      </div>
      <div style="display:flex;gap:12px;margin-top:6px">
        ${_legendDot('done', 'Accompli')}
        ${_legendDot('missed', 'Manqué')}
        ${_legendDot('current', 'En cours')}
        ${_legendDot('future', 'À venir')}
      </div>
    </div>
  `;
}

function _legendDot(cls, label) {
  return `<div style="display:flex;align-items:center;gap:4px">
    <div class="timeline-cell ${cls}" style="flex-shrink:0"></div>
    <span style="font-size:.68rem;color:var(--text-muted)">${label}</span>
  </div>`;
}

/* ---- Events ---- */

function _bindCardEvents() {
  // Toggle expand
  document.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const id   = el.dataset.toggle;
      const card = el.closest('.obj-card');
      card.classList.toggle('expanded');
    });
  });

  // Check-in toggle
  document.querySelectorAll('[data-checkin]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const periodId = el.dataset.checkin;
      const objId    = el.dataset.obj;

      const existing = _checkins.find(c => c.periodId === periodId);
      const newState = !(existing?.checked);

      const checkin = {
        id:          existing?.id || crypto.randomUUID(),
        objectiveId: objId,
        periodId,
        periodKey:   periodId,
        checked:     newState,
        checkedAt:   newState ? new Date().toISOString() : null,
      };

      await Checkins.save(checkin);
      // Update local cache
      if (existing) {
        existing.checked   = newState;
        existing.checkedAt = checkin.checkedAt;
      } else {
        _checkins.push(checkin);
      }

      // Animate toggle
      const toggle = el.querySelector('.check-toggle');
      if (toggle) {
        toggle.innerHTML = newState ? icon('check', 12) : '';
      }
      el.classList.toggle('is-checked', newState);
      el.classList.toggle('is-missed', !newState && el.classList.contains('is-missed'));

      // Update score display
      const card = document.querySelector(`[data-obj-id="${objId}"]`);
      if (card) {
        const cks    = _checkins.filter(c => c.objectiveId === objId);
        const obj    = _objectives.find(o => o.id === objId);
        const { score, checked, elapsed } = scoreObjective(obj, cks);
        const sColor = scoreColor(score);
        const rateEl = card.querySelector('.obj-card-rate');
        if (rateEl) {
          rateEl.textContent  = `${score}%`;
          rateEl.style.color  = `var(--${sColor})`;
        }
        // Update progress bar
        const fillEl = card.querySelector('.progress-fill');
        if (fillEl) {
          fillEl.style.width = `${score}%`;
          fillEl.className   = `progress-fill ${sColor}`;
        }
        // Update global hero
        const global = scoreGlobal(_objectives, _checkins);
        _updateHero(global);
      }

      toast(newState ? 'Période validée.' : 'Validation retirée.', 'default', 1500);
    });
  });

  // Edit
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const obj = _objectives.find(o => o.id === btn.dataset.edit);
      if (obj) openForm(obj);
    });
  });

  // Delete
  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.delete;
      const { confirm } = await import('./ui.js');
      confirm('Supprimer cet objectif et tout son historique ?', async () => {
        await Objectives.delete(id);
        // Delete associated checkins
        const toRemove = _checkins.filter(c => c.objectiveId === id);
        for (const c of toRemove) await Checkins.delete(c.id);
        await refreshDashboard();
        toast('Objectif supprimé.', 'success');
      });
    });
  });
}

function _updateHero(global) {
  const heroScore = document.querySelector('.hero-score');
  const ringContainer = document.querySelector('.hero-ring');
  if (heroScore) heroScore.textContent = `${global}%`;
  if (ringContainer) {
    const ringColor = global >= 75 ? 'var(--success)' : global >= 40 ? 'var(--warning)' : 'var(--danger)';
    ringContainer.innerHTML = renderRing(global, 80, ringColor, `${global}%`);
  }
}
