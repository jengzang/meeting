import { RECORD_COLORS, TRAFFIC_COLORS, FALLBACK_PALETTE, fallbackColor } from "./mappings.js";

// ── Adapters ───────────────────────────────────────────────────

export function recordsToTimeline(records, colorMap) {
  const cm = colorMap || RECORD_COLORS;
  return records.map(r => {
    const start = new Date(r.arrival);
    const end = new Date(r.departure);
    const pad = n => String(n).padStart(2, '0');
    const startTime = pad(start.getHours()) + ':' + pad(start.getMinutes());
    let endTime = pad(end.getHours()) + ':' + pad(end.getMinutes());
    let origEndTime = null;
    if (startTime === endTime) {
      origEndTime = endTime;
      end.setMinutes(end.getMinutes() + 1);
      endTime = pad(end.getHours()) + ':' + pad(end.getMinutes());
    }
    return {
      id: 'r-' + r.id,
      date: r.date,
      startTime,
      endTime,
      title: r.activity,
      subtitle: r.place || '',
      category: r.activity,
      color: cm[r.activity] || fallbackColor(r.activity),
      source: 'record',
      _raw: r,
      _origEndTime: origEndTime,
    };
  });
}

export function trafficToTimeline(traffic, colorMap) {
  const cm = colorMap || TRAFFIC_COLORS;
  return traffic.map((t, i) => {
    const start = new Date(t.from_time);
    const end = new Date(t.to_time);
    const pad = n => String(n).padStart(2, '0');
    const startTime = pad(start.getHours()) + ':' + pad(start.getMinutes());
    let endTime = pad(end.getHours()) + ':' + pad(end.getMinutes());
    let origEndTime = null;
    if (startTime === endTime) {
      origEndTime = endTime;
      end.setMinutes(end.getMinutes() + 1);
      endTime = pad(end.getHours()) + ':' + pad(end.getMinutes());
    }
    return {
      id: 't-' + (t.id || i),
      date: t.date,
      startTime,
      endTime,
      title: t.type,
      subtitle: (t.origin || '') + ' -> ' + (t.dest || ''),
      category: t.type,
      color: cm[t.type] || fallbackColor(t.type),
      source: 'traffic',
      _raw: t,
      _origEndTime: origEndTime,
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

  setDimensions(colWidth, hourHeight) {
    this.colWidth = colWidth;
    this.hourHeight = hourHeight;
    this.render();
  }

  destroy() {
    this.container.innerHTML = '';
    this._data = [];
    this._recordsByDate.clear();
    this._sortedDates = [];
    this._lanesByItem.clear();
    this._blockData = null;
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

    const isoDatePart = (isoStr) => {
      // Extract YYYY-MM-DD from ISO timestamp string directly (timezone-safe)
      const m = isoStr && isoStr.match(/^(\d{4}-\d{2}-\d{2})T/);
      return m ? m[1] : null;
    };

    for (const item of items) {
      // Detect true date range from raw timestamps
      let realStart = item.date;
      let realEnd = item.date;
      const r = item._raw;
      if (r) {
        const arrStr = item.source === 'traffic' ? r.from_time : r.arrival;
        const depStr = item.source === 'traffic' ? r.to_time : r.departure;
        const sd = isoDatePart(arrStr);
        const ed = isoDatePart(depStr);
        if (sd && ed) { realStart = sd; realEnd = ed; }
      }

      if (realStart !== realEnd) {
        // Multi-day: create one part per calendar day
        let cur = realStart;
        while (cur <= realEnd) {
          const isFirst = cur === realStart;
          const isLast = cur === realEnd;
          const suffix = isFirst ? '_a' : isLast ? '_z' : '_m' + cur;
          const part = {
            ...item,
            id: item.id + suffix,
            date: cur,
            startTime: isFirst ? item.startTime : '00:00',
            endTime: isLast ? item.endTime : '24:00',
          };
          if (!isFirst) part._origStartTime = item.startTime;
          if (!isLast) part._origEndTime = item.endTime;
          pushDate(cur, part);
          cur = addDays(cur, 1);
        }
      } else {
        // Same calendar day — still check for wrapped times (23:00→01:00 edge case)
        const startMin = timeToMinutes(item.startTime);
        const endMin = timeToMinutes(item.endTime);
        if (endMin <= startMin) {
          const part1 = { ...item, id: item.id + '_a', endTime: '24:00', _origEndTime: item.endTime };
          pushDate(item.date, part1);
          const nextD = addDays(item.date, 1);
          const part2 = { ...item, id: item.id + '_b', date: nextD, startTime: '00:00', _origStartTime: item.startTime };
          pushDate(nextD, part2);
        } else {
          pushDate(item.date, item);
        }
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

  _getBlockStyle(item, colW, hourHeight) {
    const hh = hourHeight || this.hourHeight;
    const laneInfo = this._lanesByItem.get(item.id) || { lane: 0, maxLanes: 1 };
    const startMin = timeToMinutes(item.startTime);
    const endMin = timeToMinutes(item.endTime);
    const duration = Math.max(endMin - startMin, 1);
    const topPx = (startMin / 60) * hh;
    const heightPx = Math.max((duration / 60) * hh, this.minDurationPx);
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

    this._blockData = new Map();

    const colW = this.compact ? 12 : this.colWidth;
    const hdHeight = this.compact ? 28 : 38;
    // Compact mode: scale hourHeight so 24h fits within 95dvh
    const hh = this.compact
      ? Math.floor((window.innerHeight * 0.88) / 24)
      : this.hourHeight;

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
    inner.style.height = (24 * hh) + 'px';

    // Time axis
    const axis = document.createElement('div');
    axis.className = 'tl-axis';
    for (let h = 0; h <= 24; h++) {
      const lbl = document.createElement('div');
      lbl.className = 'tl-hour';
      lbl.style.height = hh + 'px';
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
      // Grid lines via CSS background instead of DOM nodes
      col.style.setProperty('--hh', hh + 'px');

      for (const item of items) {
        const s = this._getBlockStyle(item, colW, hh);
        const block = document.createElement('div');
        block.className = 'tl-block';
        block.style.top = s.top + 'px';
        block.style.height = s.height + 'px';
        block.style.left = s.left + 'px';
        block.style.width = s.width + 'px';
        block.style.setProperty('--c', item.color);

        if (!this.compact) {
          const label = document.createElement('div');
          label.className = 'tl-lbl';
          label.textContent = item.title;
          block.appendChild(label);

          if (s.showTime) {
            const time = document.createElement('div');
            time.className = 'tl-time';
            time.textContent = item.startTime + '-' + item.endTime;
            block.appendChild(time);
          }
        }

        if (item.subtitle) {
          block.title = item.title + (item.subtitle ? ' · ' + item.subtitle : '') + ' ' + item.startTime + '-' + item.endTime;
        }

        this._blockData.set(block, item);
        col.appendChild(block);
      }

      canvas.appendChild(col);
    }

    // ── Delegated events (single listener for all blocks) ──
    canvas.addEventListener('mouseover', function (e) {
      const block = e.target.closest('.tl-block');
      if (!block) { self._hideTooltip(); return; }
      const item = self._blockData.get(block);
      if (item) self._showTooltip(item, e);
    });
    canvas.addEventListener('mousemove', function (e) {
      if (e.target.closest('.tl-block')) self._positionTooltip(e);
    });
    canvas.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget || !e.relatedTarget.closest('.tl-block')) self._hideTooltip();
    });
    if (this.onBlockClick) {
      canvas.addEventListener('click', function (e) {
        const block = e.target.closest('.tl-block');
        if (!block) return;
        const item = self._blockData.get(block);
        if (item) {
          e.stopPropagation();
          self._hideTooltip();
          self.onBlockClick(item, e);
        }
      });
    }

    inner.appendChild(canvas);
    scroll.appendChild(inner);
    wrap.appendChild(scroll);
    this.container.appendChild(wrap);
  }
}
