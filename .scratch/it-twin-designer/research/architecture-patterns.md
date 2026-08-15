# IT-Infrastructure Digital-Twin Designer — Architecture Patterns

**Wayfinder research ticket 02.** Scope: concrete, opinionated architectural recommendations for a single-user, browser-only, zero-install IT-infrastructure digital-twin designer. Fixed stack: Next.js (App Router) + React + Ant Design + React Flow. No server, no auth, no backend. Persistence in IndexedDB; the whole twin is a serializable JSON document with export/import.

Each section ends with a **Recommendation** block. Sources are listed at the end.

---

## 1. Next.js App Router structure for a client-only single-page tool

### The core question
Because there is **no server, no auth, no backend, and no dynamic URL params** (a local tool that opens one twin document at a time), we are in the simplest possible routing situation: a handful of fixed views — **Schema/Type builder**, **Twin graph editor**, **Table view**, **Reachability simulation** — plus an import/export and settings surface. None of these require dynamic route segments (`/[twinId]`).

This matters because the well-documented pain point with `output: 'export'` in the App Router is specifically **client-only dynamic route segments** — `app/[slug]/page.tsx` — which fail with `Error: Page "/x/[y]" is missing exported function "generateStaticParams()"`. Vercel confirmed this is unsupported and is actively building a fix (the 19-part PR stack starting at [#93557](https://github.com/vercel/next.js/pull/93032)). We avoid this entirely by using only static route segments (`/schema`, `/twin`, `/tables`, `/reachability`) and query strings where needed (`?twinId=local`).

### Trade-offs: static export vs. normal Next for a local-only tool

| | `output: 'export'` (static) | Normal Next (dev/SSR) |
|---|---|---|
| Output | Pure static HTML/CSS/JS in `out/` — openable from `file://` or any static host | Requires `next dev`/`next start` (Node) |
| Zero-install promise | Yes — can be opened directly from disk, served from a USB stick, hosted on GitHub Pages, or bundled into an Electron/Tauri shell | No — needs Node runtime to serve |
| App Router dynamic routes | **Unsupported** for client-only dynamic segments (we don't need them) | Full support |
| Server components / Route Handlers | Not available (no server) — but we don't want them anyway | Available but unused |
| Code-splitting per route | Yes — one HTML file per route, better than a Vite SPA's single `index.html` ([gaearon gist](https://gist.github.com/gaearon/9d6b8eddc7f5e647a054d7b333434ef6)) | Yes |
| Hard navigation loses client state | True for static MPA-style; we avoid by staying an SPA (single shell, view switch in place) | N/A |
| Image optimization / dynamic OG | Unavailable | Available |
| Verdict for this app | **Ideal** | Overkill, adds Node dependency |

### Do we need server components / routes?
**No.** Every page is `"use client"`. There is no data to fetch at request time, no SEO, no dynamic params. Server components would only add a build step that produces empty shells. Mark the root layout `'use client'` or keep just enough of a server layout to emit the HTML shell and let everything inside be client-rendered. Concretely: each `page.tsx` is a single client component that renders the view for that route; there is no server logic.

### Recommended layout
- **`next.config.js`**: `{ output: 'export' }`, `images: { unoptimized: true }`, `trailingSlash: true` (cleaner static-host fallbacks).
- **Single shared client shell** rendered by `app/layout.tsx` → `RootShell` (client component) holding the Ant Design `<Layout>` with `<Sider>` Menu + `<Tabs>` for the four primary views. The shell owns the AntD `ConfigProvider`, the Zustand providers, the `ReactFlowProvider`, and the Dexie `db` context.
- **Routes** map 1:1 to the four views (all static segments, no dynamic params):
  - `/` → redirect to `/twin` (or a landing/`open recent` page)
  - `/schema` → Type builder (generic Type = Sections + Fields, plus IT-infra starter pack management)
  - `/twin` → React Flow graph editor (the primary workspace)
  - `/tables` → table view (typed objects per Type, dynamic columns = summary fields)
  - `/reachability` → reachability simulation view (root picker + animated graph + hop table)
- **View switching stays in-SPA**: use `next/navigation`'s `useRouter().push()` for the four routes; the static export emits one HTML per route so navigation is a client-side transition with no full reload. Client state (Zustand stores) persists across these transitions because the shell is the same client tree on every route.
- **No `[dynamic]` segments.** The "current twin" is identified by an IndexedDB key held in a Zustand store + a `?twinId=` query param, never a path segment. This sidesteps the entire `generateStaticParams` problem.

### Recommendation
Ship as a **static export (`output: 'export'`)** with four static routes and a single client-rendered shell. Use query params (not path segments) for the active twin id. Every page is `"use client"`. This gives a true zero-install, openable-from-disk tool while keeping Next's per-route code-splitting. The only reason to drop `output: 'export'` would be if we later needed server-side features (auth, sharing) — which is explicitly out of scope.

---

## 2. React Flow patterns for a typed-node / typed-edge graph editor

React Flow (v12, package `@xyflow/react`) is DOM-based with a practical ceiling around ~1,000 nodes for complex nodes; the maintainers recommend canvas/WebGL alternatives (cytoscape.js, react-force-graph) beyond that. Our twin realistically reaches hundreds to low thousands of nodes (a large enterprise IT estate), so we design for that band and include mitigations.

### Custom node types per entity Type
- Define one custom node component per **entity Type family** (Database, Table, Column, WebService, ApiEndpoint, UiApp, User, SqlLogin, DatabaseUser, …), registered in a `nodeTypes` object declared **outside** the component (React Flow docs: defining `nodeTypes` inline causes infinite re-renders).
- Each node renders: an icon (mapped from the Type), a label, classification color (driven by a `classification` field → AntD token color), and per-node **capability badges** (masking, encryption, audit-logged, …) — read-only status chips, not value transforms.
- Use multiple `<Handle>` (source/target) where a Type has semantically distinct endpoints (e.g., a WebService exposes a `serviceAccount` handle vs. an `endpoint` handle). This enables type-correct edge connection via `isValidConnection`.
- Node `data` payload shape (recommended):
  ```ts
  type TwinNodeData = {
    objectRefId: string;          // FK into the twin objects store
    typeId: string;                // e.g. 'database.column'
    label: string;
    classification?: 'public' | 'internal' | 'confidential' | 'restricted';
    capabilities: string[];        // ['masking','encryption', ...]
    summaryFields: Record<string, unknown>; // for table-view reuse
  };
  ```

### Custom edge types per relation type
- One custom edge component per **relation type family**, registered in `edgeTypes` (also outside the component). Each renders a label (the relation type's display name) and a directional arrow marker.
- Relation types are first-class, user-extensible (just like object Types). Each relation type carries a `propagatesReachability: boolean` flag (consumed by the reachability engine, §6) and a `direction` semantic (`forward` / `reverse` / `bidirectional`) controlling how traversal maps source→target.
- Edge `data` payload:
  ```ts
  type TwinEdgeData = {
    relationTypeId: string;       // e.g. 'accesses','mapsTo','usesServiceAccount'
    direction: 'forward' | 'reverse' | 'bidirectional';
    propagatesReachability: boolean;
    hopOrder?: number;             // filled by reachability engine for animation
  };
  ```
- Use `getSmoothStepPath` or `getBezierPath` for path geometry; render `<BaseEdge>` plus an optional `<EdgeLabel>` for the relation name.

### Programmatic / auto layout
React Flow has no built-in layout engine. Two viable libraries:

| Library | Strengths | Fit |
|---|---|---|
| **Dagre** (`@dagrejs/dagre`) | Simple, synchronous, tree/layered layouts, dynamic node sizes | Good default for an IT access graph (mostly layered: users → apps → APIs → services → DBs → columns) |
| **ELK.js** (`elkjs`) | Async, powerful, edge routing, ports, sub-flows, highly configurable | Use when graphs get dense or we need edge routing to avoid spaghetti |

**Recommendation:** ship **Dagre** as the default auto-layout (layered, top-to-bottom or left-to-right by relation direction), with an option to switch to **ELK** for large/dense twins. Reuse the React Flow `useAutoLayout` hook pattern from the official Pro examples. Run layout off the main thread for large graphs: compute layout in a Web Worker (Dagre is sync but CPU-heavy at 1k+ nodes; ELK is already async) and apply positions back via `setNodes`.

### Animated reachability highlight (the headline feature)
Goal: from a root (a sensitive Column or a User), animate traversal outward hop-by-hop; reachable nodes highlight, unreachable dim, per-hop relation labels shown.

- **Do not use the built-in `animated: true`** (`stroke-dasharray` marching ants) for the highlight at scale — it is a known CPU hog with hundreds of edges ([Liam ERD perf post](https://liambx.com/blog/tuning-edge-animations-reactflow-optimal-performance)). Instead:
  - Use a **custom edge** that renders a `<circle>` with SVG `<animateMotion dur=... path={edgePath} repeatCount="indefinite">` — a "packet" flowing along the edge. Gate this animation behind `data.isHighlighted === true && data.hopOrder === currentHop` so only the edges in the active reachability path animate.
  - For per-hop sequencing, stagger `<animateMotion begin={hopOrder * delay}s}>` so edges light up in traversal order. Drive the "current hop" with a small `requestAnimationFrame`/`setTimeout` ticker in the reachability view (not in the engine — the engine is pure, §6).
- **Dim unreachable nodes/edges**: set `style.opacity` to ~0.2 on nodes/edges not in the reachable set, and full opacity + thicker stroke + classification color on reachable ones. Apply via mapping over nodes/edges from the engine result (do **not** read the whole `nodes` array inside child components — keep derived `reachableIds` in a separate store slice to avoid re-render storms; React Flow perf docs).
- **Reset**: clear highlights on `onPaneClick` and when the reachability query is cleared.

### Persisting React Flow node positions / viewport into the twin JSON
- The canonical API is `useReactFlow().toObject()` → `{ nodes, edges, viewport }` (`ReactFlowJsonObject`). Store this as the `graphLayout` field of the twin document in IndexedDB.
- **Autosave pattern** (debounced, §4/§5): subscribe to node/edge changes and `onMoveEnd` (viewport); debounce 300–500ms; call `rf.toObject()`, merge into the twin JSON, and write to Dexie. Do not save on every drag tick.
- **Restore on mount**: read the twin from Dexie, `setNodes(layout.nodes)`, `setEdges(layout.edges)`, `setViewport(layout.viewport)` inside `onInit` (guard `rf.viewportInitialized`).
- Keep `graphLayout` **separate from the logical twin** (objects + relations) in the JSON document so that re-running auto-layout doesn't mutate logical data, and so import/export can choose to include or strip layout.

### Scale pitfalls and mitigations (hundreds–low thousands of nodes)

| Pitfall | Mitigation |
|---|---|
| React re-render storm on every drag | `React.memo` nodes/edges; `useCallback`/`useMemo` for handlers/options; store derived `reachableIds`/`selectedIds` in a separate Zustand slice, never filter `nodes` in children |
| `onlyRenderVisibleElements` causes mount/unmount thrash on pan/zoom | Use it, but combine with **contextual zoom** (render simplified node representation when zoomed out) to reduce per-node cost |
| Heavy CSS (blur, drop-shadow) kills FPS even at ~30 nodes | Avoid `filter:`; use solid borders/fills; reserve visual flair for highlighted reachability edges only |
| >~1,000 complex nodes | Consider clustering/collapsing (toggle `hidden` on subtrees), or for very large estates, evaluate canvas-based alternatives (cytoscape.js) — but stay in React Flow for the editor UX; we accept "render the focused subgraph" as a product rule |
| Edge label clutter at scale | Show relation labels only on hover or on highlighted reachability edges; hide otherwise |
| Auto-layout cost on big graphs | Run Dagre/ELK in a Web Worker; show a progress indicator; only re-layout on explicit user action or structural change |

### Recommended node/edge data model (summary)
- `node = { id, type: 'twinNode', position, data: TwinNodeData, ...rfProps }`
- `edge = { id, source, target, type: 'twinEdge', data: TwinEdgeData, ...rfProps }`
- The **logical twin** (objects + relations) is the source of truth (Zustand + Dexie). The **graph layout** (positions/viewport) is a derived, separable layer. Node/edge `id`s are stable and map 1:1 to `objectRefId`/`relationId` so layout can be re-attached after a structural change.

---

## 3. Ant Design component selection

### App shell
- **`Layout`** (`Sider` + `Header` + `Content`) for the outer chrome. Collapsible sider.
- **`Menu`** in the sider for the four primary views (Schema, Twin, Tables, Reachability) + Import/Export + Settings.
- **`Tabs`** (draggable variant using `@dnd-kit/core` + `@dnd-kit/sortable` — official AntD demo `components/tabs/demo/custom-tab-bar-node.tsx`) for in-view tabbed panels (e.g., multiple open twins, multiple reachability queries). Use `items` API (v5+).
- **`FloatButton`** / `Affix` for quick actions (run layout, save, export).

### Type builder (drag-and-drop Sections + Fields)
- AntD has **native `@dnd-kit` integration examples** for Table (row + column drag sorting) and Tabs. For a full Section/Field builder, prefer **`@dnd-kit/core` + `@dnd-kit/sortable`** directly (more flexible than AntD's built-in drag demos, and the same library AntD itself uses).
- Map:
  - Section container → `Card` with a `@dnd-kit` sortable wrapper; section header uses `Typography.Title` level 5 + an actions dropdown.
  - Field row → a `@dnd-kit/sortable` item rendered inside an AntD `Form.Item`-styled row; field type chosen via `Select`; field flags (propagatesReachability, masked, etc.) via `Switch`/`Checkbox`.
  - Add Section / Add Field → `Button type="dashed"` (AntD convention for "add" actions).
  - Field type picker (text, number, ref, enum, classification) → `Select` with `options`.
  - Reference field target picker → `TreeSelect` (tree of Types) or `Cascader`.
- Avoid react-dnd — @dnd-kit is the modern successor, has better accessibility, and AntD already ships examples with it.

### Twin tables
- **`Table`** with **dynamic columns** derived from the selected Type's "summary fields" (the fields flagged `summary: true` in the Type definition). Build the `columns` array at runtime from the Type schema.
- Use the `hidden` column prop (since v5.13) and a "Column Settings" dropdown (`Checkbox.Group`) for show/hide at runtime.
- Row actions (edit, delete, focus-in-graph) via a trailing `Column` with `Dropdown`/`Space`.
- For large object sets, use `Table`'s `pagination` + `scroll={{ y }}` virtualization; for very large sets consider `Table` with `virtual` prop (v5.x) — confirms the docs' "stress test" guidance.
- Drag-sorting rows/columns via the official `@dnd-kit`-backed `components` prop customization (AntD docs `components/table/demo/drag-sorting.md`).

### Reachability hop table
- **`Table`** with columns: `Hop #`, `Object (type+label)`, `Relation traversed` (with direction arrow), `Reached via (parent object)`, `Classification`, `Capabilities`.
- Each row expandable (`expandable`) to show the full object detail and the edge's relation-type metadata.
- Use `Table`'s row `className`/`onRow` to color rows by hop (gradient from hot to cool) and to hover-sync with the graph (hovering a hop row highlights the corresponding edge in the React Flow pane).
- Provide a `Segmented` control to switch direction: "Who can reach this" vs. "What this can reach".

### Styling/theming friction between AntD and React Flow
**Real friction exists.** AntD's theming is token-based via `ConfigProvider` (3-layer Seed→Map→Alias tokens, `theme.darkAlgorithm`, `cssVar: true` since 5.12). React Flow ships its own CSS (`.react-flow__node`, `.react-flow__edge`, `.react-flow__controls`, `.react-flow__attribution`) that consumes **none** of AntD's tokens. Known antd issues (#54487 — no per-algorithm token override; #53253 — nested ConfigProvider component-token precedence; #53719 — `useToken()` output defeats darkAlgorithm if merged back) make "one theme object for both" fragile.

### How to theme both consistently (recommendation)
1. **Single `ConfigProvider`** at the root with `theme={{ algorithm, token, cssVar: true, hashed: false }}`. Maintain **two separate `ThemeConfig` objects** (light/dark) — do not try to override a single token for one algorithm only (issue #54487 confirms this is unsupported by design).
2. **Bridge AntD tokens → React Flow via CSS variables.** Read AntD tokens with `theme.useToken()` and emit a small set of CSS custom properties (e.g., `--twin-node-bg`, `--twin-node-border`, `--twin-edge`, `--twin-bg`) onto the React Flow container. Have custom nodes/edges consume these CSS vars (inline `style` or a `.twin-flow` class). This keeps React Flow visually consistent without it needing to know about AntD's token system.
3. Enable **`cssVar: true`** on AntD so theme switches are cheap (no style re-serialization) and the same CSS vars can drive React Flow.
4. Wrap static-method consumers (`message`, `Modal`, `notification`) in AntD's `App` component so they respect the ConfigProvider theme (long-standing antd gap).
5. Avoid `filter: blur()` and heavy shadows on graph nodes (perf, §2).

### Recommended component map (concrete)

| Surface | AntD component | Notes |
|---|---|---|
| App shell | `Layout` + `Sider` + `Header` + `Content` | collapsible sider |
| Primary nav | `Menu` (inline mode) | four views + settings |
| In-view tabs | `Tabs` (draggable via @dnd-kit) | multiple twins/queries |
| Type builder | `Card` + `Form` + `@dnd-kit/sortable` + `Select`/`Switch`/`Cascader` | @dnd-kit, not react-dnd |
| Twin tables | `Table` (dynamic columns, `hidden`, drag-sort via @dnd-kit) | columns from Type summary fields |
| Reachability hop table | `Table` (expandable, row-colored) + `Segmented` (direction) | hover-sync to graph |
| Object/relation inspector | `Drawer` (right) + `Descriptions` + `Form` | edit selected node's object |
| Capability/classification badges | `Tag` (color from classification) + `Tooltip` | read-only status |
| Toolbar actions | `Button`, `FloatButton`, `Dropdown`, `Space` | run layout, save, export |
| Import/Export | `Upload` (drag) + `Modal` | JSON file in/out |
| Settings / theme | `Segmented` (light/dark) + `Form` | drives ConfigProvider algorithm |
| Reachability root picker | `TreeSelect` / `AutoComplete` | pick a Column or User |

---

## 4. IndexedDB layer

### Comparison for our use case
We store one JSON twin document per "twin" (schema + objects + relations + graph layout + query history), with export/import and simple queries (list twins, list objects of a Type, find relations of a relation type). This is a **queryable document store**, not a single key-value bag.

| | Dexie.js | idb | idb-keyval |
|---|---|---|---|
| API level | ORM-like: typed tables, indexed queries, live queries, transactions | Thin promise wrapper over native IndexedDB | Ultra-minimal async key-value (one store) |
| Bundle | ~30KB | ~1KB | smallest |
| Schema/migration | **Declarative versioned schemas** (`db.version(n).stores({...})`) with **automatic delta-based upgrades** and per-version `.upgrade(tx => ...)` functions — robust | Manual `if (oldVersion < N)` guards in `openDB(..., { upgrade })` — error-prone as migrations accumulate | **None** — no schema concept |
| Queries | `where().equals()/above()/between()`, compound indexes, `liveQuery`/`useLiveQuery` reactive queries | Raw store/index access; you write the query logic | none (key get/set only) |
| Cross-table transactions | `db.transaction('rw', db.a, db.b, async () => {...})` | yes, manual | no |
| React integration | `dexie-react-hooks` → `useLiveQuery` | none (roll your own) | none |
| Fit for "JSON twin doc + queries + migrations" | **Excellent** | Workable but verbose | **Too thin** |

### Recommendation: **Dexie.js**
It is the clear default for an app-like local document store with queries and version migration. Its declarative versioned schemas with automatic delta-based upgrades are materially safer than idb's manual `oldVersion` checks, and idb-keyval simply has no query/migration story. Dexie is used by ChatGPT, WhatsApp Web, GitHub Desktop, etc. The ~30KB bundle is irrelevant for a local tool.

### Schema sketch
```ts
// db.ts
import Dexie, { Table } from 'dexie';

export interface TwinDoc {
  id: string;            // uuid
  name: string;
  createdAt: number;
  updatedAt: number;
  schema: TwinSchema;    // Type definitions (generic Type = Sections+Fields) + relation types + IT-infra starter pack
  objects: TwinObject[]; // typed instances
  relations: TwinRelation[]; // typed directed edges (logical)
  graphLayout: ReactFlowJsonObject | null; // positions + viewport (separable)
  queryHistory: ReachabilityQuery[]; // saved reachability runs
  meta: Record<string, unknown>;
}

class TwinDatabase extends Dexie {
  twins!: Table<TwinDoc, string>;
  kv!: Table<{ key: string; value: unknown }, string>; // app prefs (active twin id, theme, recent)

  constructor() {
    super('ittwin');
    this.version(1).stores({
      twins: 'id, name, updatedAt',
      kv: 'key',
    });
    // future:
    // this.version(2).stores({ twins: 'id, name, updatedAt, *typeIds' }).upgrade(tx => ...);
  }
}
export const db = new TwinDatabase();
```

Notes:
- We store the **whole twin as one document row** (`twins` table, one row per twin) — simplest model for export/import (the row *is* the export). For very large twins we can later split `objects`/`relations` into separate tables keyed by `twinId`; defer that optimization until a twin exceeds a few MB.
- `graphLayout` is stored on the twin row but is **logically separable** — export can include or omit it.
- `kv` holds trivial app prefs (active twin id, theme, last view). Per the Dexie community guidance, don't put trivial UI state (hover, active tab) in IndexedDB.

### Versioning / migration over time
- **Always bump the version number** when changing stores/indexes; never reuse a version number after deploy (Dexie rule).
- Provide an `.upgrade(tx => { ... })` for data-shape changes; upgrades must be **cumulative and idempotent** (a v1 install upgrading straight to v5 must run v1→v2→…→v5 in order — Dexie handles this automatically).
- Add indexes (not stores) via a new version that re-declares the same stores with additional index fields.
- For the **JSON twin document's internal schema** (Type definitions, relation types), embed a `schemaVersion` inside `TwinDoc.schema` and write a runtime `migrateTwinDoc(doc)` normalizer applied on load — separate from the DB-level Dexie migration. This handles user-imported older twins.

### Export/import
- Export: `JSON.stringify(await db.twins.get(id))` → download via `Blob` + anchor. Optionally strip `graphLayout`.
- Import: parse JSON, run `migrateTwinDoc`, assign a new `id`, `db.twins.add(...)`. Validate against the current app schema version.

---

## 5. State management

### Comparison for our three state domains

We have three distinct state domains:
1. **The twin** (schema + objects + relations + graphLayout) — the source of truth, persisted.
2. **React Flow view state** (nodes, edges, viewport, selection, drag-in-progress) — ephemeral, derived partly from the twin, partly user interaction.
3. **Active reachability query/result** (root, direction, reachable ids, hop chains, current animated hop) — ephemeral, derived from the twin + a user query.

| | Zustand | Redux Toolkit | React Context + useReducer |
|---|---|---|---|
| Size | ~1.1KB | ~11KB | 0 (built-in) |
| Subscription | **selector-based** (component re-renders only on its slice) | selector-based | **broadcast** — every consumer re-renders on any change |
| Undo/redo / time-travel | possible but shallow | **best-in-class** (DevTools, action replay) | manual |
| Boilerplate | minimal | moderate (createSlice) | minimal but scaling is painful |
| Works outside React | yes | yes | no |
| Perf on 1k-item single update | ~1.8ms | ~2.1ms | ~12.3ms (worst) |
| Fit for high-frequency graph drag | good | good | **bad** (re-render storms) |

### Recommendation: **Zustand** as the primary client store, with clear slice separation

We do not need Redux Toolkit's time-travel/replay as a product feature (undo of graph edits can be done with a simpler history ring buffer in a Zustand slice). Context is wrong for high-frequency graph state. Zustand's selector subscriptions, tiny size, `immer`/`devtools`/`persist` middleware, and ability to be read outside React (from the reachability engine and autosave subscriber) make it the right default.

### Store topology (clear separation of concerns)

```
twinStore          (source of truth: the open twin document)
  - schema: { types, relationTypes, starterPackVersion }
  - objects: Map<id, TwinObject>
  - relations: TwinRelation[]
  - graphLayout: ReactFlowJsonObject | null
  - dirty: boolean
  - actions: loadTwin(id), updateObject, addRelation, setGraphLayout, ...

flowStore          (React Flow ephemeral view state)
  - nodes, edges, viewport (mirrors graphLayout when not being edited)
  - selectedIds, hoveredId
  - actions: setNodes, setEdges, applyLayout, syncFromTwin, ...
  (owned by ReactFlowProvider subtree)

reachabilityStore  (active query + result)
  - query: { rootId, direction: 'data-to-user' | 'user-to-data' } | null
  - result: { reachableIds: Set<string>, hopChains: HopChain[] } | null
  - animation: { currentHop, playing }
  - actions: runQuery, clear, stepForward, stepBack, play, pause

uiStore            (low-frequency global UI)
  - theme: 'light' | 'dark'
  - activeView, activeTwinId
  - drawers/panels open
```

### What holds what
- **`twinStore` holds the twin** — the canonical source of truth. Components mutate it via actions; the autosave subscriber reads it.
- **`flowStore` holds React Flow view state** — `nodes`/`edges`/`viewport`/`selectedIds`. It is hydrated from `twinStore.graphLayout` on twin load and writes back to `twinStore.graphLayout` (debounced) on change.
- **`reachabilityStore` holds the active query/result** — input from the user (root + direction), output from the pure engine (§6), and the animation playback state (current hop, playing/paused) that drives the per-hop highlight in `flowStore`.
- **`uiStore` holds low-frequency global UI** (theme, active view/twin, panel visibility) — could also be React Context, but keeping it in Zustand avoids a second mechanism.

### How persistence (auto-save to IndexedDB) is triggered
- A **debounced subscriber** on `twinStore` (e.g. `useDebouncedCallback` from `use-debounce`, 400ms) calls `rf.toObject()` (via a ref to the flow instance) to refresh `graphLayout`, merges it into the twin, and writes `db.twins.put(twin)`.
- Trigger on: object/relation mutation actions, `onNodesChange`/`onEdgesChange` (structural, not pure drag — or debounced drag), `onMoveEnd` (viewport), and explicit Save.
- Use **explicit `rw` transactions only for multi-table atomic writes**; for single-twin puts, rely on Dexie's implicit transactions for snappy updates.
- Keep a `dirty` flag in `twinStore` for the "unsaved changes" indicator; clear on successful put.
- `useLiveQuery` is used where components need to observe persisted state reactively (e.g., the "recent twins" list), not for the active editor (which reads from Zustand for snappiness).

### Why not Redux Toolkit
Undo/redo via a history ring buffer in a Zustand slice is sufficient for a single-user tool, and we don't need action-replay debugging as a product feature. RTK's ceremony and ~10x bundle are not justified. If undo/redo ever becomes a headline feature with action replay, revisit.

---

## 6. Reachability engine

### Design constraints
- **Pure, UI-agnostic module** (no React, no React Flow, no IndexedDB). Takes the twin JSON (or a slim projection) and a query, returns a result. This makes it trivially testable, reusable (could run in a Web Worker), and decoupled from view state.
- Operates on the **logical graph** (objects + relations), not on React Flow nodes/edges. The flow view is a projection of the result.
- Traverses only edges whose relation type has `propagatesReachability === true`.
- **Bidirectional**: two query modes —
  - `data-to-user`: root is a data element (e.g., a Column); traverse *backward* along access relations to find who can reach it (users, apps, services).
  - `user-to-data`: root is a User; traverse *forward* to find what they can reach.
- Produces (a) the set of reachable object ids, and (b) ordered **hop chains** (the access paths) with the relation type traversed at each hop and the direction.

### Direction semantics
Each relation type has a `direction` semantic that controls how a logical edge maps to traversal direction:

- `forward`: traversal may only go source → target (e.g., `WebService -exposes-> ApiEndpoint`).
- `reverse`: traversal may only go target → source (e.g., for a relation stored as `SqlLogin -mapsTo-> DatabaseUser`, a "who can act as this DB user" query traverses it backwards).
- `bidirectional`: traversal may go either way (e.g., `DatabaseUser -accesses-> Column` is interesting both as "who reaches this column" and "what this user reaches").

The query mode (`data-to-user` vs `user-to-data`) selects, per relation type, which direction(s) are allowed:
- `user-to-data`: follow `forward` edges source→target; follow `reverse` edges target→source; follow `bidirectional` either way (out of the user).
- `data-to-user`: the mirror — follow `forward` edges target→source; follow `reverse` edges source→target; follow `bidirectional` either way (into the data).

Concretely, implement as an **adjacency builder** that, given the query mode, builds forward and reverse adjacency maps only from edges whose relation type is allowed in that direction and `propagatesReachability === true`.

### Algorithm
- **BFS** (preferred for hop-ordering: guarantees shortest-hop-first, which drives the per-hop animation naturally). Track `visited` to handle cycles. Record `parent`/`edgeUsed` per node to reconstruct hop chains.
- For **hop chains** (the access paths): after BFS, reconstruct each reachable node's path back to the root via the parent pointers; each hop carries `(fromObject, toObject, relationType, direction)`. Optionally deduplicate chains or cap depth.
- For very large graphs, run BFS in a **Web Worker** to avoid blocking the UI; the result (reachable ids + hop chains) is small and crosses the worker boundary cheaply.

### Recommended module API (functions + types)

```ts
// reachability/types.ts
export type Direction = 'forward' | 'reverse' | 'bidirectional';
export type QueryMode = 'user-to-data' | 'data-to-user';

export interface RelationType {
  id: string;
  sourceTypeId: string;
  targetTypeId: string;
  direction: Direction;
  propagatesReachability: boolean;
  label: string;
}

export interface TwinObject { id: string; typeId: string; /* ... */ }
export interface TwinRelation {
  id: string;
  relationTypeId: string;
  sourceObjectId: string;
  targetObjectId: string;
}

export interface TwinGraphSnapshot {
  objects: TwinObject[];
  relations: TwinRelation[];
  relationTypes: RelationType[];
}

export interface HopStep {
  fromObjectId: string;
  toObjectId: string;
  relationTypeId: string;
  direction: Direction;      // the direction actually traversed (forward | reverse)
}

export interface HopChain {
  rootObjectId: string;
  steps: HopStep[];           // ordered root → ... → reached object
  reachedObjectId: string;
  hopCount: number;
}

export interface ReachabilityResult {
  rootObjectId: string;
  mode: QueryMode;
  reachableIds: Set<string>;
  hopChains: HopChain[];
  perHopReachable: Map<number, Set<string>>; // hop -> ids reached at exactly that hop (drives animation)
  generatedAt: number;
}

// reachability/engine.ts
import type { TwinGraphSnapshot, QueryMode, ReachabilityResult } from './types';

/**
 * Pure: build the directed adjacency used for the given query mode,
 * considering only relation types with propagatesReachability === true
 * and respecting each type's direction semantic.
 */
export function buildReachabilityAdjacency(
  graph: TwinGraphSnapshot,
  mode: QueryMode,
): { forward: Map<string, { to: string; relationTypeId: string; direction: 'forward' | 'reverse' }[]> } {
  // For each relation, decide if it's traversable in the mode and in which effective direction.
  // user-to-data: forward edge goes source->target; reverse edge goes target->source; bidirectional both.
  // data-to-user: the mirror.
  // ...
}

/**
 * Pure BFS. Returns reachable ids, parent pointers, and per-hop buckets.
 */
export function bfsReachability(
  adjacency: Map<string, { to: string; relationTypeId: string; direction: 'forward' | 'reverse' }[]>,
  rootId: string,
  maxHops?: number,
): { visited: Set<string>; parents: Map<string, { from: string; relationTypeId: string; direction: 'forward' | 'reverse' } | null>; perHop: Map<number, Set<string>> } {
  // standard BFS with cycle guard, recording parent + edge per node
}

/**
 * The main entry. Pure. UI-agnostic.
 */
export function computeReachability(
  graph: TwinGraphSnapshot,
  rootId: string,
  mode: QueryMode,
  options?: { maxHops?: number },
): ReachabilityResult {
  const adjacency = buildReachabilityAdjacency(graph, mode);
  const { visited, parents, perHop } = bfsReachability(adjacency.forward, rootId, options?.maxHops);
  const hopChains = reconstructHopChains(rootId, visited, parents);
  return { rootObjectId: rootId, mode, reachableIds: visited, hopChains, perHopReachable: perHop, generatedAt: Date.now() };
}

/** Reconstruct each reachable node's path back to the root via parent pointers. */
export function reconstructHopChains(
  rootId: string,
  visited: Set<string>,
  parents: Map<string, { from: string; relationTypeId: string; direction: 'forward' | 'reverse' } | null>,
): HopChain[] { /* ... */ }
```

### Integration with the view layer
- `reachabilityStore.runQuery(rootId, mode)` calls `computeReachability(twinSnapshot, rootId, mode)` (optionally in a Web Worker), stores the `ReachabilityResult`, resets `animation.currentHop = 0`, and pushes `reachableIds` into `flowStore` to dim unreachable nodes.
- The animation ticker (in the reachability view component) advances `currentHop` 0..maxHop on a timer; each step updates which edges get `isHighlighted` (those whose `hopOrder <= currentHop`) — driving the `<animateMotion>` packet animation (§2).
- The hop table (§3) reads `hopChains` (sorted by hopCount then by path) — pure projection of the result.

### Pitfalls / notes
- **Cycles**: BFS `visited` guard prevents infinite loops; chains are simple paths (no repeated nodes).
- **Self-referential / parallel edges**: allow multiple hops between the same pair via different relation types; the adjacency list stores edges as a list, not a set.
- **Performance**: BFS over a few thousand nodes/edges is sub-millisecond; no need to optimize unless the graph is huge, in which case run in a Worker and memoize by `(rootId, mode, twinRevision)`.
- **Determinism**: iterate adjacency in sorted order (by object id, then relation type id) so hop-chain ordering is stable across runs (matters for snapshot tests and reproducible demos).
- **Memoization**: wrap `computeReachability` in a memo keyed by `(graphRevision, rootId, mode)` so re-running the same query is free.

---

## Summary of recommendations (one-line each)

1. **Next.js**: static export (`output: 'export'`), four static routes, single client-rendered shell, query params (not path segments) for the active twin.
2. **React Flow**: custom node/edge types per entity/relation Type (registered outside the component); Dagre default layout (+ ELK for dense graphs, both in a Web Worker at scale); per-hop `<animateMotion>` packet animation gated by `isHighlighted`/`hopOrder` (avoid `stroke-dasharray`); persist `toObject()` as a separable `graphLayout` field, debounced; mitigations for ~1k node ceiling (memoization, contextual zoom, avoid heavy CSS).
3. **Ant Design**: `Layout`/`Menu`/`Tabs` shell; Type builder with `Card`+`Form`+`@dnd-kit/sortable`; `Table` with dynamic columns from Type summary fields; reachability hop `Table` expandable + row-colored; bridge AntD tokens to React Flow via CSS variables under a single `ConfigProvider` with `cssVar: true` and two separate light/dark `ThemeConfig` objects.
4. **IndexedDB**: **Dexie.js** — declarative versioned schemas with automatic delta-based upgrades; one row per twin document; `kv` table for app prefs; `migrateTwinDoc` runtime normalizer for imported older twins.
5. **State**: **Zustand** with four slices (`twinStore` source of truth, `flowStore` React Flow view, `reachabilityStore` query/result/animation, `uiStore` low-freq UI); debounced autosave subscriber writes `twinStore` → Dexie; `useLiveQuery` only for persisted-observant lists (recent twins).
6. **Reachability engine**: pure UI-agnostic module; BFS over an adjacency built per query mode respecting each relation type's `direction` and `propagatesReachability`; returns `reachableIds` + ordered `hopChains` + `perHopReachable` buckets; run in a Web Worker for large graphs; memoized by `(graphRevision, rootId, mode)`.

---

## Sources

### Next.js static export / client-only SPA
- Next.js App Router `output: 'export'` dynamic route limitation — https://github.com/vercel/next.js/issues/79380
- Long-running discussion (client-only dynamic routes + export) — https://github.com/vercel/next.js/discussions/64660
- Feature proposal (client-only dynamic route segments) — https://github.com/vercel/next.js/discussions/88228
- Dan Abramov's SPA-with-export gist (HTML-per-route) — https://gist.github.com/gaearon/9d6b8eddc7f5e647a054d7b333434ef6
- Active work: export fallback runtime PR stack — https://github.com/vercel/next.js/pull/93032

### React Flow (custom nodes/edges, layout, animation, performance, persistence)
- Custom Nodes — https://reactflow.dev/learn/customization/custom-nodes
- Custom Edges — https://reactflow.dev/learn/customization/custom-edges
- Layouting overview — https://reactflow.dev/learn/layouting/layouting
- Auto Layout example — https://reactflow.dev/examples/layout/auto-layout
- ELK.js example — https://reactflow.dev/examples/layout/elkjs
- Animating Edges — https://reactflow.dev/examples/edges/animating-edges
- Animated SVG Edge — https://reactflow.dev/ui/components/animated-svg-edge
- Tuning Edge Animations for Performance (Liam ERD) — https://liambx.com/blog/tuning-edge-animations-reactflow-optimal-performance
- Performance docs — https://reactflow.dev/learn/advanced-use/performance
- Save and Restore example — https://reactflow.dev/examples/interaction/save-and-restore
- `useReactFlow()` — https://reactflow.dev/api-reference/hooks/use-react-flow
- `ReactFlowJsonObject` — https://reactflow.dev/api-reference/types/react-flow-json-object
- `useNodesState()` — https://reactflow.dev/api-reference/hooks/use-nodes-state
- Spatial Queries & Virtualisation RFC (#4239) — https://github.com/xyflow/xyflow/issues/4239
- 10k nodes laggy (#3044) — https://github.com/xyflow/xyflow/issues/3044
- Highlight path of selected node (#984) — https://github.com/wbkd/react-flow/issues/984

### Ant Design (components, theming, friction)
- Customize Theme — https://ant.design/docs/react/customize-theme/
- CSS Variables — https://ant.design/docs/react/css-variables/
- Layout — https://ant.design/components/layout
- Menu — https://ant.design/components/menu
- Tabs — https://ant.design/components/tabs
- Table — https://ant.design/components/table
- Draggable Tabs demo — https://github.com/ant-design/ant-design/blob/a549842b/components/tabs/demo/custom-tab-bar-node.tsx
- Table drag sorting demo — https://github.com/ant-design/ant-design/blob/master/components/table/demo/drag-sorting.md
- Multi-theme token overrides (#54487) — https://github.com/ant-design/ant-design/issues/54487
- Nested ConfigProvider component-token precedence (#53253) — https://github.com/ant-design/ant-design/issues/53253
- Dark mode when extending default theme (#53719) — https://github.com/ant-design/ant-design/issues/53719
- iLayout (AntD6 + @dnd-kit + Zustand builder reference) — https://github.com/teamco/iLayout

### IndexedDB (Dexie vs idb vs idb-keyval)
- Dexie.js docs — https://dexie.org/docs/Dexie.js
- `useLiveQuery()` — https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
- idb (jakearchibald) — https://github.com/jakearchibald/idb
- Dexie vs localForage vs idb 2026 — https://www.pkgpulse.com/guides/dexie-vs-localforage-vs-idb-indexeddb-browser-storage-2026
- IndexedDB wrapper comparison (RxDB) — https://rxdb.info/articles/indexeddb/best-indexeddb-wrapper.html
- Local-first web app with IndexedDB (autosave pattern) — https://gg221b.hashnode.dev/designing-a-local-first-web-app-with-indexeddb-lessons-from-my-simple-text-editor

### State management (Zustand vs RTK vs Context)
- State Management: Context, Redux, Zustand — https://techalyst.com/posts/state-management-in-react-context-redux-zustand
- 2025 comparison (Context/Redux/Zustand/Jotai/Recoil) — https://www.youngju.dev/blog/culture/2026-03-24-state-management-react-zustand-jotai-2025.en
- React State Management in 2025 (Meerako) — https://meerako.com/blogs/react-state-management-zustand-vs-redux-vs-context-2025
- Decision guide (School of Web) — https://schoolofweb.net/en/posts/react-state-management-6-choosing-the-right-tool/