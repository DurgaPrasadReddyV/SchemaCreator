# 08 — Domain model, starter pack, persistence & twin management

**What to build:** The data foundation and local persistence. The domain types — `TwinDoc`, `TwinObject`, `TwinRelation`, `TwinSchema` — and the full IT-infra starter pack as a data module: 11 Types (`Server`, `Database`, `Table`, `Column`, `DatabaseUser`, `Role`, `SqlLogin`, `WebService` w/ Data Layer, `ApiEndpoint`, `UiApp`, `User`; each has an `Identity` section with `name` required = node label + `description` optional; `Column` alone carries `classification` + `dataCategory`), 9 relation types (`contains` non-propagating + 8 propagating access edges `accesses`/`memberOf`/`mapsTo`/`usedAsServiceAccountBy`/`exposes`/`returns`/`calls`/`uses`, each typed+directed with `propagatesReachability` + `direction` and human labels both ways), 14 capability flags (live on nodes+edges, annotate only), 4-tier classification (Public/Internal/Confidential/Restricted), and 14 data-categories each carrying implied default classification + recommended capabilities applied on tag (overridable). Object field-values are a flat sparse `Record<fieldId, value>` keyed by stable field id (this is what makes renames free). Dexie store: one row per twin + a `kv` table for app prefs. Zustand `twinStore` (source of truth: schema, objects, relations, `graphLayout`, `dirty`) and `uiStore` (theme, activeView, activeTwinId, panels). Create-blank-twin loads the starter pack; on first run a seeded "Acme Corp" demo twin (the SSN trace) is auto-created so the user lands on a populated estate. The active twin is identified by an IndexedDB key in `uiStore` + a `?twinId=` query param (never a path segment). A debounced (~400ms) autosave subscriber writes `db.twins.put` and drives a dirty/unsaved indicator. App prefs (active twin, theme, last view) are remembered in `kv`. The `TwinDoc` shape (decision-rich, from the architecture-research prototype):

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

**Blocked by:** 07 — App shell, routing & theming spine (needs the `Header` for the twin picker and the routes to host pages).

**Status:** ready-for-agent

- [ ] The starter pack data module loads by default: 11 Types with Sections/Fields, 9 relation types with direction + `propagatesReachability`, 14 capability flags, 4-tier classification, 14 data-categories with implied defaults.
- [ ] Creating a blank twin loads the starter pack; the SSN worked example is fully expressible with the seeded Types + relations (acceptance check from the starter-pack draft §5).
- [ ] First run auto-creates the "Acme Corp" demo twin (SSN trace) so the estate is populated immediately.
- [ ] Object field-values are flat `Record<fieldId, value>`, sparse, id-keyed; section grouping is derived from the Type at display time.
- [ ] Dexie stores one row per twin + a `kv` table; the active twin is selected by `uiStore` key + `?twinId=` (never a path segment).
- [ ] The header twin picker shows the active twin name + a recent list; switching twins updates `?twinId=` and loads that twin.
- [ ] Edits autosave to IndexedDB on a ~400ms debounce; a dirty/unsaved indicator shows when the autosave has not yet flushed.
- [ ] App prefs (active twin, theme, last view) persist across reload — the app reopens where the user left off.
- [ ] Multiple twins can be held and picked from the header.

**Visual checks (multimodal verification):** Screenshot the twin picker dropdown (open) and the dirty indicator (mid-edit) in both themes. Verify: the active twin name is clearly shown; the recent list is readable and selects on click; the dirty indicator is visible and uses the status palette (not a data/series color); creating/switching twins updates the header immediately. Confirm the demo twin's name ("Acme Corp" or similar) appears on first run with no manual steps.