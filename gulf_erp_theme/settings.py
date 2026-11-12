# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
import json
import re

import frappe
from frappe.utils import cint

# Used until an admin saves the settings page for the first time.
DEFAULTS = {
    "enabled": 1,
    "arabic_font": 1,
    "gulf_fonts": 1,
    "apps_home": 1,
    "language_switch": 1,
    "switch_languages": "ar, en",
    "default_layout": "Top bar",
    "brand_color": "#1463FF",
    "default_bar_style": "Coloured",
    "force_mode": "Let each user choose",
    "lock_all": 0,
    "allow_user_layout": 1,
    "allow_user_color": 1,
    "allow_user_bar_style": 1,
    "form_cards": 1,
    "list_rows": 1,
    "status_filters": 1,
    "multilang_search": 1,
    "form_guide": 1,
    "clear_status": 1,
    "compact": 0,
    "workspace_access": 1,
    "workspace_builder": 1,
    "landing_by_role": 1,
    "branded_login": 1,
    "simple_forms": 1,
    "most_used": 1,
    "recent_favourites": 1,
    "summary_card": 1,
    "hijri_dates": 0,
    "empty_states": 1,
    "notice_bar": 0,
    "notice_message": "",
    "notice_tone": "Information",
    "notice_until": "",
    "login_style": "Side panel",
    "login_image": "",
    "login_title": "",
    "login_welcome": "",
    "arabic_fixes": 1,
}

CHECKS = [
    "enabled",
    "arabic_font",
    "gulf_fonts",
    "apps_home",
    "language_switch",
    "lock_all",
    "allow_user_layout",
    "allow_user_color",
    "allow_user_bar_style",
    "form_cards",
    "list_rows",
    "status_filters",
    "multilang_search",
    "form_guide",
    "clear_status",
    "compact",
    "workspace_access",
    "workspace_builder",
    "landing_by_role",
    "branded_login",
    "simple_forms",
    "most_used",
    "recent_favourites",
    "summary_card",
    "hijri_dates",
    "empty_states",
    "notice_bar",
]

LAYOUTS = {"Top bar": "top", "Side menu": "side", "Standard Frappe menu": "standard"}
BAR_STYLES = {"Coloured": "color", "White": "white"}
MODES = {"Let each user choose": "", "Always light": "light", "Always dark": "dark"}

PREF_KEY = "gulf_appearance"


def get_theme_settings():
    settings = dict(DEFAULTS)
    try:
        saved = frappe.db.get_singles_dict("Gulf ERP Theme Settings")
    except Exception:
        # The DocType is not synced yet (first install or mid-migrate).
        saved = {}
    for key in DEFAULTS:
        value = saved.get(key)
        if value is not None and value != "":
            settings[key] = value
    for key in CHECKS:
        settings[key] = 1 if cint(settings[key]) else 0
    looks = get_module_looks()
    settings["module_colors"] = {k: v["color"] for k, v in looks.items() if v.get("color")}
    settings["module_icons"] = {k: v["icon"] for k, v in looks.items() if v.get("icon")}
    return settings


NO_VALUE = ("Section Break", "Column Break", "Tab Break", "HTML", "Button", "Table", "Heading")


def fill_missing_settings():
    """Store the default of every setting that has no saved value.

    Frappe applies the DocType defaults only when the settings record is
    first created. A setting added by a later update has no stored value, so
    the theme runs on its default while the settings form shows it empty or
    unticked, and the next save of that form turned the feature off."""
    dt = "Gulf ERP Theme Settings"
    try:
        saved = frappe.db.get_singles_dict(dt)
        meta = frappe.get_meta(dt)
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: fill missing settings")
        return
    if not saved:
        # Nothing stored yet: the form starts from the DocType defaults.
        return
    filled = 0
    for df in meta.fields:
        if df.fieldtype in NO_VALUE or not df.fieldname or df.default in (None, ""):
            continue
        value = saved.get(df.fieldname)
        if value is not None and value != "":
            continue
        default = cint(df.default) if df.fieldtype == "Check" else df.default
        frappe.db.set_single_value(dt, df.fieldname, default)
        filled += 1
    if filled:
        # Runs inside migrate, which commits when it finishes.
        frappe.clear_cache()
    return filled


def get_module_looks():
    """Colour and icon per module or workspace, from Module Colours."""
    rows = []
    for fields in (["module", "color", "icon"], ["module", "color"]):
        try:
            rows = frappe.get_all(
                "Gulf Module Color",
                filters={"parent": "Gulf ERP Theme Settings"},
                fields=fields,
                ignore_permissions=True,
            )
            break
        except Exception:
            # The icon column arrives with 0.4.0. Until migrate runs, read
            # the colours alone.
            rows = []
    out = {}
    for r in rows:
        if r.module:
            out[r.module.strip()] = {"color": r.get("color") or "", "icon": r.get("icon") or ""}
    return out


def get_module_colors():
    return {k: v["color"] for k, v in get_module_looks().items() if v.get("color")}


def switch_languages(settings):
    """The languages offered by the language switch, in the admin's order.
    Only codes that exist as an enabled Language are kept."""
    codes = []
    for code in (settings.get("switch_languages") or "").replace(";", ",").split(","):
        code = code.strip()
        if code and code not in codes:
            codes.append(code)
    if not codes:
        return []
    try:
        rows = frappe.get_all(
            "Language",
            filters={"name": ["in", codes]},
            fields=["name", "language_name", "enabled"],
            ignore_permissions=True,
        )
    except Exception:
        return []
    found = {r.name: r for r in rows if cint(r.enabled) or r.enabled is None}
    return [{"code": c, "name": found[c].language_name or c} for c in codes if c in found]


# Roles everyone has. A landing row for one of these would apply to all.
COMMON_ROLES = ("All", "Guest", "Desk User")


def get_landing(settings, user=None):
    """Where this user lands after login: the first Landing Pages row whose
    role they have. None means the apps screen as usual."""
    user = user or frappe.session.user
    if not cint(settings.get("landing_by_role")) or user in ("Administrator", "Guest"):
        return None
    try:
        rows = frappe.get_all(
            "Gulf Landing Page",
            filters={"parent": "Gulf ERP Theme Settings"},
            fields=["role", "workspace", "page"],
            order_by="idx asc",
            ignore_permissions=True,
        )
    except Exception:
        return None
    if not rows:
        return None
    roles = set(frappe.get_roles(user))
    for r in rows:
        if not r.role or r.role in COMMON_ROLES or r.role not in roles:
            continue
        if r.workspace and frappe.db.exists("Workspace", r.workspace):
            return {"workspace": r.workspace}
        if r.page:
            return {"page": r.page}
    return None


def _lines(text):
    out = []
    for part in re.split(r"[,\n]", text or ""):
        part = part.strip()
        if part and part not in out:
            out.append(part)
    return out


def get_form_hides(settings, user=None):
    """The fields this person does not need, per form: {doctype: [fieldname]}.
    A rule applies to everyone except System Managers and the roles it lists."""
    user = user or frappe.session.user
    if not cint(settings.get("simple_forms")) or user in ("Administrator", "Guest"):
        return {}
    roles = set(frappe.get_roles(user))
    if "System Manager" in roles:
        return {}
    try:
        rows = frappe.get_all(
            "Gulf Form Rule",
            filters={"parent": "Gulf ERP Theme Settings"},
            fields=["form", "hidden_fields", "visible_to"],
            order_by="idx asc",
            ignore_permissions=True,
        )
    except Exception:
        return {}
    out = {}
    for r in rows:
        if not r.form or roles.intersection(_lines(r.visible_to)):
            continue
        fields = out.setdefault(r.form, [])
        for f in _lines(r.hidden_fields):
            if f not in fields:
                fields.append(f)
    return {k: v for k, v in out.items() if v}


NOTICE_TONES = {"Information": "info", "Warning": "warn", "Urgent": "urgent"}


def get_notice(settings):
    """The notice bar, while it is on, has a message and has not expired."""
    if not cint(settings.get("notice_bar")):
        return None
    message = (settings.get("notice_message") or "").strip()
    if not message:
        return None
    until = settings.get("notice_until")
    if until:
        from frappe.utils import getdate, nowdate

        try:
            if getdate(until) < getdate(nowdate()):
                return None
        except Exception:
            pass
    import hashlib

    # A new message gets a new key, so people who closed the old one see it.
    key = hashlib.md5(message.encode("utf-8")).hexdigest()[:10]
    return {"message": message, "tone": NOTICE_TONES.get(settings.get("notice_tone"), "info"), "key": key}


def get_user_prefs(user=None):
    raw = frappe.defaults.get_user_default(PREF_KEY, user=user or frappe.session.user)
    if not raw:
        return {}
    try:
        prefs = json.loads(raw)
    except Exception:
        return {}
    return prefs if isinstance(prefs, dict) else {}


def resolve(settings, prefs):
    """Work out what this user actually sees. Locked admin value, then the
    user's own choice, then the admin default."""
    locked = cint(settings.get("lock_all"))
    out = {
        "layout": LAYOUTS.get(settings.get("default_layout"), "top"),
        "color": settings.get("brand_color") or "#1463FF",
        "bar": BAR_STYLES.get(settings.get("default_bar_style"), "color"),
    }
    allow = {
        "layout": not locked and cint(settings.get("allow_user_layout")),
        "color": not locked and cint(settings.get("allow_user_color")),
        "bar": not locked and cint(settings.get("allow_user_bar_style")),
    }
    for key in out:
        if allow[key] and prefs.get(key):
            out[key] = prefs[key]
    out["mode"] = MODES.get(settings.get("force_mode"), "")
    out["allow"] = {k: 1 if v else 0 for k, v in allow.items()}
    out["allow"]["mode"] = 0 if out["mode"] else 1
    return out


def boot_session(bootinfo):
    settings = get_theme_settings()
    if frappe.session.user and frappe.session.user != "Guest":
        prefs = get_user_prefs()
        settings["appearance"] = resolve(settings, prefs)
        settings["has_own_appearance"] = 1 if prefs else 0
        settings["languages"] = switch_languages(settings) if settings.get("language_switch") else []
        try:
            settings["landing"] = get_landing(settings)
        except Exception:
            settings["landing"] = None
        try:
            settings["form_hide"] = get_form_hides(settings)
        except Exception:
            settings["form_hide"] = {}
        try:
            settings["notice"] = get_notice(settings)
        except Exception:
            settings["notice"] = None
        try:
            from gulf_erp_theme.api import get_favourites

            settings["favourites"] = get_favourites()
        except Exception:
            settings["favourites"] = []
        try:
            from gulf_erp_theme.api import nav_key

            settings["nav_key"] = nav_key()
        except Exception:
            settings["nav_key"] = ""
        try:
            from gulf_erp_theme import workspace_builder
            from gulf_erp_theme.workspace_access import built_workspaces

            settings["built_workspaces"] = built_workspaces()
            settings["can_build_workspace"] = 1 if workspace_builder.can_build() else 0
        except Exception:
            settings["built_workspaces"] = []
            settings["can_build_workspace"] = 0
    bootinfo.gulf_erp_theme = settings
    try:
        from gulf_erp_theme.workspace_access import boot_session as _ws_boot

        _ws_boot(bootinfo)
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: workspace access boot")
