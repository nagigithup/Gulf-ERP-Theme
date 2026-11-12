# Development report - 2026-11-12

## Phase 1 - Discovery and security review

Found local Ubuntu Bench running Frappe 16.54.0 / ERPNext 16.53.0. Retrieved
nagi_theme using the existing authorized GitHub SSH login; the actual app is
lumen_theme 0.9.1. Reviewed all Python modules, targeted JS/CSS flows, hooks,
permissions, scripts, package declarations and font licences. Reviewed upstream
reference screenshots without copying customer-bearing marketing assets.
Created database/config backups before local app installation. No cloud changes.
Findings and remediation are in SECURITY_REVIEW.md. Missing production source
recovery was unnecessary because the recovered repository was available.

## Phase 2 - Foundation

Created independent gulf_erp_theme metadata, own seven DocTypes, modules/page,
configuration module, lifecycle and asset builder. Original source stays intact.
New code is marked AGPL-3.0-or-later; combined reused code remains AGPL-3.0-only.

## Phases 3 and 4 - Theme and UI coverage

Adapted the complete Lumen client and styles, not a reduced visual subset.
Maintained navigation, apps screen, forms/lists, workspace features, login modes,
notifications, profile and responsive layouts. Split the client into nine source
features with one generated output. Added focused accessibility/lifecycle fixes.
Visual equivalence, mobile overflow and native interactive behavior remain pending
browser verification; no browser automation tests were authorized or executed.

## Phase 5 - Configuration

Retained all upstream administrator options, per-user preferences, locks, module
styling, role landing and form rules. Retained workspace visibility and builder
with native capability gates. Added role ownership/collision/restore safeguards.
No accounting/inventory/business data model changed.

## Phase 6 - Arabic and English

Preserved complete app translations, locally bundled fonts, RTL/LTR styles,
multilingual search and switchable Arabic corrections. No unapproved truncation
of the correction dataset. Mixed-script and language-switch visual QA pending.

## Phase 7 - Hardening

Require POST for mutations, permission-check stored document references, reject
active navigation URL schemes, disconnect replaced notification observers, and
restore managed roles carefully on uninstall. All external resources and runtime
dependencies are documented. The core requires no internet after installation
when external login imagery is not configured. Syntax/build checks and local
installation status are recorded in LOCAL_VERIFICATION.md. No unit/integration
or browser test suite has run; role-matrix and lifecycle tests remain pending.

## Phase 8 - Publication preparation

Prepared README, licence, third-party notices, changelog, security guidance,
architecture/user guide, feature matrix, consolidated report and screenshot
checklist. Marketplace readiness is NOT claimed: full live visual/role tests,
upgrade/uninstall verification, dependency advisory review, icon/translation
provenance and current Marketplace submission review are still required.
Source prepared for the initial GitHub release. No Marketplace submission or
production deployment performed.

## Changed and reused files

All files in this repository are newly created for the independent app. Python
settings/API/activity/access/builder/login/translation logic, DocTypes, Arabic
data, fonts and CSS/JS presentation are adapted from the recovered reference;
new lifecycle code, frontend composition and documentation explain the changes.
The reference repository has not been edited. Source notices preserve attribution.
