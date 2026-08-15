# 05 — UI structure, navigation & visual direction

Type: prototype
Status: closed
Resolved: 2026-08-15
Blocked by: 03
Image verification: bypassed per user (text-only model) — decided by prototype code + 04 + design skills + intuition, as 03 was.

## Question

Decide the **app shell, primary screens, navigation, and visual direction** — making it visually rich and professional while keeping the component count low. Raise fidelity with a prototype (use `mattpocock-skills:prototype` + `ui-ux-pro-max` + `frontend-design`). Resolve:

1. **App shell & navigation** — the top-level layout (Ant Design `Layout`/`Menu`/`Tabs`): how the user moves between Schema builder, Twin editor (graph), Table view, and Reachability simulation. Whether the graph/table/simulation are tabs over one twin or separate routes.
2. **Primary screens** — the inventory of screens and what each contains (informed by 03's views): schema/Type builder, relation-type manager, twin graph editor, twin table, reachability simulation, and any dashboard/overview (counts, sensitive-data exposure). Decide which are in-scope vs. deferred.
3. **Visual direction** — the look-and-feel: layout grid, color system (incl. classification/category color semantics used in graph + table), typography, node/edge styling, dark/light. Consistent across graph, table, and simulation so they read as one system (consult `dataviz`).
4. **Empty/onboarding state** — what a brand-new user sees: the starter pack pre-seeded, the SSN example as a demo twin, and how to go from "open the app" to "run my first reachability query."

This ticket graduates the **one-twin-vs-many** fog item once the shell/navigation is decided. Link the prototype artifact from the resolution.

## Resolution

Decided 2026-08-15 via prototype (image verification bypassed per user; visual direction computed + validator-confirmed via the dataviz skill, not eyeballed). Asset: `prototype/ui-shell-prototype.html` (self-contained, dark default + light toggle, openable from disk). This is the last open ticket — the map's destination is reached.

**1. App shell & navigation** — AntD `Layout`: collapsible `Sider` with a `Menu` of the five routes; `Header` with the **twin picker** (name + recent list, one active twin), Import/Export actions, Settings `Drawer`, and a primary "Run reachability" button. Five routes: `/` (Exposure dashboard, landing) → `/schema` → `/twin` → `/tables` → `/reachability`. **Revises 04's "`/` → `/twin`" to "`/` → dashboard."** Relation-type manager is a section within `/schema`; Import/Export = header action + `Modal`; Settings = `Drawer`. Draggable multi-open twin tabs deferred as polish.

**2. Primary screens (all in-scope for v1)** — Exposure dashboard; Schema builder (Types + Relation Types); Twin graph editor; Tables; Reachability sim. Dashboard = estate counts, sensitive-field exposure by classification, top exposure paths; doubles as the onboarding surface.

**3. Visual direction** *(dataviz-computed, validator-passed)*:
- **Classification = blue ordinal ramp** — light `#86b6ef → #3987e5 → #1c5cab → #0d366b`; dark `#6da7ec → #3987e5 → #256abf → #184f95`; darker = more sensitive; always label-paired (never color-alone). Validated with `dataviz/scripts/validate_palette.js --ordinal` in both modes (all checks pass).
- **Data-categories = neutral icon+label chips**, NOT hue-encoded (14 hues would be illegible; identity from icon+label).
- **Capability flags = muted outlined badges** (icon + abbrev label); not status colors, not a hue set — so the classification stripe dominates each node.
- **Edges = secondary ink** (solid access / dashed contains); **reachability highlight = aqua** (`#1baf7a` light / `#199e70` dark) + thicker stroke + animated `<animateMotion>` packet; distinct from blue classification.
- **Brand / primary action = violet** (`#4a3aa7` light / `#9085e9` dark) — distinct from blue classification; avoids AntD-default-blue reading as classification.
- **Status palette reserved** (good `#0ca30c` / warning `#fab219` / serious `#ec835a` / critical `#d03b3b`) for actual state only — save state, repair conflicts, exposure severity — never for series/category.
- **Typography**: system sans (`system-ui, -apple-system, "Segoe UI", sans-serif`) + `font-variant-numeric: tabular-nums` for numeric table columns + monospace (`ui-monospace, SF Mono, Menlo, Consolas`) for object IDs / field keys / technical values. **Dark default**, light toggle (both ramp-validated). No `filter:`/blur/shadow on nodes (perf); edge labels on hover/highlight at scale. AntD tokens bridged to React Flow via CSS variables under a single `ConfigProvider` (per 04).

**4. Empty/onboarding state** — first run auto-creates a demo "Acme Corp" twin with the SSN trace; user lands on a populated dashboard; a one-time coachmark guides "pick a sensitive field → run reachability." New blank twin shows a "starter pack loaded — add your first object" prompt. No separate tutorial route.

**Fog graduated:** one-twin-vs-many → resolved as #1 (multiple twins, one active via header picker); cleared from the map's Not-yet-specified, which is now empty.