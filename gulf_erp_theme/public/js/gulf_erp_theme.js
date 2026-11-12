/* Gulf ERP Theme. See THIRD_PARTY_NOTICES.md. SPDX-License-Identifier: AGPL-3.0-only */
(function () {
"use strict";
// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	var INITIAL_PATH = window.location.pathname;

	var DEFAULTS = {
		enabled: 1,
		arabic_font: 1,
		gulf_fonts: 1,
		apps_home: 1,
		language_switch: 1,
		default_layout: "Top bar",
		brand_color: "#1463FF",
		default_bar_style: "Coloured",
		force_mode: "Let each user choose",
		form_cards: 1,
		list_rows: 1,
		status_filters: 1,
		multilang_search: 1,
		form_guide: 1,
		clear_status: 1,
		compact: 0,
	};

	// Setting name -> class on <html>.
	var FEATURES = {
		form_cards: "gulf-cards",
		clear_status: "gulf-status",
		list_rows: "gulf-lists",
		compact: "gulf-compact",
		arabic_font: "gulf-font",
		gulf_fonts: "gulf-type",
		form_guide: "gulf-guide",
		status_filters: "gulf-qf",
		workspace_access: "gulf-wsa",
		workspace_builder: "gulf-wsb",
		simple_forms: "gulf-simple",
		recent_favourites: "gulf-recent",
		most_used: "gulf-mostused",
		summary_card: "gulf-summary",
		hijri_dates: "gulf-hijri",
		empty_states: "gulf-empty",
	};

	var LAYOUTS = { "Top bar": "top", "Side menu": "side", "Standard Frappe menu": "standard" };
	var BARS = { Coloured: "color", White: "white" };
	var MODES = { "Always light": "light", "Always dark": "dark" };

	var PRESETS = [
		["Blue", "#1463FF"],
		["Indigo", "#4F46E5"],
		["Violet", "#7C3AED"],
		["Rose", "#E11D48"],
		["Orange", "#C2410C"],
		["Slate", "#475569"],
	];

	var S = {
		local: null, // appearance changes not yet confirmed by the server
		nav: null,
		index: {},
		cur: null, // current module name
		home: false,
		started: false,
		save_timer: null,
		open_menu: null,
	};

	/* ---------------------------------------------------------------- utils */

	function boot() {
		return (window.frappe && frappe.boot) || {};
	}
	function T(s, ctx) {
		return typeof window.__ === "function" ? (ctx ? window.__(s, null, ctx) : window.__(s)) : s;
	}
	// The summary card's words carry their own context, so this app never
	// changes how Frappe translates the same words elsewhere.
	var SUM_CTX = "Gulf summary card";
	var HOME_CTX = "Gulf apps screen";
	function esc(s) {
		return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
		});
	}
	function major() {
		var v = boot().versions && boot().versions.frappe;
		var n = parseInt(String(v || "").split(".")[0], 10);
		return isNaN(n) ? 0 : n;
	}
	function base() {
		return major() >= 16 ? "/desk" : "/app";
	}
	function slug(s) {
		if (window.frappe && frappe.router && frappe.router.slug) return frappe.router.slug(s);
		return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
	}
	function store_get(k) {
		try {
			return window.localStorage.getItem(k);
		} catch (e) {
			return null;
		}
	}
	function store_set(k, v) {
		try {
			window.localStorage.setItem(k, v);
		} catch (e) {
			/* private mode */
		}
	}
	function session_get(k) {
		try {
			return window.sessionStorage.getItem(k);
		} catch (e) {
			return null;
		}
	}
	function session_set(k, v) {
		try {
			window.sessionStorage.setItem(k, v);
		} catch (e) {
			/* private mode */
		}
	}
	function el(html) {
		var d = document.createElement("div");
		d.innerHTML = html;
		return d.firstElementChild;
	}
	function closest(node, sel) {
		while (node && node.nodeType === 1) {
			if (matches(node, sel)) return node;
			node = node.parentNode;
		}
		return null;
	}
	function matches(node, sel) {
		var fn = node.matches || node.msMatchesSelector || node.webkitMatchesSelector;
		return fn ? fn.call(node, sel) : false;
	}

	/* --------------------------------------------------------------- colour */

	function parse_hex(hex) {
		var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
		if (!m) return null;
		var n = parseInt(m[1], 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}
	function to_hex(rgb) {
		return (
			"#" +
			rgb
				.map(function (c) {
					var s = Math.max(0, Math.min(255, Math.round(c))).toString(16);
					return s.length === 1 ? "0" + s : s;
				})
				.join("")
		);
	}
	function shade(rgb, amount) {
		return rgb.map(function (c) {
			return amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
		});
	}
	function luminance(rgb) {
		var a = rgb.map(function (v) {
			v /= 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
	}
	function white_contrast(hex) {
		var rgb = parse_hex(hex);
		if (!rgb) return 21;
		return 1.05 / (luminance(rgb) + 0.05);
	}

	/* ---------------------------------------------------------------- icons */
	// Lucide style outline paths, drawn at 24x24.
	var ICO = {
		grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
		home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
		bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
		cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
		pkg: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
		calc: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8"/><path d="M16 14v4"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
		users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
		user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
		kanban: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/>',
		contact: '<path d="M16 2v2"/><path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M8 2v2"/><circle cx="12" cy="11" r="3"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
		monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
		factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
		gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
		badge: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
		buoy: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
		globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
		store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',
		book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
		wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
		shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
		plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
		flow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
		database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
		mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
		printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
		map: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
		search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
		bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
		cdown: '<path d="m6 9 6 6 6-6"/>',
		cright: '<path d="m9 18 6-6-6-6"/>',
		plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
		x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		check: '<path d="M20 6 9 17l-5-5"/>',
		menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
		palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
		sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
		moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
		ptop: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>',
		pleft: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
		lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
		receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
		truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
		quote: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
		order: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
		chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
		file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
		card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
		tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
		layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
		list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
		ledger: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
		star: '<path d="M11.52 2.3a.53.53 0 0 1 .96 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.02a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.9l5.16-.76a2.12 2.12 0 0 0 1.6-1.16z"/>',
		inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
		megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
	};

	function svg(name, size, sw, cls) {
		size = size || 16;
		return (
			'<svg class="ge-ic' +
			(cls ? " " + cls : "") +
			'" width="' +
			size +
			'" height="' +
			size +
			'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
			(sw || 1.75) +
			'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			(ICO[name] || ICO.file) +
			"</svg>"
		);
	}

	/* ------------------------------------------------------ module identity */
	// Module colours are fixed and never follow the brand colour. No green.
	var MOD_RULES = [
		[/^home$/, "home", "#0369A1"],
		[/gulf/, "palette", "#1463FF"],
		[/point of sale|^pos\b|retail/, "store", "#BE185D"],
		[/sell|sales/, "bag", "#1463FF"],
		[/buy|purchas|procure/, "cart", "#E5600F"],
		[/stock|inventor|warehouse/, "pkg", "#B7791F"],
		[/account|invoic|payment|payable|receivable|financ|banking|tax|budget/, "calc", "#4F46E5"],
		[/^hr$|^hrms$|human|payroll|recruit|leave|attendance|employee|expense|shift|performance|talent/, "users", "#DB2777"],
		[/project|timesheet/, "kanban", "#7C3AED"],
		[/crm|lead|opportunit|contact/, "contact", "#0891B2"],
		[/asset/, "monitor", "#8B5E34"],
		[/manufactur|production|subcontract/, "factory", "#DC2626"],
		[/quality/, "badge", "#C026D3"],
		[/support|helpdesk|issue/, "buoy", "#0E7490"],
		[/website|portal|web\b/, "globe", "#2563EB"],
		[/knowledge|wiki/, "book", "#6D28D9"],
		[/^users?$|permission|role/, "shield", "#475569"],
		[/integrat/, "plug", "#57534E"],
		[/automat|workflow/, "flow", "#57534E"],
		[/^data|import/, "database", "#57534E"],
		[/email|notification/, "mail", "#57534E"],
		[/print/, "printer", "#57534E"],
		[/^geo|location|territor/, "map", "#57534E"],
		[/setting|setup|system/, "gear", "#475569"],
		[/tool|build|custom|develop/, "wrench", "#57534E"],
	];
	var HASH_COLORS = [
		"#1463FF", "#E5600F", "#B7791F", "#4F46E5", "#DB2777", "#7C3AED", "#0891B2", "#8B5E34",
		"#DC2626", "#475569", "#C026D3", "#0E7490", "#2563EB", "#BE185D", "#6D28D9", "#57534E",
	];

	function hash(s) {
		var h = 0;
		s = String(s || "");
		for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
		return Math.abs(h);
	}

	function identity(mod) {
		var names = [mod.name, mod.label, mod.module].filter(Boolean);
		var overrides = settings().module_colors || {};
		var icons = settings().module_icons || {};
		var color = null;
		var icon = null;
		var i;
		for (i = 0; i < names.length; i++) {
			if (overrides[names[i]]) color = overrides[names[i]];
			if (icons[names[i]] && ICO[icons[names[i]]]) icon = icons[names[i]];
		}
		for (i = 0; i < names.length && !icon; i++) {
			var n = String(names[i]).toLowerCase();
			for (var r = 0; r < MOD_RULES.length; r++) {
				if (MOD_RULES[r][0].test(n)) {
					icon = MOD_RULES[r][1];
					if (!color) color = MOD_RULES[r][2];
					break;
				}
			}
		}
		return {
			icon: icon || "layers",
			color: color || HASH_COLORS[hash(mod.name) % HASH_COLORS.length],
		};
	}

	var LINK_RULES = [
		[/invoice|receipt/, "receipt"],
		[/order/, "order"],
		[/quotation|quote/, "quote"],
		[/delivery|shipment|transit/, "truck"],
		[/customer|supplier|employee|contact|lead|user|partner|person|applicant/, "user"],
		[/payment|bank|cheque|card/, "card"],
		[/journal|ledger|account|balance/, "ledger"],
		[/price|pricing|coupon|discount|promotion/, "tag"],
		[/item|product|stock|warehouse|batch|serial|bin|bom|material/, "pkg"],
		[/project|task|timesheet/, "kanban"],
		[/asset/, "monitor"],
		[/work order|job card|production|workstation|operation|routing/, "factory"],
		[/setting|config/, "gear"],
		[/template|group|category|type/, "layers"],
		[/log|history|list/, "list"],
		[/email|newsletter/, "mail"],
		[/print/, "printer"],
	];

	function link_icon(it) {
		var t = String(it.type || "").toLowerCase();
		if (t === "report" || t === "dashboard") return "chart";
		if (t === "workspace") return "grid";
		var n = String(it.label || it.name || "").toLowerCase();
		for (var i = 0; i < LINK_RULES.length; i++) {
			if (LINK_RULES[i][0].test(n)) return LINK_RULES[i][1];
		}
		return t === "page" ? "file" : "file";
	}

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ------------------------------------------------- settings, appearance */

	function settings() {
		var s = {};
		var key;
		for (key in DEFAULTS) s[key] = DEFAULTS[key];
		var b = boot().gulf_erp_theme || {};
		for (key in b) {
			if (b[key] !== undefined && b[key] !== null) s[key] = b[key];
		}
		return s;
	}

	function appearance() {
		var s = settings();
		var a = s.appearance || {
			layout: LAYOUTS[s.default_layout] || "top",
			color: s.brand_color || "#1463FF",
			bar: BARS[s.default_bar_style] || "color",
			mode: MODES[s.force_mode] || "",
			allow: { layout: 1, color: 1, bar: 1, mode: 1 },
		};
		var out = { layout: a.layout, color: a.color, bar: a.bar, mode: a.mode, allow: a.allow || {} };
		if (S.local) {
			for (var k in S.local) out[k] = S.local[k];
		}
		if (!parse_hex(out.color)) out.color = "#1463FF";
		return out;
	}

	function nav_enabled() {
		var s = settings();
		if (!Number(s.enabled)) return false;
		if (!(window.frappe && frappe.session && frappe.session.user && frappe.session.user !== "Guest"))
			return false;
		if (!document.body || !boot().versions) return false;
		return appearance().layout !== "standard";
	}

	/* ---------------------------------------------------------------- apply */

	function set_brand(root, hex) {
		var rgb = parse_hex(hex) || parse_hex("#1463FF");
		root.style.setProperty("--ge-brand", to_hex(rgb));
		root.style.setProperty("--gulf-brand", to_hex(rgb));
		root.style.setProperty("--gulf-brand-rgb", rgb.join(", "));
		root.style.setProperty("--gulf-brand-hover", to_hex(shade(rgb, -0.14)));
		root.style.setProperty("--gulf-brand-light", to_hex(shade(rgb, 0.35)));
	}

	function clear_brand(root) {
		["--ge-brand", "--gulf-brand", "--gulf-brand-rgb", "--gulf-brand-hover", "--gulf-brand-light"].forEach(
			function (p) {
				root.style.removeProperty(p);
			}
		);
	}

	function toggle(cls, on) {
		document.documentElement.classList.toggle(cls, !!on);
	}

	function apply(override) {
		if (override && window.frappe && frappe.boot) {
			// Old callers passed a plain settings dict.
			frappe.boot.gulf_erp_theme = override;
		}
		var root = document.documentElement;
		var s = settings();
		var on = !!Number(s.enabled);
		var a = appearance();
		var m = major();

		["gulf-v13", "gulf-v14", "gulf-v15", "gulf-v16", "gulf-v17"].forEach(function (c) {
			root.classList.remove(c);
		});
		if (m) root.classList.add("gulf-v" + m);
		toggle("gulf", on);
		for (var key in FEATURES) toggle(FEATURES[key], on && !!Number(s[key]));

		var nav = on && nav_enabled();
		toggle("ge-nav", nav);
		toggle("ge-layout-top", nav && a.layout === "top");
		toggle("ge-layout-side", nav && a.layout === "side");
		toggle("ge-bar-white", on && a.bar === "white");
		toggle("ge-bar-color", on && a.bar !== "white");
		toggle("ge-shell16", m >= 16);

		if (on) set_brand(root, a.color);
		else clear_brand(root);

		if (on && a.mode) set_mode(a.mode, true);

		if (nav) start_nav();
		else stop_nav();
		if (document.body) mount_lang();
		if (!(on && Number(s.status_filters))) {
			Array.prototype.slice.call(document.querySelectorAll(".ge-qf")).forEach(function (n) {
				n.parentNode.removeChild(n);
			});
		}
	}

	function set_mode(mode, local_only) {
		var root = document.documentElement;
		root.setAttribute("data-theme", mode);
		if (root.hasAttribute("data-theme-mode")) root.setAttribute("data-theme-mode", mode);
		if (local_only || !window.frappe) return;
		frappe
			.xcall("frappe.core.doctype.user.user.switch_theme", {
				theme: mode === "dark" ? "Dark" : "Light",
			})
			.catch(function () {});
		if (frappe.boot) frappe.boot.desk_theme = mode === "dark" ? "Dark" : "Light";
	}

	function current_mode() {
		return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
	}

	/* ------------------------------------------------------------ nav model */

	function v16_item(it) {
		if (!it || it.type !== "Link" || (!it.link_to && !it.url)) return null;
		return {
			label: it.label || it.link_to,
			type: it.link_type,
			name: it.link_to,
			url: it.url,
			route_options: it.route_options,
		};
	}

	function nav_from_v16() {
		var ms = boot().module_sidebars || {};
		return Object.keys(ms)
			.map(function (k) {
				var m = ms[k] || {};
				var groups = [];
				var main = { label: "Main", items: [] };
				var section = null;
				var seen = {};
				var add = function (g, it) {
					var c = v16_item(it);
					if (!c) return;
					var k = item_key(c) || c.url;
					if (seen[k]) return;
					seen[k] = 1;
					g.items.push(c);
				};
				(m.items || []).forEach(function (it) {
					if (it.type === "Section Break") {
						section = { label: it.label || "", items: [] };
						groups.push(section);
						(it.nested_items || []).forEach(function (n) {
							add(section, n);
						});
					} else if (section && (Number(it.child) || Number(it.indent))) {
						// A section's links can also arrive flat, right after it.
						add(section, it);
					} else {
						section = null;
						add(main, it);
					}
				});
				groups = groups.filter(function (g) {
					return g.items.length;
				});
				if (main.items.length) groups.unshift(main);
				return { name: k, label: m.label || k, module: m.module || k, app: m.app || "", groups: groups };
			})
			.filter(function (m) {
				return m.groups.length;
			});
	}

	function build_index() {
		S.index = {};
		(S.nav || []).forEach(function (m) {
			m.groups.forEach(function (g) {
				g.items.forEach(function (it) {
					var k = item_key(it);
					if (!k) return;
					if (!S.index[k]) S.index[k] = [];
					if (S.index[k].indexOf(m.name) === -1) S.index[k].push(m.name);
				});
			});
		});
	}

	function item_key(it) {
		if (!it || !it.name) return null;
		return String(it.type || "").toLowerCase() + ":" + it.name;
	}

	function load_nav(cb) {
		if (S.nav) return cb(S.nav);
		if (major() >= 16 && boot().module_sidebars) {
			S.nav = nav_from_v16();
			build_index();
			return cb(S.nav);
		}
		var key = "gulf_nav:" + (frappe.session && frappe.session.user) + ":" + (settings().nav_key || "");
		var cached = store_get(key);
		var parsed = null;
		if (cached && settings().nav_key) {
			try {
				parsed = JSON.parse(cached);
			} catch (e) {
				parsed = null;
			}
		}
		if (parsed) {
			S.nav = parsed;
			build_index();
			return cb(S.nav);
		}
		// One request at a time: every caller waits for the same answer.
		if (S.nav_waiting) {
			S.nav_waiting.push(cb);
			return;
		}
		S.nav_waiting = [cb];
		var done = function (mods, ok) {
			var waiting = S.nav_waiting || [];
			S.nav_waiting = null;
			S.nav = mods;
			build_index();
			if (ok) {
				// Drop menus cached under an older key before saving the new one.
				try {
					Object.keys(window.localStorage).forEach(function (k) {
						if (k.indexOf("gulf_nav:") === 0 && k !== key) window.localStorage.removeItem(k);
					});
				} catch (e) {
					/* private mode */
				}
				store_set(key, JSON.stringify(mods));
			}
			waiting.forEach(function (fn) {
				try {
					fn(mods);
				} catch (e) {
					if (window.console) console.error("Gulf ERP Theme:", e);
				}
			});
			if (!ok) S.nav = null; // try again on the next page
		};
		frappe
			.xcall("gulf_erp_theme.api.get_nav")
			.then(function (r) {
				done((r && r.modules) || [], true);
			})
			.catch(function () {
				done([], false);
			});
	}

	function find_module(name) {
		var list = S.nav || [];
		for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
		return null;
	}

	function module_route(m) {
		if (major() < 16) return base() + "/" + slug(m.name);
		var first = m.groups[0] && m.groups[0].items[0];
		return first ? item_route(first) : base();
	}

	function item_route(it) {
		if (it.url) {
            try {
                var url = new URL(it.url, window.location.origin);
                if (url.protocol === "http:" || url.protocol === "https:") return url.origin === window.location.origin ? url.pathname + url.search + url.hash : url.href;
            } catch (e) { /* Reject malformed navigation URLs. */ }
            return base();
        }
		var type = String(it.type || "").toLowerCase();
		// Public workspaces open at their own slug on every version.
		if (type === "workspace") return base() + "/" + slug(it.name);
		try {
			if (frappe.utils && frappe.utils.generate_route) {
				var r = frappe.utils.generate_route({
					type: type,
					name: it.name,
					link: null,
					is_query_report: it.is_query_report,
					doctype: it.doctype || (type === "doctype" ? it.name : undefined),
					route_options: it.route_options,
				});
				if (r) return r.charAt(0) === "/" ? r : base() + "/" + r;
			}
		} catch (e) {
			/* use the fallback below */
		}
		if (type === "doctype") return base() + "/" + slug(it.name);
		if (type === "report") {
			if (it.is_query_report || !it.doctype) return base() + "/query-report/" + encodeURIComponent(it.name);
			return base() + "/" + slug(it.doctype) + "/view/report?report_name=" + encodeURIComponent(it.name);
		}
		if (type === "dashboard") return base() + "/dashboard-view/" + encodeURIComponent(it.name);
		if (type === "workspace") return base() + "/" + slug(it.name);
		return base() + "/" + encodeURIComponent(it.name);
	}

	function route_keys() {
		var r = (frappe.get_route && frappe.get_route()) || [];
		var r0 = String(r[0] || "").toLowerCase();
		var keys = [];
		if ((r0 === "list" || r0 === "form" || r0 === "tree" || r0 === "image" || r0 === "report") && r[1])
			keys.push("doctype:" + r[1]);
		if (r0 === "query-report" && r[1]) keys.push("report:" + r[1]);
		if ((r0 === "workspaces" || r0 === "workspace") && r[1]) keys.push("workspace:" + r[1]);
		if (r0 === "dashboard-view" && r[1]) keys.push("dashboard:" + r[1]);
		if (r[0] && r.length === 1) keys.push("page:" + r[0]);
		return keys;
	}

	function pick_module() {
		var r = (frappe.get_route && frappe.get_route()) || [];
		if (r[0] === "gulf-apps") {
			S.home = true;
			return;
		}
		S.home = false;
		var r0 = String(r[0] || "").toLowerCase();
		if (major() < 16 && (r0 === "workspaces" || r0 === "workspace") && r[1] && find_module(r[1])) {
			S.cur = r[1];
			session_set("gulf_cur_module", S.cur);
			return;
		}
		if (major() >= 16) {
			// /desk/<module>/... names the module shell directly.
			var seg = (window.location.pathname.split("/")[2] || "").toLowerCase();
			var list = S.nav || [];
			for (var i = 0; i < list.length; i++) {
				if (slug(list[i].name) === seg || slug(list[i].label) === seg) {
					S.cur = list[i].name;
					session_set("gulf_cur_module", S.cur);
					return;
				}
			}
		}
		var keys = route_keys();
		var prev = S.cur || session_get("gulf_cur_module");
		for (var k = 0; k < keys.length; k++) {
			var cands = S.index[keys[k]];
			if (!cands || !cands.length) continue;
			S.cur = cands.indexOf(prev) !== -1 ? prev : cands[0];
			session_set("gulf_cur_module", S.cur);
			return;
		}
		S.cur = prev && find_module(prev) ? prev : null;
	}

	function current_group_index(m) {
		if (!m) return -1;
		var keys = route_keys();
		for (var g = 0; g < m.groups.length; g++) {
			var items = m.groups[g].items;
			for (var i = 0; i < items.length; i++) {
				if (keys.indexOf(item_key(items[i])) !== -1) return g;
			}
		}
		return -1;
	}

	function is_current_item(it) {
		return route_keys().indexOf(item_key(it)) !== -1;
	}

	/* ---------------------------------------------------------- navigation */

	function go(href, e) {
		if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) return;
		if (!href || /^https?:/.test(href)) return;
		if (e) e.preventDefault();
		close_menus();
		close_drawer();
		frappe.set_route(href);
	}

	function new_doc(dt, e) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		close_menus();
		frappe.new_doc(dt);
	}

	function open_search() {
		var $ = window.jQuery;
		if (major() >= 16) {
			var ab = frappe.app && frappe.app.awesome_bar;
			// open() also wires up the result list. Showing the modal alone
			// gives a search box that never lists anything.
			if (ab && typeof ab.open === "function") {
				ab.open();
				return;
			}
			if (ab && ab.search_modal) {
				ab.search_modal.modal("show");
				if (typeof ab.setup_event_listeners === "function") ab.setup_event_listeners(ab.search_modal);
				return;
			}
			var b = document.querySelector(".navbar-modal-search-mobile .standard-sidebar-item, .navbar-modal-search-mobile");
			if (b) b.click();
			return;
		}
		if ($) $("#navbar-search").focus();
	}

	/* ------------------------------------------------------------- top bar */

	function mod_chip(m) {
		var id = identity(m);
		return (
			'<a class="ge-mod" href="' +
			esc(module_route(m)) +
			'" title="' +
			esc(T(m.label)) +
			'" style="--mc:' +
			id.color +
			'"><span class="ge-mt">' +
			svg(id.icon, 14, 2) +
			'</span><span class="ge-ell">' +
			esc(T(m.label)) +
			"</span></a>"
		);
	}

	function menus_html(m) {
		if (!m) return "";
		var cur = current_group_index(m);
		var h = "";
		m.groups.forEach(function (g, i) {
			h +=
				'<button type="button" class="ge-menu' +
				(i === cur ? " cur" : "") +
				'" data-i="' +
				i +
				'" aria-haspopup="true" aria-expanded="false">' +
				esc(T(g.label || m.label)) +
				svg("cdown", 14) +
				"</button>";
		});
		h +=
			'<button type="button" class="ge-menu ge-more" data-i="more" aria-haspopup="true" aria-expanded="false" hidden>' +
			esc(T("More")) +
			svg("cdown", 14) +
			"</button>";
		return h;
	}

	function bar_inner_html() {
		var m = S.home ? null : find_module(S.cur);
		var s = settings();
		var h = "";
		if (Number(s.apps_home))
			h +=
				'<button type="button" class="ge-tb-ic ge-apps" title="' +
				esc(T("Apps")) +
				'" aria-label="' +
				esc(T("Apps")) +
				'">' +
				svg("grid", 18) +
				"</button>";
		h +=
			'<button type="button" class="ge-tb-ic ge-burger" aria-label="' +
			esc(T("Menu")) +
			'">' +
			svg("menu", 18) +
			"</button>";
		if (m && appearance().layout === "top") h += mod_chip(m);
		h += '<nav class="ge-menus" aria-label="' + esc(T("Module menu")) + '">';
		if (m && appearance().layout === "top") h += menus_html(m);
		h += "</nav>";
		return h;
	}

	// v13 to v15: draw into the stock navbar so search, notifications and the
	// user menu keep working exactly as before.
	function mount_navbar_slot() {
		var brand = document.querySelector(".navbar .navbar-brand");
		if (!brand) return null;
		var slot = document.getElementById("ge-slot");
		if (!slot) {
			slot = el('<div id="ge-slot" class="ge-slot"></div>');
			brand.parentNode.insertBefore(slot, brand.nextSibling);
			brand.classList.add("ge-brand-native");
			var apps = el('<span id="ge-pre" class="ge-pre"></span>');
			brand.parentNode.insertBefore(apps, brand);
		}
		return slot;
	}

	// v16 has no top navbar, so Gulf draws its own and hands search,
	// notifications and the user menu back to the desk's own components.
	function mount_bar16() {
		var bar = document.getElementById("ge-bar");
		if (!bar) {
			bar = el(
				'<header id="ge-bar" class="ge-bar16"><div id="ge-pre" class="ge-pre"></div>' +
					'<a class="ge-brand16" href="' +
					base() +
					'"></a><div id="ge-slot" class="ge-slot"></div><span class="ge-f1"></span>' +
					'<button type="button" class="ge-search16"></button>' +
					'<button type="button" class="ge-tb-ic ge-palette"></button>' +
					'<button type="button" class="ge-tb-ic ge-bell"></button>' +
					'<span class="ge-user16"><button type="button" class="ge-avatar16"></button></span></header>'
			);
			document.body.insertBefore(bar, document.body.firstChild);
			var logo = boot().app_logo_url;
			var company = (boot().sysdefaults && boot().sysdefaults.company) || "";
			bar.querySelector(".ge-brand16").innerHTML =
				(logo ? '<img src="' + esc(logo) + '" alt="">' : "") + "<b>" + esc(company) + "</b>";
			bar.querySelector(".ge-search16").innerHTML =
				svg("search", 15) +
				'<span class="ge-ell">' +
				esc(T("Search or type a command")) +
				"</span><kbd>Ctrl K</kbd>";
			bar.querySelector(".ge-palette").innerHTML = svg("palette", 18);
			bar.querySelector(".ge-palette").setAttribute("aria-label", T("Appearance"));
			bar.querySelector(".ge-palette").title = T("Appearance");
			bar.querySelector(".ge-bell").innerHTML = svg("bell", 18) + '<i class="ge-dot" hidden></i>';
			bar.querySelector(".ge-bell").setAttribute("aria-label", T("Notifications"));
			var av = bar.querySelector(".ge-avatar16");
			av.setAttribute("aria-label", T("User Menu"));
			try {
				av.innerHTML = frappe.avatar(frappe.session.user, "avatar-small");
			} catch (e) {
				av.textContent = (frappe.session.user || "?").charAt(0).toUpperCase();
			}
			bar.querySelector(".ge-search16").addEventListener("click", open_search);
			bar.querySelector(".ge-palette").addEventListener("click", function (e) {
				e.stopPropagation();
				open_appearance(e.currentTarget);
			});
			bar.querySelector(".ge-bell").addEventListener("click", function () {
				if (frappe.ui.sidebar_panels) frappe.ui.sidebar_panels.toggle("notifications");
				else frappe.set_route("List", "Notification Log");
			});
			try {
				if (frappe.app && frappe.app.sidebar && frappe.app.sidebar.create_user_menu) {
					frappe.app.sidebar.create_user_menu({
						parent: jQuery(bar.querySelector(".ge-user16")),
						button: jQuery(av),
						side: "bottom",
						align: "end",
					});
				}
			} catch (e) {
				/* the avatar still shows */
			}
			watch_unread16(bar);
		}
		return bar.querySelector("#ge-slot");
	}

	function watch_unread16(bar) {
		var src = document.querySelector(".sidebar-notification .notification-count");
		var dot = bar.querySelector(".ge-dot");
		if (!src || !dot || !window.MutationObserver) return;
		var sync = function () {
			dot.hidden = src.classList.contains("hidden") || !String(src.textContent || "").trim();
		};
		if (S.unread_observer) S.unread_observer.disconnect();
		S.unread_observer = new MutationObserver(sync);
		S.unread_observer.observe(src, { attributes: true, childList: true, characterData: true, subtree: true });
		sync();
	}

	function render_bar() {
		var slot = major() >= 16 ? mount_bar16() : mount_navbar_slot();
		if (!slot) return;
		var pre = document.getElementById("ge-pre");
		var html = bar_inner_html();
		// The apps and menu buttons go before the logo, the rest after it.
		var tmp = document.createElement("div");
		tmp.innerHTML = html;
		pre.innerHTML = "";
		slot.innerHTML = "";
		Array.prototype.slice.call(tmp.children).forEach(function (n) {
			if (n.classList.contains("ge-tb-ic")) pre.appendChild(n);
			else slot.appendChild(n);
		});
		toggle("ge-in-module", !S.home && !!find_module(S.cur) && appearance().layout === "top");
		var apps = pre.querySelector(".ge-apps");
		if (apps)
			apps.addEventListener("click", function () {
				close_menus();
				frappe.set_route("gulf-apps");
			});
		var burger = pre.querySelector(".ge-burger");
		if (burger) burger.addEventListener("click", toggle_drawer);
		var chip = slot.querySelector(".ge-mod");
		if (chip)
			chip.addEventListener("click", function (e) {
				go(chip.getAttribute("href"), e);
			});
		Array.prototype.slice.call(slot.querySelectorAll(".ge-menu")).forEach(function (b) {
			b.addEventListener("click", function (e) {
				e.stopPropagation();
				toggle_menu(b);
			});
			b.addEventListener("keydown", function (e) {
				if (e.key === "ArrowDown") {
					e.preventDefault();
					if (S.open_menu !== b) toggle_menu(b);
					var first = document.querySelector(".ge-dd .ge-dd-i");
					if (first) first.focus();
				}
			});
		});
		mount_lang();
		fit_menus();
		update_offsets();
	}

	function fit_menus() {
		var nav = document.querySelector("#ge-slot .ge-menus");
		if (!nav) return;
		var btns = Array.prototype.slice.call(nav.querySelectorAll(".ge-menu:not(.ge-more)"));
		var more = nav.querySelector(".ge-more");
		btns.forEach(function (b) {
			b.hidden = false;
		});
		if (more) more.hidden = true;
		S.overflow = [];
		if (!btns.length || window.innerWidth < 768) return;
		var avail = nav.clientWidth;
		if (nav.scrollWidth <= avail + 1) return;
		if (more) more.hidden = false;
		var room = avail - (more ? more.offsetWidth + 4 : 0);
		var used = 0;
		btns.forEach(function (b) {
			used += b.offsetWidth + 2;
			if (used > room) {
				b.hidden = true;
				S.overflow.push(Number(b.getAttribute("data-i")));
			}
		});
		if (more && S.overflow.length) {
			var m = find_module(S.cur);
			var cur = current_group_index(m);
			more.classList.toggle("cur", S.overflow.indexOf(cur) !== -1);
		}
	}

	/* ----------------------------------------------------------- dropdowns */

	function dd_items_html(items, with_head, head) {
		var h = with_head && head ? '<div class="ge-dd-h">' + esc(T(head)) + "</div>" : "";
		items.forEach(function (it) {
			var href = item_route(it);
			var dt = String(it.type || "").toLowerCase() === "doctype" ? it.name : "";
			var can_new = dt && frappe.model && frappe.model.can_create && frappe.model.can_create(dt);
			h +=
				'<a class="ge-dd-i' +
				(is_current_item(it) ? " sel" : "") +
				'" href="' +
				esc(href) +
				'"><span class="ge-ii">' +
				svg(link_icon(it), 16) +
				'</span><span class="ge-f1 ge-ell">' +
				esc(T(it.label)) +
				"</span>" +
				(can_new
					? '<span class="ge-dd-add" role="button" tabindex="-1" data-new="' +
					  esc(dt) +
					  '" title="' +
					  esc(T("New") + " " + T(dt)) +
					  '">' +
					  svg("plus", 13) +
					  "</span>"
					: "") +
				"</a>";
		});
		return h;
	}

	function toggle_menu(btn) {
		if (S.open_menu === btn) return close_menus();
		close_menus();
		var m = find_module(S.cur);
		if (!m) return;
		var key = btn.getAttribute("data-i");
		var html = "";
		if (key === "more") {
			(S.overflow || []).forEach(function (gi) {
				var g = m.groups[gi];
				html += dd_items_html(g.items, true, g.label || m.label);
			});
		} else {
			var g = m.groups[Number(key)];
			if (!g) return;
			html = dd_items_html(g.items, true, g.label || m.label);
		}
		var dd = el('<div class="ge-dd" id="ge-dd" role="menu">' + html + "</div>");
		document.body.appendChild(dd);
		btn.classList.add("open");
		btn.setAttribute("aria-expanded", "true");
		S.open_menu = btn;
		// Open under the button, at its reading start, and keep it on screen.
		var b = btn.getBoundingClientRect();
		var w = dd.offsetWidth;
		dd.style.top = Math.round(b.bottom + 7) + "px";
		var left = frappe_rtl() ? b.right - w : b.left;
		left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
		dd.style.left = Math.round(left) + "px";
		bind_dd(dd);
	}

	function bind_dd(dd) {
		dd.addEventListener("click", function (e) {
			e.stopPropagation();
			var add = closest(e.target, "[data-new]");
			if (add) return new_doc(add.getAttribute("data-new"), e);
			var a = closest(e.target, "a.ge-dd-i");
			if (a) go(a.getAttribute("href"), e);
		});
		dd.addEventListener("keydown", function (e) {
			var items = Array.prototype.slice.call(dd.querySelectorAll(".ge-dd-i"));
			var i = items.indexOf(document.activeElement);
			if (e.key === "ArrowDown") {
				e.preventDefault();
				(items[i + 1] || items[0]).focus();
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				(items[i - 1] || items[items.length - 1]).focus();
			}
		});
	}

	function close_menus() {
		var open = S.open_menu;
		S.open_menu = null;
		var dd = document.getElementById("ge-dd");
		if (dd) dd.parentNode.removeChild(dd);
		if (!open) return;
		open.classList.remove("open");
		open.setAttribute("aria-expanded", "false");
	}

	/* ----------------------------------------------------------- side menu */

	function side_state() {
		try {
			return JSON.parse(store_get("gulf_side") || "{}") || {};
		} catch (e) {
			return {};
		}
	}

	function render_side() {
		var side = document.getElementById("ge-side");
		if (!side) {
			side = el('<aside id="ge-side" class="ge-side" aria-label="' + esc(T("Modules")) + '"></aside>');
			document.body.appendChild(side);
			side.addEventListener("click", on_side_click);
		}
		var st = side_state();
		var list = S.nav || [];
		var cur = S.home ? null : S.cur;
		var h = '<div class="ge-sb-l">' + esc(T("Modules")) + '</div><div class="ge-sb-list">';
		list.forEach(function (m) {
			var id = identity(m);
			var on = m.name === cur;
			h +=
				'<a class="ge-sb-i' +
				(on ? " on" : "") +
				'" href="' +
				esc(module_route(m)) +
				'" data-mod="' +
				esc(m.name) +
				'" title="' +
				esc(T(m.label)) +
				'" style="--mc:' +
				id.color +
				'"><span class="ge-mt">' +
				svg(id.icon, 14, 2) +
				'</span><span class="ge-f1 ge-ell">' +
				esc(T(m.label)) +
				"</span>" +
				(on ? svg("cdown", 14) : "") +
				"</a>";
			if (on) {
				var cg = current_group_index(m);
				h += '<div class="ge-sb-sub">';
				m.groups.forEach(function (g, gi) {
					var gkey = m.name + "|" + gi;
					var open = st[gkey] !== undefined ? !!st[gkey] : gi === cg || (cg === -1 && gi === 0);
					h +=
						'<button type="button" class="ge-sb-g' +
						(open ? " open" : "") +
						'" data-g="' +
						esc(gkey) +
						'"><span class="ge-f1 ge-ell">' +
						esc(T(g.label || m.label)) +
						"</span>" +
						svg(open ? "cdown" : "cright", 13, 1.75, "ge-flipx") +
						"</button>";
					if (open) {
						g.items.forEach(function (it) {
							h +=
								'<a class="ge-sb-s' +
								(is_current_item(it) ? " on" : "") +
								'" href="' +
								esc(item_route(it)) +
								'">' +
								svg(link_icon(it), 14) +
								'<span class="ge-ell">' +
								esc(T(it.label)) +
								"</span></a>";
						});
					}
				});
				h += "</div>";
			}
		});
		h +=
			'</div><button type="button" class="ge-sb-i ge-sb-foot"><span class="ge-mt ghost">' +
			svg("pleft", 14) +
			'</span><span class="ge-f1 ge-ell">' +
			esc(T(st.collapsed ? "Expand" : "Collapse")) +
			"</span></button>";
		side.innerHTML = h;
		toggle("ge-side-collapsed", !!st.collapsed);
		var on_el = side.querySelector(".ge-sb-s.on") || side.querySelector(".ge-sb-i.on");
		if (on_el && on_el.scrollIntoView && !S.side_scrolled) {
			S.side_scrolled = true;
			var list_el = side.querySelector(".ge-sb-list");
			if (list_el && on_el.offsetTop > list_el.clientHeight) list_el.scrollTop = on_el.offsetTop - 80;
		}
	}

	function on_side_click(e) {
		var g = closest(e.target, ".ge-sb-g");
		if (g) {
			var st = side_state();
			var key = g.getAttribute("data-g");
			st[key] = !g.classList.contains("open");
			store_set("gulf_side", JSON.stringify(st));
			render_side();
			return;
		}
		var foot = closest(e.target, ".ge-sb-foot");
		if (foot) {
			var s2 = side_state();
			s2.collapsed = !s2.collapsed;
			store_set("gulf_side", JSON.stringify(s2));
			render_side();
			update_offsets();
			return;
		}
		var mod = closest(e.target, "[data-mod]");
		if (mod) {
			S.cur = mod.getAttribute("data-mod");
			session_set("gulf_cur_module", S.cur);
		}
		var a = closest(e.target, "a[href]");
		if (a) go(a.getAttribute("href"), e);
	}

	// The slide animation runs only while the drawer is opened or closed by
	// the user, never when the page draws it.
	function drawer_anim() {
		toggle("ge-drawer-anim", true);
		clearTimeout(S.drawer_timer);
		S.drawer_timer = setTimeout(function () {
			toggle("ge-drawer-anim", false);
		}, 260);
	}

	function toggle_drawer() {
		var on = !document.documentElement.classList.contains("ge-drawer-open");
		if (on && !document.getElementById("ge-side")) render_side();
		drawer_anim();
		toggle("ge-drawer-open", on);
	}

	function close_drawer() {
		if (!document.documentElement.classList.contains("ge-drawer-open")) return;
		drawer_anim();
		toggle("ge-drawer-open", false);
	}

	/* -------------------------------------------------------------- layout */

	function update_offsets() {
		var root = document.documentElement;
		var top = 48;
		if (major() < 16) {
			var nb = document.querySelector("header .navbar, .navbar");
			if (nb) top = nb.offsetHeight || 48;
		}
		root.style.setProperty("--ge-top", top + "px");
	}

	function heal_home() {
		var r = (frappe.get_route && frappe.get_route()) || [];
		if (r[0] !== "gulf-apps") return;
		var page = document.querySelector('[data-page-route="gulf-apps"]');
		if (page && !page.querySelector(".ge-home")) render_home(page);
	}

	function render_nav() {
		heal_home();
		if (!nav_enabled()) return;
		pick_module();
		render_bar();
		var a = appearance();
		// The side menu is the layout on desktop and the drawer on phones.
		if (a.layout === "side" || window.innerWidth < 768 || document.getElementById("ge-side")) render_side();
		update_offsets();
	}

	function start_nav() {
		if (!window.frappe || !frappe.boot || !document.body) return;
		load_nav(function () {
			render_nav();
		});
		if (S.started) return;
		S.started = true;
		var rerender = function () {
			if (!nav_enabled()) return setTimeout(heal_home, 0);
			close_menus();
			close_drawer();
			setTimeout(render_nav, 0);
		};
		if (frappe.router && frappe.router.on) frappe.router.on("change", rerender);
		if (window.jQuery) jQuery(document).on("page-change", rerender);
		document.addEventListener("click", function (e) {
			if (!closest(e.target, ".ge-menu") && !closest(e.target, "#ge-dd")) close_menus();
			if (!closest(e.target, ".ge-ap") && !closest(e.target, ".ge-ap-open")) close_appearance();
			if (
				document.documentElement.classList.contains("ge-drawer-open") &&
				!closest(e.target, "#ge-side") &&
				!closest(e.target, ".ge-burger")
			)
				close_drawer();
		});
		document.addEventListener("keydown", function (e) {
			if (e.key !== "Escape") return;
			var open = S.open_menu;
			close_menus();
			close_appearance();
			close_drawer();
			if (open) open.focus();
		});
		var t = null;
		window.addEventListener("resize", function () {
			clearTimeout(t);
			t = setTimeout(function () {
				if (nav_enabled()) {
					fit_menus();
					update_offsets();
				}
			}, 120);
		});
	}

	function stop_nav() {
		if (S.unread_observer) { S.unread_observer.disconnect(); S.unread_observer = null; }
		close_menus();
		close_appearance();
		["ge-slot", "ge-pre", "ge-bar", "ge-side"].forEach(function (id) {
			var n = document.getElementById(id);
			if (n) n.parentNode.removeChild(n);
		});
		var brand = document.querySelector(".navbar .navbar-brand");
		if (brand) brand.classList.remove("ge-brand-native");
		toggle("ge-in-module", false);
		toggle("ge-drawer-open", false);
		document.documentElement.style.removeProperty("--ge-top");
	}

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ----------------------------------------------------------- apps home */

	function greeting() {
		var h = new Date().getHours();
		var first =
			(boot().user && (boot().user.first_name || boot().user.full_name)) ||
			(frappe.session && frappe.session.user_fullname) ||
			"";
		first = String(first).split(" ")[0];
		var g = h < 12 ? T("Good morning") : h < 17 ? T("Good afternoon") : T("Good evening");
		return first ? g + (frappe_rtl() ? "، " : ", ") + first : g;
	}

	// Today's date for the kicker above the greeting, in the user's language,
	// on the Gregorian calendar and with Western digits.
	function today_label() {
		var lang = String(boot().lang || "en").toLowerCase();
		var loc = lang.indexOf("ar") === 0 ? "ar-u-nu-latn-ca-gregory" : lang === "en" ? "en-GB" : lang + "-u-nu-latn-ca-gregory";
		var opts = { weekday: "long", day: "numeric", month: "long" };
		try {
			return new Date().toLocaleDateString(loc, opts);
		} catch (e) {
			try {
				return new Date().toLocaleDateString("en-GB", opts);
			} catch (e2) {
				return "";
			}
		}
	}

	function frappe_rtl() {
		return document.documentElement.getAttribute("dir") === "rtl" || document.body.classList.contains("rtl");
	}

	function app_title(app) {
		var titles = {};
		(boot().app_data || []).forEach(function (a) {
			titles[a.app_name] = a.app_title;
		});
		if (titles[app]) return titles[app];
		if (app === "erpnext") return "ERPNext";
		if (app === "hrms") return "HR";
		return app ? String(app).replace(/_/g, " ").replace(/\b\w/g, function (c) {
			return c.toUpperCase();
		}) : "";
	}

	function render_home(wrapper) {
		var root = wrapper && (wrapper.jquery ? wrapper[0] : wrapper);
		if (!root) return;
		var body = root.querySelector(".layout-main-section") || root.querySelector(".page-content") || root;
		var draw = function () {
			var list = S.nav || [];
			var groups = {};
			var order = [];
			var built = settings().built_workspaces || [];
			var can_build = wsb_allowed();
			list.forEach(function (m) {
				var app = m.app || "";
				var key = app === "frappe" ? "frappe" : app === "gulf_erp_theme" ? "gulf_erp_theme" : app || "other";
				// Workspaces made with the builder sit together under their own heading.
				if (built.indexOf(m.name) !== -1) key = "ge_built";
				if (key === "gulf_erp_theme") return;
				if (!groups[key]) {
					groups[key] = [];
					order.push(key);
				}
				groups[key].push(m);
			});
			if (can_build && !groups.ge_built) {
				groups.ge_built = [];
				order.push("ge_built");
			}
			order.sort(function (a, b) {
				var rank = function (k) {
					return k === "erpnext" ? 0 : k === "ge_built" ? 1 : k === "frappe" ? 9 : 5;
				};
				return rank(a) - rank(b);
			});
			var h =
				'<div class="ge-home"><div class="ge-kick">' +
				esc(today_label()) +
				'</div><div class="ge-hello">' +
				esc(greeting()) +
				'</div><div class="ge-hs">' +
				svg("search", 18) +
				'<input type="text" class="ge-hs-in" autocomplete="off" spellcheck="false" placeholder="' +
				esc(T("Search documents, reports and commands")) +
				'" aria-label="' +
				esc(T("Search documents, reports and commands")) +
				'"></div><div class="ge-act">' +
				act_html(act_cached()) +
				'</div><div class="ge-agl-h">' +
				esc(T("All apps", HOME_CTX)) +
				"</div>";
			order.forEach(function (k, i) {
				// An app with a single module is headed by that module's own name.
				var only = groups[k].length === 1 ? T(groups[k][0].label) : "";
				var title =
					k === "ge_built"
						? T("Your workspaces")
						: k === "frappe"
						? T("Administration")
						: i > 0
						? only || app_title(k)
						: "";
				if (title) h += '<div class="ge-tiles-h">' + esc(title) + "</div>";
				h += '<div class="ge-tiles">';
				groups[k].forEach(function (m) {
					var id = identity(m);
					h +=
						'<a class="ge-tile" href="' +
						esc(module_route(m)) +
						'" data-mod="' +
						esc(m.name) +
						'" title="' +
						esc(T(m.label)) +
						'" style="--mc:' +
						id.color +
						'"><span class="ge-tic">' +
						svg(id.icon, 30, 1.6) +
						'</span><span class="ge-tl">' +
						esc(T(m.label)) +
						"</span></a>";
				});
				if (k === "ge_built" && can_build) {
					h +=
						'<button type="button" class="ge-tile ge-tile-new" title="' +
						esc(T("New workspace")) +
						'"><span class="ge-tic">' +
						svg("plus", 30, 1.6) +
						'</span><span class="ge-tl">' +
						esc(T("New workspace")) +
						"</span></button>";
				}
				h += "</div>";
			});
			if (!list.length) h += '<div class="ge-home-empty">' + esc(T("No modules to show yet.")) + "</div>";
			h += "</div>";
			body.innerHTML = h;
			home_search(body.querySelector(".ge-hs"));
			refresh_activity(body);
			// The screen is drawn again on every visit. One click handler is enough.
			if (body.getAttribute("data-ge-home")) return;
			body.setAttribute("data-ge-home", "1");
			body.addEventListener("click", function (e) {
				var plus = closest(e.target, ".ge-mu-new");
				if (plus) {
					new_doc(plus.getAttribute("data-dt"), e);
					return;
				}
				var mu = closest(e.target, ".ge-mu-a");
				if (mu) {
					go(mu.getAttribute("href"), e);
					return;
				}
				if (closest(e.target, ".ge-tile-new")) {
					open_ws_builder();
					return;
				}
				var q = closest(e.target, ".ge-q");
				if (q) {
					go(q.getAttribute("href"), e);
					return;
				}
				var t = closest(e.target, ".ge-tile");
				if (!t) return;
				S.cur = t.getAttribute("data-mod");
				session_set("gulf_cur_module", S.cur);
				go(t.getAttribute("href"), e);
			});
		};
		load_nav(draw);
	}

	// The search box on the apps screen searches in place. It runs Frappe's
	// own search on this box, so results, keys and the multilingual search
	// match the top bar. v16 keeps that search inside a popup, so its result
	// list is wired to this box instead of the popup.
	function home_search(box) {
		if (!box) return;
		var input = box.querySelector(".ge-hs-in");
		var $ = window.jQuery;
		var AB = window.frappe && frappe.search && frappe.search.AwesomeBar;
		var ok = false;
		if (input && $ && AB && window.Awesomplete) {
			try {
				var ab = new AB();
				if (major() >= 16 && typeof ab.setup_event_listeners === "function") {
					var $w = $(box);
					$w.find = function (sel) {
						return sel === "#navbar-search" ? $(input) : $.fn.find.call($(box), sel);
					};
					$w.modal = function () {
						input.blur();
						return $w;
					};
					ab.search_modal = $w;
					ab.setup_event_listeners($w);
				} else {
					ab.setup(input);
				}
				ok = true;
			} catch (e) {
				ok = false;
			}
		}
		if (!ok && input) {
			// No search engine to attach to: fall back to the desk's own search.
			input.addEventListener("focus", function () {
				input.blur();
				open_search();
			});
		}
		box.addEventListener("click", function (e) {
			if (input && e.target !== input && !closest(e.target, "ul")) input.focus();
		});
	}

	// After login: the landing page for the person's role if the admin set
	// one, otherwise the apps screen. Only when the desk opened on its bare
	// address, never when a link to a document was opened.
	function maybe_open_home() {
		var s = settings();
		if (!Number(s.enabled)) return;
		var p = INITIAL_PATH.replace(/\/+$/, "");
		// v15 sends people to /app/home after login. That counts only when the
		// page came straight from the login page, not from a saved link.
		var from_login = /\/login(\?|#|$)/.test(String(document.referrer || ""));
		var bare = p === "/app" || p === "/desk";
		var home = p === "/app/home" || p === "/desk/home";
		if (!bare && !(home && from_login)) return;
		var land = Number(s.landing_by_role) && s.landing;
		var route = null;
		if (land && land.workspace) route = [slug(land.workspace)];
		else if (land && land.page) route = String(land.page).split("/");
		else if (Number(s.apps_home)) route = ["gulf-apps"];
		if (!route) return;
		setTimeout(function () {
			frappe.set_route.apply(frappe, route);
		}, 0);
	}

	/* ---------------------------------------------------- appearance panel */

	function close_appearance() {
		var p = document.getElementById("ge-ap");
		if (p) p.parentNode.removeChild(p);
	}

	function mini_preview(a) {
		var dark = current_mode() === "dark";
		return (
			'<div class="ge-mini' +
			(a.layout === "side" ? " side" : "") +
			(a.bar === "white" ? " white" : "") +
			(dark ? " dark" : "") +
			'" style="--pc:' +
			esc(a.color) +
			'"><i class="ge-mini-bar"><b></b><b></b><b></b><b></b></i><i class="ge-mini-side"></i>' +
			'<i class="ge-mini-body"><b class="ge-mini-t"></b><b class="ge-mini-btn"></b><b class="ge-mini-card"></b></i></div>'
		);
	}

	function open_appearance(anchor) {
		close_menus();
		if (document.getElementById("ge-ap")) return close_appearance();
		var p = el('<div id="ge-ap" class="ge-ap" role="dialog" aria-label="' + esc(T("Appearance")) + '"></div>');
		document.body.appendChild(p);
		draw_appearance(p);
		var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
		var top = r ? r.bottom + 6 : 56;
		p.style.top = Math.max(8, Math.min(top, window.innerHeight - 80)) + "px";
		p.addEventListener("click", function (e) {
			e.stopPropagation();
		});
	}

	function lock_note(allowed) {
		return allowed
			? ""
			: '<span class="ge-ap-lock">' + svg("lock", 12) + esc(T("Set by your administrator")) + "</span>";
	}

	function draw_appearance(p) {
		var a = appearance();
		var al = a.allow || {};
		var mode = current_mode();
		var preset_on = false;
		var sw = PRESETS.map(function (pr) {
			var on = String(a.color).toUpperCase() === pr[1];
			if (on) preset_on = true;
			return (
				'<button type="button" class="ge-swd' +
				(on ? " on" : "") +
				'" data-color="' +
				pr[1] +
				'" style="--c:' +
				pr[1] +
				'" title="' +
				esc(T(pr[0])) +
				'" aria-label="' +
				esc(T(pr[0])) +
				'">' +
				(on ? svg("check", 14, 3) : "") +
				"</button>"
			);
		}).join("");
		var custom = !preset_on;
		var warn = white_contrast(a.color) < 4.5;
		var opt = function (key, val, label, icon, art) {
			var on = a[key] === val;
			return (
				'<button type="button" class="ge-opt' +
				(on ? " on" : "") +
				'" data-k="' +
				key +
				'" data-v="' +
				val +
				'">' +
				(on ? '<span class="ge-okc">' + svg("check", 11, 3) + "</span>" : "") +
				art +
				'<span class="ge-ol">' +
				(icon ? svg(icon, 14) : "") +
				esc(T(label)) +
				"</span></button>"
			);
		};
		var h =
			'<div class="ge-ap-h">' +
			svg("palette", 18) +
			'<b class="ge-f1">' +
			esc(T("Appearance")) +
			'</b><button type="button" class="ge-ap-x" aria-label="' +
			esc(T("Close")) +
			'">' +
			svg("x", 15) +
			"</button></div>" +
			'<div class="ge-ap-s ge-ap-prev">' +
			mini_preview(a) +
			'<div class="ge-ap-note">' +
			esc(T("Live preview. Changes apply to you only.")) +
			"</div></div>" +
			'<div class="ge-ap-s' +
			(al.layout ? "" : " locked") +
			'"><div class="ge-ap-l">' +
			esc(T("Layout")) +
			lock_note(al.layout) +
			'</div><div class="ge-row ge-g10 ge-ap-ctl">' +
			opt("layout", "top", "Top bar", "ptop", '<i class="ge-art ge-art-top"></i>') +
			opt("layout", "side", "Side menu", "pleft", '<i class="ge-art ge-art-side"></i>') +
			"</div></div>" +
			'<div class="ge-ap-s' +
			(al.color ? "" : " locked") +
			'"><div class="ge-ap-l">' +
			esc(T("Colour")) +
			lock_note(al.color) +
			'</div><div class="ge-row ge-g12 ge-ap-ctl ge-wrap">' +
			sw +
			'<label class="ge-swd cus' +
			(custom ? " on" : "") +
			'" style="--c:' +
			esc(a.color) +
			'" title="' +
			esc(T("Custom colour")) +
			'">' +
			svg(custom ? "check" : "plus", 14, 2.4) +
			'<input type="color" class="ge-color-in" value="' +
			esc(String(a.color).toLowerCase()) +
			'" aria-label="' +
			esc(T("Custom colour")) +
			'"></label></div>' +
			'<div class="ge-row ge-g8 ge-ap-ctl ge-ap-hexrow"><span class="ge-ap-sub">' +
			esc(T("Custom colour")) +
			'</span><input type="text" class="ge-hex" maxlength="7" value="' +
			esc(String(a.color).toUpperCase()) +
			'" dir="ltr" spellcheck="false" aria-label="' +
			esc(T("Custom colour")) +
			'"></div>' +
			(warn
				? '<div class="ge-ap-warn">' +
				  esc(T("White text on this colour is hard to read. Pick a darker shade.")) +
				  "</div>"
				: "") +
			"</div>" +
			'<div class="ge-ap-s' +
			(al.bar ? "" : " locked") +
			'"><div class="ge-ap-l">' +
			esc(T("Top bar style")) +
			lock_note(al.bar) +
			'</div><div class="ge-row ge-g10 ge-ap-ctl">' +
			opt("bar", "color", "Coloured", "", '<i class="ge-art ge-art-bar"></i>') +
			opt("bar", "white", "White", "", '<i class="ge-art ge-art-bar white"></i>') +
			"</div></div>" +
			'<div class="ge-ap-s ge-ap-last' +
			(al.mode ? "" : " locked") +
			'"><div class="ge-ap-l">' +
			esc(T("Mode")) +
			lock_note(al.mode) +
			'</div><div class="ge-seg ge-ap-ctl"><button type="button" data-mode="light" class="' +
			(mode === "light" ? "on" : "") +
			'">' +
			svg("sun", 14) +
			esc(T("Light")) +
			'</button><button type="button" data-mode="dark" class="' +
			(mode === "dark" ? "on" : "") +
			'">' +
			svg("moon", 14) +
			esc(T("Dark")) +
			"</button></div></div>" +
			'<div class="ge-ap-f"><button type="button" class="ge-link ge-ap-reset">' +
			esc(T("Reset to company default")) +
			'</button><span class="ge-f1"></span><button type="button" class="btn btn-primary btn-sm ge-ap-done">' +
			esc(T("Done")) +
			"</button></div>";
		p.innerHTML = h;

		p.querySelector(".ge-ap-x").addEventListener("click", close_appearance);
		p.querySelector(".ge-ap-done").addEventListener("click", close_appearance);
		p.querySelector(".ge-ap-reset").addEventListener("click", function () {
			frappe.xcall("gulf_erp_theme.api.reset_my_appearance").then(function (r) {
				S.local = null;
				if (r) boot().gulf_erp_theme.appearance = r;
				apply();
				draw_appearance(p);
			});
		});
		Array.prototype.slice.call(p.querySelectorAll(".ge-opt")).forEach(function (b) {
			b.addEventListener("click", function () {
				set_pref(b.getAttribute("data-k"), b.getAttribute("data-v"), p);
			});
		});
		Array.prototype.slice.call(p.querySelectorAll(".ge-swd[data-color]")).forEach(function (b) {
			b.addEventListener("click", function () {
				set_pref("color", b.getAttribute("data-color"), p);
			});
		});
		var cin = p.querySelector(".ge-color-in");
		cin.addEventListener("input", function () {
			set_pref("color", cin.value.toUpperCase(), p, true);
		});
		cin.addEventListener("change", function () {
			draw_appearance(p);
		});
		var hex = p.querySelector(".ge-hex");
		hex.addEventListener("change", function () {
			var v = hex.value.trim();
			if (v.charAt(0) !== "#") v = "#" + v;
			if (parse_hex(v)) set_pref("color", v.toUpperCase(), p);
			else hex.value = String(appearance().color).toUpperCase();
		});
		Array.prototype.slice.call(p.querySelectorAll("[data-mode]")).forEach(function (b) {
			b.addEventListener("click", function () {
				set_mode(b.getAttribute("data-mode"));
				draw_appearance(p);
			});
		});
	}

	function set_pref(key, val, panel, no_redraw) {
		var a = appearance();
		if (!(a.allow || {})[key]) return;
		S.local = S.local || {};
		S.local[key] = val;
		apply();
		if (panel && !no_redraw) draw_appearance(panel);
		else if (panel) {
			var prev = panel.querySelector(".ge-ap-prev .ge-mini");
			if (prev) prev.style.setProperty("--pc", val);
		}
		clearTimeout(S.save_timer);
		S.save_timer = setTimeout(function () {
			var send = S.local;
			frappe
				.xcall("gulf_erp_theme.api.save_appearance", { prefs: JSON.stringify(send) })
				.then(function (r) {
					if (r && boot().gulf_erp_theme) {
						boot().gulf_erp_theme.appearance = r;
						boot().gulf_erp_theme.has_own_appearance = 1;
					}
					if (S.local === send) S.local = null;
				})
				.catch(function () { S.local = null; apply(); frappe.show_alert({message: T("Could not save appearance. Please try again."), indicator: "red"}); });
		}, 400);
	}

	// v13 to v15: add Appearance to the stock user menu.
	function add_user_menu_item() {
		if (major() >= 16) return;
		var menu = document.querySelector(".dropdown-navbar-user .dropdown-menu");
		if (!menu || menu.querySelector(".ge-ap-open")) return;
		var item = el(
			'<a class="dropdown-item ge-ap-open" href="#" role="menuitem">' + esc(T("Appearance")) + "</a>"
		);
		var first = menu.querySelector(".dropdown-item");
		if (first && first.nextSibling) menu.insertBefore(item, first.nextSibling);
		else menu.appendChild(item);
		item.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (window.jQuery) jQuery(menu).closest(".dropdown").find("[data-toggle=dropdown]").dropdown("hide");
			open_appearance(document.querySelector(".dropdown-navbar-user") || item);
		});
	}

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ----------------------------------------------------- language switch */

	// The languages the admin offers, as [{code, name}] from boot.
	function lang_list() {
		var s = settings();
		if (!Number(s.enabled) || !Number(s.language_switch)) return [];
		if (!(window.frappe && frappe.session && frappe.session.user && frappe.session.user !== "Guest")) return [];
		return s.languages || [];
	}

	function cur_lang() {
		return String(boot().lang || "en");
	}

	function remove_lang() {
		close_lang_menu();
		Array.prototype.slice.call(document.querySelectorAll(".ge-lang-li, .ge-lang")).forEach(function (n) {
			if (n.parentNode) n.parentNode.removeChild(n);
		});
	}

	// With two languages the button names the other one and switches straight
	// away. With more it names the current one and opens a list.
	function lang_button() {
		var list = lang_list();
		var cur = cur_lang();
		var others = list.filter(function (l) {
			return l.code !== cur;
		});
		if (!others.length) return null;
		var direct = list.length <= 2 && others.length === 1;
		var shown = direct ? others[0] : null;
		if (!direct) {
			list.forEach(function (l) {
				if (l.code === cur) shown = l;
			});
		}
		var label = shown ? shown.name : T("Language");
		var title = direct ? T("Switch language") + ": " + label : T("Language");
		var b = el(
			'<button type="button" class="ge-lang"' +
				(direct ? ' data-code="' + esc(others[0].code) + '"' : ' aria-haspopup="true" aria-expanded="false"') +
				' title="' +
				esc(title) +
				'" aria-label="' +
				esc(title) +
				'">' +
				svg("globe", 16) +
				'<span class="ge-lang-t" dir="auto"' +
				(shown ? ' lang="' + esc(shown.code) + '"' : "") +
				">" +
				esc(label) +
				"</span>" +
				(direct ? "" : svg("cdown", 14)) +
				"</button>"
		);
		b.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			var code = b.getAttribute("data-code");
			if (code) switch_lang(code, b);
			else if (document.getElementById("ge-lang-dd")) close_lang_menu();
			else open_lang_menu(b);
		});
		return b;
	}

	function mount_lang() {
		if (!lang_list().length) return remove_lang();
		if (major() >= 16) {
			var bar = document.getElementById("ge-bar");
			if (!bar) return remove_lang();
			if (bar.querySelector(".ge-lang")) return;
			var b16 = lang_button();
			if (b16) bar.insertBefore(b16, bar.querySelector(".ge-palette"));
		} else {
			if (document.querySelector(".ge-lang-li")) return;
			var anchor = document.querySelector(
				".navbar .dropdown-notifications, .navbar .dropdown-help, .navbar .dropdown-navbar-user"
			);
			if (!anchor || !anchor.parentNode) return;
			var b = lang_button();
			if (!b) return;
			var li = el('<li class="nav-item ge-lang-li"></li>');
			li.appendChild(b);
			anchor.parentNode.insertBefore(li, anchor);
		}
		if (!S.lang_bound) {
			S.lang_bound = true;
			document.addEventListener("click", function (e) {
				if (!closest(e.target, "#ge-lang-dd") && !closest(e.target, ".ge-lang")) close_lang_menu();
			});
			document.addEventListener("keydown", function (e) {
				if (e.key === "Escape" && document.getElementById("ge-lang-dd")) {
					close_lang_menu();
					var b2 = document.querySelector(".ge-lang");
					if (b2) b2.focus();
				}
			});
		}
	}

	function open_lang_menu(btn) {
		close_lang_menu();
		var cur = cur_lang();
		var h = '<div id="ge-lang-dd" class="ge-lang-dd" role="menu">';
		lang_list().forEach(function (l) {
			var on = l.code === cur;
			h +=
				'<button type="button" role="menuitemradio" aria-checked="' +
				(on ? "true" : "false") +
				'" class="ge-lang-o' +
				(on ? " cur" : "") +
				'" data-code="' +
				esc(l.code) +
				'"><span dir="auto" lang="' +
				esc(l.code) +
				'">' +
				esc(l.name) +
				"</span>" +
				(on ? svg("check", 14) : "") +
				"</button>";
		});
		h += "</div>";
		var dd = el(h);
		document.body.appendChild(dd);
		var r = btn.getBoundingClientRect();
		dd.style.top = Math.round(r.bottom + 6) + "px";
		if (frappe_rtl()) dd.style.left = Math.max(8, Math.round(r.left)) + "px";
		else dd.style.right = Math.max(8, Math.round(document.documentElement.clientWidth - r.right)) + "px";
		btn.setAttribute("aria-expanded", "true");
		Array.prototype.slice.call(dd.querySelectorAll(".ge-lang-o")).forEach(function (o) {
			o.addEventListener("click", function (e) {
				e.stopPropagation();
				var code = o.getAttribute("data-code");
				if (code === cur) return close_lang_menu();
				switch_lang(code, btn);
			});
		});
		var first = dd.querySelector(".ge-lang-o.cur") || dd.querySelector(".ge-lang-o");
		if (first) first.focus();
	}

	function close_lang_menu() {
		var dd = document.getElementById("ge-lang-dd");
		if (dd) dd.parentNode.removeChild(dd);
		var b = document.querySelector(".ge-lang[aria-expanded]");
		if (b) b.setAttribute("aria-expanded", "false");
	}

	function switch_lang(code, btn) {
		if (S.lang_busy) return;
		S.lang_busy = true;
		if (btn) btn.classList.add("ge-busy");
		frappe.call({
			method: "gulf_erp_theme.api.set_language",
			args: { lang: code },
			callback: function (r) {
				if (r && !r.exc) window.location.reload();
			},
			error: function () {
				S.lang_busy = false;
				if (btn) btn.classList.remove("ge-busy");
			},
		});
	}

	/* ------------------------------------------------- multilingual search */

	// Frappe's search compares what you type with the name in your own
	// language only. This also tries the original English name and keeps the
	// better match, so "sales invoice" finds فاتورة مبيعات. A result found in
	// English shows both names.
	function search_score(r) {
		if (r && typeof r === "object") return Number(r.score) || 0;
		return Number(r) || 0;
	}

	function plain(html) {
		return String(html || "").replace(/<[^>]*>/g, "");
	}

	function setup_search() {
		var U = window.frappe && frappe.search && frappe.search.utils;
		if (!U || !U.fuzzy_search || U.__ge_wrapped) return;
		var orig = U.fuzzy_search;
		U.fuzzy_search = function (keywords, _item, marked) {
			var mine = orig.apply(this, arguments);
			var s = settings();
			if (!Number(s.enabled) || !Number(s.multilang_search)) return mine;
			if (!keywords || !_item || typeof _item !== "string" || cur_lang() === "en") return mine;
			var own = T(_item);
			if (own === _item) return mine;
			var english;
			var saved = window.__;
			window.__ = function (x) {
				return x;
			};
			try {
				english = orig.call(this, keywords, _item, marked);
			} catch (e) {
				english = 0;
			} finally {
				window.__ = saved;
			}
			var best = search_score(english) > search_score(mine) ? english : mine;
			if (!marked || !best || typeof best !== "object" || !search_score(best)) return best;
			// Found through the English name: show the local name first.
			if (plain(best.marked_string) === _item) {
				return {
					score: best.score,
					marked_string: esc(own) + ' <span class="ge-en" dir="ltr">' + best.marked_string + "</span>",
				};
			}
			return best;
		};
		U.__ge_wrapped = true;
	}

	/* ------------------------------------------------ status quick filters */

	var QF_TONES = [
		[/return|credit note|debit note/, "return"],
		[/overdue|expired|rejected|failed/, "overdue"],
		[/^draft$/, "draft"],
		[/cancel|closed|lost|stopped|on hold|disabled/, "cancelled"],
		[/unpaid|partly|partially|pending|^to |not started|not delivered|not billed|unreconciled|open$/, "unpaid"],
		[/paid|completed|delivered|received|billed|converted|resolved|ordered|reconciled|transferred|active|enabled/, "paid"],
	];

	function qf_on() {
		return document.documentElement.classList.contains("gulf-qf");
	}

	function qf_tone(status) {
		var s = String(status || "").toLowerCase();
		for (var i = 0; i < QF_TONES.length; i++) {
			if (QF_TONES[i][0].test(s)) return QF_TONES[i][1];
		}
		return "submitted";
	}

	// What the chips filter on: a visible Select field called status, or
	// docstatus for submittable documents that have none.
	function qf_field(list) {
		var meta = frappe.get_meta && frappe.get_meta(list.doctype);
		if (!meta) return null;
		var f = null;
		(meta.fields || []).forEach(function (df) {
			if (df.fieldname === "status" && df.fieldtype === "Select" && !Number(df.hidden)) f = df;
		});
		if (f) {
			var order = String(f.options || "")
				.split("\n")
				.map(function (o) {
					return o.trim();
				})
				.filter(Boolean);
			return { field: "status", order: order };
		}
		if (Number(meta.is_submittable)) return { field: "docstatus", order: ["0", "1", "2"] };
		return null;
	}

	function qf_label(field, value) {
		if (field === "docstatus") return T({ 0: "Draft", 1: "Submitted", 2: "Cancelled" }[value] || value);
		return T(value);
	}

	function qf_tone_of(field, value) {
		if (field === "docstatus") return { 0: "draft", 1: "submitted", 2: "cancelled" }[value] || "submitted";
		return qf_tone(value);
	}

	function qf_active(list, field) {
		var out = null;
		(list.get_filters_for_args() || []).forEach(function (f) {
			if (f[1] === field && f[2] === "=") out = String(f[3]);
		});
		return out;
	}

	function qf_render(list) {
		if (!list || list.view_name !== "List" || !list.$result || !list.$result.length) return;
		var host = list.$result[0];
		var box = host.parentNode && host.parentNode.querySelector(":scope > .ge-qf");
		if (!qf_on()) {
			if (box) box.parentNode.removeChild(box);
			return;
		}
		var q = qf_field(list);
		if (!q) {
			if (box) box.parentNode.removeChild(box);
			return;
		}
		var others = (list.get_filters_for_args() || []).filter(function (f) {
			return f[1] !== q.field;
		});
		var key = list.doctype + "|" + JSON.stringify(others);
		var now = Date.now();
		if (list.__ge_qf && list.__ge_qf.key === key && now - list.__ge_qf.at < 15000) {
			return qf_draw(list, q, list.__ge_qf.rows);
		}
		if (list.__ge_qf_busy === key) return;
		list.__ge_qf_busy = key;
		frappe
			.xcall("frappe.desk.listview.get_group_by_count", {
				doctype: list.doctype,
				current_filters: others,
				field: q.field,
			})
			.then(function (rows) {
				list.__ge_qf_busy = null;
				list.__ge_qf = { key: key, at: Date.now(), rows: rows || [] };
				qf_draw(list, q, rows || []);
			})
			.catch(function () {
				list.__ge_qf_busy = null;
			});
	}

	function qf_draw(list, q, rows) {
		var host = list.$result[0];
		var parent = host.parentNode;
		if (!parent) return;
		var box = parent.querySelector(":scope > .ge-qf");
		var counts = {};
		var total = 0;
		rows.forEach(function (r) {
			var v = r.name === null || r.name === undefined ? "" : String(r.name);
			if (!v) return;
			counts[v] = (counts[v] || 0) + Number(r.count || 0);
			total += Number(r.count || 0);
		});
		var active = qf_active(list, q.field);
		var values = q.order.filter(function (v) {
			return counts[v];
		});
		Object.keys(counts).forEach(function (v) {
			if (values.indexOf(v) === -1) values.push(v);
		});
		if (active && values.indexOf(active) === -1) values.push(active);
		if (values.length < 2 && !active) {
			if (box) box.parentNode.removeChild(box);
			return;
		}
		var h =
			'<button type="button" class="ge-qf-c' +
			(active ? "" : " on") +
			'" data-v="" aria-pressed="' +
			(active ? "false" : "true") +
			'">' +
			esc(T("All")) +
			'<span class="ge-qf-n">' +
			total +
			"</span></button>";
		values.forEach(function (v) {
			var on = active === v;
			h +=
				'<button type="button" class="ge-qf-c' +
				(on ? " on" : "") +
				'" data-v="' +
				esc(v) +
				'" aria-pressed="' +
				(on ? "true" : "false") +
				'"><i class="ge-qf-dot ge-qf-' +
				qf_tone_of(q.field, v) +
				'"></i>' +
				esc(qf_label(q.field, v)) +
				'<span class="ge-qf-n">' +
				(counts[v] || 0) +
				"</span></button>";
		});
		if (!box) {
			box = el('<div class="ge-qf" role="toolbar"></div>');
			parent.insertBefore(box, host);
		}
		box.setAttribute("aria-label", T("Status"));
		box.innerHTML = h;
		Array.prototype.slice.call(box.querySelectorAll(".ge-qf-c")).forEach(function (b) {
			b.addEventListener("click", function () {
				qf_apply(list, q.field, b.getAttribute("data-v"));
			});
		});
	}

	function qf_apply(list, field, value) {
		var fd = list.page && list.page.fields_dict;
		if (field === "status" && fd && fd.status) {
			fd.status.set_value(value || "");
			return;
		}
		var fa = list.filter_area;
		if (!fa) return;
		var fl = fa.filter_list;
		var old = fl && fl.get_filter && fl.get_filter(field);
		var done = old ? fa.remove(field) : Promise.resolve();
		if (!value) return;
		Promise.resolve(done).then(function () {
			// Passed as text: the filter list treats the number 0 as empty.
			fa.add(list.doctype, field, "=", String(value));
		});
	}

	function setup_qf() {
		var LV = frappe.views && frappe.views.ListView;
		if (!LV || LV.prototype.__ge_qf_wrapped) return;
		var orig = LV.prototype.after_render;
		LV.prototype.after_render = function () {
			var out = orig ? orig.apply(this, arguments) : undefined;
			var me = this;
			setTimeout(function () {
				try {
					qf_render(me);
				} catch (e) {
					/* never break the list */
				}
			}, 0);
			return out;
		};
		LV.prototype.__ge_qf_wrapped = true;
		if (window.cur_list) {
			try {
				qf_render(window.cur_list);
			} catch (e) {
				/* ignore */
			}
		}
	}

	/* ------------------------------------------------------- section guide */

	function strip_html(s) {
		var d = document.createElement("div");
		d.innerHTML = s || "";
		return (d.textContent || "").replace(/\s+/g, " ").trim();
	}

	function section_summary(frm, section) {
		var parts = [];
		var controls = section.querySelectorAll(".frappe-control[data-fieldname]");
		for (var i = 0; i < controls.length && parts.length < 3; i++) {
			var fn = controls[i].getAttribute("data-fieldname");
			var df = frm.fields_dict[fn] && frm.fields_dict[fn].df;
			if (!df || df.hidden || /Table|Section|Column|Tab|HTML|Button|Heading/.test(df.fieldtype)) continue;
			var v = frm.doc[fn];
			if (v === null || v === undefined || v === "" || v === 0) continue;
			var txt = "";
			try {
				txt = strip_html(frappe.format(v, df, { no_icon: true, inline: true }, frm.doc));
			} catch (e) {
				txt = String(v);
			}
			if (df.fieldtype === "Check") txt = T(df.label);
			if (txt) parts.push(txt.length > 40 ? txt.slice(0, 40) + "..." : txt);
		}
		return parts.join(" · ");
	}

	function guide(frm) {
		if (!frm || !frm.wrapper) return;
		var root = document.documentElement;
		if (!root.classList.contains("gulf") || !root.classList.contains("gulf-guide")) return;
		var wrap = frm.wrapper.jquery ? frm.wrapper[0] : frm.wrapper;
		var layout = wrap.querySelector(".form-layout");
		if (!layout) return;

		// Collapsed sections show what is inside them.
		Array.prototype.slice.call(layout.querySelectorAll(".form-section")).forEach(function (sec) {
			var head = sec.querySelector(".section-head");
			if (!head) return;
			var old = head.querySelector(".ge-sec-sum");
			if (old) old.parentNode.removeChild(old);
			if (!head.classList.contains("collapsed")) return;
			var sum = section_summary(frm, sec);
			if (sum) {
				var span = el('<span class="ge-sec-sum"></span>');
				span.textContent = sum;
				var ind = head.querySelector(".collapse-indicator, .ml-2, svg");
				head.insertBefore(span, ind && ind.parentNode === head ? ind : null);
			}
		});

		// "On this page" in the form sidebar.
		var sidebar = wrap.querySelector(".form-sidebar");
		if (!sidebar) return;
		var toc = sidebar.querySelector(".ge-toc");
		if (!toc) {
			toc = el('<div class="ge-toc"></div>');
			sidebar.insertBefore(toc, sidebar.firstChild);
			toc.addEventListener("click", function (e) {
				var b = closest(e.target, "[data-sec]");
				if (!b) return;
				var target = (toc._ge_layout || layout).querySelectorAll(".form-section")[Number(b.getAttribute("data-sec"))];
				if (!target) return;
				var head = target.querySelector(".section-head.collapsed");
				if (head) head.click();
				// Land the section just under the sticky page head, not behind it.
				var dy = target.getBoundingClientRect().top - toc_line(toc);
				var sc = toc._ge_scroller || window;
				try {
					sc.scrollBy({ top: dy, behavior: "smooth" });
				} catch (err) {
					if (sc === window) window.scrollBy(0, dy);
					else sc.scrollTop += dy;
				}
			});
		}
		var all = Array.prototype.slice.call(layout.querySelectorAll(".form-section"));
		var items = [];
		all.forEach(function (sec, i) {
			if (!sec.offsetParent) return; // hidden or in another tab
			var head = sec.querySelector(".section-head");
			var label = head && strip_html(head.innerHTML.replace(/<span class="ge-sec-sum"[\s\S]*?<\/span>/, ""));
			if (label) items.push([i, label]);
		});
		if (items.length < 2) {
			toc.innerHTML = "";
			sidebar.classList.remove("ge-has-toc");
			return;
		}
		// The list stays in view while the page scrolls. v13 to v15 scroll the
		// window, so it sticks just under the sticky page head. v16 scrolls the
		// page inside the desk and pins the side column itself, so the list only
		// needs to stick to the top of that column.
		toc._ge_layout = layout;
		toc._ge_head = wrap.querySelector(".page-head") || document.querySelector(".page-head");
		toc._ge_scroller = scroller_of(layout);
		var side = closest(sidebar, ".layout-side-section");
		var own = side && /(auto|scroll)/.test(window.getComputedStyle(side).overflowY);
		if (own) {
			toc.style.setProperty("--ge-toc-top", "0px");
			toc.style.setProperty("--ge-toc-max", "none");
		} else {
			toc.style.setProperty("--ge-toc-top", Math.round(toc_line(toc) + 4) + "px");
			toc.style.removeProperty("--ge-toc-max");
		}
		sidebar.classList.add("ge-has-toc");
		watch_toc(toc);
		toc.innerHTML =
			'<div class="ge-toc-h">' +
			esc(T("On this page")) +
			"</div>" +
			items
				.map(function (x, n) {
					return (
						'<button type="button" class="ge-toc-i" data-sec="' +
						x[0] +
						'"><b>' +
						(n + 1) +
						'</b><span class="ge-ell">' +
						esc(x[1]) +
						"</span></button>"
					);
				})
				.join("");
		toc_active(toc);
	}

	// The element that scrolls the form: the window on v13 to v15, a desk
	// container on v16.
	function scroller_of(node) {
		var n = node && node.parentElement;
		while (n && n !== document.body && n !== document.documentElement) {
			if (/(auto|scroll)/.test(window.getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1) {
				return n;
			}
			n = n.parentElement;
		}
		return window;
	}

	// Where the sticky page head ends on screen, so content below it is in view.
	function toc_line(toc) {
		var sc = toc._ge_scroller || window;
		var base = sc === window ? 0 : sc.getBoundingClientRect().top;
		var ph = toc._ge_head;
		if (ph) {
			var pcs = window.getComputedStyle(ph);
			if (pcs.position === "fixed") return (parseFloat(pcs.top) || 0) + ph.offsetHeight + 8;
			if (pcs.position === "sticky") return base + (parseFloat(pcs.top) || 0) + ph.offsetHeight + 8;
		}
		return base + 8;
	}

	// Mark the section currently at the top of the screen in "On this page".
	function toc_active(toc) {
		if (!toc || !toc.offsetParent || !toc._ge_layout) return;
		var secs = toc._ge_layout.querySelectorAll(".form-section");
		var btns = toc.querySelectorAll("[data-sec]");
		if (!btns.length) return;
		var line = toc_line(toc) + 24;
		var on = btns[0];
		for (var i = 0; i < btns.length; i++) {
			var sec = secs[Number(btns[i].getAttribute("data-sec"))];
			if (sec && sec.getBoundingClientRect().top <= line) on = btns[i];
		}
		// At the very bottom the last section may never reach the line.
		var sc = toc._ge_scroller || window;
		var bottom =
			sc === window
				? window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 4
				: sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
		if (bottom && (sc === window ? window.pageYOffset : sc.scrollTop) > 0) on = btns[btns.length - 1];
		for (var j = 0; j < btns.length; j++) btns[j].classList.toggle("ge-on", btns[j] === on);
		// A long list scrolls inside itself. Keep the marked section in view.
		if (toc.scrollHeight > toc.clientHeight + 1) {
			var tr = toc.getBoundingClientRect();
			var br = on.getBoundingClientRect();
			if (br.top < tr.top + 28) toc.scrollTop -= tr.top + 28 - br.top;
			else if (br.bottom > tr.bottom - 8) toc.scrollTop += br.bottom - tr.bottom + 8;
		}
	}

	function watch_toc(toc) {
		S.toc = toc;
		if (S.toc_watch) return;
		S.toc_watch = true;
		var queued = false;
		// Capture catches scrolling in any container, not only the window.
		document.addEventListener(
			"scroll",
			function () {
				if (queued) return;
				queued = true;
				setTimeout(function () {
					queued = false;
					if (S.toc && document.body.contains(S.toc)) toc_active(S.toc);
				}, 60);
			},
			{ capture: true, passive: true }
		);
	}

	// ERPNext paints a saved draft red and a cancelled document red, the same
	// as Overdue. Tag them so the status colours can tell them apart.
	function mark_status(frm) {
		if (!frm || !frm.doc || !frm.page || !frm.page.indicator) return;
		var ind = frm.page.indicator.jquery ? frm.page.indicator[0] : frm.page.indicator;
		if (!ind || !ind.classList) return;
		var txt = String(ind.textContent || "").trim();
		ind.classList.toggle("ge-draft", frm.doc.docstatus === 0 && txt === T("Draft"));
		ind.classList.toggle("ge-cancelled", frm.doc.docstatus === 2);
	}

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ------------------------------------------------ recent and favourites */
	// Recent documents are kept on this device. Favourites are saved on the
	// server (user defaults) so they follow the person to every device.
	function rf_on() {
		return document.documentElement.classList.contains("gulf-recent");
	}

	function recent_key() {
		return "gulf_recent:" + ((window.frappe && frappe.session && frappe.session.user) || "");
	}

	function get_recent() {
		try {
			var list = JSON.parse(store_get(recent_key()) || "[]");
			return Array.isArray(list) ? list : [];
		} catch (e) {
			return [];
		}
	}

	function doc_title(frm) {
		var t = "";
		try {
			t = frm.get_title ? frm.get_title() : "";
		} catch (e) {
			t = "";
		}
		return String(t || frm.docname || "");
	}

	function record_recent(frm) {
		if (!act_on() || !frm || !frm.doc || !frm.docname || (frm.is_new && frm.is_new())) return;
		var item = { doctype: frm.doctype, name: frm.docname, title: doc_title(frm) };
		queue_visit(item.doctype, item.name, item.title);
		var list = [].filter(function (r) {
			return !(r.doctype === item.doctype && r.name === item.name);
		});
		list.unshift(item);
		// Recent items are returned by the permission-checked activity API.
	}

	function is_fav(dt, name) {
		return (settings().favourites || []).some(function (f) {
			return f.doctype === dt && f.name === name;
		});
	}

	function fav_button(frm) {
		if (!frm || !frm.page || !frm.doc) return;
		var host = frm.page.wrapper && (frm.page.wrapper.jquery ? frm.page.wrapper[0] : frm.page.wrapper);
		var actions = host && host.querySelector(".page-actions");
		var btn = host && host.querySelector(".ge-fav");
		if (!rf_on() || (frm.is_new && frm.is_new()) || !actions) {
			if (btn) btn.style.display = "none";
			return;
		}
		if (!btn) {
			btn = el('<button type="button" class="btn btn-default btn-sm ge-fav"></button>');
			btn.addEventListener("click", function () {
				toggle_fav(window.cur_frm);
			});
			actions.insertBefore(btn, actions.firstChild);
		}
		var on = is_fav(frm.doctype, frm.docname);
		btn.style.display = "";
		btn.classList.toggle("on", on);
		btn.innerHTML = svg("star", 15);
		btn.title = on ? T("Remove from favourites") : T("Add to favourites");
		btn.setAttribute("aria-label", btn.title);
		btn.setAttribute("aria-pressed", on ? "true" : "false");
	}

	function toggle_fav(frm) {
		if (!frm || !frm.docname) return;
		frappe
			.xcall("gulf_erp_theme.api.toggle_favourite", { doctype: frm.doctype, name: frm.docname, title: doc_title(frm) })
			.then(function (list) {
				if (frappe.boot.gulf_erp_theme) frappe.boot.gulf_erp_theme.favourites = list || [];
				fav_button(frm);
				frappe.show_alert({
					message: is_fav(frm.doctype, frm.docname) ? T("Added to favourites") : T("Removed from favourites"),
					indicator: "blue",
				});
			});
	}

	function doc_href(it) {
		return base() + "/" + slug(it.doctype) + "/" + encodeURIComponent(it.name);
	}

	// The strip under the search box on the apps screen.
	function quick_html(server_recent) {
		if (!rf_on()) return "";
		var favs = (settings().favourites || []).slice(0, 6);
		var seen = {};
		favs.forEach(function (f) {
			seen[f.doctype + "|" + f.name] = 1;
		});
		var rec = (server_recent && server_recent.length ? server_recent : get_recent())
			.filter(function (r) {
				return !seen[r.doctype + "|" + r.name];
			})
			.slice(0, 8);
		if (!favs.length && !rec.length) return "";
		var card = function (it, fav) {
			return (
				'<a class="ge-q' +
				(fav ? " fav" : "") +
				'" href="' +
				esc(doc_href(it)) +
				'"><span class="ge-qi">' +
				svg(fav ? "star" : link_icon({ label: it.doctype }), 16) +
				'</span><span class="ge-qt"><b dir="auto">' +
				esc(it.title || it.name) +
				"</b><small>" +
				esc(T(it.doctype)) +
				(it.title && it.title !== it.name ? " · " + esc(it.name) : "") +
				"</small></span>" +
				(!fav && it.at ? '<span class="ge-qw">' + when(it.at) + "</span>" : "") +
				"</a>"
			);
		};
		var h = '<div class="ge-quick">';
		if (favs.length) {
			h += '<div class="ge-quick-h">' + esc(T("Favourites")) + '</div><div class="ge-quick-row">';
			h += favs.map(function (f) {
				return card(f, true);
			}).join("");
			h += "</div>";
		}
		if (rec.length) {
			h += '<div class="ge-quick-h">' + esc(T("Recently opened")) + '</div><div class="ge-quick-row ge-rec-row">';
			h += rec.map(function (r) {
				return card(r, false);
			}).join("");
			h += "</div>";
		}
		return h + "</div>";
	}

	/* ---------------------------------------------- most used and recent */
	// Each person's visits are saved on the server in small batches, so the
	// apps screen shows the same lists on every device.

	var VQ = { list: [], timer: null, last: {} };

	function mu_on() {
		return document.documentElement.classList.contains("gulf-mostused");
	}

	function act_on() {
		return rf_on() || mu_on();
	}

	function queue_visit(dt, name, title) {
		if (!act_on() || !dt || !window.frappe || !frappe.xcall) return;
		var key = dt + "|" + (name || "");
		var now = new Date().getTime();
		// A form refreshes on every save. One visit a minute is enough.
		if (VQ.last[key] && now - VQ.last[key] < 60000) return;
		VQ.last[key] = now;
		VQ.list.push({ doctype: dt, name: name || "", title: title || "" });
		clearTimeout(VQ.timer);
		VQ.timer = setTimeout(flush_visits, 4000);
	}

	function flush_visits() {
		clearTimeout(VQ.timer);
		var batch = VQ.list.splice(0, VQ.list.length);
		if (!batch.length) return Promise.resolve();
		return frappe.xcall("gulf_erp_theme.activity.log_visits", { visits: batch }).catch(function () {
			return null;
		});
	}

	function track_lists() {
		if (S.track_ready || !window.frappe || !frappe.router || !frappe.router.on) return;
		S.track_ready = true;
		frappe.router.on("change", function () {
			var r = frappe.get_route ? frappe.get_route() : [];
			if (r && r[0] === "List" && r[1]) queue_visit(r[1]);
		});
		document.addEventListener("visibilitychange", function () {
			if (document.visibilityState === "hidden") flush_visits();
		});
	}

	function act_key() {
		return "gulf_activity:" + ((window.frappe && frappe.session && frappe.session.user) || "");
	}

	function act_cached() { return null; }

	function refresh_activity(body) {
		if (!act_on() || !frappe.xcall) return;
		flush_visits()
			.then(function () {
				return frappe.xcall("gulf_erp_theme.activity.get_activity");
			})
			.then(function (a) {
				if (!a) return;
				// Do not persist record titles in browser storage.
				var box = body.querySelector(".ge-act");
				if (box) box.innerHTML = act_html(a);
			})
			.catch(function () {
				return null;
			});
	}

	function when(at) {
		try {
			if (typeof window.comment_when === "function") return window.comment_when(at);
		} catch (e) {
			/* no relative time on this version */
		}
		return "";
	}

	function nav_for_module(module) {
		var list = S.nav || [];
		for (var i = 0; i < list.length; i++) {
			if (list[i].module === module || list[i].name === module) return list[i];
		}
		return { name: module, label: module, module: module };
	}

	function new_label(dt) {
		return typeof window.__ === "function" ? window.__("New {0}", [T(dt)]) : "New " + dt;
	}

	function act_html(a) {
		a = a || {};
		var h = "";
		var freq = mu_on() ? a.frequent || [] : [];
		if (freq.length) {
			h += '<div class="ge-mu"><div class="ge-quick-h">' + esc(T("Most used", HOME_CTX)) + '</div><div class="ge-mu-grid">';
			freq.forEach(function (f) {
				var id = identity(nav_for_module(f.module || ""));
				h +=
					'<div class="ge-mu-c" style="--mc:' +
					id.color +
					'"><a class="ge-mu-a" href="' +
					esc(base() + "/" + slug(f.doctype)) +
					'"><span class="ge-mu-i">' +
					svg(link_icon({ label: f.doctype }), 18) +
					'</span><span class="ge-mu-t" dir="auto">' +
					esc(T(f.doctype)) +
					"</span></a>";
				if (f.can_create) {
					h +=
						'<button type="button" class="ge-mu-new" data-dt="' +
						esc(f.doctype) +
						'" title="' +
						esc(new_label(f.doctype)) +
						'" aria-label="' +
						esc(new_label(f.doctype)) +
						'">' +
						svg("plus", 16) +
						"</button>";
				}
				h += "</div>";
			});
			h += "</div></div>";
		}
		return h + quick_html(a.recent);
	}

	/* ------------------------------------------------------- summary card */
	// Invoices, orders and quotations: who, when, how much, where it stands,
	// in one card above the form. Only fields the document already has.
	var SUMMARY = {
		"Sales Invoice": { party: ["customer_name", "customer"], date: "posting_date", due: "due_date", rest: "outstanding_amount" },
		"Purchase Invoice": { party: ["supplier_name", "supplier"], date: "posting_date", due: "due_date", rest: "outstanding_amount" },
		"POS Invoice": { party: ["customer_name", "customer"], date: "posting_date", rest: "outstanding_amount" },
		"Sales Order": { party: ["customer_name", "customer"], date: "transaction_date", due: "delivery_date", pct: [["per_delivered", "Delivered"], ["per_billed", "Billed"]] },
		"Purchase Order": { party: ["supplier_name", "supplier"], date: "transaction_date", due: "schedule_date", pct: [["per_received", "Received"], ["per_billed", "Billed"]] },
		Quotation: { party: ["customer_name", "party_name"], date: "transaction_date", due: "valid_till" },
		"Supplier Quotation": { party: ["supplier_name", "supplier"], date: "transaction_date", due: "valid_till" },
		"Delivery Note": { party: ["customer_name", "customer"], date: "posting_date", pct: [["per_billed", "Billed"]] },
		"Purchase Receipt": { party: ["supplier_name", "supplier"], date: "posting_date", pct: [["per_billed", "Billed"]] },
	};

	function sum_value(frm, field) {
		var ctl = frm.fields_dict[field];
		var v = frm.doc[field];
		if (v === undefined || v === null || v === "") return "";
		if (ctl && ctl.df && window.frappe && frappe.format) {
			try {
				return plain(frappe.format(v, ctl.df, { inline: true }, frm.doc));
			} catch (e) {
				return String(v);
			}
		}
		return String(v);
	}

	function sum_label(frm, field, fallback) {
		var ctl = frm.fields_dict[field];
		return T((ctl && ctl.df && ctl.df.label) || fallback);
	}

	function summary_card(frm) {
		if (!frm || !frm.doc || !frm.layout || !frm.layout.wrapper) return;
		var wrap = frm.layout.wrapper.jquery ? frm.layout.wrapper[0] : frm.layout.wrapper;
		var old = wrap && wrap.querySelector(":scope > .ge-sum");
		var conf = SUMMARY[frm.doctype];
		if (!document.documentElement.classList.contains("gulf-summary") || !conf || (frm.is_new && frm.is_new())) {
			if (old) old.parentNode.removeChild(old);
			return;
		}
		var party = "";
		conf.party.forEach(function (f) {
			if (!party && frm.doc[f]) party = String(frm.doc[f]);
		});
		var cells = [];
		cells.push([T("Party", SUM_CTX), esc(party || "-"), "", "user"]);
		if (conf.date) cells.push([sum_label(frm, conf.date, "Date"), esc(sum_value(frm, conf.date) || "-"), "", "calendar"]);
		if (conf.due && frm.doc[conf.due]) cells.push([sum_label(frm, conf.due, "Due Date"), esc(sum_value(frm, conf.due)), "", "calendar"]);
		cells.push([sum_label(frm, "grand_total", "Grand Total"), esc(sum_value(frm, "grand_total") || "-"), "num big", "receipt"]);
		if (conf.rest && frm.fields_dict[conf.rest]) {
			var rest = Number(frm.doc[conf.rest] || 0);
			cells.push([sum_label(frm, conf.rest, "Outstanding Amount"), esc(sum_value(frm, conf.rest) || "0"), "num" + (rest > 0 ? " due" : " clear"), "card"]);
		}
		(conf.pct || []).forEach(function (p) {
			if (!frm.fields_dict[p[0]]) return;
			var n = Math.max(0, Math.min(100, Number(frm.doc[p[0]] || 0)));
			cells.push([
				T(p[1], SUM_CTX),
				'<span class="ge-sum-pct"><i style="width:' + n + '%"></i></span><span class="num">' + Math.round(n) + "%</span>",
				"pct",
				"",
			]);
		});
		var status = frm.doc.status ? String(frm.doc.status) : frm.doc.docstatus === 2 ? "Cancelled" : frm.doc.docstatus === 0 ? "Draft" : "";
		var h = '<div class="ge-sum">';
		cells.forEach(function (c) {
			h += '<div class="ge-sum-c ' + c[2] + '"><span class="ge-sum-l">' + esc(c[0]) + '</span><span class="ge-sum-v">' + c[1] + "</span></div>";
		});
		if (status) h += '<span class="ge-sum-st ge-qf-' + qf_tone(status) + '"><i></i>' + esc(T(status)) + "</span>";
		h += "</div>";
		var card = el(h);
		if (old) old.parentNode.replaceChild(card, old);
		else wrap.insertBefore(card, wrap.firstChild);
	}

	/* --------------------------------------------------------- Hijri date */
	// Shown under date fields on forms. The saved value stays Gregorian.
	function hijri_text(value) {
		var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
		if (!m) return "";
		var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
		var ar = String(boot().lang || "en").indexOf("ar") === 0;
		try {
			return new Intl.DateTimeFormat(ar ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura", {
				day: "numeric",
				month: "long",
				year: "numeric",
			}).format(d);
		} catch (e) {
			return "";
		}
	}

	function hijri(frm) {
		if (!frm || !frm.fields_dict) return;
		var on = document.documentElement.classList.contains("gulf-hijri");
		Object.keys(frm.fields_dict).forEach(function (f) {
			var ctl = frm.fields_dict[f];
			if (!ctl || !ctl.df || (ctl.df.fieldtype !== "Date" && ctl.df.fieldtype !== "Datetime")) return;
			var host = ctl.$wrapper && (ctl.$wrapper.jquery ? ctl.$wrapper[0] : ctl.$wrapper);
			if (!host) return;
			var tag = host.querySelector(".ge-hijri");
			var text = on ? hijri_text(frm.doc[f]) : "";
			if (!text) {
				if (tag) tag.parentNode.removeChild(tag);
				return;
			}
			if (!tag) {
				tag = el('<div class="ge-hijri"></div>');
				var anchor = host.querySelector(".control-input-wrapper") || host;
				anchor.appendChild(tag);
			}
			tag.textContent = text;
		});
	}

	/* --------------------------------------------------------- notice bar */
	function notice_key(n) {
		return "gulf_notice_closed:" + n.key;
	}

	function render_notice() {
		var n = settings().notice;
		var bar = document.getElementById("ge-notice");
		var host = document.getElementById("body");
		var closed = n && store_get(notice_key(n));
		if (!Number(settings().enabled) || !n || !n.message || closed || !host) {
			if (bar) bar.parentNode.removeChild(bar);
			return;
		}
		if (bar && bar.getAttribute("data-key") === n.key) return;
		if (bar) bar.parentNode.removeChild(bar);
		bar = el(
			'<div id="ge-notice" class="ge-notice ge-notice-' +
				esc(n.tone || "info") +
				'" role="status" data-key="' +
				esc(n.key) +
				'">' +
				svg("megaphone", 16) +
				'<span class="ge-notice-t"></span><button type="button" class="ge-notice-x" aria-label="' +
				esc(T("Close")) +
				'">' +
				svg("x", 14, 2) +
				"</button></div>"
		);
		bar.querySelector(".ge-notice-t").textContent = n.message;
		bar.querySelector(".ge-notice-x").addEventListener("click", function () {
			store_set(notice_key(n), "1");
			if (bar.parentNode) bar.parentNode.removeChild(bar);
		});
		host.insertBefore(bar, host.firstChild);
	}

	// Simpler forms by role: the server sends the fields this person does not
	// need on each form. They are hidden from view only. A required field that
	// is still empty stays visible, so it never blocks a save.
	function simplify(frm) {
		if (!frm || !frm.doc || !frm.fields_dict) return;
		if (!document.documentElement.classList.contains("gulf-simple")) return;
		var fields = (settings().form_hide || {})[frm.doctype];
		if (!fields || !fields.length) return;
		fields.forEach(function (f) {
			var ctl = frm.fields_dict[f];
			if (!ctl || !ctl.df) return;
			var v = frm.doc[f];
			var needed = Number(ctl.df.reqd) && (v === undefined || v === null || v === "");
			frm.toggle_display(f, !!needed);
		});
	}

	function setup_guide() {
		if (!window.jQuery || S.guide_ready) return;
		S.guide_ready = true;
		var later = function (frm) {
			setTimeout(function () {
				mark_status(frm);
				simplify(frm);
				guide(frm);
				record_recent(frm);
				fav_button(frm);
				summary_card(frm);
				hijri(frm);
			}, 60);
		};
		// Keep the card and the Hijri dates current while the form is edited.
		var on_edit = function () {
			var frm = window.cur_frm;
			setTimeout(function () {
				summary_card(frm);
				hijri(frm);
			}, 120);
		};
		jQuery(document).on("change", ".frappe-control input, .frappe-control select", on_edit);
		jQuery(document).on("blur", ".frappe-control[data-fieldtype='Date'] input, .frappe-control[data-fieldtype='Datetime'] input", on_edit);
		jQuery(document).on("form-refresh", function (e, frm) {
			later(frm || window.cur_frm);
		});
		jQuery(document).on("click", ".form-tabs-list .nav-link, .form-section .section-head", function () {
			later(window.cur_frm);
		});
		jQuery(document).on("shown.bs.tab", ".form-tabs-list", function () {
			later(window.cur_frm);
		});
	}

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ---------------------------------------------------- workspace access */

	// A "Who sees this" button on each public workspace, for System Managers.
	// The server keeps one access record per workspace (workspace_access.py).
	var WS_EVERYONE = "Everyone";
	var WS_SPECIFIC = "Specific people";

	function ws_access_on() {
		return document.documentElement.classList.contains("gulf-wsa");
	}

	function ws_current() {
		var w = window.frappe && frappe.workspace;
		var r = (frappe.get_route && frappe.get_route()) || [];
		if (!w || !w.page) return null;
		var r0 = String(r[0] || "").toLowerCase();
		if (r0 !== "workspaces" && r0 !== "workspace") return null;
		if (r[1] === "private") return null;
		var c = w.current_page || {};
		if (c.public === 0 || c.public === false) return null;
		return c.name || r[1] || null;
	}

	function ws_sync() {
		var w = window.frappe && frappe.workspace;
		var current = ws_current();
		var host = w && w.page && w.page.wrapper && (w.page.wrapper.jquery ? w.page.wrapper[0] : w.page.wrapper);
		var actions = host && host.querySelector(".page-actions");
		var access = ws_access_on() && frappe.user && frappe.user.has_role && frappe.user.has_role("System Manager");
		var built = settings().built_workspaces || [];
		ws_button(actions, host, ".ge-wsa-btn", access ? current : null, "users", T("Who sees this"), open_ws_access);
		ws_button(
			actions,
			host,
			".ge-wsb-edit",
			wsb_allowed() && current && built.indexOf(current) !== -1 ? current : null,
			"wrench",
			T("Edit workspace"),
			open_ws_builder
		);
	}

	// One button in the workspace page's actions, shown only while `name` is set.
	function ws_button(actions, host, sel, name, icon, label, fn) {
		var btn = host && host.querySelector(sel);
		if (!name || !actions) {
			if (btn) btn.style.display = "none";
			return;
		}
		if (!btn) {
			btn = el(
				'<button type="button" class="btn btn-default btn-sm ge-ws-btn ' +
					sel.slice(1) +
					'">' +
					svg(icon, 14) +
					"<span>" +
					esc(label) +
					"</span></button>"
			);
			btn.addEventListener("click", function () {
				var n = ws_current();
				if (n) fn(n);
			});
			actions.insertBefore(btn, actions.firstChild);
		}
		btn.style.display = "";
	}

	function ws_sync_later() {
		setTimeout(ws_sync, 0);
		setTimeout(ws_sync, 600);
		setTimeout(ws_sync, 1800);
	}

	function ws_role_filters() {
		return [
			["Role", "name", "not like", "Workspace: %"],
			["Role", "name", "not in", ["Guest", "Administrator", "All"]],
		];
	}

	function open_ws_access(name) {
		frappe.call({
			method: "gulf_erp_theme.workspace_access.get_access",
			args: { workspace: name },
			callback: function (r) {
				var a = r && r.message;
				if (!a) return;
				if (a.private) {
					frappe.msgprint(T("A private workspace is only shown to its owner."));
					return;
				}
				var specific = 'eval:doc.audience=="' + WS_SPECIFIC + '"';
				var d = new frappe.ui.Dialog({
					title: T("Who sees this workspace"),
					fields: [
						{
							fieldtype: "HTML",
							fieldname: "ge_ws_name",
							options: '<div class="ge-wsa-name">' + esc(T(a.workspace)) + "</div>",
						},
						{
							fieldtype: "Select",
							fieldname: "audience",
							label: T("Who Sees It"),
							options: [
								{ value: WS_EVERYONE, label: T("Everyone") },
								{ value: WS_SPECIFIC, label: T("Specific people") },
							],
							default: a.audience,
						},
						{
							fieldtype: "MultiSelectPills",
							fieldname: "users",
							label: T("People"),
							depends_on: specific,
							get_data: function (txt) {
								return frappe.db.get_link_options("User", txt, { user_type: "System User", enabled: 1 });
							},
						},
						{
							fieldtype: "MultiSelectPills",
							fieldname: "roles",
							label: T("Roles that see it"),
							description: T("Everyone with one of these roles sees it too."),
							depends_on: specific,
							get_data: function (txt) {
								return frappe.db.get_link_options("Role", txt, ws_role_filters());
							},
						},
						{
							fieldtype: "HTML",
							fieldname: "ge_ws_note",
							options:
								'<div class="ge-wsa-note">' +
								esc(T("Administrators, System Managers and Workspace Managers always see every workspace.")) +
								"</div>",
						},
					],
					primary_action_label: T("Save"),
					primary_action: function (v) {
						var users = v.users || [];
						var roles = v.roles || [];
						if (v.audience === WS_SPECIFIC && !users.length && !roles.length) {
							frappe.msgprint(T("Choose at least one person or role, or show the workspace to everyone."));
							return;
						}
						d.get_primary_btn().prop("disabled", true);
						frappe.call({
							method: "gulf_erp_theme.workspace_access.set_access",
							args: {
								workspace: a.workspace,
								audience: v.audience,
								users: JSON.stringify(users),
								roles: JSON.stringify(roles),
							},
							callback: function (res) {
								d.hide();
								if (!res || res.exc) return;
								frappe.show_alert({
									message:
										v.audience === WS_SPECIFIC
											? T("Saved. Only the chosen people and roles see this workspace.")
											: T("Saved. Everyone sees this workspace."),
									indicator: "blue",
								});
							},
							always: function () {
								d.get_primary_btn().prop("disabled", false);
							},
						});
					},
				});
				d.show();
				d.set_value("users", a.users || []);
				d.set_value("roles", a.roles || []);
				if (!a.enabled) {
					d.set_df_property(
						"ge_ws_note",
						"options",
						'<div class="ge-wsa-note">' +
							esc(T("Workspace Access is off in Gulf ERP Theme Settings, so this is saved but not applied yet.")) +
							"</div>"
					);
				}
			},
		});
	}

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ---------------------------------------------------- workspace builder */
	// "New workspace" on the apps screen, and "Edit workspace" on a workspace
	// made with it. One dialog: name, icon and colour, the documents and
	// reports it lists, and who sees it. The server writes what each Frappe
	// version expects (workspace_builder.py).
	var WSB_ICONS = [
		"layers", "grid", "bag", "cart", "store", "pkg", "truck", "calc", "receipt", "card",
		"ledger", "users", "contact", "kanban", "factory", "monitor", "chart", "book", "buoy", "wrench",
	];
	var WSB_COLORS = [
		"#1463FF", "#4F46E5", "#7C3AED", "#C026D3", "#DB2777", "#DC2626",
		"#E5600F", "#B7791F", "#8B5E34", "#0891B2", "#0E7490", "#475569",
	];

	function wsb_allowed() {
		return document.documentElement.classList.contains("gulf-wsb") && !!Number(settings().can_build_workspace);
	}

	// Lower case, and the Arabic letter forms people type interchangeably.
	function wsb_norm(s) {
		return String(s || "")
			.toLowerCase()
			.replace(/[ً-ْـ]/g, "")
			.replace(/[أإآ]/g, "ا")
			.replace(/ة/g, "ه")
			.replace(/ى/g, "ي");
	}

	// Without the Arabic article at the start of each word, so "عميل" and
	// "العميل" are the same word when ranking.
	function wsb_bare(s) {
		return String(s || "").replace(/(^|\s)ال(?=\S{2,})/g, "$1");
	}

	function wsb_picker_html(title, help, placeholder) {
		return (
			'<div class="ge-wsb-pick"><div class="ge-wsb-lbl">' +
			esc(title) +
			'</div><div class="ge-wsb-help">' +
			esc(help) +
			'</div><div class="ge-wsb-chips"></div><div class="ge-wsb-find">' +
			svg("search", 15) +
			'<input type="text" class="ge-wsb-q" autocomplete="off" spellcheck="false" placeholder="' +
			esc(placeholder) +
			'"></div><div class="ge-wsb-list" style="display:none"></div></div>'
		);
	}

	// A search box over every document type or report, in both languages,
	// with the chosen ones kept as chips in the order they were picked.
	function wsb_picker(root, items, chosen, none_text) {
		var by = {};
		items.forEach(function (it) {
			by[it.name] = it;
			it._l = wsb_bare(wsb_norm(it.label));
			it._n = wsb_norm(it.name);
			it._k = wsb_norm(it.label) + " " + it._l + " " + it._n + " " + wsb_norm(it.module || "");
		});
		// Best match first: the exact name, then names that start with what
		// was typed, then a word that starts with it, then anything else.
		var rank = function (it, q) {
			q = wsb_bare(q);
			if (it._l === q || it._n === q) return 0;
			if (it._l.indexOf(q) === 0 || it._n.indexOf(q) === 0) return 1;
			if ((" " + it._l).indexOf(" " + q) !== -1 || (" " + it._n).indexOf(" " + q) !== -1) return 2;
			return 3;
		};
		var chips = root.querySelector(".ge-wsb-chips");
		var input = root.querySelector(".ge-wsb-q");
		var list = root.querySelector(".ge-wsb-list");
		var label_of = function (n) {
			return by[n] ? by[n].label : n;
		};
		var draw_chips = function () {
			if (!chosen.length) {
				chips.innerHTML = '<span class="ge-wsb-none">' + esc(none_text) + "</span>";
				return;
			}
			chips.innerHTML = chosen
				.map(function (n) {
					return (
						'<span class="ge-wsb-chip" data-n="' +
						esc(n) +
						'"><span>' +
						esc(label_of(n)) +
						'</span><button type="button" class="ge-wsb-x" aria-label="' +
						esc(T("Remove")) +
						'">' +
						svg("x", 12, 2) +
						"</button></span>"
					);
				})
				.join("");
		};
		var draw_list = function () {
			var q = wsb_norm(input.value).replace(/^\s+|\s+$/g, "");
			if (!q) {
				list.innerHTML = "";
				list.style.display = "none";
				return;
			}
			var words = wsb_bare(q).split(/\s+/);
			var found = [];
			for (var i = 0; i < items.length; i++) {
				var ok = true;
				for (var w = 0; w < words.length; w++) {
					if (items[i]._k.indexOf(words[w]) === -1) {
						ok = false;
						break;
					}
				}
				if (ok) found.push({ it: items[i], r: rank(items[i], q) });
			}
			found.sort(function (a, b) {
				return a.r - b.r || a.it._l.length - b.it._l.length;
			});
			found = found.slice(0, 40).map(function (f) {
				return f.it;
			});
			list.style.display = "";
			if (!found.length) {
				list.innerHTML = '<div class="ge-wsb-empty">' + esc(T("Nothing found")) + "</div>";
				return;
			}
			list.innerHTML = found
				.map(function (it) {
					var on = chosen.indexOf(it.name) !== -1;
					var sub = it.label !== it.name ? it.name : "";
					if (it.module) sub = sub ? sub + " · " + it.module : it.module;
					return (
						'<button type="button" class="ge-wsb-opt' +
						(on ? " on" : "") +
						'" data-n="' +
						esc(it.name) +
						'"><span class="ge-wsb-ck">' +
						(on ? svg("check", 12, 2.4) : "") +
						'</span><span class="ge-wsb-ol"><span>' +
						esc(it.label) +
						"</span>" +
						(sub ? "<small>" + esc(sub) + "</small>" : "") +
						"</span></button>"
					);
				})
				.join("");
		};
		chips.addEventListener("click", function (e) {
			var x = closest(e.target, ".ge-wsb-x");
			if (!x) return;
			var i = chosen.indexOf(closest(x, ".ge-wsb-chip").getAttribute("data-n"));
			if (i !== -1) chosen.splice(i, 1);
			draw_chips();
			draw_list();
		});
		list.addEventListener("click", function (e) {
			var o = closest(e.target, ".ge-wsb-opt");
			if (!o) return;
			var n = o.getAttribute("data-n");
			var i = chosen.indexOf(n);
			if (i === -1) chosen.push(n);
			else chosen.splice(i, 1);
			draw_chips();
			draw_list();
			input.focus();
		});
		input.addEventListener("input", draw_list);
		input.addEventListener("keydown", function (e) {
			if (e.key === "Enter") {
				// Enter picks the first match instead of submitting the dialog.
				e.preventDefault();
				e.stopPropagation();
				var first = list.querySelector(".ge-wsb-opt:not(.on)");
				if (first) first.click();
			} else if (e.key === "Escape" && input.value) {
				e.stopPropagation();
				input.value = "";
				draw_list();
			}
		});
		draw_chips();
	}

	function wsb_look_html(st) {
		var h = '<div class="ge-wsb-look"><div class="ge-wsb-prev" style="--mc:' + st.color + '">';
		h += '<span class="ge-tic">' + svg(st.icon, 30, 1.6) + '</span><span class="ge-tl"></span></div>';
		h += '<div class="ge-wsb-sets"><div class="ge-wsb-lbl">' + esc(T("Icon")) + '</div><div class="ge-wsb-icons">';
		WSB_ICONS.forEach(function (ic) {
			h +=
				'<button type="button" class="ge-wsb-ic' +
				(ic === st.icon ? " on" : "") +
				'" data-ic="' +
				ic +
				'" aria-label="' +
				ic +
				'">' +
				svg(ic, 18) +
				"</button>";
		});
		h += '</div><div class="ge-wsb-lbl">' + esc(T("Colour")) + '</div><div class="ge-wsb-colors">';
		WSB_COLORS.forEach(function (c) {
			h +=
				'<button type="button" class="ge-wsb-co' +
				(c === st.color ? " on" : "") +
				'" data-co="' +
				c +
				'" style="--mc:' +
				c +
				'" aria-label="' +
				c +
				'"></button>';
		});
		return h + "</div></div></div>";
	}

	function open_ws_builder(name) {
		if (!wsb_allowed() || !window.frappe || !frappe.xcall) return;
		var calls = [frappe.xcall("gulf_erp_theme.workspace_builder.get_options")];
		if (name) calls.push(frappe.xcall("gulf_erp_theme.workspace_builder.get_workspace", { workspace: name }));
		Promise.all(calls)
			.then(function (r) {
				wsb_dialog(r[0] || {}, name ? r[1] : null);
			})
			.catch(function () {
				/* the server already showed the reason */
			});
	}

	function wsb_dialog(opts, ws) {
		var st = {
			icon: (ws && ws.icon) || "layers",
			color: (ws && ws.color) || "#1463FF",
			icon_set: !!(ws && ws.icon),
			color_set: !!(ws && ws.color),
			docs: ((ws && ws.doctypes) || []).slice(),
			reports: ((ws && ws.reports) || []).slice(),
			cards: ((ws && ws.number_cards) || []).slice(),
		};
		// v13 workspaces have no number cards, so the server sends none.
		var has_cards = !!opts.number_cards;
		var specific = 'eval:doc.audience=="' + WS_SPECIFIC + '"';
		var d = new frappe.ui.Dialog({
			title: ws ? T("Edit workspace") : T("New workspace"),
			size: "large",
			fields: [
				{ fieldtype: "Section Break", label: T("Name and look") },
				{
					fieldtype: "Data",
					fieldname: "ws_name",
					label: T("Workspace name"),
					reqd: 1,
					read_only: ws ? 1 : 0,
					default: ws ? ws.name : "",
					description: ws
						? T("The name cannot be changed. Create a new workspace to use another name.")
						: T("For example: Sales Team, Riyadh Branch or Accounts Desk."),
				},
				{ fieldtype: "HTML", fieldname: "ge_look" },
				{ fieldtype: "Section Break", label: T("What it shows") },
				{ fieldtype: "HTML", fieldname: "ge_docs" },
				{ fieldtype: "HTML", fieldname: "ge_reports" },
				{ fieldtype: "HTML", fieldname: "ge_cards" },
				{ fieldtype: "Section Break", label: T("Who sees it") },
				{
					fieldtype: "Select",
					fieldname: "audience",
					label: T("Who Sees It"),
					options: [
						{ value: WS_EVERYONE, label: T("Everyone") },
						{ value: WS_SPECIFIC, label: T("Specific people") },
					],
					default: (ws && ws.audience) || WS_EVERYONE,
				},
				{
					fieldtype: "MultiSelectPills",
					fieldname: "users",
					label: T("People"),
					depends_on: specific,
					get_data: function (txt) {
						return frappe.db.get_link_options("User", txt, { user_type: "System User", enabled: 1 });
					},
				},
				{
					fieldtype: "MultiSelectPills",
					fieldname: "roles",
					label: T("Roles that see it"),
					description: T("Everyone with one of these roles sees it too."),
					depends_on: specific,
					get_data: function (txt) {
						return frappe.db.get_link_options("Role", txt, ws_role_filters());
					},
				},
				{
					fieldtype: "HTML",
					fieldname: "ge_ws_note",
					options:
						'<div class="ge-wsa-note">' +
						esc(T("Administrators, System Managers and Workspace Managers always see every workspace.")) +
						"</div>",
				},
			],
			primary_action_label: ws ? T("Save") : T("Create workspace"),
			primary_action: function (v) {
				var nm = String(v.ws_name || "").replace(/^\s+|\s+$/g, "");
				var users = v.users || [];
				var roles = v.roles || [];
				if (!st.docs.length && !st.reports.length) {
					frappe.msgprint(T("Choose at least one document or report."));
					return;
				}
				if (v.audience === WS_SPECIFIC && !users.length && !roles.length) {
					frappe.msgprint(T("Choose at least one person or role, or show the workspace to everyone."));
					return;
				}
				d.get_primary_btn().prop("disabled", true);
				frappe.call({
					method: "gulf_erp_theme.workspace_builder.save_workspace",
					args: {
						name: nm,
						icon: st.icon,
						color: st.color,
						doctypes: JSON.stringify(st.docs),
						reports: JSON.stringify(st.reports),
						audience: v.audience,
						users: JSON.stringify(users),
						roles: JSON.stringify(roles),
						editing: ws ? 1 : 0,
						number_cards: JSON.stringify(has_cards ? st.cards : []),
					},
					freeze: true,
					freeze_message: ws ? T("Saving the workspace") : T("Creating the workspace"),
					callback: function (res) {
						if (!res || res.exc || !res.message) return;
						d.hide();
						frappe.show_alert({
							message: ws ? T("Workspace saved.") : T("Workspace created."),
							indicator: "blue",
						});
						// A full load, so the menus and the apps screen pick it up.
						session_set("gulf_cur_module", res.message.name);
						setTimeout(function () {
							window.location.href = base() + "/" + slug(res.message.name);
						}, 500);
					},
					always: function () {
						d.get_primary_btn().prop("disabled", false);
					},
				});
			},
			secondary_action_label: ws ? T("Delete workspace") : undefined,
			secondary_action: ws
				? function () {
						frappe.confirm(
							T("Delete this workspace? The documents and reports it lists are not affected."),
							function () {
								frappe
									.xcall("gulf_erp_theme.workspace_builder.delete_workspace", { workspace: ws.name })
									.then(function () {
										d.hide();
										frappe.show_alert({ message: T("Workspace deleted."), indicator: "blue" });
										setTimeout(function () {
											window.location.href =
												base() + (Number(settings().apps_home) ? "/gulf-apps" : "");
										}, 500);
									});
							}
						);
				  }
				: undefined,
		});

		var look = d.fields_dict.ge_look.$wrapper[0];
		var draw_look = function () {
			look.innerHTML = wsb_look_html(st);
			var tl = look.querySelector(".ge-tl");
			tl.textContent = String(d.get_value("ws_name") || (ws && ws.name) || "").trim() || T("New workspace");
		};
		look.addEventListener("click", function (e) {
			var ic = closest(e.target, ".ge-wsb-ic");
			var co = closest(e.target, ".ge-wsb-co");
			if (ic) {
				st.icon = ic.getAttribute("data-ic");
				st.icon_set = true;
			} else if (co) {
				st.color = co.getAttribute("data-co");
				st.color_set = true;
			} else return;
			draw_look();
		});
		if (!ws && d.fields_dict.ws_name.$input) {
			// Until an icon or colour is picked, follow the name the way the
			// apps screen does (a "Sales" workspace gets the sales bag).
			d.fields_dict.ws_name.$input.on("input", function () {
				var v = String(d.get_value("ws_name") || this.value || "");
				var id = identity({ name: v, label: v });
				if (!st.icon_set) st.icon = id.icon;
				if (!st.color_set && WSB_COLORS.indexOf(id.color) !== -1) st.color = id.color;
				var tl = look.querySelector(".ge-tl");
				if (!st.icon_set || !st.color_set) draw_look();
				else if (tl) tl.textContent = String(this.value || "").trim() || T("New workspace");
			});
		}

		d.fields_dict.ge_docs.$wrapper.html(
			wsb_picker_html(
				T("Documents"),
				T("Lists the workspace opens, such as Sales Invoice or Customer. They appear in the order you pick them."),
				T("Search documents, in Arabic or English")
			)
		);
		d.fields_dict.ge_reports.$wrapper.html(
			wsb_picker_html(
				T("Reports"),
				T("Reports listed under their own heading."),
				T("Search reports, in Arabic or English")
			)
		);
		wsb_picker(d.fields_dict.ge_docs.$wrapper[0], opts.doctypes || [], st.docs, T("No documents chosen yet."));
		wsb_picker(d.fields_dict.ge_reports.$wrapper[0], opts.reports || [], st.reports, T("No reports chosen yet."));
		if (has_cards) {
			d.fields_dict.ge_cards.$wrapper.html(
				wsb_picker_html(
					T("Number cards"),
					T("Figures shown at the top of the workspace, such as unpaid invoices or sales this month. Up to eight."),
					T("Search number cards, in Arabic or English")
				)
			);
			wsb_picker(d.fields_dict.ge_cards.$wrapper[0], opts.number_cards || [], st.cards, T("No number cards chosen yet."));
		}
		d.$wrapper.addClass("ge-wsb-dialog");
		d.show();
		draw_look();
		if (ws) {
			d.set_value("users", ws.users || []);
			d.set_value("roles", ws.roles || []);
		}
		if (ws && !ws.enabled) {
			d.set_df_property(
				"ge_ws_note",
				"options",
				'<div class="ge-wsa-note">' +
					esc(T("Workspace Access is off in Gulf ERP Theme Settings, so this is saved but not applied yet.")) +
					"</div>"
			);
		}
	}

	function setup_ws_access() {
		if (S.ws_started || !window.frappe || !frappe.router) return;
		S.ws_started = true;
		if (frappe.router && frappe.router.on) frappe.router.on("change", ws_sync_later);
		if (window.jQuery) jQuery(document).on("page-change", ws_sync_later);
		ws_sync_later();
	}

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ---------------------------------------------------- workspace headers */
	// Section headers on a workspace page ("Reports & Masters") are stored as
	// HTML inside the workspace. v14 shows them untranslated, and v15 and v16
	// look them up with the ampersand still escaped, so many stay English.
	// Gulf translates the words that are shown and, when the workspace is
	// saved, hands back the stored text unchanged unless the user edited the
	// header. Saving a workspace in Arabic then no longer stores the Arabic.
	function ws_header_text(node) {
		var raw = node.nodeValue || "";
		var t = raw.replace(/^\s+|\s+$/g, "");
		if (!t || !/[A-Za-z]/.test(t)) return null;
		var tr = T(t);
		if (tr === t) tr = T(esc(t));
		if (tr === t || tr === esc(t)) return null;
		return raw.replace(t, tr);
	}
	function text_nodes(root) {
		var out = [];
		var walker = document.createTreeWalker(root, 4, null, false);
		while (walker.nextNode()) {
			if (/\S/.test(walker.currentNode.nodeValue || "")) out.push(walker.currentNode);
		}
		return out;
	}
	function patch_ws_headers() {
		var blocks = window.frappe && frappe.workspace_block && frappe.workspace_block.blocks;
		var H = blocks && blocks.header;
		if (!H || !H.prototype || H.prototype._ge_patched || !Object.getOwnPropertyDescriptor) return;
		var desc = Object.getOwnPropertyDescriptor(H.prototype, "data");
		if (!desc || !desc.get || !desc.set) return;
		H.prototype._ge_patched = true;
		// The stored text for what the block shows now.
		function stored_text(blk, text) {
			if (blk._ge_shown == null || typeof text !== "string") return text;
			if (text === blk._ge_shown) return blk._ge_orig;
			// Changed in edit mode (a new size, or new words): put the stored
			// words back wherever the translation is still shown.
			var box = document.createElement("div");
			box.innerHTML = text;
			var nodes = text_nodes(box);
			var back = blk._ge_back || {};
			for (var i = 0; i < nodes.length; i++) {
				var v = nodes[i].nodeValue;
				if (Object.prototype.hasOwnProperty.call(back, v)) nodes[i].nodeValue = back[v];
			}
			return box.innerHTML;
		}
		// The editor saves a block through save(), other code reads .data.
		var save = H.prototype.save;
		if (typeof save === "function") {
			H.prototype.save = function () {
				var out = save.apply(this, arguments);
				if (out && typeof out.text === "string") {
					var shown = this._ge_shown == null ? null : this._ge_shown.replace(/&nbsp;/gi, "");
					out.text = out.text === shown ? this._ge_orig : stored_text(this, out.text);
				}
				return out;
			};
		}
		Object.defineProperty(H.prototype, "data", {
			configurable: true,
			get: function () {
				var d = desc.get.call(this);
				if (d) d.text = stored_text(this, d.text);
				return d;
			},
			set: function (data) {
				desc.set.call(this, data);
				this._ge_shown = null;
				this._ge_back = null;
				var el = this._element;
				if (!el || !data || data.text === undefined) return;
				if (!document.documentElement.classList.contains("gulf")) return;
				var orig = String(data.text || "");
				var probe = document.createElement("div");
				probe.innerHTML = orig;
				var shown = text_nodes(el);
				for (var i = 0; i < shown.length; i++) {
					var tr = ws_header_text(shown[i]);
					if (tr != null) shown[i].nodeValue = tr;
				}
				// Only take over when the words shown differ from the stored ones
				// (translated by Gulf here, or by Frappe itself on v15 and v16).
				if ((el.textContent || "") === (probe.textContent || "")) return;
				var stored = text_nodes(probe);
				var back = {};
				if (stored.length === shown.length) {
					for (var j = 0; j < shown.length; j++) {
						if (shown[j].nodeValue !== stored[j].nodeValue) back[shown[j].nodeValue] = stored[j].nodeValue;
					}
				}
				this._ge_orig = orig;
				this._ge_shown = el.innerHTML;
				this._ge_back = back;
			},
		});
	}
	patch_ws_headers();

// Adapted from Lumen Theme 0.9.1. SPDX-License-Identifier: AGPL-3.0-only
	/* ---------------------------------------------------------------- init */

	window.gulf_erp_theme = {
		apply: apply,
		render_home: render_home,
		open_appearance: open_appearance,
		open_ws_builder: open_ws_builder,
		refresh_nav: function () {
			S.nav = null;
			render_nav();
		},
	};

	var home_done = false;
	function on_ready() {
		apply();
		add_user_menu_item();
		setup_guide();
		setup_qf();
		setup_search();
		setup_ws_access();
		track_lists();
		patch_ws_headers();
		render_notice();
	}
	// Only redirect once the desk has finished starting, otherwise the
	// router's own first route can land on top of it.
	function on_app_ready() {
		on_ready();
		if (!home_done && window.frappe && frappe.boot && frappe.boot.versions) {
			home_done = true;
			maybe_open_home();
		}
	}

	// Boot data is already on the page when this file loads on v14+. On v13 it
	// can arrive slightly later, so apply again once the desk is ready.
	apply();
	if (window.jQuery) {
		jQuery(function () {
			on_ready();
		});
		jQuery(document).on("startup", function () {
			on_ready();
		});
		jQuery(document).on("app_ready", function () {
			on_app_ready();
		});
		jQuery(document).on("toolbar_setup", function () {
			add_user_menu_item();
			mount_lang();
			if (nav_enabled()) render_nav();
		});
	}

})();
