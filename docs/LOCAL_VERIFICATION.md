# Local verification - 2026-11-12

Completed:

- Retrieved and installed the unmodified Lumen reference (0.9.1).
- Backed up both selected local sites before app installation.
- Installed independent Gulf ERP Theme 0.1.0 on the second local site.
- Built assets and compiled app translations through Bench.
- Read native Frappe boot data: both themes enabled and loaded, builder allowed
  for Administrator, workspace visibility and builder enabled.
- All 66 reference settings fields retained; no missing fields in static schema comparison.
- Both reference and Gulf have 19,323 app-owned Arabic correction records.
- Both login pages return HTTP 200; Gulf CSS and JS return HTTP 200.
- Gulf login is reachable from Windows at localhost port 8001 (HTTP 200).
- Frappe 16.54.0, ERPNext 16.53.0; live sidebar/boot schema matches client inputs.
- Python compileall, JavaScript node --check and JSON parsing completed successfully.
- Reference repository git status remains clean.
- Local development web servers, worker and scheduler restarted for the new package.

The Gulf remote is an empty Git repository. Bench get-app installed the editable
package but its final version-sync step expected an existing commit. The local
app metadata was registered honestly as an uncommitted main branch, followed by
successful normal install-app/build commands. No fake commit or forced install
was used. At installation time the app correctly reported UNVERSIONED because the
repository had no commits. The initial source release resolves that condition.

Not performed:

- Automated unit/integration/browser tests (not authorized by the supplied prompt).
- Full interactive/pixel/RTL/mobile verification or non-administrator role-matrix tests.
- Runtime workspace create/delete/access changes or Arabic toggle/remove testing.
- Upgrade/uninstall/restore exercises or cross-version compatibility testing.
- Whole-site bench migrate, production/cloud changes or Marketplace publishing.

Installation and boot loading are verified. Complete interactive feature parity
and Marketplace readiness are not yet certified. Follow SCREENSHOTS.md for the
remaining acceptance work after the relevant verification is authorized.
