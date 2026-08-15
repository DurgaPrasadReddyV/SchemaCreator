# 02 — Architecture & library research for the in-browser graph app

Type: research
Status: resolved
Blocked by:

## Question

Surface the facts the technical-architecture decision (ticket 04) waits on, for a single-user, browser-only Next.js + React + Ant Design + React Flow app that stores a serializable twin in IndexedDB and computes access-path reachability over a typed, directed graph. Investigate and report with recommendations + sources:

1. **Next.js app structure** — App Router layout for a single-page tool with multiple views (schema builder, twin editor/graph, table, reachability simulation); client-only data (no server routes needed); static export considerations.
2. **React Flow** — patterns for a typed-node / typed-edge graph editor with custom node types per entity Type, custom edge types per relation type, programmatic layout, and an animated reachability highlight (traverse + dim/pulse). Pitfalls at graph scale; persisting RF state to the twin JSON.
3. **Ant Design** — component selection for the app shell (layout/menu/tabs), the Type builder (drag-and-drop Sections + Fields — `Tree`/`Form`/`Drag`?), the twin tables (`Table` with column config), and the reachability result (hop table). Note any friction between AntD and React Flow styling.
4. **IndexedDB layer** — Dexie vs `idb` vs `idb-keyval` for storing a JSON twin document (schema + objects + relations) with export/import and simple queries. How to version/migrate the local schema.
5. **State management** — for graph editor + schema + twin + reachability result: Zustand vs Redux Toolkit vs React context; what holds the twin, what holds RF view state, what holds the reachability query/result.
6. **Reachability engine** — design for directed-graph traversal over propagation-flagged edges, bidirectional BFS/DFS from a root field or user, computing the reachable subgraph + hop chains, with relation-type direction semantics. In-memory graph build from the twin JSON.

Capture findings in `research/architecture-patterns.md`. The agent driving this ticket appends a context pointer here on resolution.

## Answer

Full report: [`research/architecture-patterns.md`](../research/architecture-patterns.md). Recommendations (one-liners):

1. **Next.js** — static export (`output: 'export'`), four static routes (`/schema`, `/twin`, `/tables`, `/reachability`), one client-rendered shell; identify the active twin by IndexedDB key + `?twinId=` query param, **not** a path segment (sidesteps the `generateStaticParams` export pitfall). Every page is `"use client"`. True zero-install, openable from disk.
2. **React Flow** — custom `nodeTypes`/`edgeTypes` registered *outside* components (one per entity Type / relation type family); **Dagre** default auto-layout (+ **ELK** for dense graphs, both in a Web Worker at scale); per-hop reachability animation via SVG `<animateMotion>` "packets" gated by `isHighlighted`/`hopOrder` — **avoid** the built-in `animated: true` `stroke-dasharray` (CPU hog at scale); persist `useReactFlow().toObject()` as a **separable `graphLayout` field**, debounced; memoization + contextual zoom + no heavy CSS to stay under the ~1k-node practical ceiling.
3. **Ant Design** — `Layout`/`Sider`/`Menu` shell, `Tabs` (draggable via @dnd-kit); Type builder = `Card`+`Form`+`@dnd-kit/sortable` (use **@dnd-kit**, not react-dnd); twin tables = `Table` with dynamic columns from a Type's summary fields; reachability hop table = expandable, row-colored, hover-synced to the graph, with a `Segmented` direction toggle. Theme both consistently via a single root `ConfigProvider` (`cssVar: true`, two separate light/dark `ThemeConfig` objects) and **bridge AntD tokens to React Flow through CSS variables** (AntD's token system doesn't reach RF's CSS — real friction, issues #54487/#53253/#53719).
4. **IndexedDB** — **Dexie.js** (declarative versioned schemas with automatic delta-based upgrades; `useLiveQuery` for reactive persisted lists). One row per twin document; a `kv` table for app prefs; a runtime `migrateTwinDoc(doc)` normalizer for imported older twins (separate from DB-level migration).
5. **State** — **Zustand** with four slices: `twinStore` (source of truth: schema/objects/relations/graphLayout), `flowStore` (RF view state), `reachabilityStore` (query/result/animation), `uiStore` (theme/active view). A debounced subscriber autosaves `twinStore` → Dexie (400ms). No Redux Toolkit (undo via a history ring buffer in a slice suffices); no Context for high-frequency graph state.
6. **Reachability engine** — a **pure, UI-agnostic module**: build mode-specific adjacency from only `propagatesReachability === true` edges respecting each relation type's `direction` (forward/reverse/bidirectional); BFS for shortest-hop-first ordering (drives the per-hop animation); returns `reachableIds` + ordered `hopChains` + `perHopReachable` buckets; run in a Web Worker for large graphs; memoized by `(graphRevision, rootId, mode)`. Full typed API in the report.

These are **inputs to ticket 04 (Technical architecture)**, which turns them into the decided architecture. They also confirm the feasibility of the whole approach — no blockers found; the headline animated-reachability feature is buildable within React Flow with the `<animateMotion>` pattern.