/**
 * Twin document migration + schema-evolution conflict detection.
 *
 * Pure, UI-agnostic. Both seam-2 modules. Idempotent and cumulative.
 */

import { buildStarterPack, SCHEMA_VERSION, STARTER_PACK_VERSION } from './starterPack';
import type {
  TwinDoc,
  TwinSchema,
  TypeDef,
  TwinObject,
  TwinRelation,
  RelationTypeDef,
  FieldDef,
} from './types';
import { NAME_FIELD_ID } from './types';

/**
 * Normalize an imported (possibly older) TwinDoc to the current shape.
 * - Fills missing `queryHistory`, `meta`, `graphLayout` (null), `createdAt`/`updatedAt`.
 * - Migrates `schema.schemaVersion` to current by re-applying migrations cumulatively.
 * - Never drops modeled data.
 *
 * Idempotent: running twice on the same doc yields the same doc.
 */
export function migrateTwinDoc(input: unknown): TwinDoc {
  if (!input || typeof input !== 'object') {
    throw new Error('migrateTwinDoc: input is not an object');
  }
  const raw = input as Partial<TwinDoc> & { schema?: Partial<TwinSchema> };

  // Idempotency: if already at the current version and well-formed, return a clean copy.
  if (
    raw.schema &&
    typeof raw.schema === 'object' &&
    raw.schema.schemaVersion === SCHEMA_VERSION
  ) {
    return fillMissing(raw);
  }

  // Build a current-shape doc, layering in the input.
  const starter = buildStarterPack();
  const mergedSchema: TwinSchema = mergeSchema(starter, raw.schema);

  const now = Date.now();
  const doc: TwinDoc = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : cryptoId(),
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Untitled twin',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    schema: mergedSchema,
    objects: Array.isArray(raw.objects) ? raw.objects.map(normalizeObject) : [],
    relations: Array.isArray(raw.relations) ? raw.relations.map(normalizeRelation) : [],
    graphLayout: raw.graphLayout ?? null,
    queryHistory: Array.isArray(raw.queryHistory) ? raw.queryHistory : [],
    meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
  };

  return doc;
}

function fillMissing(raw: Partial<TwinDoc> & { schema?: Partial<TwinSchema> }): TwinDoc {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : cryptoId(),
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Untitled twin',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    schema: mergeSchema(buildStarterPack(), raw.schema),
    objects: Array.isArray(raw.objects) ? raw.objects.map(normalizeObject) : [],
    relations: Array.isArray(raw.relations) ? raw.relations.map(normalizeRelation) : [],
    graphLayout: raw.graphLayout ?? null,
    queryHistory: Array.isArray(raw.queryHistory) ? raw.queryHistory : [],
    meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
  };
}

function mergeSchema(starter: TwinSchema, raw?: Partial<TwinSchema>): TwinSchema {
  if (!raw) return starter;
  return {
    types: Array.isArray(raw.types) && raw.types.length > 0 ? raw.types : starter.types,
    relationTypes:
      Array.isArray(raw.relationTypes) && raw.relationTypes.length > 0
        ? raw.relationTypes.map(normalizeRelationType)
        : starter.relationTypes,
    capabilities:
      Array.isArray(raw.capabilities) && raw.capabilities.length > 0
        ? raw.capabilities
        : starter.capabilities,
    dataCategories:
      Array.isArray(raw.dataCategories) && raw.dataCategories.length > 0
        ? raw.dataCategories
        : starter.dataCategories,
    schemaVersion: SCHEMA_VERSION,
    starterPackVersion: STARTER_PACK_VERSION,
  };
}

/** Fill a relation type's `direction` if an older-shape twin omitted it.
 *  The input is typed as `RelationTypeDef` (the current shape) but an
 *  imported/older twin parsed from JSON may lack `direction` at runtime. */
function normalizeRelationType(rt: RelationTypeDef): RelationTypeDef {
  const out: RelationTypeDef = { ...rt };
  if (!out.direction) out.direction = 'bidirectional';
  return out;
}

function normalizeObject(o: Partial<TwinObject>): TwinObject {
  const out: TwinObject = {
    id: typeof o.id === 'string' && o.id ? o.id : cryptoId(),
    typeId: typeof o.typeId === 'string' ? o.typeId : 'type.user',
    values: o.values && typeof o.values === 'object' ? (o.values as Record<string, unknown>) : {},
    capabilities: Array.isArray(o.capabilities) ? o.capabilities : [],
  };
  if (Array.isArray(o.dataCategory)) out.dataCategory = o.dataCategory;
  return out;
}

function normalizeRelation(r: Partial<TwinRelation>): TwinRelation {
  const rel = r as unknown as TwinRelation;
  const out: TwinRelation = {
    id: typeof rel.id === 'string' && rel.id ? rel.id : cryptoId(),
    relationTypeId: typeof rel.relationTypeId === 'string' ? rel.relationTypeId : 'rel.uses',
    fromId: typeof rel.fromId === 'string' ? rel.fromId : '',
    toId: typeof rel.toId === 'string' ? rel.toId : '',
  };
  if (Array.isArray(rel.capabilities)) out.capabilities = rel.capabilities;
  return out;
}

function cryptoId(): string {
  // Sufficient for in-browser twin ids; not security-sensitive.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- Conflict detection for schema evolution -----------------------------

export interface RepairConflict {
  typeId: string;
  objectId: string;
  fieldId: string;
  reason: 'orphaned-value' | 'invalid-value-for-type';
  message: string;
}

export interface RepairConflictsByType {
  typeId: string;
  typeName: string;
  conflicts: RepairConflict[];
}

const TYPE_INCOMPATIBLE: Record<string, Set<string>> = {
  text: new Set(['boolean', 'number', 'multi-tag', 'enum']),
  number: new Set(['text', 'boolean', 'multi-tag', 'enum']),
  boolean: new Set(['text', 'number', 'multi-tag', 'enum']),
  'multi-tag': new Set(['text', 'number', 'boolean', 'enum']),
  enum: new Set(['text', 'number', 'boolean', 'multi-tag']),
  ref: new Set(['text', 'number', 'boolean', 'multi-tag', 'enum']),
};

function isTypeCompatible(field: FieldDef, value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true; // empty is fine
  switch (field.type) {
    case 'text':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'multi-tag':
      return Array.isArray(value) && value.every((v) => typeof v === 'string');
    case 'enum':
      return typeof value === 'string' && (!field.options || field.options.includes(value));
    case 'ref':
      return typeof value === 'string';
    default:
      return true;
  }
}

/**
 * Detect conflicts that would require user review before any data is discarded.
 *
 * Conflicts surfaced:
 * - orphaned-value: a field id is in an object's `values` but no field def with that id exists
 *   in the current Type (e.g. a field was removed from the Type).
 * - invalid-value-for-type: a field exists in both Type and object but the value is incompatible
 *   with the field's current type (e.g. the field's type was changed).
 *
 * Safe evolutions (add field, rename field label, move between sections) are NOT conflicts:
 * - Add field: existing objects just lack the new field, and the field defaults at read time.
 * - Rename field label: values are keyed by stable field id, so renames are free.
 * - Move between sections: section grouping is derived at display time, free.
 */
export function detectRepairConflicts(
  schema: TwinSchema,
  objects: TwinObject[],
): RepairConflictsByType[] {
  const typeById = new Map(schema.types.map((t) => [t.id, t]));
  const out: RepairConflictsByType[] = [];

  for (const type of schema.types) {
    const fieldIds = new Set<string>();
    const fieldById = new Map<string, FieldDef>();
    for (const sec of type.sections) {
      for (const f of sec.fields) {
        fieldIds.add(f.id);
        fieldById.set(f.id, f);
      }
    }

    const conflicts: RepairConflict[] = [];
    const objs = objects.filter((o) => o.typeId === type.id);
    for (const obj of objs) {
      // 1) Orphaned values: keys in obj.values that don't have a current field def
      for (const fid of Object.keys(obj.values ?? {})) {
        if (fid === NAME_FIELD_ID) continue; // name is the well-known identity key
        if (!fieldIds.has(fid)) {
          conflicts.push({
            typeId: type.id,
            objectId: obj.id,
            fieldId: fid,
            reason: 'orphaned-value',
            message: `Field "${fid}" no longer exists in Type "${type.name}".`,
          });
        }
      }
      // 2) Invalid value for current type
      for (const [fid, val] of Object.entries(obj.values ?? {})) {
        if (fid === NAME_FIELD_ID) continue;
        const f = fieldById.get(fid);
        if (!f) continue;
        if (!isTypeCompatible(f, val)) {
          conflicts.push({
            typeId: type.id,
            objectId: obj.id,
            fieldId: fid,
            reason: 'invalid-value-for-type',
            message: `Value for "${f.name}" is not a valid ${f.type}.`,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      out.push({
        typeId: type.id,
        typeName: type.name,
        conflicts,
      });
    }
  }
  return out;
}

/**
 * Resolve the repair conflicts for a single Type by discarding the offending
 * values: orphaned field ids are deleted, and values invalid for the current
 * field type are cleared. Only objects of `typeId` are touched; every other
 * object and every non-conflicting value is preserved.
 *
 * This is the user-triggered "discard" action — `detectRepairConflicts` lists
 * the conflicts and nothing is discarded until this runs.
 */
export function resolveRepairConflicts(
  schema: TwinSchema,
  objects: TwinObject[],
  typeId: string,
): TwinObject[] {
  const type = schema.types.find((t) => t.id === typeId);
  if (!type) return objects;

  const fieldById = new Map<string, FieldDef>();
  const fieldIds = new Set<string>();
  for (const sec of type.sections) {
    for (const f of sec.fields) {
      fieldById.set(f.id, f);
      fieldIds.add(f.id);
    }
  }

  return objects.map((o) => {
    if (o.typeId !== typeId) return o;
    const next: Record<string, unknown> = {};
    for (const [fid, val] of Object.entries(o.values ?? {})) {
      if (fid === NAME_FIELD_ID) {
        next[fid] = val; // identity key is always kept
        continue;
      }
      if (!fieldIds.has(fid)) continue; // orphaned → drop
      const f = fieldById.get(fid);
      if (f && !isTypeCompatible(f, val)) continue; // invalid → drop
      next[fid] = val; // keep
    }
    return { ...o, values: next };
  });
}

// --- Export / import round-trip -----------------------------------------

/**
 * Export a twin as a JSON-serializable object. `includeLayout` controls
 * whether `graphLayout` is included in the export.
 */
export function exportTwin(doc: TwinDoc, options: { includeLayout?: boolean } = {}): TwinDoc {
  const includeLayout = options.includeLayout ?? true;
  if (includeLayout) return { ...doc };
  return { ...doc, graphLayout: null };
}

export function exportTwinJson(doc: TwinDoc, options?: { includeLayout?: boolean }): string {
  return JSON.stringify(exportTwin(doc, options), null, 2);
}

export function importTwinJson(json: string, options?: { newId?: boolean }): TwinDoc {
  const parsed = JSON.parse(json);
  const migrated = migrateTwinDoc(parsed);
  if (options?.newId !== false) {
    migrated.id = cryptoId();
  }
  return migrated;
}
