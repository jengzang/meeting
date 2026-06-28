// ── Helpers ────────────────────────────────────────────────────────

function durationHours(arrival, departure) {
  return (new Date(departure) - new Date(arrival)) / 3600000;
}

function sortedEntries(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
  );
}

function avg(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;
}

function findExtreme(entries, field, mode) {
  let best = null;
  let bestEntry = null;
  for (const e of entries) {
    const v = e[field];
    if (v == null) continue;
    if (best === null || (mode === 'max' ? v > best : v < best)) {
      best = v;
      bestEntry = e;
    }
  }
  const time = bestEntry ? (bestEntry._fullTime || bestEntry.time || '') : '';
  return { value: best, time };
}

// ── Weather condition labels ───────────────────────────────────────

export const CONDITION_LABELS = {
  clear: '晴',
  mostlyClear: '大部晴朗',
  partlyCloudy: '多云',
  cloudy: '阴',
  mostlyCloudy: '大部多云',
  overcast: '阴',
  rain: '雨',
  drizzle: '小雨',
  snow: '雪',
  fog: '雾',
  windy: '风',
};

// ── City stats ─────────────────────────────────────────────────────

export function buildCityStats(records, locations, weather, traffic) {
  const cities = new Map();

  // Group records by city
  for (const r of records) {
    const loc = locations[String(r.id)];
    if (!loc || !loc.city) continue;
    const city = loc.city;
    if (!cities.has(city)) {
      cities.set(city, {
        admin: loc.admin,
        records: [],
        placeSet: new Set(),
        activityCounts: {},
        weatherEntries: [],
      });
    }
    const c = cities.get(city);
    c.records.push(r);
    c.placeSet.add(r.place);
    c.activityCounts[r.activity] = (c.activityCounts[r.activity] || 0) + 1;
    const wx = weather[String(r.id)];
    if (wx) {
      const year = r.date ? r.date.slice(0, 4) : '';
      for (const w of wx) {
        c.weatherEntries.push({ ...w, _fullTime: year ? `${year}/${w.time}` : w.time });
      }
    }
  }

  // Associate traffic with cities (travel duration + per-day totals)
  const cityTraffic = new Map();
  for (const t of traffic) {
    const oLoc = t.origin_record_id ? locations[String(t.origin_record_id)] : null;
    const dLoc = t.dest_record_id ? locations[String(t.dest_record_id)] : null;
    const oCity = oLoc && oLoc.city;
    const dCity = dLoc && dLoc.city;
    const travelHours = (t.duration_sec || 0) / 3600;

    const addTraffic = (ctMap, city) => {
      if (!ctMap.has(city)) ctMap.set(city, {});
      const ct = ctMap.get(city);
      if (!ct[t.type]) ct[t.type] = { count: 0, durations: [], dates: {} };
      ct[t.type].count++;
      ct[t.type].durations.push(travelHours);
      if (t.date) ct[t.type].dates[t.date] = (ct[t.type].dates[t.date] || 0) + travelHours;
    };

    if (oCity) addTraffic(cityTraffic, oCity);
    if (dCity && dCity !== oCity) addTraffic(cityTraffic, dCity);
  }

  // Build final stats per city
  const result = {};
  for (const [city, data] of cities) {
    const recs = data.records;
    const totalHours = recs.reduce((sum, r) => sum + durationHours(r.arrival, r.departure), 0);
    const dates = recs.map(r => r.date).sort();

    const wx = data.weatherEntries;
    const temps = wx.map(w => w.tempC).filter(t => t != null);
    const feelsLikes = wx.map(w => w.feelsLikeC).filter(t => t != null);
    const humidities = wx.map(w => w.humidity).filter(h => h != null);
    const winds = wx.map(w => w.windKmh).filter(w => w != null);
    const visibilities = wx.map(w => w.visibilityM).filter(v => v != null);
    const uvs = wx.map(w => w.uvIndex).filter(u => u != null);
    const allPrecips = wx.map(w => w.precipMm).filter(p => p != null);
    const posPrecips = allPrecips.filter(p => p > 0);
    const wxTimes = wx.map(w => w._fullTime || w.time).filter(Boolean).sort();
    const condCounts = {};
    for (const w of wx) {
      condCounts[w.condition] = (condCounts[w.condition] || 0) + 1;
    }

    const tMin = findExtreme(wx, 'tempC', 'min');
    const tMax = findExtreme(wx, 'tempC', 'max');
    const flMin = findExtreme(wx, 'feelsLikeC', 'min');
    const flMax = findExtreme(wx, 'feelsLikeC', 'max');
    const hMin = findExtreme(wx, 'humidity', 'min');
    const hMax = findExtreme(wx, 'humidity', 'max');
    const pMax = findExtreme(wx, 'precipMm', 'max');
    const wMin = findExtreme(wx, 'windKmh', 'min');
    const wMax = findExtreme(wx, 'windKmh', 'max');
    const vMin = findExtreme(wx, 'visibilityM', 'min');
    const vMax = findExtreme(wx, 'visibilityM', 'max');
    const uMin = findExtreme(wx, 'uvIndex', 'min');
    const uMax = findExtreme(wx, 'uvIndex', 'max');

    // Summarize traffic breakdown
    const rawTraffic = cityTraffic.get(city) || {};
    const trafficBreakdown = {};
    for (const [type, td] of Object.entries(rawTraffic).sort((a, b) => b[1].count - a[1].count)) {
      const durs = td.durations;
      const dayTotals = Object.values(td.dates);
      trafficBreakdown[type] = {
        count: td.count,
        dayCount: Object.keys(td.dates).length,
        totalHours: Math.round(durs.reduce((a, b) => a + b, 0) * 10) / 10,
        maxHours: durs.length ? Math.round(Math.max(...durs) * 10) / 10 : 0,
        avgHours: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length * 10) / 10 : 0,
        maxHoursPerDay: dayTotals.length ? Math.round(Math.max(...dayTotals) * 10) / 10 : 0,
      };
    }

    result[city] = {
      admin: data.admin,
      recordCount: recs.length,
      totalDurationHours: Math.round(totalHours * 10) / 10,
      placeCount: data.placeSet.size,
      activityCount: Object.keys(data.activityCounts).length,
      firstVisit: dates[0] || '',
      lastVisit: dates[dates.length - 1] || '',
      activityBreakdown: sortedEntries(data.activityCounts),
      trafficBreakdown,
      weather: {
        tempMin: tMin.value,
        tempMinTime: tMin.time,
        tempMax: tMax.value,
        tempMaxTime: tMax.time,
        tempAvg: avg(temps),
        feelsLikeMin: flMin.value,
        feelsLikeMinTime: flMin.time,
        feelsLikeMax: flMax.value,
        feelsLikeMaxTime: flMax.time,
        humidityMin: hMin.value,
        humidityMinTime: hMin.time,
        humidityMax: hMax.value,
        humidityMaxTime: hMax.time,
        humidityAvg: avg(humidities),
        precipTotalMm: posPrecips.length ? Math.round(posPrecips.reduce((a, b) => a + b, 0) * 100) / 100 : 0,
        precipMaxMm: pMax.value || 0,
        precipMaxTime: pMax.time,
        precipAvgMm: avg(allPrecips),
        windMinKmh: wMin.value,
        windMinTime: wMin.time,
        windMaxKmh: wMax.value,
        windMaxTime: wMax.time,
        windAvgKmh: avg(winds),
        visibilityMinM: vMin.value,
        visibilityMinTime: vMin.time,
        visibilityMaxM: vMax.value,
        visibilityMaxTime: vMax.time,
        visibilityAvgM: avg(visibilities),
        uvMin: uMin.value,
        uvMinTime: uMin.time,
        uvMax: uMax.value,
        uvMaxTime: uMax.time,
        uvAvg: avg(uvs),
        firstWxTime: wxTimes[0] || '',
        lastWxTime: wxTimes[wxTimes.length - 1] || '',
      },
      weatherConditionCounts: sortedEntries(condCounts),
      weatherEntryCount: wx.length,
    };
  }

  return result;
}

// ── District stats ──────────────────────────────────────────────────

export function buildDistrictStats(records, locations, weather, traffic) {
  const districts = new Map();
  const recordMap = {};
  for (const r of records) recordMap[String(r.id)] = r;

  for (const r of records) {
    const loc = locations[String(r.id)];
    if (!loc || !loc.city) continue;
    const key = loc.district ? `${loc.city}//${loc.district}` : loc.city;
    if (!districts.has(key)) {
      districts.set(key, {
        admin: loc.admin,
        city: loc.city,
        district: loc.district || '',
        records: [],
        placeSet: new Set(),
        activityCounts: {},
        weatherEntries: [],
      });
    }
    const d = districts.get(key);
    d.records.push(r);
    d.placeSet.add(r.place);
    d.activityCounts[r.activity] = (d.activityCounts[r.activity] || 0) + 1;
    const wx = weather[String(r.id)];
    if (wx) {
      const year = r.date ? r.date.slice(0, 4) : '';
      for (const w of wx) {
        d.weatherEntries.push({ ...w, _fullTime: year ? `${year}/${w.time}` : w.time });
      }
    }
  }

  // Traffic per district
  const districtTraffic = new Map();
  for (const t of traffic) {
    const oLoc = t.origin_record_id ? locations[String(t.origin_record_id)] : null;
    const dLoc = t.dest_record_id ? locations[String(t.dest_record_id)] : null;
    const ok = oLoc ? (oLoc.district ? `${oLoc.city}//${oLoc.district}` : oLoc.city) : null;
    const dk = dLoc ? (dLoc.district ? `${dLoc.city}//${dLoc.district}` : dLoc.city) : null;
    const travelHours = (t.duration_sec || 0) / 3600;

    const addTraffic = (ctMap, key) => {
      if (!ctMap.has(key)) ctMap.set(key, {});
      const ct = ctMap.get(key);
      if (!ct[t.type]) ct[t.type] = { count: 0, durations: [], dates: {} };
      ct[t.type].count++;
      ct[t.type].durations.push(travelHours);
      if (t.date) ct[t.type].dates[t.date] = (ct[t.type].dates[t.date] || 0) + travelHours;
    };

    if (ok) addTraffic(districtTraffic, ok);
    if (dk && dk !== ok) addTraffic(districtTraffic, dk);
  }

  const result = {};
  for (const [key, data] of districts) {
    const recs = data.records;
    const totalHours = recs.reduce((sum, r) => sum + durationHours(r.arrival, r.departure), 0);
    const dates = recs.map(r => r.date).sort();

    const wx = data.weatherEntries;
    const temps = wx.map(w => w.tempC).filter(t => t != null);
    const feelsLikes = wx.map(w => w.feelsLikeC).filter(t => t != null);
    const humidities = wx.map(w => w.humidity).filter(h => h != null);
    const winds = wx.map(w => w.windKmh).filter(w => w != null);
    const visibilities = wx.map(w => w.visibilityM).filter(v => v != null);
    const uvs = wx.map(w => w.uvIndex).filter(u => u != null);
    const allPrecips = wx.map(w => w.precipMm).filter(p => p != null);
    const posPrecips = allPrecips.filter(p => p > 0);
    const wxTimes = wx.map(w => w._fullTime || w.time).filter(Boolean).sort();
    const condCounts = {};
    for (const w of wx) {
      condCounts[w.condition] = (condCounts[w.condition] || 0) + 1;
    }

    const tMin = findExtreme(wx, 'tempC', 'min');
    const tMax = findExtreme(wx, 'tempC', 'max');
    const flMin = findExtreme(wx, 'feelsLikeC', 'min');
    const flMax = findExtreme(wx, 'feelsLikeC', 'max');
    const hMin = findExtreme(wx, 'humidity', 'min');
    const hMax = findExtreme(wx, 'humidity', 'max');
    const pMax = findExtreme(wx, 'precipMm', 'max');
    const wMin = findExtreme(wx, 'windKmh', 'min');
    const wMax = findExtreme(wx, 'windKmh', 'max');
    const vMin = findExtreme(wx, 'visibilityM', 'min');
    const vMax = findExtreme(wx, 'visibilityM', 'max');
    const uMin = findExtreme(wx, 'uvIndex', 'min');
    const uMax = findExtreme(wx, 'uvIndex', 'max');

    const rawTraffic = districtTraffic.get(key) || {};
    const trafficBreakdown = {};
    for (const [type, td] of Object.entries(rawTraffic).sort((a, b) => b[1].count - a[1].count)) {
      const durs = td.durations;
      const dayTotals = Object.values(td.dates);
      trafficBreakdown[type] = {
        count: td.count,
        dayCount: Object.keys(td.dates).length,
        totalHours: Math.round(durs.reduce((a, b) => a + b, 0) * 10) / 10,
        maxHours: durs.length ? Math.round(Math.max(...durs) * 10) / 10 : 0,
        avgHours: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length * 10) / 10 : 0,
        maxHoursPerDay: dayTotals.length ? Math.round(Math.max(...dayTotals) * 10) / 10 : 0,
      };
    }

    result[key] = {
      admin: data.admin,
      city: data.city,
      district: data.district,
      recordCount: recs.length,
      totalDurationHours: Math.round(totalHours * 10) / 10,
      placeCount: data.placeSet.size,
      activityCount: Object.keys(data.activityCounts).length,
      firstVisit: dates[0] || '',
      lastVisit: dates[dates.length - 1] || '',
      activityBreakdown: sortedEntries(data.activityCounts),
      trafficBreakdown,
      weather: {
        tempMin: tMin.value,
        tempMinTime: tMin.time,
        tempMax: tMax.value,
        tempMaxTime: tMax.time,
        tempAvg: avg(temps),
        feelsLikeMin: flMin.value,
        feelsLikeMinTime: flMin.time,
        feelsLikeMax: flMax.value,
        feelsLikeMaxTime: flMax.time,
        humidityMin: hMin.value,
        humidityMinTime: hMin.time,
        humidityMax: hMax.value,
        humidityMaxTime: hMax.time,
        humidityAvg: avg(humidities),
        precipTotalMm: posPrecips.length ? Math.round(posPrecips.reduce((a, b) => a + b, 0) * 100) / 100 : 0,
        precipMaxMm: pMax.value || 0,
        precipMaxTime: pMax.time,
        precipAvgMm: avg(allPrecips),
        windMinKmh: wMin.value,
        windMinTime: wMin.time,
        windMaxKmh: wMax.value,
        windMaxTime: wMax.time,
        windAvgKmh: avg(winds),
        visibilityMinM: vMin.value,
        visibilityMinTime: vMin.time,
        visibilityMaxM: vMax.value,
        visibilityMaxTime: vMax.time,
        visibilityAvgM: avg(visibilities),
        uvMin: uMin.value,
        uvMinTime: uMin.time,
        uvMax: uMax.value,
        uvMaxTime: uMax.time,
        uvAvg: avg(uvs),
        firstWxTime: wxTimes[0] || '',
        lastWxTime: wxTimes[wxTimes.length - 1] || '',
      },
      weatherConditionCounts: sortedEntries(condCounts),
      weatherEntryCount: wx.length,
    };
  }

  return result;
}

// ── Rankings ────────────────────────────────────────────────────────

export function rankBy(stats, field, n) {
  const entries = Object.entries(stats)
    .filter(([, s]) => {
      const v = resolveField(s, field);
      return v != null && v !== '' && !Number.isNaN(v);
    })
    .sort((a, b) => {
      const va = resolveField(a[1], field);
      const vb = resolveField(b[1], field);
      return vb - va;
    })
    .slice(0, n || 10);
  return entries;
}

export function rankByAsc(stats, field, n) {
  const entries = Object.entries(stats)
    .filter(([, s]) => {
      const v = resolveField(s, field);
      return v != null && v !== '' && !Number.isNaN(v);
    })
    .sort((a, b) => {
      const va = resolveField(a[1], field);
      const vb = resolveField(b[1], field);
      return va - vb;
    })
    .slice(0, n || 10);
  return entries;
}

function resolveField(obj, path) {
  const parts = path.split('.');
  let v = obj;
  for (const p of parts) {
    if (v == null) return null;
    v = v[p];
  }
  return v;
}

export function buildWeatherRankings(stats) {
  return {
    hottest: rankBy(stats, 'weather.tempMax', 10),
    coldest: rankByAsc(stats, 'weather.tempMin', 10),
    highestFeelsLike: rankBy(stats, 'weather.feelsLikeMax', 10),
    windiest: rankBy(stats, 'weather.windMaxKmh', 10),
    rainiest: rankBy(stats, 'weather.precipTotalMm', 10),
    maxPrecip: rankBy(stats, 'weather.precipMaxMm', 10),
    lowestVisibility: rankByAsc(stats, 'weather.visibilityMinM', 10),
    highestUV: rankBy(stats, 'weather.uvMax', 10),
    mostHumid: rankBy(stats, 'weather.humidityAvg', 10),
  };
}

export function buildTrafficRankings(cityStats) {
  const typeMap = {};
  for (const [city, stats] of Object.entries(cityStats)) {
    for (const [type, td] of Object.entries(stats.trafficBreakdown)) {
      if (!typeMap[type]) typeMap[type] = [];
      typeMap[type].push({ city, count: td.count, totalHours: td.totalHours, maxHours: td.maxHours, avgHours: td.avgHours, dayCount: td.dayCount, maxHoursPerDay: td.maxHoursPerDay });
    }
  }
  for (const type of Object.keys(typeMap)) {
    typeMap[type].sort((a, b) => b.count - a.count);
  }
  return typeMap;
}

// ── Summary ─────────────────────────────────────────────────────────

export function buildSummary(cityStats) {
  const cities = Object.keys(cityStats).length;
  let totalRecords = 0;
  let totalHours = 0;
  let totalPlaces = 0;
  const allActivities = new Set();
  const allTraffic = new Set();

  for (const s of Object.values(cityStats)) {
    totalRecords += s.recordCount;
    totalHours += s.totalDurationHours;
    totalPlaces += s.placeCount;
    for (const a of Object.keys(s.activityBreakdown)) allActivities.add(a);
    for (const t of Object.keys(s.trafficBreakdown)) allTraffic.add(t);
  }

  return {
    cityCount: cities,
    totalRecords,
    totalDurationHours: Math.round(totalHours * 10) / 10,
    totalPlaces,
    activityTypeCount: allActivities.size,
    trafficTypeCount: allTraffic.size,
  };
}
