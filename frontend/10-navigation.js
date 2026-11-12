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
