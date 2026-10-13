/**
 * @package     Fun Weather
 * @copyright   Copyright (C) 2026 JOD. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 *
 * Fun Weather admin helper: "find place" fills place / latitude / longitude, "test connection" checks Open-Meteo.
 */
(function () {
	'use strict';

	function $(id) { return document.getElementById(id); }
	function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
	function fire(input) { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }

	function mount(box) {
		var S;
		try { S = JSON.parse(box.getAttribute('data-fw-tools')); } catch (e) { return; }

		var row = el('div', 'input-group mb-2'), q = el('input', 'form-control'), go = el('button', 'btn btn-secondary', S.search);
		var pick = el('select', 'form-select mb-2'), test = el('button', 'btn btn-outline-secondary', S.test), msg = el('div', 'form-text mt-2');
		q.type = 'search'; q.placeholder = S.search_ph; q.setAttribute('aria-label', S.search_ph);
		go.type = 'button'; test.type = 'button'; pick.style.display = 'none';
		row.appendChild(q); row.appendChild(go);
		box.appendChild(row); box.appendChild(pick); box.appendChild(test); box.appendChild(msg);

		var results = [];

		function search() {
			var name = q.value.trim();
			if (name.length < 2) return;
			msg.textContent = '…';
			fetch('https://geocoding-api.open-meteo.com/v1/search?count=8&format=json&language=' + encodeURIComponent(S.lang || 'en') + '&name=' + encodeURIComponent(name))
				.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
				.then(function (d) {
					results = d.results || [];
					pick.textContent = '';
					if (!results.length) { pick.style.display = 'none'; msg.textContent = S.none; return; }
					var o = el('option', '', S.pick); o.value = ''; pick.appendChild(o);
					results.forEach(function (r, i) {
						var label = r.name + [r.admin2, r.admin1, r.country].filter(Boolean).map(function (v) { return ', ' + v; }).join('');
						var opt = el('option', '', label + ' (' + r.latitude.toFixed(3) + ', ' + r.longitude.toFixed(3) + ')'); opt.value = String(i); pick.appendChild(opt);
					});
					pick.style.display = ''; msg.textContent = '';
				})
				.catch(function () { msg.textContent = S.fail; });
		}

		pick.addEventListener('change', function () {
			var r = results[+pick.value];
			if (!r) return;
			var lat = $('jform_params_lat'), lon = $('jform_params_lon'), place = $('jform_params_place');
			if (lat) { lat.value = r.latitude.toFixed(4); fire(lat); }
			if (lon) { lon.value = r.longitude.toFixed(4); fire(lon); }
			if (place) { place.value = r.name; fire(place); }
			msg.textContent = S.set + ': ' + r.name;
		});

		go.addEventListener('click', search);
		q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); search(); } });

		test.addEventListener('click', function () {
			var lat = parseFloat(($('jform_params_lat') || {}).value), lon = parseFloat(($('jform_params_lon') || {}).value);
			var model = ($('jform_params_model') || {}).value || '';
			if (isNaN(lat) || isNaN(lon)) { msg.textContent = S.fail; return; }
			msg.textContent = '…';
			var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code,cloud_cover&timezone=auto' +
				(model && model !== 'auto' ? '&models=' + encodeURIComponent(model) : '');
			fetch(url)
				.then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
				.then(function (d) {
					var c = d.current || {};
					if (c.temperature_2m == null) throw new Error('no data');
					msg.textContent = S.ok + ': ' + c.temperature_2m + '°C' + (c.cloud_cover != null ? ', ' + c.cloud_cover + '%' : '') + ' (' + lat.toFixed(4) + ', ' + lon.toFixed(4) + ')';
				})
				.catch(function () { msg.textContent = S.fail; });
		});
	}

	function init() { [].forEach.call(document.querySelectorAll('.fw-admin-tools'), mount); }
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
