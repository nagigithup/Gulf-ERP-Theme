# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
"""Server side of the Gulf ERP Theme navigation and appearance picker.

Written to run unchanged on Frappe v13 to v16. On v16 the desk already ships
each module's menu in boot (`module_sidebars`), so the client only calls
`get_nav` on v13 to v15.
"""

import hashlib
import json
import re
from typing import Optional, Union

import frappe
from frappe.utils import cint

from gulf_erp_theme import __version__
from gulf_erp_theme.settings import PREF_KEY, get_theme_settings, get_user_prefs, resolve, switch_languages

HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
NAV_TTL = 6 * 60 * 60


def nav_key():
    """Changes whenever the menus a user can see could change."""
    try:
        ws_modified = frappe.db.sql("select max(modified) from `tabWorkspace`")[0][0]
    except Exception:
        ws_modified = ""
    try:
        access_modified = frappe.db.sql("select max(modified) from `tabGulf Workspace Access`")[0][0]
    except Exception:
        access_modified = ""
    parts = [
        str(access_modified),
        frappe.session.user,
        ",".join(sorted(frappe.get_roles())),
        str(ws_modified),
        frappe.local.lang or "",
        __version__,
    ]
    return hashlib.md5("|".join(parts).encode()).hexdigest()[:16]


@frappe.whitelist()
def get_nav():
    key = nav_key()
    cache_key = "gulf_erp_theme_nav:" + key
    cached = frappe.cache().get_value(cache_key)
    if cached:
        return cached
    data = {"key": key, "modules": build_nav()}
    frappe.cache().set_value(cache_key, data, expires_in_sec=NAV_TTL)
    return data


def allowed_workspaces():
    from frappe.desk import desktop

    # v14 and v15 call it get_workspace_sidebar_items, v16 get_workspaces.
    getter = getattr(desktop, "get_workspace_sidebar_items", None) or getattr(desktop, "get_workspaces", None)
    if getter:
        pages = (getter() or {}).get("pages") or []
        pages = [
            p
            for p in pages
            if not p.get("parent_page") and cint(p.get("public", 1)) and not cint(p.get("is_hidden"))
        ]
    else:
        pages = desktop.get_desk_sidebar_items() or []
        if isinstance(pages, dict):
            flat = []
            for group in pages.values():
                flat.extend(group or [])
            pages = flat
        # v13 workspaces have no roles, so Gulf leaves out the hidden ones.
        from gulf_erp_theme.workspace_access import filter_pages

        pages = filter_pages(pages)
    return pages


def load_page(page):
    from frappe.desk import desktop

    name = page.get("name")
    title = page.get("title") or name
    try:
        if hasattr(desktop, "get_workspace_sidebar_items"):
            return desktop.get_desktop_page(json.dumps({"name": name, "title": title, "public": 1}))
        return desktop.get_desktop_page(name)
    except Exception:
        return None


def clean_link(link):
    if not link or cint(link.get("hidden")):
        return None
    link_type = link.get("link_type") or link.get("type")
    link_to = link.get("link_to")
    if not link_type or not (link_to or link.get("url")):
        return None
    if link.get("incomplete_dependencies"):
        # ERPNext greys these out until setup is done. Keep the menu clean.
        return None
    return {
        "label": link.get("label") or link_to,
        "type": link_type,
        "name": link_to,
        "is_query_report": cint(link.get("is_query_report")),
        "doctype": link.get("doctype") or link.get("ref_doctype"),
        "url": link.get("url"),
    }


def card_order(page):
    """Card names in the order the workspace shows them (v14+ keeps the
    layout in `content`). v13 has no such field and keeps its own order."""
    content = page.get("content")
    if content is None:
        try:
            content = frappe.db.get_value("Workspace", page.get("name"), "content")
        except Exception:
            content = None
    try:
        blocks = json.loads(content or "[]")
    except Exception:
        return []
    return [
        (b.get("data") or {}).get("card_name")
        for b in blocks
        if isinstance(b, dict) and b.get("type") == "card"
    ]


def build_nav():
    module_app = getattr(frappe.local, "module_app", None) or {}
    modules = []
    for page in allowed_workspaces():
        name = page.get("name")
        data = load_page(page)
        groups = []
        if data:
            cards = data.get("cards") or {}
            if isinstance(cards, dict):
                cards = cards.get("items") or []
            for card in cards:
                items = [clean_link(l) for l in (card.get("links") or [])]
                items = [i for i in items if i]
                if items:
                    groups.append({"label": card.get("label") or "", "items": items})
            order = card_order(page)
            if order:
                # Card labels can come back translated, so match either form.
                rank = {}
                for i, card_name in enumerate(order):
                    if card_name:
                        rank.setdefault(card_name, i)
                        rank.setdefault(frappe._(card_name), i)
                groups.sort(key=lambda g: rank.get(g["label"], len(order)))

            # Shortcuts are the documents a module is used for most, so they
            # come first, the way the workspace page shows them.
            shortcuts = data.get("shortcuts") or {}
            if isinstance(shortcuts, dict):
                shortcuts = shortcuts.get("items") or []
            items = []
            for s in shortcuts:
                item = clean_link(
                    {
                        "label": s.get("label"),
                        "link_type": s.get("type"),
                        "link_to": s.get("link_to"),
                        "url": s.get("url"),
                        "is_query_report": s.get("is_query_report"),
                    }
                )
                if item:
                    items.append(item)
            if items:
                groups.insert(0, {"label": "Shortcuts", "items": items})
        module = page.get("module") or ""
        modules.append(
            {
                "name": name,
                "label": page.get("title") or page.get("label") or name,
                "icon": page.get("icon") or "",
                "module": module,
                "app": module_app.get(frappe.scrub(module)) if module else "",
                "category": page.get("category") or "",
                "groups": groups,
            }
        )
    return modules


def clean_prefs(prefs):
    if isinstance(prefs, str):
        try:
            prefs = json.loads(prefs)
        except Exception:
            prefs = {}
    if not isinstance(prefs, dict):
        prefs = {}
    out = {}
    if isinstance(prefs.get("layout"), str) and prefs.get("layout") in ("top", "side", "standard"):
        out["layout"] = prefs["layout"]
    if isinstance(prefs.get("color"), str) and HEX.match(prefs["color"]):
        out["color"] = prefs["color"].upper()
    if isinstance(prefs.get("bar"), str) and prefs.get("bar") in ("color", "white"):
        out["bar"] = prefs["bar"]
    return out


@frappe.whitelist(methods=["POST"])
def save_appearance(prefs: Union[str, dict, None] = None):
    if frappe.session.user == "Guest":
        frappe.throw(frappe._("Not permitted"), frappe.PermissionError)
    settings = get_theme_settings()
    allowed = resolve(settings, {})["allow"]
    current = get_user_prefs()
    for key, value in clean_prefs(prefs).items():
        if allowed.get(key):
            current[key] = value
    frappe.defaults.set_user_default(PREF_KEY, json.dumps(current, sort_keys=True))
    return resolve(settings, current)


@frappe.whitelist(methods=["POST"])
def reset_my_appearance():
    if frappe.session.user == "Guest":
        frappe.throw(frappe._("Not permitted"), frappe.PermissionError)
    frappe.defaults.clear_user_default(PREF_KEY)
    return resolve(get_theme_settings(), {})


@frappe.whitelist()
def appearance_stats():
    frappe.only_for("System Manager")
    return {"users": frappe.db.count("DefaultValue", {"defkey": PREF_KEY})}


@frappe.whitelist(methods=["POST"])
def reset_all_users():
    frappe.only_for("System Manager")
    count = frappe.db.count("DefaultValue", {"defkey": PREF_KEY})
    frappe.db.sql("delete from `tabDefaultValue` where defkey=%s", PREF_KEY)
    frappe.defaults.clear_cache()
    frappe.cache().delete_key("bootinfo")
    return {"cleared": count}


@frappe.whitelist(methods=["POST"])
def set_language(lang: Optional[str] = None):
    """Language switch in the top bar: changes the signed in user's own
    language to one of the languages the admin offers."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(frappe._("Not permitted"), frappe.PermissionError)
    settings = get_theme_settings()
    if not cint(settings.get("enabled")) or not cint(settings.get("language_switch")):
        frappe.throw(frappe._("The language switch is turned off."))
    if lang not in [row["code"] for row in switch_languages(settings)]:
        frappe.throw(frappe._("This language is not available."))
    frappe.db.set_value("User", user, "language", lang)
    frappe.clear_cache(user=user)
    return lang


FAV_KEY = "gulf_favourites"
FAV_MAX = 24


def get_favourites(user=None):
    raw = frappe.defaults.get_user_default(FAV_KEY, user=user or frappe.session.user)
    try:
        favs = json.loads(raw) if raw else []
    except Exception:
        favs = []
    out = []
    for f in favs if isinstance(favs, list) else []:
        if isinstance(f, dict) and isinstance(f.get("doctype"), str) and isinstance(f.get("name"), str):
            if not frappe.db.exists("DocType", f["doctype"]) or not frappe.db.exists(f["doctype"], f["name"]):
                continue
            if not frappe.has_permission(f["doctype"], "read", doc=f["name"]):
                continue
            out.append({"doctype": f["doctype"], "name": f["name"], "title": str(f.get("title") or f["name"])[:140]})
    return out


@frappe.whitelist(methods=["POST"])
def toggle_favourite(doctype: str, name: str, title: Optional[str] = None):
    """Star or unstar a document for the signed in user. Returns the list."""
    if frappe.session.user == "Guest":
        frappe.throw(frappe._("Not permitted"), frappe.PermissionError)
    if not frappe.db.exists("DocType", doctype) or not frappe.has_permission(doctype, "read", name):
        frappe.throw(frappe._("Not permitted"), frappe.PermissionError)
    favs = get_favourites()
    keep = [f for f in favs if not (f["doctype"] == doctype and f["name"] == name)]
    if len(keep) == len(favs):
        keep.insert(0, {"doctype": doctype, "name": name, "title": (title or name)[:140]})
    keep = keep[:FAV_MAX]
    frappe.defaults.set_user_default(FAV_KEY, json.dumps(keep))
    return keep
