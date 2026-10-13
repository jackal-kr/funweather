#!/usr/bin/env bash
set -euo pipefail
C=${JOOMLA_CONTAINER:-joomla_app}
ROOT=${JOOMLA_ROOT:-/var/www/html}
S="$(dirname "$0")/../src/mod_funweather"
M="$ROOT/modules/mod_funweather"
docker cp "$S/mod_funweather.php" "$C:$M/"
docker cp "$S/tmpl/."  "$C:$M/tmpl/"
docker cp "$S/src/."   "$C:$M/src/"
docker cp "$S/media/." "$C:$ROOT/media/mod_funweather/"
for d in "$S"/language/*/; do
  docker cp "$d." "$C:$ROOT/language/$(basename "$d")/"
done
docker exec "$C" chown -R www-data:www-data "$M" "$ROOT/media/mod_funweather"
echo "Deployed. Hard-refresh the browser (Ctrl+F5)."
