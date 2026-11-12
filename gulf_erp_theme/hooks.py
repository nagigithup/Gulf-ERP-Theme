# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
# Frappe v13 treats every public name in this file as a hook and caches it in
# redis, which cannot hold modules. Keep imports private with a leading "_".
import hashlib as _hashlib
import os as _os

from gulf_erp_theme import __version__ as _version

app_name = "gulf_erp_theme"
app_title = "Gulf ERP Theme"
app_publisher = "Gulf ERP Theme contributors"
app_description = "Independent bilingual theme with Lumen 0.9.1 feature parity for Frappe/ERPNext v16"
required_apps = ["erpnext"]
app_license = "AGPL-3.0-only"


def _asset(rel):
    """Asset path with a cache key taken from the file's contents, so a
    proxy or browser never keeps an old copy after an update."""
    # rel is one of the fixed asset names below, never user input.
    path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "public", rel)
    try:
        with open(path, "rb") as f:  # nosemgrep
            key = _hashlib.md5(f.read()).hexdigest()[:10]
    except Exception:
        key = _version
    return "/assets/gulf_erp_theme/" + rel + "?v=" + key


# Plain files, not esbuild bundles, so the same paths load on every version:
# v13 has no bundler, v14+ passes any "/assets/..." path through unchanged.
# The stylesheet folder is not called "css": for right to left languages v13
# rewrites "/css/" in every stylesheet path to "/css-rtl/", which does not
# exist for this app, so Arabic users got no theme styles on v13.
app_include_css = [_asset("styles/gulf_erp_theme.css")]
app_include_js = [_asset("js/gulf_erp_theme.js")]

# Sends the admin's theme settings and the user's appearance to the browser
# with the rest of the boot data.
boot_session = "gulf_erp_theme.settings.boot_session"

# Settings added by an update get their default stored, so the settings form
# shows what is in effect. Improved Arabic translation: new corrections
# arrive with app updates, and the records Gulf created are removed if the
# app is uninstalled.
after_migrate = [
	"gulf_erp_theme.settings.fill_missing_settings",
	"gulf_erp_theme.arabic_fixes.after_migrate",
	"gulf_erp_theme.workspace_access.after_migrate",
]

# Who sees a workspace. Deleting a workspace removes its Gulf access record,
# and the workspace page refuses a workspace hidden from the user.
doc_events = {
	"Workspace": {"on_trash": "gulf_erp_theme.workspace_access.on_workspace_trash"},
}
override_whitelisted_methods = {
	"frappe.desk.desktop.get_desktop_page": "gulf_erp_theme.workspace_access.get_desktop_page",
}
before_uninstall = "gulf_erp_theme.install.before_uninstall"
# Improved Arabic translation is on by default, so a new install applies it.
before_install = "gulf_erp_theme.install.before_install"
after_install = "gulf_erp_theme.install.after_install"

# Branded login page: the class and the inline styles go on the login page
# only, while the setting is on. Other website pages are not touched.
update_website_context = "gulf_erp_theme.login.update_website_context"
