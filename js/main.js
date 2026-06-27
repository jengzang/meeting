import { THEMES } from "./config.js";
import { parseDate } from "./utils.js";
import { START_DATE, END_DATE } from "./config.js";
import { shapeData, depthData, getMonthStats, renderCalendar, renderLegend, renderMonthRatio, renderTotalPie, renderMonthlyPies } from "./heatmap.js";

// ── state ──────────────────────────────────────────────────────

let currentMode = "shape";
let currentTheme = "githubGreen";

// ── DOM refs ───────────────────────────────────────────────────

const calendarEl = document.getElementById("calendar");
const legendEl = document.getElementById("legend");
const monthRatioEl = document.getElementById("monthRatio");
const totalPieSectionEl = document.getElementById("totalPieSection");
const monthlyPieSectionEl = document.getElementById("monthlyPieSection");
const modeSelect = document.getElementById("modeSelect");
const themeSelect = document.getElementById("themeSelect");

// ── theme ──────────────────────────────────────────────────────

function applyTheme(name) {
  const theme = THEMES[name];
  for (const [key, value] of Object.entries(theme)) {
    document.documentElement.style.setProperty(key, value);
  }
}

// ── render all ─────────────────────────────────────────────────

function renderAll() {
  const startDate = parseDate(START_DATE);
  const endDate = parseDate(END_DATE);
  const paintedData = currentMode === "shape" ? shapeData : depthData;
  const monthStats = getMonthStats(startDate, endDate, paintedData);

  renderCalendar(calendarEl, { mode: currentMode, shapeData, depthData });
  renderLegend(legendEl, currentMode);
  renderMonthRatio(monthRatioEl, { startDate, endDate, monthStats });
  renderTotalPie(totalPieSectionEl, monthStats);
  renderMonthlyPies(monthlyPieSectionEl, monthStats);
}

// ── init ───────────────────────────────────────────────────────

modeSelect.value = currentMode;
themeSelect.value = currentTheme;

modeSelect.addEventListener("change", e => {
  currentMode = e.target.value;
  renderAll();
});

themeSelect.addEventListener("change", e => {
  currentTheme = e.target.value;
  applyTheme(currentTheme);
  renderAll();
});

applyTheme(currentTheme);
renderAll();
