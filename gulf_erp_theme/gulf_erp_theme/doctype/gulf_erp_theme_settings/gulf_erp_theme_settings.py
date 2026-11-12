# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


def clean_page(page):
    """A page of the desk, written as it follows /app/ (or /desk/ on v16).
    Full addresses and other sites are refused."""
    page = (page or "").strip()
    if not page:
        return ""
    if "://" in page or page.startswith("//") or page.lower().startswith(("javascript:", "data:")):
        frappe.throw(_("Write a page of the desk, such as point-of-sale, not a web address."))
    for prefix in ("/app/", "/desk/", "app/", "desk/"):
        if page.startswith(prefix):
            page = page[len(prefix):]
            break
    return page.strip("/")


class GulfERPThemeSettings(Document):
    def validate(self):
        if self.brand_color and not HEX_COLOR.match(self.brand_color):
            frappe.throw(_("Brand Colour must be a hex colour such as #1463FF"))
        for row in self.get("module_colors") or []:
            if row.color and not HEX_COLOR.match(row.color):
                frappe.throw(_("Row {0}: colour must be a hex colour such as #1463FF").format(row.idx))
            if row.module:
                row.module = row.module.strip()
        if self.get("login_image") and self.login_image.startswith("/private/"):
            # Visitors are not signed in yet, so a private file never shows.
            frappe.throw(_("The login page image must be a public file. Upload it again with Private unticked."))
        for row in self.get("landing_pages") or []:
            row.page = clean_page(row.page)
            if not row.workspace and not row.page:
                frappe.throw(_("Landing Pages row {0}: choose a workspace or write a page.").format(row.idx))

    def on_update(self):
        before = self.get_doc_before_save()
        was_on = cint(before.arabic_fixes) if before else 0
        if cint(self.arabic_fixes) != was_on:
            from gulf_erp_theme.arabic_fixes import sync

            result = sync(cint(self.arabic_fixes))
            if cint(self.arabic_fixes):
                frappe.msgprint(
                    _("Improved Arabic is on. {0} corrections added, {1} kept as your own.").format(
                        result.get("added", 0), result.get("skipped", 0)
                    )
                )
            else:
                frappe.msgprint(
                    _("Improved Arabic is off. {0} corrections removed, {1} kept because they were edited.").format(
                        result.get("removed", 0), result.get("kept", 0)
                    )
                )

        # Workspace access is in effect only while the theme is on, so turning
        # either off gives every workspace back its own roles.
        def ws_on(doc):
            return bool(cint(doc.enabled) and cint(doc.workspace_access))

        if not before or ws_on(self) != ws_on(before):
            from gulf_erp_theme.workspace_access import on_settings_change

            on_settings_change(ws_on(self))

        # Boot data is cached per user. Drop it so every user picks up the
        # new settings on their next page load.
        cache = frappe.cache() if callable(frappe.cache) else frappe.cache
        cache.delete_key("bootinfo")
