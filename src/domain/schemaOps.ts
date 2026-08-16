/**
 * Pure schema-mutation utilities.
 *
 * Backing functions for the schema-builder's @dnd-kit/sortable drag-and-drop
 * (ticket 11: "reorder Sections, reorder Fields"). Pure: return a new TwinSchema
 * (or the same reference on no-op / invalid input), preserve every
 * field/section id (so object values keyed by field id stay attached), and
 * surface no repair conflicts (move is a safe evolution).
 */

import type {
  CapabilityDef,
  DataCategoryDef,
  RelationTypeDef,
  SectionDef,
  TwinSchema,
  TypeDef,
} from './types';

/** Slug + short uniqueness suffix. Used for human-readable generated ids
 *  (type/relation/capability/category) that stay stable after creation. */
export function generatedId(prefix: string, name: string): string {
  const slug = (name || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'item';
  return `${prefix}.${slug}-${Math.random().toString(36).slice(2, 6)}`;
}

// --- Types ----------------------------------------------------------------

export function addType(schema: TwinSchema, type: TypeDef): TwinSchema {
  return { ...schema, types: [...schema.types, type] };
}

export function updateType(schema: TwinSchema, type: TypeDef): TwinSchema {
  if (!schema.types.some((t) => t.id === type.id)) return schema;
  return { ...schema, types: schema.types.map((t) => (t.id === type.id ? type : t)) };
}

export function removeType(schema: TwinSchema, typeId: string): TwinSchema {
  if (!schema.types.some((t) => t.id === typeId)) return schema;
  return { ...schema, types: schema.types.filter((t) => t.id !== typeId) };
}

// --- Relation types -------------------------------------------------------

export function addRelationType(schema: TwinSchema, rt: RelationTypeDef): TwinSchema {
  return { ...schema, relationTypes: [...schema.relationTypes, rt] };
}

export function updateRelationType(schema: TwinSchema, rt: RelationTypeDef): TwinSchema {
  if (!schema.relationTypes.some((r) => r.id === rt.id)) return schema;
  return {
    ...schema,
    relationTypes: schema.relationTypes.map((r) => (r.id === rt.id ? rt : r)),
  };
}

export function removeRelationType(schema: TwinSchema, rtId: string): TwinSchema {
  if (!schema.relationTypes.some((r) => r.id === rtId)) return schema;
  return { ...schema, relationTypes: schema.relationTypes.filter((r) => r.id !== rtId) };
}

// --- Capabilities --------------------------------------------------------

export function addCapability(schema: TwinSchema, cap: CapabilityDef): TwinSchema {
  return { ...schema, capabilities: [...schema.capabilities, cap] };
}

export function updateCapability(schema: TwinSchema, cap: CapabilityDef): TwinSchema {
  if (!schema.capabilities.some((c) => c.id === cap.id)) return schema;
  return {
    ...schema,
    capabilities: schema.capabilities.map((c) => (c.id === cap.id ? cap : c)),
  };
}

export function removeCapability(schema: TwinSchema, capId: string): TwinSchema {
  if (!schema.capabilities.some((c) => c.id === capId)) return schema;
  return { ...schema, capabilities: schema.capabilities.filter((c) => c.id !== capId) };
}

// --- Data categories -----------------------------------------------------

export function addDataCategory(schema: TwinSchema, cat: DataCategoryDef): TwinSchema {
  return { ...schema, dataCategories: [...schema.dataCategories, cat] };
}

export function updateDataCategory(schema: TwinSchema, cat: DataCategoryDef): TwinSchema {
  if (!schema.dataCategories.some((c) => c.id === cat.id)) return schema;
  return {
    ...schema,
    dataCategories: schema.dataCategories.map((c) => (c.id === cat.id ? cat : c)),
  };
}

export function removeDataCategory(schema: TwinSchema, catId: string): TwinSchema {
  if (!schema.dataCategories.some((c) => c.id === catId)) return schema;
  return { ...schema, dataCategories: schema.dataCategories.filter((c) => c.id !== catId) };
}

/**
 * Move a section within a Type from index `from` to index `to`.
 * Returns the same `schema` reference on no-op, out-of-bounds, or unknown typeId.
 */
export function reorderSections(
  schema: TwinSchema,
  typeId: string,
  from: number,
  to: number,
): TwinSchema {
  if (from === to) return schema;
  const type = schema.types.find((t) => t.id === typeId);
  if (!type) return schema;
  const sections = type.sections;
  if (from < 0 || from >= sections.length || to < 0 || to >= sections.length) return schema;
  const nextSections = sections.slice();
  const [moved] = nextSections.splice(from, 1);
  nextSections.splice(to, 0, moved);
  const nextType: TypeDef = { ...type, sections: nextSections };
  return {
    ...schema,
    types: schema.types.map((t) => (t.id === typeId ? nextType : t)),
  };
}

/**
 * Move a field within a Section from index `from` to index `to`.
 * Returns the same `schema` reference on no-op, out-of-bounds, or unknown ids.
 */
export function reorderFields(
  schema: TwinSchema,
  typeId: string,
  sectionId: string,
  from: number,
  to: number,
): TwinSchema {
  if (from === to) return schema;
  const type = schema.types.find((t) => t.id === typeId);
  if (!type) return schema;
  const section = type.sections.find((s) => s.id === sectionId);
  if (!section) return schema;
  const fields = section.fields;
  if (from < 0 || from >= fields.length || to < 0 || to >= fields.length) return schema;
  const nextFields = fields.slice();
  const [moved] = nextFields.splice(from, 1);
  nextFields.splice(to, 0, moved);
  const nextSection: SectionDef = { ...section, fields: nextFields };
  return {
    ...schema,
    types: schema.types.map((t) =>
      t.id === typeId
        ? { ...t, sections: t.sections.map((s) => (s.id === sectionId ? nextSection : s)) }
        : t,
    ),
  };
}
