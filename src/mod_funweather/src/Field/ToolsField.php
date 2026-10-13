<?php
/**
 * Admin helper for Fun Weather: place search (fills latitude / longitude) and a connection test.
 * Everything runs in the administrator's browser against Open-Meteo; nothing is stored or sent to the server.
 */

namespace Joomla\Module\Funweather\Site\Field;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Form\FormField;
use Joomla\CMS\Language\Text;

class ToolsField extends FormField
{
	protected $type = 'Tools';

	protected function getInput()
	{
		$wa = Factory::getApplication()->getDocument()->getWebAssetManager();
		$wa->registerAndUseScript('mod_funweather.admin', 'mod_funweather/funweather-admin.js', [], ['defer' => true]);

		$keys = ['search_ph', 'search', 'pick', 'none', 'test', 'ok', 'fail', 'set'];
		$s    = ['lang' => substr((string) Factory::getApplication()->getLanguage()->getTag(), 0, 2)];

		foreach ($keys as $key)
		{
			$s[$key] = Text::_('MOD_FUNWEATHER_TOOLS_' . strtoupper($key));
		}

		$flags = JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE;

		return '<div class="fw-admin-tools" data-fw-tools="' . htmlspecialchars(json_encode($s, $flags), ENT_QUOTES, 'UTF-8') . '"></div>';
	}
}
