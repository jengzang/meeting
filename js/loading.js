// ── Page Navigation Loading Screen ──────────────────────────
// Works with inline .page-loading-overlay in each page's <body>.

const STORAGE_KEY = '__sheep_nav_loading';
const OVERLAY_ID = 'pageLoadingOverlay';

function getOverlay() {
  return document.getElementById(OVERLAY_ID);
}

export function signalNavLoading() {
  try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
}

export function activateLoadingOverlay() {
  const overlay = getOverlay();
  if (!overlay) return false;

  let shouldLoad = false;
  try {
    shouldLoad = sessionStorage.getItem(STORAGE_KEY) === '1';
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}

  if (shouldLoad) {
    overlay.classList.remove('hidden');
    startDots(overlay);
    return true;
  } else {
    overlay.classList.add('hidden');
    setTimeout(function() {
      if (overlay.parentNode) overlay.classList.add('removed');
    }, 400);
    return false;
  }
}

export function finishLoading() {
  const overlay = getOverlay();
  if (!overlay || overlay.classList.contains('hidden')) return;
  stopDots(overlay);
  overlay.classList.add('hidden');
  setTimeout(function() {
    if (overlay.parentNode) overlay.classList.add('removed');
  }, 400);
}

function startDots(overlay) {
  const dotsEl = overlay.querySelector('.page-loading-dots');
  if (!dotsEl) return;
  let count = 0;
  const timer = setInterval(function() {
    count = (count + 1) % 4;
    dotsEl.textContent = '.'.repeat(count);
  }, 400);
  overlay._dotTimer = timer;
}

function stopDots(overlay) {
  if (overlay._dotTimer) {
    clearInterval(overlay._dotTimer);
    overlay._dotTimer = null;
  }
}
