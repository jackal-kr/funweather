#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(grep -oPm1 '(?<=<version>)[^<]+' src/mod_funweather/mod_funweather.xml)
mkdir -p dist
rm -f "dist/mod_funweather_v$VER.zip"
(cd src/mod_funweather && zip -qr "../../dist/mod_funweather_v$VER.zip" .)
echo "Built dist/mod_funweather_v$VER.zip"
