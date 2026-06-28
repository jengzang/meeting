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

function min(arr) { return arr.length ? Math.min(...arr) : null; }
function max(arr) { return arr.length ? Math.max(...arr) : null; }

// ── Weather condition labels ───────────────────────────────────────

export const CONDITION_LABELS = {
  clear: '晴',
  mostlyClear: '大部晴朗',
  partlyCloudy: '多云',
  cloudy: '阴',
  mostlyCloudy: '大部多云',
  overcast: '阴',
  rain: '雨',
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
    if (wx) c.weatherEntries.push(...wx);
  }

  // Associate traffic with cities
  const cityTraffic = new Map();
  for (const t of traffic) {
    const oLoc = t.origin_record_id ? locations[String(t.origin_record_id)] : null;
    const dLoc = t.dest_record_id ? locations[String(t.dest_record_id)] : null;
    const oCity = oLoc && oLoc.city;
    const dCity = dLoc && dLoc.city;

    if (oCity) {
      if (!cityTraffic.has(oCity)) cityTraffic.set(oCity, {});
      cityTraffic.get(oCity)[t.type] = (cityTraffic.get(oCity)[t.type] || 0) + 1;
    }
    if (dCity && dCity !== oCity) {
      if (!cityTraffic.has(dCity)) cityTraffic.set(dCity, {});
      cityTraffic.get(dCity)[t.type] = (cityTraffic.get(dCity)[t.type] || 0) + 1;
    }
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
    const precips = wx.map(w => w.precipMm).filter(p => p > 0);
    const winds = wx.map(w => w.windKmh).filter(w => w != null && w > 0);
    const visibilities = wx.map(w => w.visibilityM).filter(v => v != null);
    const uvs = wx.map(w => w.uvIndex).filter(u => u > 0);
    const condCounts = {};
    for (const w of wx) {
      condCounts[w.condition] = (condCounts[w.condition] || 0) + 1;
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
      trafficBreakdown: sortedEntries(cityTraffic.get(city) || {}),
      weather: {
        tempMin: min(temps),
        tempMax: max(temps),
        tempAvg: avg(temps),
        feelsLikeMax: max(feelsLikes),
        humidityMin: min(humidities),
        humidityMax: max(humidities),
        humidityAvg: avg(humidities),
        precipTotalMm: precips.length ? Math.round(precips.reduce((a, b) => a + b, 0) * 100) / 100 : 0,
        precipMaxMm: max(precips) || 0,
        windMaxKmh: max(winds),
        windAvgKmh: avg(winds),
        visibilityMinM: min(visibilities),
        visibilityAvgM: avg(visibilities),
        uvMax: max(uvs),
        uvAvg: avg(uvs),
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
    if (wx) d.weatherEntries.push(...wx);
  }

  // Traffic per district
  const districtTraffic = new Map();
  for (const t of traffic) {
    const oLoc = t.origin_record_id ? locations[String(t.origin_record_id)] : null;
    const dLoc = t.dest_record_id ? locations[String(t.dest_record_id)] : null;
    const ok = oLoc ? (oLoc.district ? `${oLoc.city}//${oLoc.district}` : oLoc.city) : null;
    const dk = dLoc ? (dLoc.district ? `${dLoc.city}//${dLoc.district}` : dLoc.city) : null;

    if (ok) {
      if (!districtTraffic.has(ok)) districtTraffic.set(ok, {});
      districtTraffic.get(ok)[t.type] = (districtTraffic.get(ok)[t.type] || 0) + 1;
    }
    if (dk && dk !== ok) {
      if (!districtTraffic.has(dk)) districtTraffic.set(dk, {});
      districtTraffic.get(dk)[t.type] = (districtTraffic.get(dk)[t.type] || 0) + 1;
    }
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
    const precips = wx.map(w => w.precipMm).filter(p => p > 0);
    const winds = wx.map(w => w.windKmh).filter(w => w != null && w > 0);
    const visibilities = wx.map(w => w.visibilityM).filter(v => v != null);
    const uvs = wx.map(w => w.uvIndex).filter(u => u > 0);
    const condCounts = {};
    for (const w of wx) {
      condCounts[w.condition] = (condCounts[w.condition] || 0) + 1;
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
      trafficBreakdown: sortedEntries(districtTraffic.get(key) || {}),
      weather: {
        tempMin: min(temps),
        tempMax: max(temps),
        tempAvg: avg(temps),
        feelsLikeMax: max(feelsLikes),
        humidityMin: min(humidities),
        humidityMax: max(humidities),
        humidityAvg: avg(humidities),
        precipTotalMm: precips.length ? Math.round(precips.reduce((a, b) => a + b, 0) * 100) / 100 : 0,
        precipMaxMm: max(precips) || 0,
        windMaxKmh: max(winds),
        windAvgKmh: avg(winds),
        visibilityMinM: min(visibilities),
        visibilityAvgM: avg(visibilities),
        uvMax: max(uvs),
        uvAvg: avg(uvs),
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

export function buildWeatherRankings(cityStats) {
  return {
    hottest: rankBy(cityStats, 'weather.tempMax', 10),
    coldest: rankByAsc(cityStats, 'weather.tempMin', 10),
    highestFeelsLike: rankBy(cityStats, 'weather.feelsLikeMax', 10),
    windiest: rankBy(cityStats, 'weather.windMaxKmh', 10),
    rainiest: rankBy(cityStats, 'weather.precipTotalMm', 10),
    lowestVisibility: rankByAsc(cityStats, 'weather.visibilityMinM', 10),
    highestUV: rankBy(cityStats, 'weather.uvMax', 10),
    mostHumid: rankBy(cityStats, 'weather.humidityAvg', 10),
  };
}

export function buildTrafficRankings(cityStats) {
  const typeMap = {};
  for (const [city, stats] of Object.entries(cityStats)) {
    for (const [type, count] of Object.entries(stats.trafficBreakdown)) {
      if (!typeMap[type]) typeMap[type] = [];
      typeMap[type].push([city, count]);
    }
  }
  for (const type of Object.keys(typeMap)) {
    typeMap[type].sort((a, b) => b[1] - a[1]);
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
