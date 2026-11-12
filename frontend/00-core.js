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
