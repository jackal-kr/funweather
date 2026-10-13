<?php
/**
 * @package     Fun Weather
 * @copyright   Copyright (C) 2026 JOD. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

defined('_JEXEC') or die;

/** @var array  $cfg */
/** @var array  $strings */
/** @var string $uid */
/** @var string $place */
/** @var string $sfx */
/** @var string $pad */

$flags = JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE;
?>
<div id="<?php echo $uid; ?>" class="fw-widget fw-hide<?php echo $cfg['full'] ? ' fw-full' : ''; ?> <?php echo $sfx; ?>"
	style="--fw-pad:<?php echo htmlspecialchars($pad, ENT_QUOTES, 'UTF-8'); ?>"
	data-fw="<?php echo htmlspecialchars(json_encode($cfg, $flags), ENT_QUOTES, 'UTF-8'); ?>"
	data-fw-i18n="<?php echo htmlspecialchars(json_encode($strings, $flags), ENT_QUOTES, 'UTF-8'); ?>"
	aria-live="polite">
	<canvas class="fw-canvas" aria-hidden="true"></canvas>
	<div class="fw-body">
		<?php if ($place !== '' && $params->get('show_place', 1)) : ?>
			<div class="fw-place"><?php echo htmlspecialchars($place, ENT_COMPAT, 'UTF-8'); ?></div>
		<?php endif; ?>
		<div class="fw-main">
			<span class="fw-icon" aria-hidden="true"></span>
			<span class="fw-temp"></span>
			<span class="fw-cond"></span>
		</div>
		<div class="fw-sub"></div>
		<div class="fw-outlook"></div>
		<div class="fw-fc"></div>
		<div class="fw-tip"></div>
		<div class="fw-note"></div>
		<?php if ($params->get('show_credit', 1)) : ?>
			<div class="fw-credit"><?php echo htmlspecialchars($strings['credit'], ENT_COMPAT, 'UTF-8'); ?> <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a></div>
		<?php endif; ?>
	</div>
</div>
