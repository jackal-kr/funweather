/**
 * @package     Fun Weather
 * @copyright   Copyright (C) 2026 JOD. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 *
 * Fun Weather - fetches Open-Meteo, renders the widget and draws weather effects on a canvas.
 * No dependencies. Handles several instances on one page.
 */
(function () {
	'use strict';

	var API = 'https://api.open-meteo.com/v1/forecast';
	var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var rnd = Math.round;

	/* Fake data for the "preview" option: [weather_code, is_day, temp C, wind km/h, wind dir] */
	var DEMO = {
		clear:  [0, 1, 22, 8, 270],
		night:  [0, 0, 6, 5, 200],
		cloudy: [3, 1, 14, 14, 250],
		rain:   [63, 1, 11, 16, 240],
		storm:  [95, 1, 18, 38, 250],
		snow:   [73, 1, -2, 12, 300],
		fog:    [45, 1, 5, 3, 90],
		wind:   [2, 1, 15, 52, 270],
		dawn:   [1, 1, 9, 5, 270, '06:40'],
		dusk:   [1, 0, 12, 5, 270, '18:15'],
		ice:    [66, 1, -1, 10, 300],
		hail:   [96, 1, 16, 30, 250]
	};

	/* WMO weather code -> icon, text key and which effects to draw */
	function describe(code, day) {
		var o = { icon: '\u{1F321}️', key: '', theme: 'cloudy', rain: 0, snow: 0, clouds: 0, fog: false, storm: false, freezing: false, hail: false, code: code };
		if (code === 0)       { o.icon = day ? '☀️' : '\u{1F319}'; o.key = 'clear'; o.theme = 'clear'; }
		else if (code === 1)  { o.icon = day ? '\u{1F324}️' : '\u{1F319}'; o.key = 'mostlyClear'; o.theme = 'clear'; o.clouds = 1; }
		else if (code === 2)  { o.icon = day ? '⛅' : '☁️'; o.key = 'partlyCloudy'; o.theme = 'clear'; o.clouds = 3; }
		else if (code === 3)  { o.icon = '☁️'; o.key = 'overcast'; o.clouds = 7; }
		else if (code === 45 || code === 48) { o.icon = '\u{1F32B}️'; o.key = 'fog'; o.theme = 'fog'; o.fog = true; }
		else if (code >= 51 && code <= 57)   { o.freezing = code >= 56; o.icon = day ? '\u{1F326}️' : '\u{1F327}️'; o.key = o.freezing ? 'freezingRain' : 'drizzle'; o.theme = 'rain'; o.rain = 1; o.clouds = 6; }
		else if (code >= 61 && code <= 67)   { o.freezing = code >= 66; o.icon = '\u{1F327}️'; o.key = o.freezing ? 'freezingRain' : 'rain'; o.theme = 'rain'; o.rain = (code === 61) ? 1 : (code === 65 ? 3 : 2); o.clouds = 7; }
		else if (code >= 71 && code <= 77)   { o.icon = '\u{1F328}️'; o.key = 'snow'; o.theme = 'snow'; o.snow = (code === 71 || code === 77) ? 1 : (code === 75 ? 3 : 2); o.clouds = 6; }
		else if (code >= 80 && code <= 82)   { o.icon = day ? '\u{1F326}️' : '\u{1F327}️'; o.key = 'showers'; o.theme = 'rain'; o.rain = code - 79; o.clouds = 6; }
		else if (code === 85 || code === 86) { o.icon = '\u{1F328}️'; o.key = 'snowShowers'; o.theme = 'snow'; o.snow = code === 85 ? 2 : 3; o.clouds = 6; }
		else if (code >= 95)  { o.hail = code === 96 || code === 99; o.icon = '⛈️'; o.key = o.hail ? 'hail' : 'thunderstorm'; o.theme = 'storm'; o.rain = 3; o.storm = true; o.clouds = 8; }
		return o;
	}

	/* ------------------------------------------------------------------ effects */

	/* Colours for the effects: light = a light page behind a transparent widget (needs darker, saturated strokes) */
	function palette(light) {
		return light ? {
			rain: 'rgba(55,100,175,.8)', rainW: 1.6, snowLine: 'rgba(70,110,175,.95)', snowDot: 'rgba(110,145,200,.9)',
			cloud: 'rgba(95,115,150,', cloudA: [.12, .26], star: 'rgba(60,80,150,', moon: 'rgba(125,140,190,.95)', moonGlow: 'rgba(120,140,205,.22)', petal: 'rgba(228,100,150,.95)', outline: 'rgba(120,45,70,.6)', dawn: 'rgba(255,150,60,', dusk: 'rgba(240,90,110,', iceRain: 'rgba(60,150,215,.9)', hail: 'rgba(120,150,190,.95)', fly: 'rgba(125,170,10,', spark: 'rgba(30,105,200,', shoot: 'rgba(60,80,150,',
			sun: 'rgba(255,190,40,.6)', ray: 'rgba(255,175,0,.5)', fog: 'rgba(110,120,135,.3)', streak: 'rgba(70,100,150,.55)', flash: 'rgba(255,215,70,'
		} : {
			rain: 'rgba(205,228,255,.9)', rainW: 1.5, snowLine: 'rgba(255,255,255,.97)', snowDot: 'rgba(255,255,255,.92)',
			cloud: 'rgba(255,255,255,', cloudA: [.2, .38], star: 'rgba(255,255,255,', moon: 'rgba(255,250,225,.95)', moonGlow: 'rgba(255,185,100,.24)', petal: 'rgba(255,190,210,.9)', dawn: 'rgba(255,175,95,', dusk: 'rgba(255,125,120,', iceRain: 'rgba(170,230,255,.95)', hail: 'rgba(255,255,255,.95)', fly: 'rgba(225,245,110,', spark: 'rgba(255,255,255,', shoot: 'rgba(255,255,255,',
			sun: 'rgba(255,236,150,.7)', ray: 'rgba(255,240,170,.45)', fog: 'rgba(255,255,255,.3)', streak: 'rgba(255,255,255,.55)', flash: 'rgba(235,235,255,'
		};
	}

	function Fx(host, canvas) {
		var ctx = canvas.getContext('2d');
		var W = 0, H = 0, dpr = 1;
		var s = null, pal = palette(false);   // current scene and colours
		var parts = {};
		var running = false, visible = true, last = 0, t = 0, raf = 0;
		var flash = 0, nextFlash = 3, shoot = null, nextShoot = 6;
		var LEAF = ['rgba(217,130,43,.9)', 'rgba(190,75,40,.9)', 'rgba(225,175,45,.9)', 'rgba(150,80,40,.9)'];

		function resize() {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			W = host.clientWidth; H = host.clientHeight;
			canvas.width = W * dpr; canvas.height = H * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (!running) frame(0);
		}

		function R(a, b) { return a + Math.random() * (b - a); }

		function build() {
			parts = { rain: [], snow: [], clouds: [], stars: [], streaks: [], leaves: [], petals: [], flies: [], sparks: [], bfly: [], glit: [], hail: [] };
			shoot = null; nextShoot = R(4, 9);
			var i, n;
			n = s.rain * 60;
			for (i = 0; i < n; i++) parts.rain.push({ x: Math.random(), y: Math.random(), l: R(12, 22), v: R(1.1, 1.8) });
			n = s.snow * 40;
			for (i = 0; i < n; i++) { var cr = Math.random() < .4; parts.snow.push({ x: Math.random(), y: Math.random(), crystal: cr, r: cr ? R(3, 5.5) : R(1, 2.4), v: R(.08, .2), ph: R(0, 6.3), rot: R(0, 3.1), spin: R(-.8, .8) }); }
			var part = s.theme === 'clear' && s.clouds >= 2;   // partly cloudy: more, bigger clouds, some passing over the sun (top right)
			for (i = 0; i < Math.min(5, Math.ceil(s.clouds * .6)) + (part ? 1 : 0); i++) parts.clouds.push({ x: part && i < 2 ? R(.45, 1) : Math.random() * 1.3 - .15, y: part && i < 2 ? R(.05, .3) : R(.02, .6), s: part ? R(26, 44) : R(18, 36), a: Math.random(), v: R(.008, .02) });
			if (s.night && !s.rain && !s.snow && s.clouds < 6) for (i = 0; i < 46; i++) parts.stars.push({ x: Math.random(), y: Math.random() * .85, r: R(.6, 1.9), ph: R(0, 6.3), sp: R(1, 3) });
			var calm = !s.rain && !s.snow && !s.storm, seas = s.season;
			if (seas === 'autumn' && calm) { n = Math.min(18, 8 + rnd(s.wind / 5)); for (i = 0; i < n; i++) parts.leaves.push({ x: Math.random(), y: Math.random(), z: R(5, 9), v: R(.05, .11), ph: R(0, 6.3), rot: R(0, 6.3), spin: R(-1.5, 1.5), c: LEAF[i % LEAF.length] }); }
			if (seas === 'spring' && calm && !s.night && !s.fog) for (i = 0; i < 12; i++) parts.petals.push({ x: Math.random(), y: Math.random(), z: R(2.5, 4.5), v: R(.04, .08), ph: R(0, 6.3), rot: R(0, 6.3), spin: R(-2, 2) });
			if (seas === 'summer' && s.night && calm && !s.fog) for (i = 0; i < 14; i++) parts.flies.push({ x: Math.random(), y: R(.3, .95), ph: R(0, 6.3), sp: R(.4, .9), a: R(.02, .05) });
			if ((seas === 'summer' || seas === 'spring') && calm && !s.night && !s.fog && s.wind < 25 && s.clouds < 6) for (i = 0; i < 2; i++) parts.bfly.push({ x: Math.random(), y: R(.4, .85), ph: R(0, 6.3), sp: R(.15, .3), c: i ? 'rgba(80,140,230,.9)' : 'rgba(240,150,40,.9)' });
			if (seas === 'winter' && !s.rain && !s.storm) for (i = 0; i < 18; i++) parts.sparks.push({ x: Math.random(), y: Math.random(), r: R(2, 4.5), ph: R(0, 6.3), sp: R(1, 2.4) });
			n = s.wind >= 25 ? Math.min(14, rnd(s.wind / 4)) : 0;
			for (i = 0; i < n; i++) parts.streaks.push({ x: Math.random(), y: Math.random(), l: R(30, 90), k: R(.7, 1.3) });
			if (s.freezing) for (i = 0; i < 20; i++) parts.glit.push({ x: Math.random(), y: Math.random(), r: R(2, 4.5), ph: R(0, 6.3), sp: R(1, 2.4) });
			if (s.hail) for (i = 0; i < 36; i++) parts.hail.push({ x: Math.random(), y: Math.random(), r: R(1.5, 3), vy: R(.9, 1.4), n: 0, vx: R(-.03, .03) });
			if (!s.fxw) { parts.glit = []; parts.hail = []; parts.rain = []; parts.snow = []; parts.clouds = []; parts.stars = []; parts.streaks = []; }
			if (!s.fxs) { parts.leaves = []; parts.petals = []; parts.flies = []; parts.bfly = []; parts.sparks = []; }
		}

		function drawCloud(c) {
			var x = c.x * W, y = c.y * H, r = c.s, a = pal.cloudA[0] + c.a * (pal.cloudA[1] - pal.cloudA[0]);
			if (s.theme === 'clear' && s.clouds >= 2) a = Math.min(.7, a * 2);   // partly cloudy: clearly visible clouds, in front of the sun
			ctx.fillStyle = pal.cloud + (s.night && !s.light ? a * .65 : a) + ')';
			ctx.beginPath();
			ctx.arc(x, y, r * .6, 0, 6.3); ctx.arc(x + r * .7, y - r * .25, r * .75, 0, 6.3);
			ctx.arc(x + r * 1.5, y, r * .6, 0, 6.3); ctx.arc(x + r * .7, y + r * .15, r * .6, 0, 6.3);
			ctx.fill();
		}

		function frame(dt) {
			var i, p, wx = s ? s.dirx * s.wind : 0;
			ctx.clearRect(0, 0, W, H);
			if (!s) return;
			t += dt;

			// sun (glow + slowly turning rays) or moon
			if (s.fxw && s.theme === 'clear' && s.clouds < 6) {
				var cov = Math.max(0, Math.min(1, (s.clouds - 1) / 5));   // 0 clear .. ~.8 mostly cloudy: the sun fades behind the cloud layer
				ctx.save(); ctx.globalAlpha = 1 - .6 * cov;
				var gx = W * .86, gy = H * .2, pulse = s.night ? 1 : 1 + Math.sin(t * 1.2) * .06, k = Math.min(W, H);
				var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, (s.night ? Math.max(W * .28, 80) : Math.max(W * .5, 120)) * pulse);
				g.addColorStop(0, s.night ? pal.moonGlow : pal.sun);
				g.addColorStop(1, 'rgba(255,255,255,0)');
				ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
				if (s.night) {
					// pale, static backdrop moon (the real phase is shown by the main icon)
					ctx.fillStyle = pal.outline ? pal.moon.replace(/[\d.]+\)$/, '.28)') : 'rgba(255,220,170,.34)';
					ctx.beginPath(); ctx.arc(gx, gy, 16, 0, 6.3); ctx.fill();
				} else {
					ctx.strokeStyle = pal.ray; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
					var r0 = k * .1, r1 = k * .1 + 12 + Math.sin(t * 2) * 3;
					for (i = 0; i < 12; i++) {
						var an = t * .18 + i * Math.PI / 6;
						ctx.moveTo(gx + Math.cos(an) * r0, gy + Math.sin(an) * r0);
						ctx.lineTo(gx + Math.cos(an) * r1, gy + Math.sin(an) * r1);
					}
					ctx.stroke();
				}
				ctx.restore();
			}

			// night with clouds, rain or snow: a faint moonlit haze where the moon would be
			if (s.fxw && s.night && !(s.theme === 'clear' && s.clouds < 6)) {
				var mgx = W * .86, mgy = H * .2, mg = ctx.createRadialGradient(mgx, mgy, 0, mgx, mgy, Math.max(W * .3, 90));
				mg.addColorStop(0, pal.moonGlow); mg.addColorStop(1, 'rgba(255,255,255,0)');
				ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
			}

			// sunrise / sunset glow along the horizon
			if (s.fxw && s.twi > 0) {
				var tc = s.dusk ? pal.dusk : pal.dawn, tg = ctx.createLinearGradient(0, H, 0, H * .3);
				tg.addColorStop(0, tc + (.55 * s.twi) + ')'); tg.addColorStop(1, tc + '0)');
				ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
			}

			// stars
			for (i = 0; i < parts.stars.length; i++) {
				p = parts.stars[i];
				ctx.fillStyle = pal.star + (.5 + .5 * Math.sin(t * 2 + p.ph)) + ')';
				ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, 6.3); ctx.fill();
			}
			// shooting star every now and then
			if (parts.stars.length && !REDUCED) {
				nextShoot -= dt;
				if (nextShoot <= 0 && !shoot) { shoot = { x: R(.2, .8), y: R(.05, .35), life: 0 }; nextShoot = R(9, 20); }
				if (shoot) {
					shoot.life += dt * 1.6;
					var sx0 = (shoot.x + shoot.life * .25) * W, sy0 = (shoot.y + shoot.life * .12) * H;
					var sg = ctx.createLinearGradient(sx0, sy0, sx0 - 46, sy0 - 22);
					sg.addColorStop(0, pal.shoot + (1 - shoot.life) + ')'); sg.addColorStop(1, pal.shoot + '0)');
					ctx.strokeStyle = sg; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
					ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx0 - 46, sy0 - 22); ctx.stroke();
					if (shoot.life >= 1) shoot = null;
				}
			}

			// clouds (drift with the wind)
			for (i = 0; i < parts.clouds.length; i++) {
				p = parts.clouds[i];
				p.x += (s.dirx * (.012 + s.wind * .0009) * (p.v / .014)) * dt;
				if (p.x > 1.25) p.x = -.3; else if (p.x < -.35) p.x = 1.2;
				drawCloud(p);
			}

			// fog bands
			if (s.fxw && s.fog) {
				for (i = 0; i < 3; i++) {
					var fy = H * (.25 + i * .28), fo = Math.sin(t * .25 + i * 2) * 40;
					var fg = ctx.createLinearGradient(0, fy - 40, 0, fy + 40);
					fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(.5, pal.fog); fg.addColorStop(1, 'rgba(255,255,255,0)');
					ctx.fillStyle = fg; ctx.fillRect(fo - 60, fy - 40, W + 120, 80);
				}
			}

			// rain
			if (parts.rain.length) {
				var rs = s.storm ? 1 : .5, vx = s.dirx * Math.min(s.wind, 60) * 2.2 * rs;
				ctx.strokeStyle = s.freezing ? pal.iceRain : pal.rain; ctx.lineWidth = pal.rainW; ctx.lineCap = 'round'; ctx.beginPath();
				for (i = 0; i < parts.rain.length; i++) {
					p = parts.rain[i];
					p.y += p.v * rs * dt; p.x += (vx / (W || 1)) * dt;
					if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
					if (p.x > 1.05) p.x = -.05; else if (p.x < -.05) p.x = 1.05;
					var px = p.x * W, py = p.y * H, sl = vx / (p.v * rs * H);
					ctx.moveTo(px, py); ctx.lineTo(px - sl * p.l, py - p.l);
				}
				ctx.stroke();
			}

			// snow: small six-armed crystals plus solid dots
			if (parts.snow.length) {
				var cx = [];
				ctx.fillStyle = pal.snowDot; ctx.beginPath();
				for (i = 0; i < parts.snow.length; i++) {
					p = parts.snow[i];
					p.y += p.v * dt; p.x += ((wx * 1.6) / (W || 1)) * dt; p.rot += p.spin * dt;
					if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
					if (p.x > 1.05) p.x = -.05; else if (p.x < -.05) p.x = 1.05;
					p.sx = (p.x + Math.sin(t * 1.3 + p.ph) * .015) * W; p.sy = p.y * H;
					if (p.crystal) cx.push(p); else { ctx.moveTo(p.sx + p.r, p.sy); ctx.arc(p.sx, p.sy, p.r, 0, 6.3); }
				}
				ctx.fill();
				ctx.strokeStyle = pal.snowLine; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
				for (i = 0; i < cx.length; i++) {
					p = cx[i];
					for (var k = 0; k < 3; k++) {
						var an = p.rot + k * Math.PI / 3, ox = Math.cos(an) * p.r, oy = Math.sin(an) * p.r;
						ctx.moveTo(p.sx - ox, p.sy - oy); ctx.lineTo(p.sx + ox, p.sy + oy);
					}
				}
				ctx.stroke();
			}

			// seasonal extras: autumn leaves, spring petals, summer fireflies and butterflies, winter glitter
			var drift = (wx * 1.4 + 6) / (W || 1);
			for (i = 0; i < parts.leaves.length; i++) {
				p = parts.leaves[i];
				p.y += p.v * dt; p.x += drift * dt; p.rot += p.spin * dt;
				if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
				if (p.x > 1.05) p.x = -.05; else if (p.x < -.05) p.x = 1.05;
				ctx.save(); ctx.translate((p.x + Math.sin(t * .9 + p.ph) * .03) * W, p.y * H); ctx.rotate(p.rot);
				ctx.scale(1, .55 + .45 * Math.abs(Math.sin(t * 1.4 + p.ph)));
				ctx.fillStyle = p.c; ctx.beginPath();
				ctx.moveTo(0, -p.z); ctx.quadraticCurveTo(p.z * .9, -p.z * .2, 0, p.z); ctx.quadraticCurveTo(-p.z * .9, -p.z * .2, 0, -p.z);
				ctx.fill();
				if (pal.outline) { ctx.strokeStyle = pal.outline; ctx.lineWidth = .8; ctx.stroke(); }
				ctx.restore();
			}
			for (i = 0; i < parts.petals.length; i++) {
				p = parts.petals[i];
				p.y += p.v * dt; p.x += drift * dt; p.rot += p.spin * dt;
				if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
				if (p.x > 1.05) p.x = -.05; else if (p.x < -.05) p.x = 1.05;
				ctx.save(); ctx.translate((p.x + Math.sin(t * 1.1 + p.ph) * .025) * W, p.y * H); ctx.rotate(p.rot);
				ctx.fillStyle = pal.petal; ctx.beginPath(); ctx.ellipse(0, 0, p.z, p.z * .55, 0, 0, 6.3); ctx.fill();
				if (pal.outline) { ctx.strokeStyle = pal.outline; ctx.lineWidth = .8; ctx.stroke(); }
				ctx.restore();
			}
			for (i = 0; i < parts.flies.length; i++) {
				p = parts.flies[i];
				var fx0 = (p.x + Math.sin(t * p.sp + p.ph) * p.a) * W, fy0 = (p.y + Math.cos(t * p.sp * .8 + p.ph) * p.a) * H;
				var fa = .25 + .75 * Math.max(0, Math.sin(t * 1.6 + p.ph * 3));
				var fgr = ctx.createRadialGradient(fx0, fy0, 0, fx0, fy0, 9);
				fgr.addColorStop(0, pal.fly + fa + ')'); fgr.addColorStop(1, pal.fly + '0)');
				ctx.fillStyle = fgr; ctx.beginPath(); ctx.arc(fx0, fy0, 9, 0, 6.3); ctx.fill();
				if (pal.outline) { ctx.fillStyle = 'rgba(95,125,5,' + (.45 + .5 * fa) + ')'; ctx.beginPath(); ctx.arc(fx0, fy0, 2.3, 0, 6.3); ctx.fill(); }
			}
			for (i = 0; i < parts.bfly.length; i++) {
				p = parts.bfly[i];
				p.x += p.sp * .02 * dt; if (p.x > 1.1) p.x = -.1;
				var bx = p.x * W, by = (p.y + Math.sin(t * .8 + p.ph) * .06) * H + Math.sin(t * 3 + p.ph) * 3;
				var fl = Math.abs(Math.sin(t * 9 + p.ph));
				var bs = pal.outline ? 1.3 : 1;
				ctx.fillStyle = p.c;
				ctx.beginPath(); ctx.ellipse(bx - 3 * fl * bs, by, (4 * fl + .6) * bs, 3 * bs, -.4, 0, 6.3); ctx.ellipse(bx + 3 * fl * bs, by, (4 * fl + .6) * bs, 3 * bs, .4, 0, 6.3); ctx.fill();
				if (pal.outline) { ctx.strokeStyle = 'rgba(40,30,30,.55)'; ctx.lineWidth = .8; ctx.stroke(); }
			}
			var sp2 = parts.sparks.concat(parts.glit);
			for (i = 0; i < sp2.length; i++) {
				p = sp2[i];
				var sa = Math.max(0, Math.sin(t * p.sp + p.ph));
				if (sa < .05) continue;
				var sx1 = p.x * W, sy1 = p.y * H, sr = p.r * sa * (pal.outline ? 1.4 : 1);
				ctx.strokeStyle = pal.spark + (.95 * sa) + ')'; ctx.lineWidth = pal.outline ? 1.5 : 1; ctx.lineCap = 'round'; ctx.beginPath();
				ctx.moveTo(sx1 - sr, sy1); ctx.lineTo(sx1 + sr, sy1); ctx.moveTo(sx1, sy1 - sr); ctx.lineTo(sx1, sy1 + sr); ctx.stroke();
			}

			// hail: small pellets that bounce once
			if (parts.hail.length) {
				ctx.fillStyle = pal.hail; ctx.beginPath();
				for (i = 0; i < parts.hail.length; i++) {
					p = parts.hail[i];
					p.vy += 3 * dt; p.y += p.vy * dt; p.x += (p.vx + wx * .002) * dt;
					if (p.y >= 1) { p.y = 1; p.vy = -p.vy * .35; p.n++; if (p.n > 1) { p.y = -.05; p.vy = R(.9, 1.4); p.n = 0; p.x = Math.random(); } }
					ctx.moveTo(p.x * W + p.r, p.y * H); ctx.arc(p.x * W, p.y * H, p.r, 0, 6.3);
				}
				ctx.fill();
			}

			// wind streaks
			if (parts.streaks.length) {
				var sp = (150 + s.wind * 5) * (s.dirx || 1);
				ctx.strokeStyle = pal.streak; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
				for (i = 0; i < parts.streaks.length; i++) {
					p = parts.streaks[i];
					p.x += (sp * p.k / (W || 1)) * dt;
					if (p.x > 1.3) p.x = -.3; else if (p.x < -.3) p.x = 1.3;
					var wx0 = p.x * W, wy0 = p.y * H, d = (sp < 0 ? -1 : 1) * p.l;
					ctx.moveTo(wx0, wy0);
					ctx.quadraticCurveTo(wx0 - d * .5, wy0 + Math.sin(t * 3 + p.y * 9) * 5, wx0 - d, wy0);
				}
				ctx.stroke();
			}

			// lightning
			if (s.fxw && s.storm) {
				if (!REDUCED) {
					nextFlash -= dt;
					if (nextFlash <= 0) { flash = 1; nextFlash = R(3.5, 9); if (Math.random() < .4) setTimeout(function () { flash = .8; }, 160); }
				}
				if (flash > 0) {
					ctx.fillStyle = pal.flash + (flash * .5) + ')'; ctx.fillRect(0, 0, W, H);
					flash = Math.max(0, flash - dt * 3);
				}
			}
		}

		function loop(now) {
			if (!running) return;
			var dt = Math.min((now - last) / 1000, .1); last = now;
			frame(dt);
			raf = requestAnimationFrame(loop);
		}

		function start() {
			if (running || REDUCED || !visible || document.hidden || !s) return;
			running = true; last = performance.now(); raf = requestAnimationFrame(loop);
		}
		function stop() { running = false; cancelAnimationFrame(raf); }

		if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
		if (window.IntersectionObserver) new IntersectionObserver(function (e) {
			visible = e[0].isIntersecting; visible ? start() : stop();
		}).observe(host);
		document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

		return {
			set: function (scene) { s = scene; pal = palette(!!scene.light); build(); resize(); stop(); if (REDUCED) { t = 2; frame(0); } else start(); },
			clear: function () { s = null; stop(); ctx.clearRect(0, 0, W, H); }
		};
	}

	/* Is the page surface behind the widget dark? Reads the real background colour, then Bootstrap's colour mode, then the OS setting. */
	function surfaceIsDark(el) {
		var n = el.parentElement, c, v, a;
		while (n) {
			c = getComputedStyle(n).backgroundColor || '';
			v = c.match(/[\d.]+/g);
			if (v && v.length >= 3) {
				a = v.length > 3 ? parseFloat(v[3]) : 1;
				if (c.indexOf('color(') === 0) { v = v.map(function (x) { return x * 255; }); }
				if (a > .5) return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255 < .5;
			}
			n = n.parentElement;
		}
		var mode = (document.documentElement.getAttribute('data-bs-theme') || '').toLowerCase();
		if (mode) return mode === 'dark';
		return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
	}

	/* ------------------------------------------------------------------ widget */

	function init(el) {
		var cfg, T;
		try { cfg = JSON.parse(el.getAttribute('data-fw')); T = JSON.parse(el.getAttribute('data-fw-i18n')); } catch (e) { return; }

		var q = function (c) { return el.querySelector('.fw-' + c); };
		var fx = cfg.fx ? new Fx(el, q('canvas')) : null;
		var sfx = el.className.split(/\s+/).filter(function (x) { return x && x.indexOf('fw-') !== 0; }).join(' ');
		var data = null, fetchedAt = 0;
		var every = cfg.refresh * 60000;

		function fmtT(c) { return rnd(cfg.temp === 'f' ? c * 9 / 5 + 32 : c) + '°'; }
		function fmtW(k) {
			if (cfg.wind === 'ms') return (k / 3.6).toFixed(1) + ' m/s';
			if (cfg.wind === 'mph') return rnd(k / 1.609) + ' mph';
			return rnd(k) + ' km/h';
		}

		// What kind of weather is it, for the tip? (order matters: the most "newsworthy" condition wins)
		function pickTip(info, c) {
			if (info.storm) return 'storm';
			if (info.snow) return 'snow';
			if (info.rain) return 'rain';
			if (info.fog) return 'fog';
			if (c.min <= 0) return 'frost';
			if (c.wind >= 40) return 'wind';
			if (c.temp >= 28) return 'hot';
			if (!c.day) return 'night';
			if (c.code <= 1) return c.temp >= 12 ? 'nice' : 'clear';   // clear sky: warm = nice, chilly = sunny but fresh
			return 'calm';
		}

		// Meteorological season at the widget's location (date from the API, flipped for the southern hemisphere)
		function dateParts(c) {
			var now = new Date(), m = now.getMonth() + 1, d = now.getDate();
			if (c.time && /^\d{4}-\d{2}-\d{2}/.test(c.time)) { m = +c.time.slice(5, 7); d = +c.time.slice(8, 10); }
			return { m: m, d: d };
		}
		function pickSeason(c) {
			if (cfg.pseason) return cfg.pseason;
			if (cfg.season && cfg.season !== 'auto') return cfg.season;
			var m = dateParts(c).m;
			if (cfg.lat < 0) m = ((m + 5) % 12) + 1;
			return (m === 12 || m <= 2) ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
		}
		// Two variants per combination; the day of the year picks one, so the wording rotates daily but stays stable within a day
		function tipText(info, c) {
			var p = dateParts(c), variant = ((p.m * 31 + p.d) % 2) + 1;
			return T['tip_' + pickSeason(c) + '_' + pickTip(info, c) + '_' + variant] || '';
		}

		var ICONS = { feels: '\u{1F321}️', range: '↕️', rain: '☔', wind: '\u{1F32C}️', humidity: '\u{1F4A7}', pressure: '⏲️', sun: '\u{1F305}' };
		function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }

		// One-word descriptions shown as the caption of grouped cards
		function windWord(k) { return k < 2 ? T.d_calm : k < 20 ? T.d_light : k < 40 ? T.d_moderate : k < 62 ? T.d_strong : T.d_gale; }
		function humWord(h) { return h < 35 ? T.d_dry : h <= 65 ? T.d_comfy : T.d_humid; }
		function presWord(p) { return p < 1009 ? T.d_plow : p > 1022 ? T.d_phigh : T.d_pnormal; }

		function windArrow(c) {
			var a = document.createElement('span');
			a.className = 'fw-arrow'; a.textContent = '➤';
			a.style.transform = 'rotate(' + (c.dir + 90) + 'deg)';   // arrow points where the wind blows to
			return a;
		}

		// Every detail as {key, title, label, value, caption}; shown according to the "Details style" setting
		function detailItems(c) {
			var sh = cfg.show, out = [], rng = fmtT(c.min).replace('°', '') + '–' + fmtT(c.max);
			if (sh.feels) out.push({ key: 'feels', title: T.feels, label: T.feels, value: fmtT(c.feels), caption: T.temperature + ' ' + fmtT(c.temp) });
			if (sh.range) out.push({ key: 'range', title: T.temperature, label: T.min + ' – ' + T.max, value: rng, caption: T.min + ' – ' + T.max });
			if (sh.rain) out.push({ key: 'rain', title: T.rain, label: T.rain, value: c.pop + '%', caption: T.c_rain });
			if (sh.wind) out.push({ key: 'wind', title: T.wind, label: T.wind, value: fmtW(c.wind), caption: windWord(c.wind) });
			if (sh.humidity) out.push({ key: 'humidity', title: T.humidity, label: T.humidity, value: c.hum + '%', caption: humWord(c.hum) });
			if (sh.pressure) out.push({ key: 'pressure', title: T.pressure, label: T.pressure, value: rnd(c.press) + ' hPa', caption: presWord(c.press) });
			if (sh.sun && c.sunrise) out.push({ key: 'sun', title: T.sun, label: T.sunrise + ' – ' + T.sunset, value: c.sunrise + '–' + c.sunset, caption: T.sunrise + ' – ' + T.sunset });
			return out;
		}

		function renderDetails(c) {
			var sub = q('sub'), style = cfg.dstyle || 'text', sh = cfg.show, items = [];
			sub.textContent = '';
			sub.className = 'fw-sub fw-d-' + style;

			if (style === 'text') {
				// one wrapping line: feels like, max/min, rain %, wind, ...
				if (sh.feels) items.push(T.feels + ' ' + fmtT(c.feels));
				if (sh.range) items.push(T.max + ' ' + fmtT(c.max) + ' ' + T.min + ' ' + fmtT(c.min));
				if (sh.rain) items.push(T.rain + ' ' + c.pop + '%');
				if (sh.humidity) items.push(T.humidity + ' ' + c.hum + '%');
				if (sh.pressure) items.push(T.pressure + ' ' + rnd(c.press) + ' hPa');
				if (sh.sun && c.sunrise) items.push(T.sunrise + ' ' + c.sunrise + ' ' + T.sunset + ' ' + c.sunset);
				items.forEach(function (txt, i) { sub.appendChild(document.createTextNode((i ? ' · ' : '') + txt)); });
				if (sh.wind) {
					sub.appendChild(document.createTextNode(items.length ? ' · ' : ''));
					var nw = document.createElement('span');          // keep "wind 5 km/h" and its arrow together when wrapping
					nw.className = 'fw-nw';
					nw.appendChild(document.createTextNode(T.wind + ' ' + fmtW(c.wind) + ' '));
					nw.appendChild(windArrow(c));
					sub.appendChild(nw);
				}
				return;
			}

			function span(cls, txt) { var e = document.createElement('span'); e.className = cls; e.textContent = txt; return e; }

			detailItems(c).forEach(function (it) {
				var box = document.createElement('div'), val = span('fw-v', it.value);
				box.className = 'fw-i';
				if (it.key === 'wind') { val.appendChild(document.createTextNode(' ')); val.appendChild(windArrow(c)); }

				if (style === 'cards') {                       // icon + title / big value / caption
					var head = document.createElement('div');
					head.className = 'fw-ct';
					head.appendChild(span('fw-ic', ICONS[it.key]));
					head.appendChild(span('', cap(it.title)));
					box.appendChild(head); box.appendChild(val); box.appendChild(span('fw-cap', cap(it.caption)));
				} else if (style === 'chips') {                // icon + value
					box.title = cap(it.label);
					box.appendChild(span('fw-ic', ICONS[it.key])); box.appendChild(val);
				} else if (style === 'tiles') {                // value over label
					box.appendChild(val); box.appendChild(span('fw-l', cap(it.label)));
				} else {                                       // list: label ... value
					box.appendChild(span('fw-l', cap(it.label))); box.appendChild(val);
				}
				sub.appendChild(box);
			});
		}

		// Fill-the-frame: find the padded ancestor (the module frame) and cancel its padding with negative margins
		function fitFrame() {
			if (!cfg.full || !cfg.autopad) return;
			var n = el.parentElement, i, cs, p;
			el.style.margin = '0';
			for (i = 0; n && i < 3; i++, n = n.parentElement) {
				cs = getComputedStyle(n);
				p = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat);
				if (p.some(function (v) { return v > 0; })) {
					el.style.margin = p.map(function (v) { return '-' + v + 'px'; }).join(' ');
					return;
				}
			}
		}

		// The big icon at night: an orange moon in the real phase (same maths as the sky moon), drawn as SVG
		function moonIcon(p, id, grey) {
			var NS = 'http://www.w3.org/2000/svg', r = 20, c = 24, lit = p < .5 ? 1 : -1;
			// slim phases are exaggerated a little so a new crescent is always clearly visible
			var f = (1 - Math.cos(p * 6.2832)) / 2, k = 1 - 2 * (f < .004 ? f : Math.max(f, .16));
			function n(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (parent) parent.appendChild(e); return e; }
			var svg = n('svg', { viewBox: '0 0 48 48', width: '1em', height: '1em', 'aria-hidden': 'true' });
			if (!grey) svg.style.filter = 'drop-shadow(0 0 4px rgba(255,170,70,.6))';
			var defs = n('defs', {}, svg), gid = id + '-mg', cid = id + '-mc';
			var g = n('radialGradient', { id: gid, cx: '40%', cy: '38%', r: '70%' }, defs);
			n('stop', { offset: '0', 'stop-color': grey ? '#7d869b' : '#ffe6a0' }, g); n('stop', { offset: '1', 'stop-color': grey ? '#363d50' : '#f5a23c' }, g);
			var d = 'M' + c + ' ' + (c - r) + ' A' + r + ' ' + r + ' 0 0 ' + (lit > 0 ? 1 : 0) + ' ' + c + ' ' + (c + r) +
				' A' + (r * Math.abs(k)).toFixed(2) + ' ' + r + ' 0 0 ' + (((lit > 0) === (k > 0)) ? 0 : 1) + ' ' + c + ' ' + (c - r) + ' Z';
			// the unlit side (earthshine): a dim, darker disc so the crescent stands out against it
			n('circle', { cx: c, cy: c, r: r, fill: grey ? 'rgba(140,148,166,.16)' : 'rgba(58,42,50,.85)', stroke: grey ? 'rgba(110,118,136,.45)' : 'rgba(255,190,110,.3)', 'stroke-width': '1' }, svg);
			if (f > .004) {
				n('clipPath', { id: cid }, defs).appendChild(n('path', { d: d }));
				var grp = n('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
				n('path', { d: d, fill: 'url(#' + gid + ')', stroke: 'none' }, grp);
				[[18, 18, 5], [31, 15, 3], [32, 29, 4.2], [20, 33, 3], [12, 26, 2], [25, 24, 1.8]].forEach(function (q) {
					n('circle', { cx: q[0], cy: q[1], r: q[2], fill: grey ? 'rgba(255,255,255,.16)' : 'rgba(165,92,35,.32)' }, grp);
				});
			}
			return svg;
		}

		function moonPhase(c) {
			var dt = (c.time && /^\d{4}-\d{2}-\d{2}/.test(c.time)) ? new Date(Date.UTC(+c.time.slice(0, 4), +c.time.slice(5, 7) - 1, +c.time.slice(8, 10), 12)) : new Date();
			var p = (((dt.getTime() / 86400000 + 2440587.5) - 2451550.1) / 29.530588853) % 1;
			return p < 0 ? p + 1 : p;
		}
		function hm(s) { return s && s.length >= 5 ? (+s.slice(0, 2)) * 60 + (+s.slice(3, 5)) : null; }
		// 0..1 strength of the sunrise / sunset glow (within an hour of either)
		function twilight(c) {
			var now = (c.time && c.time.length >= 16) ? hm(c.time.slice(11, 16)) : new Date().getHours() * 60 + new Date().getMinutes();
			var sr = hm(c.sunrise), ss = hm(c.sunset);
			if (now === null || sr === null || ss === null) return { v: 0, dusk: false };
			var a = Math.abs(now - sr), b = Math.abs(now - ss), d = Math.min(a, b);
			return { v: d < 60 ? 1 - d / 60 : 0, dusk: b < a };
		}

		function render() {
			if (!data) { el.classList.add('fw-hide'); if (fx) fx.clear(); return; }
			var c = data, info = describe(c.code, c.day);
			var dark = surfaceIsDark(el);
			var season = pickSeason(c);
			el.className = 'fw-widget fw-t-' + info.theme + (cfg.fxs ? ' fw-s-' + season : '') + (c.day ? '' : ' fw-night') + (cfg.bg ? '' : ' fw-nobg') + (dark ? ' fw-surf-dark' : ' fw-surf-light') + (cfg.full ? ' fw-full' : '') + (sfx ? ' ' + sfx : '');

			var moon = moonPhase(c);
			var isMoon = !c.day && info.icon === '\u{1F319}';
			var dry = !info.rain && !info.snow && !info.storm && !info.fog, tw = twilight(c);
			tw.v *= dry ? 1 : info.storm ? .35 : info.fog ? .6 : .5;   // the glow also shows through rain, snow and fog, just weaker
			if (dry && typeof c.cover === 'number') info.clouds = Math.max(0, Math.min(8, Math.round(c.cover / 12.5)));
			var ic = q('icon');
			if (isMoon && document.createElementNS) { ic.textContent = ''; ic.appendChild(moonIcon(moon, el.id, !cfg.bg)); } else ic.textContent = info.icon;
			q('temp').textContent = fmtT(c.temp) + (cfg.temp === 'f' ? 'F' : 'C');
			q('cond').textContent = info.key ? T['wmo_' + info.key] : '';

			renderDetails(c);

			q('tip').textContent = cfg.tip ? tipText(info, c) : '';
			renderOutlook(c); renderForecast(c);
			// the widget keeps the last good data when a refresh fails; say so once it is clearly old
			var stale = !cfg.preview && fetchedAt && (Date.now() - fetchedAt) > Math.max(cfg.refresh * 3, 45) * 60000;
			if (stale) el.classList.add('fw-stale');
			q('note').textContent = stale ? (T.stale || '') : '';
			fitFrame();

			if (fx) {
				var rad = c.dir * Math.PI / 180, dx = -Math.sin(rad);          // wind FROM dir -> blows to +x when dir=270 (west)
				fx.set({
					theme: info.theme, season: season, moon: moon, twi: tw.v, dusk: tw.dusk, freezing: info.freezing, hail: info.hail, fxw: !!cfg.fxw, fxs: !!cfg.fxs, night: !c.day, rain: info.rain, snow: info.snow, clouds: info.clouds,
					fog: info.fog, storm: info.storm, wind: c.wind, light: !cfg.bg && !dark,
					dirx: Math.abs(dx) < .15 ? (dx < 0 ? -1 : 1) * .15 : dx
				});
			}
		}

		// The model's weather_code can say "clear" while its own cloud_cover says otherwise (and the sky outside agrees with the cover).
		// For dry skies (codes 0-3) trust the measured cover: <10% clear, <35% mostly clear, <70% partly cloudy, else overcast.
		function skyCode(code, cover) {
			if (typeof cover !== 'number' || code > 3) return code;
			return cover < 10 ? 0 : cover < 35 ? 1 : cover < 70 ? 2 : 3;
		}

		function fromApi(d) {
			var c = d.current, y = d.daily;
			return {
				time: c.time, code: skyCode(c.weather_code, c.cloud_cover), rawCode: c.weather_code, day: c.is_day !== 0, temp: c.temperature_2m, feels: c.apparent_temperature,
				wind: c.wind_speed_10m, dir: c.wind_direction_10m || 0, hum: rnd(c.relative_humidity_2m), press: c.pressure_msl,
				max: y.temperature_2m_max[0], min: y.temperature_2m_min[0], pop: y.precipitation_probability_max[0] || 0,
				cover: typeof c.cloud_cover === 'number' ? c.cloud_cover : null,
				hourly: d.hourly && d.hourly.time ? { time: d.hourly.time, temp: d.hourly.temperature_2m || [], precip: d.hourly.precipitation || [] } : null,
				daily: (y.time || []).map(function (t, k) { return { date: t, code: y.weather_code ? y.weather_code[k] : 0, max: y.temperature_2m_max[k], min: y.temperature_2m_min[k] }; }),
				sunrise: (y.sunrise && y.sunrise[0] || '').slice(11, 16), sunset: (y.sunset && y.sunset[0] || '').slice(11, 16)
			};
		}

		// preview mode: plausible hourly and daily data so the outlook and forecast row can be seen
		function demoHourly(c) {
			var day = c.time.slice(0, 10), now = +c.time.slice(11, 13), wet = c.code >= 51 && c.code <= 99 && c.code !== 45 && c.code !== 48, h = { time: [], temp: [], precip: [] }, i;
			for (i = 0; i < 48; i++) {
				h.time.push(day + 'T' + (i % 24 < 10 ? '0' : '') + (i % 24) + ':00');
				h.temp.push(c.temp - 2 + 3 * Math.sin((i - 9) / 24 * 6.2832));
				h.precip.push(wet && i >= now && i < now + 4 ? .6 : (!wet && c.code === 3 && i >= now + 5 && i < now + 8 ? .5 : 0));
			}
			return h;
		}
		function demoDaily(c) {
			var out = [], codes = [c.code, 3, 61, 0], k, d;
			for (k = 0; k < 4; k++) { d = new Date(); d.setDate(d.getDate() + k); out.push({ date: d.toISOString().slice(0, 10), code: codes[k], max: rnd(c.temp + 3 - k), min: rnd(c.temp - 4 + k) }); }
			return out;
		}

		// "Rain from 15:00", "Frost expected: -2°" - looks at the next 14 hours
		function outlook(c) {
			var h = c.hourly, out = [];
			if (!h || !h.time || !h.time.length) return out;
			var key = (c.time || '').slice(0, 13), i0 = 0, i, j2, N, min = 99, minAt = -1;
			while (i0 < h.time.length && h.time[i0].slice(0, 13) < key) i0++;
			N = Math.min(h.time.length, i0 + 14);
			function wet(k) { return (h.precip[k] || 0) >= .2; }
			function hh(k) { return h.time[k].slice(11, 16); }
			function fill(s, v) { return (s || '').replace('{t}', v).replace('{v}', v); }
			if (wet(i0)) {
				for (j2 = i0 + 1; j2 < N && wet(j2); j2++);
				if (j2 < N) out.push({ icon: h.temp[i0] <= .5 ? '\u{1F328}️' : '\u{1F327}️', text: fill(h.temp[i0] <= .5 ? T.o_snow_until : T.o_rain_until, hh(j2)) });
			} else {
				for (j2 = i0 + 1; j2 < N && !wet(j2); j2++);
				if (j2 < N) out.push({ icon: h.temp[j2] <= .5 ? '\u{1F328}️' : '\u{1F327}️', text: fill(h.temp[j2] <= .5 ? T.o_snow_from : T.o_rain_from, hh(j2)) });
			}
			for (i = i0; i < N; i++) if (h.temp[i] < min) { min = h.temp[i]; minAt = i; }
			if (minAt >= 0 && min <= 0) out.push({ icon: '❄️', text: fill(T.o_frost, fmtT(min)) });
			return out;
		}
		function renderOutlook(c) {
			var box = q('outlook'), items = cfg.outlook ? outlook(c) : [];
			if (!box) return;
			box.textContent = '';
			items.forEach(function (it) {
				var s = document.createElement('span'), ic = document.createElement('span');
				s.className = 'fw-ol'; ic.className = 'fw-olic'; ic.textContent = it.icon; s.appendChild(ic); s.appendChild(document.createTextNode(' ' + it.text));
				box.appendChild(s);
			});
		}
		// the next three days: weekday, icon, max / min
		function renderForecast(c) {
			var box = q('fc');
			if (!box) return;
			box.textContent = '';
			if (!cfg.forecast || !c.daily) return;
			c.daily.slice(1, 4).forEach(function (d) {
				var cell = document.createElement('div'), a = document.createElement('div'), b = document.createElement('div'), t = document.createElement('div'), lab = '';
				try { lab = new Date(d.date + 'T12:00:00').toLocaleDateString(cfg.lang || document.documentElement.lang || undefined, { weekday: 'short' }); } catch (e) { lab = d.date.slice(5); }
				cell.className = 'fw-fcd'; a.className = 'fw-fcl'; b.className = 'fw-fci'; t.className = 'fw-fct';
				a.textContent = lab; b.textContent = describe(d.code, true).icon; var hi = document.createElement('span'), lo = document.createElement('span'); hi.className = 'fw-hi'; lo.className = 'fw-lo'; hi.textContent = fmtT(d.max); lo.textContent = fmtT(d.min); t.appendChild(hi); t.appendChild(lo);
				cell.appendChild(a); cell.appendChild(b); cell.appendChild(t); box.appendChild(cell);
			});
		}

		function refresh() {
			if (cfg.preview && DEMO[cfg.preview]) {
				var m = DEMO[cfg.preview];
				data = { code: m[0], day: !!m[1], temp: m[2], feels: m[2] - 2, wind: m[3], dir: m[4], hum: 70, press: 1015,
					max: m[2] + 3, min: m[2] - 4, pop: m[0] >= 51 ? 80 : 10, sunrise: '06:48', sunset: '18:02',
					time: new Date().toISOString().slice(0, 10) + 'T' + (m[5] || '12:00') };
				data.hourly = demoHourly(data); data.daily = demoDaily(data);
				render(); return;
			}
			var base = API + '?latitude=' + cfg.lat + '&longitude=' + cfg.lon +
				'&current=cloud_cover,temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,weather_code,wind_speed_10m,wind_direction_10m,is_day' +
				'&hourly=temperature_2m,precipitation' +
				'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
				'&wind_speed_unit=kmh&timezone=auto&forecast_days=4';
			var ctl = window.AbortController ? new AbortController() : null;
			var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
			function get(url) {
				return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
			}
			// a chosen model may lack some fields; if it fails or has no weather code, fall back to Open-Meteo's automatic best match
			var first = cfg.model ? get(base + '&models=' + encodeURIComponent(cfg.model)).then(function (d) {
				if (!d || !d.current || d.current.weather_code == null || d.current.temperature_2m == null) throw new Error('model');
				return d;
			}).catch(function () { return get(base); }) : get(base);
			first
				.then(function (d) { data = fromApi(d); fetchedAt = Date.now(); })
				.catch(function (err) { if (window.console) console.warn('Fun Weather unavailable:', err); /* keep last data if any */ })
				.then(function () { clearTimeout(timer); render(); });
		}

		refresh();
		// follow light/dark switches of the page without a reload
		var rerender = function () { if (data) render(); };
		if (window.MutationObserver) new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme', 'data-theme', 'data-color-scheme', 'class'] });
		if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', rerender); }
		if (!cfg.preview) {
			setInterval(refresh, every);
			document.addEventListener('visibilitychange', function () {
				if (document.visibilityState === 'visible' && Date.now() - fetchedAt > every) refresh();
			});
		}
	}

	function boot() { Array.prototype.forEach.call(document.querySelectorAll('.fw-widget[data-fw]'), init); }
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
