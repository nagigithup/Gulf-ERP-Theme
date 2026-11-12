# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
"""Improved Arabic translation, switched on and off from Gulf ERP Theme Settings.

The corrections ship as `arabic/ar_fixes.csv`, a path Frappe does not load on
its own. Turning the setting on inserts them as `Translation` records, which
every Frappe version from v13 to v16 applies on top of the app translations.
Turning it off deletes only the records Gulf created and nobody edited
since. Records an admin made by hand are never overwritten or deleted.

Gulf's records carry their own name, `ge-ar-<key>-<text>`: a fingerprint of
the source text and context, then a fingerprint of the Arabic Gulf wrote. The
name alone says that a record is Gulf's and whether someone edited it since,
so no list of records has to be kept. (Up to 0.7.0 that list lived in the
`arabic_fix_log` setting, and v13 keeps a setting in a 64 KB column, too small
for the full review. Records named that way are still recognised and renamed.)
"""

import csv
import hashlib
import io
import json

import frappe
from frappe.utils import now_datetime

LANG = "ar"
LOG_FIELD = "arabic_fix_log"
PREFIX = "ge-ar-"
CHUNK = 500


def data_rows():
    path = frappe.get_app_path("gulf_erp_theme", "arabic", "ar_fixes.csv")
    with io.open(path, encoding="utf-8") as f:
        return [
            r
            for r in csv.DictReader(f)
            if r.get("source_text") and r.get("translated_text")
        ]


def data_map():
    return {(r["source_text"], r.get("context") or ""): r["translated_text"] for r in data_rows()}


def fp(text):
    """Short fingerprint of a text."""
    return hashlib.md5((text or "").encode("utf-8")).hexdigest()[:8]


def rec_name(source, context, text):
    key = hashlib.md5((source + "\x00" + (context or "")).encode("utf-8")).hexdigest()[:10]
    return PREFIX + key + "-" + fp(text)


def is_ours(name):
    return bool(name) and name.startswith(PREFIX) and len(name) == len(PREFIX) + 19


def get_log():
    """The record list kept up to 0.7.0, as {name: fingerprint or None}."""
    try:
        raw = frappe.db.get_single_value("Gulf ERP Theme Settings", LOG_FIELD)
    except Exception:
        raw = None
    try:
        log = json.loads(raw or "{}")
    except Exception:
        log = {}
    if isinstance(log, list):
        return {name: None for name in log if name}
    return log if isinstance(log, dict) else {}


def clear_log():
    if get_log():
        frappe.db.set_single_value("Gulf ERP Theme Settings", LOG_FIELD, "{}")


def all_records():
    return frappe.get_all(
        "Translation",
        filters={"language": LANG},
        fields=["name", "source_text", "context", "translated_text"],
        limit_page_length=0,
    )


def untouched(rec, legacy, ours_text=None):
    """True when nobody edited a Gulf record since Gulf wrote it."""
    if is_ours(rec.name):
        return rec.name.endswith("-" + fp(rec.translated_text))
    if rec.name in legacy:
        written = legacy[rec.name]
        if written is None:
            return ours_text is None or rec.translated_text == ours_text
        return written in (fp(rec.translated_text), rec.translated_text)
    return False


def clear_translation_cache():
    try:
        import frappe.translate

        frappe.translate.clear_cache()
    except Exception:
        pass
    cache = frappe.cache() if callable(frappe.cache) else frappe.cache
    cache.delete_key("bootinfo")


def delete_records(names):
    names = list(names)
    for i in range(0, len(names), CHUNK):
        part = names[i : i + CHUNK]
        frappe.db.sql("delete from `tabTranslation` where name in %(names)s", {"names": tuple(part)})


def insert_records(rows):
    """rows: [(source, context, text)]"""
    if not rows:
        return
    now = now_datetime()
    user = frappe.session.user or "Administrator"
    fields = ["name", "creation", "modified", "owner", "modified_by", "docstatus", "idx",
              "language", "source_text", "translated_text", "context"]
    values = [
        (rec_name(s, c, t), now, now, user, user, 0, 0, LANG, s, t, c or None)
        for s, c, t in rows
    ]
    # Plain multi-row inserts: v13's db.bulk_insert drops the last row it is given.
    cols = ", ".join("`" + f + "`" for f in fields)
    one = "(" + ", ".join(["%s"] * len(fields)) + ")"
    for i in range(0, len(values), CHUNK):
        part = values[i : i + CHUNK]
        flat = [v for row in part for v in row]
        frappe.db.sql(
            "insert into `tabTranslation` (" + cols + ") values " + ", ".join([one] * len(part)),
            tuple(flat),
        )


def apply_fixes():
    """Bring the records in line with the data file. Adds what is missing,
    rewrites Gulf's own records whose wording changed, and removes Gulf's
    records for strings the file no longer carries. Records an admin made or
    edited are left alone. Returns counts."""
    if not frappe.db.exists("Language", LANG):
        return {"added": 0, "updated": 0, "removed": 0, "skipped": 0}
    data = data_map()
    legacy = get_log()
    records = all_records()
    have = {}
    for r in records:
        have.setdefault((r.source_text, r.context or ""), r)
    drop, add = [], []
    added = updated = removed = skipped = 0
    for key, text in data.items():
        rec = have.get(key)
        if not rec:
            add.append((key[0], key[1], text))
            added += 1
            continue
        if not (is_ours(rec.name) or rec.name in legacy):
            skipped += 1  # the admin's own record
            continue
        if not untouched(rec, legacy, text):
            skipped += 1  # Gulf's record, edited by an admin since
            continue
        if rec.name != rec_name(key[0], key[1], text):
            drop.append(rec.name)
            add.append((key[0], key[1], text))
            updated += 1
    # Gulf's records for strings the data file no longer carries.
    for r in records:
        if (r.source_text, r.context or "") in data:
            continue
        if (is_ours(r.name) or r.name in legacy) and untouched(r, legacy):
            drop.append(r.name)
            removed += 1
    delete_records(drop)
    insert_records(add)
    clear_log()
    clear_translation_cache()
    return {"added": added, "updated": updated, "removed": removed, "skipped": skipped}


def remove_fixes():
    """Delete the records Gulf created, unless someone has edited them."""
    data = data_map()
    legacy = get_log()
    drop, kept = [], 0
    for r in all_records():
        if not (is_ours(r.name) or r.name in legacy):
            continue
        if untouched(r, legacy, data.get((r.source_text, r.context or ""))):
            drop.append(r.name)
        else:
            kept += 1
    delete_records(drop)
    clear_log()
    clear_translation_cache()
    return {"removed": len(drop), "kept": kept}


def sync(enabled):
    return apply_fixes() if enabled else remove_fixes()


def is_on():
    """The setting as stored, or on when nothing is stored yet (a fresh
    install stores no settings until an admin saves the form)."""
    saved = frappe.db.get_singles_dict("Gulf ERP Theme Settings").get("arabic_fixes")
    if saved is None or saved == "":
        return True
    return bool(int(saved))


def after_install():
    """The setting is on by default, so a new install gets the corrections."""
    try:
        if is_on():
            apply_fixes()
            frappe.db.commit()
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: Arabic fixes on install")


def after_migrate():
    """An app update can bring new corrections. Add them if the setting is on."""
    try:
        if is_on():
            apply_fixes()
            frappe.db.commit()
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: Arabic fixes after migrate")


def before_uninstall():
    try:
        remove_fixes()
        frappe.db.commit()
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: Arabic fixes on uninstall")
