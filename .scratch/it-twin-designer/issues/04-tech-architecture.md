# 04 — Technical architecture

Type: grilling
Status: closed
Resolved: 2026-08-15
Blocked by: 01, 02, 03

## Question

Decide the **technical architecture** for the build-to-be, informed by the starter-pack model (01), the architecture research (02), and the visualization approach (03). Resolve with the user (grilling):

1. **App structure** — Next.js App Router layout; client-only data; the set of routes/views and how state is shared across them.
2. **Data model & persistence** — the shape of the serializable twin JSON document (schema/Types, objects, relations, graph layout, reachability query history); the IndexedDB layer choice (from 02); export/import format and file shape; how object field-values are stored (informs the schema-evolution fog item).
3. **Reachability engine** — the in-memory graph build from the twin, the traversal API (root field or user, direction, result = reachable subgraph + hop chains), and where it lives (a pure module, no UI).
4. **State management** — what holds the twin, React Flow view state, and the active reachability query/result (from 02); persistence cadence (auto-save to IndexedDB).
5. **Component wiring** — React Flow (graph + simulation) + Ant Design (shell, builder, tables) integration; how custom RF nodes/edges map to entity/relation Types; theming to keep it visually rich and consistent.
6. **Schema builder** — how the drag-and-drop Type builder (Sections + Fields, with classification/category on fields) is implemented on top of Ant Design.

Record the decisions as the architecture section of the spec. This ticket also graduates the **schema-evolution** fog item once field-value storage is decided.

## Resolution

Decided 2026-08-15 via grilling. Full architecture section of the spec, confirmed by the user. Feeds ticket 05.

**1. App structure** — Next.js static export (`output: 'export'`, `images.unoptimized`, `trailingSlash`); four static routes `/schema`, `/twin`, `/tables`, `/reachability` (no dynamic segments); single shared client shell (`app/layout.tsx` → `RootShell`) owning AntD `ConfigProvider`, Zustand providers, `ReactFlowProvider`, Dexie `db`; every page `"use client"`; active twin via `?twinId=` query param + IndexedDB key in `uiStore`; in-SPA `useRouter` transitions so client state survives across routes.

**2. Data model & persistence** — One Dexie row per twin (`TwinDoc`: `id, name, createdAt, updatedAt, schema, objects, relations, graphLayout, queryHistory, meta`) + a `kv` table for app prefs; `graphLayout` separable (export can strip it); export = the row itself, import = parse → `migrateTwinDoc` → new id → `db.twins.add`; runtime `migrateTwinDoc` normalizer for imported older twins + Dexie versioned schemas for DB-level migration. **Object field-values: flat `values: Record<fieldId, value>`, sparse, keyed by stable field id**; section grouping derived from the Type at display time. (One-row-per-twin deferred-split optimization stands: split objects/relations into separate tables only if a twin exceeds a few MB.)

**3. Schema evolution** *(graduates the schema-evolution fog item)* — Hybrid: safe evolutions (add field, rename field, move/reorganize sections) are free — added fields absent→lazy default, renames free (id-keyed), section moves free. Destructive evolutions (remove field → orphaned keys; type-change → possibly invalid values) surface a per-Type **"Repair objects"** action listing affected objects + the specific conflict, reviewable before discard/transform. No silent data destruction.

**4. State management** — Zustand, four slices: `twinStore` (source of truth: schema, objects, relations, graphLayout, dirty), `flowStore` (slim — only `selectedIds`, `hoveredId`, `reachableIds`; **React Flow owns nodes/edges via `useNodesState`/`useEdgesState`**, no duplication), `reachabilityStore` (query/result/animation), `uiStore` (theme, activeView, activeTwinId, panels). Debounced (~400ms) autosave subscriber: `rf.toObject()` → merge into `twinStore` → `db.twins.put`; `dirty` flag for unsaved indicator; `useLiveQuery` only for persisted-observant lists (recent twins).

**5. Reachability engine** — Pure, UI-agnostic BFS module (no React/RF/IndexedDB) over the logical graph; adjacency built per query mode respecting each relation type's `direction` + `propagatesReachability`; returns `reachableIds` + ordered `hopChains` + `perHopReachable` buckets; **same-thread, memoized by `(graphRevision, rootId, mode)`**, Worker-deferred by design (purity means a Worker can be dropped in later with no refactor); deterministic adjacency iteration (sorted by object id then relation type id); cycle-guarded; parallel edges allowed.

**6. Component wiring** — One generic data-driven `twinNode` (icon from a typeId→icon registry, label, classification left-stripe, capability badges) + one generic `twinEdge` (solid access / dashed contains, label, `<animateMotion>` packet gated by `isHighlighted`/`hopOrder`); `nodeTypes`/`edgeTypes` declared outside the component; Dagre default auto-layout (ELK for dense, both Worker-able later); persist via `rf.toObject()` debounced; scale mitigations (memo, contextual zoom, no heavy CSS/filter/blur, edge labels on hover/highlight only). Theming: single `ConfigProvider` + `cssVar:true` + separate light/dark `ThemeConfig`, AntD tokens bridged to RF via CSS variables.

**7. Schema builder** — `@dnd-kit/sortable` + AntD `Card`/`Form`/`Select`/`Switch`/`Cascader`/`TreeSelect`; Section = sortable `Card`, Field = sortable `Form.Item`-row, add-actions `Button type="dashed"`, reference target via `TreeSelect` of Types. (Visual/interaction polish deferred to 05.)

**Fog graduated:** schema-evolution → resolved as #3 above; cleared from the map's Not-yet-specified.
**Fog resolved as out of scope:** import-from-real-systems — the local-only, manual-authoring architecture (no server, starter-pack-oriented) confirms live-system scanning is beyond this effort; file-based client-side import (SQL DDL / OpenAPI) noted as a future enhancement, not v1.