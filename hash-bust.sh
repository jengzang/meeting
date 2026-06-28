#!/bin/bash
# Auto-update cache-busting hashes in all HTML files to the latest git commit.
# Run: ./hash-bust.sh

HASH=$(git rev-parse --short HEAD)
echo "→ updating to $HASH"

for f in *.html full/*.html; do
  [ -f "$f" ] || continue
  # 1. Update existing ?v= hashes
  sed -i '' -E "s/\?v=[a-f0-9]+/?v=$HASH/g" "$f"
  # 2. Add hash to sheep.js imports that don't have one
  sed -i '' -E 's|from "(\.\.?/js/sheep\.js)"|from "\1?v='"$HASH"'"|g' "$f"
  sed -i '' -E 's|from "(\.\.?/js/loading\.js)"|from "\1?v='"$HASH"'"|g' "$f"
  sed -i '' -E 's|href="(\.\.?/css/loading\.css)"|href="\1?v='"$HASH"'"|g' "$f"
  echo "  $f"
done

echo "→ done"
