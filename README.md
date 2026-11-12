# Gulf ERP Theme

An independent, bilingual Frappe/ERPNext v16 application preserving the complete
feature set and appearance of the recovered **Lumen Theme 0.9.1**. The application
has its own package, assets, settings, user defaults, workspace-access records,
translation ownership and release history. It does not import or require Lumen.

## Features

- Top bar, side menu and standard Frappe navigation layouts.
- Apps home with module colours and icons, search, recent documents and favourites.
- Per-user appearance, administrator defaults and locks, light/dark mode.
- Arabic/English language switching, multilingual search and RTL/LTR layouts.
- Local IBM Plex Sans Arabic, Plus Jakarta Sans and IBM Plex Mono fonts.
- Numbered form cards, section guide, collapsed summaries, document summaries.
- Status filters with permission-filtered counts, clearer rows and status badges.
- Workspace visibility for roles and people; workspace creation/editing/deletion.
- Module icon/colour configuration and role-based landing pages.
- Form simplification by role, Hijri dates, notices and empty states.
- Five branded login layouts, including an optional custom image.
- Switchable improved Arabic translations; all feature toggles are preserved.

## Compatibility

Targets Frappe **16.x**, ERPNext **16.x**, and Python **3.14+**. Local installation
was performed on Frappe 16.54.0 / ERPNext 16.53.0. Recovered presentation code
contains legacy compatibility branches; releases before v16 are not supported
or verified by this project.

## Install

Take a site backup first. Use a separate site when comparing against Lumen:
two enabled theme navigation shells must not share a site.

```bash
bench get-app https://github.com/nagigithup/Gulf-ERP-Theme.git
bench --site your-test-site backup
bench --site your-test-site install-app gulf_erp_theme
bench build --app gulf_erp_theme
bench --site your-test-site clear-cache
```

For a local checkout use `bench get-app --soft-link /absolute/path/gulf_erp_theme`.
Restart development web/worker processes after adding an editable Python package.

Search for **Gulf ERP Theme Settings** in Desk; only System Managers may edit it.
Open `/desk/gulf-apps` for the apps screen. Appearance choices are available in
the top bar; use the native Frappe theme controls in standard-navigation mode.

## Data, permissions and network

The appearance API stores the signed-in user's preferences only. Workspace
administration deliberately changes the selected workspace's roles and assigns
an application-specific `Gulf Workspace: ...` role to selected people. It does
not grant access to underlying business documents. The builder requires native
Workspace Manager privileges (or Administrator). Visibility management requires
System Manager. Simplified fields are presentation only, never access control.

As in Lumen 0.9.1, improved Arabic translations and short per-user activity
history are enabled by default; administrators can switch them off. Installation
adds the bundled Arabic corrections as app-owned Translation records, preserving
existing administrator translations. It does not change accounting/stock data.

Assets and fonts are local. There is no theme telemetry, external licence check,
remote script loader or background external HTTP client. An administrator may
explicitly choose an HTTPS login image; that browser request is the sole optional
theme-controlled external resource. Workspace URL links and existing Frappe
logos/integrations retain their administrator-configured behavior. Leave the
login image empty or use `/files/...` for an offline installation.

## Develop

Maintain browser features in `frontend/`, then run:

```bash
python tools/build_assets.py
bench build --app gulf_erp_theme
bench --site your-test-site clear-cache
```

The generated asset is checked in to support normal Bench installs without
additional Node dependencies. CSS uses a scoped `html.gulf` namespace. Read
[architecture](docs/ARCHITECTURE.md), [feature parity](docs/FEATURE_PARITY.md),
[security review](docs/SECURITY_REVIEW.md) and [development report](docs/DEVELOPMENT_REPORT.md).

## Uninstall

Use normal Bench uninstall only after backing up and reviewing its confirmation.
Gulf first restores workspace roles it managed and removes only its unedited
Arabic Translation records. Later administrator changes to workspace role lists
are preserved; Gulf-owned roles are removed. Created workspaces and business
documents are not deleted by the lifecycle hook. Frappe handles removal of app
DocTypes. Uninstall has not been executed during this development session.

## License and status

The combined distribution is **AGPL-3.0-only** because reused Lumen code has that
restriction. New independent code marked AGPL-3.0-or-later retains that grant;
third-party font files retain OFL-1.1. See [COPYING](COPYING.md) and
[third-party notices](THIRD_PARTY_NOTICES.md). This is an attributed derivative,
not a claim of ownership of the original Lumen implementation.

Marketplace publication has not been performed. Functional code
parity is implemented; end-to-end visual, role-matrix, upgrade and uninstall
verification remain pending. No automated test suite or browser tests have run.
