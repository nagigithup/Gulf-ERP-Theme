# SPDX-License-Identifier: AGPL-3.0-or-later
"""Reversible theme lifecycle; never uninstall or disable another application."""
import frappe
from frappe import _
from frappe.utils import cint

def before_install():
    if "lumen_theme" in frappe.get_installed_apps():
        value = frappe.db.get_single_value("Lumen Theme Settings", "enabled")
        if value is None or cint(value):
            frappe.throw(_("Install Gulf ERP Theme on a separate test site, or disable Lumen Theme first. Two navigation shells cannot be enabled together."))

def after_install():
    from gulf_erp_theme.arabic_fixes import after_install as apply_translations
    from gulf_erp_theme.settings import fill_missing_settings
    fill_missing_settings()
    apply_translations()
    frappe.clear_cache()

def before_uninstall():
    # Frappe may remove our access records after this hook. Restore first.
    # Preserve any administrator changes made after Gulf last applied access.
    from gulf_erp_theme import workspace_access
    from gulf_erp_theme.arabic_fixes import remove_fixes
    workspace_access.restore_all()
    remove_fixes()
    frappe.clear_cache()
