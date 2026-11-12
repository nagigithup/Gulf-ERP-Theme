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
