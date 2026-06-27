import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";
import { getDefaultRecords, getUniqueTypes, getTypeStats, getDateExtent } from "./map-data.js";

// ── state ──────────────────────────────────────────────────────

let currentStyle = "gaode";
let map = null;
let clusteredPopup = null;
let currentRecords = []; // the currently displayed record set

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
const recordCountEl = document.getElementById("recordCount");

// ── helpers ────────────────────────────────────────────────────

/**
 * Build a MapLibre Popup singleton.
 */
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

/**
 * Activity type → color string.
 */
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
    renderMarkers();
  });
}

// ── marker rendering ───────────────────────────────────────────

function renderMarkers() {
  if (!map) return;

  currentRecords = getDefaultRecords();
  recordCountEl.textContent = `${currentRecords.length} 条记录`;
  if (currentRecords.length === 0) return;

  // assign colors per activity type
  const typeColorMap = buildColorMap(getUniqueTypes());

  // build GeoJSON
  const geojson = {
    type: "FeatureCollection",
    features: currentRecords.map(r => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [r.lng, r.lat]
      },
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
    clusterMaxZoom: 20,
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
        10, 25,
        30, 35
      ],
      "circle-opacity": 0.85,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff"
    }
  });

  // cluster count labels
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
    paint: {
      "text-color": "#ffffff"
    }
  });

  // unclustered point backgrounds
  map.addLayer({
    id: "unclustered-point-bg",
    type: "circle",
    source: "records",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 14,
      "circle-color": ["get", "bgColor"],
      "circle-opacity": 0.88,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "rgba(255, 255, 255, 0.75)"
    }
  });

  // unclustered point text
  map.addLayer({
    id: "unclustered-point-text",
    type: "symbol",
    source: "records",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "activity"],
      "text-size": 10,
      "text-font": ["Open Sans Regular"],
      "text-anchor": "center",
      "text-offset": [0, 0]
    },
    paint: {
      "text-color": "#ffffff"
    }
  });

  bindInteractions();

  // auto-center on data
  const coords = currentRecords.map(r => [r.lng, r.lat]);
  const { center, zoom } = calculateDenseMapCenterAndZoom(coords);
  map.flyTo({ center, zoom });
}

// ── interaction handlers ───────────────────────────────────────

function bindInteractions() {
  if (!map) return;

  const popup = getPopup();

  // click cluster → zoom in
  map.on("click", "clusters", (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
    if (!features.length) return;
    const clusterId = features[0].properties.cluster_id;
    map.getSource("records").getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 0.5 });
    });
  });

  // hover unclustered point → popup
  map.on("mouseenter", "unclustered-point-bg", (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (e.features.length > 0) {
      const p = e.features[0].properties;
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${p.place}</strong><br>${p.activity} · ${p.date}`)
        .addTo(map);
    }
  });

  map.on("mouseleave", "unclustered-point-bg", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  // hover cluster → pointer
  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });
}

// ── cleanup ────────────────────────────────────────────────────

function cleanMapLayers() {
  if (!map) return;

  ["unclustered-point-text", "unclustered-point-bg", "cluster-count", "clusters"].forEach(id => {
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
  map.setStyle(mapStyle(name));

  // re-render markers once the new style loads
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

// ── bootstrap ──────────────────────────────────────────────────

populateStyleOptions();
initMap();
