# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
"""Most used documents and recently opened documents for the apps screen.

Frappe's own Route History skips opened documents (it keeps list and report
visits only, and only once the scheduler has run), so Gulf keeps its own
short record per user in user defaults:

    {"r": [[doctype, name, title, "2026-11-04 10:12:00"], ...],   newest first
     "w": {doctype: {week: visits}}}                               last 13 weeks

A week is the number of whole weeks since 1970, so 13 weeks is the last 90
days. The record stays a few kilobytes: v13 keeps user defaults in a 64 KB
text column.
"""

import json
from typing import Union

import frappe
from frappe.utils import cint, get_datetime, now_datetime

ACT_KEY = "gulf_activity"
WEEKS = 13
RECENT_KEEP = 12
SHOW = 8
DOCTYPES_KEEP = 60
BATCH_MAX = 40


def week_of(dt=None):
    dt = get_datetime(dt) if dt else now_datetime()
    return (dt.date().toordinal() - 719163) // 7


def load(user=None):
    raw = frappe.defaults.get_user_default(ACT_KEY, user=user or frappe.session.user)
    try:
        data = json.loads(raw) if raw else None
    except Exception:
        data = None
    if not isinstance(data, dict):
        return None
    recent = [r for r in data.get("r") or [] if isinstance(r, list) and len(r) == 4]
    weeks = data.get("w") if isinstance(data.get("w"), dict) else {}
    return {"r": recent, "w": weeks}


def prune(data):
    now = week_of()
    weeks = {}
    for dt, counts in (data.get("w") or {}).items():
        if not isinstance(counts, dict):
            continue
        keep = {k: cint(v) for k, v in counts.items() if now - cint(k) < WEEKS and cint(v) > 0}
        if keep:
            weeks[dt] = keep
    if len(weeks) > DOCTYPES_KEEP:
        top = sorted(weeks, key=lambda d: sum(weeks[d].values()), reverse=True)[:DOCTYPES_KEEP]
        weeks = {d: weeks[d] for d in top}
    data["w"] = weeks
    data["r"] = (data.get("r") or [])[:RECENT_KEEP]
    return data


def save(data):
    frappe.defaults.set_user_default(ACT_KEY, json.dumps(prune(data), separators=(",", ":")))


def seed():
    """First use: start from the list visits Frappe already recorded, so the
    most used documents show at once on sites that had the theme before."""
    data = {"r": [], "w": {}}
    try:
        rows = frappe.get_all(
            "Route History",
            filters={"user": frappe.session.user, "creation": (">=", frappe.utils.add_days(now_datetime(), -90))},
            fields=["route", "creation"],
            order_by="creation desc",
            limit_page_length=500,
        )
    except Exception:
        rows = []
    for row in rows:
        parts = (row.get("route") or "").split("/")
        if len(parts) >= 2 and parts[0] in ("List", "Report") and parts[1]:
            counts = data["w"].setdefault(parts[1], {})
            wk = str(week_of(row.get("creation")))
            counts[wk] = counts.get(wk, 0) + 1
    return data


def usable(doctype):
    """A document type the user can open from the apps screen."""
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        return None
    if cint(meta.istable) or not frappe.has_permission(doctype, "read"):
        return None
    return meta


@frappe.whitelist(methods=["POST"])
def log_visits(visits: Union[str, list, None] = None):
    """Called by the desk in small batches: [{doctype, name, title}].
    A visit without a name is a list visit."""
    if frappe.session.user == "Guest":
        return
    if isinstance(visits, str):
        try:
            visits = json.loads(visits)
        except Exception:
            visits = []
    if not isinstance(visits, list) or not visits:
        return
    data = load() or seed()
    wk = str(week_of())
    now = str(now_datetime().replace(microsecond=0))
    checked = {}
    for v in visits[:BATCH_MAX]:
        if not isinstance(v, dict):
            continue
        dt = v.get("doctype")
        name = v.get("name")
        if not isinstance(dt, str) or not dt:
            continue
        if dt not in checked:
            checked[dt] = bool(frappe.db.exists("DocType", dt)) and bool(usable(dt))
        if not checked[dt]:
            continue
        counts = data["w"].setdefault(dt, {})
        counts[wk] = cint(counts.get(wk)) + 1
        # A single (a settings page) counts as used, but is not a document.
        if isinstance(name, str) and name and name != dt and frappe.db.exists(dt, name) and frappe.has_permission(dt, "read", doc=name):
            title = str(v.get("title") or name)[:140]
            data["r"] = [r for r in data["r"] if not (r[0] == dt and r[1] == name)]
            data["r"].insert(0, [dt, name[:140], title, now])
    save(data)


@frappe.whitelist()
def get_activity():
    """The user's most used document types (last 90 days) and the documents
    they opened last, leaving out anything they can no longer open."""
    if frappe.session.user == "Guest":
        return {"frequent": [], "recent": []}
    data = load() or seed()
    now = week_of()
    totals = []
    for dt, counts in (data.get("w") or {}).items():
        total = sum(cint(n) for k, n in counts.items() if now - cint(k) < WEEKS)
        if total > 0:
            totals.append((total, dt))
    totals.sort(key=lambda t: (-t[0], t[1]))
    frequent = []
    for total, dt in totals:
        meta = usable(dt)
        if not meta:
            continue
        can_create = 0
        if not cint(meta.issingle) and frappe.has_permission(dt, "create"):
            can_create = 1
        frequent.append(
            {
                "doctype": dt,
                "module": meta.module or "",
                "single": cint(meta.issingle),
                "can_create": can_create,
                "count": total,
            }
        )
        if len(frequent) >= SHOW:
            break
    recent = []
    for dt, name, title, at in data.get("r") or []:
        meta = usable(dt)
        if not meta or cint(meta.issingle) or not frappe.db.exists(dt, name):
            continue
        if not frappe.has_permission(dt, "read", doc=name):
            continue
        recent.append({"doctype": dt, "name": name, "title": title, "at": at})
        if len(recent) >= SHOW:
            break
    return {"frequent": frequent, "recent": recent}
