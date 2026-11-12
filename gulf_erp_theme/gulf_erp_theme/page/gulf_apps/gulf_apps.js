/* Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only */
// The apps home screen. All drawing lives in public/js/gulf_erp_theme.js so the
// top bar, side menu and home share one module list.
frappe.pages["gulf-apps"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: __("Apps"), single_column: true });
	if (window.gulf_erp_theme && window.gulf_erp_theme.render_home) {
		window.gulf_erp_theme.render_home(wrapper);
	}
};

frappe.pages["gulf-apps"].on_page_show = function (wrapper) {
	if (window.gulf_erp_theme && window.gulf_erp_theme.render_home) {
		window.gulf_erp_theme.render_home(wrapper);
	}
};
