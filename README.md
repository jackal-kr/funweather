# Fun Weather (`mod_funweather`)

A small, funny, multi-language weather module for Joomla 4 / 5 / 6, built for the
S.O.D. Dojazdów allotment garden site (dojazdowdzialki.pl).
Data comes from [Open-Meteo](https://open-meteo.com/) — free, no API key — and is fetched in the visitor's browser.

## Features

- Current weather, feels-like, daily range, rain, wind, humidity, pressure, sun times
- 3-day forecast and a rain / frost outlook
- Animated canvas effects: rain, snow, hail, fog, wind, lightning, stars, moon (real phase), sunrise/sunset glow
- Seasonal effects: leaves, petals, butterflies, fireflies, frost sparkles
- Season- and weather-aware funny tips
- Light/dark theme aware, optional "no background" mode, rounded or full-frame
- Weather model selector (Auto, ICON-EU, ECMWF, GFS)
- Admin tools: place search and connection test
- Languages: en-GB, pl-PL, uk-UA, ru-RU, cs-CZ, de-DE, hu-HU (or forced per module)

## Requirements

Joomla 4.x, 5.x or 6.x · PHP 8.1+ · visitors' browsers must be able to reach `api.open-meteo.com`.

## Install

Download the zip from [Releases](https://github.com/jackal-kr/funweather/releases) (or build it, see below), then
System → Install → Extensions → Upload Package File. Add it under Content → Site Modules → New → Fun Weather.

## Repository layout

```
src/mod_funweather/   module source (edit only here)
build/build.sh        builds dist/mod_funweather_v<version>.zip
build/dev-deploy.sh   copies changes into the local Joomla container
updates/              Joomla update-server XML
docs/CHANGELOG.md     release notes
.vscode/              build + deploy task (Ctrl+Shift+B)
CLAUDE.md             contributor rules / definition of done
```

## Development

1. Run a local Joomla in Docker (container `joomla_app`, http://localhost:8080).
2. `./build/build.sh`, then install `dist/mod_funweather_v<ver>.zip` once.
3. Edit `src/mod_funweather/`, press **Ctrl+Shift+B**, hard-refresh the browser.
4. Reinstall the zip when `mod_funweather.xml` changes.

Override the target with `JOOMLA_CONTAINER` and `JOOMLA_ROOT`.

## Releasing

Bump the version (see `CLAUDE.md`), build, then
`gh release create vX.Y.Z dist/mod_funweather_vX.Y.Z.zip`. The update server in `updates/` points at that asset.

## Credits

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).

## License

GNU General Public License version 2 or later. See [LICENSE](LICENSE).
Copyright (C) 2026 JOD.
