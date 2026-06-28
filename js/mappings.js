// ── Main mappings: colors, icons, helpers ────────────────────
// Canonical source for main map + main timeline

// ── Weather icons ──────────────────────────────────────────

export const WEATHER_ICONS = {
  "clear": "☀️", "mostlyClear": "🌤️", "partlyCloudy": "⛅",
  "cloudy": "☁️", "mostlyCloudy": "☁️", "overcast": "☁️",
  "rain": "🌧️", "snow": "❄️", "fog": "🌫️", "windy": "💨",
};

export function weatherIcon(condition) {
  return WEATHER_ICONS[condition] || "🌡️";
}

// ── Country flag ──────────────────────────────────────────

export function countryFlag(code) {
  if (!code || code.length !== 2) return "";
  const A = "A".charCodeAt(0);
  return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - A, 0x1F1E6 + code.charCodeAt(1) - A);
}

// ── Fallback palette ──────────────────────────────────────

export const FALLBACK_PALETTE = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#42d4f4", "#f032e6", "#bfe745", "#fabed4",
  "#469990", "#dcbaff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9"
];

export function fallbackColor(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

// ── Record colors (canonical for both map & timeline) ─────

export const RECORD_COLORS = {
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

// ── Traffic colors (canonical for both map & timeline) ────

export const TRAFFIC_COLORS = {
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
