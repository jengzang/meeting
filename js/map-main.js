import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";
import { getDefaultRecords, getUniqueTypes, getShapeInputDateExtent, filterByDateRange } from "./map-data.js";

// ── localStorage key ────────────────────────────────────────────

const LS_STYLE_KEY = "map-style";

// ── state ──────────────────────────────────────────────────────

const LS_LABEL_KEY = "map-label-mode";
const LS_COLOR_KEY = "map-colors";
const LS_SIZE_KEY = "map-size-mode";
const LS_CLUSTER_KEY = "map-auto-cluster";

let currentStyle = localStorage.getItem(LS_STYLE_KEY) || "tianditu";
let labelMode = localStorage.getItem(LS_LABEL_KEY) || "activity";
let sizeMode = localStorage.getItem(LS_SIZE_KEY) || "count";
let autoCluster = localStorage.getItem(LS_CLUSTER_KEY) === "true";
let map = null;
let baseRecords = [];
let currentRecords = [];
let markers = [];

// ── default color map ─────────────────────────────────────────

const DEFAULT_COLOR_MAP = {
  "学校": "#00FFFF",
  "活动聚会": "#13a113",
  "汽车相关": "#0000FF",
  "办事": "#012F7B",
  "地标": "#FF0000",
  "飞机相关": "#0000FF",
  "宿舍": "#4B0082",
  "旅行": "#FF0000",
  "商场": "#C3D117",
  "住宿": "#9e109e",
  "火车": "#0000FF",
  "就餐": "#7b6119",
  "运动": "#FFAB01",
  "东莞家": "#FF6A00",
  "中山家": "#FF6A00",
  "探亲祭祖": "#FF8648",
  "医院": "#831100",
  "理发按摩": "#8D8602",
  "约会": "#FFC0CB",
  "地铁": "#0000FF",
  "老家": "#DA5100",
  "工作": "#3EB489",
  // "杭州租房": "#FFA500"
};

const FALLBACK_PALETTE = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#42d4f4", "#f032e6", "#bfe745", "#fabed4",
  "#469990", "#dcbaff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9"
];

// ── DOM refs ───────────────────────────────────────────────────

const styleSelect = document.getElementById("styleSelect");
const resetBtn = document.getElementById("resetBtn");
const closePanelBtn = document.getElementById("closePanelBtn");
const reopenPanelBtn = document.getElementById("reopenPanelBtn");
const mapControls = document.getElementById("mapControls");
const recordCountEl = document.getElementById("recordCount");
const dateFromEl = document.getElementById("dateFrom");
const dateToEl = document.getElementById("dateTo");
const labelModeBtns = document.querySelectorAll(".label-mode-btn");
const colorConfigBtn = document.getElementById("colorConfigBtn");
const sizeModeBtns = document.querySelectorAll(".size-mode-btn");
const showTrafficCb = document.getElementById("showTrafficCb");
const autoClusterCb = document.getElementById("autoClusterCb");

// ── detail popup ───────────────────────────────────────────────

let detailEl = null;

function ensureDetail() {
  if (!detailEl) {
    detailEl = document.createElement("div");
    detailEl.className = "detail-popup";
    detailEl.style.display = "none";

    const overlay = document.createElement("div");
    overlay.className = "detail-overlay";
    overlay.addEventListener("click", hideDetail);

    const card = document.createElement("div");
    card.className = "detail-card";

    const closeBtn = document.createElement("button");
    closeBtn.className = "detail-close";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", hideDetail);

    const placeEl = document.createElement("div");
    placeEl.className = "detail-place";

    const singleWrap = document.createElement("div");
    singleWrap.className = "detail-single";
    const metaEl = document.createElement("div");
    metaEl.className = "detail-meta";
    const timeEl = document.createElement("div");
    timeEl.className = "detail-time";
    singleWrap.appendChild(metaEl);
    singleWrap.appendChild(timeEl);

    const recordsEl = document.createElement("div");
    recordsEl.className = "detail-records";

    const noteEl = document.createElement("div");
    noteEl.className = "detail-note";

    card.appendChild(closeBtn);
    card.appendChild(placeEl);
    card.appendChild(singleWrap);
    card.appendChild(recordsEl);
    card.appendChild(noteEl);
    detailEl.appendChild(overlay);
    detailEl.appendChild(card);
    document.querySelector(".map-wrap").appendChild(detailEl);
  }
  return detailEl;
}

function showDetail(records, color) {
  const el = ensureDetail();
  const place = records[0].place;
  el.querySelector(".detail-place").textContent = place;

  const singleWrap = el.querySelector(".detail-single");
  const recordsEl = el.querySelector(".detail-records");
  const noteEl = el.querySelector(".detail-note");

  if (records.length === 1) {
    const r = records[0];
    const arr = fmtTime(r.arrival);
    const dep = fmtTime(r.departure);
    el.querySelector(".detail-meta").innerHTML =
      `<span class="detail-type-badge" style="background:${color}">${r.activity}</span>`;
    el.querySelector(".detail-time").textContent = `${r.date}  ${arr} — ${dep}`;
    singleWrap.style.display = "";
    recordsEl.style.display = "none";
    if (r.note) {
      noteEl.textContent = r.note;
      noteEl.style.display = "";
    } else {
      noteEl.style.display = "none";
    }
  } else {
    singleWrap.style.display = "none";
    recordsEl.style.display = "";
    recordsEl.innerHTML = records.map(r => {
      const arr = fmtTime(r.arrival);
      const dep = fmtTime(r.departure);
      return `<div class="detail-record-row">
        <span class="detail-type-badge" style="background:${color}">${r.activity}</span>
        <span class="detail-record-time">${r.date} ${arr} — ${dep}</span>
      </div>`;
    }).join("");
    const notes = records.map(r => r.note).filter(Boolean);
    if (notes.length) {
      noteEl.textContent = notes.join("；");
      noteEl.style.display = "";
    } else {
      noteEl.style.display = "none";
    }
  }
  el.style.display = "";
}

function hideDetail() {
  if (detailEl) detailEl.style.display = "none";
}

// ── color config panel ─────────────────────────────────────────

let colorConfigEl = null;

function ensureColorConfig() {
  if (!colorConfigEl) {
    colorConfigEl = document.createElement("div");
    colorConfigEl.className = "color-config";
    colorConfigEl.style.display = "none";

    const overlay = document.createElement("div");
    overlay.className = "color-config-overlay";
    overlay.addEventListener("click", hideColorConfig);

    const card = document.createElement("div");
    card.className = "color-config-card";

    const header = document.createElement("div");
    header.className = "color-config-header";
    header.innerHTML = '<span>配色方案</span>';

    const closeBtn = document.createElement("button");
    closeBtn.className = "detail-close";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", hideColorConfig);
    header.appendChild(closeBtn);

    const list = document.createElement("div");
    list.className = "color-config-list";

    const resetBtn = document.createElement("button");
    resetBtn.className = "color-config-reset";
    resetBtn.textContent = "重置默认";
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem(LS_COLOR_KEY);
      populateColorList();
      renderMarkers();
    });

    card.appendChild(header);
    card.appendChild(list);
    card.appendChild(resetBtn);
    colorConfigEl.appendChild(overlay);
    colorConfigEl.appendChild(card);
    document.querySelector(".map-wrap").appendChild(colorConfigEl);
  }
  return colorConfigEl;
}

function populateColorList() {
  const list = colorConfigEl.querySelector(".color-config-list");
  const colorMap = getColorMap();
  const types = Object.keys(colorMap).sort();
  list.innerHTML = types.map(t => `
    <div class="color-item">
      <span class="color-item-label">${t}</span>
      <input type="color" class="color-item-input" value="${colorMap[t]}" data-type="${t}" />
    </div>
  `).join("");

  list.querySelectorAll(".color-item-input").forEach(input => {
    input.addEventListener("input", () => {
      const colorMap = getColorMap();
      colorMap[input.dataset.type] = input.value;
      saveColorMap(colorMap);
      renderMarkers();
    });
  });
}

function showColorConfig() {
  const el = ensureColorConfig();
  populateColorList();
  el.style.display = "";
}

function hideColorConfig() {
  if (colorConfigEl) colorConfigEl.style.display = "none";
}

// ── color map ─────────────────────────────────────────────────

function buildDefaultColorMap(types) {
  const map = {};
  types.forEach((t, i) => {
    map[t] = DEFAULT_COLOR_MAP[t] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
  });
  return map;
}

function getColorMap() {
  const defaults = buildDefaultColorMap(getUniqueTypes());
  const saved = localStorage.getItem(LS_COLOR_KEY);
  if (saved) {
    try { return { ...defaults, ...JSON.parse(saved) }; } catch {}
  }
  return defaults;
}

function saveColorMap(map) {
  localStorage.setItem(LS_COLOR_KEY, JSON.stringify(map));
}

// ── map init ───────────────────────────────────────────────────

function initMap() {
  map = new maplibregl.Map({
    container: "map",
    style: mapStyle(currentStyle),
    center: [113.2644, 23.1291],
    zoom: 8,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl(), "top-left");

  map.on("load", () => {
    initTimeline();
    renderMarkers();
  });

  map.on("error", (e) => {
    console.error("[map] error:", e.error);
  });

  map.on("zoomend", () => {
    if (autoCluster) renderMarkers();
  });

  styleSelect.value = currentStyle;
}

// ── timeline ───────────────────────────────────────────────────

function initTimeline() {
  const [min, max] = getShapeInputDateExtent();
  dateFromEl.value = min;
  dateToEl.value = max;
  dateFromEl.min = min;
  dateFromEl.max = max;
  dateToEl.min = min;
  dateToEl.max = max;
}

function applyTimelineFilter() {
  const from = dateFromEl.value;
  const to = dateToEl.value;
  if (from && to) {
    currentRecords = filterByDateRange(baseRecords, from, to);
  } else {
    currentRecords = [...baseRecords];
  }
}

// ── DOM Markers ────────────────────────────────────────────────

function clearMarkers() {
  markers.forEach(m => m.remove());
  markers = [];
}

function renderMarkers() {
  if (!map) return;

  baseRecords = getDefaultRecords();
  applyTimelineFilter();
  console.log("[map] records:", currentRecords.length, "/", baseRecords.length);

  clearMarkers();
  hideDetail();

  if (currentRecords.length === 0) return;

  // group by coordinate: autoCluster scales grid with zoom, else exact
  const precision = autoCluster ? clusterPrecision() : 7;
  const groups = new Map();
  for (const r of currentRecords) {
    const gridLng = parseFloat(r.lng.toFixed(precision));
    const gridLat = parseFloat(r.lat.toFixed(precision));
    const key = `${gridLng},${gridLat}`;
    if (!groups.has(key)) {
      groups.set(key, { recs: [], lng: gridLng, lat: gridLat });
    }
    groups.get(key).recs.push(r);
  }

  const groupList = [...groups.values()];
  recordCountEl.textContent = autoCluster
    ? `${currentRecords.length} 条 → ${groupList.length} 标记`
    : `${currentRecords.length} 条记录`;
  const recsList = groupList.map(g => g.recs);
  const typeColorMap = getColorMap();
  const coords = [];

  // pre-compute size scaling
  let countSizes, durationSizes;
  if (sizeMode === "count") {
    countSizes = new Map();
    for (let i = 0; i < recsList.length; i++) {
      const n = recsList[i].length;
      countSizes.set(i, n > 1 ? Math.min(n - 1, 8) : 0);
    }
  } else if (sizeMode === "duration") {
    const maxExtra = labelMode === "dot" ? 8 : 5;
    durationSizes = scaleByDuration(recsList, 0, maxExtra);
  }

  requestAnimationFrame(() => {
    for (let gi = 0; gi < groupList.length; gi++) {
      const { recs, lng, lat } = groupList[gi];
      const count = recs.length;
      const r = recs[0];
      const color = typeColorMap[r.activity] || "#a9a9a9";
      const el = document.createElement("div");

      // compute scale factor (0 = uniform)
      let scale = 0;
      if (sizeMode === "count") {
        scale = countSizes.get(gi);
      } else if (sizeMode === "duration") {
        scale = durationSizes.get(gi);
      }

      if (labelMode === "dot") {
        const size = 12 + scale * 3;
        const showNum = sizeMode === "count" && count > 1;
        el.className = showNum ? "marker-dot marker-dot-numbered" : "marker-dot";
        el.style.width = size + "px";
        el.style.height = size + "px";
        el.style.backgroundColor = color;
        if (showNum) {
          el.textContent = count;
          el.style.fontSize = Math.max(10, size * 0.42) + "px";
        }
      } else {
        const fontSize = 11 + scale * 1.5;
        const stroke = 2 + scale * 0.3;
        el.className = "marker-label";
        el.style.fontSize = fontSize + "px";
        el.style.WebkitTextStroke = stroke + "px rgba(0,0,0,0.8)";
        el.style.color = color;
        el.textContent = labelMode === "place"
          ? (r.place.length > 5 ? r.place.slice(0, 5) + "…" : r.place)
          : r.activity;
      }

      el.addEventListener("click", () => {
        showDetail(recs, color);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      markers.push(marker);
      coords.push([lng, lat]);
    }

    if (coords.length > 0) {
      const { center, zoom } = calculateDenseMapCenterAndZoom(coords);
      map.flyTo({ center, zoom });
    }
  });
}

// ── helpers ────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return "?";
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "?";
}

function clusterPrecision() {
  // 40px target cluster distance, adapts to zoom
  const metersPerPixel = 156543 / Math.pow(2, map.getZoom());
  const targetMeters = 40 * metersPerPixel;
  const gridDeg = targetMeters / 111320;
  return Math.max(1, Math.min(5, Math.round(-Math.log10(gridDeg))));
}

function totalDurationHours(recs) {
  let total = 0;
  for (const r of recs) {
    if (r.arrival && r.departure) {
      const a = new Date(r.arrival);
      const d = new Date(r.departure);
      if (d > a) total += (d - a) / 3600000;
    }
  }
  return total;
}

function scaleByDuration(allGroups, baseSize, maxExtra) {
  const durations = [];
  for (const recs of allGroups) {
    durations.push(totalDurationHours(recs));
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)] || 0;
  const hi = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const range = hi > lo ? hi - lo : 1;
  const map = new Map();
  for (let i = 0; i < allGroups.length; i++) {
    const t = Math.max(lo, Math.min(hi, durations[i]));
    map.set(i, baseSize + ((t - lo) / range) * maxExtra);
  }
  return map;
}

// ── control panel toggle ──────────────────────────────────────

function closePanel() {
  mapControls.style.display = "none";
  reopenPanelBtn.style.display = "";
}

function reopenPanel() {
  mapControls.style.display = "";
  reopenPanelBtn.style.display = "none";
}

// ── style switching ────────────────────────────────────────────

function changeMapStyle(name) {
  if (!map) return;
  currentStyle = name;
  localStorage.setItem(LS_STYLE_KEY, name);

  let done = false;
  const renderOnce = () => {
    if (done) return;
    done = true;
    renderMarkers();
  };

  map.once("style.load", renderOnce);
  map.once("idle", renderOnce);
  map.setStyle(mapStyle(name));
}

function resetView() {
  if (!map) return;
  if (currentRecords.length > 0) {
    const coords = currentRecords.map(r => [r.lng, r.lat]);
    const { center, zoom } = calculateDenseMapCenterAndZoom(coords);
    map.flyTo({ center, zoom });
  } else {
    map.flyTo({ center: [113.2644, 23.1291], zoom: 8 });
  }
}

// ── populate style dropdown ────────────────────────────────────

function populateStyleOptions() {
  const entries = Object.entries(mapStyleConfig);
  styleSelect.innerHTML = entries
    .map(([key, label]) => `<option value="${key}" ${key === currentStyle ? "selected" : ""}>${label}</option>`)
    .join("");
}

// ── events ─────────────────────────────────────────────────────

styleSelect.addEventListener("change", () => {
  changeMapStyle(styleSelect.value);
});

dateFromEl.addEventListener("change", () => {
  if (dateFromEl.value > dateToEl.value) dateToEl.value = dateFromEl.value;
  renderMarkers();
});

dateToEl.addEventListener("change", () => {
  if (dateToEl.value < dateFromEl.value) dateFromEl.value = dateToEl.value;
  renderMarkers();
});

resetBtn.addEventListener("click", resetView);
closePanelBtn.addEventListener("click", closePanel);
reopenPanelBtn.addEventListener("click", reopenPanel);
labelModeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    labelMode = btn.dataset.mode;
    localStorage.setItem(LS_LABEL_KEY, labelMode);
    labelModeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === labelMode));
    renderMarkers();
  });
});
colorConfigBtn.addEventListener("click", showColorConfig);
sizeModeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    sizeMode = btn.dataset.mode === sizeMode ? "" : btn.dataset.mode;
    localStorage.setItem(LS_SIZE_KEY, sizeMode);
    sizeModeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === sizeMode));
    renderMarkers();
  });
});
autoClusterCb.addEventListener("change", () => {
  autoCluster = autoClusterCb.checked;
  localStorage.setItem(LS_CLUSTER_KEY, autoCluster);
  renderMarkers();
});

// ── bootstrap ──────────────────────────────────────────────────

populateStyleOptions();
labelModeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === labelMode));
sizeModeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === sizeMode));
autoClusterCb.checked = autoCluster;
initMap();
