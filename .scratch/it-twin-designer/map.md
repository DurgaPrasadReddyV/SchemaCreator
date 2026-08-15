# Map: Browser-based IT-infrastructure digital-twin designer

> wayfinder:map

## Destination

A **decided spec** (the build is a separate, later effort) for a browser-based IT-infrastructure **digital-twin designer**, inspired by DataGerry's schema/relation model but adding the access-path reachability layer DataGerry does not have. Reaching the end of this map means: the domain/schema model, the access-reachability model, the visualization/simulation approach, the UI structure, and the technical architecture are all decided and written down — clear enough to hand to a focused build.

## Notes

**Domain.** Modeling organizational IT infrastructure as a digital twin: databases, tables, columns, database users, roles, SQL logins, web services (with a data layer), API endpoints that expose data, UI applications, and the human user at their PC. The defining question the tool answers: *"who and what can reach this sensitive data element, through what chain of access?"* and, in reverse, *"given this user, what data can they reach?"*

**Reference model.** DataGerry (open-source CMDB; AGPL-3.0; Flask + MongoDB + Angular) provides the schema-builder + typed-relations + read-only CI-Explorer half. DataGerry does NOT model data flow, lineage, or access reachability — that is this effort's greenfield addition. The full DataGerry research report lives at `research/datagerry.md` (produced during charting).

**Skills every session should consult.** `ui-ux-pro-max`, `frontend-design`, `dataviz` (for the graph + table + simulation visuals), `ant-design`/`antd`, and `mattpocock-skills:domain-modeling`. Prototype tickets should use `mattpocock-skills:prototype`; grilling tickets use `mattpocock-skills:grilling`.

**Standing decisions settled in charting (context for every later ticket — not tickets themselves):**
- **Destination** = a decided spec; build is a separate effort.
- **Schema model** = hybrid: a generic DataGerry-style Type builder (Type = Sections + Fields) **plus** a seeded IT-infra starter pack, user-extensible.
- **Data-flow layer** = two layers: a structural graph of typed object relations, and field-level lineage traces riding on it.
- **"Flow" = access-path reachability**, bidirectional (from a data element outward to who/what can reach it; from a user inward to what they can reach). Not data transformation.
- **Capability flags** (masking, encryption, …) are per-node flags shown as badges, not value-transformation steps.
- **Edge model** = typed, directed relation types (starter-pack canonical access relations + user-extensible), each declaring direction + whether it propagates reachability.
- **Persistence** = IndexedDB + export/import JSON. No server, zero install, single-user.
- **Sensitivity** = field-level classification (Public / Internal / Confidential / Restricted) + a data-category tag (SSN, Email, CreditCard, …). Reachability roots are classified/tagged fields.
- **Stack** = Next.js + React + Ant Design + React Flow.

**Standing preferences.** Visually rich and professional; keep the component count low and the components simple; do not optimize or back off features just because it runs in the browser.

## Decisions so far

- [01 — IT-infra starter pack](issues/01-it-infra-starter-pack.md) — 11 Types (incl. Server for real topology) with Sections/Fields; 9 relation types (`contains` structural/non-propagating + 8 access edges); reachability is bidirectional except mode-dependent `memberOf`, plus descendant-flood-on-access; 14 capability flags (annotate only, on nodes+edges); 4-tier classification + 14 data-categories with implied defaults. SSN example passes. Full definition: `research/starter-pack-draft.md`. Unblocks 03/04/05.
- [02 — Architecture & library research](issues/02-architecture-research.md) — static-export Next.js + RF custom typed nodes/`<animateMotion>` reachability animation + AntD/@dnd-kit shell + Dexie + Zustand (4 slices) + a pure BFS reachability engine; no blockers found. Full report: `research/architecture-patterns.md`. Feeds ticket 04.
- [03 — Visualization & reachability-simulation design](issues/03-visualization-and-reachability-sim.md) — decided: graph = typed nodes (icon+label+classification left-stripe+abbreviated capability badges) + typed edges (solid access / dashed contains), hybrid layout (manual default persisted as `graphLayout`, Dagre on demand); sim = BFS per-hop reveal, reachable-lit/unreachable-dimmed, flood annotated + contains-path highlighted, both directions via Segmented; tables = objects-of-Type + per-reachable-node hop table synced with graph; UX = graph stage + right side panel (Query/Hop/Objects/Inspector) + bottom playback bar. Image verification bypassed per user (no image access); decided by prototype code + 02 + intuition. Asset: `prototype/viz-prototype.html` (reconstructed — prior artifact accidentally deleted & unrecoverable); engine verified vs SSN traces A/B via `prototype/verify-engine.mjs`. Unblocks 04 & 05.
- [04 — Technical architecture](issues/04-tech-architecture.md) — decided: Next.js static export + 4 static routes + single client shell (providers) + `?twinId=` query param; Dexie one-row-per-twin `TwinDoc` + `kv`, separable `graphLayout`, export=the row, `migrateTwinDoc` normalizer; **object field-values flat `Record<fieldId,value>` sparse id-keyed**; **schema evolution hybrid** (safe evolutions free; destructive → per-Type reviewable "Repair objects" action); Zustand 4 slices with **RF owning nodes/edges** and a slim `flowStore` for derived UI only, debounced autosave; pure BFS reachability engine same-thread memoized (Worker-deferred); one generic data-driven `twinNode`/`twinEdge` + AntD-token→CSS-var theming; schema builder via `@dnd-kit`+AntD. Graduates schema-evolution fog; rules import-from-real-systems out of scope. Unblocks 05 (last open ticket).
- [05 — UI structure, navigation & visual direction](issues/05-ui-structure-and-visual-direction.md) — decided: AntD `Layout` (collapsible Sider `Menu` + Header twin-picker/import-export/settings/run); **5 routes** `/` (Exposure dashboard, landing) → `/schema` → `/twin` → `/tables` → `/reachability` (**revises 04's `/` → `/twin` to `/` → dashboard**); relation-type manager = section in `/schema`, import/export = header action + `Modal`, settings = `Drawer`; all 5 screens in-scope. **Visual direction (dataviz-validated, image verification bypassed)**: classification = blue ordinal ramp (darker = more sensitive; light `#86b6ef→#0d366b`, dark `#6da7ec→#184f95`); data-categories = neutral icon+label chips, NOT hue-encoded; capability flags = muted outlined badges; edges = secondary ink (solid access / dashed contains) + aqua reachability highlight + animated packet; brand/primary = violet; status palette reserved for state only; system sans + `tabular-nums` + mono IDs; dark default, light toggle. Onboarding = pre-seed SSN demo twin + coachmarks. Asset: `prototype/ui-shell-prototype.html`. Graduates one-twin-vs-many fog; **Not-yet-specified now empty — destination reached.**
- [06 — Spec: IT-infrastructure digital-twin designer](issues/06-spec-it-twin-designer.md) — the **destination artifact**: synthesis of 01–05 (+ both research assets) into one decided PRD (`Type: spec`, `Status: ready-for-agent`). Problem statement, solution, 79 user stories, full implementation decisions (domain model, app structure, data/persistence, schema evolution, state, reachability engine, component wiring, builder, viz/sim UX, visual direction, onboarding), **2 test seams** (pure reachability engine + twin-document/schema layer — confirmed with the user), out-of-scope, and further notes. The map is now closed; the build is a separate effort.

## Not yet specified

<!-- fog: in-scope decisions not yet sharp enough to ticket -->

_Empty._ The frontier has reached the destination; nothing in-scope remains undecided. (one-twin-vs-many graduated on close of 05; schema-evolution graduated on close of 04; import-from-real-systems was ruled out of scope on close of 04.)

## Out of scope

- Any server, sync backend, authentication, authorization, or multi-tenancy. Browser-only, single-user, local data.
- A full data-value execution/simulation engine. Masking, encryption, etc. are per-node capability flags (badges), not value-transforming pipeline steps. (Settled in charting.)
- The build/implementation itself. This map delivers the decided spec; building the app is a separate effort after the map closes.
- Importing from live systems (scanning a live DB schema / API spec to seed objects). v1 is manual authoring only; the local-only, no-server architecture (04) confirms live-system scanning is beyond this effort. Client-side file-based import (SQL DDL / OpenAPI paste) is a possible future enhancement, not v1. (Resolved from fog on close of 04.)