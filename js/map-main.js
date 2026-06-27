import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";
import { getDefaultRecords, getUniqueTypes, getTypeStats, getDateExtent } from "./map-data.js";

// ── localStorage key ────────────────────────────────────────────

const LS_STYLE_KEY = "map-style";

// ── state ──────────────────────────────────────────────────────

let currentStyle = localStorage.getItem(LS_STYLE_KEY) || "gaode";
let map = null;
let clusteredPopup = null;
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

// ── helpers ────────────────────────────────────────────────────

function getPopup() {
  if (!clusteredPopup) {
    clusteredPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10
    });
  }
  return clusteredPopup;
}

function buildColorMap(types) {
  const map = {};
  types.forEach((t, i) => {
    map[t] = COLOR_PALETTE[i % COLOR_PALETTE.length];
  });
  return map;
}

// ── map init ───────────────────────────────────────────────────

function initMap() {
  console.log("[map] init with style:", currentStyle, "container:", document.getElementById("map"));

  map = new maplibregl.Map({
    container: "map",
    style: mapStyle(currentStyle),
    center: [113.2644, 23.1291],
    zoom: 8,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl(), "top-left");

  map.on("load", () => {
    console.log("[map] style loaded OK");
    renderMarkers();
  });

  map.on("error", (e) => {
    console.error("[map] error:", e.error);
  });

  styleSelect.value = currentStyle;
}

// ── marker rendering (circle-only, no glyphs) ───────────────────

function renderMarkers() {
  if (!map) return;

  currentRecords = getDefaultRecords();
  console.log("[map] records to render:", currentRecords.length);
  recordCountEl.textContent = `${currentRecords.length} 条记录`;

  if (currentRecords.length === 0) {
    console.warn("[map] no records in date range");
    return;
  }

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
        bgColor: typeColorMap[r.activity] || "#1b2e2b"
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

  // cluster circles (no text — radius encodes count)
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "records",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#51bbd6",
        10, "#f1f075",
        30, "#f28cb1"
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        20,
        10, 28,
        30, 38
      ],
      "circle-opacity": 0.88,
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(255, 255, 255, 0.9)"
    }
  });

  // unclustered point circles (color = activity type)
  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "records",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 12,
      "circle-color": ["get", "bgColor"],
      "circle-opacity": 0.88,
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(255, 255, 255, 0.85)"
    }
  });

  bindInteractions();
  renderLegend();

  // auto-center
  const coords = currentRecords.map(r => [r.lng, r.lat]);
  const { center, zoom } = calculateDenseMapCenterAndZoom(coords);
  map.flyTo({ center, zoom });
}

// ── legend ─────────────────────────────────────────────────────

function renderLegend() {
  let el = document.getElementById("typeLegend");
  if (!el) {
    el = document.createElement("div");
    el.id = "typeLegend";
    el.className = "type-legend";
    document.querySelector(".map-wrap").appendChild(el);
  }

  const stats = getTypeStats(currentRecords);
  const colorMap = buildColorMap(getUniqueTypes());

  el.innerHTML = stats.map(([type, count]) => `
    <span class="type-legend-item">
      <span class="type-dot" style="background:${colorMap[type]}"></span>
      ${type} ${count}
    </span>
  `).join("");
}

// ── interaction handlers ───────────────────────────────────────

function bindInteractions() {
  if (!map) return;

  // remove old listeners to prevent stacking
  map.off("click", "clusters", onClusterClick);
  map.off("mouseenter", "unclustered-point", onPointEnter);
  map.off("mouseleave", "unclustered-point", onPointLeave);
  map.off("mouseenter", "clusters", onClusterEnter);
  map.off("mouseleave", "clusters", onClusterLeave);

  map.on("click", "clusters", onClusterClick);
  map.on("mouseenter", "unclustered-point", onPointEnter);
  map.on("mouseleave", "unclustered-point", onPointLeave);
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
    getPopup()
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${p.place}</strong><br>${p.activity} · ${p.date}`)
      .addTo(map);
  }
}

function onPointLeave() {
  map.getCanvas().style.cursor = "";
  getPopup().remove();
}

function onClusterEnter() { map.getCanvas().style.cursor = "pointer"; }
function onClusterLeave() { map.getCanvas().style.cursor = ""; }

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

  ["unclustered-point", "clusters"].forEach(id => {
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
  map.setStyle(mapStyle(name));
  map.once("style.load", () => {
    renderMarkers();
  });
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

// ── bootstrap ──────────────────────────────────────────────────

populateStyleOptions();
initMap();
