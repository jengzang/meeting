"""
Convert 到访记录.csv → data/full/records.enc.js (AES-256-GCM encrypted)
Convert 交通.csv → data/full/traffic.enc.js (AES-256-GCM encrypted)
Convert 地点.csv → data/full/record_locations.enc.js (AES-256-GCM encrypted)
Convert 天气.csv → data/full/record_weather.enc.js (AES-256-GCM encrypted)

Encryption: PBKDF2-SHA256 (1.2M iter) → AES-256-GCM with shared random salt & IV.

Usage:
  source /tmp/xlsxenv/bin/activate
  FULL_MAP_PASSWORD=your-secret python3 scripts/convert_full.py
"""
import base64, csv, gzip, json, os
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

PASSWORD = os.environ.get("FULL_MAP_PASSWORD")
if not PASSWORD:
    print("ERROR: Set FULL_MAP_PASSWORD environment variable")
    exit(1)
PBKDF2_ITERATIONS = 1_200_000

SRC_RECORDS = os.path.join(os.path.dirname(__file__), "..", "raw_data/到访记录.csv")
SRC_TRAFFIC = os.path.join(os.path.dirname(__file__), "..", "raw_data/交通.csv")
SRC_PLACES  = os.path.join(os.path.dirname(__file__), "..", "raw_data/地点.csv")
SRC_WEATHER = os.path.join(os.path.dirname(__file__), "..", "raw_data/天气.csv")
DST_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "full")
DST_RECORDS = os.path.join(DST_DIR, "records.enc.js")
DST_TRAFFIC = os.path.join(DST_DIR, "traffic.enc.js")
DST_LOCATIONS = os.path.join(DST_DIR, "record_locations.enc.js")
DST_WEATHER   = os.path.join(DST_DIR, "record_weather.enc.js")

TOLERANCE = timedelta(minutes=2)
MAX_GAP = timedelta(hours=24)


def parse_dt(s):
    """Parse ISO 8601 string like '2026-06-23T02:24:43+0800'."""
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
                "time": row[0].strip(),
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


def build_enriched(records, places, weather_by_place):
    """Match records → places (exact name) and → weather (name + time range)."""
    record_locations = {}
    record_weather = {}

    for r in records:
        rid = str(r["id"])
        place_name = r.get("place", "")

        if place_name in places:
            record_locations[rid] = places[place_name]

        if place_name in places and r.get("arrival") and r.get("departure"):
            arrival_dt = parse_dt(r["arrival"])
            departure_dt = parse_dt(r["departure"])
            entries = weather_by_place.get(place_name, [])
            matched = []
            for wdt, wentry in entries:
                if arrival_dt <= wdt <= departure_dt:
                    compact_entry = dict(wentry)
                    compact_entry["time"] = wdt.strftime("%m/%d %H:%M")
                    matched.append(compact_entry)
            if matched:
                record_weather[rid] = matched

    return record_locations, record_weather


# ── read records CSV ─────────────────────────────────────────────

records = []
rid = 0

with open(SRC_RECORDS, "r", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        if not row or len(row) < 7:
            continue
        activity = row[0].strip() if row[0] else None
        place = row[1].strip() if len(row) > 1 and row[1] else None
        arrival = row[2].strip() if len(row) > 2 and row[2] else None
        departure = row[3].strip() if len(row) > 3 and row[3] else None
        tz = row[4].strip() if len(row) > 4 and row[4] else "Asia/Shanghai"
        lat = row[5].strip() if len(row) > 5 and row[5] else None
        lng = row[6].strip() if len(row) > 6 and row[6] else None
        tag = row[7].strip() if len(row) > 7 and row[7] else None
        note = row[8].strip() if len(row) > 8 and row[8] else None

        if not activity or not place or lat is None or lng is None:
            continue

        try:
            lat_f = float(lat)
            lng_f = float(lng)
        except ValueError:
            continue

        date_str = arrival[:10] if arrival else None

        rid += 1
        records.append({
            "id": rid,
            "activity": activity,
            "place": place,
            "arrival": arrival,
            "departure": departure,
            "date": date_str,
            "tz": tz,
            "lat": round(lat_f, 7),
            "lng": round(lng_f, 7),
            "note": note,
            "photo_we": None,
            "photo_spots": None
        })

print(f"Read {len(records)} records from CSV")

# ── location & weather matching ─────────────────────────────────

places = load_places()
weather_by_place = load_weather()
print(f"  {len(places)} places, {sum(len(v) for v in weather_by_place.values())} weather entries")

record_locations, record_weather = build_enriched(records, places, weather_by_place)
print(f"  {len(record_locations)} location entries, {len(record_weather)} weather entries")

# ── encrypt helper ───────────────────────────────────────────────

def encrypt_json(data, password, salt):
    """Encrypt JSON with AES-256-GCM using a given salt. Returns { salt, iv, ciphertext } all base64."""
    iv = os.urandom(12)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=PBKDF2_ITERATIONS)
    key = kdf.derive(password.encode())
    aesgcm = AESGCM(key)
    plaintext = json.dumps(data, ensure_ascii=False).encode()
    compressed = gzip.compress(plaintext, compresslevel=9)
    ciphertext = aesgcm.encrypt(iv, compressed, None)
    return {
        "salt": base64.b64encode(salt).decode(),
        "iv": base64.b64encode(iv).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
    }

os.makedirs(DST_DIR, exist_ok=True)

shared_salt = os.urandom(16)
enc_records = encrypt_json(records, PASSWORD, shared_salt)
js = (
    "/* auto-generated — do not edit */\n"
    f"export const recordsEnc = {json.dumps(enc_records, ensure_ascii=False)};\n"
)
with open(DST_RECORDS, "w") as f:
    f.write(js)

print(f"Written {len(records)} encrypted records to {os.path.relpath(DST_RECORDS)}")


# ── build sorted record list for gap matching ────────────────────

recs = []
for r in records:
    if not r.get("arrival") or not r.get("departure"):
        continue
    if r.get("lat") is None or r.get("lng") is None:
        continue
    recs.append({
        "id": r["id"],
        "place": r["place"],
        "arrival": parse_dt(r["arrival"]),
        "departure": parse_dt(r["departure"]),
        "lat": r["lat"],
        "lng": r["lng"],
        "date": r["date"],
    })

recs.sort(key=lambda r: r["arrival"])

# build gap index
gaps = []
skipped_large = 0
for i in range(len(recs) - 1):
    gap_dur = recs[i + 1]["arrival"] - recs[i]["departure"]
    if gap_dur > MAX_GAP:
        skipped_large += 1
        continue
    gaps.append({
        "start": recs[i]["departure"],
        "end": recs[i + 1]["arrival"],
        "origin_rec": recs[i],
        "dest_rec": recs[i + 1],
    })

record_dates = {r["date"] for r in recs}


def find_gap(t_from, t_to):
    for g in gaps:
        if g["start"] - TOLERANCE <= t_from and t_to <= g["end"] + TOLERANCE:
            return g
    return None


# ── read & convert traffic CSV ───────────────────────────────────

traffic = []
skipped_date = 0
skipped_gap = 0

with open(SRC_TRAFFIC, "r", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        if not row or len(row) < 7:
            continue
        typ = row[0].strip() if row[0] else None
        from_time = row[1].strip() if len(row) > 1 and row[1] else None
        to_time = row[2].strip() if len(row) > 2 and row[2] else None
        tz = row[3].strip() if len(row) > 3 and row[3] else "Asia/Shanghai"
        dur_str = row[4].strip() if len(row) > 4 and row[4] else None
        origin_name = row[5].strip() if len(row) > 5 and row[5] else None
        dest_name = row[6].strip() if len(row) > 6 and row[6] else None
        note = row[7].strip() if len(row) > 7 and row[7] else None

        if not typ or not from_time or not to_time:
            continue

        date_str = from_time[:10]
        if date_str not in record_dates:
            skipped_date += 1
            continue

        f_dt = parse_dt(from_time)
        t_dt = parse_dt(to_time)
        gap = find_gap(f_dt, t_dt)
        if not gap:
            skipped_gap += 1
            continue

        o = gap["origin_rec"]
        d = gap["dest_rec"]

        traffic.append({
            "type": typ,
            "from_time": from_time,
            "to_time": to_time,
            "tz": tz,
            "duration_sec": int(dur_str) if dur_str else None,
            "origin": origin_name if origin_name else o["place"],
            "origin_lat": o["lat"],
            "origin_lng": o["lng"],
            "origin_record_id": o["id"],
            "dest": dest_name if dest_name else d["place"],
            "dest_lat": d["lat"],
            "dest_lng": d["lng"],
            "dest_record_id": d["id"],
            "date": date_str,
        })

# ── encrypt & write traffic ES module ────────────────────────────

enc_traffic = encrypt_json(traffic, PASSWORD, shared_salt)
js = (
    "/* auto-generated — do not edit */\n"
    f"export const trafficEnc = {json.dumps(enc_traffic, ensure_ascii=False)};\n"
)

with open(DST_TRAFFIC, "w") as f:
    f.write(js)

print(f"Written {len(traffic)} encrypted traffic records to {os.path.relpath(DST_TRAFFIC)}")
print(f"  skipped {skipped_date} outside record dates, {skipped_gap} not in any gap, {skipped_large} gaps >24h ignored")

# ── encrypt & write location & weather ES modules ────────────────

enc_locations = encrypt_json(record_locations, PASSWORD, shared_salt)
js = (
    "/* auto-generated — do not edit */\n"
    f"export const recordLocationsEnc = {json.dumps(enc_locations, ensure_ascii=False)};\n"
)
with open(DST_LOCATIONS, "w") as f:
    f.write(js)
print(f"Written {len(record_locations)} encrypted locations to {os.path.relpath(DST_LOCATIONS)}")

enc_weather = encrypt_json(record_weather, PASSWORD, shared_salt)
js = (
    "/* auto-generated — do not edit */\n"
    f"export const recordWeatherEnc = {json.dumps(enc_weather, ensure_ascii=False)};\n"
)
with open(DST_WEATHER, "w") as f:
    f.write(js)
weather_count = sum(len(v) for v in record_weather.values())
print(f"Written {len(record_weather)} encrypted weather lists ({weather_count} total entries) to {os.path.relpath(DST_WEATHER)}")
