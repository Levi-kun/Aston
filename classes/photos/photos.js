// photo.js — NOT EVEN HUMAN REVIEWED YET BEWARE!
//
// No presets and no machine-specific paths live in this file. All card
// content comes in through the builder; the paths below are temp
// placeholders the host project replaces.
//
//   const { Photo } = require("./photo.js");
//   Photo.setFonts({                       // real font files live here
//       sansBold: "/path/to/sans-bold.ttf",
//       sans: "/path/to/sans.ttf",
//       serifItalic: "/path/to/serif-italic.ttf",
//       serifBlackItalic: "/path/to/serif-black-italic.ttf",
//   });
//   const card = new Photo();
//   card.setRarity(1)                      // 0, 1, 2: structural defaults only
//       .addPhoto("temp/art.png")          // local path or http(s) URL
//       .addName("CELESTE")
//       .addDescription("...")
//       .addShine(55)                      // 0-100, or a 0-1 float
//       .addLevel(7)
//       .addMint(87)
//       .addLikes(1204)
//       .setVariation({ version: "AWAKENED", versionColor: [240, 201, 106] });
//   const buf = await card.render();       // PNG, or animated GIF when animated
//
// setRarity(int) only picks structural defaults (border style, art fraction,
// animated output); every default is overridable via setVariation(), so the
// class carries no game content:
//
//   { version: "SS+" }                    version label text (default "")
//   { versionColor: [r,g,b] }              version label color (default white)
//   { nameColor: [r,g,b] }                 name color (default white)
//   { descriptionColor: [r,g,b] }          description color (default body color)
//   { border: "black"|"gold"|"marble" }    border style
//   { artFrac: 0.8 }                       art fraction of the card
//   { animated: true }                     render an animated GIF
//   { glossy: true }                       specular sweep + stronger wash
//   { horror: true }                       serif-black name, blood-red description,
//                                          red vignette overlay on the art
//   { overlay: "red-vignette"|"dark-vignette" }
//   { shineBoost: 1.5 }                    multiplier on shine intensity

const sharp = require("sharp");
const TextToSVG = require("text-to-svg");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const W = 750, H = 1050;
const IX0 = 30, IY0 = 30, IX1 = 720, IY1 = 1020, IW = 690, IH = 990;
const XP_PROGRESS = 0.248;
const BG = [20, 20, 24];

// Temp placeholder font paths; the host project provides real ones via Photo.setFonts().
// Fonts load lazily on first render so requiring this module never touches disk.
const FONT_PATHS = {
	sansBold: "temp/fonts/sans-bold.ttf",
	sans: "temp/fonts/sans.ttf",
	serifItalic: "temp/fonts/serif-italic.ttf",
	serifBlackItalic: "temp/fonts/serif-black-italic.ttf",
};
let _fonts = null;
function fonts() {
	if (!_fonts) {
		_fonts = {
			sansBold: TextToSVG.loadSync(FONT_PATHS.sansBold),
			sans: TextToSVG.loadSync(FONT_PATHS.sans),
			serifItalic: TextToSVG.loadSync(FONT_PATHS.serifItalic),
			serifBlackItalic: TextToSVG.loadSync(FONT_PATHS.serifBlackItalic),
		};
	}
	return _fonts;
}

// Structural defaults per rarity int. No game content lives here; every
// value is overridable through setVariation({ border, artFrac, animated }).
const RARITY_STRUCTURE = {
	0: { border: "black", artFrac: 0.60, animated: false },
	1: { border: "gold", artFrac: 0.80, animated: false },
	2: { border: "marble", artFrac: 1.00, animated: true },
};

// ---------- utils ----------
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const css = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function hsv(h, s, v) {
	const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
	const m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
	return [Math.round(m[0] * 255), Math.round(m[1] * 255), Math.round(m[2] * 255)];
}
function rgbToHsv(r, g, b) {
	const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
	let h = 0;
	if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; if (h < 0) h += 1; }
	return [h, mx ? d / mx : 0, mx];
}
function vcenter(ttsvg, size, cy) { const m = ttsvg.getMetrics("Ag", { fontSize: size }); return cy + (m.ascender + m.descender) / 2; }
function tracked(ttsvg, text, { size, cx, cy, tracking = 0, fill = "#fff", opacity = 1 }) {
	const base = vcenter(ttsvg, size, cy);
	const chars = [...text];
	const widths = chars.map(ch => ttsvg.getWidth(ch, { fontSize: size }));
	const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
	let x = cx - total / 2, out = "";
	chars.forEach((ch, i) => {
		out += `<path d="${ttsvg.getD(ch, { fontSize: size, x, y: base })}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ""}/>`;
		x += widths[i] + tracking;
	});
	return out;
}
function squeeze(ttsvg, text, { size, baselineY, x, align = "left", bulge = 0.38, tracking = 1 }) {
	const chars = [...text], n = chars.length;
	const sizes = chars.map((_, i) => { const t = n > 1 ? Math.abs(2 * i / (n - 1) - 1) : 0; return Math.round(size * (1 + bulge * Math.pow(t, 1.4))); });
	const widths = chars.map((ch, i) => ttsvg.getWidth(ch, { fontSize: sizes[i] }));
	const total = widths.reduce((a, b) => a + b, 0) + tracking * (n - 1);
	let cx = align === "left" ? x : x - total, out = "";
	chars.forEach((ch, i) => {
		const sw = Math.max(1, Math.round(sizes[i] * 0.10));
		out += `<path d="${ttsvg.getD(ch, { fontSize: sizes[i], x: cx, y: baselineY })}" fill="white" stroke="black" stroke-width="${sw}" paint-order="stroke"/>`;
		cx += widths[i] + tracking;
	});
	return out;
}
function wrapBalanced(ttsvg, text, size, maxW) {
	const w = s => ttsvg.getWidth(s, { fontSize: size });
	const words = text.split(" "), lines = []; let cur = "";
	for (const wd of words) { const t = (cur + " " + wd).trim(); if (w(t) <= maxW) cur = t; else { lines.push(cur); cur = wd; } }
	if (cur) lines.push(cur);
	const lw = i => w(lines[i]);
	while (lines.length > 1) {
		const widths = lines.map((_, i) => lw(i));
		if (widths[widths.length - 1] >= 0.45 * Math.max(...widths)) break;
		const prev = lines[lines.length - 2].split(" ");
		if (prev.length < 2) break;
		const moved = prev.pop();
		lines[lines.length - 2] = prev.join(" ");
		lines[lines.length - 1] = moved + " " + lines[lines.length - 1];
		if (w(lines[lines.length - 1]) > maxW) { lines[lines.length - 2] += " " + moved; lines[lines.length - 1] = lines[lines.length - 1].slice(moved.length + 1); break; }
	}
	return lines;
}
function goldBand() {
	const buf = Buffer.alloc(W * H * 3); let p = 0;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		const t = (x + y) / (W + H), band = 0.5 + 0.5 * Math.sin(t * 22);
		buf[p++] = Math.round(120 + 110 * band); buf[p++] = Math.round(88 + 90 * band); buf[p++] = Math.round(30 + 40 * band);
	}
	return buf;
}
function marbleBand(seedKey) {
	const rnd = mulberry32(hashStr("marble" + seedKey));
	const pastels = [[255, 190, 210], [190, 220, 255], [255, 240, 190], [220, 190, 255], [190, 255, 230]];
	const blobs = [];
	for (let i = 0; i < 26; i++) blobs.push({ x: rnd() * W, y: rnd() * H, rx: 60 + rnd() * 140, ry: 30 + rnd() * 90, c: pastels[(rnd() * 5) | 0] });
	const buf = Buffer.alloc(W * H * 3); let p = 0;
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		let r = 238, g = 232, b = 222;
		for (const bl of blobs) {
			const dx = (x - bl.x) / bl.rx, dy = (y - bl.y) / bl.ry, d2 = dx * dx + dy * dy;
			if (d2 < 1) { const a = 0.27 * (1 - d2) * (1 - d2); r += (bl.c[0] - r) * a; g += (bl.c[1] - g) * a; b += (bl.c[2] - b) * a; }
		}
		buf[p++] = r | 0; buf[p++] = g | 0; buf[p++] = b | 0;
	}
	return buf;
}
function rainbow256() {
	const S = 256, buf = Buffer.alloc(S * S * 3); let p = 0;
	for (let gy = 0; gy < S; gy++) for (let gx = 0; gx < S; gx++) {
		const [r, g, b] = hsv(((gx / S * 1.15) + (gy / S * 0.65)) % 1, 0.6, 1);
		buf[p++] = r; buf[p++] = g; buf[p++] = b;
	}
	return buf;
}
const svgOpen = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
const rasterize = svg => sharp(Buffer.from(svg)).png().toBuffer();
async function fetchArt(src) {
	if (/^https?:\/\//i.test(src)) { const r = await fetch(src); if (!r.ok) throw new Error(`art fetch failed: ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
	return src;
}
const fmtInt = n => Number(n).toLocaleString("en-US");

// =====================================================================
class Photo {
	constructor() {
		this.rarity = 0;
		this.name = "";
		this.level = 1;
		this.masterNo = "";
		this.mint = "0";
		this.art = "temp/art.png";
		this._artSet = false;
		this.desc = "";
		this.sr = 0.5;
		this.likes = 0;
		this.variation = {};
		this._cache = {};
	}

	setRarity(i) {
		if (!RARITY_STRUCTURE[i]) throw new Error(`unknown rarity ${i} (0, 1, 2)`);
		this.rarity = i; this._cache = {};
		return this;
	}
	addPhoto(url) { this.art = url; this._artSet = true; this._cache = {}; return this; }
	addDescription(s) { this.desc = s; this._cache = {}; return this; }
	addShine(v) { this.sr = v > 1 ? v / 100 : v; return this; }
	addName(s) { this.name = s; this._cache = {}; return this; }
	addLevel(i) { this.level = i; this._cache = {}; return this; }
	addMint(i) { this.mint = String(i); this._cache = {}; return this; }
	addLikes(n) { this.likes = n; this._cache = {}; return this; }
	setVariation(mod) { this.variation = { ...this.variation, ...(mod || {}) }; this._cache = {}; return this; }

	static setFonts(paths) { Object.assign(FONT_PATHS, paths); _fonts = null; }
	get structure() { return RARITY_STRUCTURE[this.rarity]; }
	get border() { return this.variation.border || this.structure.border; }
	get artFrac() { return this.variation.artFrac != null ? this.variation.artFrac : this.structure.artFrac; }
	get animated() { return this.variation.animated != null ? this.variation.animated : this.structure.animated; }
	get versionLabel() { return this.variation.version || ""; }
	get description() { return this.desc; }
	get nameColor() { return this.variation.nameColor || [255, 255, 255]; }
	get versionColor() { return this.variation.versionColor || [255, 255, 255]; }

	/** Roll an S.R. value: 0-1 with 8 decimal digits, each tenth 10% less likely than the previous. */
	static rollShine() {
		const weights = Array.from({ length: 10 }, (_, k) => Math.pow(0.9, k));
		const total = weights.reduce((a, b) => a + b, 0);
		let r = Math.random() * total, k = 0;
		while (r >= weights[k]) { r -= weights[k]; k++; }
		const v = Math.min(1, k * 0.1 + Math.random() * 0.1);
		return Math.round(v * 1e8) / 1e8;
	}

	/** Render the card. PNG for common/rare, animated GIF (32 frames, ~4s loop) for special. */
	async render() {
		if (this.animated) return this._renderGif();
		return this._renderFrame(null);
	}

	// ---------------- internals ----------------
	async _artBuffer() {
		if (!this._artSet) throw new Error("Photo: addPhoto() must be called before render()");
		if (!this._artBuf) this._artBuf = await fetchArt(this.art);
		return this._artBuf;
	}

	async _buildBorder() {
		const border = this.border;
		const outer = await rasterize(`${svgOpen}<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="30" fill="white"/></svg>`);
		const inner = await rasterize(`${svgOpen}<rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="22" fill="black"/></svg>`);
		const ring = await sharp(outer).composite([{ input: inner, blend: "dest-out" }]).png().toBuffer();
		let band;
		if (border === "black") {
			band = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 5, g: 5, b: 7 } } }).png().toBuffer();
		} else {
			const raw = border === "gold" ? goldBand() : marbleBand("rarity-" + this.rarity);
			band = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
		}
		return sharp(band).composite([{ input: ring, blend: "dest-in" }]).png().toBuffer();
	}

	srTransparency(sr) { sr = Math.max(0, Math.min(1, sr)); return 0.99 - (0.99 - 0.666666) * sr; }

	async _shineLayers(sr, artH, sheetTop, clipGray, rainbowRGB, t) {
		const v = this.variation;
		if (sr <= 0) return [];
		const boost = v.shineBoost || 1;
		const x0 = IX0, y0 = IY0, x1 = IX1, y1 = IY0 + artH;
		const rnd = mulberry32(hashStr(`glitter-rarity-${this.rarity}-${sr.toFixed(8)}`));
		const layers = [];
		{ // lowkey wash
			const washA = v.glossy ? 0.12 : 0.055;
			const out = Buffer.alloc(W * H * 4); let p = 0, q = 0;
			for (let i = 0; i < W * H; i++) {
				out[p++] = rainbowRGB[q++]; out[p++] = rainbowRGB[q++]; out[p++] = rainbowRGB[q++];
				out[p++] = Math.round(clipGray[i] * washA);
			}
			layers.push(sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
		}
		{ // occupation regions
			let polys = "";
			for (let i = 0; i < 4; i++) {
				const slot = (i + 0.2 + rnd() * 0.6) / 4;
				let xc = x0 + slot * (x1 - x0);
				const width = (100 + rnd() * 80) * (0.5 + 0.9 * sr);
				const slant = (rnd() * 2 - 1) * 160, ph = rnd() * 6.28;
				if (t != null) xc += 55 * Math.sin(2 * Math.PI * (t + i * 0.25) + ph);
				const hw = width / 2;
				polys += `<polygon points="${xc - hw},${y0 - 80} ${xc + hw},${y0 - 80} ${xc + slant + hw},${y1 + 80} ${xc + slant - hw},${y1 + 80}" fill="white"/>`;
			}
			const { data: mraw } = await sharp(Buffer.from(`${svgOpen}${polys}</svg>`)).blur(22).flatten({ background: "#000000" }).raw().toBuffer({ resolveWithObject: true });
			let opacity = Math.min(1, (1 - this.srTransparency(sr)) * boost);
			if (t != null) opacity *= 0.8 + 0.2 * Math.sin(2 * Math.PI * t);
			const out = Buffer.alloc(W * H * 4); let p = 0, q = 0;
			for (let i = 0; i < W * H; i++) {
				const mv = Math.min(mraw[i * 3], clipGray[i]);
				out[p++] = rainbowRGB[q++]; out[p++] = rainbowRGB[q++]; out[p++] = rainbowRGB[q++];
				out[p++] = Math.round(mv * opacity);
			}
			layers.push(sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
		}
		if (v.glossy) { // specular sweep: soft diagonal highlight like light on glossy print
			const band = `<polygon points="${W * 0.15},-80 ${W * 0.38},-80 ${W * 0.05},${H + 80} ${-W * 0.18},${H + 80}" fill="white"/>`;
			const { data: mraw } = await sharp(Buffer.from(`${svgOpen}${band}</svg>`)).blur(30).flatten({ background: "#000000" }).raw().toBuffer({ resolveWithObject: true });
			const out = Buffer.alloc(W * H * 4); let p = 0;
			for (let i = 0; i < W * H; i++) {
				const mv = Math.min(mraw[i * 3], clipGray[i]);
				out[p++] = 255; out[p++] = 255; out[p++] = 255;
				out[p++] = Math.round(mv * 0.16);
			}
			layers.push(sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
		}
		return Promise.all(layers);
	}

	async _artOverlay(artH, sheetTop, clipGray) {
		const ov = this.variation.overlay || (this.variation.horror ? "red-vignette" : null);
		if (!ov) return null;
		const isRed = ov === "red-vignette";
		const maxA = isRed ? 0.62 : 0.55;
		const svg = `${svgOpen}<defs><radialGradient id="vg" cx="50%" cy="42%" r="75%"><stop offset="55%" stop-color="white" stop-opacity="0"/><stop offset="100%" stop-color="white" stop-opacity="1"/></radialGradient></defs><rect x="${IX0}" y="${IY0}" width="${IW}" height="${artH}" fill="url(#vg)"/></svg>`;
		const { data: vraw } = await sharp(Buffer.from(svg)).flatten({ background: "#000000" }).raw().toBuffer({ resolveWithObject: true });
		const out = Buffer.alloc(W * H * 4); let p = 0;
		for (let i = 0; i < W * H; i++) {
			const strength = vraw[i * 3] / 255;
			out[p++] = isRed ? 61 : 0; out[p++] = 0; out[p++] = 0;
			out[p++] = Math.round(strength * maxA * 255 * (clipGray[i] / 255));
		}
		return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
	}

	async _static() {
		const C = this._cache;
		if (C.done) return C;
		const v = this.variation;
		const sr = this.sr;
		const artH = Math.round(IH * this.artFrac);
		const sheetTop = this.artFrac < 1 ? IY0 + artH - 40 : IY1 - 240;

		C.artH = artH; C.sheetTop = sheetTop;
		C.base = await sharp({ create: { width: W, height: H, channels: 3, background: { r: BG[0], g: BG[1], b: BG[2] } } }).png().toBuffer();
		C.border = await this._buildBorder();
		C.inner = await rasterize(`${svgOpen}<rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="22" fill="${css(BG)}"/></svg>`);
		C.scrim = await rasterize(`${svgOpen}<defs><radialGradient id="sc" cx="50%" cy="0%" r="72%" fx="50%" fy="0%"><stop offset="0%" stop-color="black" stop-opacity="0.70"/><stop offset="100%" stop-color="black" stop-opacity="0"/></radialGradient></defs><ellipse cx="${W / 2}" cy="${IY0}" rx="340" ry="175" fill="url(#sc)"/></svg>`);

		// name (horror swaps the font)
		const nameFont = v.horror ? fonts().serifBlackItalic : fonts().sansBold;
		const nameFill = css(this.nameColor);
		const shadowFill = v.horror ? "rgba(120,10,10,0.8)" : "black";
		C.name = await rasterize(`${svgOpen}` +
			tracked(nameFont, this.name, { size: 58, cx: W / 2 + 2, cy: IY0 + 69, tracking: 7, fill: shadowFill, opacity: v.horror ? 0.8 : 0.67 }) +
			tracked(nameFont, this.name, { size: 58, cx: W / 2, cy: IY0 + 66, tracking: 7, fill: nameFill }) + `</svg>`);

		// text box: rounded top corners (r14), rounded bottom (r20) nesting the border; >=5px side padding inside
		C.sheet = await rasterize(`${svgOpen}<path d="M ${IX0},${sheetTop + 14} Q ${IX0},${sheetTop} ${IX0 + 14},${sheetTop} H ${IX1 - 14} Q ${IX1},${sheetTop} ${IX1},${sheetTop + 14} V ${IY1 - 20} Q ${IX1},${IY1} ${IX1 - 20},${IY1} H ${IX0 + 20} Q ${IX0},${IY1} ${IX0},${IY1 - 20} Z" fill="#100d0b"/><line x1="${IX0 + 14}" y1="${sheetTop}" x2="${IX1 - 14}" y2="${sheetTop}" stroke="rgba(255,255,255,0.16)" stroke-width="1"/></svg>`);

		// body color from art average
		const artBuf = await this._artBuffer();
		const st = await sharp(artBuf).stats();
		const [hh, ss, vv] = rgbToHsv(st.channels[0].mean / 255, st.channels[1].mean / 255, st.channels[2].mean / 255);
		const [br, bg2, bb] = hsv(hh, Math.min(1, ss * 1.1), Math.min(1, vv + 0.25));
		C.body = css([br, bg2, bb]);
		C.bodyBright = css([br, bg2, bb].map(x => Math.round(x + (255 - x) * 0.55)));

		const vy = sheetTop + 25, srY = IY1 - 19;
		const descFill = v.descriptionColor ? css(v.descriptionColor) : (v.horror ? css([178, 52, 52]) : C.body);
		let s2 = tracked(fonts().sansBold, this.versionLabel, { size: 20, cx: W / 2, cy: vy, tracking: 4, fill: css(this.versionColor) });
		// likes counter, top-right of the text box
		if (this.likes > 0) {
			const likeTxt = `♥ ${fmtInt(this.likes)}`;
			const lw = fonts().sans.getWidth(likeTxt, { fontSize: 15 });
			s2 += tracked(fonts().sans, likeTxt, { size: 15, cx: IX1 - 16 - lw / 2, cy: vy, fill: C.bodyBright, opacity: 0.9 });
		}
		const lines = this.description ? wrapBalanced(fonts().serifItalic, this.description, 21, IW - 10) : []; // 5px side padding
		const lh = 33, descCy = ((vy + 26) + (srY - 22)) / 2;
		lines.forEach((ln, i) => { s2 += tracked(fonts().serifItalic, ln, { size: 21, cx: W / 2, cy: descCy - (lines.length - 1) * lh / 2 + i * lh, fill: descFill }); });
		C.text = await rasterize(`${svgOpen}${s2}</svg>`);

		const srTxt = `S.R. ${sr.toFixed(8)}`, xpTxt = `${(XP_PROGRESS * 100).toFixed(1)}%`;
		const leftW = fonts().sans.getWidth(srTxt, { fontSize: 16 }) + 2 * ([...srTxt].length - 1);
		const rightW = fonts().sansBold.getWidth(this.mint, { fontSize: 18 }) + 2 * (this.mint.length - 1);
		const brow = `<g opacity="0.9">` +
			tracked(fonts().sans, srTxt, { size: 16, cx: IX0 + 16 + leftW / 2, cy: srY, tracking: 2, fill: C.bodyBright }) +
			tracked(fonts().sans, xpTxt, { size: 16, cx: W / 2, cy: srY, tracking: 2, fill: C.bodyBright }) +
			tracked(fonts().sansBold, this.mint, { size: 18, cx: IX1 - 16 - rightW / 2, cy: srY, tracking: 2, fill: C.bodyBright }) + `</g>`;
		C.bottom = await rasterize(`${svgOpen}${brow}</svg>`);

		C.labels = await rasterize(`${svgOpen}` +
			squeeze(fonts().sansBold, `LVL ${this.level}`, { size: 24, baselineY: IY0 + 40, x: IX0 + 16, align: "left" }) +
			squeeze(fonts().sansBold, this.masterNo, { size: 24, baselineY: IY0 + 40, x: IX1 - 16, align: "right" }) + `</svg>`);

		C.rainbow = await sharp(rainbow256(), { raw: { width: 256, height: 256, channels: 3 } }).resize(W, H).raw().toBuffer();
		const meta = await sharp(artBuf).metadata();
		C.meta = meta;

		// shine clip: visible art only
		const { data: clip3 } = await sharp(await rasterize(
			`${svgOpen}<rect x="${IX0}" y="${IY0}" width="${IW}" height="${artH}" rx="20" fill="white"/><rect x="0" y="${sheetTop}" width="${W}" height="${H - sheetTop}" fill="black"/></svg>`
		)).flatten({ background: "#000000" }).raw().toBuffer({ resolveWithObject: true });
		C.clip = Buffer.alloc(W * H);
		for (let i = 0; i < W * H; i++) C.clip[i] = clip3[i * 3];
		C.done = true;
		return C;
	}

	async _renderFrame(t) {
		const C = await this._static();
		const sr = this.sr, artH = C.artH, sheetTop = C.sheetTop, meta = C.meta;
		const artBuf = await this._artBuffer();

		let s = Math.max(IW / meta.width, artH / meta.height), panX = 0;
		if (t != null) { s *= 1.04 * (1 + 0.035 * Math.sin(2 * Math.PI * t)); panX = Math.round(14 * Math.sin(2 * Math.PI * t + 1.0)); }
		const rw = Math.round(meta.width * s) + 1, rh = Math.round(meta.height * s) + 1;
		const ox = Math.max(0, Math.min(rw - IW, Math.round((rw - IW) / 2) + panX));
		const crop = await sharp(artBuf).resize(rw, rh, { fit: "fill" }).extract({ left: ox, top: 0, width: IW, height: artH }).png().toBuffer();
		const roundMask = await rasterize(`<svg width="${IW}" height="${artH}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${IW}" height="${artH}" rx="20" fill="white"/></svg>`);
		const art = await sharp(crop).composite([{ input: roundMask, blend: "dest-in" }]).png().toBuffer();

		const shine = await this._shineLayers(sr, artH, sheetTop, C.clip, C.rainbow, t);
		const overlay = await this._artOverlay(artH, sheetTop, C.clip);

		const composites = [
			{ input: C.border }, { input: C.inner },
			{ input: art, left: IX0, top: IY0 },
			...(overlay ? [{ input: overlay }] : []),
			{ input: C.scrim }, { input: C.name },
			{ input: C.sheet }, { input: C.text },
			{ input: C.bottom, blend: "lighten" },
			...shine.map(b => ({ input: b })),
			{ input: C.labels },
		];
		return sharp(C.base).composite(composites).png().toBuffer();
	}

	async _renderGif() {
		const FRAMES = 32, raws = [];
		for (let f = 0; f < FRAMES; f++) raws.push(await sharp(await this._renderFrame(f / FRAMES)).ensureAlpha().raw().toBuffer());
		const pal = quantize(raws[0], 256);
		const enc = GIFEncoder();
		for (const r of raws) enc.writeFrame(applyPalette(r, pal, "rgb444"), W, H, { palette: pal, delay: 125 });
		enc.finish();
		return Buffer.from(enc.bytes());
	}
}

module.exports = { Photo };
