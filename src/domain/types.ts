/**
 * Domain types for the IT-infrastructure digital-twin designer.
 *
 * Pure, UI-agnostic. The reachability engine, document layer, and stores all
 * depend on this module but not vice versa.
 */

export type FieldType = 'text' | 'enum' | 'multi-tag' | 'boolean' | 'number' | 'ref';

/** All field types, in a stable order. Consumed by the schema builder's type
 *  Select and the conflict detector so the two never diverge. */
export const FIELD_TYPES: readonly FieldType[] = [
  'text',
  'enum',
  'multi-tag',
  'boolean',
  'number',
  'ref',
];

export const FIELD_TYPE_OPTIONS = FIELD_TYPES.map((t) => ({ value: t, label: t }));

export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';

/** Classification tiers, least- to most-sensitive. The blue ordinal ramp is
 *  keyed by this order (darker = more sensitive). */
export const CLASSIFICATIONS: readonly Classification[] = [
  'public',
  'internal',
  'confidential',
  'restricted',
];

export const CLASSIFICATION_OPTIONS = CLASSIFICATIONS.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1),
}));

/** Ordinal rank of a classification (1 = Public … 4 = Restricted). 0 if unset. */
export function classificationRank(c: Classification | undefined | null): number {
  if (!c) return 0;
  const i = CLASSIFICATIONS.indexOf(c);
  return i < 0 ? 0 : i + 1;
}

/** The well-known identity field id. Object node labels come from `values[NAME_FIELD_ID]`,
 *  and this id is exempt from orphaned-value conflict detection (it always exists). */
export const NAME_FIELD_ID = 'name';

export interface FieldDef {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for enum/multi-tag
  refTypeId?: string; // for ref
  defaultValue?: unknown;
  summary?: boolean; // show in table view
  description?: string;
}

export interface SectionDef {
  id: string;
  name: string;
  fields: FieldDef[];
}

export interface TypeDef {
  id: string;
  name: string;
  icon: string; // antd icon name
  sections: SectionDef[];
}

/** Direction semantic of a relation type.
 *  - `forward`: propagates only source → target
 *  - `reverse`: propagates only target → source
 *  - `bidirectional`: propagates both ways
 *  `memberOf` overrides this with its mode-dependent rule. */
export type RelationDirection = 'forward' | 'reverse' | 'bidirectional';

export interface RelationTypeDef {
  id: string;
  name: string;
  forwardLabel: string;
  reverseLabel: string;
  fromTypeIds: string[]; // allowed source type ids
  toTypeIds: string[]; // allowed target type ids
  propagatesReachability: boolean;
  direction: RelationDirection;
  /** Access edges traverse bidirectionally except memberOf, which is mode-dependent. */
  modeDependent?: boolean;
}

export interface CapabilityDef {
  id: string;
  name: string;
  abbreviation?: string;
  homeTypes: string[]; // default home node types
  badgeStyle?: 'outlined' | 'filled';
}

export interface DataCategoryDef {
  id: string;
  name: string;
  defaultClassification: Classification;
  recommendedCapabilities: string[];
  icon?: string;
}

export interface TwinSchema {
  types: TypeDef[];
  relationTypes: RelationTypeDef[];
  capabilities: CapabilityDef[];
  dataCategories: DataCategoryDef[];
  schemaVersion: number;
  starterPackVersion: number;
}

export interface TwinObject {
  id: string;
  typeId: string;
  values: Record<string, unknown>; // flat, sparse, id-keyed
  capabilities: string[];
  dataCategory?: string[];
}

export interface TwinRelation {
  id: string;
  relationTypeId: string;
  fromId: string;
  toId: string;
  capabilities?: string[];
}

/**
 * The logical graph the reachability engine operates on.
 *
 * Bundles the three fields that always travel together (`schema`, `objects`,
 * `relations`) — all are slices of a `TwinDoc`. Passing the bundle avoids the
 * `(schema, objects, relations)` data clump at every call site and matches the
 * spec's `computeReachability(graph, rootId, mode)` API shape.
 */
export interface Graph {
  schema: TwinSchema;
  objects: TwinObject[];
  relations: TwinRelation[];
}

export interface ReactFlowJsonObject {
  nodes: unknown[];
  edges: unknown[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface ReachabilityQuery {
  id: string;
  rootId: string;
  mode: QueryMode;
  generatedAt: number;
}

export interface TwinDoc {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  schema: TwinSchema;
  objects: TwinObject[];
  relations: TwinRelation[];
  graphLayout: ReactFlowJsonObject | null;
  queryHistory: ReachabilityQuery[];
  meta: Record<string, unknown>;
}

export type QueryMode = 'user-to-data' | 'data-to-user';

/** Engine result. */
export interface HopStep {
  from: string;
  to: string;
  relId: string;
  relInst: string;
  dir: 'fwd' | 'rev';
  flood?: string | null; // id of the container whose contains-subtree was flooded to reach `to`
}

export interface HopChain {
  targetId: string;
  steps: HopStep[]; // ordered root -> ... -> target
}

export interface ReachabilityResult {
  rootObjectId: string;
  mode: QueryMode;
  reachableIds: Set<string>;
  hopChains: HopChain[]; // ordered shortest-hop-first
  perHopReachable: Map<number, Set<string>>;
  generatedAt: number;
}
