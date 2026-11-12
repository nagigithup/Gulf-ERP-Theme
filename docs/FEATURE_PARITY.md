# Lumen 0.9.1 feature parity

Reference commit: 2e8a6327a9ab2d58b3f8fdc2179b71ba9c5ff893.
All upstream settings and seven DocTypes are retained in independent namespaces.

| Feature | Implementation | Verification |
|---|---|---|
| Navigation | Top bar, side menu, standard navigation, responsive drawer, module menus | Source parity; live interaction pending |
| Apps home | Greeting/date, module tiles/icons/colours, native search, recent/most used/favourites | Source parity; live interaction pending |
| Appearance | User layout/colour/bar/mode, admin defaults and locks, reset controls | Source parity; live interaction pending |
| Languages | Arabic/English switch, multilingual search, RTL/LTR and local fonts | Source parity; live interaction pending |
| Forms | Numbered cards, guide, collapsed summaries, summary card, simplified fields by role | Source parity; live interaction pending |
| Lists | Rows, semantic status badges, quick filters and permission-filtered counts | Source parity; live interaction pending |
| Workspaces | Visibility by people/roles, builder create/edit/delete, number cards and module styling | Source parity; live interaction pending |
| Arabic corrections | Default-on dataset, settings toggle, fingerprinted inserts/updates/removal | Source parity; live interaction pending |
| Additional | Role landing, Hijri dates, dismissible notice, empty states, five login styles | Source parity; live interaction pending |

No feature was dropped for being permission-related or database-backed.
Security changes preserve feature intent: scoped role ownership, authenticated
POST mutations, current permission checks for records, no stale browser titles,
safe URL schemes and cleanup that avoids overwriting later administrator edits.
Identical rendered output and workflow behavior have not been asserted without
browser and role-based verification. Accessibility focus and reduced-motion
handling deliberately improve those states without changing the default design.
