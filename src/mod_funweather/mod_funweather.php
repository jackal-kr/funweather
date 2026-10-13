<?php
/**
 * Fun Weather - Joomla 4/5/6 site module.
 * Data: Open-Meteo (free, no API key). All fetching/animation happens in the browser.
 */

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ModuleHelper;
use Joomla\CMS\Language\LanguageFactoryInterface;
use Joomla\CMS\Language\Text;

$app = Factory::getApplication();
$wa  = $app->getDocument()->getWebAssetManager();

$wa->registerAndUseStyle('mod_funweather', 'mod_funweather/funweather.css');
$wa->registerAndUseScript('mod_funweather', 'mod_funweather/funweather.js', [], ['defer' => true]);

$allowedPreview = ['', 'clear', 'night', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'wind', 'dawn', 'dusk', 'ice', 'hail'];
$preview        = (string) $params->get('preview', '');

// "Fill the frame": 'auto' = the script measures the module frame's padding; otherwise a CSS length like 1rem.
$offset = trim((string) $params->get('frame_offset', 'auto'));
$manual = preg_match('/^\d*\.?\d+(px|rem|em|%)?$/D', $offset) === 1;
$pad    = $manual ? (preg_match('/[a-z%]$/', $offset) ? $offset : $offset . 'px') : '0px';

$eff = (string) $params->get('effects', '1');
$fxw = in_array($eff, ['1', 'weather'], true) ? 1 : 0;
$fxs = in_array($eff, ['1', 'season'], true) ? 1 : 0;

$forcedTag = (string) $params->get('language', 'auto');
$langTag   = in_array($forcedTag, ['en-GB', 'pl-PL', 'uk-UA', 'cs-CZ', 'de-DE', 'hu-HU', 'ru-RU'], true) ? $forcedTag : (string) $app->getLanguage()->getTag();

$cfg = [
	'lat'     => max(-90, min(90, (float) $params->get('lat', 50.0647))),
	'lon'     => max(-180, min(180, (float) $params->get('lon', 19.945))),
	'refresh' => max(5, (int) $params->get('refresh', 15)),
	'temp'    => $params->get('temp_unit', 'c') === 'f' ? 'f' : 'c',
	'wind'    => in_array($params->get('wind_unit', 'kmh'), ['kmh', 'ms', 'mph'], true) ? $params->get('wind_unit', 'kmh') : 'kmh',
	'model'   => in_array($params->get('model', 'auto'), ['ecmwf_ifs025', 'icon_eu', 'meteofrance_seamless', 'gfs_seamless'], true) ? $params->get('model') : '',
	'lang'    => $langTag,
	'outlook' => (int) $params->get('show_outlook', 1),
	'forecast' => (int) $params->get('show_forecast', 0),
	'bg'      => (int) $params->get('background', 1),
	'full'    => $params->get('shape', 'rounded') === 'full' ? 1 : 0,
	'autopad' => $manual ? 0 : 1,
	'dstyle'  => in_array($params->get('dstyle', 'text'), ['text', 'cards', 'tiles', 'list', 'chips'], true) ? $params->get('dstyle', 'text') : 'text',
	'fx'      => ($fxw || $fxs) ? 1 : 0,
	'fxw'     => $fxw,
	'fxs'     => $fxs,
	'tip'     => (int) $params->get('show_tip', 1),
	'season'  => in_array($params->get('tip_season', 'auto'), ['auto', 'winter', 'spring', 'summer', 'autumn'], true) ? $params->get('tip_season', 'auto') : 'auto',
	'pseason' => in_array($params->get('preview_season', ''), ['winter', 'spring', 'summer', 'autumn'], true) && $fxs ? $params->get('preview_season') : '',
	'preview' => in_array($preview, $allowedPreview, true) && $fxw ? $preview : '',
	'show'    => [
		'feels'    => (int) $params->get('show_feels', 1),
		'range'    => (int) $params->get('show_range', 1),
		'rain'     => (int) $params->get('show_rain', 1),
		'wind'     => (int) $params->get('show_wind', 1),
		'humidity' => (int) $params->get('show_humidity', 0),
		'pressure' => (int) $params->get('show_pressure', 0),
		'sun'      => (int) $params->get('show_sun', 0),
	],
];

// Strings handed to the script, translated by Joomla in the current site language.
$strings = [];
$keys    = [
	'wmo_clear', 'wmo_mostlyClear', 'wmo_partlyCloudy', 'wmo_overcast', 'wmo_fog', 'wmo_drizzle', 'wmo_rain',
	'wmo_showers', 'wmo_freezingRain', 'wmo_hail', 'wmo_snow', 'wmo_snowShowers', 'wmo_thunderstorm',
	'feels', 'max', 'min', 'rain', 'wind', 'humidity', 'pressure', 'sunrise', 'sunset',
	'credit', 'stale', 'o_rain_from', 'o_rain_until', 'o_snow_from', 'o_snow_until', 'o_frost', 'temperature', 'sun', 'c_rain', 'd_calm', 'd_light', 'd_moderate', 'd_strong', 'd_gale', 'd_dry', 'd_comfy', 'd_humid', 'd_plow', 'd_pnormal', 'd_phigh',
];

// Seasonal tips: tip_<season>_<condition>_<variant>
foreach (['winter', 'spring', 'summer', 'autumn'] as $season)
{
	foreach (['nice', 'clear', 'calm', 'rain', 'snow', 'storm', 'fog', 'frost', 'wind', 'hot', 'night'] as $cond)
	{
		foreach ([1, 2] as $variant)
		{
			$keys[] = "tip_{$season}_{$cond}_{$variant}";
		}
	}
}

// Language: "auto" follows the site language; otherwise load the chosen one straight from the module folder.
$forced     = (string) $params->get('language', 'auto');
$translator = null;

if (in_array($forced, ['en-GB', 'pl-PL', 'uk-UA', 'cs-CZ', 'de-DE', 'hu-HU', 'ru-RU'], true))
{
	$translator = Factory::getContainer()->get(LanguageFactoryInterface::class)->createLanguage($forced, false);
	$translator->load('mod_funweather', __DIR__, 'en-GB', true);   // fallback first
	$translator->load('mod_funweather', __DIR__, $forced, true);
}

foreach ($keys as $key)
{
	$const         = 'MOD_FUNWEATHER_T_' . strtoupper($key);
	$strings[$key] = $translator ? $translator->_($const) : Text::_($const);
}

$uid   = 'fw-' . (int) $module->id;
$place = trim((string) $params->get('place', ''));
$sfx   = htmlspecialchars((string) $params->get('moduleclass_sfx', ''), ENT_COMPAT, 'UTF-8');

require ModuleHelper::getLayoutPath('mod_funweather', $params->get('layout', 'default'));
