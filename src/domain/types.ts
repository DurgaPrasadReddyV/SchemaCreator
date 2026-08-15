/**
 * Domain types for the IT-infrastructure digital-twin designer.
 *
 * Pure, UI-agnostic. The reachability engine, document layer, and stores all
 * depend on this module but not vice versa.
 */

export type FieldType = 'text' | 'enum' | 'multi-tag' | 'boolean' | 'number' | 'ref';

export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';

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

export interface RelationTypeDef {
  id: string;
  name: string;
  forwardLabel: string;
  reverseLabel: string;
  fromTypeIds: string[]; // allowed source type ids
  toTypeIds: string[]; // allowed target type ids
  propagatesReachability: boolean;
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
