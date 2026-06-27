const MAPTILER_KEY = "HSnYXzpfPRlVp7fkOywW";

const MAP_STYLE_CONFIG_DATA = {
  tianditu: {
    name: "天地图",
    custom: true,
    tiles: [
      "https://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=9a516b0f2a8179bb68f73172cff4bd22"
    ]
  },
  tianditu_img: {
    name: "天地图卫星图",
    custom: true,
    tiles: [
      "https://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=9a516b0f2a8179bb68f73172cff4bd22"
    ]
  },

  gaode: {
    name: "高德地图",
    custom: true,
    tiles: [
      "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}"
    ]
  },
  gaode_satellite: {
    name: "高德卫星图",
    custom: true,
    tiles: [
      "http://webst04.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"
    ]
  },

  maptiler: {
    name: "MapTiler街道图",
    custom: false,
    url: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  },
  maptiler_basic: {
    name: "MapTiler基础图",
    custom: false,
    url: `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_KEY}`
  },
  maptiler_landscape: {
    name: "MapTiler地形图",
    custom: false,
    url: `https://api.maptiler.com/maps/landscape/style.json?key=${MAPTILER_KEY}`
  },
  maptiler_streets: {
    name: "MapTiler经典街道",
    custom: false,
    url: `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`
  },

  stadiamaps: {
    name: "Stadia Maps",
    custom: false,
    url: "https://tiles.stadiamaps.com/styles/osm_bright.json"
  },

  arcgis: {
    name: "ArcGIS街道图",
    custom: true,
    tiles: [
      "https://server.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
    ]
  },
  arcgis_light_gray: {
    name: "ArcGIS灰底图",
    custom: true,
    tiles: [
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/WMTS/tile/6.0.0/Canvas_World_Light_Gray_Base/default/default028mm/{z}/{y}/{x}"
    ]
  },
  arcgis_dark_gray: {
    name: "ArcGIS暗黑图",
    custom: true,
    tiles: [
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/WMTS/tile/6.0.0/Canvas_World_Dark_Gray_Base/default/default028mm/{z}/{y}/{x}"
    ]
  },
  arcgis_natgeo: {
    name: "ArcGIS自然地理",
    custom: true,
    tiles: [
      "https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
    ]
  },
  arcgis_satellite: {
    name: "ArcGIS卫星图",
    custom: true,
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ]
  },

  opentopomap: {
    name: "OpenTopoMap地形图",
    custom: true,
    tiles: [
      "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"
    ]
  },
  thunderforest_cycle: {
    name: "OpenCycle地形图",
    custom: true,
    tiles: [
      "http://a.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=a5dd6a2f1c934394bce6b0fb077203eb"
    ]
  }
};

/**
 * { key: label } map for UI dropdowns.
 */
export const mapStyleConfig = Object.fromEntries(
  Object.entries(MAP_STYLE_CONFIG_DATA).map(([key, cfg]) => [key, cfg.name])
);

/**
 * Return a MapLibre style object (custom raster tiles) or a style URL.
 */
export function mapStyle(name) {
  const cfg = MAP_STYLE_CONFIG_DATA[name];
  if (!cfg.custom) {
    return cfg.url;
  }

  return {
    version: 8,
    name: name,
    glyphs: "https://orangemug.github.io/font-glyphs/glyphs/{fontstack}/{range}.pbf",
    sources: {
      [name]: {
        type: "raster",
        tiles: cfg.tiles,
        tileSize: 256,
        maxzoom: 22,
        minzoom: 0
      }
    },
    layers: [
      {
        id: `${name}-layer`,
        type: "raster",
        source: name,
        paint: { "raster-opacity": 1 }
      }
    ]
  };
}

/**
 * Given an array of [lng, lat] coordinate pairs, return { center: [lng, lat], zoom }.
 */
export function calculateDenseMapCenterAndZoom(coords, densityPercentile = 0.85) {
  if (!Array.isArray(coords) || coords.length === 0) {
    throw new Error("坐标数组不能为空");
  }

  const validCoords = coords.filter(
    c =>
      Array.isArray(c) &&
      c.length === 2 &&
      typeof c[0] === "number" &&
      typeof c[1] === "number" &&
      c[0] >= -180 && c[0] <= 180 &&   // lng
      c[1] >= -90 && c[1] <= 90         // lat
  );

  if (validCoords.length === 0) {
    throw new Error("没有有效的坐标数据");
  }

  if (validCoords.length === 1) {
    return { center: validCoords[0], zoom: 15 };
  }

  const lngs = validCoords.map(c => c[0]);
  const lats = validCoords.map(c => c[1]);

  const latRange = getPercentileRange(lats, densityPercentile);
  const lngRange = getPercentileRange(lngs, densityPercentile);

  const center = [
    (lngRange.min + lngRange.max) / 2,
    (latRange.min + latRange.max) / 2
  ];

  const latSpan = latRange.max - latRange.min;
  const lngSpan = lngRange.max - lngRange.min;

  const zoom = calculateZoomFromSpan(latSpan, lngSpan, center[1]);
  return { center, zoom: Math.min(Math.max(zoom, 3), 20) };
}

function getPercentileRange(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length <= 2) {
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }

  const exclude = (1 - percentile) / 2;
  const lowIndex = Math.max(0, Math.floor(sorted.length * exclude));
  const highIndex = Math.min(sorted.length - 1, Math.ceil(sorted.length * (1 - exclude)));

  return { min: sorted[lowIndex], max: sorted[highIndex] };
}

function calculateZoomFromSpan(latSpan, lngSpan, centerLat) {
  const EARTH_CIRCUMFERENCE = 40075000;
  const latSpanMeters = latSpan * (EARTH_CIRCUMFERENCE / 360);
  const lngSpanMeters =
    Math.abs(lngSpan) *
    (EARTH_CIRCUMFERENCE / 360) *
    Math.cos((centerLat * Math.PI) / 180);

  const maxSpanMeters = Math.max(latSpanMeters, lngSpanMeters);
  const zoom = Math.log2(EARTH_CIRCUMFERENCE / (maxSpanMeters * 1.5));
  return Math.round(zoom);
}
