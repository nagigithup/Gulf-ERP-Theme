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
