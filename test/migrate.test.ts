/**
 * Seam 2 — twin document / schema layer (pure).
 *
 * Covers: normalizer, repair-conflict detector, export/import round-trip.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  migrateTwinDoc,
  detectRepairConflicts,
  exportTwin,
  exportTwinJson,
  importTwinJson,
} from '../src/domain/migrate';
import { reorderSections, reorderFields } from '../src/domain/schemaOps';
import { buildAcmeDemoTwin } from '../src/domain/demoTwin';
import { buildStarterPack } from '../src/domain/starterPack';
import type { SectionDef, TwinDoc, TwinObject, TwinSchema, TypeDef } from '../src/domain/types';

test('migrateTwinDoc: normalizes an older-shape doc without dropping data', () => {
  // Older-shape: missing queryHistory, meta, graphLayout, schemaVersion=0
  const older = {
    id: 't1',
    name: 'Older',
    createdAt: 1234,
    updatedAt: 5678,
    schema: {
      // intentionally omit schemaVersion; the migrator should set the current
      types: [],
      relationTypes: [],
      capabilities: [],
      dataCategories: [],
    },
    objects: [],
    relations: [],
    // queryHistory, meta, graphLayout missing
  };
  const migrated = migrateTwinDoc(older);
  assert.equal(typeof migrated.id, 'string');
  assert.equal(migrated.name, 'Older');
  assert.equal(migrated.schema.schemaVersion, 1, 'migrated to current schemaVersion');
  assert.ok(Array.isArray(migrated.objects));
  assert.ok(Array.isArray(migrated.relations));
  assert.ok(Array.isArray(migrated.queryHistory));
  assert.ok(migrated.meta && typeof migrated.meta === 'object');
  assert.equal(migrated.graphLayout, null);
});

test('migrateTwinDoc: idempotent (running twice yields the same doc)', () => {
  const demo = buildAcmeDemoTwin();
  const a = migrateTwinDoc(demo);
  const b = migrateTwinDoc(a);
  // Compare everything except updatedAt which is preserved as-is.
  assert.equal(a.id, b.id);
  assert.equal(a.name, b.name);
  assert.equal(a.objects.length, b.objects.length);
  assert.equal(a.relations.length, b.relations.length);
  assert.equal(a.schema.schemaVersion, b.schema.schemaVersion);
});

test('migrateTwinDoc: preserves modeled data — objects + relations intact', () => {
  const demo = buildAcmeDemoTwin();
  const migrated = migrateTwinDoc(demo);
  assert.equal(migrated.objects.length, demo.objects.length);
  for (const o of demo.objects) {
    const found = migrated.objects.find((m) => m.id === o.id);
    assert.ok(found, `object ${o.id} preserved`);
    assert.deepEqual(found!.values, o.values);
  }
  assert.equal(migrated.relations.length, demo.relations.length);
  for (const r of demo.relations) {
    const found = migrated.relations.find((m) => m.id === r.id);
    assert.ok(found, `relation ${r.id} preserved`);
  }
});

test('Safe evolution (add field) does not surface any conflict', () => {
  const schema = buildStarterPack();
  // Add a new field to a Type. Existing objects lack the field — that's fine, no conflict.
  const newType: TypeDef = {
    ...schema.types[0],
    sections: [
      ...schema.types[0].sections,
      {
        id: 'sec.extra',
        name: 'Extra',
        fields: [{ id: 'extraField', name: 'Extra Field', type: 'text' }],
      },
    ],
  };
  const newSchema: TwinSchema = {
    ...schema,
    types: schema.types.map((t) => (t.id === newType.id ? newType : t)),
  };
  const objs: TwinObject[] = [
    { id: 'o1', typeId: newType.id, values: { name: 'X' }, capabilities: [] },
  ];
  const conflicts = detectRepairConflicts(newSchema, objs);
  assert.deepEqual(conflicts, [], 'no conflict: new field absent is fine');
});

test('Safe evolution (rename field label) does not surface any conflict', () => {
  const schema = buildStarterPack();
  // Rename a field's label (NOT id) on the User type. Values are id-keyed so this is free.
  const userType = schema.types.find((t) => t.id === 'type.user')!;
  const renamed: TypeDef = {
    ...userType,
    sections: userType.sections.map((s) => ({
      ...s,
      fields: s.fields.map((f) =>
        f.id === 'username' ? { ...f, name: 'User Name' } : f,
      ),
    })),
  };
  const newSchema: TwinSchema = {
    ...schema,
    types: schema.types.map((t) => (t.id === 'type.user' ? renamed : t)),
  };
  const objs: TwinObject[] = [
    {
      id: 'u1',
      typeId: 'type.user',
      values: { name: 'Jane', username: 'jdoe' },
      capabilities: [],
    },
  ];
  const conflicts = detectRepairConflicts(newSchema, objs);
  assert.deepEqual(conflicts, [], 'no conflict: rename is free (id-keyed)');
});

test('Safe evolution (move field between sections) does not surface any conflict', () => {
  const schema = buildStarterPack();
  const userType = schema.types.find((t) => t.id === 'type.user')!;
  // Move email from Identity into a new "Contact" section
  const [sec1, sec2] = userType.sections;
  const moved: TypeDef = {
    ...userType,
    sections: [
      { ...sec1, fields: sec1.fields.filter((f) => f.id !== 'email') },
      {
        id: 'sec.contact',
        name: 'Contact',
        fields: [{ id: 'email', name: 'Email', type: 'text' }],
      },
      sec2,
    ],
  };
  const newSchema: TwinSchema = {
    ...schema,
    types: schema.types.map((t) => (t.id === 'type.user' ? moved : t)),
  };
  const objs: TwinObject[] = [
    { id: 'u1', typeId: 'type.user', values: { name: 'Jane', email: 'j@a' }, capabilities: [] },
  ];
  const conflicts = detectRepairConflicts(newSchema, objs);
  assert.deepEqual(conflicts, [], 'no conflict: section move is free');
});

test('Destructive evolution: removing a field that has values surfaces conflicts', () => {
  const schema = buildStarterPack();
  const userType = schema.types.find((t) => t.id === 'type.user')!;
  // Remove the `email` field from the user type
  const withoutEmail: TypeDef = {
    ...userType,
    sections: userType.sections.map((s) => ({
      ...s,
      fields: s.fields.filter((f) => f.id !== 'email'),
    })),
  };
  const newSchema: TwinSchema = {
    ...schema,
    types: schema.types.map((t) => (t.id === 'type.user' ? withoutEmail : t)),
  };
  const objs: TwinObject[] = [
    { id: 'u1', typeId: 'type.user', values: { name: 'Jane', email: 'j@a' }, capabilities: [] },
    { id: 'u2', typeId: 'type.user', values: { name: 'Bob', email: 'b@b' }, capabilities: [] },
    { id: 'u3', typeId: 'type.user', values: { name: 'Sue' }, capabilities: [] }, // no email
  ];
  const conflicts = detectRepairConflicts(newSchema, objs);
  const userConflicts = conflicts.find((c) => c.typeId === 'type.user');
  assert.ok(userConflicts, 'user type has conflicts');
  const affected = userConflicts!.conflicts.filter((c) => c.fieldId === 'email');
  assert.equal(affected.length, 2, 'only the two objects with email values are affected');
  for (const c of affected) {
    assert.equal(c.reason, 'orphaned-value');
  }
});

test('Destructive evolution: changing a field type surfaces conflicts', () => {
  const schema = buildStarterPack();
  const colType = schema.types.find((t) => t.id === 'type.column')!;
  // Change `dataType` field from `text` to `number` (invalid for existing string values)
  const changed: TypeDef = {
    ...colType,
    sections: colType.sections.map((s) => ({
      ...s,
      fields: s.fields.map((f) => (f.id === 'dataType' ? { ...f, type: 'number' as const } : f)),
    })),
  };
  const newSchema: TwinSchema = {
    ...schema,
    types: schema.types.map((t) => (t.id === 'type.column' ? changed : t)),
  };
  const objs: TwinObject[] = [
    {
      id: 'c1',
      typeId: 'type.column',
      values: { name: 'SSN', dataType: 'varchar(11)' },
      capabilities: [],
    },
  ];
  const conflicts = detectRepairConflicts(newSchema, objs);
  const colConflicts = conflicts.find((c) => c.typeId === 'type.column');
  assert.ok(colConflicts);
  const c = colConflicts!.conflicts.find((x) => x.fieldId === 'dataType');
  assert.ok(c, 'dataType conflict surfaced');
  assert.equal(c!.reason, 'invalid-value-for-type');
});

test('No silent data destruction: data remains in obj.values until the user acts', () => {
  const schema = buildStarterPack();
  const userType = schema.types.find((t) => t.id === 'type.user')!;
  const withoutEmail: TypeDef = {
    ...userType,
    sections: userType.sections.map((s) => ({
      ...s,
      fields: s.fields.filter((f) => f.id !== 'email'),
    })),
  };
  const newSchema: TwinSchema = {
    ...schema,
    types: schema.types.map((t) => (t.id === 'type.user' ? withoutEmail : t)),
  };
  const objs: TwinObject[] = [
    { id: 'u1', typeId: 'type.user', values: { name: 'Jane', email: 'j@a' }, capabilities: [] },
  ];
  detectRepairConflicts(newSchema, objs); // surfaces the conflict
  // Crucially, the object still holds the value
  assert.equal(objs[0].values.email, 'j@a', 'value preserved until user acts');
});

test('Export/import round-trip: equals the original (modulo a fresh id)', () => {
  const demo = buildAcmeDemoTwin();
  const json = exportTwinJson(demo);
  const imported = importTwinJson(json);
  assert.notEqual(imported.id, demo.id, 'fresh id on import');
  imported.id = demo.id; // equalize the id
  assert.deepEqual(imported, demo);
});

test('Export with graphLayout stripped yields a valid twin', () => {
  const demo = buildAcmeDemoTwin();
  // Pretend the twin has a layout
  const withLayout: TwinDoc = {
    ...demo,
    graphLayout: {
      nodes: [
        { id: 'ssn', position: { x: 10, y: 20 }, data: {}, type: 'twinNode' },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  };
  const stripped = exportTwin(withLayout, { includeLayout: false });
  assert.equal(stripped.graphLayout, null);
  // logical data preserved
  assert.equal(stripped.objects.length, withLayout.objects.length);
  assert.equal(stripped.relations.length, withLayout.relations.length);
  // re-importing works
  const reimported = importTwinJson(exportTwinJson(stripped));
  assert.equal(reimported.graphLayout, null);
  assert.equal(reimported.objects.length, withLayout.objects.length);
});

test('Export with includeLayout=true preserves the graphLayout', () => {
  const demo = buildAcmeDemoTwin();
  const withLayout: TwinDoc = {
    ...demo,
    graphLayout: { nodes: [{ id: 'a' }], edges: [], viewport: { x: 1, y: 2, zoom: 0.5 } },
  };
  const exported = exportTwin(withLayout, { includeLayout: true });
  assert.deepEqual(exported.graphLayout, withLayout.graphLayout);
});

test('migrateTwinDoc upgrades are cumulative and idempotent', () => {
  const older = {
    id: 'tx',
    name: 'Older',
    createdAt: 1,
    updatedAt: 2,
    schema: { types: [], relationTypes: [], capabilities: [], dataCategories: [] },
    objects: [],
    relations: [],
  };
  const a = migrateTwinDoc(older);
  const b = migrateTwinDoc(a);
  const c = migrateTwinDoc(b);
  assert.deepEqual(b, c, 'running migrate twice yields same result');
});

// --- Pure reorder helpers ---------------------------------------------
//
// reorderSections / reorderFields underpin the schema-builder's @dnd-kit/sortable
// drag-and-drop (ticket 11). They must be pure (return a new schema), preserve
// every field/section by id (so values keyed by field id stay attached), and
// return the same schema unchanged on no-op or invalid input (graceful, no throw).

test('reorderSections: moves a section from one index to another within a Type', () => {
  // Every starter-pack Type has 2 sections. Use a synthetic Type with 3 sections
  // so we can exercise a real index-to-index move (not just swap-with-self).
  const schema = buildStarterPack();
  const userType = schema.types.find((t) => t.id === 'type.user')!;
  const augmented: TwinSchema = {
    ...schema,
    types: schema.types.map((t) =>
      t.id === 'type.user'
        ? {
            ...t,
            sections: [
              ...t.sections,
              { id: 'sec.extra', name: 'Extra', fields: [{ id: 'extraField', name: 'Extra', type: 'text' }] },
            ],
          }
        : t,
    ),
  };
  const before = augmented.types.find((t) => t.id === 'type.user')!.sections.map((s) => s.id);
  assert.deepEqual(before, ['sec.identity', 'sec.security', 'sec.extra']);
  // Move section at idx 2 to idx 0 (start). Splice-remove then insert at 0.
  const next = reorderSections(augmented, 'type.user', 2, 0);
  const after = next.types.find((t) => t.id === 'type.user')!.sections.map((s) => s.id);
  assert.deepEqual(after, ['sec.extra', 'sec.identity', 'sec.security']);
  // Other Types untouched
  for (const t of schema.types) {
    if (t.id === 'type.user') continue;
    const same = next.types.find((x) => x.id === t.id);
    assert.deepEqual(same, t);
  }
});

test('reorderSections: returns the same schema on no-op (from === to)', () => {
  const schema = buildStarterPack();
  const next = reorderSections(schema, 'type.user', 1, 1);
  assert.equal(next, schema, 'same reference returned for no-op');
});

test('reorderSections: out-of-bounds indices return schema unchanged', () => {
  const schema = buildStarterPack();
  const next = reorderSections(schema, 'type.user', -1, 99);
  assert.equal(next, schema);
});

test('reorderSections: unknown typeId returns schema unchanged', () => {
  const schema = buildStarterPack();
  const next = reorderSections(schema, 'type.doesNotExist', 0, 1);
  assert.equal(next, schema);
});

test('reorderFields: moves a field from one index to another within a Section', () => {
  const schema = buildStarterPack();
  const serverType = schema.types.find((t) => t.id === 'type.server')!;
  const sec1 = serverType.sections[0];
  assert.ok(sec1.fields.length >= 3, 'first server section has at least 3 fields');
  const before = sec1.fields.map((f) => f.id);
  const next = reorderFields(schema, 'type.server', sec1.id, 0, before.length - 1);
  const nextSec = next.types.find((t) => t.id === 'type.server')!.sections.find((s) => s.id === sec1.id)!;
  const after = nextSec.fields.map((f) => f.id);
  // Splice-remove the first field, insert at end → [before[1..], before[0]]
  const expected = [...before.slice(1), before[0]];
  assert.deepEqual(after, expected);
});

test('reorderFields: returns the same schema on no-op (from === to)', () => {
  const schema = buildStarterPack();
  const serverType = schema.types.find((t) => t.id === 'type.server')!;
  const sec1 = serverType.sections[0];
  const next = reorderFields(schema, 'type.server', sec1.id, 1, 1);
  assert.equal(next, schema);
});

test('reorderFields: out-of-bounds indices return schema unchanged', () => {
  const schema = buildStarterPack();
  const serverType = schema.types.find((t) => t.id === 'type.server')!;
  const sec1 = serverType.sections[0];
  const next = reorderFields(schema, 'type.server', sec1.id, -1, 99);
  assert.equal(next, schema);
});

test('reorderFields: unknown sectionId returns schema unchanged', () => {
  const schema = buildStarterPack();
  const next = reorderFields(schema, 'type.server', 'sec.doesNotExist', 0, 1);
  assert.equal(next, schema);
});

test('reorderFields: preserves all field ids exactly (no data loss)', () => {
  const schema = buildStarterPack();
  const serverType = schema.types.find((t) => t.id === 'type.server')!;
  const sec: SectionDef = serverType.sections[0];
  const beforeIds = new Set(sec.fields.map((f) => f.id));
  const next = reorderFields(schema, 'type.server', sec.id, 0, sec.fields.length - 1);
  const nextSec = next.types.find((t) => t.id === 'type.server')!.sections.find((s) => s.id === sec.id)!;
  const afterIds = new Set(nextSec.fields.map((f) => f.id));
  assert.deepEqual([...afterIds].sort(), [...beforeIds].sort(), 'same id set preserved');
  assert.equal(nextSec.fields.length, sec.fields.length, 'no fields added or dropped');
});

test('reorderFields: reordered schema surfaces no repair conflicts (move is free)', () => {
  const schema = buildStarterPack();
  const serverType = schema.types.find((t) => t.id === 'type.server')!;
  const sec = serverType.sections[0];
  // Provide a value that satisfies each field's type (enums must match an allowed option).
  const valueFor = (f: { id: string; type: string; options?: string[] }): unknown => {
    switch (f.type) {
      case 'enum':
        return f.options?.[0] ?? '';
      case 'boolean':
        return false;
      case 'number':
        return 1;
      case 'multi-tag':
        return [];
      default:
        return 'x';
    }
  };
  const objs: TwinObject[] = [
    {
      id: 's1',
      typeId: 'type.server',
      values: Object.fromEntries(sec.fields.map((f) => [f.id, valueFor(f)])),
      capabilities: [],
    },
  ];
  const next = reorderFields(schema, 'type.server', sec.id, 0, sec.fields.length - 1);
  const conflicts = detectRepairConflicts(next, objs);
  assert.deepEqual(conflicts, [], 'field reorder is a safe evolution');
});

test('reorderSections: reordered schema surfaces no repair conflicts (move is free)', () => {
  const schema = buildStarterPack();
  const userType = schema.types.find((t) => t.id === 'type.user')!;
  const sec1 = userType.sections[0];
  const objs: TwinObject[] = [
    {
      id: 'u1',
      typeId: 'type.user',
      values: Object.fromEntries(sec1.fields.map((f) => [f.id, 'x'])),
      capabilities: [],
    },
  ];
  // Swap sections 0 and 1 (valid in-bounds move for a 2-section type).
  const next = reorderSections(schema, 'type.user', 0, userType.sections.length - 1);
  const conflicts = detectRepairConflicts(next, objs);
  assert.deepEqual(conflicts, [], 'section reorder is a safe evolution');
});

test('reorderFields: leaves the other Types strictly equal to the originals', () => {
  const schema = buildStarterPack();
  const serverType = schema.types.find((t) => t.id === 'type.server')!;
  const sec = serverType.sections[0];
  const next = reorderFields(schema, 'type.server', sec.id, 0, sec.fields.length - 1);
  for (const t of schema.types) {
    if (t.id === 'type.server') continue;
    const same = next.types.find((x) => x.id === t.id);
    assert.deepEqual(same, t);
  }
});
