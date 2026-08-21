/**
 * pwa.js — PWA install banner & service worker registration
 */

let deferredPrompt = null;

export function initPWA() {
  _registerServiceWorker();
  _initInstallBanner();
}

/* ---- Service Worker ---- */

function _registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.warn('SW registration failed:', err));
    });
  }
}

/* ---- Install Banner ---- */

function _initInstallBanner() {
  // Catch the deferred prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.__installPrompt__ = e;
    _showBannerAfterDelay();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.__installPrompt__ = null;
    _hideBanner();
  });

  // iOS detection: show manual instructions if not in standalone
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone;

  if (isIOS && !isStandalone) {
    _showIOSBanner();
  }
}

function _showBannerAfterDelay() {
  // Only show if user hasn't dismissed
  const dismissed = sessionStorage.getItem('install-dismissed');
  if (dismissed) return;

  setTimeout(_showAndroidBanner, 8000); // show after 8s
}

function _showAndroidBanner() {
  const existing = document.getElementById('install-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  banner.innerHTML = `
    <img src="images/logo.png" class="install-banner-icon" alt="Be Better">
    <div class="install-banner-text">
      <strong>Installer Be Better</strong>
      <span>Accès rapide depuis l'écran d'accueil</span>
    </div>
    <div class="install-banner-actions">
      <button class="install-btn install-btn-primary" id="install-accept">Installer</button>
      <button class="install-btn install-btn-close" id="install-dismiss">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('show'));
  });

  document.getElementById('install-accept').onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    window.__installPrompt__ = null;
    _hideBanner();
  };

  document.getElementById('install-dismiss').onclick = () => {
    sessionStorage.setItem('install-dismissed', '1');
    _hideBanner();
  };
}

function _showIOSBanner() {
  const dismissed = sessionStorage.getItem('install-dismissed');
  if (dismissed) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  banner.innerHTML = `
    <div class="install-banner-icon">${_iosShareIcon()}</div>
    <div class="install-banner-text">
      <strong>Installer sur iOS</strong>
      <span>Appuyez sur Partager puis "Sur l'écran d'accueil"</span>
    </div>
    <div class="install-banner-actions">
      <button class="install-btn install-btn-close" id="install-dismiss">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  setTimeout(() => {
    requestAnimationFrame(() => banner.classList.add('show'));
  }, 10000);

  document.getElementById('install-dismiss').onclick = () => {
    sessionStorage.setItem('install-dismissed', '1');
    _hideBanner();
  };
}

function _hideBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 300);
  }
}

function _iosShareIcon() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>`;
}
