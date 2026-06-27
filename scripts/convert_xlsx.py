"""
Convert 记录_together.xlsx → js/data/records.js as an ES module.

Usage:  source /tmp/xlsxenv/bin/activate && python3 scripts/convert_xlsx.py
"""
import openpyxl, json, os, re
from datetime import datetime

SRC = os.path.join(os.path.dirname(__file__), "..", "记录_together.xlsx")
DST = os.path.join(os.path.dirname(__file__), "..", "js", "data", "records.js")

wb = openpyxl.load_workbook(SRC)
ws = wb.active

records = []

for r in range(2, ws.max_row + 1):
    activity = ws.cell(r, 1).value
    place = ws.cell(r, 2).value
    arrival = ws.cell(r, 3).value
    departure = ws.cell(r, 4).value
    tz = ws.cell(r, 5).value
    lat = ws.cell(r, 6).value
    lng = ws.cell(r, 7).value
    note = ws.cell(r, 8).value

    # skip rows missing essential fields
    if not activity or not place or lat is None or lng is None:
        continue

    # normalize date strings
    def norm_dt(val):
        if val is None:
            return None
        if isinstance(val, datetime):
            return val.strftime("%Y-%m-%dT%H:%M:%S%z")
        return str(val)

    records.append({
        "activity": str(activity).strip(),
        "place": str(place).strip(),
        "arrival": norm_dt(arrival),
        "departure": norm_dt(departure),
        "date": norm_dt(arrival)[:10] if arrival else None,  # "2026-06-22"
        "tz": str(tz).strip() if tz else "Asia/Shanghai",
        "lat": round(float(lat), 7),
        "lng": round(float(lng), 7),
        "note": str(note).strip() if note else None
    })

# write as ES module
js = f"/* auto-generated — do not edit */\nexport const records = {json.dumps(records, ensure_ascii=False, indent=2)};\n"

with open(DST, "w") as f:
    f.write(js)

print(f"✓ Written {len(records)} records to {DST}")
