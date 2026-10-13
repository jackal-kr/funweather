# Fun Weather — working rules

- Edit only `src/mod_funweather/`. Never edit a zip or `dist/`.
- Build: `./build/build.sh` → `dist/mod_funweather_v<ver>.zip`. Local deploy: `./build/dev-deploy.sh` (Ctrl+Shift+B).
- Reinstall the zip (don't just deploy) when `mod_funweather.xml` changes.

## Definition of done
1. Bump `<version>` in `mod_funweather.xml` and `updates/mod_funweather.xml`; add a `docs/CHANGELOG.md` entry.
2. Any new text goes into all 7 languages (en-GB, pl-PL, uk-UA, ru-RU, cs-CZ, de-DE, hu-HU), both `.ini` and `.sys.ini`, with identical key sets.
3. New source files carry the standard `@package / @copyright / @license` header.
4. No `innerHTML`; strings reach JS via `data-fw-i18n`; all external calls go only to Open-Meteo.
5. `php -l`, `node --check` and XML well-formedness pass.
