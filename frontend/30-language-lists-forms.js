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
