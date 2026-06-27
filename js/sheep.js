// ── Sheep SVG library & utilities ──────────────────────────────

// Mini sheep (22x24) — for herd
export const MINI_SHEEP_SVG = `
<svg viewBox="0 0 22 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="14" r="7" fill="#f5f0e8"/>
  <circle cx="8" cy="12" r="4.5" fill="#fffefb"/>
  <circle cx="14" cy="12" r="4.5" fill="#fffefb"/>
  <circle cx="11" cy="11" r="5" fill="#fff"/>
  <ellipse cx="11" cy="7" rx="5.5" ry="5" fill="#5a4a3a"/>
  <circle cx="9" cy="6" r="2" fill="#665544"/>
  <circle cx="13" cy="6" r="2" fill="#665544"/>
  <circle cx="9" cy="7.5" r="1.5" fill="#fff"/>
  <circle cx="13" cy="7.5" r="1.5" fill="#fff"/>
  <circle cx="9.3" cy="7" r="0.7" fill="#1a1410"/>
  <circle cx="13.3" cy="7" r="0.7" fill="#1a1410"/>
  <rect x="7" y="17" width="2.5" height="4" rx="1.2" fill="#4a3c30"/>
  <rect x="12.5" y="17" width="2.5" height="4" rx="1.2" fill="#4a3c30"/>
</svg>`;

// Small sheep (48x53) — for corner logo
export const SMALL_SHEEP_SVG = `
<svg viewBox="0 0 48 53" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sgBody" cx="45%" cy="35%">
      <stop offset="0%" stop-color="#fffefb"/>
      <stop offset="70%" stop-color="#f5f0e8"/>
      <stop offset="100%" stop-color="#e8e0d4"/>
    </radialGradient>
    <radialGradient id="sgHead" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#5a4a3a"/>
      <stop offset="100%" stop-color="#3d3026"/>
    </radialGradient>
    <radialGradient id="sgEar" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#f7c5c5"/>
      <stop offset="100%" stop-color="#e8a0a0"/>
    </radialGradient>
  </defs>
  <g class="sheep-body-cloud">
    <circle cx="24" cy="31" r="10" fill="url(#sgBody)"/>
    <circle cx="17" cy="28" r="6.5" fill="#fffefb"/>
    <circle cx="31" cy="28" r="6.5" fill="#fffefb"/>
    <circle cx="20" cy="24" r="6" fill="#fff"/>
    <circle cx="28" cy="24" r="6" fill="#fff"/>
    <circle cx="24" cy="23" r="7" fill="#fffefb"/>
    <circle cx="16" cy="31" r="5" fill="#f2ede5"/>
    <circle cx="32" cy="31" r="5" fill="#f2ede5"/>
  </g>
  <g class="sheep-tail">
    <circle cx="13" cy="30" r="3.5" fill="#fffefb"/>
    <circle cx="11.5" cy="28.5" r="2.2" fill="#fff"/>
  </g>
  <g class="sheep-head-group">
    <g class="ear-left">
      <ellipse cx="19" cy="13" rx="4" ry="2" fill="url(#sgHead)" transform="rotate(-32 19 13)"/>
      <ellipse cx="19" cy="13" rx="2.2" ry="1.2" fill="url(#sgEar)" transform="rotate(-32 19 13)"/>
    </g>
    <g class="ear-right">
      <ellipse cx="29" cy="13" rx="4" ry="2" fill="url(#sgHead)" transform="rotate(32 29 13)"/>
      <ellipse cx="29" cy="13" rx="2.2" ry="1.2" fill="url(#sgEar)" transform="rotate(32 29 13)"/>
    </g>
    <ellipse cx="24" cy="17" rx="7.5" ry="7" fill="url(#sgHead)"/>
    <circle cx="21" cy="12" r="2.8" fill="#5a4a3a"/>
    <circle cx="24" cy="11" r="3" fill="#665544"/>
    <circle cx="27" cy="12" r="2.8" fill="#5a4a3a"/>
    <g class="eye-blink">
      <circle cx="21.5" cy="16.5" r="2" fill="#fff"/>
      <circle cx="26.5" cy="16.5" r="2" fill="#fff"/>
      <circle cx="22" cy="16" r="1" fill="#1a1410"/>
      <circle cx="27" cy="16" r="1" fill="#1a1410"/>
      <circle cx="22.5" cy="15.5" r="0.5" fill="#fff"/>
      <circle cx="27.5" cy="15.5" r="0.5" fill="#fff"/>
    </g>
    <ellipse cx="19" cy="19" rx="1.5" ry="1" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="29" cy="19" rx="1.5" ry="1" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="24" cy="18.5" rx="1.2" ry="0.9" fill="#2a2018"/>
  </g>
  <rect x="18" y="38" width="2.5" height="5.5" rx="1.2" fill="#4a3c30"/>
  <rect x="27.5" y="38" width="2.5" height="5.5" rx="1.2" fill="#4a3c30"/>
  <rect x="20.5" y="37" width="2.5" height="6" rx="1.2" fill="#3d3026"/>
  <rect x="25" y="37" width="2.5" height="6" rx="1.2" fill="#3d3026"/>
  <ellipse cx="21.75" cy="43" rx="1.5" ry="0.8" fill="#2a2018"/>
  <ellipse cx="26.25" cy="43" rx="1.5" ry="0.8" fill="#2a2018"/>
  <ellipse cx="19.25" cy="43.5" rx="1.5" ry="0.8" fill="#2a2018"/>
  <ellipse cx="28.75" cy="43.5" rx="1.5" ry="0.8" fill="#2a2018"/>
</svg>`;

// Medium sheep (64x70) — for password prompt
export const MEDIUM_SHEEP_SVG = `
<svg viewBox="0 0 64 70" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="mBody" cx="45%" cy="35%">
      <stop offset="0%" stop-color="#fffefb"/>
      <stop offset="70%" stop-color="#f5f0e8"/>
      <stop offset="100%" stop-color="#e8e0d4"/>
    </radialGradient>
    <radialGradient id="mHead" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#5a4a3a"/>
      <stop offset="100%" stop-color="#3d3026"/>
    </radialGradient>
    <radialGradient id="mEar" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#f7c5c5"/>
      <stop offset="100%" stop-color="#e8a0a0"/>
    </radialGradient>
  </defs>
  <g class="sheep-body-cloud">
    <circle cx="32" cy="42" r="13.5" fill="url(#mBody)"/>
    <circle cx="22.5" cy="38" r="8.5" fill="#fffefb"/>
    <circle cx="41.5" cy="38" r="8.5" fill="#fffefb"/>
    <circle cx="26.5" cy="32" r="8" fill="#fff"/>
    <circle cx="37.5" cy="32" r="8" fill="#fff"/>
    <circle cx="32" cy="31" r="9" fill="#fffefb"/>
    <circle cx="21" cy="42" r="6.5" fill="#f2ede5"/>
    <circle cx="43" cy="42" r="6.5" fill="#f2ede5"/>
    <circle cx="24.5" cy="46" r="6" fill="#ede6db"/>
    <circle cx="39.5" cy="46" r="6" fill="#ede6db"/>
  </g>
  <g class="sheep-tail">
    <circle cx="17.5" cy="40" r="4.5" fill="#fffefb"/>
    <circle cx="15.5" cy="38" r="3" fill="#fff"/>
  </g>
  <g class="sheep-head-group">
    <g class="ear-left">
      <ellipse cx="25" cy="17.5" rx="5" ry="2.5" fill="url(#mHead)" transform="rotate(-32 25 17.5)"/>
      <ellipse cx="25" cy="17.5" rx="3" ry="1.5" fill="url(#mEar)" transform="rotate(-32 25 17.5)"/>
    </g>
    <g class="ear-right">
      <ellipse cx="39" cy="17.5" rx="5" ry="2.5" fill="url(#mHead)" transform="rotate(32 39 17.5)"/>
      <ellipse cx="39" cy="17.5" rx="3" ry="1.5" fill="url(#mEar)" transform="rotate(32 39 17.5)"/>
    </g>
    <ellipse cx="32" cy="23" rx="10" ry="9" fill="url(#mHead)"/>
    <circle cx="28" cy="16" r="3.5" fill="#5a4a3a"/>
    <circle cx="32" cy="15" r="4" fill="#665544"/>
    <circle cx="36" cy="16" r="3.5" fill="#5a4a3a"/>
    <g class="eye-blink">
      <circle cx="28.5" cy="23" r="2.5" fill="#fff"/>
      <circle cx="35.5" cy="23" r="2.5" fill="#fff"/>
      <circle cx="29" cy="22.5" r="1.3" fill="#1a1410"/>
      <circle cx="36" cy="22.5" r="1.3" fill="#1a1410"/>
      <circle cx="30" cy="21.5" r="0.6" fill="#fff"/>
      <circle cx="28" cy="23" r="0.3" fill="#fff"/>
      <circle cx="37" cy="21.5" r="0.6" fill="#fff"/>
      <circle cx="35" cy="23" r="0.3" fill="#fff"/>
    </g>
    <ellipse cx="25" cy="25.5" rx="2" ry="1.3" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="39" cy="25.5" rx="2" ry="1.3" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="32" cy="24.5" rx="1.8" ry="1.2" fill="#2a2018"/>
    <path d="M30.5 26 Q32 27.5 33.5 26" stroke="#2a2018" stroke-width="0.4" fill="none" stroke-linecap="round"/>
  </g>
  <rect class="leg-back-left" x="23.5" y="51" width="3.2" height="7" rx="1.6" fill="#4a3c30"/>
  <rect class="leg-back-right" x="37.3" y="51" width="3.2" height="7" rx="1.6" fill="#4a3c30"/>
  <rect class="leg-front-left" x="26.8" y="50.5" width="3.2" height="7.5" rx="1.6" fill="#3d3026"/>
  <rect class="leg-front-right" x="34" y="50.5" width="3.2" height="7.5" rx="1.6" fill="#3d3026"/>
  <ellipse cx="28.4" cy="58" rx="1.8" ry="1" fill="#2a2018"/>
  <ellipse cx="35.6" cy="58" rx="1.8" ry="1" fill="#2a2018"/>
  <ellipse cx="25.1" cy="58.5" rx="1.8" ry="1" fill="#2a2018"/>
  <ellipse cx="38.9" cy="58.5" rx="1.8" ry="1" fill="#2a2018"/>
</svg>`;

// Loading sheep (120x132) — larger, animated jumping
export const LOADING_SHEEP_SVG = `
<svg viewBox="0 0 120 132" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="lBody" cx="45%" cy="35%">
      <stop offset="0%" stop-color="#fffefb"/>
      <stop offset="70%" stop-color="#f5f0e8"/>
      <stop offset="100%" stop-color="#e8e0d4"/>
    </radialGradient>
    <radialGradient id="lHead" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#5a4a3a"/>
      <stop offset="100%" stop-color="#3d3026"/>
    </radialGradient>
    <radialGradient id="lEar" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#f7c5c5"/>
      <stop offset="100%" stop-color="#e8a0a0"/>
    </radialGradient>
  </defs>
  <g class="sheep-body-cloud">
    <circle cx="60" cy="78" r="25" fill="url(#lBody)"/>
    <circle cx="42" cy="70" r="16" fill="#fffefb"/>
    <circle cx="78" cy="70" r="16" fill="#fffefb"/>
    <circle cx="50" cy="60" r="15" fill="#fff"/>
    <circle cx="70" cy="60" r="15" fill="#fff"/>
    <circle cx="60" cy="57" r="17" fill="#fffefb"/>
    <circle cx="39" cy="78" r="12" fill="#f2ede5"/>
    <circle cx="81" cy="78" r="12" fill="#f2ede5"/>
    <circle cx="46" cy="86" r="11" fill="#ede6db"/>
    <circle cx="74" cy="86" r="11" fill="#ede6db"/>
  </g>
  <g class="sheep-tail">
    <circle cx="33" cy="75" r="8" fill="#fffefb"/>
    <circle cx="30" cy="71" r="5.5" fill="#fff"/>
  </g>
  <g class="sheep-head-group">
    <g class="ear-left">
      <ellipse cx="47" cy="33" rx="9" ry="5" fill="url(#lHead)" transform="rotate(-32 47 33)"/>
      <ellipse cx="47" cy="33" rx="5.5" ry="3" fill="url(#lEar)" transform="rotate(-32 47 33)"/>
    </g>
    <g class="ear-right">
      <ellipse cx="73" cy="33" rx="9" ry="5" fill="url(#lHead)" transform="rotate(32 73 33)"/>
      <ellipse cx="73" cy="33" rx="5.5" ry="3" fill="url(#lEar)" transform="rotate(32 73 33)"/>
    </g>
    <ellipse cx="60" cy="43" rx="18" ry="17" fill="url(#lHead)"/>
    <circle cx="53" cy="30" r="6.5" fill="#5a4a3a"/>
    <circle cx="60" cy="27" r="7" fill="#665544"/>
    <circle cx="67" cy="30" r="6.5" fill="#5a4a3a"/>
    <g class="eye-blink">
      <circle cx="54" cy="43" r="4.5" fill="#fff"/>
      <circle cx="66" cy="43" r="4.5" fill="#fff"/>
      <circle cx="55" cy="42" r="2.5" fill="#1a1410"/>
      <circle cx="67" cy="42" r="2.5" fill="#1a1410"/>
      <circle cx="56.5" cy="40" r="1.1" fill="#fff"/>
      <circle cx="53" cy="43.5" r="0.6" fill="#fff"/>
      <circle cx="68.5" cy="40" r="1.1" fill="#fff"/>
      <circle cx="65" cy="43.5" r="0.6" fill="#fff"/>
    </g>
    <ellipse cx="48" cy="47" rx="3.5" ry="2.5" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="72" cy="47" rx="3.5" ry="2.5" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="60" cy="46" rx="3" ry="2.2" fill="#2a2018"/>
    <path d="M57.5 49 Q60 52 62.5 49" stroke="#2a2018" stroke-width="0.8" fill="none" stroke-linecap="round"/>
  </g>
  <rect class="leg-back-left" x="44" y="96" width="6" height="14" rx="3" fill="#4a3c30"/>
  <rect class="leg-back-right" x="70" y="96" width="6" height="14" rx="3" fill="#4a3c30"/>
  <rect class="leg-front-left" x="50" y="94" width="6" height="15" rx="3" fill="#3d3026"/>
  <rect class="leg-front-right" x="64" y="94" width="6" height="15" rx="3" fill="#3d3026"/>
  <ellipse cx="53" cy="109" rx="3.5" ry="2" fill="#2a2018"/>
  <ellipse cx="67" cy="109" rx="3.5" ry="2" fill="#2a2018"/>
  <ellipse cx="47" cy="110" rx="3.5" ry="2" fill="#2a2018"/>
  <ellipse cx="73" cy="110" rx="3.5" ry="2" fill="#2a2018"/>
</svg>`;

// Favicon sheep head (32x32)
export const FAVICON_SVG = `
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="16" cy="18" rx="11" ry="10" fill="#5a4a3a"/>
  <circle cx="13" cy="13" r="4" fill="#5a4a3a"/>
  <circle cx="16" cy="11.5" r="4.5" fill="#665544"/>
  <circle cx="19" cy="13" r="4" fill="#5a4a3a"/>
  <ellipse cx="13" cy="10" rx="3" ry="2" fill="#f7c5c5"/>
  <ellipse cx="19" cy="10" rx="3" ry="2" fill="#f7c5c5"/>
  <circle cx="14" cy="18" r="3" fill="#fff"/>
  <circle cx="18" cy="18" r="3" fill="#fff"/>
  <circle cx="14.5" cy="17.5" r="1.5" fill="#1a1410"/>
  <circle cx="18.5" cy="17.5" r="1.5" fill="#1a1410"/>
  <circle cx="15.2" cy="16.5" r="0.6" fill="#fff"/>
  <circle cx="19.2" cy="16.5" r="0.6" fill="#fff"/>
  <ellipse cx="12.5" cy="20.5" rx="1.5" ry="1" fill="#e8a0a0" opacity="0.5"/>
  <ellipse cx="19.5" cy="20.5" rx="1.5" ry="1" fill="#e8a0a0" opacity="0.5"/>
  <ellipse cx="16" cy="19.5" rx="1.2" ry="0.8" fill="#2a2018"/>
</svg>`;

// Empty state sheep (80x88) — slightly tilted, looking around
export const EMPTY_SHEEP_SVG = `
<svg viewBox="0 0 80 88" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="eBody" cx="45%" cy="35%">
      <stop offset="0%" stop-color="#fffefb"/>
      <stop offset="70%" stop-color="#f5f0e8"/>
      <stop offset="100%" stop-color="#e8e0d4"/>
    </radialGradient>
    <radialGradient id="eHead" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#5a4a3a"/>
      <stop offset="100%" stop-color="#3d3026"/>
    </radialGradient>
    <radialGradient id="eEar" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#f7c5c5"/>
      <stop offset="100%" stop-color="#e8a0a0"/>
    </radialGradient>
  </defs>
  <g class="sheep-body-cloud">
    <circle cx="40" cy="52" r="17" fill="url(#eBody)"/>
    <circle cx="28" cy="46" r="11" fill="#fffefb"/>
    <circle cx="52" cy="46" r="11" fill="#fffefb"/>
    <circle cx="33" cy="40" r="10" fill="#fff"/>
    <circle cx="47" cy="40" r="10" fill="#fff"/>
    <circle cx="40" cy="38" r="11.5" fill="#fffefb"/>
    <circle cx="26" cy="52" r="8" fill="#f2ede5"/>
    <circle cx="54" cy="52" r="8" fill="#f2ede5"/>
  </g>
  <g class="sheep-tail">
    <circle cx="22" cy="50" r="5.5" fill="#fffefb"/>
    <circle cx="20" cy="47" r="3.5" fill="#fff"/>
  </g>
  <g class="sheep-head-group" style="transform: rotate(6deg)">
    <g class="ear-left">
      <ellipse cx="31" cy="22" rx="6" ry="3.5" fill="url(#eHead)" transform="rotate(-28 31 22)"/>
      <ellipse cx="31" cy="22" rx="3.5" ry="2" fill="url(#eEar)" transform="rotate(-28 31 22)"/>
    </g>
    <g class="ear-right">
      <ellipse cx="49" cy="22" rx="6" ry="3.5" fill="url(#eHead)" transform="rotate(28 49 22)"/>
      <ellipse cx="49" cy="22" rx="3.5" ry="2" fill="url(#eEar)" transform="rotate(28 49 22)"/>
    </g>
    <ellipse cx="40" cy="28" rx="12" ry="11" fill="url(#eHead)"/>
    <circle cx="35" cy="20" r="4.5" fill="#5a4a3a"/>
    <circle cx="40" cy="18.5" r="5" fill="#665544"/>
    <circle cx="45" cy="20" r="4.5" fill="#5a4a3a"/>
    <g class="eye-blink">
      <circle cx="36" cy="28" r="3" fill="#fff"/>
      <circle cx="44" cy="28" r="3" fill="#fff"/>
      <circle cx="36.5" cy="27.5" r="1.8" fill="#1a1410"/>
      <circle cx="44.5" cy="27.5" r="1.8" fill="#1a1410"/>
      <circle cx="37.5" cy="26" r="0.8" fill="#fff"/>
      <circle cx="45.5" cy="26" r="0.8" fill="#fff"/>
    </g>
    <ellipse cx="32" cy="31" rx="2.5" ry="1.5" fill="#e8a0a0" opacity="0.4"/>
    <ellipse cx="48" cy="31" rx="2.5" ry="1.5" fill="#e8a0a0" opacity="0.4"/>
    <ellipse cx="40" cy="30" rx="2" ry="1.3" fill="#2a2018"/>
    <path d="M38 31.5 Q40 33 42 31.5" stroke="#2a2018" stroke-width="0.6" fill="none" stroke-linecap="round"/>
  </g>
  <rect x="31" y="63" width="4" height="9" rx="2" fill="#4a3c30"/>
  <rect x="45" y="63" width="4" height="9" rx="2" fill="#4a3c30"/>
  <rect x="35" y="62" width="4" height="10" rx="2" fill="#3d3026"/>
  <rect x="41" y="62" width="4" height="10" rx="2" fill="#3d3026"/>
</svg>`;

// ── Corner sheep helper ─────────────────────────────────────────

export function initCornerSheep() {
  const el = document.createElement("div");
  el.className = "corner-sheep";
  el.title = "🐑";
  el.innerHTML = SMALL_SHEEP_SVG;
  el.addEventListener("click", () => {
    burstSheep(el);
  });
  document.body.appendChild(el);
}

// ── Herd helper ─────────────────────────────────────────────────

let herdTimer = null;

export function initSheepHerd(intervalMs = 25000) {
  function runHerd() {
    const container = document.createElement("div");
    container.className = "herd-container";
    const count = 8 + Math.floor(Math.random() * 12);
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "herd-sheep";
      s.innerHTML = MINI_SHEEP_SVG;
      s.style.animationDelay = (Math.random() * 0.3) + "s";
      container.appendChild(s);
    }
    document.body.appendChild(container);
    container.addEventListener("animationend", () => container.remove());
  }

  runHerd();
  herdTimer = setInterval(runHerd, intervalMs);
}

// ── Burst sheep on click ────────────────────────────────────────

export function burstSheep(sourceEl) {
  const rect = sourceEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 5; i++) {
    const burst = document.createElement("div");
    burst.className = "sheep-sparkle-burst";
    burst.style.left = cx + "px";
    burst.style.top = cy + "px";
    burst.style.animationDelay = (i * 0.08) + "s";
    const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
    burst.style.setProperty("--angle", angle);
    burst.innerHTML = MINI_SHEEP_SVG;
    document.body.appendChild(burst);
    burst.addEventListener("animationend", () => burst.remove());
  }
}

// ── Loading sheep ───────────────────────────────────────────────

let loadingEl = null;

export function showLoadingSheep() {
  if (loadingEl) return;
  loadingEl = document.createElement("div");
  loadingEl.className = "loading-sheep-overlay";
  loadingEl.innerHTML = `
    <div class="loading-sheep">${LOADING_SHEEP_SVG}</div>
    <div class="loading-sheep-text">小羊奔跑中<span class="loading-sheep-dots"></span></div>
  `;
  // animate dots
  let dots = 0;
  const dotEl = loadingEl.querySelector(".loading-sheep-dots");
  const dotTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    dotEl.textContent = ".".repeat(dots);
  }, 400);
  loadingEl._dotTimer = dotTimer;
  document.body.appendChild(loadingEl);
}

export function hideLoadingSheep() {
  if (!loadingEl) return;
  clearInterval(loadingEl._dotTimer);
  loadingEl.classList.add("hidden");
  setTimeout(() => {
    if (loadingEl) { loadingEl.remove(); loadingEl = null; }
  }, 300);
}
