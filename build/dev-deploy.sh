#!/usr/bin/env bash
set -euo pipefail
C=${JOOMLA_CONTAINER:-joomla_app}
ROOT=${JOOMLA_ROOT:-/var/www/html}
S="$(dirname "$0")/../src/mod_funweather"
M="$ROOT/modules/mod_funweather"
MEDIA="$ROOT/media/mod_funweather"

docker exec "$C" mkdir -p "$M/tmpl" "$M/src" "$MEDIA"
docker cp "$S/mod_funweather.php" "$C:$M/"
docker cp "$S/tmpl/."  "$C:$M/tmpl/"
docker cp "$S/src/."   "$C:$M/src/"
docker cp "$S/media/." "$C:$MEDIA/"
for d in "$S"/language/*/; do
  docker cp "$d." "$C:$ROOT/language/$(basename "$d")/"
done

docker exec "$C" bash -c "
  chown -R www-data:www-data '$M' '$MEDIA' &&
  chown www-data:www-data '$ROOT'/language/*/*mod_funweather* &&
  chmod -R u+rwX,go+rX '$M' '$MEDIA' &&
  chmod 664 '$ROOT'/language/*/*mod_funweather*"
echo "Deployed. Hard-refresh the browser (Ctrl+F5)."
