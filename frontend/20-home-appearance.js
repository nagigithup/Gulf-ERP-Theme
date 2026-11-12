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
