# Static security review

Reviewed the recovered Python modules, JS, CSS, hooks, DocType permissions,
installation/build scripts and dependency declarations before installation/reuse.
No confirmed backdoor, hidden administrator, credential collector, obfuscated
payload, remote execution, guest API, telemetry or external licence check was
found in the reviewed application. This is a static-review finding, not a claim
of a comprehensive penetration test or proof that no vulnerability exists.

| Severity | Evidence | Behavior | Remediation / disposition |
|---|---|---|---|
| Medium | gulf_erp_theme/workspace_access.py:224 | Original restore unconditionally replaced workspace roles; its uninstall hook did not explicitly restore managed roles. | Added last-applied role tracking, collision checks, distinct role prefix and pre-uninstall restoration. Runtime removal remains unverified. |
| Medium | gulf_erp_theme/api.py:274 | Stored favourites originally returned names/titles after permission changes without checking each document. | Recheck existence and native document read permission before returning saved favourites. |
| Low | frontend/40-history-summary.js:193 | Browser activity cache could display previously permitted record titles after a role change. | Render history from a fresh permission-checked server response; no record-title cache writes. |
| Low | frontend/10-navigation.js:272 | Workspace URL values were used as hrefs without a scheme allowlist. | Restrict to HTTP(S) URLs; native same-origin links remain routes. |
| Low | gulf_erp_theme/api.py:215 | Original state-changing whitelisted methods also accepted GET. | Require POST on appearance, language, favourite, activity and workspace mutations; native CSRF stays enabled. |
| Informational | gulf_erp_theme/workspace_builder.py:105 | Workspace administration intentionally uses privileged writes. | Native Workspace Manager or Administrator check guards builder endpoints. Access endpoints require System Manager. Privileged writes retained for parity. |
| Informational | gulf_erp_theme/arabic_fixes.py:143 | Install adds a large Arabic correction dataset to Translation. | Intentional default-on reference feature; own name prefix/fingerprints preserve administrator records and allow reversal. |
| Informational | gulf_erp_theme/login.py:29 | An explicitly configured HTTPS login image makes an external browser request. | Retained configurable feature; default image is empty. Document external behavior and site-local alternative. |

SQL values are parameterized; dynamic translation insert column names are fixed
constants. No business accounting/stock tables are written by the theme.
Role and Translation writes are deliberate features, not classified as malicious
merely because they use privileged operations. There are no application scheduler
hooks. The source deployment helper was inspected but not run: it includes a
whole-site migration, outside the authorized app-install scope.

External communication: none initiated by server-side theme HTTP clients.
Optional configured remote login image and administrator-created URL links are
documented in README. Fonts/scripts/styles are bundled. Frappe API/realtime calls
remain same-origin. Dependency vulnerability/advisory and independent icon/data
provenance review remain pending before publication.
