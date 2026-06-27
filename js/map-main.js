import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";
import { getDefaultRecords, getUniqueTypes, getShapeInputDateExtent, filterByDateRange } from "./map-data.js";

// ── localStorage key ────────────────────────────────────────────

const LS_STYLE_KEY = "map-style";

// ── state ──────────────────────────────────────────────────────

const LS_LABEL_KEY = "map-label-mode";
const LS_COLOR_KEY = "map-colors";

let currentStyle = localStorage.getItem(LS_STYLE_KEY) || "gaode";
let labelMode = localStorage.getItem(LS_LABEL_KEY) || "activity";
let map = null;
let baseRecords = [];
let currentRecords = [];
let markers = [];

// ── 20-color palette ───────────────────────────────────────────

const COLOR_PALETTE = [
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

    const metaEl = document.createElement("div");
    metaEl.className = "detail-meta";

    const timeEl = document.createElement("div");
    timeEl.className = "detail-time";

    const noteEl = document.createElement("div");
    noteEl.className = "detail-note";

    card.appendChild(closeBtn);
    card.appendChild(placeEl);
    card.appendChild(metaEl);
    card.appendChild(timeEl);
    card.appendChild(noteEl);
    detailEl.appendChild(overlay);
    detailEl.appendChild(card);
    document.querySelector(".map-wrap").appendChild(detailEl);
  }
  return detailEl;
}

function showDetail(props) {
  const el = ensureDetail();
  const arr = fmtTime(props.arrival);
  const dep = fmtTime(props.departure);
  el.querySelector(".detail-place").textContent = props.place;
  el.querySelector(".detail-meta").innerHTML =
    `<span class="detail-type-badge" style="background:${props.textColor}">${props.activity}</span>`;
  el.querySelector(".detail-time").textContent = `${props.date}  ${arr} — ${dep}`;
  const noteEl = el.querySelector(".detail-note");
  if (props.note) {
    noteEl.textContent = props.note;
    noteEl.style.display = "";
  } else {
    noteEl.style.display = "none";
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
    map[t] = COLOR_PALETTE[i % COLOR_PALETTE.length];
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
  recordCountEl.textContent = `${currentRecords.length} 条记录`;

  clearMarkers();
  hideDetail();

  if (currentRecords.length === 0) return;

  const typeColorMap = getColorMap();

  requestAnimationFrame(() => {
    for (const r of currentRecords) {
      const color = typeColorMap[r.activity] || "#a9a9a9";
      const el = document.createElement("div");
      if (labelMode === "dot") {
        el.className = "marker-dot";
        el.style.backgroundColor = color;
      } else {
        el.className = "marker-label";
        el.style.color = color;
        el.textContent = labelMode === "place"
          ? (r.place.length > 5 ? r.place.slice(0, 5) + "…" : r.place)
          : r.activity;
      }
      el.addEventListener("click", () => {
        showDetail({ ...r, textColor: color });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([r.lng, r.lat])
        .addTo(map);

      markers.push(marker);
    }
  });

  const coords = currentRecords.map(r => [r.lng, r.lat]);
  const { center, zoom } = calculateDenseMapCenterAndZoom(coords);
  map.flyTo({ center, zoom });
}

// ── helpers ────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return "?";
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "?";
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

// ── bootstrap ──────────────────────────────────────────────────

populateStyleOptions();
labelModeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === labelMode));
initMap();
