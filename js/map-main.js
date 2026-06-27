import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";
import { getDefaultRecords, getUniqueTypes, getShapeInputDateExtent, filterByDateRange } from "./map-data.js";

// ── localStorage key ────────────────────────────────────────────

const LS_STYLE_KEY = "map-style";

// ── state ──────────────────────────────────────────────────────

const LS_LABEL_KEY = "map-label-mode";

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
const labelModeSwitch = document.getElementById("labelModeSwitch");

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

// ── helpers ────────────────────────────────────────────────────

function buildColorMap(types) {
  const map = {};
  types.forEach((t, i) => {
    map[t] = COLOR_PALETTE[i % COLOR_PALETTE.length];
  });
  return map;
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

  const typeColorMap = buildColorMap(getUniqueTypes());

  requestAnimationFrame(() => {
    for (const r of currentRecords) {
      const color = typeColorMap[r.activity] || "#a9a9a9";
      const el = document.createElement("div");
      el.className = "marker-label";
      el.style.color = color;
      if (labelMode === "place") {
        el.textContent = r.place.length > 5 ? r.place.slice(0, 5) + "…" : r.place;
      } else {
        el.textContent = r.activity;
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
labelModeSwitch.addEventListener("change", () => {
  labelMode = labelModeSwitch.checked ? "place" : "activity";
  localStorage.setItem(LS_LABEL_KEY, labelMode);
  renderMarkers();
});

// ── bootstrap ──────────────────────────────────────────────────

populateStyleOptions();
labelModeSwitch.checked = labelMode === "place";
initMap();
