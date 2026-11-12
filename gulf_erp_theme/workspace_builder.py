# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
"""Create a workspace in one step.

The builder asks for a name, an icon and a colour, the documents and reports
the workspace lists, and who sees it. It then writes what each Frappe version
expects:

v13 to v15: a public Workspace with a "Documents" card and a "Reports" card.
v14 and v15 need no module. v13 needs one, and allows a module only to people
who read a document type in it, so v13 files the workspace under Desk.

v16: the menu of a module comes from the module, not from the workspace. The
new module gets its own page (Frappe creates it with the module), and the
chosen documents and reports are added to the module's menu in the site's own
layer, the same place Frappe writes a link for a workspace created on the site.

Icon and colour are stored in Gulf ERP Theme Settings (Module Colours), which the
apps screen and the menus already read. Who sees the workspace is stored as a
Gulf Workspace Access record, marked as built by Gulf so the workspace can be
edited or deleted later from the same dialog.
"""

import json
import re
from typing import Optional, Union

import frappe
from frappe import _
from frappe.utils import cint

from gulf_erp_theme import workspace_access as wa

SETTINGS = "Gulf ERP Theme Settings"
HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
V13_MODULE = "Desk"
DOCS_CARD = "Documents"
REPORTS_CARD = "Reports"
MAX_LINKS = 60

# Gulf icon name: (Frappe v13 to v15 icon, Frappe v16 icon). The apps screen
# draws the Gulf icon. Frappe's own sidebar draws the other.
ICONS = {
    "grid": ("getting-started", "layout-grid"),
    "layers": ("folder-normal", "layers"),
    "bag": ("sell", "shopping-bag"),
    "cart": ("buying", "shopping-cart"),
    "store": ("retail", "store"),
    "pkg": ("stock", "package"),
    "truck": ("stock", "truck"),
    "calc": ("accounting", "calculator"),
    "receipt": ("income", "receipt"),
    "card": ("money-coins-1", "credit-card"),
    "ledger": ("accounting", "book-open"),
    "users": ("users", "users"),
    "contact": ("crm", "contact"),
    "kanban": ("project", "folder-kanban"),
    "factory": ("organization", "factory"),
    "monitor": ("assets", "monitor"),
    "chart": ("milestone", "chart-column"),
    "book": ("file", "book"),
    "buoy": ("support", "life-buoy"),
    "wrench": ("tool", "wrench"),
}


# ------------------------------------------------------------------ helpers


def enabled():
    try:
        from gulf_erp_theme.settings import get_theme_settings

        s = get_theme_settings()
    except Exception:
        return False
    return bool(cint(s.get("enabled")) and cint(s.get("workspace_builder")))


def workspace_meta():
    return frappe.get_meta("Workspace")


def is_v14_plus():
    return bool(workspace_meta().has_field("public"))


def is_v16():
    """v16 workspaces carry a type (Workspace, Link or URL)."""
    return bool(workspace_meta().has_field("type"))


def can_build(user=None):
    """Creating a workspace everyone can see is the Workspace Manager's job
    on v14 and later, the same rule Frappe applies. v13 has no such role
    check, so System Managers may build there too."""
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    roles = set(frappe.get_roles(user))
    if "Workspace Manager" in roles:
        return True
    return not is_v14_plus() and "System Manager" in roles


def check_builder():
    if not enabled():
        frappe.throw(_("The workspace builder is turned off in Gulf ERP Theme Settings."))
    if not can_build():
        frappe.throw(
            _("You need the Workspace Manager role to create a workspace others can see."),
            frappe.PermissionError,
        )


def _list(value):
    if not value:
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            value = [v.strip() for v in value.split(",")]
    out = []
    for v in value or []:
        v = (v or "").strip() if isinstance(v, str) else ""
        if v and v not in out:
            out.append(v)
    return out


def _hash():
    return frappe.generate_hash(length=10)


def is_built(name):
    return name in wa.built_workspaces()


# ---------------------------------------------------------------- options


@frappe.whitelist()
def get_options():
    """Every document type and report the builder can list, with the name in
    the user's language so the picker searches in both."""
    check_builder()
    doctypes = []
    for d in frappe.get_all(
        "DocType",
        filters={"istable": 0},
        fields=["name", "module", "issingle"],
        order_by="name asc",
    ):
        doctypes.append({"name": d.name, "label": _(d.name), "module": _(d.module or ""), "single": cint(d.issingle)})
    reports = []
    for r in frappe.get_all(
        "Report",
        filters={"disabled": 0},
        fields=["name", "ref_doctype", "module"],
        order_by="name asc",
    ):
        reports.append({"name": r.name, "label": _(r.name), "module": _(r.module or ""), "doctype": r.ref_doctype or ""})
    return {
        "doctypes": doctypes,
        "reports": reports,
        "number_cards": number_card_options() if supports_cards() else None,
        "icons": list(ICONS),
    }


def supports_cards():
    """Number cards on a workspace page exist from v14."""
    return bool(workspace_meta().has_field("number_cards"))


def number_card_options():
    """Cards everyone can see: the ones apps ship and the ones made public."""
    cards = []
    try:
        rows = frappe.get_all(
            "Number Card",
            or_filters={"is_public": 1, "is_standard": 1},
            fields=["name", "label", "document_type", "module"],
            order_by="name asc",
        )
    except Exception:
        rows = []
    for r in rows:
        label = _(r.label or r.name)
        module = _(r.document_type or r.module or "")
        cards.append({"name": r.name, "label": label, "module": module})
    return cards


@frappe.whitelist()
def get_workspace(workspace: str):
    """What the dialog needs to edit a workspace made with the builder."""
    check_builder()
    if not frappe.db.exists("Workspace", workspace):
        frappe.throw(_("Workspace {0} not found").format(workspace))
    if not is_built(workspace):
        frappe.throw(_("Only workspaces created with Gulf can be edited here."))
    doc = frappe.get_doc("Workspace", workspace)
    doctypes, reports = [], []
    for row in doc.get("links") or []:
        if row.type != "Link" or not row.link_to:
            continue
        if row.link_type == "DocType" and row.link_to not in doctypes:
            doctypes.append(row.link_to)
        elif row.link_type == "Report" and row.link_to not in reports:
            reports.append(row.link_to)
    cards = [r.number_card_name for r in (doc.get("number_cards") or []) if r.number_card_name]
    look = module_look(workspace)
    out = access_of(workspace)
    out.update(
        {
            "name": workspace,
            "icon": look.get("icon") or "",
            "color": look.get("color") or "",
            "doctypes": doctypes,
            "reports": reports,
            "number_cards": cards,
        }
    )
    return out


def access_of(workspace):
    out = {"audience": wa.EVERYONE, "users": [], "roles": [], "enabled": wa.enabled()}
    if wa.table_exists() and frappe.db.exists(wa.DT, workspace):
        rec = frappe.get_doc(wa.DT, workspace)
        out["audience"] = rec.audience
        out["users"] = [r.user for r in rec.users if r.user]
        out["roles"] = [r.role for r in rec.roles if r.role]
    return out


# ------------------------------------------------------------ icon, colour


def module_look(name):
    try:
        row = frappe.db.get_value(
            "Gulf Module Color",
            {"parent": SETTINGS, "module": name},
            ["color", "icon"],
            as_dict=True,
        )
    except Exception:
        row = None
    return row or {}


def set_module_look(name, icon, color):
    """Store the workspace's icon and colour as a Module Colours row."""
    try:
        settings = frappe.get_doc(SETTINGS)
    except Exception:
        return
    row = None
    for r in settings.get("module_colors") or []:
        if (r.module or "").strip() == name:
            row = r
            break
    if row is None:
        row = settings.append("module_colors", {"module": name})
    row.color = color
    if row.meta.has_field("icon"):
        row.icon = icon
    settings.save(ignore_permissions=True)


def drop_module_look(name):
    try:
        settings = frappe.get_doc(SETTINGS)
    except Exception:
        return
    keep = [r for r in settings.get("module_colors") or [] if (r.module or "").strip() != name]
    if len(keep) == len(settings.get("module_colors") or []):
        return
    settings.set("module_colors", keep)
    settings.save(ignore_permissions=True)


# --------------------------------------------------------------- contents


def report_is_query(report):
    return frappe.db.get_value("Report", report, "report_type") in (
        "Query Report",
        "Script Report",
        "Custom Report",
    )


def link_rows(doctypes, reports):
    rows = []
    if doctypes:
        rows.append({"type": "Card Break", "label": DOCS_CARD, "link_count": len(doctypes)})
        for dt in doctypes:
            rows.append(
                {
                    "type": "Link",
                    "label": dt,
                    "link_type": "DocType",
                    "link_to": dt,
                    "onboard": 0,
                    "is_query_report": 0,
                }
            )
    if reports:
        rows.append({"type": "Card Break", "label": REPORTS_CARD, "link_count": len(reports)})
        for r in reports:
            rows.append(
                {
                    "type": "Link",
                    "label": r,
                    "link_type": "Report",
                    "link_to": r,
                    "onboard": 0,
                    "is_query_report": 1 if report_is_query(r) else 0,
                }
            )
    return rows


def content_blocks(doctypes, reports, cards=None):
    """Page layout for v14 and later: number cards on top, then one block per
    link card."""
    blocks = []
    for c in cards or []:
        blocks.append({"id": _hash(), "type": "number_card", "data": {"number_card_name": c, "col": 3}})
    if doctypes:
        blocks.append({"id": _hash(), "type": "card", "data": {"card_name": DOCS_CARD, "col": 4}})
    if reports:
        blocks.append({"id": _hash(), "type": "card", "data": {"card_name": REPORTS_CARD, "col": 4}})
    return json.dumps(blocks)


def fill_workspace(doc, name, icon, doctypes, reports, cards=None):
    meta = doc.meta
    frappe_icon = ICONS.get(icon, ICONS["layers"])[1 if is_v16() else 0]
    if meta.has_field("icon"):
        doc.icon = frappe_icon
    doc.set("links", [])
    for row in link_rows(doctypes, reports):
        doc.append("links", row)
    if meta.has_field("number_cards"):
        # The page refers to each card by its label, so the card name is used
        # as the label: it is unique.
        doc.set("number_cards", [{"number_card_name": c, "label": c} for c in cards or []])
    if meta.has_field("content"):
        doc.content = content_blocks(doctypes, reports, cards)


# ------------------------------------------------------------ v16 module


def ensure_module(name):
    """v16: a custom module named after the workspace, which gives it its own
    menu. Frappe creates the module's page when the module is added."""
    if frappe.db.exists("Module Def", name):
        return
    doc = frappe.new_doc("Module Def")
    doc.module_name = name
    doc.custom = 1
    app_field = doc.meta.get_field("app_name")
    if app_field and app_field.reqd:
        doc.app_name = "frappe"
    doc.insert(ignore_permissions=True)


# ------------------------------------------------------------- v16 menus


def v16_sidebar_api():
    try:
        from frappe.desk.doctype.custom_sidebar import custom_sidebar as cs
    except Exception:
        return None
    if not hasattr(cs, "add_site_sidebar_item") or not hasattr(cs, "get_customization"):
        return None
    return cs


def v16_set_menu(module, doctypes, reports):
    """The module's menu on v16: the documents, then a Reports section."""
    cs = v16_sidebar_api()
    if not cs:
        return
    v16_clear_menu(module)
    for dt in doctypes:
        cs.add_site_sidebar_item(
            module, {"type": "Link", "label": dt, "link_type": "DocType", "link_to": dt}
        )
    if reports:
        cs.add_site_sidebar_item(
            module,
            {"type": "Section Break", "label": REPORTS_CARD, "indent": 1, "collapsible": 1},
        )
        for r in reports:
            cs.add_site_sidebar_item(
                module,
                {
                    "type": "Link",
                    "label": r,
                    "link_type": "Report",
                    "link_to": r,
                    "icon": "table",
                    "child": 1,
                },
            )


def v16_clear_menu(module):
    cs = v16_sidebar_api()
    if not cs:
        return
    try:
        existing = cs.get_customization(module, None)
    except Exception:
        existing = None
    if existing:
        frappe.delete_doc("Custom Sidebar", existing.name, ignore_permissions=True, force=True)


# ------------------------------------------------------------------- save


def validate_input(name, icon, color, doctypes, reports, editing):
    name = re.sub(r"\s+", " ", (name or "").strip())
    if not name:
        frappe.throw(_("Give the workspace a name."))
    if len(name) > 60:
        frappe.throw(_("Keep the name under 60 characters."))
    if re.search(r"[/\\<>#?%\"']", name):
        frappe.throw(_("The name cannot contain / \\ < > # ? % or quotes."))
    if icon not in ICONS:
        icon = "layers"
    if not color or not HEX.match(color):
        color = "#1463FF"
    doctypes = [d for d in doctypes if frappe.db.exists("DocType", d)]
    doctypes = [d for d in doctypes if not cint(frappe.db.get_value("DocType", d, "istable"))]
    reports = [r for r in reports if frappe.db.exists("Report", r)]
    if not doctypes and not reports:
        frappe.throw(_("Choose at least one document or report."))
    if len(doctypes) + len(reports) > MAX_LINKS:
        frappe.throw(_("Choose up to {0} documents and reports.").format(MAX_LINKS))
    if not editing:
        if frappe.db.exists("Workspace", name) or frappe.db.exists("Module Def", name):
            frappe.throw(_("A workspace or module named {0} already exists. Choose another name.").format(name))
        if frappe.db.exists("DocType", name) or frappe.db.exists("Page", name) or frappe.db.exists("Report", name):
            frappe.throw(_("{0} is already used by a document or page. Choose another name.").format(name))
    return name, icon, color.upper(), doctypes, reports


def create_v13(name, icon, doctypes, reports, cards=None):
    doc = frappe.new_doc("Workspace")
    doc.label = name
    # The v13 sidebar drops a workspace without a module, and allows a module
    # only to people who read one of its document types. Desk (ToDo, Note,
    # Event) is allowed to every desk user, so the workspace roles and the
    # Gulf access record alone decide who sees it.
    if frappe.db.exists("Module Def", V13_MODULE):
        doc.module = V13_MODULE
    doc.hide_custom = 1
    doc.category = "Modules"
    doc.is_standard = 0
    doc.extends_another_page = 0
    doc.developer_mode_only = 0
    fill_workspace(doc, name, icon, doctypes, reports, cards)
    doc.insert(ignore_permissions=True)
    # The v13 sidebar asks for for_user = "" and a new record stores NULL,
    # which never matches. Stock workspaces hold an empty string.
    frappe.db.sql("update `tabWorkspace` set for_user='' where name=%s and for_user is null", (doc.name,))
    return doc


def create_v14(name, icon, doctypes, reports, cards=None):
    # No module on v14 and v15: the sidebar lists a public workspace without
    # one, and in developer mode Frappe exports any public workspace that has
    # a module into that module's app folder.
    doc = frappe.new_doc("Workspace")
    doc.label = name
    doc.title = name
    doc.public = 1
    try:
        from frappe.desk.doctype.workspace.workspace import last_sequence_id

        doc.sequence_id = last_sequence_id(doc) + 1
    except Exception:
        pass
    fill_workspace(doc, name, icon, doctypes, reports, cards)
    doc.insert(ignore_permissions=True)
    return doc


def create_v16(name, icon, doctypes, reports, cards=None):
    # Frappe creates the module's own page when a custom module is added.
    if frappe.db.exists("Workspace", name):
        doc = frappe.get_doc("Workspace", name)
    else:
        doc = frappe.new_doc("Workspace")
        doc.label = name
        doc.title = name
        doc.module = name
        doc.public = 1
        if doc.meta.has_field("type"):
            doc.type = "Workspace"
    fill_workspace(doc, name, icon, doctypes, reports, cards)
    # The page belongs to the module made here (see Workspace.validate).
    doc.flags.with_module = True
    doc.save(ignore_permissions=True)
    v16_set_menu(name, doctypes, reports)
    return doc


def update_existing(name, icon, doctypes, reports, cards=None):
    doc = frappe.get_doc("Workspace", name)
    fill_workspace(doc, name, icon, doctypes, reports, cards)
    doc.flags.with_module = True
    doc.save(ignore_permissions=True)
    if is_v16():
        v16_set_menu(doc.module or name, doctypes, reports)
    return doc


@frappe.whitelist(methods=["POST"])
def save_workspace(
    name: str,
    icon: Optional[str] = None,
    color: Optional[str] = None,
    doctypes: Union[str, list, None] = None,
    reports: Union[str, list, None] = None,
    audience: Optional[str] = None,
    users: Union[str, list, None] = None,
    roles: Union[str, list, None] = None,
    editing: Union[int, str, None] = 0,
    number_cards: Union[str, list, None] = None,
):
    check_builder()
    editing = cint(editing)
    cards = []
    if supports_cards():
        cards = [c for c in _list(number_cards) if frappe.db.exists("Number Card", c)][:8]
    name, icon, color, doctypes, reports = validate_input(
        name, icon, color, _list(doctypes), _list(reports), editing
    )
    if editing:
        if not frappe.db.exists("Workspace", name) or not is_built(name):
            frappe.throw(_("Only workspaces created with Gulf can be edited here."))
        update_existing(name, icon, doctypes, reports, cards)
    else:
        if is_v16():
            ensure_module(name)
            create_v16(name, icon, doctypes, reports, cards)
        elif is_v14_plus():
            create_v14(name, icon, doctypes, reports, cards)
        else:
            create_v13(name, icon, doctypes, reports, cards)

    users = _list(users)
    roles = _list(roles)
    if audience == wa.SPECIFIC and not users and not roles:
        frappe.throw(_("Choose at least one person or role, or show the workspace to everyone."))
    wa.save_access(name, audience, users, roles, built=True)
    set_module_look(name, icon, color)
    frappe.clear_cache()
    return {"name": name, "route": frappe.scrub(name).replace("_", "-")}


@frappe.whitelist(methods=["POST"])
def delete_workspace(workspace: str):
    check_builder()
    if not frappe.db.exists("Workspace", workspace) or not is_built(workspace):
        frappe.throw(_("Only workspaces created with Gulf can be deleted here."))
    module = frappe.db.get_value("Workspace", workspace, "module") or ""
    if wa.table_exists() and frappe.db.exists(wa.DT, workspace):
        # Gives the workspace back its own roles and removes the Gulf role.
        frappe.delete_doc(wa.DT, workspace, ignore_permissions=True)
    if is_v16() and module:
        v16_clear_menu(module)
    ws = frappe.get_doc("Workspace", workspace)
    ws.flags.with_module = True
    ws.delete(ignore_permissions=True)
    if module == workspace and frappe.db.get_value("Module Def", module, "custom"):
        others = frappe.db.count("Workspace", {"module": module})
        doctypes = frappe.db.count("DocType", {"module": module})
        if not others and not doctypes:
            try:
                frappe.delete_doc("Module Def", module, ignore_permissions=True)
            except Exception:
                frappe.log_error(title="Gulf ERP Theme: delete workspace module")
    drop_module_look(workspace)
    frappe.clear_cache()
    return {"deleted": workspace}
