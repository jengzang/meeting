// ── Sheep SVG library & utilities ──────────────────────────────

// Unique ID counter for SVG gradients (avoid collisions)
let _uid = 0;
const uid = () => ++_uid;

// Helper: build a sheep SVG with unique gradient IDs
function sheepSVG(viewBox, bodyCX, bodyCY, bodyR, headCX, headCY, headRX, headRY, config = {}) {

  const {
    tilt = 0,           // head tilt degrees
    eyeShape = 'round', // 'round' | 'happy' | 'sleepy'
    mouth = 'smile',    // 'smile' | 'open' | 'none'
    fluffExtra = false, // extra fluff circles
    earFlop = false,    // droopy ears
    tailUp = false,     // tail pointing up
    legPose = 'stand',  // 'stand' | 'walk'
  } = config;

  const bid = `b${uid()}`;
  const hid = `h${uid()}`;
  const eid = `e${uid()}`;

  const [vw, vh] = viewBox.split(' ').slice(2).map(Number);

  // Body fluff
  const fluff = [];
  const s = bodyR;
  fluff.push(`<circle cx="${bodyCX}" cy="${bodyCY}" r="${s}" fill="url(#${bid})"/>`);
  fluff.push(`<circle cx="${bodyCX - s*0.45}" cy="${bodyCY - s*0.3}" r="${s*0.65}" fill="#fffefb"/>`);
  fluff.push(`<circle cx="${bodyCX + s*0.45}" cy="${bodyCY - s*0.3}" r="${s*0.65}" fill="#fffefb"/>`);
  fluff.push(`<circle cx="${bodyCX - s*0.25}" cy="${bodyCY - s*0.5}" r="${s*0.6}" fill="#fff"/>`);
  fluff.push(`<circle cx="${bodyCX + s*0.25}" cy="${bodyCY - s*0.5}" r="${s*0.6}" fill="#fff"/>`);
  fluff.push(`<circle cx="${bodyCX}" cy="${bodyCY - s*0.55}" r="${s*0.7}" fill="#fffefb"/>`);
  fluff.push(`<circle cx="${bodyCX - s*0.55}" cy="${bodyCY + s*0.05}" r="${s*0.5}" fill="#f2ede5"/>`);
  fluff.push(`<circle cx="${bodyCX + s*0.55}" cy="${bodyCY + s*0.05}" r="${s*0.5}" fill="#f2ede5"/>`);
  if (fluffExtra) {
    fluff.push(`<circle cx="${bodyCX - s*0.15}" cy="${bodyCY + s*0.3}" r="${s*0.45}" fill="#ede6db"/>`);
    fluff.push(`<circle cx="${bodyCX + s*0.15}" cy="${bodyCY + s*0.3}" r="${s*0.45}" fill="#ede6db"/>`);
    fluff.push(`<circle cx="${bodyCX}" cy="${bodyCY - s*0.7}" r="${s*0.4}" fill="#fff"/>`);
  }

  // Tail
  const tailX = bodyCX - bodyR * 0.8;
  const tailY = bodyCY - bodyR * 0.1;
  const tail = tailUp
    ? `<circle cx="${tailX - 2}" cy="${tailY - 6}" r="${s*0.28}" fill="#fffefb"/>
       <circle cx="${tailX - 3}" cy="${tailY - 8}" r="${s*0.18}" fill="#fff"/>`
    : `<circle cx="${tailX}" cy="${tailY}" r="${s*0.35}" fill="#fffefb"/>
       <circle cx="${tailX - 1.5}" cy="${tailY - 1.5}" r="${s*0.22}" fill="#fff"/>`;

  // Ears
  const earAngle = earFlop ? 55 : 32;
  const earRX = s * 0.4;
  const earRY = s * 0.22;
  const earL = earFlop
    ? `<ellipse cx="${headCX - headRX*0.35}" cy="${headCY - headRY*0.9}" rx="${earRX}" ry="${earRY}" fill="url(#${hid})" transform="rotate(${earAngle} ${headCX - headRX*0.35} ${headCY - headRY*0.9})"/>`
    : `<ellipse cx="${headCX - headRX*0.35}" cy="${headCY - headRY*0.8}" rx="${earRX}" ry="${earRY}" fill="url(#${hid})" transform="rotate(-${earAngle} ${headCX - headRX*0.35} ${headCY - headRY*0.8})"/>
       <ellipse cx="${headCX - headRX*0.35}" cy="${headCY - headRY*0.8}" rx="${earRX*0.55}" ry="${earRY*0.55}" fill="url(#${eid})" transform="rotate(-${earAngle} ${headCX - headRX*0.35} ${headCY - headRY*0.8})"/>`;
  const earR = earFlop
    ? `<ellipse cx="${headCX + headRX*0.35}" cy="${headCY - headRY*0.9}" rx="${earRX}" ry="${earRY}" fill="url(#${hid})" transform="rotate(-${earAngle} ${headCX + headRX*0.35} ${headCY - headRY*0.9})"/>`
    : `<ellipse cx="${headCX + headRX*0.35}" cy="${headCY - headRY*0.8}" rx="${earRX}" ry="${earRY}" fill="url(#${hid})" transform="rotate(${earAngle} ${headCX + headRX*0.35} ${headCY - headRY*0.8})"/>
       <ellipse cx="${headCX + headRX*0.35}" cy="${headCY - headRY*0.8}" rx="${earRX*0.55}" ry="${earRY*0.55}" fill="url(#${eid})" transform="rotate(${earAngle} ${headCX + headRX*0.35} ${headCY - headRY*0.8})"/>`;

  // Eyes
  const eyeY = headCY + headRY * 0.05;
  const eyeOffX = headRX * 0.35;
  const eyeR = headRY * 0.28;
  let eyes;
  if (eyeShape === 'happy') {
    // ^ ^ happy squints
    eyes = `<path d="M${headCX - eyeOffX - eyeR} ${eyeY} Q${headCX - eyeOffX} ${eyeY - eyeR*1.3} ${headCX - eyeOffX + eyeR} ${eyeY}" stroke="#1a1410" stroke-width="${eyeR*0.35}" fill="none" stroke-linecap="round"/>
            <path d="M${headCX + eyeOffX - eyeR} ${eyeY} Q${headCX + eyeOffX} ${eyeY - eyeR*1.3} ${headCX + eyeOffX + eyeR} ${eyeY}" stroke="#1a1410" stroke-width="${eyeR*0.35}" fill="none" stroke-linecap="round"/>`;
  } else if (eyeShape === 'sleepy') {
    // sleepy half-closed
    eyes = `<ellipse cx="${headCX - eyeOffX}" cy="${eyeY}" rx="${eyeR}" ry="${eyeR*0.4}" fill="#1a1410"/>
            <ellipse cx="${headCX + eyeOffX}" cy="${eyeY}" rx="${eyeR}" ry="${eyeR*0.4}" fill="#1a1410"/>`;
  } else {
    // round normal eyes
    eyes = `<circle cx="${headCX - eyeOffX}" cy="${eyeY}" r="${eyeR}" fill="#fff"/>
            <circle cx="${headCX + eyeOffX}" cy="${eyeY}" r="${eyeR}" fill="#fff"/>
            <circle cx="${headCX - eyeOffX + eyeR*0.15}" cy="${eyeY - eyeR*0.1}" r="${eyeR*0.5}" fill="#1a1410"/>
            <circle cx="${headCX + eyeOffX + eyeR*0.15}" cy="${eyeY - eyeR*0.1}" r="${eyeR*0.5}" fill="#1a1410"/>
            <circle cx="${headCX - eyeOffX + eyeR*0.35}" cy="${eyeY - eyeR*0.4}" r="${eyeR*0.22}" fill="#fff"/>
            <circle cx="${headCX + eyeOffX + eyeR*0.35}" cy="${eyeY - eyeR*0.4}" r="${eyeR*0.22}" fill="#fff"/>`;
  }

  // Mouth
  let mouthStr = '';
  if (mouth === 'smile') {
    mouthStr = `<path d="M${headCX - headRX*0.12} ${headCY + headRY*0.25} Q${headCX} ${headCY + headRY*0.5} ${headCX + headRX*0.12} ${headCY + headRY*0.25}" stroke="#2a2018" stroke-width="${headRY*0.08}" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'open') {
    mouthStr = `<ellipse cx="${headCX}" cy="${headCY + headRY*0.3}" rx="${headRX*0.1}" ry="${headRY*0.15}" fill="#2a2018"/>`;
  }

  // Legs
  const legW = bodyR * 0.2;
  const legH = bodyR * 0.55;
  let legs;
  if (legPose === 'walk') {
    const lrx = legW * 0.5;
    legs = `<rect x="${bodyCX - bodyR*0.5}" y="${bodyCY + bodyR*0.6}" width="${legW}" height="${legH}" rx="${lrx}" fill="#4a3c30" transform="rotate(-12 ${bodyCX - bodyR*0.5} ${bodyCY + bodyR*0.6})"/>
            <rect x="${bodyCX + bodyR*0.3}" y="${bodyCY + bodyR*0.6}" width="${legW}" height="${legH}" rx="${lrx}" fill="#4a3c30" transform="rotate(12 ${bodyCX + bodyR*0.3} ${bodyCY + bodyR*0.6})"/>
            <rect x="${bodyCX - bodyR*0.25}" y="${bodyCY + bodyR*0.55}" width="${legW}" height="${legH*1.05}" rx="${lrx}" fill="#3d3026" transform="rotate(10 ${bodyCX - bodyR*0.25} ${bodyCY + bodyR*0.55})"/>
            <rect x="${bodyCX + bodyR*0.05}" y="${bodyCY + bodyR*0.55}" width="${legW}" height="${legH*1.05}" rx="${lrx}" fill="#3d3026" transform="rotate(-10 ${bodyCX + bodyR*0.05} ${bodyCY + bodyR*0.55})"/>`;
  } else {
    const lrx = legW * 0.5;
    legs = `<rect x="${bodyCX - bodyR*0.45}" y="${bodyCY + bodyR*0.6}" width="${legW}" height="${legH}" rx="${lrx}" fill="#4a3c30"/>
            <rect x="${bodyCX + bodyR*0.25}" y="${bodyCY + bodyR*0.6}" width="${legW}" height="${legH}" rx="${lrx}" fill="#4a3c30"/>
            <rect x="${bodyCX - bodyR*0.22}" y="${bodyCY + bodyR*0.55}" width="${legW}" height="${legH*1.05}" rx="${lrx}" fill="#3d3026"/>
            <rect x="${bodyCX + bodyR*0.02}" y="${bodyCY + bodyR*0.55}" width="${legW}" height="${legH*1.05}" rx="${lrx}" fill="#3d3026"/>`;
  }

  return `
<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${bid}" cx="45%" cy="35%">
      <stop offset="0%" stop-color="#fffefb"/>
      <stop offset="70%" stop-color="#f5f0e8"/>
      <stop offset="100%" stop-color="#e8e0d4"/>
    </radialGradient>
    <radialGradient id="${hid}" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#5a4a3a"/>
      <stop offset="100%" stop-color="#3d3026"/>
    </radialGradient>
    <radialGradient id="${eid}" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#f7c5c5"/>
      <stop offset="100%" stop-color="#e8a0a0"/>
    </radialGradient>
  </defs>
  <g>${fluff.join('')}</g>
  <g>${tail}</g>
  <g transform="rotate(${tilt} ${headCX} ${headCY})">
    ${earFlop ? earL : earL}
    ${earFlop ? earR : earR}
    <ellipse cx="${headCX}" cy="${headCY}" rx="${headRX}" ry="${headRY}" fill="url(#${hid})"/>
    <circle cx="${headCX - headRX*0.38}" cy="${headCY - headRY*0.65}" r="${headRY*0.38}" fill="#5a4a3a"/>
    <circle cx="${headCX}" cy="${headCY - headRY*0.72}" r="${headRY*0.44}" fill="#665544"/>
    <circle cx="${headCX + headRX*0.38}" cy="${headCY - headRY*0.65}" r="${headRY*0.38}" fill="#5a4a3a"/>
    ${eyes}
    <ellipse cx="${headCX - headRX*0.55}" cy="${headCY + headRY*0.3}" rx="${headRX*0.18}" ry="${headRY*0.14}" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="${headCX + headRX*0.55}" cy="${headCY + headRY*0.3}" rx="${headRX*0.18}" ry="${headRY*0.14}" fill="#e8a0a0" opacity="0.45"/>
    <ellipse cx="${headCX}" cy="${headCY + headRY*0.2}" rx="${headRX*0.14}" ry="${headRY*0.13}" fill="#2a2018"/>
    ${mouthStr}
  </g>
  ${legs}
  <ellipse cx="${bodyCX - bodyR*0.45}" cy="${bodyCY + bodyR*1.15}" rx="${legW*0.55}" ry="${legW*0.28}" fill="#2a2018"/>
  <ellipse cx="${bodyCX + bodyR*0.25}" cy="${bodyCY + bodyR*1.15}" rx="${legW*0.55}" ry="${legW*0.28}" fill="#2a2018"/>
  <ellipse cx="${bodyCX - bodyR*0.22}" cy="${bodyCY + bodyR*1.1}" rx="${legW*0.55}" ry="${legW*0.28}" fill="#2a2018"/>
  <ellipse cx="${bodyCX + bodyR*0.02}" cy="${bodyCY + bodyR*1.1}" rx="${legW*0.55}" ry="${legW*0.28}" fill="#2a2018"/>
</svg>`;
}

// ── Sheep variant factory ───────────────────────────────────────

// Standard sheep (3/4 view, standing) — viewBox "0 0 48 53"
const STANDARD = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { mouth: 'smile', fluffExtra: true });

// Happy sheep (squinting eyes, bigger smile) — viewBox "0 0 48 53"
const HAPPY = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { eyeShape: 'happy', mouth: 'smile', tilt: -4, fluffExtra: true });

// Walking sheep (legs in stride) — viewBox "0 0 52 53"
const WALKING = () => sheepSVG("0 0 52 53", 28, 31, 10, 24, 17, 7.5, 7, { legPose: 'walk', tilt: 5 });

// Sleepy sheep (half-closed eyes, droopy ears) — viewBox "0 0 48 53"
const SLEEPY = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { eyeShape: 'sleepy', mouth: 'none', earFlop: true, tilt: 3, fluffExtra: true });

// Baby lamb (smaller, rounder, big eyes) — viewBox "0 0 36 40"
const BABY = () => sheepSVG("0 0 36 40", 18, 23, 8, 18, 13, 6, 6, { mouth: 'open', tilt: 2 });

// Curious sheep (head tilted more, tail up) — viewBox "0 0 48 53"
const CURIOUS = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { tilt: 15, tailUp: true, mouth: 'open', fluffExtra: true });

// All corner sheep variants
const CORNER_VARIANTS = [STANDARD, HAPPY, WALKING, SLEEPY, BABY, CURIOUS];

// ── Corner sheep ────────────────────────────────────────────────

const TOOLTIPS = [
  "咩~", "你好呀！", "今天天气不错~", "✨", "点击有惊喜！",
  "咩咩咩", "🐑", "摸摸头~", "嘻嘻", "别点我！",
  "哈喽~", "来看地图呀", "咩~ ★", "软绵绵", "❤",
];

let cornerEl = null;
let wiggleTimer = null;

export function initCornerSheep() {
  if (cornerEl) return;

  cornerEl = document.createElement("div");
  cornerEl.className = "corner-sheep";

  const tooltip = document.createElement("span");
  tooltip.className = "sheep-tooltip";
  cornerEl.appendChild(tooltip);

  // Pick random variant
  const pick = () => {
    const variant = CORNER_VARIANTS[Math.floor(Math.random() * CORNER_VARIANTS.length)];
    cornerEl.innerHTML = variant() + tooltip.outerHTML;
    // Re-bind tooltip element reference (it was replaced by innerHTML)
    // Actually, let me use a different approach — keep tooltip separate
  };

  // Build: SVG wrapper + tooltip
  function render() {
    const variant = CORNER_VARIANTS[Math.floor(Math.random() * CORNER_VARIANTS.length)];
    const svgStr = variant();
    cornerEl.innerHTML = svgStr;
    cornerEl.appendChild(tooltip);
  }

  render();

  // Random tooltip on hover
  cornerEl.addEventListener("mouseenter", () => {
    tooltip.textContent = TOOLTIPS[Math.floor(Math.random() * TOOLTIPS.length)];
  });

  // Click: burst + switch variant + wiggle
  cornerEl.addEventListener("click", () => {
    burstSheep(cornerEl);
    render();
    cornerEl.classList.add("wiggle");
    setTimeout(() => cornerEl.classList.remove("wiggle"), 500);
  });

  // Occasional random variant switch & wiggle
  function randomSwitch() {
    if (Math.random() < 0.3) {
      render();
      cornerEl.classList.add("wiggle");
      setTimeout(() => cornerEl.classList.remove("wiggle"), 500);
    }
    wiggleTimer = setTimeout(randomSwitch, 8000 + Math.random() * 12000);
  }
  wiggleTimer = setTimeout(randomSwitch, 15000);

  document.body.appendChild(cornerEl);
}

// ── Burst sheep ─────────────────────────────────────────────────

export function burstSheep(sourceEl) {
  const rect = sourceEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const count = 8;
  for (let i = 0; i < count; i++) {
    const burst = document.createElement("div");
    burst.className = "sheep-sparkle-burst";
    burst.style.left = cx + "px";
    burst.style.top = cy + "px";
    burst.style.animationDelay = (i * 0.06) + "s";

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const dist1 = 25 + Math.random() * 25;
    const dist2 = 70 + Math.random() * 60;
    burst.style.setProperty("--bx", Math.cos(angle) * dist1 + "px");
    burst.style.setProperty("--by", Math.sin(angle) * dist1 - 15 + "px");
    burst.style.setProperty("--ex", Math.cos(angle) * dist2 + "px");
    burst.style.setProperty("--ey", Math.sin(angle) * dist2 - 50 + "px");
    burst.style.setProperty("--br", (Math.random() - 0.5) * 60 + "deg");
    burst.style.setProperty("--er", (Math.random() - 0.5) * 120 + "deg");

    // Random mini sheep variant
    const variant = CORNER_VARIANTS[Math.floor(Math.random() * CORNER_VARIANTS.length)];
    burst.innerHTML = variant();
    document.body.appendChild(burst);
    burst.addEventListener("animationend", () => burst.remove());
  }
}

// ── Loading sheep ───────────────────────────────────────────────

let loadingEl = null;

export const LOADING_SHEEP_SVG = sheepSVG("0 0 120 132", 60, 78, 25, 60, 43, 18, 17, { mouth: 'smile', fluffExtra: true });

export const MEDIUM_SHEEP_SVG = sheepSVG("0 0 64 70", 32, 42, 13.5, 32, 23, 10, 9, { mouth: 'smile', fluffExtra: true });

export const SMALL_SHEEP_SVG = sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { mouth: 'smile', fluffExtra: true });

export const MINI_SHEEP_SVG = sheepSVG("0 0 22 24", 11, 14, 7, 11, 7, 5.5, 5, { mouth: 'none' });

export const EMPTY_SHEEP_SVG = sheepSVG("0 0 80 88", 40, 52, 17, 40, 28, 12, 11, { tilt: 8, mouth: 'none' });

export function showLoadingSheep() {
  if (loadingEl) return;
  loadingEl = document.createElement("div");
  loadingEl.className = "loading-sheep-overlay";
  loadingEl.innerHTML = `
    <div class="loading-sheep">${LOADING_SHEEP_SVG}</div>
    <div class="loading-sheep-text">小羊奔跑中<span class="loading-sheep-dots"></span></div>
  `;
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
