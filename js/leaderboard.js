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

// ── Traffic OD merge (same logic as map-main.js renderTraffic) ──────

function mergeTrafficByOD(traffic) {
  const odMap = new Map();
  for (const t of traffic) {
    const key = `${t.origin_lat},${t.origin_lng}->${t.dest_lat},${t.dest_lng}`;
    if (!odMap.has(key)) odMap.set(key, []);
    odMap.get(key).push(t);
  }

  const merged = [];
  for (const items of odMap.values()) {
    items.sort((a, b) => a.from_time.localeCompare(b.from_time));

    const segments = [];
    for (const item of items) {
      const last = segments[segments.length - 1];
      if (last && last.type === item.type) {
        last.duration_sec += item.duration_sec;
        if (item.to_time > last.to_time) last.to_time = item.to_time;
      } else {
        segments.push({ ...item });
      }
    }

    const odTotal = segments.reduce((s, seg) => s + seg.duration_sec, 0);
    for (const seg of segments) seg._odTotalSec = odTotal;

    merged.push(...segments);
  }

  return merged;
}

function findNearestCity(lat, lng, knownPoints) {
  let best = null;
  let bestDist = Infinity;
  for (const p of knownPoints) {
    const dlat = p.lat - lat;
    const dlng = p.lng - lng;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < bestDist) { bestDist = dist; best = p; }
  }
  return best;
}

function resolveTrafficCity(t, key, knownPoints, locations) {
  // key: 'origin' or 'dest'
  const ridKey = key === 'origin' ? 'origin_record_id' : 'dest_record_id';
  const latKey = key === 'origin' ? 'origin_lat' : 'dest_lat';
  const lngKey = key === 'origin' ? 'origin_lng' : 'dest_lng';

  const loc = t[ridKey] ? locations[String(t[ridKey])] : null;
  if (loc && loc.city) return { city: loc.city, district: loc.district };

  const nearest = findNearestCity(Math.abs(t[latKey]), Math.abs(t[lngKey]), knownPoints);
  return nearest ? { city: nearest.city, district: nearest.district } : null;
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

  // Build known points for fallback city lookup (records may be deleted)
  const knownPoints = [];
  for (const r of records) {
    const loc = locations[String(r.id)];
    if (loc && loc.city && r.lat != null && r.lng != null) {
      knownPoints.push({ lat: Math.abs(r.lat), lng: Math.abs(r.lng), city: loc.city, district: loc.district });
    }
  }

  // Associate merged traffic with cities (same OD-pair grouping as map-main.js)
  const mergedTraffic = mergeTrafficByOD(traffic);
  const cityTraffic = new Map();
  for (const t of mergedTraffic) {
    const o = resolveTrafficCity(t, 'origin', knownPoints, locations);
    const d = resolveTrafficCity(t, 'dest', knownPoints, locations);
    const oCity = o && o.city;
    const dCity = d && d.city;
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

  // Build known points for fallback lookup
  const knownPoints = [];
  for (const r of records) {
    const loc = locations[String(r.id)];
    if (loc && loc.city && r.lat != null && r.lng != null) {
      knownPoints.push({ lat: Math.abs(r.lat), lng: Math.abs(r.lng), city: loc.city, district: loc.district });
    }
  }

  // Traffic per district (merged by OD pair)
  const mergedTraffic = mergeTrafficByOD(traffic);
  const districtTraffic = new Map();
  for (const t of mergedTraffic) {
    const o = resolveTrafficCity(t, 'origin', knownPoints, locations);
    const d = resolveTrafficCity(t, 'dest', knownPoints, locations);
    const ok = o ? (o.district ? `${o.city}//${o.district}` : o.city) : null;
    const dk = d ? (d.district ? `${d.city}//${d.district}` : d.city) : null;
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

export function buildTrafficSegmentRankings(traffic, locations, records) {
  const knownPoints = [];
  for (const r of records) {
    const loc = locations[String(r.id)];
    if (loc && loc.city && r.lat != null && r.lng != null) {
      knownPoints.push({ lat: Math.abs(r.lat), lng: Math.abs(r.lng), city: loc.city, district: loc.district });
    }
  }

  const merged = mergeTrafficByOD(traffic);
  const typeMap = {};

  for (const t of merged) {
    if (!t.duration_sec) continue;
    const o = resolveTrafficCity(t, 'origin', knownPoints, locations);
    const d = resolveTrafficCity(t, 'dest', knownPoints, locations);
    if (!o || !o.city || !d || !d.city) continue;

    if (!typeMap[t.type]) typeMap[t.type] = [];
    const odTotal = t._odTotalSec || t.duration_sec;
    typeMap[t.type].push({
      origin: t.origin,
      dest: t.dest,
      originCity: o.city,
      destCity: d.city,
      durationSec: t.duration_sec,
      durationMin: Math.round(t.duration_sec / 60 * 10) / 10,
      odPct: Math.round(t.duration_sec / odTotal * 100),
      date: t.date,
      from_time: t.from_time,
      to_time: t.to_time,
    });
  }

  for (const type of Object.keys(typeMap)) {
    typeMap[type].sort((a, b) => b.durationSec - a.durationSec);
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

// ── Geography extremes ─────────────────────────────────────────────

const GEO_ORIGIN = { lat: 22.813132, lng: 113.589222 };

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildGeoExtremes(records, locations) {
  let north = null, south = null, east = null, west = null, farthest = null;
  let farthestDist = 0;

  for (const r of records) {
    if (r.lat == null || r.lng == null) continue;
    const loc = locations[String(r.id)] || {};
    const alat = Math.abs(r.lat);
    const alng = Math.abs(r.lng);

    if (!north || alat > north.lat) north = { ...r, lat: alat, lng: alng, city: loc.city, district: loc.district, admin: loc.admin };
    if (!south || alat < south.lat) south = { ...r, lat: alat, lng: alng, city: loc.city, district: loc.district, admin: loc.admin };
    if (!east || alng > east.lng) east = { ...r, lat: alat, lng: alng, city: loc.city, district: loc.district, admin: loc.admin };
    if (!west || alng < west.lng) west = { ...r, lat: alat, lng: alng, city: loc.city, district: loc.district, admin: loc.admin };

    const d = haversineKm(GEO_ORIGIN.lat, GEO_ORIGIN.lng, alat, alng);
    if (d > farthestDist) { farthestDist = d; farthest = { ...r, lat: alat, lng: alng, city: loc.city, district: loc.district, admin: loc.admin }; }
  }

  const latSpan = north && south ? Math.round(Math.abs(north.lat - south.lat) * 100) / 100 : 0;
  const lngSpan = east && west ? Math.round(Math.abs(east.lng - west.lng) * 100) / 100 : 0;
  const farthestKm = farthest ? Math.round(farthestDist * 10) / 10 : 0;

  return { north, south, east, west, farthest, farthestKm, latSpan, lngSpan };
}

// ── Journey stats ──────────────────────────────────────────────────

// minutes since 5am (wrap-around: 5:00→0, 4:59→1439)
function minSince5am(iso) {
  const d = new Date(iso);
  let m = d.getHours() * 60 + d.getMinutes() - 300;
  return (m + 1440) % 1440;
}

// hour bucket index 0–23 (0 = 5:00–5:59, 23 = 4:00–4:59)
function hourBucket5(iso) {
  return Math.floor(minSince5am(iso) / 60);
}

export function buildJourneyStats(traffic, locations, records) {
  // Build known points for fallback city lookup
  const knownPoints = [];
  if (records) {
    for (const r of records) {
      const loc = locations[String(r.id)];
      if (loc && loc.city && r.lat != null && r.lng != null) {
        knownPoints.push({ lat: Math.abs(r.lat), lng: Math.abs(r.lng), city: loc.city, district: loc.district });
      }
    }
  }

  const mergedTraffic = mergeTrafficByOD(traffic);
  let earliestDep = null, latestDep = null, longestTrip = null;
  let earliestArr = null, latestArr = null;
  const depBuckets = new Array(24).fill(0);
  const arrBuckets = new Array(24).fill(0);
  let totalDurSec = 0;
  let durCount = 0;

  for (const t of mergedTraffic) {
    const mDep = minSince5am(t.from_time);
    const mArr = minSince5am(t.to_time);

    if (earliestDep === null || mDep < minSince5am(earliestDep.from_time)) earliestDep = t;
    if (latestDep === null || mDep > minSince5am(latestDep.from_time)) latestDep = t;
    if (earliestArr === null || mArr < minSince5am(earliestArr.to_time)) earliestArr = t;
    if (latestArr === null || mArr > minSince5am(latestArr.to_time)) latestArr = t;
    if (!longestTrip || (t.duration_sec || 0) > (longestTrip.duration_sec || 0)) longestTrip = t;

    depBuckets[hourBucket5(t.from_time)]++;
    arrBuckets[hourBucket5(t.to_time)]++;
    if (t.duration_sec) { totalDurSec += t.duration_sec; durCount++; }
  }

  const locName = (t, key) => {
    const ridKey = key === 'origin' ? 'origin_record_id' : 'dest_record_id';
    const latKey = key === 'origin' ? 'origin_lat' : 'dest_lat';
    const lngKey = key === 'origin' ? 'origin_lng' : 'dest_lng';
    const loc = t[ridKey] ? locations[String(t[ridKey])] : null;
    if (loc && loc.city) return (loc.city || '') + (loc.district ? ' ' + loc.district : '');
    const nearest = findNearestCity(Math.abs(t[latKey]), Math.abs(t[lngKey]), knownPoints);
    return nearest ? (nearest.city || '') + (nearest.district ? ' ' + nearest.district : '') : '';
  };

  const fmtTrip = (t, label) => ({
    label,
    type: t.type,
    from: t.from_time,
    to: t.to_time,
    date: t.date,
    durationMin: Math.round((t.duration_sec || 0) / 60 * 10) / 10,
    origin: t.origin,
    dest: t.dest,
    originCity: locName(t, 'origin'),
    destCity: locName(t, 'dest'),
  });

  const bucketLabels = [];
  for (let i = 0; i < 24; i++) {
    const h = (i + 5) % 24;
    bucketLabels.push(String(h).padStart(2,'0') + ':00');
  }

  return {
    earliestDep: earliestDep ? fmtTrip(earliestDep, '最早出发') : null,
    latestDep: latestDep ? fmtTrip(latestDep, '最晚出发') : null,
    earliestArr: earliestArr ? fmtTrip(earliestArr, '最早到达') : null,
    latestArr: latestArr ? fmtTrip(latestArr, '最晚到达') : null,
    longestTrip: longestTrip ? fmtTrip(longestTrip, '最长行程') : null,
    avgDurationMin: durCount ? Math.round(totalDurSec / durCount / 60 * 10) / 10 : 0,
    depBuckets,
    arrBuckets,
    bucketLabels,
    depMax: Math.max(...depBuckets, 1),
    arrMax: Math.max(...arrBuckets, 1),
  };
}
