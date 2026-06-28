"""
Enrich existing records.js with location & weather data.

Reads data/records.js (must already exist), matches each record to:
  - 地点.csv by exact place name → structured address
  - 天气.csv by place name + time range → list of hourly weather entries

Outputs:
  - data/record_locations.js
  - data/record_weather.js

Usage:
  python3 scripts/enrich_records.py
"""

import csv, json, os, re
from datetime import datetime

SRC_RECORDS  = os.path.join(os.path.dirname(__file__), "..", "data", "records.js")
SRC_PLACES   = os.path.join(os.path.dirname(__file__), "..", "raw_data/地点.csv")
SRC_WEATHER  = os.path.join(os.path.dirname(__file__), "..", "raw_data/天气.csv")
DST_LOCATIONS = os.path.join(os.path.dirname(__file__), "..", "data", "record_locations.js")
DST_WEATHER   = os.path.join(os.path.dirname(__file__), "..", "data", "record_weather.js")


# ── Helpers ────────────────────────────────────────────────────────

def parse_dt(s):
    """Parse ISO 8601 like '2026-06-27T19:00:00+0800' → naive datetime."""
    s_clean = s[:19]
    return datetime.strptime(s_clean, "%Y-%m-%dT%H:%M:%S")

def norm_str(val):
    return str(val).strip() if val else ""

def fmt_temp(k):
    """Kelvin → Celsius, 1 decimal."""
    try:
        return round(float(k) - 273.15, 1)
    except (ValueError, TypeError):
        return None


# ── Load records.js ────────────────────────────────────────────────

def load_records():
    """
    Parse data/records.js (ES module) → list of record dicts.
    Preserves the exact `id` from the file so IDs match at runtime.
    """
    with open(SRC_RECORDS, "r", encoding="utf-8") as f:
        text = f.read()
    # Find the JSON array inside `export const records = [...]`
    start = text.index("[")
    # Find the matching close bracket (naive: last `]` before final `;\n`)
    end = text.rindex("]")
    raw = text[start:end + 1]
    records = json.loads(raw)
    return records


# ── Load places ────────────────────────────────────────────────────

def load_places():
    """Return dict: place_name → {country, admin, subAdmin, city, district, street, houseNumber}."""
    places = {}
    with open(SRC_PLACES, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if not row or len(row) < 6:
                continue
            name = norm_str(row[0])
            if not name:
                continue
            places[name] = {
                "country": norm_str(row[5]),
                "admin": norm_str(row[6]),
                "subAdmin": norm_str(row[7]),
                "city": norm_str(row[8]),
                "district": norm_str(row[9]),
                "street": norm_str(row[10]),
                "houseNumber": norm_str(row[11]),
            }
    return places


# ── Load weather ───────────────────────────────────────────────────

def load_weather():
    """Return dict: place_name → [(dt, entry_dict), ...] sorted by time."""
    weather_by_place = {}
    with open(SRC_WEATHER, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if not row or len(row) < 15:
                continue
            place = norm_str(row[14])
            if not place:
                continue
            dt = parse_dt(row[0])
            entry = {
                "condition": norm_str(row[1]),
                "tempC": fmt_temp(row[2]),
                "feelsLikeC": fmt_temp(row[3]),
                "humidity": round(float(row[5]), 2) if row[5] else None,
                "precipType": norm_str(row[6]) or None,
                "precipMm": round(float(row[7]) * 1000, 4) if row[7] else 0,
                "precipProb": round(float(row[8]), 2) if row[8] else 0,
                "uvIndex": int(float(row[9])) if row[9] else 0,
                "uvLevel": norm_str(row[10]),
                "windDir": norm_str(row[11]),
                "windKmh": round(float(row[12]), 1) if row[12] else 0,
                "visibilityM": round(float(row[13])) if row[13] else 0,
            }
            weather_by_place.setdefault(place, []).append((dt, entry))
    for place in weather_by_place:
        weather_by_place[place].sort(key=lambda x: x[0])
    return weather_by_place


# ── Match & build output ──────────────────────────────────────────

def build_enriched(records, places, weather_by_place):
    """
    Match each record to 地点.csv (exact place name) and
    天气.csv (place name + time within [arrival, departure]).
    """
    record_locations = {}
    record_weather = {}

    for r in records:
        rid = str(r["id"])
        place_name = r["place"]

        # Location: exact name match
        if place_name in places:
            record_locations[rid] = places[place_name]

        # Weather: match by place name + time range
        if place_name in places and r.get("arrival") and r.get("departure"):
            arr_dt = parse_dt(r["arrival"])
            dep_dt = parse_dt(r["departure"])
            entries = weather_by_place.get(place_name, [])
            matched = []
            for wdt, wentry in entries:
                if arr_dt <= wdt <= dep_dt:
                    entry = dict(wentry)
                    entry["time"] = wdt.strftime("%m/%d %H:%M")
                    matched.append(entry)
            if matched:
                record_weather[rid] = matched

    return record_locations, record_weather


def write_js_module(path, var_name, data):
    js = (
        "/* auto-generated — do not edit */\n"
        f"export const {var_name} = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(js)


# ── Main ───────────────────────────────────────────────────────────

def main():
    if not os.path.exists(SRC_RECORDS):
        print(f"ERROR: {SRC_RECORDS} not found. Run convert_record.py first.")
        return

    print("Loading data...")
    records = load_records()
    places = load_places()
    weather_by_place = load_weather()

    print(f"  {len(records)} records from records.js, {len(places)} places, {sum(len(v) for v in weather_by_place.values())} weather entries")

    record_locations, record_weather = build_enriched(records, places, weather_by_place)

    write_js_module(DST_LOCATIONS, "recordLocations", record_locations)
    print(f"Written {len(record_locations)} location entries → {os.path.relpath(DST_LOCATIONS)}")

    write_js_module(DST_WEATHER, "recordWeather", record_weather)
    wx_count = sum(len(v) for v in record_weather.values())
    print(f"Written {len(record_weather)} weather lists ({wx_count} total entries) → {os.path.relpath(DST_WEATHER)}")

    print(f"\nSummary: {len(record_locations)}/{len(records)} have location, {len(record_weather)}/{len(records)} have weather")


if __name__ == "__main__":
    main()
