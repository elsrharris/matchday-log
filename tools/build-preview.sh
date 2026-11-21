#!/usr/bin/env bash
# Copies the app (index.html, css/, js/) into a folder as a DEMO-ONLY preview, e.g. next/ on main.
# The preview shares an origin with the live app, so it must never read or write his real data:
# window.MDL_PREVIEW forces demo mode and points data fetches at ../data/.
# Usage: tools/build-preview.sh <source checkout> <target folder>
set -euo pipefail
SRC="${1:?source checkout}"; DST="${2:?target folder}"
rm -rf "$DST"; mkdir -p "$DST"
cp -r "$SRC/css" "$SRC/js" "$DST/"
sed 's#<script type="module" src="js/app.js"></script>#<script>window.MDL_PREVIEW = true;</script>\n<script type="module" src="js/app.js"></script>#' "$SRC/index.html" > "$DST/index.html"
sed -i 's#<title>Matchday Log – Leeds United</title>#<title>Matchday Log – redesign preview</title>\n<meta name="robots" content="noindex">#' "$DST/index.html"
grep -q 'MDL_PREVIEW = true' "$DST/index.html" || { echo "preview flag missing" >&2; exit 1; }
echo "Preview built in $DST"
