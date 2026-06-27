import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";
import { getDefaultRecords, getUniqueTypes, getShapeInputDateExtent, filterByDateRange } from "./map-data.js";

// ── localStorage key ────────────────────────────────────────────

const LS_STYLE_KEY = "map-style";

// ── state ──────────────────────────────────────────────────────

let currentStyle = localStorage.getItem(LS_STYLE_KEY) || "gaode";
let map = null;
let baseRecords = [];
let currentRecords = [];

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

// ── custom popup ───────────────────────────────────────────────

let popupEl = null;

function ensurePopup() {
  if (!popupEl) {
    popupEl = document.createElement("div");
    popupEl.className = "custom-popup";
    popupEl.style.display = "none";
    document.querySelector(".map-wrap").appendChild(popupEl);
  }
  return popupEl;
}

function showPopup(lngLat, props) {
  const el = ensurePopup();
  const arr = fmtTime(props.arrival);
  const dep = fmtTime(props.departure);
  el.innerHTML = `
    <div class="custom-popup-place">${props.place}</div>
    <div class="custom-popup-meta">${props.activity}</div>
    <div class="custom-popup-time">${props.date} ${arr} — ${dep}</div>
  `;
  el.style.display = "";

  // position next tick so layout is computed
  requestAnimationFrame(() => {
    const pt = map.project(lngLat);
    el.style.left = pt.x + "px";
    el.style.top = (pt.y - el.offsetHeight - 10) + "px";
  });
}

function hidePopup() {
  if (popupEl) popupEl.style.display = "none";
}

function updatePopupPosition(lngLat) {
  if (!popupEl || popupEl.style.display === "none") return;
  const pt = map.project(lngLat);
  popupEl.style.left = pt.x + "px";
  popupEl.style.top = (pt.y - popupEl.offsetHeight - 10) + "px";
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

  // reposition popup when map moves
  map.on("move", () => {
    if (popupEl && popupEl.style.display !== "none" && popupEl._lngLat) {
      updatePopupPosition(popupEl._lngLat);
    }
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

// ── marker rendering (text-only, no circles) ───────────────────

function renderMarkers() {
  if (!map) return;

  baseRecords = getDefaultRecords();
  applyTimelineFilter();
  console.log("[map] records:", currentRecords.length, "/", baseRecords.length);
  recordCountEl.textContent = `${currentRecords.length} 条记录`;

  if (currentRecords.length === 0) return;

  const typeColorMap = buildColorMap(getUniqueTypes());

  const geojson = {
    type: "FeatureCollection",
    features: currentRecords.map(r => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      properties: {
        activity: r.activity,
        place: r.place,
        date: r.date,
        arrival: r.arrival,
        departure: r.departure,
        textColor: typeColorMap[r.activity] || "#a9a9a9"
      }
    }))
  };

  cleanMapLayers();

  map.addSource("records", {
    type: "geojson",
    data: geojson,
    cluster: true,
    clusterMaxZoom: 17,
    clusterRadius: 30
  });

  // cluster circles
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "records",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step", ["get", "point_count"],
        "#51bbd6", 10, "#f1f075", 30, "#f28cb1"
      ],
      "circle-radius": [
        "step", ["get", "point_count"],
        20, 10, 28, 30, 38
      ],
      "circle-opacity": 0.88,
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(255, 255, 255, 0.9)"
    }
  });

  // cluster count
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "records",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["Open Sans Bold"],
      "text-size": 13
    },
    paint: { "text-color": "#ffffff" }
  });

  // unclustered — activity text label (no circle)
  map.addLayer({
    id: "unclustered-label",
    type: "symbol",
    source: "records",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "activity"],
      "text-font": ["Open Sans Bold"],
      "text-size": 12,
      "text-anchor": "center"
    },
    paint: { "text-color": ["get", "textColor"] }
  });

  bindInteractions();

  const coords = currentRecords.map(r => [r.lng, r.lat]);
  const { center, zoom } = calculateDenseMapCenterAndZoom(coords);
  map.flyTo({ center, zoom });
}

// ── interaction handlers ───────────────────────────────────────

function bindInteractions() {
  if (!map) return;

  map.off("click", "clusters", onClusterClick);
  map.off("mouseenter", "unclustered-label", onPointEnter);
  map.off("mouseleave", "unclustered-label", onPointLeave);
  map.off("mousemove", "unclustered-label", onPointMove);
  map.off("mouseenter", "clusters", onClusterEnter);
  map.off("mouseleave", "clusters", onClusterLeave);

  map.on("click", "clusters", onClusterClick);
  map.on("mouseenter", "unclustered-label", onPointEnter);
  map.on("mouseleave", "unclustered-label", onPointLeave);
  map.on("mouseenter", "clusters", onClusterEnter);
  map.on("mouseleave", "clusters", onClusterLeave);
}

function onClusterClick(e) {
  const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
  if (!features.length) return;
  const clusterId = features[0].properties.cluster_id;
  map.getSource("records").getClusterExpansionZoom(clusterId, (err, zoom) => {
    if (err) return;
    map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 0.5 });
  });
}

function onPointEnter(e) {
  map.getCanvas().style.cursor = "pointer";
  if (e.features.length > 0) {
    const p = e.features[0].properties;
    popupEl._lngLat = e.lngLat;
    showPopup(e.lngLat, p);
  }
}

function onPointLeave() {
  map.getCanvas().style.cursor = "";
  if (popupEl) popupEl._lngLat = null;
  hidePopup();
}

function onPointMove(e) {
  if (e.features.length > 0 && popupEl) {
    popupEl._lngLat = e.lngLat;
    updatePopupPosition(e.lngLat);
  }
}

function onClusterEnter() { map.getCanvas().style.cursor = "pointer"; }
function onClusterLeave() { map.getCanvas().style.cursor = ""; }

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

// ── cleanup ────────────────────────────────────────────────────

function cleanMapLayers() {
  if (!map) return;

  ["unclustered-label", "cluster-count", "clusters"].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });

  if (map.getSource("records")) {
    map.removeSource("records");
  }
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

// ── bootstrap ──────────────────────────────────────────────────

populateStyleOptions();
initMap();
