/**
 * Reachability engine — pure, UI-agnostic.
 *
 * Implements:
 * - BFS over the logical graph (TwinObject + TwinRelation + TwinSchema)
 * - Mode-dependent memberOf (user→what: DatabaseUser→Role; data→who: Role→DatabaseUser)
 * - Descendant-flood-on-access: reaching a node via `accesses` floods its contains-subtree
 * - `contains` alone never propagates
 * - Relation-type `direction` semantic honored (forward / reverse / bidirectional)
 * - Deterministic ordering: adjacency iterated sorted by object id then relation type id
 * - Cycle-guarded
 * - Parallel edges via different relation types are each traversable
 * - Optional `maxHops` depth cap
 * - Capability flags annotate only — never alter reachability
 *
 * Returned `ReachabilityResult` includes:
 * - `reachableIds`: Set of every reachable object id
 * - `hopChains`: ordered shortest-hop-first chains (root → ... → target)
 * - `perHopReachable`: Map<hop, Set<id>> driving the per-hop animation
 */

import type {
  Graph,
  QueryMode,
  ReachabilityResult,
  HopStep,
  HopChain,
  TwinObject,
  TwinRelation,
  TwinSchema,
} from './types';

export interface ReachabilityOptions {
  /** Optional depth cap: only nodes within `maxHops` hops of the root are reached. */
  maxHops?: number;
}

interface AdjEdge {
  to: string;
  relId: string;
  relInst: string;
  dir: 'fwd' | 'rev';
  flood?: string | null;
}

function edge(
  to: string,
  relId: string,
  relInst: string,
  dir: 'fwd' | 'rev',
  flood: string | null = null,
): AdjEdge {
  return { to, relId, relInst, dir, flood };
}

function buildChildren(relations: TwinRelation[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const r of relations) {
    if (r.relationTypeId !== 'rel.contains') continue;
    const arr = children.get(r.fromId);
    if (arr) arr.push(r.toId);
    else children.set(r.fromId, [r.toId]);
  }
  return children;
}

function descendantsOf(
  id: string,
  children: Map<string, string[]>,
): string[] {
  const out: string[] = [];
  const stack = [...(children.get(id) ?? [])];
  const seen = new Set<string>();
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    const c = children.get(n);
    if (c) stack.push(...c);
  }
  return out;
}

export function buildAdjacency(
  schema: TwinSchema,
  relations: TwinRelation[],
  mode: QueryMode,
): Map<string, AdjEdge[]> {
  const adj = new Map<string, AdjEdge[]>();
  const add = (a: string, b: string, edge: AdjEdge) => {
    const arr = adj.get(a);
    if (arr) arr.push(edge);
    else adj.set(a, [edge]);
  };

  const rtById = new Map(schema.relationTypes.map((rt) => [rt.id, rt]));
  const children = buildChildren(relations);

  for (const r of relations) {
    const rt = rtById.get(r.relationTypeId);
    if (!rt || !rt.propagatesReachability) continue;
    const A = r.fromId;
    const B = r.toId;

    if (rt.modeDependent) {
      // memberOf: only one direction per mode
      if (mode === 'user-to-data') {
        add(A, B, edge(B, rt.id, r.id, 'fwd'));
      } else {
        add(B, A, edge(A, rt.id, r.id, 'rev'));
      }
      continue;
    }

    const dir = rt.direction ?? 'bidirectional';

    if (rt.id === 'rel.accesses') {
      // Accesses + descendant-flood: reaching B includes B's contains-subtree.
      const targets = [B, ...descendantsOf(B, children)];
      for (const t of targets) {
        const flood = t === B ? null : B;
        if (dir !== 'reverse') add(A, t, edge(t, rt.id, r.id, 'fwd', flood));
        if (dir !== 'forward') add(t, A, edge(A, rt.id, r.id, 'rev', flood));
      }
      continue;
    }

    // Honor the relation type's direction semantic for propagation.
    if (dir !== 'reverse') add(A, B, edge(B, rt.id, r.id, 'fwd'));
    if (dir !== 'forward') add(B, A, edge(A, rt.id, r.id, 'rev'));
  }

  return adj;
}

/** Deterministic adjacency order: by target object id, then relation type id. */
function deterministicOrder(arr: AdjEdge[]): AdjEdge[] {
  return [...arr].sort((a, b) => {
    if (a.to < b.to) return -1;
    if (a.to > b.to) return 1;
    if (a.relId < b.relId) return -1;
    if (a.relId > b.relId) return 1;
    return 0;
  });
}

interface BfsResult {
  visited: Set<string>;
  parent: Map<string, AdjEdge & { from: string }>;
  perHop: Map<number, Set<string>>;
  maxHop: number;
}

function bfs(
  adj: Map<string, AdjEdge[]>,
  root: string,
  maxHops?: number,
): BfsResult {
  const visited = new Set<string>([root]);
  const parent = new Map<string, AdjEdge & { from: string }>();
  const perHop = new Map<number, Set<string>>();
  perHop.set(0, new Set([root]));

  let frontier = [root];
  let hop = 0;
  while (frontier.length) {
    hop++;
    if (maxHops != null && hop > maxHops) break;
    const next: string[] = [];
    for (const u of frontier) {
      const edges = deterministicOrder(adj.get(u) ?? []);
      for (const e of edges) {
        if (visited.has(e.to)) continue;
        visited.add(e.to);
        parent.set(e.to, { ...e, from: u });
        const bucket = perHop.get(hop);
        if (bucket) bucket.add(e.to);
        else perHop.set(hop, new Set([e.to]));
        next.push(e.to);
      }
    }
    frontier = next;
  }

  return { visited, parent, perHop, maxHop: hop };
}

function chainTo(
  id: string,
  parent: Map<string, AdjEdge & { from: string }>,
): HopStep[] {
  const out: HopStep[] = [];
  let cur: string | undefined = id;
  while (cur && parent.has(cur)) {
    const p: AdjEdge & { from: string } = parent.get(cur)!;
    out.push({
      from: p.from,
      to: cur,
      relId: p.relId,
      relInst: p.relInst,
      dir: p.dir,
      flood: p.flood ?? null,
    });
    cur = p.from;
  }
  return out.reverse();
}

/**
 * Compute reachability over a logical graph.
 *
 * Spec API: `computeReachability(graph, rootId, mode, options?)`. `graph` bundles
 * the schema + objects + relations that every caller was passing unpacked.
 */
export function computeReachability(
  graph: Graph,
  rootId: string,
  mode: QueryMode,
  options?: ReachabilityOptions,
): ReachabilityResult {
  const { schema, relations } = graph;
  const adj = buildAdjacency(schema, relations, mode);
  const { visited, parent, perHop } = bfs(adj, rootId, options?.maxHops);

  // Build chains ordered shortest-hop-first, then by id for stability.
  const hopOf = (id: string): number => {
    for (const [h, set] of perHop) if (set.has(id)) return h;
    return 0;
  };

  const chains: HopChain[] = [...visited]
    .filter((id: string) => id !== rootId)
    .sort((a, b) => {
      const ha = hopOf(a);
      const hb = hopOf(b);
      if (ha !== hb) return ha - hb;
      return a < b ? -1 : a > b ? 1 : 0;
    })
    .map((id) => ({ targetId: id, steps: chainTo(id, parent) }));

  return {
    rootObjectId: rootId,
    mode,
    reachableIds: visited,
    hopChains: chains,
    perHopReachable: perHop,
    generatedAt: Date.now(),
  };
}

/**
 * Determine whether an object is a valid root for a given mode.
 *
 * data→who roots = Columns with a non-Public classification OR any dataCategory tag.
 * user→what roots = objects of type `type.user`.
 */
export function isValidRoot(object: TwinObject, mode: QueryMode): boolean {
  if (mode === 'user-to-data') {
    return object.typeId === 'type.user';
  }
  // data-to-user
  if (object.typeId !== 'type.column') return false;
  const cls = object.values.classification;
  if (cls && cls !== 'public') return true;
  if (Array.isArray(object.dataCategory) && object.dataCategory.length > 0) return true;
  return false;
}

/**
 * Memoization keyed by (graphRevision, rootId, mode).
 *
 * The graphRevision is a content hash provided by the caller — usually derived
 * from the count+ids of objects/relations. Memoization is intentional: same
 * (graph, root, mode) returns the cached result without recomputing.
 */
const memoCache = new Map<string, ReachabilityResult>();

export function computeReachabilityMemo(
  graphRevision: string,
  graph: Graph,
  rootId: string,
  mode: QueryMode,
  options?: ReachabilityOptions,
): ReachabilityResult {
  const key = `${graphRevision}|${rootId}|${mode}`;
  const hit = memoCache.get(key);
  if (hit) return hit;
  const result = computeReachability(graph, rootId, mode, options);
  memoCache.set(key, result);
  return result;
}

export function clearReachabilityCache(): void {
  memoCache.clear();
}

/**
 * Stable content hash of the graph used as a memo key. Lives in the pure engine
 * module so the store and the view share one implementation (no duplicated hash).
 */
export function graphRevisionOf(
  objects: TwinObject[],
  relations: TwinRelation[],
): string {
  const o = objects.map((x) => x.id).sort().join(',');
  const r = relations
    .map((x) => `${x.id}:${x.fromId}->${x.toId}:${x.relationTypeId}`)
    .sort()
    .join(',');
  return `${o.length}:${o}|${r.length}:${r}`;
}