# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
"""Who sees a workspace.

One Gulf Workspace Access record per workspace says who sees it: everyone,
or chosen people and roles.

v14 to v16: a workspace already hides itself from users who lack one of its
roles. For chosen people Gulf creates one role per workspace, gives it to
those people and puts it, with any chosen roles, on the workspace. Frappe then
hides the workspace everywhere by itself (sidebar, apps screen, search).

v13: a workspace has no roles, so Gulf leaves out hidden workspaces from the
boot data, its own menus and the workspace page.

The records are the source of truth. They are applied again after every
migrate, because an app update can reload a standard workspace and its roles.
Administrators, System Managers and Workspace Managers always see every
workspace.
"""

import json
from typing import Optional, Union

import frappe
from frappe import _
from frappe.utils import cint, now

DT = "Gulf Workspace Access"
EVERYONE = "Everyone"
SPECIFIC = "Specific people"
ROLE_PREFIX = "Gulf Workspace: "
SEE_ALL = ("System Manager", "Workspace Manager")


def enabled():
    try:
        from gulf_erp_theme.settings import get_theme_settings

        s = get_theme_settings()
    except Exception:
        return False
    return bool(cint(s.get("enabled")) and cint(s.get("workspace_access")))


def uses_roles():
    """v14+ workspaces carry a roles table. v13 ones do not."""
    try:
        return bool(frappe.get_meta("Workspace").has_field("roles"))
    except Exception:
        return False


def table_exists():
    try:
        return bool(frappe.db.table_exists(DT))
    except Exception:
        return False


def managed_role(workspace):
    import hashlib
    value = ROLE_PREFIX + workspace
    return value if len(value) <= 140 else value[:123] + "-" + hashlib.sha256(workspace.encode()).hexdigest()[:16]


def _clear():
    frappe.clear_cache()


# ------------------------------------------------------------------ roles


def workspace_roles(workspace):
    rows = frappe.db.sql(
        "select role from `tabHas Role` where parenttype='Workspace' and parent=%s order by idx",
        (workspace,),
    )
    return [r[0] for r in rows]


def set_workspace_roles(workspace, roles):
    """Write the roles straight to the table. Saving the workspace would run
    its own checks and, in developer mode, rewrite the app's JSON file."""
    if not frappe.db.exists("Workspace", workspace):
        return
    frappe.db.sql(
        "delete from `tabHas Role` where parenttype='Workspace' and parent=%s", (workspace,)
    )
    stamp = now()
    for idx, role in enumerate(roles, 1):
        _insert_has_role("Workspace", workspace, role, idx, stamp)
    # A newer timestamp than the app's JSON file stops the next migrate from
    # reloading the workspace over these roles.
    frappe.db.sql("update `tabWorkspace` set modified=%s where name=%s", (stamp, workspace))


def _insert_has_role(parenttype, parent, role, idx, stamp=None):
    stamp = stamp or now()
    frappe.get_doc(
        {
            "doctype": "Has Role",
            "name": frappe.generate_hash(length=10),
            "parent": parent,
            "parenttype": parenttype,
            "parentfield": "roles",
            "role": role,
            "idx": idx,
            "owner": "Administrator",
            "modified_by": "Administrator",
            "creation": stamp,
            "modified": stamp,
        }
    ).db_insert()


def users_with_role(role):
    rows = frappe.db.sql(
        "select parent from `tabHas Role` where parenttype='User' and role=%s", (role,)
    )
    return set(r[0] for r in rows)


def give_role(user, role):
    if not frappe.db.exists("User", user):
        return
    idx = frappe.db.sql(
        "select coalesce(max(idx), 0) from `tabHas Role` where parenttype='User' and parent=%s",
        (user,),
    )[0][0]
    _insert_has_role("User", user, role, cint(idx) + 1)


def take_role(user, role):
    frappe.db.sql(
        "delete from `tabHas Role` where parenttype='User' and parent=%s and role=%s",
        (user, role),
    )


def ensure_role(role):
    if frappe.db.exists("Role", role):
        if not frappe.db.exists(DT, {"gulf_role": role}):
            frappe.throw(_("This role already exists outside Gulf ERP Theme. Rename that role before configuring workspace access."))
        return
    doc = frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1})
    if doc.meta.has_field("is_custom"):
        doc.is_custom = 1
    doc.insert(ignore_permissions=True)


def drop_role(role):
    """Take the managed role away from everyone and delete it."""
    if not role or not role.startswith(ROLE_PREFIX) or not frappe.db.exists(DT, {"gulf_role": role}):
        return
    frappe.db.sql("delete from `tabHas Role` where role=%s", (role,))
    if frappe.db.exists("Role", role):
        frappe.delete_doc("Role", role, ignore_permissions=True, force=True)


# ------------------------------------------------------------ the record


def validate_access(doc):
    doc.workspace = (doc.workspace or "").strip()
    if doc.workspace and frappe.db.get_value("Workspace", doc.workspace, "for_user"):
        frappe.throw(_("A private workspace is only shown to its owner. Choose a public workspace."))
    if doc.audience == SPECIFIC:
        users = [r.user for r in doc.get("users") or [] if r.user]
        roles = [r.role for r in doc.get("roles") or [] if r.role]
        if not users and not roles:
            frappe.throw(_("Choose at least one person or role, or show the workspace to everyone."))
        for row in doc.get("roles") or []:
            if row.role and row.role == managed_role(doc.workspace):
                frappe.throw(_("Choose people instead of the role Gulf manages for this workspace."))
    else:
        doc.set("users", [])
        doc.set("roles", [])


def apply(doc):
    """Put the record into effect."""
    if not uses_roles():
        _clear()
        return
    if not enabled():
        return
    workspace = doc.workspace
    role = managed_role(workspace)
    current = workspace_roles(workspace)
    if doc.original_roles in (None, ""):
        before = [r for r in current if not r.startswith(ROLE_PREFIX)]
        doc.db_set("original_roles", json.dumps(before), update_modified=False)

    if doc.audience == SPECIFIC:
        users = [r.user for r in doc.get("users") or [] if r.user]
        targets = [role] if users else []
        for r in doc.get("roles") or []:
            if r.role and r.role not in targets:
                targets.append(r.role)
        if users:
            ensure_role(role)
            want = set(users)
            have = users_with_role(role)
            for u in want - have:
                give_role(u, role)
            for u in have - want:
                take_role(u, role)
        else:
            drop_role(role)
        if (doc.gulf_role or "") != (role if users else ""):
            doc.db_set("gulf_role", role if users else "", update_modified=False)
    else:
        targets = []
        drop_role(role)
        if doc.gulf_role:
            doc.db_set("gulf_role", "", update_modified=False)

    if targets != current:
        set_workspace_roles(workspace, targets)
    doc.db_set("applied_roles", json.dumps(targets), update_modified=False)
    _clear()


def restore(doc, keep_record_fields=False):
    """Undo the record: the workspace gets back the roles it had before."""
    if not uses_roles():
        _clear()
        return
    if doc.original_roles not in (None, "") and not doc.flags.get("workspace_deleted"):
        try:
            original = json.loads(doc.original_roles) or []
        except Exception:
            original = []
        try:
            applied = json.loads(doc.get("applied_roles") or "null")
        except (ValueError, TypeError):
            applied = None
        current = workspace_roles(doc.workspace)
        if applied is not None and current == applied:
            set_workspace_roles(doc.workspace, original)
        elif applied is None:
            # Legacy records: do not overwrite an unknown current role list.
            pass
        else:
            owned = doc.gulf_role or managed_role(doc.workspace)
            if owned in current:
                set_workspace_roles(doc.workspace, [role for role in current if role != owned])
    drop_role(doc.gulf_role or managed_role(doc.workspace))
    if keep_record_fields:
        doc.db_set("gulf_role", "", update_modified=False)
        doc.db_set("original_roles", "", update_modified=False)
        doc.db_set("applied_roles", "", update_modified=False)
    _clear()


def apply_all():
    if not table_exists():
        return
    for r in frappe.get_all(DT):
        doc = frappe.get_doc(DT, r.name)
        if not frappe.db.exists("Workspace", doc.workspace):
            continue
        apply(doc)


def restore_all():
    if not table_exists():
        return
    for r in frappe.get_all(DT):
        doc = frappe.get_doc(DT, r.name)
        restore(doc, keep_record_fields=True)


def after_migrate():
    try:
        if enabled():
            apply_all()
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: workspace access after migrate")


def on_settings_change(on):
    if on:
        apply_all()
    else:
        restore_all()


def on_workspace_trash(doc, method=None):
    if not table_exists() or not frappe.db.exists(DT, doc.name):
        return
    rec = frappe.get_doc(DT, doc.name)
    rec.flags.workspace_deleted = True
    frappe.delete_doc(DT, rec.name, ignore_permissions=True)


# ------------------------------------------------------- who sees what


def hidden_for(user=None):
    """Workspaces this user must not see. Gulf enforces this itself on v13
    and as a guard on the workspace page on every version."""
    user = user or frappe.session.user
    if not user or user == "Administrator" or not table_exists() or not enabled():
        return set()
    cache = getattr(frappe.local, "gulf_ws_hidden", None)
    if cache is None:
        cache = frappe.local.gulf_ws_hidden = {}
    if user in cache:
        return cache[user]
    roles = set(frappe.get_roles(user))
    hidden = set()
    if not roles.intersection(SEE_ALL):
        rows = frappe.get_all(DT, filters={"audience": SPECIFIC}, fields=["name", "workspace"])
        if rows:
            people = {}
            for parent, u in frappe.db.sql(
                "select parent, user from `tabGulf Workspace User` where parenttype=%s", (DT,)
            ):
                people.setdefault(parent, set()).add(u)
            allowed = {}
            for parent, role in frappe.db.sql(
                "select parent, role from `tabGulf Workspace Role` where parenttype=%s", (DT,)
            ):
                allowed.setdefault(parent, set()).add(role)
            for r in rows:
                if user in people.get(r.name, set()):
                    continue
                if roles.intersection(allowed.get(r.name, set())):
                    continue
                hidden.add(r.workspace)
    cache[user] = hidden
    return hidden


def filter_pages(pages):
    """Drop hidden workspaces from a list of sidebar pages (dicts with name)."""
    hidden = hidden_for()
    if not hidden or not pages:
        return pages
    return [p for p in pages if (p.get("name") if isinstance(p, dict) else p) not in hidden]


def boot_session(bootinfo):
    if uses_roles():
        # v16: a workspace made with the builder is a module of its own, and
        # its menu lists documents the person may still read. Hiding the
        # workspace hides the whole module.
        try:
            sidebars = bootinfo.get("module_sidebars")
            if isinstance(sidebars, dict) and sidebars:
                hidden = hidden_for().intersection(built_workspaces())
                for name in hidden:
                    sidebars.pop(name, None)
        except Exception:
            frappe.log_error(title="Gulf ERP Theme: workspace access boot")
        return
    try:
        pages = bootinfo.get("allowed_workspaces")
        if isinstance(pages, list):
            bootinfo.allowed_workspaces = filter_pages(pages)
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: workspace access boot")
    try:
        # v13 files built workspaces under Desk (see workspace_builder). The
        # breadcrumbs of Desk documents (Note, Event) keep pointing nowhere,
        # as they do on a stock site.
        page_map = bootinfo.get("module_page_map")
        built = set(built_workspaces())
        if isinstance(page_map, dict) and built:
            for module in [m for m, page in page_map.items() if page in built]:
                page_map.pop(module, None)
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: workspace access boot")


@frappe.whitelist()
def get_desktop_page(page: Union[str, dict]):
    """The desk's own workspace page loader, refusing workspaces hidden from
    this user. Everything else goes straight to Frappe."""
    from frappe.desk import desktop

    name = page
    try:
        if isinstance(page, dict):
            name = page.get("name")
        elif isinstance(page, str) and page.strip().startswith("{"):
            name = (json.loads(page) or {}).get("name")
    except Exception:
        name = None
    # A failed access lookup must not silently expose a hidden workspace.
    blocked = bool(name) and name in hidden_for()
    if blocked:
        raise frappe.PermissionError(_("This workspace is not shown to you."))
    return desktop.get_desktop_page(page)


# ------------------------------------------------------------- the dialog


def _parse_list(value):
    if not value:
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            value = [v.strip() for v in value.split(",")]
    out = []
    for v in value or []:
        if isinstance(v, dict):
            v = v.get("user") or v.get("role") or v.get("value")
        v = (v or "").strip()
        if v and v not in out:
            out.append(v)
    return out


@frappe.whitelist()
def get_access(workspace: str):
    frappe.only_for("System Manager")
    if not frappe.db.exists("Workspace", workspace):
        frappe.throw(_("Workspace {0} not found").format(workspace))
    private = bool(frappe.db.get_value("Workspace", workspace, "for_user"))
    out = {
        "workspace": workspace,
        "private": private,
        "enabled": enabled(),
        "audience": EVERYONE,
        "users": [],
        "roles": [],
    }
    if table_exists() and frappe.db.exists(DT, workspace):
        doc = frappe.get_doc(DT, workspace)
        out["audience"] = doc.audience
        out["users"] = [r.user for r in doc.users if r.user]
        out["roles"] = [r.role for r in doc.roles if r.role]
    elif uses_roles():
        # Roles an admin set on the workspace before Gulf.
        roles = [r for r in workspace_roles(workspace) if not r.startswith(ROLE_PREFIX)]
        if roles:
            out["audience"] = SPECIFIC
            out["roles"] = roles
    return out


@frappe.whitelist(methods=["POST"])
def set_access(
    workspace: str,
    audience: Optional[str] = None,
    users: Union[str, list, None] = None,
    roles: Union[str, list, None] = None,
):
    frappe.only_for("System Manager")
    save_access(workspace, audience, users, roles)
    return get_access(workspace)


def save_access(workspace, audience=None, users=None, roles=None, built=None):
    """Store who sees a workspace. `built` marks a workspace created with
    the Gulf workspace builder."""
    audience = SPECIFIC if audience == SPECIFIC else EVERYONE
    users = _parse_list(users)
    roles = _parse_list(roles)
    if frappe.db.exists(DT, workspace):
        doc = frappe.get_doc(DT, workspace)
    else:
        doc = frappe.new_doc(DT)
        doc.workspace = workspace
    doc.audience = audience
    doc.set("users", [{"user": u} for u in users] if audience == SPECIFIC else [])
    doc.set("roles", [{"role": r} for r in roles] if audience == SPECIFIC else [])
    if built is not None and doc.meta.has_field("built_by_gulf"):
        doc.built_by_gulf = 1 if built else 0
    doc.save(ignore_permissions=True)
    return doc


def built_workspaces():
    """Names of the workspaces created with the Gulf workspace builder."""
    if not table_exists():
        return []
    try:
        if not frappe.get_meta(DT).has_field("built_by_gulf"):
            return []
        names = frappe.get_all(DT, filters={"built_by_gulf": 1}, pluck="name")
    except Exception:
        return []
    return [n for n in names if frappe.db.exists("Workspace", n)]
