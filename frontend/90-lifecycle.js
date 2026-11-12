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
