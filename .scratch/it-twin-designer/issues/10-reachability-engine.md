# 10 — Reachability engine, pure (seam 1)

**What to build:** The defining feature's core — a pure, UI-agnostic BFS reachability module with no React, no React Flow, no IndexedDB. Operates on the logical graph (objects + relations), not RF nodes/edges. `computeReachability(graph, rootId, mode, options?: { maxHops? })` returns `ReachabilityResult`. Adjacency is built per query mode, respecting each relation type's `direction` + `propagatesReachability`. Rules: all access edges traverse bidirectionally **except `memberOf`**, which is mode-dependent (user→what: `DatabaseUser→Role`; data→who: `Role→DatabaseUser`; never the reverse in each mode — avoids the false "role reaches via a member's direct grant"). **Descendant-flood-on-access:** reaching a node via `accesses` floods reachability down its `contains` subtree (access a Table ⇒ reach its Columns; access a Database ⇒ reach its Tables and Columns); `contains` alone never propagates. Capability flags annotate only and never alter the reachable set. Deterministic adjacency iteration (sorted by object id then relation type id) for stable hop ordering; cycle-guarded; parallel edges between the same pair via different relation types are each traversable. Memoized by `(graphRevision, rootId, mode)`. Same-thread (Worker-deferred by design — purity means a Worker drops in later with no refactor). Decision-rich API (from the architecture-research prototype):

```ts
type QueryMode = 'user-to-data' | 'data-to-user';
interface ReachabilityResult {
  rootObjectId: string; mode: QueryMode;
  reachableIds: Set<string>;
  hopChains: HopChain[];            // ordered root → ... → reached object
  perHopReachable: Map<number, Set<string>>; // drives the per-hop animation
  generatedAt: number;
}
```

**Blocked by:** 08 — Domain model, starter pack, persistence & twin management (needs the typed graph, relation-type definitions, and the demo SSN twin as the canonical fixture).

**Status:** ready-for-agent

- [ ] **SSN trace A — data→who:** root = `Customer.SSN`; reachable set includes every object on the outward chain and reaches `Jane Doe`; hop chains reconstruct the full path.
- [ ] **SSN trace B — user→what:** root = `Jane Doe`; reaches `Customer.SSN` and the rest of `Customer`'s columns (via flood).
- [ ] **Descendant-flood-on-access:** reaching a Table via `accesses` places its Columns in the reachable set; reaching a Database places its Tables and their Columns; reaching a container via `contains` alone does **not** propagate.
- [ ] **`memberOf` mode-dependence:** user→what traverses `DatabaseUser→Role`; data→who traverses `Role→DatabaseUser`; a role is never marked as reaching data a member accesses only via a direct grant (false positive absent in both modes).
- [ ] **Capability flags do not alter reachability:** adding/removing any capability flag on any node or edge leaves the reachable set unchanged.
- [ ] **Root eligibility:** only non-Public or tagged fields are valid data→who roots; Public/Unclassified/untagged fields are not eligible.
- [ ] **Determinism + memoization:** the same (graph, root, mode) yields identical hop ordering across runs; cycles do not loop forever; parallel edges via different relation types are each traversable.
- [ ] Engine has no React/RF/IndexedDB imports; tests run in Node (`node --check` + logic-level assertions, same shape as `prototype/verify-engine.mjs`).

Prior art: `prototype/verify-engine.mjs` (logic-level engine verification against traces A & B). The starter-pack draft's §5 acceptance check is the canonical fixture.