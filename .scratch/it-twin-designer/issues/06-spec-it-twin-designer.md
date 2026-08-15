# 06 — Spec: Browser-based IT-infrastructure digital-twin designer

Type: spec
Status: ready-for-agent
Blocked by:
Synthesizes: 01 (starter pack), 02 (architecture research), 03 (visualization & sim), 04 (tech architecture), 05 (UI structure & visual direction)

> The decided spec for the build-to-be. Produced by closing the wayfinder map — five resolved tickets plus two research assets — into one PRD. The map's "Not yet specified" is empty and its "Out of scope" is settled, so this spec captures a complete, decided design. Building the app is a separate, later effort.

---

## Problem Statement

Security and data teams need to answer two questions about their IT estate that no single tool makes easy: **"Given this sensitive data element, who and what can reach it, through what chain of access?"** and, in reverse, **"Given this user, what data can they reach?"** Today the answer is assembled by hand across database permission tables, service-account inventories, API catalogs, and application manifests — a slow, error-prone, cross-system chore that nobody keeps current. The chains are long (a column → a database user → a SQL login used as a service account → a web service → an API endpoint → a UI app → a human), they cross many system boundaries, and the protections along the way (masking, encryption, MFA, VPN, audit logging) live in yet other places.

There is no server, no shared backend, and no multi-tenancy to rely on — and there must not be, because the people who need this are modeling their own sensitive estate and will not upload it anywhere. The tool has to run entirely in the browser, openable from disk, single-user, with the whole model stored locally and exportable as a file.

## Solution

A **browser-based, zero-install, single-user digital-twin designer** for organizational IT infrastructure. The user authors a *twin*: a typed graph of the estate's objects (Servers, Databases, Tables, Columns, database principals, web services, API endpoints, UI apps, human Users) connected by typed, directed *relations* (containment + canonical access relations). The twin ships pre-seeded with an **IT-infra starter pack** of Types, relation types, capability flags, and a sensitivity vocabulary, so the worked example — a `Customer.SSN` column reachable through a full access chain to a human user — is expressible out of the box and user-extensible beyond it.

The defining feature is **access-path reachability**: a pure graph traversal that, from a sensitive field (outward, *data→who*) or from a user (inward, *user→what*), computes everyone/everything reachable along propagating access relations, hop by hop, including a descendant-flood-on-access rule (reaching a Table reaches its Columns) and a mode-dependent `memberOf` rule that avoids false positives. The result is shown as an animated, hop-by-hop propagation over a React Flow graph, synchronized with a hop table, with capability and classification badges surfaced along the path so the human can judge whether a protection mitigates the exposure — the badges annotate, they never alter the reachable set.

The twin persists in IndexedDB as one serializable JSON document per twin, with export/import and debounced autosave. The stack is Next.js (static export) + React + Ant Design + React Flow + Dexie + Zustand. It is visually rich and professional (dark default, light toggle), with a small, simple component count, and it does not back off features because it runs in the browser.

## User Stories

### Authoring the twin

1. As a security analyst, I want to open the app from a local file with zero install and no server, so that I can model my sensitive estate without uploading it anywhere.
2. As a security analyst, I want a demo twin pre-seeded on first run (the "Acme Corp" SSN trace), so that I can see a working example immediately and learn the tool by doing.
3. As a security analyst, I want the IT-infra starter pack loaded by default (11 Types, 9 relation types, 14 capability flags, 4-tier classification, 14 data-categories), so that I can model a realistic estate without defining every entity from scratch.
4. As a security analyst, I want to create a new blank twin with the starter pack loaded, so that I can model my own estate from a clean starting point.
5. As a security analyst, I want to add an object of any starter-pack Type (Server, Database, Table, Column, DatabaseUser, Role, SqlLogin, WebService, ApiEndpoint, UiApp, User), so that I can represent the real things in my estate.
6. As a security analyst, I want each object's fields grouped into Sections (Identity, Security, Classification, Data Layer as applicable), so that the form mirrors how I think about each entity.
7. As a security analyst, I want to give every object a `name` (the node label) and optional `description`, so that the graph is readable.
8. As a security analyst, I want to model a Column with a `classification` (Public/Internal/Confidential/Restricted) and `dataCategory` tags (SSN, Email, CreditCard, …), so that sensitivity is captured at the field level where it actually lives.
9. As a security analyst, when I tag a Column with a data-category I want its implied default classification and recommended capabilities applied automatically (overridable), so that tagging SSN makes it Restricted with masking+encryption+audit without me setting each one.
10. As a security analyst, I want to draw a `contains` relation between parent and child (Server→Database, Database→Table, Table→Column, etc.), so that the structural topology of the estate is captured.
11. As a security analyst, I want to draw the canonical access relations (`accesses`, `memberOf`, `mapsTo`, `usedAsServiceAccountBy`, `exposes`, `returns`, `calls`, `uses`), so that the access chain is modeled exactly as it exists in reality.
12. As a security analyst, I want each relation to be typed and directed with human labels in both directions ("accesses" / "accessed by"), so that the graph reads naturally whichever way I traverse it.
13. As a security analyst, I want to annotate any object or relation with capability flags (masking, encryption-at-rest, MFA, VPN-required, audit-logging, …), so that the protections present along an access path are visible.
14. As a security analyst, I want capability flags shown as badges that annotate but never remove a node from the reachable set, so that reachability is pure and I — not the engine — judge whether a protection mitigates the exposure.
15. As a security analyst, I want to extend the starter pack by adding my own Type (Sections + Fields), so that I can model entity kinds the pack does not cover.
16. As a security analyst, I want to add my own relation type with a direction semantic (forward/reverse/bidirectional) and a `propagatesReachability` flag, so that access relations specific to my estate participate in reachability correctly.
17. As a security analyst, I want to add my own capability flag (id + label + badge style + default home), so that I can represent protections outside the 14-flag vocabulary.
18. As a security analyst, I want to add my own data-category with an implied default classification and recommended capabilities, so that the sensitivity vocabulary fits my domain.
19. As a security analyst, I want to manage relation types in a section of the schema builder, so that I do not need a separate screen to evolve the relation vocabulary.

### Schema evolution

20. As a security analyst, I want safe schema evolutions (add a field, rename a field, move/reorganize Sections) to apply for free with no data loss, so that I can refine my Types as I learn.
21. As a security analyst, when a destructive evolution happens (remove a field, or change a field type) I want a per-Type "Repair objects" action listing the affected objects and the specific conflict, so that I can review before any data is discarded or transformed.
22. As a security analyst, I want no silent data destruction on schema evolution, so that I never lose modeled data without explicitly choosing to.
23. As a security analyst, I want added fields that are absent on existing objects to lazy-default, so that old objects remain valid after a Type grows.
24. As a security analyst, I want renames to be free because object field-values are keyed by stable field id, so that renaming a field's label does not orphan its values.

### Persistence, export/import

25. As a security analyst, I want the twin autosaved to local IndexedDB (~400ms debounce) as I edit, so that I never lose work to a browser close.
26. As a security analyst, I want an unsaved-changes indicator, so that I can see when the autosave has not yet flushed.
27. As a security analyst, I want to export a twin as a JSON file (the twin document itself), so that I can back it up, share it offline, or move it to another machine.
28. As a security analyst, I want to choose whether export includes the graph layout, so that a shared twin does not impose my hand-placed layout on the recipient.
29. As a security analyst, I want to import a twin JSON file, so that I can restore a backup or load a colleague's twin.
30. As a security analyst, I want imported older twins normalized by a `migrateTwinDoc` step, so that a twin authored against an older schema version still opens correctly.
31. As a security analyst, I want imported twins to get a fresh id and be added rather than overwriting, so that import never clobbers an existing twin.
32. As a security analyst, I want to hold multiple twins and pick the active one from the header (with a recent list), so that I can keep separate models for separate estates or environments.
33. As a security analyst, I want app prefs (active twin, theme, last view) remembered locally, so that the app reopens where I left off.

### Reachability — the defining feature

34. As a security analyst, I want to pick a sensitive field (a Column with non-Public classification or any data-category tag) as a query root and ask "who can reach this," so that I get the full outward access chain to every user/app/service that can reach the data.
35. As a security analyst, I want to pick a human User as a query root and ask "what can this user reach," so that I get the full inward chain to every data element the user can reach.
36. As a security analyst, I want the query mode (data→who / user→what) to re-filter the root picker, so that I am only offered valid roots for the direction I chose.
37. As a security analyst, I want `Public` / `Unclassified` / untagged fields never offered as data→who roots, so that I am not offered roots with no sensitivity to trace.
38. As a security analyst, I want reachability to traverse only propagating access relations, so that structural `contains` edges do not by themselves create access.
39. As a security analyst, I want reaching a container via `accesses` to flood reachability down its `contains` subtree (access a Table ⇒ reach its Columns; access a Database ⇒ reach its Tables and Columns), so that granting access to a container correctly exposes its contents.
40. As a security analyst, I want the `memberOf` rule to be mode-dependent (user→what traverses DatabaseUser→Role; data→who traverses Role→DatabaseUser; never the reverse in each mode), so that a role is not falsely marked as reaching data a member accesses only via a direct grant.
41. As a security analyst, I want the reachable result as a set of reachable objects plus ordered hop chains, so that I can see both the breadth (who's exposed) and the exact path each one took.
42. As a security analyst, I want hop chains ordered shortest-hop-first, so that the most direct exposures lead the result.
43. As a security analyst, I want the descendant-flood step made legible — a step reached via flood annotated "accesses (flood via Customer)" with the contains-path highlighted in a second accent color, so that the otherwise-invisible flood is visible and auditable.
44. As a security analyst, I want both directions switchable via a single Segmented control ("Who can reach this" / "What this can reach"), so that I can flip perspective on the same root without re-authoring.
45. As a security analyst, I want the reachability engine to be deterministic (adjacency iterated in sorted order) so that the same twin + root + mode always produces the same hop ordering.
46. As a security analyst, I want reachability memoized by (graph revision, root, mode), so that re-running or scrubbing the same query is instant.

### Visualization & simulation

47. As a security analyst, I want the twin rendered as a typed-node / typed-edge graph in React Flow, so that I can see the whole estate and its access structure at once.
48. As a security analyst, I want each node to show an icon, a type tag, a label, a classification left-stripe (darker = more sensitive), and abbreviated capability badges, so that I can read a node's identity, sensitivity, and protections at a glance even at scale.
49. As a security analyst, I want access (propagating) edges drawn solid with a label and arrowhead, and `contains` edges drawn faint-dashed with the label hidden until hover, so that containment does not drown the access graph.
50. As a security analyst, I want manual node placement to persist as the default layout, so that my hand-authored focused graphs stay the way I arrange them.
51. As a security analyst, I want on-demand auto-layout (Dagre layered; ELK for dense graphs) as an action I trigger, so that I can tidy a large twin without auto-layout fighting me on every edit.
52. As a security analyst, I want pan, zoom, and click-to-select on the graph, so that I can navigate and inspect a large estate.
53. As a security analyst, I want selecting a graph node to sync the side panel and hop table, so that graph, table, and inspector stay coherent.
54. As a security analyst, I want running a query to animate the reachable subgraph hop-by-hop (reachable nodes lit, unreachable dimmed, root ringed, active edges showing flowing packets), so that the propagation is intuitively legible.
55. As a security analyst, I want Play/Pause, Step ◀/▶, Reset, and a hop scrubber plus keyboard (←/→/space), so that I can control the animation and scrub to a specific hop.
56. As a security analyst, I want per-hop reveal ordering driven by the BFS hop buckets, so that the animation reveals exactly what the engine computed, in order.
57. As a security analyst, I want the reachability packet animation to use SVG `<animateMotion>` packets gated to the active hop (not stroke-dasharray marching ants), so that the headline animation stays smooth at hundreds of edges.
58. As a security analyst, I want unreachable nodes/edges dimmed (low opacity) and reachable ones full-opacity with thicker stroke, so that the reachable subgraph visually pops.
59. As a security analyst, I want the reachability highlight color (aqua) distinct from the classification color (blue ramp), so that "lit because reachable" never reads as "lit because sensitive."

### Tabular views

60. As a security analyst, I want a tables view that lists the objects of any chosen Type as rows with the Type's summary fields as columns, so that I can read the estate as structured data instead of a graph.
61. As a security analyst, I want classification/category and capability badges per table row, so that the table carries the same sensitivity/protection context as the graph.
62. As a security analyst, I want clicking a table row to sync the graph selection, so that I can cross-navigate between table and graph.
63. As a security analyst, I want the reachability result as a hop table (one row per reachable node: Hop, Object, Reached-via relation + direction, Classification, Capabilities), so that I can read the exposure as an ordered, exportable list.
64. As a security analyst, I want the hop table sorted by hop, and clicking a row to sync the graph and inspector, so that table and graph stay co-highlighted.
65. As a security analyst, I want the full access chain for a reached node shown in the inspector, so that I can audit the precise path, not just the endpoint.
66. As a security analyst, I want the hop table's direction to follow the mode Segmented control, so that the table and the graph agree on perspective.

### App shell, navigation & visual direction

67. As a security analyst, I want a collapsible side menu and a header (twin picker, import/export, settings, primary "Run reachability" action), so that the chrome is consistent and unobtrusive.
68. As a security analyst, I want five routes — `/` (Exposure dashboard) → `/schema` → `/twin` → `/tables` → `/reachability` — so that I move through model → author → inspect → simulate without losing client state.
69. As a security analyst, I want an Exposure dashboard as the landing surface (estate counts, sensitive-field exposure by classification, top exposure paths), so that the first thing I see is the risk summary, not an empty graph.
70. As a security analyst, I want the dashboard to double as the onboarding surface with a one-time coachmark ("pick a sensitive field → run reachability"), so that I reach my first query result without a tutorial.
71. As a security analyst, I want import/export as a header action with a Modal and settings as a Drawer, so that these secondary surfaces do not clutter the primary nav.
72. As a security analyst, I want a dark default with a light toggle, both ramp-validated, so that the tool looks professional and is comfortable for long sessions.
73. As a security analyst, I want classification shown as a blue ordinal ramp (darker = more sensitive, always label-paired, never color-alone), so that sensitivity is encoded consistently across graph, table, and badges.
74. As a security analyst, I want data-categories shown as neutral icon+label chips (not hues), so that 14 categories remain legible instead of becoming a rainbow.
75. As a security analyst, I want capability flags as muted outlined badges, so that the classification stripe dominates each node and badges do not compete for attention.
76. As a security analyst, I want brand/primary actions in violet (distinct from blue classification and aqua reachability), so that controls do not read as data semantics.
77. As a security analyst, I want a status palette (good/warning/serious/critical) reserved for actual state (save state, repair conflicts, exposure severity) and never used for series or category, so that status colors always mean state.
78. As a security analyst, I want `tabular-nums` on numeric table columns and monospace for object IDs / field keys / technical values, so that dense data aligns and technical strings scan.
79. As a security analyst, I want Ant Design and React Flow themed as one system (AntD tokens bridged to React Flow via CSS variables under a single ConfigProvider), so that the graph and the chrome look like one application.

## Implementation Decisions

### Domain model (from ticket 01 + starter-pack draft)

- **Type = Sections + Fields** (DataGerry-style generic builder). Field types: `text`, `enum`, `multi-tag`, `boolean`, `number`, `ref`. Every Type has an `Identity` section (`name` required = node label, `description` optional). Links are edges, not fields — a Type's fields are its own attributes only.
- **11 starter-pack Types:** `Server`, `Database`, `Table`, `Column`, `DatabaseUser`, `Role`, `SqlLogin`, `WebService` (with a Data Layer section), `ApiEndpoint`, `UiApp`, `User`. `Column` is the only Type carrying `classification` + `dataCategory` (sensitivity is field-level). Each Type has a default icon.
- **9 relation types**, typed + directed, each with a `propagatesReachability` flag and a `direction` semantic: `contains` (structural, **non-propagating**, parent→child pairs: Server→Database, Server→SqlLogin, Database→Table, Database→DatabaseUser, Database→Role, Table→Column); and 8 propagating access edges `accesses`, `memberOf`, `mapsTo`, `usedAsServiceAccountBy`, `exposes`, `returns`, `calls`, `uses` with type-constrained source/target and human labels in both directions.
- **Reachability rules:** all access edges traverse bidirectionally **except `memberOf`**, which is **mode-dependent** (user→what: DatabaseUser→Role; data→who: Role→DatabaseUser; never the reverse in each mode — avoids the false "role reaches via a member's direct grant"). **Descendant-flood-on-access:** reaching a node via `accesses` floods reachability down its `contains` subtree; `contains` alone never propagates.
- **14 capability flags** (`masking`, `encryption-at-rest`, `tokenization`, `hashing`, `row-level-security`, `tls`, `mtls`, `mfa`, `auth-required`, `rbac`, `sso`, `vpn-required`, `audit-logging`, `rate-limiting`); live on **nodes and edges** (nodes default home); **purely annotate** — never remove a node from the reachable set. User-extensible.
- **Classification:** 4-tier (Public/Internal/Confidential/Restricted), single-select, optional (default Unclassified/null), Column-only, **does not propagate**. **Reachability roots = non-Public or tagged fields.**
- **14 data-categories** (`SSN`, `NationalID`, `PassportNumber`, `Email`, `Phone`, `Address`, `FullName`, `DateOfBirth`, `CreditCard`, `BankAccount`, `Salary`, `HealthData`, `IPAddress`, `Credentials`), multi-tag, extensible. Each carries **implied default classification + recommended capabilities** applied on tag, overridable (e.g., SSN → Restricted + masking/encryption-at-rest/audit-logging).
- **Acceptance check:** the SSN worked example is fully expressible with the 11 Types + 9 relations; both reachability directions resolve correctly; the `memberOf` rule and descendant-flood fire as designed; capability badges annotate the path. (Verified against starter-pack traces A & B in the prototype's engine check.)

### App structure (from ticket 02 + 04)

- **Next.js static export** (`output: 'export'`, `images.unoptimized`, `trailingSlash`); **5 static routes** (no dynamic segments): `/` (Exposure dashboard, landing) → `/schema` → `/twin` → `/tables` → `/reachability`. (05 revises 04's "`/` → `/twin`" to "`/` → dashboard.") Every page `"use client"`.
- **Single shared client shell** (`RootShell`) owning the AntD `ConfigProvider`, Zustand providers, `ReactFlowProvider`, and Dexie `db`. In-SPA `useRouter` transitions keep client state alive across routes.
- **Active twin** identified by an IndexedDB key in `uiStore` + a `?twinId=` query param — **never a path segment**, to sidestep the static-export `generateStaticParams` pitfall.
- **App shell (05):** AntD `Layout` — collapsible `Sider` with a `Menu` of the five routes; `Header` with the twin picker (name + recent list, one active), Import/Export actions, Settings `Drawer`, and a primary "Run reachability" button. Relation-type manager is a section within `/schema`; Import/Export = header action + `Modal`; Settings = `Drawer`.

### Data model & persistence (from ticket 04)

- **One Dexie row per twin** + a `kv` table for app prefs. `TwinDoc` shape (from the architecture-research prototype):
  ```ts
  interface TwinDoc {
    id: string; name: string; createdAt: number; updatedAt: number;
    schema: TwinSchema;        // Type defs + relation types + starterPackVersion
    objects: TwinObject[];     // typed instances
    relations: TwinRelation[];// typed directed edges (logical)
    graphLayout: ReactFlowJsonObject | null; // positions + viewport (separable)
    queryHistory: ReachabilityQuery[];
    meta: Record<string, unknown>;
  }
  ```
- **Object field-values: flat `values: Record<fieldId, value>`, sparse, keyed by stable field id**; section grouping is derived from the Type at display time. This is what makes renames free.
- **`graphLayout` is separable** — export can include or strip it; re-running auto-layout never mutates logical data. Node/edge ids map 1:1 to object/relation ids so layout re-attaches after structural change.
- **Export = the row itself**; import = parse → `migrateTwinDoc` → new id → `db.twins.add`. **Dexie versioned schemas** for DB-level migration; a runtime **`migrateTwinDoc`** normalizer (with an embedded `schemaVersion` in `TwinDoc.schema`) handles imported older twins, separate from DB-level migration. Upgrades must be cumulative and idempotent.
- One-row-per-twin split into separate object/relation tables is deferred unless a twin exceeds a few MB.

### Schema evolution (from ticket 04; graduates the fog item)

- **Hybrid:** safe evolutions (add field, rename field, move/reorganize sections) are free — added fields absent→lazy default, renames free (id-keyed), section moves free. **Destructive evolutions** (remove field → orphaned keys; type-change → possibly invalid values) surface a per-Type **"Repair objects"** action listing affected objects + the specific conflict, reviewable before discard/transform. **No silent data destruction.**

### State management (from ticket 02 + 04)

- **Zustand, four slices:** `twinStore` (source of truth: schema, objects, relations, graphLayout, `dirty`), `flowStore` (slim — only `selectedIds`, `hoveredId`, `reachableIds`; **React Flow owns nodes/edges via `useNodesState`/`useEdgesState`**, no duplication), `reachabilityStore` (query/result/animation), `uiStore` (theme, activeView, activeTwinId, panels).
- **Debounced (~400ms) autosave subscriber:** `rf.toObject()` → merge into `twinStore` → `db.twins.put`; `dirty` flag for the unsaved indicator; `useLiveQuery` only for persisted-observant lists (recent twins), not the active editor.
- No Redux Toolkit (undo via a history ring buffer in a slice suffices); no Context for high-frequency graph state.

### Reachability engine (from ticket 02 + 04)

- **Pure, UI-agnostic BFS module** (no React, no RF, no IndexedDB). Operates on the logical graph (objects + relations), not RF nodes/edges. Adjacency built per query mode respecting each relation type's `direction` + `propagatesReachability`. Returns `reachableIds` + ordered `hopChains` + `perHopReachable` buckets.
- **Same-thread, memoized by `(graphRevision, rootId, mode)`**; Worker-deferred by design (purity means a Worker drops in later with no refactor). Cycle-guarded; parallel edges allowed; **deterministic adjacency iteration** (sorted by object id then relation type id) for stable hop ordering.
- Prototype module API (decision-rich shape from the architecture-research prototype):
  ```ts
  type QueryMode = 'user-to-data' | 'data-to-user';
  interface ReachabilityResult {
    rootObjectId: string; mode: QueryMode;
    reachableIds: Set<string>;
    hopChains: HopChain[];            // ordered root → ... → reached object
    perHopReachable: Map<number, Set<string>>; // drives the per-hop animation
    generatedAt: number;
  }
  function computeReachability(graph, rootId, mode, options?: { maxHops? }): ReachabilityResult;
  ```

### Component wiring (from ticket 02 + 04)

- **One generic data-driven `twinNode`** (icon from a typeId→icon registry, label, classification left-stripe, capability badges) + **one generic `twinEdge`** (solid access / dashed contains, label, `<animateMotion>` packet gated by `isHighlighted`/`hopOrder`). `nodeTypes`/`edgeTypes` declared outside the component. Node/edge data payloads (from the research prototype):
  ```ts
  type TwinNodeData = {
    objectRefId: string; typeId: string; label: string;
    classification?: 'public'|'internal'|'confidential'|'restricted';
    capabilities: string[]; summaryFields: Record<string, unknown>;
  };
  type TwinEdgeData = {
    relationTypeId: string;
    direction: 'forward'|'reverse'|'bidirectional';
    propagatesReachability: boolean; hopOrder?: number;
  };
  ```
- **Layout:** Dagre default auto-layout (ELK for dense, both Worker-able later); manual placement persisted as `graphLayout` is the default for focused graphs; auto-layout is an on-demand action, never live on every edit.
- **Animation:** per-hop `<animateMotion>` "packets" gated by `isHighlighted && hopOrder === currentHop`, staggered by hop order — **avoid** the built-in `animated: true` `stroke-dasharray` (CPU hog at scale). Dim unreachable (~0.14 opacity); reachable full-opacity + thicker stroke; root ringed in amber. A `requestAnimationFrame`/`setTimeout` ticker in the reachability view (not the engine) advances `currentHop`.
- **Scale mitigations:** memoize nodes/edges, contextual zoom, no heavy CSS/filter/blur on nodes, edge labels on hover/highlight only; keep derived `reachableIds`/`selectedIds` in a separate store slice, never filter `nodes` inside children. Practical ceiling ~1k complex nodes; "render the focused subgraph" is an accepted product rule.

### Schema builder (from ticket 02 + 04)

- **`@dnd-kit/sortable` + AntD** `Card`/`Form`/`Select`/`Switch`/`Cascader`/`TreeSelect`; Section = sortable `Card`, Field = sortable `Form.Item`-row, add-actions `Button type="dashed"`, reference target via `TreeSelect` of Types. Use **@dnd-kit**, not react-dnd.

### Visualization & sim UX (from ticket 03)

- **Graph stage + right side panel** (Query → Hop table → Objects table → Inspector stacked) + a slim **bottom playback bar** (Reset / Step ◀ / Play / Step ▶ / Scrub + hop-count). Chosen to maximize graph visibility while keeping query, hop table, and inspector co-located for graph↔table cross-sync.
- **Tabular views:** objects-of-a-Type table (pick a Type → rows = objects, columns = the Type's summary fields, badges per row, click syncs graph); reachability hop table (one row per reachable node, sorted by hop, click syncs graph + inspector, full chain in inspector).
- **Both directions** via a `Segmented` control ("Who can reach this" = data→user; "What this can reach" = user→data) that also re-filters the root picker. Controls: Play/Pause, Step ◀/▶, Reset, hop scrubber; ←/→/space keyboard.

### Visual direction (from ticket 05; dataviz-validated, image verification bypassed per user)

- **Classification = blue ordinal ramp** — light `#86b6ef → #3987e5 → #1c5cab → #0d366b`; dark `#6da7ec → #3987e5 → #256abf → #184f95`; darker = more sensitive; always label-paired, never color-alone. Palette validator-passed in both modes.
- **Data-categories = neutral icon+label chips**, NOT hue-encoded (14 hues illegible; identity from icon+label).
- **Capability flags = muted outlined badges** (icon + abbrev label); not status colors, not a hue set — so the classification stripe dominates each node.
- **Edges = secondary ink** (solid access / dashed contains); **reachability highlight = aqua** (`#1baf7a` light / `#199e70` dark) + thicker stroke + animated `<animateMotion>` packet; distinct from blue classification.
- **Brand / primary action = violet** (`#4a3aa7` light / `#9085e9` dark) — distinct from blue classification.
- **Status palette reserved** (good `#0ca30c` / warning `#fab219` / serious `#ec835a` / critical `#d03b3b`) for actual state only — save state, repair conflicts, exposure severity — never for series/category.
- **Typography:** system sans + `tabular-nums` for numeric table columns + monospace for object IDs / field keys / technical values. **Dark default, light toggle** (both ramp-validated). No `filter:`/blur/shadow on nodes (perf); edge labels on hover/highlight at scale. AntD tokens bridged to RF via CSS variables under a single `ConfigProvider` (`cssVar: true`, two separate light/dark `ThemeConfig` objects).

### Onboarding (from ticket 05)

- First run auto-creates a demo "Acme Corp" twin with the SSN trace; the user lands on a populated dashboard; a one-time coachmark guides "pick a sensitive field → run reachability." A new blank twin shows a "starter pack loaded — add your first object" prompt. No separate tutorial route.

## Testing Decisions

**What makes a good test here:** tests assert **external behavior of pure modules**, never implementation details or UI rendering. The two seams are both pure, UI-agnostic logic with no React/React Flow/IndexedDB dependency, so they are fast, deterministic, and runnable in Node — exactly the prior-art shape already proven in the map's prototype (`prototype/verify-engine.mjs`, which verified the engine against starter-pack traces A & B via `node --check` + logic-level assertions, no browser).

The build does not exist yet, so both seams are **new seams proposed at the highest pure-logic point** — the engine and the document layer — deliberately above the UI. UI behavior (graph rendering, animation, table sync) is out of test scope for v1 and is validated by the prototypes (03, 05) and the visual-direction validator, not by automated tests. Keeping to two seams honors the "fewest seams, highest point" principle: the two pieces where wrong output is a real defect get guarded; everything else is plumbing.

**Seam 1 — the reachability engine (pure).** Module under test: `computeReachability(graph, rootId, mode)` → `ReachabilityResult` (`reachableIds`, `hopChains`, `perHopReachable`).
Cases (behavior, not internals):
- **SSN trace A — data→who:** root = `Customer.SSN`; the result's reachable set includes every object on the outward chain and reaches `Jane Doe`; hop chains reconstruct the full path.
- **SSN trace B — user→what:** root = `Jane Doe`; the result reaches `Customer.SSN` and the rest of `Customer`'s columns (via flood).
- **Descendant-flood-on-access:** reaching a Table via `accesses` places its Columns in the reachable set; reaching a Database places its Tables and their Columns; reaching a container via `contains` alone does **not** propagate.
- **`memberOf` mode-dependence:** in user→what, traversal goes DatabaseUser→Role (collects roles, then their `accesses`); in data→who, traversal goes Role→DatabaseUser (finds members); a role is never marked as reaching data a member accesses only via a direct grant (the false positive is absent in both modes).
- **Capability flags do not alter reachability:** adding/removing any capability flag on any node or edge leaves the reachable set unchanged (flags annotate only).
- **Root eligibility:** only non-Public or tagged fields are valid data→who roots; Public/Unclassified/untagged fields are not eligible.
- **Determinism + memoization:** the same (graph, root, mode) yields identical hop ordering across runs; cycles do not loop forever; parallel edges between the same pair via different relation types are each traversable.
Prior art: `prototype/verify-engine.mjs` (logic-level engine verification against traces A & B). The starter-pack draft's §5 acceptance check is the canonical fixture.

**Seam 2 — the twin document / schema layer (pure).** Modules under test: `migrateTwinDoc(doc)` normalizer and the schema-evolution conflict detector (e.g. `detectRepairConflicts(schema, objects)` → per-Type conflict list), plus export/import round-trip.
Cases:
- **Normalizer:** an older-shape imported twin is normalized to the current `TwinDoc` shape (missing fields filled, `schemaVersion` migrated) without dropping modeled data.
- **Safe evolutions are free:** adding a field leaves existing objects valid (absent → lazy default); renaming a field's label keeps its values (id-keyed); moving a field between sections keeps its values. No conflict surfaced.
- **Destructive evolutions surface conflicts:** removing a field that has values, or changing a field's type where existing values would become invalid, produces a per-Type conflict list naming the affected objects and the specific conflict — and **no data is discarded until the user acts** (no silent destruction).
- **Export/import round-trip:** a twin exported and re-imported equals the original (modulo a fresh id); exporting with `graphLayout` stripped yields a valid twin that re-imports and re-attaches layout; the separable `graphLayout` field does not mutate logical data on export.
Prior art: none yet in-repo (no code exists); this seam is new, justified by the correctness-critical "no silent data destruction" behavior.

**Out of test scope (v1):** React Flow rendering, `<animateMotion>` animation timing, AntD component behavior, graph↔table hover-sync, theming/CSS-variable bridging, IndexedDB write timing/autosave debounce. These are validated by the 03/05 prototypes and visual review, not automated tests.

## Out of Scope

- **Any server, sync backend, authentication, authorization, or multi-tenancy.** Browser-only, single-user, local data. (Settled in charting; confirmed in 04.)
- **A full data-value execution/simulation engine.** Masking, encryption, tokenization, etc. are per-node/per-edge capability flags (badges) that annotate; they are not value-transforming pipeline steps and never remove a node from the reachable set. (Settled in charting.)
- **Importing from live systems** — scanning a live DB schema or API spec to seed objects. v1 is manual authoring only; the local-only, no-server architecture (04) confirms live-system scanning is beyond this effort. Client-side file-based import (SQL DDL / OpenAPI paste) is a possible future enhancement, not v1. (Resolved from fog on close of 04.)
- **The build/implementation itself.** This map delivers the decided spec; building the app is a separate effort after the map closes.
- **Draggable multi-open twin tabs** (deferred as polish, 05).
- **Expand/collapse of `contains` subtrees in the graph** (deferred refinement, 03 — revisit only if large twins clutter).
- **Undo/redo with action replay** (a history ring buffer in a Zustand slice is sufficient for v1; revisit if undo becomes a headline feature, 02/05).
- **Automated UI/render tests** (v1 relies on the 03/05 prototypes + visual review; see Testing Decisions).
- **Splitting objects/relations into separate IndexedDB tables** (deferred unless a twin exceeds a few MB, 04).

## Further Notes

- **Standing preferences (apply throughout the build):** visually rich and professional; keep the component count low and the components simple; do not optimize or back off features just because it runs in the browser.
- **Skills the build effort should consult:** `ui-ux-pro-max`, `frontend-design`, `dataviz` (graph + table + simulation visuals), `ant-design`/`antd`, and `mattpocock-skills:domain-modeling`. Use `mattpocock-skills:tdd` for the two test seams; `mattpocock-skills:prototype` for any UI fidelity raise; `mattpocock-skills:grilling` for any decision that re-opens.
- **Reference model:** DataGerry (open-source CMDB; AGPL-3.0; Flask + MongoDB + Angular) provides the schema-builder + typed-relations + read-only CI-Explorer half. DataGerry does not model data flow, lineage, or access reachability — that is this effort's greenfield addition. Full DataGerry research: `research/datagerry.md`.
- **Image verification was bypassed per user instruction** (no image access). Visual decisions in 03 and 05 are justified by prototype code + the architecture research + the dataviz palette validator + design intuition, not by screenshot review. A headless render smoke-test was not run (no Chrome installed). The build effort should visually verify these once a browser is available.
- **Prototype assets (reconstructed, runnable from disk):** `prototype/viz-prototype.html` (03 — graph + sim + hop table for the SSN example) and `prototype/ui-shell-prototype.html` (05 — app shell, dark default + light toggle). Engine verification: `prototype/verify-engine.mjs`. Note: an earlier `prototype/` + `shots/` folder was accidentally deleted and unrecovered (no git repo); the linked prototypes are reconstructions from the resolved tickets — the decisions are unaffected.
- **Stack, fixed:** Next.js (App Router, static export) + React + Ant Design + React Flow (`@xyflow/react`) + Dexie + Zustand, with `@dnd-kit/sortable`, Dagre (and ELK for dense graphs).
- **Source tickets & assets:** 01 `issues/01-it-infra-starter-pack.md` (+ `research/starter-pack-draft.md`); 02 `issues/02-architecture-research.md` (+ `research/architecture-patterns.md`); 03 `issues/03-visualization-and-reachability-sim.md`; 04 `issues/04-tech-architecture.md`; 05 `issues/05-ui-structure-and-visual-direction.md`. Map index: `map.md`.