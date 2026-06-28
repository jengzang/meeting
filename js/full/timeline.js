import { Timeline, recordsToTimeline, trafficToTimeline } from "../timeline.js";
import { recordLocations, recordWeather } from "./map-main.js";

function weatherIcon(condition) {
  var map = {
    "clear": "☀️", "mostlyClear": "🌤️", "partlyCloudy": "⛅",
    "cloudy": "☁️", "mostlyCloudy": "☁️", "overcast": "☁️",
    "rain": "🌧️", "snow": "❄️", "fog": "🌫️", "windy": "💨",
  };
  return map[condition] || "🌡️";
}

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

function showDetail(item, popup) {
  var r = item._raw || {};
  var rows = "";
  if (item.source === "record") {
    rows +=
      '<div class="tl-popup-row"><span class="tl-popup-lbl">时间</span><span>' +
      r.date + " " + item.startTime + " ~ " + item.endTime + "</span></div>";
    if (r.place) rows += '<div class="tl-popup-row"><span class="tl-popup-lbl">地点</span><span>' + r.place + "</span></div>";
    if (r.note) rows += '<div class="tl-popup-row"><span class="tl-popup-lbl">备注</span><span>' + r.note + "</span></div>";

    // Location
    var loc = recordLocations[r.id];
    if (loc) {
      var addr = [loc.country, loc.admin, loc.city, loc.district, loc.street, loc.houseNumber].filter(Boolean).join(' ');
      if (addr) rows += '<div class="tl-popup-row"><span class="tl-popup-lbl">地址</span><span>' + addr + "</span></div>";
    }

    // Weather
    var wx = recordWeather[r.id];
    if (wx && wx.length) {
      var wxHtml = '<div class="tl-popup-wx-list">';
      for (var i = 0; i < wx.length; i++) {
        var w = wx[i];
        wxHtml += '<span class="tl-popup-wx-chip">' + weatherIcon(w.condition) + ' ' + w.time + ' ' + w.tempC + '°C ' + ' 风' + w.windKmh + 'km/h 见' + (w.visibilityM/1000).toFixed(1) + 'km 湿' + Math.round(w.humidity*100) + '%</span>';
      }
      wxHtml += '</div>';
      rows += '<div class="tl-popup-row tl-popup-row-wx"><span class="tl-popup-lbl">天气</span>' + wxHtml + "</div>";
    }
  } else {
    rows +=
      '<div class="tl-popup-row"><span class="tl-popup-lbl">时间</span><span>' +
      r.date + " " + item.startTime + " ~ " + item.endTime + "</span></div>";
    if (r.origin) rows += '<div class="tl-popup-row"><span class="tl-popup-lbl">起点</span><span>' + r.origin + "</span></div>";
    if (r.dest) rows += '<div class="tl-popup-row"><span class="tl-popup-lbl">终点</span><span>' + r.dest + "</span></div>";
    if (r.duration_sec)
      rows +=
        '<div class="tl-popup-row"><span class="tl-popup-lbl">耗时</span><span>' +
        Math.round(r.duration_sec / 60) + " 分钟</span></div>";
  }
  var card = document.getElementById("tlPopupCard");
  card.innerHTML =
    '<button class="tl-popup-close" id="tlPopupClose">✕</button>' +
    '<div class="tl-popup-badge" style="background:' + item.color + ';">' + item.category + "</div>" +
    '<div class="tl-popup-title">' + item.title + "</div>" +
    (item.subtitle ? '<div class="tl-popup-sub">' + item.subtitle + "</div>" : "") +
    rows;
  popup.style.display = "flex";
  document.getElementById("tlPopupClose").addEventListener("click", function () {
    popup.style.display = "none";
  });
}

export function setupTimeline(records, traffic) {
  document.getElementById("viewMap").style.display = "none";
  document.querySelector(".header-bar").style.display = "none";
  document.getElementById("viewTimeline").style.display = "flex";

  var recItems = recordsToTimeline(records);
  var trafItems = trafficToTimeline(traffic);
  var allItems = recItems.concat(trafItems);

  var badge = document.getElementById("tlBadge");
  badge.textContent = recItems.length + " 活动 + " + trafItems.length + " 交通";
  badge.addEventListener("click", function (e) {
    e.stopPropagation();
    if (window.innerWidth > 768) return;
    showBadgePop(badge);
  });

  // Detail popup
  var popup = document.createElement("div");
  popup.className = "tl-popup";
  popup.id = "tlPopup";
  popup.style.display = "none";
  popup.innerHTML = '<div class="tl-popup-overlay"></div><div class="tl-popup-card" id="tlPopupCard"></div>';
  document.body.appendChild(popup);

  popup.querySelector(".tl-popup-overlay").addEventListener("click", function () {
    popup.style.display = "none";
  });

  var container = document.getElementById("tlContainer");
  var compact = false;
  var timeline = new Timeline(container, {
    data: allItems,
    hourHeight: 64,
    colWidth: 70,
    onBlockClick: function (item) { showDetail(item, popup); },
  });

  // Mode toggle
  var modeToggle = document.getElementById("tlModeToggle");
  modeToggle.addEventListener("change", function () {
    compact = modeToggle.checked;
    timeline.setCompact(compact);
  });

  // Scroll to today
  var today = new Date();
  var target = (today.getMonth() + 1) + "月" + today.getDate() + "日";
  setTimeout(function () {
    var scrollEl = document.querySelector("#viewTimeline .tl-scroll");
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
