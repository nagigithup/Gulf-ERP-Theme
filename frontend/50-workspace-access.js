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
