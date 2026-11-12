# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
from frappe.model.document import Document


class GulfWorkspaceAccess(Document):
    def validate(self):
        from gulf_erp_theme.workspace_access import validate_access

        validate_access(self)

    def on_update(self):
        from gulf_erp_theme.workspace_access import apply

        apply(self)

    def on_trash(self):
        from gulf_erp_theme.workspace_access import restore

        restore(self)
