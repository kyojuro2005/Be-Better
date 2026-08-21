/**
 * ui.js — UI helpers: toast, modal, confirm dialog, ring chart
 */

import { icon } from './icons.js';

/* ---- Toast ---- */
let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

export function toast(message, type = 'default', duration = 3000) {
  ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 300ms ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ---- Modal / Sheet ---- */
export function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/** Close modal when clicking the overlay backdrop */
export function initModalBackdrop(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });
}

/* ---- Confirm dialog ---- */
export function confirm(message, onConfirm, onCancel) {
  const existing = document.getElementById('confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="sheet" style="padding-top:0">
      <div class="sheet-handle"></div>
      <div style="padding:0 4px">
        <h3 style="margin-bottom:10px">Confirmation</h3>
        <p style="font-size:.88rem;color:var(--text-secondary)">${message}</p>
        <div class="confirm-actions">
          <button id="confirm-cancel" class="btn btn-secondary">Annuler</button>
          <button id="confirm-ok" class="btn btn-danger">Supprimer</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 300);
  }

  overlay.querySelector('#confirm-cancel').onclick = () => { close(); onCancel?.(); };
  overlay.querySelector('#confirm-ok').onclick     = () => { close(); onConfirm?.(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) { close(); onCancel?.(); } });

  document.body.style.overflow = 'hidden';
}

/* ---- SVG Ring (progress circle) ---- */
/**
 * Create an SVG ring progress indicator.
 * @param {number} percent - 0 to 100
 * @param {number} size    - diameter in px
 * @param {string} color   - CSS variable or hex
 * @param {string} label   - centre label text
 */
export function renderRing(percent, size = 80, colorVar = 'var(--accent)', label = '') {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return `
    <div class="ring-container" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}"
          fill="none" stroke="var(--bg-elevated)" stroke-width="6"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}"
          fill="none" stroke="${colorVar}" stroke-width="6"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          stroke-linecap="round"
          transform="rotate(-90 ${size/2} ${size/2})"
          style="transition:stroke-dashoffset 0.6s ease"/>
      </svg>
      ${label ? `<div class="ring-label" style="font-size:${size < 60 ? '0.65' : '0.8'}rem">${label}</div>` : ''}
    </div>
  `;
}

/* ---- Active view management ---- */
export function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(`view-${id}`);
  if (view) view.classList.add('active');

  const nav = document.querySelector(`.nav-item[data-view="${id}"]`);
  if (nav) nav.classList.add('active');
}
