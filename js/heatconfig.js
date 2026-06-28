import { rangeMD } from "./utils.js";

export const YEAR = 2026;

export const START_DATE = "2026-02-16";
export const END_DATE = "2026-06-21";

export const SHAPE_INPUT = {
  top: [
    "5.5", "5.19", "6.10"
  ],

  middle: [
    "2.17", "4.6", "5.1"
  ],

  bottom: [
    "2.16", "2.22", "3.6", "3.13", "3.20",
    "5.14", "5.22", "5.27"
  ],

  full: [
    "2.21", "2.26",
    "3.7", "3.8", "3.14", "3.15", "3.16", "3.21",
    "4.4", "4.5", "4.18", "4.19", "4.20",
    "5.2", "5.3", "5.4",
    "5.15", "5.16", "5.17", "5.18",
    "5.23", "5.24",
    ...rangeMD("5.28", "6.9", YEAR),
    ...rangeMD("6.18", "6.21", YEAR)
  ]
};

export const DEPTH_INPUT = {
  4: [
    "3.7", "3.8", "3.14", "3.15", "3.16", "3.21",
    "4.4", "4.5", "4.18", "4.19", "4.20",
    "5.15", "5.16", "5.17", "5.18",
    "5.23", "5.24",
    ...rangeMD("5.28", "6.9", YEAR),
    ...rangeMD("6.18", "6.21", YEAR)
  ],

  3: [
    "2.26",
    "3.6", "3.13", "3.20",
    "5.14", "5.22", "5.27",
    ...rangeMD("5.2", "5.4", YEAR)
  ],

  2: [
    "2.21", "5.1", "5.5", "5.19", "6.10"
  ],

  1: [
    "2.16", "2.17", "2.22", "4.6"
  ]
};

export const THEMES = {
  githubGreen: {
    "--bg": "#0d1117",
    "--panel": "rgba(22, 27, 34, 0.92)",
    "--text": "#e6edf3",
    "--muted": "#8b949e",
    "--empty": "#21262d",
    "--level-1": "#6ccf7f",
    "--level-2": "#40c463",
    "--level-3": "#30a14e",
    "--level-4": "#216e39",
    "--shape-color": "#40c463",
    "--glow": "rgba(64, 196, 99, 0.42)"
  },

  oceanBlue: {
    "--bg": "#061327",
    "--panel": "rgba(8, 24, 52, 0.9)",
    "--text": "#eaf4ff",
    "--muted": "#8fb8e8",
    "--empty": "rgba(96, 165, 250, 0.14)",
    "--level-1": "#60a5fa",
    "--level-2": "#3b82f6",
    "--level-3": "#2563eb",
    "--level-4": "#1e40af",
    "--shape-color": "#3b82f6",
    "--glow": "rgba(59, 130, 246, 0.45)"
  },

  cyberCyan: {
    "--bg": "#020617",
    "--panel": "rgba(15, 23, 42, 0.9)",
    "--text": "#ecfeff",
    "--muted": "#67e8f9",
    "--empty": "rgba(103, 232, 249, 0.14)",
    "--level-1": "#67e8f9",
    "--level-2": "#22d3ee",
    "--level-3": "#06b6d4",
    "--level-4": "#0e7490",
    "--shape-color": "#22d3ee",
    "--glow": "rgba(34, 211, 238, 0.45)"
  },

  warmOrange: {
    "--bg": "#1c1208",
    "--panel": "rgba(67, 36, 13, 0.84)",
    "--text": "#fff7ed",
    "--muted": "#fed7aa",
    "--empty": "rgba(253, 186, 116, 0.18)",
    "--level-1": "#fdba74",
    "--level-2": "#fb923c",
    "--level-3": "#f97316",
    "--level-4": "#c2410c",
    "--shape-color": "#fb923c",
    "--glow": "rgba(251, 146, 60, 0.45)"
  },

  rosePink: {
    "--bg": "#1f0712",
    "--panel": "rgba(76, 5, 25, 0.84)",
    "--text": "#fff1f2",
    "--muted": "#fda4af",
    "--empty": "rgba(253, 164, 175, 0.16)",
    "--level-1": "#fda4af",
    "--level-2": "#fb7185",
    "--level-3": "#f43f5e",
    "--level-4": "#be123c",
    "--shape-color": "#fb7185",
    "--glow": "rgba(251, 113, 133, 0.42)"
  },

  violetPurple: {
    "--bg": "#140821",
    "--panel": "rgba(35, 15, 65, 0.86)",
    "--text": "#faf5ff",
    "--muted": "#c4b5fd",
    "--empty": "rgba(196, 181, 253, 0.16)",
    "--level-1": "#c4b5fd",
    "--level-2": "#a78bfa",
    "--level-3": "#8b5cf6",
    "--level-4": "#6d28d9",
    "--shape-color": "#a78bfa",
    "--glow": "rgba(167, 139, 250, 0.42)"
  }
};
