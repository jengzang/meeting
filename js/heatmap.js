import { parseDate, formatDate, addDays, buildWeeks, getMonthText, mdToDateStr } from "./utils.js";
import { YEAR, START_DATE, END_DATE, SHAPE_INPUT, DEPTH_INPUT } from "./heatconfig.js";

// ── data builders ──────────────────────────────────────────────

function buildShapeData(input) {
  const result = {};
  for (const [shape, dateList] of Object.entries(input)) {
    for (const md of dateList) {
      result[mdToDateStr(md, YEAR)] = shape;
    }
  }
  return result;
}

function buildDepthData(input) {
  const result = {};
  for (const [level, dateList] of Object.entries(input)) {
    for (const md of dateList) {
      result[mdToDateStr(md, YEAR)] = Number(level);
    }
  }
  return result;
}

// ── stats ──────────────────────────────────────────────────────

export function getMonthStats(startDate, endDate, paintedData) {
  const stats = [];
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const actualStart = monthStart < startDate ? startDate : monthStart;
    const actualEnd = monthEnd > endDate ? endDate : monthEnd;

    let total = 0;
    let filled = 0;

    let day = new Date(actualStart);
    while (day <= actualEnd) {
      total++;
      if (paintedData[formatDate(day)]) filled++;
      day = addDays(day, 1);
    }

    const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
    stats.push({
      label: `${month + 1}月`,
      total,
      filled,
      percent
    });

    cursor = new Date(year, month + 1, 1);
  }

  return stats;
}

// ── helpers ────────────────────────────────────────────────────

function shapeToText(shape) {
  const map = { full: "全满", top: "上半", middle: "中间", bottom: "下半" };
  return map[shape] || shape;
}

function levelToText(level) {
  const map = { 1: "最浅", 2: "次浅", 3: "次深", 4: "最深" };
  return map[level] || `等级 ${level}`;
}

// ── renderers ──────────────────────────────────────────────────

export function renderCalendar(el, { mode, shapeData, depthData }) {
  const startDate = parseDate(START_DATE);
  const endDate = parseDate(END_DATE);
  const weeks = buildWeeks(startDate, endDate);

  el.innerHTML = "";

  // month labels row
  const monthRow = document.createElement("div");
  monthRow.className = "month-row";

  let lastMonth = null;
  for (const week of weeks) {
    const firstDayInRange = week.find(day => day >= startDate && day <= endDate);
    const cell = document.createElement("div");
    if (firstDayInRange && firstDayInRange.getMonth() !== lastMonth) {
      cell.className = "month-label";
      cell.textContent = getMonthText(firstDayInRange);
      lastMonth = firstDayInRange.getMonth();
    }
    monthRow.appendChild(cell);
  }

  // weekday column
  const weekdayCol = document.createElement("div");
  weekdayCol.className = "weekday-col";
  for (const day of ["一", "二", "三", "四", "五", "六", "日"]) {
    const div = document.createElement("div");
    div.textContent = day;
    weekdayCol.appendChild(div);
  }

  // week cells
  const weekGrid = document.createElement("div");
  weekGrid.className = "week-grid";

  for (const week of weeks) {
    const weekCol = document.createElement("div");
    weekCol.className = "week";

    for (const date of week) {
      const dateStr = formatDate(date);
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.title = dateStr;

      if (date < startDate || date > endDate) {
        cell.style.visibility = "hidden";
      } else {
        if (mode === "shape") {
          const shape = shapeData[dateStr];
          if (shape) {
            cell.classList.add(`shape-${shape}`);
            const fill = document.createElement("div");
            fill.className = "fill";
            cell.appendChild(fill);
            cell.title = `${dateStr}：${shapeToText(shape)}`;
          }
        } else {
          const level = depthData[dateStr];
          if (level) {
            cell.classList.add(`level-${level}`);
            cell.title = `${dateStr}：${levelToText(level)}`;
          }
        }
      }

      weekCol.appendChild(cell);
    }

    weekGrid.appendChild(weekCol);
  }

  el.appendChild(monthRow);
  el.appendChild(weekdayCol);
  el.appendChild(weekGrid);
}

export function renderLegend(el, mode) {
  if (mode === "shape") {
    el.innerHTML = `
      <span>形状：</span>
      <span class="legend-box" style="background: var(--shape-color);"></span><span>全满</span>
      <span class="legend-box" style="background: linear-gradient(to bottom, var(--shape-color) 50%, var(--empty) 50%);"></span><span>上半</span>
      <span class="legend-box" style="background: linear-gradient(to bottom, var(--empty) 25%, var(--shape-color) 25%, var(--shape-color) 75%, var(--empty) 75%);"></span><span>中间</span>
      <span class="legend-box" style="background: linear-gradient(to top, var(--shape-color) 50%, var(--empty) 50%);"></span><span>下半</span>
    `;
  } else {
    el.innerHTML = `
      <span>颜色深度：</span>
      <span>最浅</span>
      <span class="legend-box l1"></span>
      <span class="legend-box l2"></span>
      <span class="legend-box l3"></span>
      <span class="legend-box l4"></span>
      <span>最深</span>
    `;
  }
}

export function renderMonthRatio(el, { startDate, endDate, monthStats }) {
  el.innerHTML = `
    <div class="month-ratio-title">每月占比柱状图</div>
    ${monthStats.map(item => `
      <div class="month-ratio-item">
        <div>${item.label}</div>
        <div class="month-ratio-bar">
          <div class="month-ratio-fill" style="width: ${item.percent}%;"></div>
        </div>
        <div class="month-ratio-value">${item.filled}/${item.total} · ${item.percent}%</div>
      </div>
    `).join("")}
  `;
}

export function renderTotalPie(el, monthStats) {
  const active = monthStats.filter(item => item.filled > 0);
  const totalFilled = active.reduce((sum, item) => sum + item.filled, 0);

  if (totalFilled === 0) {
    el.innerHTML = `
      <div class="pie-section-title">总构成饼图</div>
      <div class="total-pie-legend">暂无涂色数据</div>
    `;
    return;
  }

  const pieColors = [
    "var(--level-1)",
    "var(--level-2)",
    "var(--level-3)",
    "var(--level-4)",
    "var(--shape-color)"
  ];

  let currentDeg = 0;
  const gradientParts = active.map((item, i) => {
    const startDeg = currentDeg;
    const angle = (item.filled / totalFilled) * 360;
    currentDeg += angle;
    return `${pieColors[i % pieColors.length]} ${startDeg}deg ${currentDeg}deg`;
  });

  const pieGradient = `conic-gradient(${gradientParts.join(", ")})`;

  el.innerHTML = `
    <div class="pie-section-title">总构成饼图</div>
    <div class="total-pie-layout">
      <div class="pie-wrap">
        <div class="pie-3d pie-large" style="--pie-gradient: ${pieGradient};"></div>
      </div>
      <div class="total-pie-legend">
        ${active.map((item, i) => {
          const percent = Math.round((item.filled / totalFilled) * 100);
          return `
            <div class="total-pie-legend-item">
              <span class="pie-dot" style="--dot-color: ${pieColors[i % pieColors.length]};"></span>
              <span>${item.label}</span>
              <span>${item.filled} 天</span>
              <span class="pie-value">${percent}%</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

export function renderMonthlyPies(el, monthStats) {
  el.innerHTML = `
    <div class="pie-section-title">每月占比饼图</div>
    <div class="monthly-pie-grid">
      ${monthStats.map(item => {
        const filledDeg = item.total === 0 ? 0 : (item.filled / item.total) * 360;
        const percent = item.total === 0 ? 0 : Math.round((item.filled / item.total) * 100);
        const emptyDays = item.total - item.filled;
        const pieGradient = `conic-gradient(
          var(--level-4) 0deg ${filledDeg}deg,
          var(--empty) ${filledDeg}deg 360deg
        )`;

        return `
          <div class="monthly-pie-card">
            <div class="monthly-pie-name">${item.label}</div>
            <div class="pie-wrap">
              <div class="pie-3d pie-small" style="--pie-gradient: ${pieGradient};"></div>
            </div>
            <div class="monthly-pie-info">
              <div class="monthly-pie-percent">${percent}%</div>
              <div>${item.filled}/${item.total} 天</div>
            </div>
            <div class="monthly-pie-mini-legend">
              <span style="--dot-color: var(--level-4);">已涂色 ${item.filled}</span>
              <span style="--dot-color: var(--empty);">未涂色 ${emptyDays}</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ── data cache ─────────────────────────────────────────────────

export const shapeData = buildShapeData(SHAPE_INPUT);
export const depthData = buildDepthData(DEPTH_INPUT);
