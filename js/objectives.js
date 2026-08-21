/**
 * objectives.js — "Mes objectifs" list view (all objectives overview)
 */

import { Objectives, Checkins } from './db.js';
import { generatePeriods, scoreObjective, scoreColor } from './periods.js';
import { openForm } from './form.js';
import { toast } from './ui.js';
import { icon } from './icons.js';
import { toISO, formatShort } from './dates.js';
import { renderRing } from './ui.js';

let _objectives = [];
let _checkins   = [];

export async function initObjectives() {
  await _load();
  _render();
}

export async function refreshObjectives() {
  await _load();
  _render();
}

async function _load() {
  _objectives = await Objectives.getAll();
  _checkins   = await Checkins.getAll();
}

function _render() {
  const container = document.getElementById('view-objectives');
  if (!container) return;

  const today = toISO(new Date());
  const active   = _objectives.filter(o => o.startDate <= today && o.endDate >= today);
  const upcoming = _objectives.filter(o => o.startDate > today);
  const past     = _objectives.filter(o => o.endDate < today);

  container.innerHTML = `
    <div class="page-header">
      <h1>Mes objectifs</h1>
      <p>${_objectives.length} objectif${_objectives.length !== 1 ? 's' : ''} au total</p>
    </div>
    ${!_objectives.length ? _emptyState() : ''}
    ${active.length   ? _renderGroup('En cours', active)   : ''}
    ${upcoming.length ? _renderGroup('À venir',  upcoming) : ''}
    ${past.length     ? _renderGroup('Terminés', past)     : ''}
  `;

  _bindEvents();
}

function _emptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon('target', 48)}</div>
      <h3>Commencez ici</h3>
      <p>Créez votre premier objectif en appuyant sur le bouton +.</p>
    </div>
  `;
}

function _renderGroup(label, objs) {
  return `
    <div class="settings-section">
      <div class="section-label">${label}</div>
      ${objs.map(obj => _renderObjRow(obj)).join('')}
    </div>
  `;
}

function _renderObjRow(obj) {
  const cks = _checkins.filter(c => c.objectiveId === obj.id);
  const { score, checked, elapsed, total } = scoreObjective(obj, cks);
  const sColor = scoreColor(score);
  const colorVar = sColor === 'success' ? 'var(--success)' : sColor === 'warning' ? 'var(--warning)' : 'var(--danger)';
  const typeLabel = obj.periodType === 'weekly' ? 'Hebdo' : obj.periodType === 'monthly' ? 'Mensuel' : 'Jours fixes';
  const today = toISO(new Date());
  const isActive = obj.startDate <= today && obj.endDate >= today;

  return `
    <div class="settings-row" style="flex-wrap:wrap;gap:12px;cursor:pointer" data-obj-row="${obj.id}">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div style="width:3px;border-radius:2px;background:${obj.categoryColor || 'var(--accent)'};align-self:stretch;flex-shrink:0"></div>
        <div style="min-width:0">
          <div class="settings-row-label" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${obj.title}</div>
          <div class="settings-row-hint">${obj.category} · ${typeLabel} · ${obj.startDate} → ${obj.endDate}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
        ${renderRing(score, 42, colorVar, `${score}%`)}
        <div style="text-align:right">
          <div style="font-size:.82rem;font-weight:700;color:${colorVar}">${score}%</div>
          <div style="font-size:.7rem;color:var(--text-muted)">${checked}/${elapsed} / ${total}</div>
        </div>
        <button class="icon-btn" data-edit-row="${obj.id}">${icon('edit')}</button>
        <button class="icon-btn" data-delete-row="${obj.id}" style="color:var(--danger)">${icon('trash')}</button>
      </div>
    </div>
  `;
}

function _bindEvents() {
  document.querySelectorAll('[data-edit-row]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const obj = _objectives.find(o => o.id === btn.dataset.editRow);
      if (obj) openForm(obj);
    });
  });

  document.querySelectorAll('[data-delete-row]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteRow;
      const { confirm } = await import('./ui.js');
      confirm('Supprimer cet objectif et tout son historique ?', async () => {
        await Objectives.delete(id);
        const toRemove = _checkins.filter(c => c.objectiveId === id);
        for (const c of toRemove) await Checkins.delete(c.id);
        await refreshObjectives();
        toast('Objectif supprimé.', 'success');
      });
    });
  });
}
