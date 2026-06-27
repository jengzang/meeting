"""
Convert 交通_together.xlsx → js/data/traffic.js.

Coordinates resolved by time-matching against records.js (hand-edited, with IDs).
  origin coords = record with departure closest to traffic 'from' time
  dest coords   = record with arrival closest to traffic 'to' time

Only exports traffic on dates that exist in records.js.

Usage:
  source /tmp/xlsxenv/bin/activate
  python3 scripts/convert_traffic.py
"""
import json, os, re
from datetime import datetime
import openpyxl

SRC_RECORDS_JS = os.path.join(os.path.dirname(__file__), "..", "js", "data", "records.js")
SRC_TRAFFIC = os.path.join(os.path.dirname(__file__), "..", "交通_together.xlsx")
DST = os.path.join(os.path.dirname(__file__), "..", "js", "data", "traffic.js")


def parse_dt(s):
    """Parse ISO 8601 string like '2026-06-23T02:24:43+0800'."""
    s_clean = s[:19]
    return datetime.strptime(s_clean, "%Y-%m-%dT%H:%M:%S")


# ── load records from hand-edited records.js ────────────────────

with open(SRC_RECORDS_JS, "r") as f:
    js_text = f.read()

# extract JSON array from ES module (strip trailing comma before ])
m = re.search(r"export const records = (\[.*?\]);", js_text, re.DOTALL)
if not m:
    print("ERROR: could not parse records.js")
    exit(1)
arr_text = re.sub(r",\s*\]", "]", m.group(1))
records_data = json.loads(arr_text)

record_times = []  # [{id, arrival_dt, departure_dt, lat, lng}]
record_dates = set()

for rec in records_data:
    if not rec.get("arrival") or not rec.get("departure"):
        continue
    if rec.get("lat") is None or rec.get("lng") is None:
        continue
    arr_dt = parse_dt(rec["arrival"])
    dep_dt = parse_dt(rec["departure"])
    record_dates.add(rec["date"])
    record_times.append({
        "id": rec["id"],
        "arrival": arr_dt,
        "departure": dep_dt,
        "lat": rec["lat"],
        "lng": rec["lng"],
    })


def closest_origin(traffic_from_dt):
    """Find the record whose departure is closest to the traffic start time."""
    best = None
    best_diff = float("inf")
    for rec in record_times:
        diff = abs((rec["departure"] - traffic_from_dt).total_seconds())
        if diff < best_diff:
            best_diff = diff
            best = rec
    return best["id"], best["lat"], best["lng"]


def closest_dest(traffic_to_dt):
    """Find the record whose arrival is closest to the traffic end time."""
    best = None
    best_diff = float("inf")
    for rec in record_times:
        diff = abs((rec["arrival"] - traffic_to_dt).total_seconds())
        if diff < best_diff:
            best_diff = diff
            best = rec
    return best["id"], best["lat"], best["lng"]


# ── read & convert traffic ──────────────────────────────────────

wb_tr = openpyxl.load_workbook(SRC_TRAFFIC)
ws_tr = wb_tr.active

traffic = []
skipped_date = 0

for r in range(2, ws_tr.max_row + 1):
    typ = ws_tr.cell(r, 1).value
    from_time = ws_tr.cell(r, 2).value
    to_time = ws_tr.cell(r, 3).value
    tz = ws_tr.cell(r, 4).value
    dur = ws_tr.cell(r, 5).value
    origin = ws_tr.cell(r, 6).value
    dest = ws_tr.cell(r, 7).value

    if not typ or not from_time or not to_time:
        continue

    date_str = from_time[:10]
    if date_str not in record_dates:
        skipped_date += 1
        continue

    f_dt = parse_dt(from_time)
    t_dt = parse_dt(to_time)
    o_rid, o_lat, o_lng = closest_origin(f_dt)
    d_rid, d_lat, d_lng = closest_dest(t_dt)

    traffic.append({
        "type": str(typ).strip(),
        "from_time": from_time,
        "to_time": to_time,
        "tz": str(tz).strip() if tz else "Asia/Shanghai",
        "duration_sec": int(dur) if dur else None,
        "origin": str(origin).strip() if origin else None,
        "origin_lat": o_lat,
        "origin_lng": o_lng,
        "origin_record_id": o_rid,
        "dest": str(dest).strip() if dest else None,
        "dest_lat": d_lat,
        "dest_lng": d_lng,
        "dest_record_id": d_rid,
        "date": date_str,
    })

# ── write ES module ─────────────────────────────────────────────

js = (
    "/* auto-generated — do not edit */\n"
    f"export const traffic = {json.dumps(traffic, ensure_ascii=False, indent=2)};\n"
)

with open(DST, "w") as f:
    f.write(js)

print(f"Written {len(traffic)} traffic records to {DST}  (skipped {skipped_date} outside record dates)")
