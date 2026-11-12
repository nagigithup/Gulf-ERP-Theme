# Adapted from Lumen Theme 0.9.1, Lumen Solutions and contributors. SPDX-License-Identifier: AGPL-3.0-only
"""The login page in the site's brand.

Frappe's script does not run on website pages, so the look is switched on
from the server: on the login page only, and only while Branded Login Page
is on, the page gets the class gulf-login and an inline stylesheet with the
brand colour, the company name and the welcome line. Every other website page
is left exactly as it was.
"""

import os
import re

import frappe
from frappe import _
from frappe.utils import cint

HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
# Login Page Style option, and the class it puts on the body
STYLES = {
    "Side panel": "gl-side",
    "Centred": "gl-centred",
    "Full colour": "gl-full",
    "Your own image": "gl-image",
    "Minimal": "gl-minimal",
}
# A public file of this site, or an image on the web. css_string() escapes
# the value, so only the start needs checking.
IMAGE = re.compile(r"^(/files/|https://)[^\r\n]+$")
HERE = os.path.dirname(os.path.abspath(__file__))
_cache = {}


def _read(rel):
    """A file from public/styles, read once per worker."""
    if rel not in _cache:
        path = os.path.join(HERE, "public", "styles", rel)
        with open(path, encoding="utf-8") as f:  # nosemgrep
            _cache[rel] = f.read()
    return _cache[rel]


def _font_faces():
    """The bundled fonts, taken from the desk stylesheet with absolute paths,
    because inline styles have no folder of their own to resolve from."""
    if "faces" not in _cache:
        css = _read("gulf_erp_theme.css")
        faces = re.findall(r"@font-face\s*\{[^}]*\}", css)
        _cache["faces"] = "\n".join(faces).replace('url("../fonts/', 'url("/assets/gulf_erp_theme/fonts/')
    return _cache["faces"]


def css_string(text):
    """A CSS string literal that can hold any text safely."""
    text = (text or "").replace("\\", "\\\\").replace('"', '\\"')
    text = text.replace("\n", "\\A ").replace("\r", "")
    # Never let the text close the style element.
    text = text.replace("<", "\\3C ").replace(">", "\\3E ")
    return '"' + text + '"'


def company_name(settings):
    name = (settings.get("login_title") or "").strip()
    if name:
        return name
    # The default company first: Website Settings keeps "Frappe" as its app
    # name on most sites.
    for getter in (
        lambda: frappe.defaults.get_global_default("company"),
        lambda: frappe.db.get_single_value("Website Settings", "app_name"),
    ):
        try:
            value = getter()
        except Exception:
            value = None
        if value and value != "Frappe":
            return value
    return "ERPNext"


def update_website_context(context):
    try:
        path = (context.get("path") or context.get("pathname") or "").strip("/")
        if path != "login":
            return
        from gulf_erp_theme.settings import get_theme_settings

        s = get_theme_settings()
        if not (cint(s.get("enabled")) and cint(s.get("branded_login"))):
            return
        brand = s.get("brand_color") or "#1463FF"
        if not HEX.match(brand):
            brand = "#1463FF"
        welcome = (s.get("login_welcome") or "").strip() or _("Sign in to continue")
        style = STYLES.get(s.get("login_style")) or "gl-side"
        image = (s.get("login_image") or "").strip()
        extra = ""
        if style == "gl-image":
            if IMAGE.match(image):
                extra = ";--gl-image:url(%s)" % css_string(image)
            else:
                # No usable image: fall back to the plain side panel.
                style = "gl-side"
        variables = "body.gulf-login{--gl-brand:%s;--gl-name:%s;--gl-tag:%s%s}" % (
            brand,
            css_string(company_name(s)),
            css_string(welcome),
            extra,
        )
        fonts = _font_faces() if cint(s.get("gulf_fonts")) else ""
        context["body_class"] = ((context.get("body_class") or "") + " gulf-login " + style).strip()
        context["colocated_css"] = (context.get("colocated_css") or "") + fonts + _read("gulf_login.css") + variables
    except Exception:
        frappe.log_error(title="Gulf ERP Theme: branded login page")
