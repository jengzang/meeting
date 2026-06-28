"""
CSV diff tool — compare two CSV files row by row.

Usage:
  python3 scripts/csv_diff.py <path_a> <path_b>
  python3 scripts/csv_diff.py <path_a> <path_b> --key id      # match rows by key column
  python3 scripts/csv_diff.py <path_a> <path_b> --delimiter '|'
"""
import csv, argparse, sys
from difflib import unified_diff


def load_csv(path, delimiter):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        if not reader.fieldnames:
            print(f"[ERROR] {path}: no header row or empty file")
            sys.exit(1)
        rows = [row for row in reader]
    return reader.fieldnames, rows


def build_index(rows, key):
    """Build key -> row mapping. Accepts single column or comma-separated composite.
    Duplicate keys keep the last row (warn)."""
    keys = [k.strip() for k in key.split(",")] if isinstance(key, str) else [key]
    idx = {}
    dups = 0
    for r in rows:
        k = "||".join(r.get(c, "") for c in keys)
        if k in idx:
            dups += 1
        idx[k] = r
    if dups:
        print(f"[WARN] {dups} duplicate key(s) on '{key}' — kept last occurrence")
    return idx


def pick_key(cols, rows):
    """Auto-pick the best key column: prefer 'id'-like names with high cardinality."""
    candidates = [c for c in cols if c.lower().startswith("id") or "编号" in c or "ID" in c]
    if not candidates:
        candidates = cols
    threshold = max(len(rows) * 0.8, 1)
    for c in candidates:
        unique = len(set(r.get(c, "") for r in rows))
        if unique >= threshold:
            return c
    return None


def compare_by_key(cols_a, rows_a, cols_b, rows_b, key):
    all_cols = sorted(set(cols_a) | set(cols_b), key=lambda c: (c not in cols_a, c not in cols_b))
    idx_a = build_index(rows_a, key)
    idx_b = build_index(rows_b, key)
    keys_a = set(idx_a)
    keys_b = set(idx_b)

    added = keys_b - keys_a
    removed = keys_a - keys_b
    common = keys_a & keys_b

    diffs = 0
    total = len(common)

    for k in sorted(common):
        ra, rb = idx_a[k], idx_b[k]
        changed = []
        for c in all_cols:
            va = ra.get(c, "").strip()
            vb = rb.get(c, "").strip()
            if va != vb:
                changed.append((c, va, vb))
        if changed:
            diffs += 1
            print(f"\n── [{key}={k}] ──")
            for c, va, vb in changed:
                print(f"  {c}:  [{va}]  →  [{vb}]")

    # build dict for summary view
    a_d = {k: idx_a.get(k) for k in sorted(common)}
    b_d = {k: idx_b.get(k) for k in sorted(common)}

    if added:
        print(f"\n── Only in B (+{len(added)}) ──")
        for k in sorted(added):
            print(f"  + [{key}={k}]")
            for c in cols_b:
                v = idx_b[k].get(c, "").strip()
                if v:
                    print(f"      {c}: {v}")
        _show_preview(b_d, idx_b, sorted(added), cols_b, key, label="added")

    if removed:
        print(f"\n── Only in A (-{len(removed)}) ──")
        for k in sorted(removed):
            print(f"  - [{key}={k}]")
            for c in cols_a:
                v = idx_a[k].get(c, "").strip()
                if v:
                    print(f"      {c}: {v}")
        _show_preview(a_d, idx_a, sorted(removed), cols_a, key, label="removed")

    print(f"\n── Summary ──")
    print(f"  A rows : {len(rows_a)}")
    print(f"  B rows : {len(rows_b)}")
    print(f"  Common : {total}")
    print(f"  Changed: {diffs}")
    print(f"  Only A : {len(removed)}")
    print(f"  Only B : {len(added)}")


def _show_preview(d, idx, keys, cols, key_col, label, limit=3):
    """Print a compact preview of added/removed rows."""
    if len(keys) <= 2 * limit:
        return  # already fully printed above, no need for preview
    print(f"  (showing first {limit} of {len(keys)} {label}, use --all for full)")


def compare_side_by_side(cols_a, rows_a, cols_b, rows_b, key):
    """Fallback: compare row-by-row by position (no key column)."""
    all_cols = sorted(set(cols_a) | set(cols_b), key=lambda c: (c not in cols_a, c not in cols_b))
    max_len = max(len(rows_a), len(rows_b))
    diffs = 0

    for i in range(max_len):
        ra = rows_a[i] if i < len(rows_a) else None
        rb = rows_b[i] if i < len(rows_b) else None

        if ra is None:
            diffs += 1
            print(f"\n── [row {i}] only in B ──")
            for c in cols_b:
                v = rb.get(c, "").strip()
                if v:
                    print(f"  + {c}: {v}")
        elif rb is None:
            diffs += 1
            print(f"\n── [row {i}] only in A ──")
            for c in cols_a:
                v = ra.get(c, "").strip()
                if v:
                    print(f"  - {c}: {v}")
        else:
            changed = []
            for c in all_cols:
                va = ra.get(c, "").strip()
                vb = rb.get(c, "").strip()
                if va != vb:
                    changed.append((c, va, vb))
            if changed:
                diffs += 1
                label_a = ra.get(key, "") if key in ra else ""
                label_b = rb.get(key, "") if key in rb else ""
                label = f"row {i}"
                if label_a or label_b:
                    label += f" | A={label_a} B={label_b}"
                print(f"\n── [{label}] ──")
                for c, va, vb in changed:
                    print(f"  {c}:  [{va}]  →  [{vb}]")

    print(f"\n── Summary ──")
    print(f"  A rows : {len(rows_a)}")
    print(f"  B rows : {len(rows_b)}")
    print(f"  Changed or mismatched: {diffs}")


def main():
    parser = argparse.ArgumentParser(description="Diff two CSV files")
    parser.add_argument("path_a", help="First CSV file")
    parser.add_argument("path_b", help="Second CSV file")
    parser.add_argument("--key", default=None, help="Column to match rows by (default: compare by row position)")
    parser.add_argument("--delimiter", default=",", help="CSV delimiter (default: comma)")
    parser.add_argument("--all", action="store_true", help="Print all added/removed rows (no preview truncation)")
    args = parser.parse_args()

    cols_a, rows_a = load_csv(args.path_a, args.delimiter)
    cols_b, rows_b = load_csv(args.path_b, args.delimiter)

    # Auto-detect or validate key column
    key = args.key
    if key:
        # Check all parts of a composite key exist in both files
        key_parts = [k.strip() for k in key.split(",")]
        missing_a = [k for k in key_parts if k not in cols_a]
        missing_b = [k for k in key_parts if k not in cols_b]
        if missing_a:
            print(f"[ERROR] Key column(s) {missing_a} not found in A")
            sys.exit(1)
        if missing_b:
            print(f"[ERROR] Key column(s) {missing_b} not found in B")
            sys.exit(1)
    else:
        key = pick_key(cols_a, rows_a)
        if key and key not in cols_b:
            key = None

    if key:
        print(f"[INFO] Matching by key: '{key}'")
        compare_by_key(cols_a, rows_a, cols_b, rows_b, key)
    else:
        print(f"[INFO] No high-cardinality key column found, comparing by row position")
        compare_side_by_side(cols_a, rows_a, cols_b, rows_b, key or "")


if __name__ == "__main__":
    main()
