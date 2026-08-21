/**
 * form.js — Objective creation form (multi-step sheet)
 * Handles all form state, validation, and submission.
 */

import { Objectives, Checkins, Settings } from './db.js';
import { windowStart, windowEnd, toISO, DAY_SHORT } from './dates.js';
import { suggestSubCriteria } from './subcriteria.js';
import { toast, openModal, closeModal } from './ui.js';
import { icon } from './icons.js';

const CATEGORIES = [
  'Sport & Forme', 'Santé', 'Travail', 'Apprentissage',
  'Lecture', 'Finance', 'Projet personnel', 'Créativité',
  'Social & Relations', 'Bien-être mental', 'Autre',
];

const CATEGORY_COLORS = [
  '#00f0ff', '#00c48c', '#7c6af5', '#f5a623',
  '#e05252', '#52e0c4', '#c45cf5', '#f5c452',
  '#52b8f5', '#f5527c', '#8a8a8a',
];

let currentStep = 1;
let formData    = {};
let editId      = null;
let onSaveCallback = null;

/* ---- Public API ---- */

export function initForm(onSave) {
  onSaveCallback = onSave;
  _buildFormHTML();
  _bindEvents();
}

export function openForm(existingObj = null) {
  editId   = existingObj?.id || null;
  formData = existingObj ? { ...existingObj } : {
    startDate: toISO(windowStart()),
    endDate:   toISO(windowEnd()),
  };
  currentStep = 1;
  _renderStep();
  openModal('form-overlay');
}

/* ---- Build DOM ---- */

function _buildFormHTML() {
  const overlay = document.createElement('div');
  overlay.id = 'form-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="sheet" id="form-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div>
          <h2 class="sheet-title" id="form-title">Nouvel objectif</h2>
          <p id="form-subtitle" style="font-size:.78rem;color:var(--text-muted);margin-top:2px"></p>
        </div>
        <button class="icon-btn" id="form-close">${icon('x')}</button>
      </div>
      <div id="step-indicator" class="step-indicator"></div>
      <div id="form-body"></div>
      <div id="form-nav" style="display:flex;gap:10px;margin-top:24px">
        <button id="form-back" class="btn btn-secondary" style="display:none">${icon('chevronRight', 16)} Retour</button>
        <button id="form-next" class="btn btn-primary btn-full">Continuer</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close on backdrop
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeForm(); });
  document.getElementById('form-close').onclick = _closeForm;
}

function _closeForm() {
  closeModal('form-overlay');
  // Reset
  setTimeout(() => { currentStep = 1; formData = {}; editId = null; }, 300);
}

/* ---- Step rendering ---- */

const STEP_TITLES = [
  'Catégorie & intitulé',
  'Périodicité',
  'Détails & pénalité',
];

function _renderStep() {
  document.getElementById('form-title').textContent =
    editId ? 'Modifier l\'objectif' : 'Nouvel objectif';
  document.getElementById('form-subtitle').textContent = STEP_TITLES[currentStep - 1];

  // Step indicator
  const totalSteps = 3;
  document.getElementById('step-indicator').innerHTML = Array.from({ length: totalSteps }, (_, i) => {
    const done    = i + 1 < currentStep;
    const active  = i + 1 === currentStep;
    return `<div class="step-dot ${done ? 'done' : active ? 'active' : ''}"></div>`;
  }).join('');

  // Nav buttons
  document.getElementById('form-back').style.display = currentStep > 1 ? 'flex' : 'none';
  document.getElementById('form-next').textContent   =
    currentStep === totalSteps ? (editId ? 'Enregistrer' : 'Créer') : 'Continuer';
  document.getElementById('form-next').innerHTML     =
    currentStep === totalSteps
      ? `${icon('check', 16)} ${editId ? 'Enregistrer' : 'Créer'}`
      : `Continuer <span style="opacity:.6">${icon('chevronRight', 14)}</span>`;

  // Body
  const body = document.getElementById('form-body');
  if (currentStep === 1) body.innerHTML = _step1HTML();
  if (currentStep === 2) body.innerHTML = _step2HTML();
  if (currentStep === 3) body.innerHTML = _step3HTML();

  _bindStepEvents();
}

/* Step 1: Category + title */
function _step1HTML() {
  const catOptions = CATEGORIES.map((c, i) => `
    <div class="cat-option ${formData.category === c ? 'selected' : ''}"
         data-cat="${c}" data-color="${CATEGORY_COLORS[i]}"
         style="border-color:${formData.category === c ? CATEGORY_COLORS[i] : 'var(--border)'}">
      ${c}
    </div>
  `).join('');

  return `
    <div class="form-group">
      <label class="form-label">Catégorie</label>
      <div id="cat-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:8px">
        ${catOptions}
      </div>
      <div style="position:relative">
        <input type="text" id="custom-cat" class="form-input"
          placeholder="Ou saisir une catégorie personnalisée"
          value="${!CATEGORIES.includes(formData.category || '') ? (formData.category || '') : ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" for="obj-title">Intitulé de l'objectif</label>
      <input type="text" id="obj-title" class="form-input"
        placeholder="Ex: Courir 3 fois par semaine"
        value="${formData.title || ''}">
    </div>
  `;
}

/* Step 2: Periodicity */
function _step2HTML() {
  const type = formData.periodType || '';
  const fixedDays = formData.fixedDays || [];

  const dayButtons = [1,2,3,4,5,6,0].map(d => { // Mon→Sun
    const labels = ['Lu','Ma','Me','Je','Ve','Sa','Di'];
    const label  = labels[d === 0 ? 6 : d - 1];
    return `<button type="button" class="day-btn ${fixedDays.includes(d) ? 'selected' : ''}" data-day="${d}">${label}</button>`;
  }).join('');

  return `
    <div class="form-group">
      <label class="form-label">Fréquence</label>
      <div style="display:flex;flex-direction:column;gap:8px" id="period-type-group">
        ${_periodOption('weekly',   'Hebdomadaire',       'Une case par semaine',           type === 'weekly')}
        ${_periodOption('monthly',  'Mensuelle',          'Une case par mois',              type === 'monthly')}
        ${_periodOption('fixed_days','Jours fixes / semaine','Choisir des jours précis',    type === 'fixed_days')}
      </div>
    </div>
    <div id="day-picker-wrap" class="form-group" style="display:${type === 'fixed_days' ? 'block' : 'none'}">
      <label class="form-label">Jours de la semaine</label>
      <div class="day-picker">${dayButtons}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Période personnalisée (optionnel)</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label class="form-label" style="font-size:.72rem">Début</label>
          <input type="date" id="obj-start" class="form-input"
            value="${formData.startDate || ''}" min="${toISO(windowStart())}" max="${toISO(windowEnd())}">
        </div>
        <div>
          <label class="form-label" style="font-size:.72rem">Fin</label>
          <input type="date" id="obj-end" class="form-input"
            value="${formData.endDate || ''}" min="${toISO(windowStart())}" max="${toISO(windowEnd())}">
        </div>
      </div>
      <p class="form-hint">Par défaut : fenêtre globale de l'app (prochain lundi → 24 déc.)</p>
    </div>
  `;
}

function _periodOption(value, label, hint, checked) {
  return `
    <label style="display:flex;align-items:center;gap:14px;padding:12px 14px;
      background:var(--bg-elevated);border-radius:var(--radius-md);
      border:1px solid ${checked ? 'var(--accent)' : 'var(--border)'};
      cursor:pointer;transition:border-color .15s" class="period-option">
      <input type="radio" name="period-type" value="${value}" ${checked ? 'checked' : ''}
        style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer">
      <div>
        <div style="font-size:.88rem;font-weight:600">${label}</div>
        <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${hint}</div>
      </div>
    </label>
  `;
}

/* Step 3: Sub-criteria, penalty, review */
function _step3HTML() {
  const sub = formData.periodType !== 'fixed_days'
    ? suggestSubCriteria(formData.category || '', formData.title || '')
    : [];

  const subHTML = sub.length ? `
    <div class="form-group">
      <label class="form-label">Critères indicatifs suggérés</label>
      <div class="sub-criteria" style="margin-bottom:0">
        <p class="sub-criteria-title">Ces points vous aideront à juger si la période est accomplie :</p>
        <div class="sub-criteria-list">
          ${sub.map(s => `<div class="sub-criteria-item">${s}</div>`).join('')}
        </div>
      </div>
      <p class="form-hint">Ces critères sont indicatifs — la validation reste manuelle.</p>
    </div>
  ` : '';

  return `
    ${subHTML}
    <div class="form-group">
      <label class="form-label" for="obj-penalty">Pénalité en cas d'échec (optionnel)</label>
      <textarea id="obj-penalty" class="form-textarea"
        placeholder="Ex: 30 min de sport supplémentaires la semaine suivante"
        rows="3">${formData.penalty || ''}</textarea>
      <p class="form-hint">Affichée comme rappel contextuel si l'objectif est manqué — aucun calcul.</p>
    </div>
    <div class="card" style="margin-bottom:8px;background:var(--accent-dim);border-color:var(--border-accent)">
      <h4 style="color:var(--accent);margin-bottom:8px;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase">Récapitulatif</h4>
      <p style="font-size:.85rem;color:var(--text-primary);margin-bottom:4px;font-weight:600">${formData.title || '—'}</p>
      <p style="font-size:.8rem;color:var(--text-secondary)">${formData.category || '—'} · ${_periodLabel(formData.periodType)}</p>
      <p style="font-size:.78rem;color:var(--text-muted);margin-top:4px">${formData.startDate || '?'} → ${formData.endDate || '?'}</p>
    </div>
  `;
}

function _periodLabel(type) {
  if (type === 'weekly')     return 'Hebdomadaire';
  if (type === 'monthly')    return 'Mensuelle';
  if (type === 'fixed_days') return `Jours fixes (${(formData.fixedDays||[]).map(d => DAY_SHORT[d]).join(', ')})`;
  return '—';
}

/* ---- Event binding ---- */

function _bindEvents() {
  document.getElementById('form-next').onclick = _handleNext;
  document.getElementById('form-back').onclick = _handleBack;
}

function _bindStepEvents() {
  if (currentStep === 1) {
    // Category grid
    document.querySelectorAll('.cat-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.cat-option').forEach(o => {
          o.classList.remove('selected');
          o.style.borderColor = 'var(--border)';
        });
        el.classList.add('selected');
        el.style.borderColor = el.dataset.color;
        formData.category      = el.dataset.cat;
        formData.categoryColor = el.dataset.color;
        document.getElementById('custom-cat').value = '';
      });
    });
    document.getElementById('custom-cat')?.addEventListener('input', e => {
      if (e.target.value) {
        document.querySelectorAll('.cat-option').forEach(o => {
          o.classList.remove('selected');
          o.style.borderColor = 'var(--border)';
        });
        formData.category      = e.target.value;
        formData.categoryColor = '#8a8a8a';
      }
    });
    document.getElementById('obj-title')?.addEventListener('input', e => {
      formData.title = e.target.value;
    });
  }

  if (currentStep === 2) {
    document.querySelectorAll('[name="period-type"]').forEach(radio => {
      radio.addEventListener('change', e => {
        formData.periodType = e.target.value;
        const wrap = document.getElementById('day-picker-wrap');
        wrap.style.display = e.target.value === 'fixed_days' ? 'block' : 'none';
        // Update border colors
        document.querySelectorAll('.period-option').forEach(o => {
          const inp = o.querySelector('input');
          o.style.borderColor = inp.checked ? 'var(--accent)' : 'var(--border)';
        });
      });
    });
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = Number(btn.dataset.day);
        formData.fixedDays = formData.fixedDays || [];
        if (formData.fixedDays.includes(day)) {
          formData.fixedDays = formData.fixedDays.filter(d => d !== day);
          btn.classList.remove('selected');
        } else {
          formData.fixedDays.push(day);
          btn.classList.add('selected');
        }
      });
    });
    document.getElementById('obj-start')?.addEventListener('change', e => {
      formData.startDate = e.target.value;
    });
    document.getElementById('obj-end')?.addEventListener('change', e => {
      formData.endDate = e.target.value;
    });
  }

  if (currentStep === 3) {
    document.getElementById('obj-penalty')?.addEventListener('input', e => {
      formData.penalty = e.target.value;
    });
  }
}

function _handleBack() {
  if (currentStep > 1) { currentStep--; _renderStep(); }
}

async function _handleNext() {
  if (!_validateStep()) return;

  if (currentStep < 3) {
    currentStep++;
    _renderStep();
  } else {
    await _saveObjective();
  }
}

function _validateStep() {
  if (currentStep === 1) {
    const title    = document.getElementById('obj-title')?.value?.trim();
    const category = formData.category || document.getElementById('custom-cat')?.value?.trim();
    if (!category) { toast('Veuillez sélectionner ou saisir une catégorie.', 'error'); return false; }
    if (!title)    { toast('Veuillez saisir un intitulé pour l\'objectif.', 'error'); return false; }
    formData.category = category;
    formData.title    = title;
  }
  if (currentStep === 2) {
    if (!formData.periodType) { toast('Veuillez choisir une fréquence.', 'error'); return false; }
    if (formData.periodType === 'fixed_days' && (!formData.fixedDays || !formData.fixedDays.length)) {
      toast('Veuillez sélectionner au moins un jour.', 'error'); return false;
    }
    if (!formData.startDate) formData.startDate = toISO(windowStart());
    if (!formData.endDate)   formData.endDate   = toISO(windowEnd());
  }
  return true;
}

async function _saveObjective() {
  const obj = {
    id:            editId || crypto.randomUUID(),
    category:      formData.category,
    categoryColor: formData.categoryColor || '#00f0ff',
    title:         formData.title,
    periodType:    formData.periodType,
    fixedDays:     formData.fixedDays || [],
    penalty:       formData.penalty   || '',
    startDate:     formData.startDate,
    endDate:       formData.endDate,
    createdAt:     editId ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString(),
  };

  try {
    await Objectives.save(obj);
    toast(editId ? 'Objectif mis à jour.' : 'Objectif créé.', 'success');
    _closeForm();
    onSaveCallback?.(obj);
  } catch (err) {
    console.error(err);
    toast('Erreur lors de la sauvegarde.', 'error');
  }
}

/* Category option styles */
const catStyle = document.createElement('style');
catStyle.textContent = `
  .cat-option {
    padding: 9px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    font-size: .82rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all .15s;
    text-align: center;
  }
  .cat-option:hover { border-color: var(--border-accent); color: var(--text-primary); }
  .cat-option.selected { color: var(--text-primary); font-weight: 600; }
`;
document.head.appendChild(catStyle);
