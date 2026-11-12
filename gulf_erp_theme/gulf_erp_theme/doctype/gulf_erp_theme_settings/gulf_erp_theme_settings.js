/* Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only */
frappe.ui.form.on("Gulf ERP Theme Settings", {
	refresh(frm) {
		frappe
			.xcall("gulf_erp_theme.api.appearance_stats")
			.then((r) => {
				const n = (r && r.users) || 0;
				frm.set_df_property(
					"reset_all_users",
					"description",
					__(
						"Users who picked their own appearance keep it. This clears their choices so the defaults apply to everyone."
					) +
						" " +
						__("{0} users have their own appearance.", [n])
				);
			})
			.catch(() => {});
	},

	reset_all_users(frm) {
		frappe.confirm(
			__("Clear every user's own appearance so the defaults apply to everyone?"),
			() => {
				frappe.xcall("gulf_erp_theme.api.reset_all_users").then((r) => {
					frappe.show_alert({
						message: __("{0} users reset to the default appearance", [(r && r.cleared) || 0]),
						indicator: "blue",
					});
					frm.refresh();
				});
			}
		);
	},

	manage_workspace_access() {
		frappe.set_route("List", "Gulf Workspace Access");
	},

	create_workspace(frm) {
		const lt = window.gulf_erp_theme;
		if (frm.is_dirty()) {
			frappe.msgprint(__("Save the settings first, then create the workspace."));
		} else if (lt && lt.open_ws_builder && document.documentElement.classList.contains("gulf-wsb")) {
			lt.open_ws_builder();
		} else {
			frappe.msgprint(__("Turn on Gulf ERP Theme and the Workspace Builder, save, then try again."));
		}
	},

	after_save() {
		// Reload so this tab picks up the new defaults through the same path
		// every other user takes on their next page load.
		frappe.show_alert({ message: __("Theme settings applied"), indicator: "blue" });
		setTimeout(() => {
			// Wait for any message from the server to be read first.
			const d = window.cur_dialog;
			if (d && d.display) d.onhide = () => window.location.reload();
			else window.location.reload();
		}, 800);
	},
});

// Simpler forms: pick the fields to hide and the roles that keep them,
// from the form's own field list, instead of typing field names.
const gulf_lines = (text) =>
	(text || "")
		.split(/[\n,]/)
		.map((s) => s.trim())
		.filter(Boolean);

frappe.ui.form.on("Gulf Form Rule", {
	choose(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.form) {
			frappe.msgprint(__("Choose the form first."));
			return;
		}
		frappe.model.with_doctype(row.form, () => {
			const hidden = gulf_lines(row.hidden_fields);
			const skip = ["Column Break", "Tab Break", "HTML", "Button", "Heading", "Fold"];
			const options = (frappe.get_meta(row.form).fields || [])
				.filter((df) => df.fieldname && df.label && !skip.includes(df.fieldtype) && !df.hidden)
				.map((df) => ({
					label:
						(df.fieldtype === "Section Break" ? "[" + __("Section") + "] " : "") +
						__(df.label) +
						" (" +
						df.fieldname +
						")",
					value: df.fieldname,
					checked: hidden.includes(df.fieldname),
				}));
			const d = new frappe.ui.Dialog({
				title: __("Simpler {0} form", [__(row.form)]),
				size: "large",
				fields: [
					{
						fieldtype: "MultiCheck",
						fieldname: "fields",
						label: __("Fields to Hide"),
						options: options,
						columns: 2,
					},
					{
						fieldtype: "MultiSelectPills",
						fieldname: "roles",
						label: __("Still Shown To"),
						description: __("People with one of these roles keep seeing the fields. System Managers always do."),
						get_data: (txt) => frappe.db.get_link_options("Role", txt),
					},
				],
				primary_action_label: __("Use These Fields"),
				primary_action(v) {
					frappe.model.set_value(cdt, cdn, "hidden_fields", (v.fields || []).join("\n"));
					frappe.model.set_value(cdt, cdn, "visible_to", (v.roles || []).join("\n"));
					d.hide();
				},
			});
			d.show();
			d.set_value("roles", gulf_lines(row.visible_to));
		});
	},
});
