# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
"""0.9.1: Improved Arabic Translation is now on by default. Switch it on once
for sites that already had the app, where it was off by default. The records
are added by the after_migrate step that runs after the patches. An admin can
still switch it off afterwards, and this patch never runs again."""

import frappe


def execute():
    frappe.db.set_single_value("Gulf ERP Theme Settings", "arabic_fixes", 1)
