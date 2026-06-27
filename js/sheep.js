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
    accessory = '',     // 'bow' | 'hat' | ''
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
  const lpCx = headCX - eyeOffX + eyeR * 0.15;
  const lpCy = eyeY - eyeR * 0.1;
  const rpCx = headCX + eyeOffX + eyeR * 0.15;
  const rpCy = eyeY - eyeR * 0.1;
  if (eyeShape === 'happy') {
    eyes = `<path d="M${headCX - eyeOffX - eyeR} ${eyeY} Q${headCX - eyeOffX} ${eyeY - eyeR*1.3} ${headCX - eyeOffX + eyeR} ${eyeY}" stroke="#1a1410" stroke-width="${eyeR*0.35}" fill="none" stroke-linecap="round"/>
            <path d="M${headCX + eyeOffX - eyeR} ${eyeY} Q${headCX + eyeOffX} ${eyeY - eyeR*1.3} ${headCX + eyeOffX + eyeR} ${eyeY}" stroke="#1a1410" stroke-width="${eyeR*0.35}" fill="none" stroke-linecap="round"/>`;
  } else if (eyeShape === 'sleepy') {
    eyes = `<ellipse cx="${headCX - eyeOffX}" cy="${eyeY}" rx="${eyeR}" ry="${eyeR*0.4}" fill="#1a1410"/>
            <ellipse cx="${headCX + eyeOffX}" cy="${eyeY}" rx="${eyeR}" ry="${eyeR*0.4}" fill="#1a1410"/>`;
  } else {
    eyes = `<circle cx="${headCX - eyeOffX}" cy="${eyeY}" r="${eyeR}" fill="#fff"/>
            <circle cx="${headCX + eyeOffX}" cy="${eyeY}" r="${eyeR}" fill="#fff"/>
            <circle class="pupil" cx="${lpCx}" cy="${lpCy}" r="${eyeR*0.5}" fill="#1a1410" data-base-cx="${lpCx}" data-base-cy="${lpCy}"/>
            <circle class="pupil" cx="${rpCx}" cy="${rpCy}" r="${eyeR*0.5}" fill="#1a1410" data-base-cx="${rpCx}" data-base-cy="${rpCy}"/>
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

  // Accessory
  let accStr = '';
  if (accessory === 'bow') {
    const bx = headCX - headRX * 0.15;
    const by = headCY - headRY * 1.05;
    accStr = `<g transform="rotate(-5 ${bx} ${by})">
      <ellipse cx="${bx - headRX*0.25}" cy="${by}" rx="${headRX*0.2}" ry="${headRY*0.15}" fill="#f472b6"/>
      <ellipse cx="${bx + headRX*0.25}" cy="${by}" rx="${headRX*0.2}" ry="${headRY*0.15}" fill="#f472b6"/>
      <circle cx="${bx}" cy="${by}" r="${headRX*0.08}" fill="#ec4899"/>
    </g>`;
  } else if (accessory === 'hat') {
    const hx = headCX;
    const hy = headCY - headRY * 0.9;
    accStr = `<g>
      <rect x="${hx - headRX*0.35}" y="${hy - headRY*0.25}" width="${headRX*0.7}" height="${headRY*0.3}" rx="${headRY*0.1}" fill="#3b82f6"/>
      <rect x="${hx - headRX*0.2}" y="${hy - headRY*0.55}" width="${headRX*0.4}" height="${headRY*0.35}" rx="${headRY*0.05}" fill="#3b82f6"/>
    </g>`;
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
    ${accStr}
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

// Standard sheep (3/4 view, standing)
const STANDARD = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { mouth: 'smile', fluffExtra: true });

// Happy sheep (squinting eyes, bigger smile)
const HAPPY = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { eyeShape: 'happy', mouth: 'smile', tilt: -4, fluffExtra: true });

// Walking sheep (legs in stride)
const WALKING = () => sheepSVG("0 0 52 53", 28, 31, 10, 24, 17, 7.5, 7, { legPose: 'walk', tilt: 5 });

// Sleepy sheep (half-closed eyes, droopy ears)
const SLEEPY = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { eyeShape: 'sleepy', mouth: 'none', earFlop: true, tilt: 3, fluffExtra: true });

// Baby lamb (smaller, rounder, big eyes)
const BABY = () => sheepSVG("0 0 36 40", 18, 23, 8, 18, 13, 6, 6, { mouth: 'open', tilt: 2 });

// Curious sheep (head tilted more, tail up)
const CURIOUS = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { tilt: 15, tailUp: true, mouth: 'open', fluffExtra: true });

// Bow sheep (pink bow accessory)
const BOW_SHEEP = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { mouth: 'smile', accessory: 'bow', fluffExtra: true });

// Hat sheep (blue top hat)
const HAT_SHEEP = () => sheepSVG("0 0 48 53", 24, 31, 10, 24, 17, 7.5, 7, { mouth: 'smile', accessory: 'hat', fluffExtra: true });

// Regular variants (no accessories)
const CORNER_VARIANTS = [STANDARD, HAPPY, WALKING, SLEEPY, BABY, CURIOUS];

// Rare variants (with accessories)
const RARE_VARIANTS = [BOW_SHEEP, HAT_SHEEP];

// ── Corner sheep ────────────────────────────────────────────────

const TOOLTIPS = [
  "咩~", "你好呀！", "我是可爱的杨媚~", "今天天气不错~", "✨", "点击有惊喜！",
  "咩咩咩", "🐑", "摸摸头~", "嘻嘻", "别点我！","嘿嘿",
  "哈喽~", "来看地图呀", "咩~ ★", "软绵绵", "❤","大家好，我叫杨媚"
];

let cornerEl = null;
let wiggleTimer = null;
let pupilOffset = { x: 0, y: 0 };
let lastClickTime = 0;

export function initCornerSheep() {
  if (cornerEl) return;

  cornerEl = document.createElement("div");
  cornerEl.className = "corner-sheep";

  const tooltip = document.createElement("span");
  tooltip.className = "sheep-tooltip";
  cornerEl.appendChild(tooltip);

  function pickVariant() {
    // 5% chance of rare variant
    if (Math.random() < 0.05) {
      return RARE_VARIANTS[Math.floor(Math.random() * RARE_VARIANTS.length)];
    }
    return CORNER_VARIANTS[Math.floor(Math.random() * CORNER_VARIANTS.length)];
  }

  // Build: SVG wrapper + tooltip
  function render() {
    const variant = pickVariant();
    const svgStr = variant();
    cornerEl.innerHTML = svgStr;
    cornerEl.appendChild(tooltip);
    // Apply current pupil offset after render
    applyPupilOffset();
  }

  function applyPupilOffset() {
    const pupils = cornerEl.querySelectorAll('.pupil');
    pupils.forEach(p => {
      const bx = parseFloat(p.dataset.baseCx || p.getAttribute('cx'));
      const by = parseFloat(p.dataset.baseCy || p.getAttribute('cy'));
      p.setAttribute('cx', bx + pupilOffset.x);
      p.setAttribute('cy', by + pupilOffset.y);
    });
  }

  render();

  // Random tooltip on hover
  cornerEl.addEventListener("mouseenter", () => {
    tooltip.textContent = TOOLTIPS[Math.floor(Math.random() * TOOLTIPS.length)];
  });

  // Click: burst + switch variant + wiggle; double-click = heart burst
  cornerEl.addEventListener("click", () => {
    const now = Date.now();
    const isDouble = (now - lastClickTime) < 400;
    lastClickTime = now;

    if (isDouble) {
      heartBurstSheep(cornerEl);
    } else {
      burstSheep(cornerEl);
    }

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

// Eye tracking — global mousemove handler
document.addEventListener("mousemove", (e) => {
  if (!cornerEl) return;
  const rect = cornerEl.getBoundingClientRect();
  const scx = rect.left + rect.width / 2;
  const scy = rect.top + rect.height / 2;
  // Max ~3px pupil shift
  pupilOffset.x = (e.clientX - scx) / window.innerWidth * 5;
  pupilOffset.y = (e.clientY - scy) / window.innerHeight * 4;
  const pupils = cornerEl.querySelectorAll('.pupil');
  pupils.forEach(p => {
    const bx = parseFloat(p.dataset.baseCx || p.getAttribute('cx'));
    const by = parseFloat(p.dataset.baseCy || p.getAttribute('cy'));
    p.setAttribute('cx', bx + pupilOffset.x);
    p.setAttribute('cy', by + pupilOffset.y);
  });
});

// ── Burst sheep ─────────────────────────────────────────────────

// Sparkle SVG strings (tiny)
const SPARKLE_SVGS = [
  `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 0l1.5 5.5L15 4l-3 3.5L16 10h-5.5L9 16l-1-5.5L2 13l2.5-4L0 7l5-1.5z" fill="#fbbf24"/></svg>`,
  `<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" fill="#f472b6"/></svg>`,
  `<svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><path d="M7 0l1 6 6 1-6 1-1 6-1-6-6-1 6-1z" fill="#fbbf24"/></svg>`,
  `<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M6 0c-1 3-3 5-6 6 3 1 5 3 6 6 1-3 3-5 6-6-3-1-5-3-6-6z" fill="#60a5fa"/></svg>`,
  `<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M6 2l1 3 3 0.5-2 2 0.5 3L6 9l-2.5 1.5L4 7.5l-2-2 3-0.5z" fill="#fbbf24"/></svg>`,
];

export function burstSheep(sourceEl, opts = {}) {
  const { particleCount = 6, sheepCount = 8, isHeart = false } = opts;
  const rect = sourceEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // Sheep burst
  for (let i = 0; i < sheepCount; i++) {
    const burst = document.createElement("div");
    burst.className = "sheep-sparkle-burst";
    burst.style.left = cx + "px";
    burst.style.top = cy + "px";
    burst.style.animationDelay = (i * 0.06) + "s";

    let angle, dist1, dist2;
    if (isHeart) {
      // Heart shape parametric
      const t = (Math.PI * 2 * i) / sheepCount;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      dist1 = Math.sqrt(hx*hx + hy*hy) * 1.2;
      dist2 = dist1 * 3;
      angle = Math.atan2(-hy, hx);
    } else {
      angle = (Math.PI * 2 * i) / sheepCount + (Math.random() - 0.5) * 0.6;
      dist1 = 25 + Math.random() * 25;
      dist2 = 70 + Math.random() * 60;
    }

    burst.style.setProperty("--bx", Math.cos(angle) * dist1 + "px");
    burst.style.setProperty("--by", Math.sin(angle) * dist1 - 15 + "px");
    burst.style.setProperty("--ex", Math.cos(angle) * dist2 + "px");
    burst.style.setProperty("--ey", Math.sin(angle) * dist2 - 50 + "px");
    burst.style.setProperty("--br", (Math.random() - 0.5) * 60 + "deg");
    burst.style.setProperty("--er", (Math.random() - 0.5) * 120 + "deg");

    const variant = CORNER_VARIANTS[Math.floor(Math.random() * CORNER_VARIANTS.length)];
    burst.innerHTML = variant();
    document.body.appendChild(burst);
    burst.addEventListener("animationend", () => burst.remove());
  }

  // Sparkle particle burst
  for (let i = 0; i < particleCount; i++) {
    const spark = document.createElement("div");
    spark.className = "sparkle-burst";
    spark.style.left = cx + "px";
    spark.style.top = cy + "px";
    spark.style.animationDelay = (i * 0.04) + "s";

    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8;
    const dist1 = 15 + Math.random() * 20;
    const dist2 = 55 + Math.random() * 70;
    spark.style.setProperty("--bx", Math.cos(angle) * dist1 + "px");
    spark.style.setProperty("--by", Math.sin(angle) * dist1 - 10 + "px");
    spark.style.setProperty("--ex", Math.cos(angle) * dist2 + "px");
    spark.style.setProperty("--ey", Math.sin(angle) * dist2 - 40 + "px");
    spark.style.setProperty("--br", (Math.random() - 0.5) * 180 + "deg");
    spark.style.setProperty("--er", (Math.random() - 0.5) * 360 + "deg");

    spark.innerHTML = SPARKLE_SVGS[Math.floor(Math.random() * SPARKLE_SVGS.length)];
    document.body.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

// ── Heart-shaped burst (double-click special) ────────────────────

export function heartBurstSheep(sourceEl) {
  burstSheep(sourceEl, { sheepCount: 14, particleCount: 12, isHeart: true });
}

// ── Page transition sheep ───────────────────────────────────────

export function initTransitions() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a.nav-link");
    if (!link || link.hostname !== location.hostname) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    e.preventDefault();
    const sheep = document.createElement("div");
    sheep.className = "transition-sheep";
    // Random running sheep variant
    const variant = CORNER_VARIANTS[Math.floor(Math.random() * CORNER_VARIANTS.length)];
    sheep.innerHTML = variant();
    document.body.appendChild(sheep);

    // When mid-screen, navigate
    sheep.addEventListener("animationend", () => {
      sheep.remove();
      window.location.href = href;
    });
  });
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
