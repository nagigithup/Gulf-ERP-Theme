# Architecture

All configuration, documents and namespaces belong to gulf_erp_theme. Lumen is
neither imported nor required. Maintainable source reuse is deliberate: the
reference app remains untouched and installed on a separate local test site.

- settings.py: validated defaults, preference resolution, role landing, boot data.
- api.py: authenticated preferences, language switching and permitted favourites.
- activity.py: bounded per-user visits and recent-document permission checks.
- workspace_access.py: administrator-managed workspace visibility and role restore.
- workspace_builder.py: native Workspace Manager CRUD, colours, icons and menus.
- arabic_fixes.py: app-owned, fingerprinted Translation records and reversible sync.
- login.py: branded login context and optional explicit image request.
- install.py: coexistence guard and workspace/translation uninstall lifecycle.
- gulf_erp_theme/doctype: seven independent native DocTypes.
- gulf_erp_theme/page/gulf_apps: independently routed home screen.
- frontend/: nine feature sources joined by tools/build_assets.py into one asset.

Hooks use supported app extension points. Two inherited client workarounds are
isolated: list after_render wrapping for status chips, and translated search /
workspace header adaptations. They preserve native calls but depend on v16
internal interfaces and require upgrade regression verification. No core files
are patched. The synchronous search wrapper temporarily substitutes window.__
inside try/finally; it remains feature-gated for reference parity.

Role administration uses narrow privileged writes after explicit capability
checks. Underlying ERPNext document permissions remain native. Hiding a field
is a usability feature; it does not hide its value from authorized API readers.

Runtime dependencies: Frappe and ERPNext only. Flit builds the Python package;
the frontend concatenation needs only Python. No CDN, npm library or new worker
service is introduced. Existing legitimate Frappe realtime/API requests remain.
