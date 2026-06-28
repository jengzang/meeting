import { initCornerSheep, initTransitions } from "./sheep.js";
import { finishLoading } from "./loading.js";

// ── Page loading overlay ──────────────────────────
(function () {
  var o = document.getElementById("pageLoadingOverlay");
  if (!o) return;
  var s = false;
  try {
    s = sessionStorage.getItem("__sheep_nav_loading") === "1";
    sessionStorage.removeItem("__sheep_nav_loading");
  } catch (e) {}
  if (s) {
    o.classList.remove("hidden");
    var d = o.querySelector(".page-loading-dots");
    if (d) {
      var c = 0;
      o._dt = setInterval(function () {
        c = (c + 1) % 4;
        d.textContent = ".".repeat(c);
      }, 400);
    }
  } else {
    o.classList.add("hidden");
    setTimeout(function () {
      o.parentNode && o.classList.add("removed");
    }, 400);
  }
})();

// ── Intro sheep ──────────────────────────────────
export function initIntroSheep(timeout) {
  var overlay = document.getElementById("introOverlay");
  var msgEl = document.getElementById("introMessage");
  function hide() {
    overlay && overlay.classList.add("hide");
    if (msgEl) msgEl.textContent = "";
  }
  setTimeout(hide, timeout || 2000);
  overlay && overlay.addEventListener("click", hide);
  window.showIntroSheep = function (msg, duration) {
    if (!overlay) return;
    if (msgEl && msg) msgEl.textContent = msg;
    overlay.classList.remove("hide");
    setTimeout(hide, duration || 2500);
  };
}

// ── Shared init ──────────────────────────────────
export function initAll(opt) {
  opt = opt || {};
  initIntroSheep(opt.introTimeout);
  initCornerSheep();
  initTransitions();
  if (opt.finish !== false) finishLoading();
}
