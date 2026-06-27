import { mapStyleConfig, mapStyle, calculateDenseMapCenterAndZoom } from "./map-source.js";

// ── state ──────────────────────────────────────────────────────

let currentStyle = "gaode";
let map = null;

// ── DOM refs ───────────────────────────────────────────────────

const styleSelect = document.getElementById("styleSelect");
const resetBtn = document.getElementById("resetBtn");

// ── init map ───────────────────────────────────────────────────

function initMap() {
  map = new maplibregl.Map({
    container: "map",
    style: mapStyle(currentStyle),
    center: [113.2644, 23.1291],  // 广州
    zoom: 8,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl(), "top-left");
}

// ── style switching ────────────────────────────────────────────

function changeMapStyle(name) {
  if (!map) return;
  currentStyle = name;
  map.setStyle(mapStyle(name));
}

function resetView() {
  if (!map) return;
  map.flyTo({ center: [113.2644, 23.1291], zoom: 8 });
}

// ── populate dropdown ──────────────────────────────────────────

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
