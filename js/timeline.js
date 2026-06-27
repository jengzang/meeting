// ── Color maps ─────────────────────────────────────────────────

export const RECORD_COLORS = {
  "学校": "#19c6c6",
  "活动聚会": "#13a113",
  "汽车相关": "#3b82f6",
  "办事": "#012F7B",
  "地标": "#ef4444",
  "飞机相关": "#3b82f6",
  "宿舍": "#4B0082",
  "旅行": "#ef4444",
  "商场": "#C3D117",
  "住宿": "#9e109e",
  "火车": "#6366f1",
  "就餐": "#ca8a04",
  "运动": "#f97316",
  "东莞家": "#FF6A00",
  "中山家": "#FF6A00",
  "探亲祭祖": "#FF8648",
  "医院": "#831100",
  "理发按摩": "#8D8602",
  "约会": "#FFC0CB",
  "地铁": "#6366f1",
  "老家": "#DA5100",
  "工作": "#3EB489",
};

export const TRAFFIC_COLORS = {
  "步行": "#00FF88",
  "机动车": "#3b82f6",
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

function fallbackColor(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

// ── Adapters ───────────────────────────────────────────────────

export function recordsToTimeline(records, colorMap) {
  const cm = colorMap || RECORD_COLORS;
  return records.map(r => {
    const start = new Date(r.arrival);
    const end = new Date(r.departure);
    const pad = n => String(n).padStart(2, '0');
    return {
      id: 'r-' + r.id,
      date: r.date,
      startTime: pad(start.getHours()) + ':' + pad(start.getMinutes()),
      endTime: pad(end.getHours()) + ':' + pad(end.getMinutes()),
      title: r.activity,
      subtitle: r.place || '',
      category: r.activity,
      color: cm[r.activity] || fallbackColor(r.activity),
      source: 'record',
      _raw: r,
    };
  });
}

export function trafficToTimeline(traffic, colorMap) {
  const cm = colorMap || TRAFFIC_COLORS;
  return traffic.map((t, i) => {
    const start = new Date(t.from_time);
    const end = new Date(t.to_time);
    const pad = n => String(n).padStart(2, '0');
    return {
      id: 't-' + (t.id || i),
      date: t.date,
      startTime: pad(start.getHours()) + ':' + pad(start.getMinutes()),
      endTime: pad(end.getHours()) + ':' + pad(end.getMinutes()),
      title: t.type,
      subtitle: (t.origin || '') + ' -> ' + (t.dest || ''),
      category: t.type,
      color: cm[t.type] || fallbackColor(t.type),
      source: 'traffic',
      _raw: t,
    };
  });
}

// ── Timeline class ─────────────────────────────────────────────

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return 0;
    return d.getHours() * 60 + d.getMinutes();
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function addDays(dateStr, n) {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export class Timeline {
  constructor(container, options = {}) {
    this.container = container;
    this.hourHeight = options.hourHeight || 64;
    this.colWidth = options.colWidth || 70;
    this.minDurationPx = options.minDurationPx || 20;
    this.compact = options.compact || false;
    this.dateFrom = options.dateFrom || null;
    this.dateTo = options.dateTo || null;
    this.onBlockClick = options.onBlockClick || null;

    this._data = [];
    this._recordsByDate = new Map();
    this._sortedDates = [];
    this._lanesByItem = new Map();
    this._tooltip = null;

    if (options.data) {
      this.setData(options.data);
    }
  }

  setData(data) {
    this._data = data || [];
    this._buildIndex();
    this.render();
  }

  setDateRange(from, to) {
    this.dateFrom = from;
    this.dateTo = to;
    this._buildIndex();
    this.render();
  }

  setCompact(on) {
    if (this.compact === on) return;
    this.compact = on;
    this.render();
  }

  destroy() {
    this.container.innerHTML = '';
    this._data = [];
    this._recordsByDate.clear();
    this._sortedDates = [];
    this._lanesByItem.clear();
    this._removeTooltip();
  }

  _buildIndex() {
    this._recordsByDate.clear();
    this._sortedDates = [];

    let items = this._data;
    if (this.dateFrom) items = items.filter(r => r.date >= this.dateFrom);
    if (this.dateTo) items = items.filter(r => r.date <= this.dateTo);

    items.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    const pushDate = (date, item) => {
      const list = this._recordsByDate.get(date) || [];
      list.push(item);
      this._recordsByDate.set(date, list);
    };

    for (const item of items) {
      const startMin = timeToMinutes(item.startTime);
      const endMin = timeToMinutes(item.endTime);

      if (endMin <= startMin) {
        // Cross-midnight: split into parts so each day displays correctly
        const part1 = { ...item, id: item.id + '_a', endTime: '24:00', _origEndTime: item.endTime };
        pushDate(item.date, part1);

        const nextD = addDays(item.date, 1);
        const part2 = { ...item, id: item.id + '_b', date: nextD, startTime: '00:00', _origStartTime: item.startTime };
        pushDate(nextD, part2);
      } else {
        pushDate(item.date, item);
      }
    }

    this._sortedDates = [...this._recordsByDate.keys()].sort();
    this._computeLanes();
  }

  _computeLanes() {
    this._lanesByItem.clear();

    for (const [date, items] of this._recordsByDate) {
      const lanes = [];

      for (const item of items) {
        const startMin = timeToMinutes(item.startTime);
        const endMin = timeToMinutes(item.endTime);

        let lane = -1;
        for (let i = 0; i < lanes.length; i++) {
          if (lanes[i].endMin <= startMin) { lane = i; break; }
        }
        if (lane === -1) {
          lane = lanes.length;
          lanes.push({ endMin: endMin });
        } else {
          lanes[lane].endMin = endMin;
        }

        this._lanesByItem.set(item.id, { lane });
      }

      // Second pass: set the correct maxLanes for ALL items on this date
      const finalMaxLanes = lanes.length;
      for (const item of items) {
        const info = this._lanesByItem.get(item.id);
        if (info) info.maxLanes = finalMaxLanes;
      }
    }
  }

  _getBlockStyle(item, colW) {
    const laneInfo = this._lanesByItem.get(item.id) || { lane: 0, maxLanes: 1 };
    const startMin = timeToMinutes(item.startTime);
    const endMin = timeToMinutes(item.endTime);
    const duration = Math.max(endMin - startMin, 1);
    const topPx = (startMin / 60) * this.hourHeight;
    const heightPx = Math.max((duration / 60) * this.hourHeight, this.minDurationPx);
    const laneW = colW / Math.max(laneInfo.maxLanes, 1);
    const leftPx = laneInfo.lane * laneW + 1;
    const widthPx = laneW - 2;

    return {
      top: topPx.toFixed(1),
      height: heightPx.toFixed(1),
      left: leftPx.toFixed(1),
      width: widthPx.toFixed(1),
      showTime: !this.compact && heightPx > 24,
    };
  }

  // ── Tooltip ─────────────────────────────────────────────────

  _ensureTooltip() {
    if (this._tooltip) return;
    const el = document.createElement('div');
    el.className = 'tl-ttp';
    el.style.display = 'none';
    document.body.appendChild(el);
    this._tooltip = el;
  }

  _removeTooltip() {
    if (this._tooltip) {
      this._tooltip.remove();
      this._tooltip = null;
    }
  }

  _showTooltip(item, e) {
    this._ensureTooltip();
    const tip = this._tooltip;
    tip.innerHTML =
      '<div class="tl-ttp-badge" style="background:' + item.color + ';">' + item.category + '</div>' +
      '<div class="tl-ttp-title">' + item.title + '</div>' +
      (item.subtitle ? '<div class="tl-ttp-sub">' + item.subtitle + '</div>' : '') +
      '<div class="tl-ttp-time">' + item.startTime + ' ~ ' + item.endTime + '</div>';
    tip.style.display = 'block';
    this._positionTooltip(e);
  }

  _positionTooltip(e) {
    if (!this._tooltip) return;
    const tip = this._tooltip;
    const gap = 10;
    let x = e.clientX + gap;
    let y = e.clientY + gap;
    const r = tip.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - gap;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - gap;
    if (x < 4) x = 4;
    if (y < 4) y = 4;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  _hideTooltip() {
    if (this._tooltip) this._tooltip.style.display = 'none';
  }

  // ── Render ──────────────────────────────────────────────────

  render() {
    this.container.innerHTML = '';
    this._removeTooltip();

    const colW = this.compact ? 12 : this.colWidth;
    const hdHeight = this.compact ? 28 : 38;

    const wrap = document.createElement('div');
    wrap.className = 'tl-wrap';
    if (this.compact) wrap.classList.add('tl-compact');

    const scroll = document.createElement('div');
    scroll.className = 'tl-scroll';

    // ── Header row (sticky top, shares horizontal scroll) ──
    const hdRow = document.createElement('div');
    hdRow.className = 'tl-hd-row';

    const hdSpacer = document.createElement('div');
    hdSpacer.className = 'tl-hd-spacer';
    hdSpacer.style.width = '52px';
    hdSpacer.style.height = hdHeight + 'px';
    hdRow.appendChild(hdSpacer);

    const hdCanvas = document.createElement('div');
    hdCanvas.className = 'tl-hd-canvas';

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (const date of this._sortedDates) {
      const parts = date.split('-').map(Number);
      const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const header = document.createElement('div');
      header.className = 'tl-date-hd';
      header.style.width = colW + 'px';
      header.innerHTML = parts[1] + '月' + parts[2] + '日<br><span class="tl-wday">' + weekdays[dObj.getDay()] + '</span>';
      hdCanvas.appendChild(header);
    }

    hdRow.appendChild(hdCanvas);
    scroll.appendChild(hdRow);

    // ── Content ──
    const inner = document.createElement('div');
    inner.className = 'tl-inner';
    inner.style.height = (24 * this.hourHeight) + 'px';

    // Time axis (no padding-top — headers are now in separate row)
    const axis = document.createElement('div');
    axis.className = 'tl-axis';
    for (let h = 0; h <= 24; h++) {
      const lbl = document.createElement('div');
      lbl.className = 'tl-hour';
      lbl.style.height = this.hourHeight + 'px';
      lbl.textContent = h === 24 ? '24:00' : String(h).padStart(2, '0') + ':00';
      axis.appendChild(lbl);
    }
    inner.appendChild(axis);

    // Canvas
    const canvas = document.createElement('div');
    canvas.className = 'tl-canvas';

    const self = this;

    for (const date of this._sortedDates) {
      const items = this._recordsByDate.get(date) || [];
      const laneInfo = this._lanesByItem;
      let maxLanes = 1;
      for (const item of items) {
        const li = laneInfo.get(item.id);
        if (li && li.maxLanes > maxLanes) maxLanes = li.maxLanes;
      }

      const col = document.createElement('div');
      col.className = 'tl-day';
      col.style.width = colW + 'px';

      if (!this.compact) {
        for (let h = 1; h < 24; h++) {
          const line = document.createElement('div');
          line.className = 'tl-grid';
          line.style.top = (h * this.hourHeight) + 'px';
          col.appendChild(line);
        }
      }

      for (const item of items) {
        const style = this._getBlockStyle(item, colW);
        const block = document.createElement('div');
        block.className = 'tl-block';
        block.style.top = style.top + 'px';
        block.style.height = style.height + 'px';
        block.style.left = style.left + 'px';
        block.style.width = style.width + 'px';
        block.style.setProperty('--c', item.color);

        if (this.compact) {
          block.addEventListener('mouseenter', function (e) { self._showTooltip(item, e); });
          block.addEventListener('mousemove', function (e) { self._positionTooltip(e); });
          block.addEventListener('mouseleave', function () { self._hideTooltip(); });
        } else {
          const label = document.createElement('div');
          label.className = 'tl-lbl';
          label.textContent = item.title;
          block.appendChild(label);

          if (style.showTime) {
            const time = document.createElement('div');
            time.className = 'tl-time';
            time.textContent = item.startTime + '-' + item.endTime;
            block.appendChild(time);
          }
        }

        if (item.subtitle) {
          block.title = item.title + (item.subtitle ? ' · ' + item.subtitle : '') + ' ' + item.startTime + '-' + item.endTime;
        }

        if (this.onBlockClick) {
          block.addEventListener('click', function (e) {
            e.stopPropagation();
            self._hideTooltip();
            self.onBlockClick(item, e);
          });
        }

        col.appendChild(block);
      }

      canvas.appendChild(col);
    }

    inner.appendChild(canvas);
    scroll.appendChild(inner);
    wrap.appendChild(scroll);
    this.container.appendChild(wrap);
  }
}
