import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";
import { getUniqueTypes, getDateExtent, filterByDateRange } from "./map-data.js";
import { records } from "../data/records.js";
import { traffic } from "../data/traffic.js";
import { recordLocations } from "../data/record_locations.js";
import { recordWeather } from "../data/record_weather.js";

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
let zoomDebounce = null;
let trafficVisible = false;

// range slider state
let rangeMinDate = "";
let rangeMaxDate = "";
let rangeFromDate = "";
let rangeToDate = "";

// ── default color map ─────────────────────────────────────────

const DEFAULT_COLOR_MAP = {
  "学校": "#19c6c6",
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
  "杭州租房": "#FFA500"
};

const TRAFFIC_COLOR_MAP = {
  "步行": "#00FF88",
  "机动车": "#1424b8",
  "地铁": "#9a2bb3",
  "骑行": "#0f6025",
  "火车": "#ce2a2a",
  "大巴": "#248dd3",
  "船": "#002ad1",
  "飞行": "#2fc4e2",
  "缆车": "#A0522D",
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
const rangeSlider = document.getElementById("rangeSlider");
const rangeTrack = document.getElementById("rangeTrack");
const rangeFill = document.getElementById("rangeFill");
const thumbFrom = document.getElementById("thumbFrom");
const thumbTo = document.getElementById("thumbTo");
const rangeDisplay = document.getElementById("rangeDisplay");
const labelModeBtns = document.querySelectorAll(".label-mode-btn");
const colorConfigBtn = document.getElementById("colorConfigBtn");
const sizeModeBtns = document.querySelectorAll(".size-mode-btn");
const showTrafficCb = document.getElementById("showTrafficCb");
const autoClusterCb = document.getElementById("autoClusterCb");
const scenicCb = document.getElementById("scenicCb");
const photoCb = document.getElementById("photoCb");

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

    const locationEl = document.createElement("div");
    locationEl.className = "detail-location";

    const weatherEl = document.createElement("div");
    weatherEl.className = "detail-weather";

    card.appendChild(closeBtn);
    card.appendChild(placeEl);
    card.appendChild(singleWrap);
    card.appendChild(recordsEl);
    card.appendChild(noteEl);
    card.appendChild(locationEl);
    card.appendChild(weatherEl);
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
  const locationEl = el.querySelector(".detail-location");
  const weatherEl = el.querySelector(".detail-weather");

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

    // Location
    const loc = recordLocations[r.id];
    if (loc) {
      locationEl.textContent = [countryFlag(loc.country), loc.admin, loc.city, loc.district, loc.street, loc.houseNumber].filter(Boolean).join(" ");
      locationEl.style.display = "";
    } else {
      locationEl.style.display = "none";
    }

    // Weather
    const wx = recordWeather[r.id];
    if (wx && wx.length) {
      weatherEl.innerHTML = wx.map(w => formatWxChip(w)).join("");
      weatherEl.style.display = "";
    } else {
      weatherEl.style.display = "none";
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
    // Multiple records: show each unique location
    const locSet = new Set();
    for (const rec of records) {
      const l = recordLocations[rec.id];
      if (l) {
        locSet.add([countryFlag(l.country), l.admin, l.city, l.district, l.street, l.houseNumber].filter(Boolean).join(" "));
      }
    }
    if (locSet.size) {
      locationEl.innerHTML = [...locSet].join("<br>");
      locationEl.style.display = "";
    } else {
      locationEl.style.display = "none";
    }
    // Multi-record: collect weather from all records
    const allWx = [];
    const seen = new Set();
    for (const rec of records) {
      const wxList = recordWeather[rec.id];
      if (wxList) {
        for (const w of wxList) {
          const key = w.time + w.condition;
          if (!seen.has(key)) { seen.add(key); allWx.push(w); }
        }
      }
    }
    if (allWx.length) {
      allWx.sort((a, b) => a.time.localeCompare(b.time));
      weatherEl.innerHTML = allWx.map(w => formatWxChip(w)).join("");
      weatherEl.style.display = "";
    } else {
      weatherEl.style.display = "none";
    }
  }
  el.style.display = "";
}

function hideDetail() {
  if (detailEl) detailEl.style.display = "none";
}

function showTrafficDetail(items, color) {
  const el = ensureDetail();
  const r = items[0];
  const firstTime = fmtTime(r.from_time);
  const lastTime = fmtTime(items[items.length - 1].to_time);
  const totalSec = items.reduce((s, t) => s + t.duration_sec, 0);
  const durMin = Math.round(totalSec / 60);
  const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h${durMin % 60}m` : `${durMin}m`;

  el.querySelector(".detail-place").textContent = `${r.origin} → ${r.dest}`;
  el.querySelector(".detail-meta").innerHTML = `<span class="detail-type-badge" style="background:${color}">交通</span>`;
  el.querySelector(".detail-time").textContent = `${r.from_time.slice(0, 10)}  ${firstTime} — ${lastTime}  (${durStr})`;
  el.querySelector(".detail-single").style.display = "";

  const recordsEl = el.querySelector(".detail-records");
  recordsEl.style.display = "";
  recordsEl.innerHTML = items.map(t => {
    const c = TRAFFIC_COLOR_MAP[t.type] || "#a9a9a9";
    const m = Math.round(t.duration_sec / 60);
    return `<div class="detail-record-row">
      <span class="detail-type-badge" style="background:${c}">${t.type}</span>
      <span class="detail-record-time">${m}min  ${t.origin} → ${t.dest}</span>
    </div>`;
  }).join("");

  el.querySelector(".detail-note").style.display = "none";
  el.style.display = "";
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
    initTrafficLayers();
    initTimeline();
    renderMarkers({ fit: true });
  });

  // traffic line interaction (persists across style changes)
  map.on("click", "traffic-line", (e) => {
    if (!e.features || !e.features.length) return;
    const props = e.features[0].properties;
    const detail = JSON.parse(props.detail);
    showTrafficDetail(detail, props.color);
  });
  map.on("mouseenter", "traffic-line", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "traffic-line", () => { map.getCanvas().style.cursor = ""; });

  thumbFrom.addEventListener("mousedown", thumbDrag);
  thumbFrom.addEventListener("touchstart", thumbDrag, { passive: false });
  thumbTo.addEventListener("mousedown", thumbDrag);
  thumbTo.addEventListener("touchstart", thumbDrag, { passive: false });

  map.on("error", (e) => {
    console.error("[map] error:", e.error);
  });

  map.on("zoomend", () => {
    if (!autoCluster) return;
    clearTimeout(zoomDebounce);
    zoomDebounce = setTimeout(() => renderMarkers(), 150);
  });

  styleSelect.value = currentStyle;
}

// ── timeline ───────────────────────────────────────────────────

function initTimeline() {
  const ext = getDateExtent(records);
  if (!ext.length) return;
  rangeMinDate = ext[0];
  rangeMaxDate = ext[1];
  rangeFromDate = "2025-06-27";
  rangeToDate = rangeMaxDate;
  updateSliderUI();
}

function dateToPct(date) {
  const total = new Date(rangeMaxDate) - new Date(rangeMinDate);
  if (total <= 0) return 0;
  return ((new Date(date) - new Date(rangeMinDate)) / total) * 100;
}

function pctToDate(pct) {
  const total = new Date(rangeMaxDate) - new Date(rangeMinDate);
  const d = new Date(new Date(rangeMinDate).getTime() + total * pct / 100);
  return d.toISOString().slice(0, 10);
}

function updateSliderUI() {
  const fromPct = dateToPct(rangeFromDate);
  const toPct = dateToPct(rangeToDate);
  thumbFrom.style.left = fromPct + "%";
  thumbTo.style.left = toPct + "%";
  rangeFill.style.left = fromPct + "%";
  rangeFill.style.width = (toPct - fromPct) + "%";
  rangeDisplay.textContent = `${rangeFromDate} — ${rangeToDate}`;
}

function applyTimelineFilter() {
  currentRecords = filterByDateRange(baseRecords, rangeFromDate, rangeToDate);
}

// range slider drag
function thumbDrag(e) {
  const thumb = e.target.closest(".range-thumb");
  if (!thumb) return;
  e.preventDefault();
  thumb.classList.add("dragging");
  const which = thumb.dataset.thumb;

  function onMove(ev) {
    const rect = rangeTrack.getBoundingClientRect();
    let pct = ((ev.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    const date = pctToDate(pct);
    if (which === "from" && date <= rangeToDate) {
      rangeFromDate = date;
    } else if (which === "to" && date >= rangeFromDate) {
      rangeToDate = date;
    }
    updateSliderUI();
  }

  function onUp() {
    thumb.classList.remove("dragging");
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onUp);
    applyTimelineFilter();
    renderMarkers();
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp, { once: true });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onUp, { once: true });
}

rangeTrack.addEventListener("mousedown", (e) => {
  const rect = rangeTrack.getBoundingClientRect();
  const pct = ((e.clientX - rect.left) / rect.width) * 100;
  const date = pctToDate(pct);
  // snap to nearer thumb
  const distFrom = Math.abs(dateToPct(rangeFromDate) - pct);
  const distTo = Math.abs(dateToPct(rangeToDate) - pct);
  if (distFrom <= distTo) {
    rangeFromDate = date;
  } else {
    rangeToDate = date;
  }
  updateSliderUI();
  applyTimelineFilter();
  renderMarkers();
});

// ── DOM Markers ────────────────────────────────────────────────

function clearMarkers() {
  markers.forEach(m => m.remove());
  markers = [];
}

function renderMarkers({ fit = false } = {}) {
  if (!map) return;

  baseRecords = records;
  applyTimelineFilter();

  clearMarkers();
  hideDetail();

  if (currentRecords.length === 0) return;

  // group by coordinate: autoCluster uses continuous grid, else exact
  const gridDeg = autoCluster ? clusterGridDeg() : 0;
  const groups = new Map();
  for (const r of currentRecords) {
    const gLng = gridDeg ? Math.round(r.lng / gridDeg) * gridDeg : r.lng;
    const gLat = gridDeg ? Math.round(r.lat / gridDeg) * gridDeg : r.lat;
    const key = `${gLng.toFixed(7)},${gLat.toFixed(7)}`;
    if (!groups.has(key)) {
      groups.set(key, { recs: [], lng: gLng, lat: gLat });
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
  const maxScale = labelMode === "dot" ? 15 : 10;
  let sizeScale;
  if (sizeMode === "count") {
    const raw = recsList.map(recs => Math.log1p(recs.length - 1));
    sizeScale = sqrtScale(raw, maxScale);
  } else if (sizeMode === "duration") {
    const raw = recsList.map(recs => Math.log1p(totalDurationHours(recs)));
    sizeScale = sqrtScale(raw, maxScale);
  } else {
    sizeScale = new Map(); // uniform size
  }

  for (let gi = 0; gi < groupList.length; gi++) {
    const { recs, lng, lat } = groupList[gi];
    const count = recs.length;
    const domAct = dominantActivity(recs);
    const color = typeColorMap[domAct] || "#a9a9a9";
    const el = document.createElement("div");

    const scale = sizeScale.has(gi) ? sizeScale.get(gi) : 0;

    if (labelMode === "dot") {
      const size = 10 + scale * 2.5;
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
      const fontSize = 10 + scale * 1.0;
      const stroke = 2 + scale * 0.2;
      el.className = "marker-label";
      el.style.fontSize = fontSize + "px";
      el.style.WebkitTextStroke = stroke + "px rgba(0,0,0,0.8)";
      el.style.color = color;
      el.textContent = labelMode === "place"
        ? (recs[0].place.length > 5 ? recs[0].place.slice(0, 5) + "…" : recs[0].place)
        : domAct;
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

  if (fit && coords.length > 0) {
    const { center, zoom } = calculateDenseMapCenterAndZoom(coords);
    map.flyTo({ center, zoom });
  }

  renderTraffic();
}

function initTrafficLayers() {
  if (!map) return;

  // arrow icon
  const arrowCanvas = document.createElement("canvas");
  arrowCanvas.width = 16; arrowCanvas.height = 16;
  const actx = arrowCanvas.getContext("2d");
  actx.fillStyle = "#fff";
  actx.beginPath();
  actx.moveTo(8, 0); actx.lineTo(16, 12); actx.lineTo(10, 12); actx.lineTo(10, 16);
  actx.lineTo(6, 16); actx.lineTo(6, 12); actx.lineTo(0, 12); actx.closePath();
  actx.fill();
  if (map.hasImage("arrow")) map.removeImage("arrow");
  map.addImage("arrow", actx.getImageData(0, 0, 16, 16), { width: 16, height: 16 });

  // source
  if (map.getSource("traffic-source")) map.removeSource("traffic-source");
  map.addSource("traffic-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

  // shadow
  map.addLayer({
    id: "traffic-shadow",
    type: "line",
    source: "traffic-source",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#000",
      "line-width": ["+", ["get", "width"], 3],
      "line-opacity": 0.35,
      "line-blur": 2,
    },
  });

  // colored line
  map.addLayer({
    id: "traffic-line",
    type: "line",
    source: "traffic-source",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["get", "width"],
      "line-opacity": 0.75,
    },
  });

  // arrows
  map.addLayer({
    id: "traffic-arrow",
    type: "symbol",
    source: "traffic-source",
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 80,
      "icon-image": "arrow",
      "icon-size": 0.5,
      "icon-rotate": 90,
      "icon-rotation-alignment": "map",
    },
    paint: {
      "icon-opacity": 0.7,
    },
  });
}

// ── traffic lines ──────────────────────────────────────────────

function renderTraffic() {
  const src = map.getSource("traffic-source");
  if (!src) return;

  if (!trafficVisible || autoCluster) {
    src.setData({ type: "FeatureCollection", features: [] });
    return;
  }

  // filter by timeline date range
  const filtered = traffic.filter(t => t.date >= rangeFromDate && t.date <= rangeToDate);
  if (!filtered.length) { src.setData({ type: "FeatureCollection", features: [] }); return; }

  // group by OD pair
  const odMap = new Map();
  for (const t of filtered) {
    const key = `${t.origin_lat},${t.origin_lng}->${t.dest_lat},${t.dest_lng}`;
    if (!odMap.has(key)) odMap.set(key, []);
    odMap.get(key).push(t);
  }

  // 5-tier width based on total duration per OD
  const odTotals = [...odMap.values()].map(items => items.reduce((s, i) => s + i.duration_sec, 0));
  odTotals.sort((a, b) => a - b);
  const quintile = (p) => odTotals[Math.floor(odTotals.length * p)] || 0;
  const WIDTHS = [1, 2, 3, 4.5, 6];

  function getWidth(totalSec) {
    if (odTotals.length < 3) return 2;
    if (totalSec <= quintile(0.2)) return WIDTHS[0];
    if (totalSec <= quintile(0.4)) return WIDTHS[1];
    if (totalSec <= quintile(0.6)) return WIDTHS[2];
    if (totalSec <= quintile(0.8)) return WIDTHS[3];
    return WIDTHS[4];
  }

  const features = [];
  for (const items of odMap.values()) {
    // sort by from_time, then split into segments by type
    items.sort((a, b) => a.from_time.localeCompare(b.from_time));
    const totalDur = items.reduce((s, i) => s + i.duration_sec, 0);
    const lineWidth = getWidth(totalDur);

    // merge consecutive same-type segments
    const segments = [];
    for (const item of items) {
      const last = segments[segments.length - 1];
      if (last && last.type === item.type) {
        last.duration_sec += item.duration_sec;
      } else {
        segments.push({ type: item.type, duration_sec: item.duration_sec });
      }
    }

    const segTotal = segments.reduce((s, seg) => s + seg.duration_sec, 0);
    const first = items[0];
    const last = items[items.length - 1];
    const oLng = first.origin_lng, oLat = first.origin_lat;
    const dLng = last.dest_lng, dLat = last.dest_lat;

    // precompute the full arc path
    const arcPath = buildArc(oLng, oLat, dLng, dLat, 20);
    const arcLen = arcPath.length - 1; // number of segments in the arc

    let cumPct = 0;
    for (const seg of segments) {
      const segPct = seg.duration_sec / segTotal;
      const startPct = cumPct;
      cumPct += segPct;
      const endPct = cumPct;

      // slice the arc path proportionally
      const startIdx = Math.round(startPct * arcLen);
      const endIdx = Math.round(endPct * arcLen);
      const coords = arcPath.slice(startIdx, endIdx + 1);
      if (coords.length < 2) coords.push(arcPath[Math.min(endIdx + 1, arcLen)]);

      const color = TRAFFIC_COLOR_MAP[seg.type] || "#a9a9a9";
      const detail = items.map(t => ({
        type: t.type,
        origin: t.origin,
        dest: t.dest,
        from_time: t.from_time,
        to_time: t.to_time,
        duration_sec: t.duration_sec,
      }));
      features.push({
        type: "Feature",
        properties: { color, width: lineWidth, detail: JSON.stringify(detail) },
        geometry: { type: "LineString", coordinates: coords },
      });
    }
  }

  src.setData({ type: "FeatureCollection", features });
}

function buildArc(lng1, lat1, lng2, lat2, n) {
  // quadratic bezier with control point offset perpendicular to the line
  const mx = (lng1 + lng2) / 2;
  const my = (lat1 + lat2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.3; // curvature
  // perpendicular unit vector
  const len = dist || 1;
  const px = -dy / len * offset;
  const py = dx / len * offset;
  const cx = mx + px;
  const cy = my + py;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * cx + t * t * lng2;
    const y = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * cy + t * t * lat2;
    pts.push([x, y]);
  }
  return pts;
}

// ── helpers ────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return "?";
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "?";
}

function weatherIcon(condition) {
  const map = {
    "clear": "☀️", "mostlyClear": "🌤️", "partlyCloudy": "⛅",
    "cloudy": "☁️", "mostlyCloudy": "☁️", "overcast": "☁️",
    "rain": "🌧️", "snow": "❄️", "fog": "🌫️", "windy": "💨",
  };
  return map[condition] || "🌡️";
}

function countryFlag(code) {
  if (!code || code.length !== 2) return "";
  const A = "A".charCodeAt(0);
  return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - A, 0x1F1E6 + code.charCodeAt(1) - A);
}

function formatWxChip(w) {
  const icon = weatherIcon(w.condition);
  const visKm = (w.visibilityM / 1000).toFixed(1);
  const humPct = Math.round(w.humidity * 100);
  const feels = w.feelsLikeC != null ? `(体感${w.feelsLikeC}°)` : "";
  const precip = w.precipType && w.precipType !== "none" ? ` ${w.precipType}${w.precipMm}mm(${Math.round(w.precipProb * 100)}%)` : "";
  const uv = w.uvLevel ? ` UV${w.uvIndex} ${w.uvLevel}` : "";
  return `<span class="detail-wx-chip">${icon} ${w.time} ${w.tempC}°C${feels} ${w.windDir}${w.windKmh}km/h 湿${humPct}% 见${visKm}km${uv}${precip}</span>`;
}

function dominantActivity(recs) {
  const acc = {};
  for (const r of recs) {
    if (r.arrival && r.departure) {
      const a = new Date(r.arrival);
      const d = new Date(r.departure);
      if (d > a) acc[r.activity] = (acc[r.activity] || 0) + (d - a) / 3600000;
    }
  }
  let best = null, max = -1;
  for (const [act, hrs] of Object.entries(acc)) {
    if (hrs > max) { max = hrs; best = act; }
  }
  return best || recs[0].activity;
}

function clusterGridDeg() {
  // ~20 screen pixels target — only merge truly adjacent points
  const metersPerPixel = 156543 / Math.pow(2, map.getZoom());
  const targetMeters = 20 * metersPerPixel;
  return targetMeters / 111320;
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

function sqrtScale(values, maxScale) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const range = hi > lo ? hi - lo : 1;
  const map = new Map();
  for (let i = 0; i < values.length; i++) {
    map.set(i, Math.round(((values[i] - lo) / range) * maxScale));
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
    initTrafficLayers();
    if (trafficVisible) renderTraffic();
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
showTrafficCb.addEventListener("change", () => {
  trafficVisible = showTrafficCb.checked;
  renderTraffic();
});
autoClusterCb.addEventListener("change", () => {
  autoCluster = autoClusterCb.checked;
  localStorage.setItem(LS_CLUSTER_KEY, autoCluster);
  renderMarkers();
});

scenicCb.addEventListener("change", (e) => {
  e.preventDefault();
  scenicCb.checked = false;
  window.showIntroSheep && window.showIntroSheep('坐等绵羊整理照片', 2500);
});

photoCb.addEventListener("change", (e) => {
  e.preventDefault();
  photoCb.checked = false;
  window.showIntroSheep && window.showIntroSheep('坐等绵羊整理照片', 2500);
});

// ── bootstrap ──────────────────────────────────────────────────

populateStyleOptions();
labelModeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === labelMode));
sizeModeBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === sizeMode));
autoClusterCb.checked = autoCluster;
initMap();
