/**
 * Pure schema-mutation utilities.
 *
 * Backing functions for the schema-builder's @dnd-kit/sortable drag-and-drop
 * (ticket 11: "reorder Sections, reorder Fields"). Pure: return a new TwinSchema
 * (or the same reference on no-op / invalid input), preserve every
 * field/section id (so object values keyed by field id stay attached), and
 * surface no repair conflicts (move is a safe evolution).
 */

import type { SectionDef, TwinSchema, TypeDef } from './types';

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
