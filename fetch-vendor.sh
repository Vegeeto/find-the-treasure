#!/usr/bin/env bash
# =============================================================================
#  fetch-vendor.sh — download Alpine.js, AOS and Font Awesome into assets/vendor
#  so the game works with no internet connection at the venue.
#
#  Run once:   ./fetch-vendor.sh
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"

ALPINE_V="3.14.9"
AOS_V="2.3.4"
FA_V="6.7.2"

JSD="https://cdn.jsdelivr.net/npm"

mkdir -p assets/vendor/alpine \
         assets/vendor/aos \
         assets/vendor/fontawesome/css \
         assets/vendor/fontawesome/webfonts \
         assets/vendor/fonts

get() { echo "  → $2"; curl -fsSL "$1" -o "$2"; }

echo "Alpine.js ${ALPINE_V}"
get "${JSD}/alpinejs@${ALPINE_V}/dist/cdn.min.js" "assets/vendor/alpine/alpine.min.js"

echo "AOS ${AOS_V}"
get "${JSD}/aos@${AOS_V}/dist/aos.js"  "assets/vendor/aos/aos.js"
get "${JSD}/aos@${AOS_V}/dist/aos.css" "assets/vendor/aos/aos.css"

echo "Font Awesome ${FA_V}"
get "${JSD}/@fortawesome/fontawesome-free@${FA_V}/css/all.min.css" \
    "assets/vendor/fontawesome/css/all.min.css"

# Only the two font files the solid + regular icon sets need.
for f in fa-solid-900.woff2 fa-regular-400.woff2 fa-brands-400.woff2; do
  get "${JSD}/@fortawesome/fontawesome-free@${FA_V}/webfonts/${f}" \
      "assets/vendor/fontawesome/webfonts/${f}"
done

echo "Cormorant Garamond (display typeface)"
GF="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

if curl -fsSL -A "$UA" "$GF" -o assets/vendor/fonts/cormorant.css; then
  # download each woff2 the stylesheet points at and rewrite the URL to a local file
  grep -o 'https://fonts\.gstatic\.com[^)]*\.woff2' assets/vendor/fonts/cormorant.css \
    | sort -u \
    | while read -r url; do
        name="$(basename "${url%%\?*}")"
        get "$url" "assets/vendor/fonts/${name}"
        # BSD and GNU sed both accept this form
        sed -i.bak "s#${url}#${name}#g" assets/vendor/fonts/cormorant.css
      done
  rm -f assets/vendor/fonts/cormorant.css.bak
else
  echo "  ! could not reach Google Fonts — the app falls back to a system serif"
fi

echo
echo "Done. assets/vendor is populated — the game now runs fully offline."
