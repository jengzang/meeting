import { Timeline, recordsToTimeline, trafficToTimeline } from "../timeline.js";
import { recordLocations, recordWeather } from "./map-main.js";
import { RECORD_COLORS, TRAFFIC_COLORS, weatherIcon, countryFlag } from "./mappings.js";

function showBadgePop(el) {
  var exist = document.getElementById("badgePop");
  if (exist) { exist.remove(); return; }
  var pop = document.createElement("div");
  pop.id = "badgePop";
  pop.textContent = el.textContent;
  pop.style.cssText =
    "position:fixed;z-index:9999;background:rgba(15,23,42,0.94);color:#e5e7eb;" +
    "padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;" +
    "border:1px solid rgba(59,130,246,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.5);pointer-events:none;";
  var rect = el.getBoundingClientRect();
  pop.style.left = Math.max(8, rect.left + rect.width / 2 - 60) + "px";
  pop.style.top = (rect.bottom + 8) + "px";
  document.body.appendChild(pop);
  setTimeout(function () {
    var dismiss = function (ev) {
      if (pop.parentNode) pop.remove();
      document.removeEventListener("click", dismiss);
      document.removeEventListener("touchstart", dismiss);
    };
    document.addEventListener("click", dismiss);
    document.addEventListener("touchstart", dismiss);
  }, 0);
}

function showDetail(item) {
  var r = item._raw || {};
  var sTime = item._origStartTime || item.startTime;
  var eTime = item._origEndTime || item.endTime;
  var rows = "";
  if (item.source === "record") {
    rows += '<div class="dt-row"><span class="dt-label">时间</span><span>' + r.date + " " + sTime + " ~ " + eTime + "</span></div>";
    if (r.place) rows += '<div class="dt-row"><span class="dt-label">地点</span><span>' + r.place + "</span></div>";
    if (r.note) rows += '<div class="dt-row"><span class="dt-label">备注</span><span>' + r.note + "</span></div>";

    // Location
    var loc = recordLocations[r.id];
    if (loc) {
      var addr = [countryFlag(loc.country), loc.admin, loc.city, loc.district, loc.street, loc.houseNumber].filter(Boolean).join(' ');
      if (addr) rows += '<div class="dt-row"><span class="dt-label">地址</span><span>' + addr + "</span></div>";
    }

    // Weather
    var wx = recordWeather[r.id];
    if (wx && wx.length) {
      var wxHtml = '<div class="dt-wx-list">';
      for (var i = 0; i < wx.length; i++) {
        var w = wx[i];
        var feels = w.feelsLikeC != null ? '(体感' + w.feelsLikeC + '°) ' : '';
        var precip = w.precipType && w.precipType !== 'none' ? ' ' + w.precipType + w.precipMm + 'mm(' + Math.round(w.precipProb*100) + '%)' : '';
        var uv = w.uvLevel ? ' UV' + w.uvIndex + ' ' + w.uvLevel : '';
        wxHtml += '<span class="dt-wx-chip">' + weatherIcon(w.condition) + ' ' + w.time + ' ' + w.tempC + '°C' + feels + w.windDir + w.windKmh + 'km/h 湿' + Math.round(w.humidity*100) + '% 见' + (w.visibilityM/1000).toFixed(1) + 'km' + uv + precip + '</span>';
      }
      wxHtml += '</div>';
      rows += '<div class="dt-row dt-row-wx"><span class="dt-label">天气</span>' + wxHtml + "</div>";
    }
  } else {
    rows += '<div class="dt-row"><span class="dt-label">时间</span><span>' + r.date + " " + sTime + " ~ " + eTime + "</span></div>";
    if (r.origin) rows += '<div class="dt-row"><span class="dt-label">起点</span><span>' + r.origin + "</span></div>";
    if (r.dest) rows += '<div class="dt-row"><span class="dt-label">终点</span><span>' + r.dest + "</span></div>";
    if (r.duration_sec)
      rows +=
        '<div class="dt-row"><span class="dt-label">耗时</span><span>' +
        Math.round(r.duration_sec / 60) + " 分钟</span></div>";
  }

  var dtCard = document.getElementById("dtCard");
  dtCard.innerHTML =
    '<button class="dt-close" id="dtClose">✕</button>' +
    '<div class="dt-badge" style="background:' + item.color + ';">' + item.category + "</div>" +
    '<div class="dt-title">' + item.title + "</div>" +
    (item.subtitle ? '<div class="dt-sub">' + item.subtitle + "</div>" : "") +
    rows;

  document.getElementById("dtPopup").style.display = "flex";
  document.getElementById("dtClose").addEventListener("click", hideDetail);
}

function hideDetail() {
  document.getElementById("dtPopup").style.display = "none";
}

export function setupTimeline(records, traffic) {

  var recItems = recordsToTimeline(records, RECORD_COLORS);
  var trafItems = trafficToTimeline(traffic, TRAFFIC_COLORS);
  var allItems = recItems.concat(trafItems);

  var badge = document.getElementById("tlBadge");
  badge.textContent = recItems.length + " 活动 + " + trafItems.length + " 交通";
  badge.addEventListener("click", function (e) {
    e.stopPropagation();
    if (window.innerWidth > 768) return;
    showBadgePop(badge);
  });

  // Detail popup overlay close
  var dtOverlay = document.querySelector("#dtPopup .dt-overlay");
  dtOverlay.addEventListener("click", hideDetail);

  var container = document.getElementById("tlContainer");
  var compact = false;

  // Load saved dimensions
  var tlColWidth = parseInt(localStorage.getItem("tl_colWidth")) || 70;
  var tlHourHeight = parseInt(localStorage.getItem("tl_hourHeight")) || 64;

  var timeline = new Timeline(container, {
    data: allItems,
    hourHeight: tlHourHeight,
    colWidth: tlColWidth,
    onBlockClick: showDetail,
  });

  // ── Settings button ───────────────────────────────────────────

  var settingsBtn = document.createElement("button");
  settingsBtn.className = "tl-settings-btn";
  settingsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  settingsBtn.title = "时间线设置";
  document.querySelector(".header-bar").appendChild(settingsBtn);

  // ── Settings popup ────────────────────────────────────────────

  var settingsPopup = document.createElement("div");
  settingsPopup.className = "tl-settings-popup";
  settingsPopup.style.display = "none";
  settingsPopup.innerHTML =
    '<div class="tl-settings-overlay"></div>' +
    '<div class="tl-settings-card">' +
      '<button class="dt-close tl-settings-close">✕</button>' +
      '<div class="tl-settings-title">时间线设置</div>' +
      '<div class="tl-settings-row">' +
        '<span>列宽</span>' +
        '<input type="range" id="tlColWSlider" min="30" max="200" step="5" value="' + tlColWidth + '" />' +
        '<span class="tl-settings-val" id="tlColWVal">' + tlColWidth + 'px</span>' +
      '</div>' +
      '<div class="tl-settings-row">' +
        '<span>行高</span>' +
        '<input type="range" id="tlHourHSlider" min="30" max="150" step="2" value="' + tlHourHeight + '" />' +
        '<span class="tl-settings-val" id="tlHourHVal">' + tlHourHeight + 'px</span>' +
      '</div>' +
      '<button class="tl-settings-reset">恢复默认</button>' +
    '</div>';
  document.body.appendChild(settingsPopup);

  var colWSlider = document.getElementById("tlColWSlider");
  var colWVal = document.getElementById("tlColWVal");
  var hourHSlider = document.getElementById("tlHourHSlider");
  var hourHVal = document.getElementById("tlHourHVal");

  function openSettings() { settingsPopup.style.display = "flex"; }
  function closeSettings() { settingsPopup.style.display = "none"; }

  settingsBtn.addEventListener("click", openSettings);
  settingsPopup.querySelector(".tl-settings-overlay").addEventListener("click", closeSettings);
  settingsPopup.querySelector(".tl-settings-close").addEventListener("click", closeSettings);

  colWSlider.addEventListener("input", function () {
    tlColWidth = parseInt(colWSlider.value);
    colWVal.textContent = tlColWidth + "px";
    localStorage.setItem("tl_colWidth", tlColWidth);
    timeline.setDimensions(tlColWidth, tlHourHeight);
  });

  hourHSlider.addEventListener("input", function () {
    tlHourHeight = parseInt(hourHSlider.value);
    hourHVal.textContent = tlHourHeight + "px";
    localStorage.setItem("tl_hourHeight", tlHourHeight);
    timeline.setDimensions(tlColWidth, tlHourHeight);
  });

  settingsPopup.querySelector(".tl-settings-reset").addEventListener("click", function () {
    tlColWidth = 70;
    tlHourHeight = 64;
    colWSlider.value = 70;
    colWVal.textContent = "70px";
    hourHSlider.value = 64;
    hourHVal.textContent = "64px";
    localStorage.removeItem("tl_colWidth");
    localStorage.removeItem("tl_hourHeight");
    timeline.setDimensions(70, 64);
  });

  // ── Mode toggle ───────────────────────────────────────────────
  var modeToggle = document.getElementById("tlModeToggle");
  modeToggle.addEventListener("change", function () {
    compact = modeToggle.checked;
    timeline.setCompact(compact);
  });

  // Scroll to today
  var today = new Date();
  var target = (today.getMonth() + 1) + "月" + today.getDate() + "日";
  setTimeout(function () {
    var scrollEl = document.querySelector(".tl-scroll");
    if (!scrollEl) return;
    var hds = scrollEl.querySelectorAll(".tl-hd-canvas .tl-date-hd");
    var cols = scrollEl.querySelectorAll(".tl-canvas .tl-day");
    for (var i = 0; i < hds.length; i++) {
      if (hds[i].textContent.indexOf(target) !== -1 && cols[i]) {
        cols[i].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        break;
      }
    }
  }, 400);
}
