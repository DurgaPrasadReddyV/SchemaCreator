'use client';

import { useState } from 'react';
import { Card, Form, Input, Select, Switch, Tabs, Empty, Button, Space, Modal, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTwinStore } from '@/state/twinStore';
import { detectRepairConflicts } from '@/domain/migrate';
import { reorderFields, reorderSections } from '@/domain/schemaOps';
import type { FieldDef, SectionDef, TypeDef } from '@/domain/types';
import { useAutosave } from '@/shell/useAutosave';

export function SchemaBuilder() {
  useAutosave();
  const doc = useTwinStore((s) => s.doc);
  const patchDoc = useTwinStore((s) => s.patchDoc);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [conflictTypeId, setConflictTypeId] = useState<string | null>(null);

  if (!doc) {
    return (
      <div className="twin-page">
        <Empty description="No twin loaded" />
      </div>
    );
  }

  const type = activeTypeId ? doc.schema.types.find((t) => t.id === activeTypeId) : doc.schema.types[0];
  const conflicts = detectRepairConflicts(doc.schema, doc.objects);
  const conflictByType = new Map(conflicts.map((c) => [c.typeId, c]));

  const updateSchema = (next: typeof doc.schema) => {
    patchDoc({ schema: next });
  };

  const updateType = (next: TypeDef) => {
    updateSchema({ ...doc.schema, types: doc.schema.types.map((t) => (t.id === next.id ? next : t)) });
  };

  // @dnd-kit sensors: small activation distance so click-to-edit inputs aren't grabbed.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Drag-and-drop reordering. Item ids are the raw SectionDef.id / FieldDef.id —
  // the helpers in domain/schemaOps use the same ids to locate indices. We
  // distinguish section vs field moves by checking which list contains each id.
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !type) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const sectionIndexById = new Map(type.sections.map((s, i) => [s.id, i]));
    const fieldIndexById = new Map<string, { section: SectionDef; index: number }>();
    type.sections.forEach((sec) =>
      sec.fields.forEach((f, i) => fieldIndexById.set(f.id, { section: sec, index: i })),
    );

    const activeSecIdx = sectionIndexById.get(activeId);
    const overSecIdx = sectionIndexById.get(overId);
    if (activeSecIdx != null && overSecIdx != null) {
      const next = reorderSections(doc.schema, type.id, activeSecIdx, overSecIdx);
      if (next !== doc.schema) updateSchema(next);
      return;
    }

    const activeField = fieldIndexById.get(activeId);
    const overField = fieldIndexById.get(overId);
    if (activeField && overField) {
      if (activeField.section.id !== overField.section.id) {
        // Cross-section field drops are out of scope for v1 (would require a
        // destructive-evolution review). Tell the user rather than silently failing.
        message.warning('Moving a field across sections is not supported yet.');
        return;
      }
      const next = reorderFields(
        doc.schema,
        type.id,
        activeField.section.id,
        activeField.index,
        overField.index,
      );
      if (next !== doc.schema) updateSchema(next);
      return;
    }
  };

  const addSection = () => {
    if (!type) return;
    const next: TypeDef = {
      ...type,
      sections: [
        ...type.sections,
        {
          id: `sec-${Date.now().toString(36)}`,
          name: 'New section',
          fields: [],
        },
      ],
    };
    updateType(next);
  };

  const updateSection = (sec: SectionDef, patch: Partial<SectionDef>) => {
    if (!type) return;
    updateType({
      ...type,
      sections: type.sections.map((s) => (s.id === sec.id ? { ...s, ...patch } : s)),
    });
  };

  const removeSection = (sec: SectionDef) => {
    if (!type) return;
    Modal.confirm({
      title: `Remove section "${sec.name}"?`,
      content: 'A Repair action may be required if any objects hold values for fields in this section.',
      okText: 'Remove',
      okButtonProps: { danger: true },
      onOk: () => {
        if (!type) return;
        updateType({
          ...type,
          sections: type.sections.filter((s) => s.id !== sec.id),
        });
      },
    });
  };

  const addField = (sec: SectionDef) => {
    if (!type) return;
    const field: FieldDef = {
      id: `f-${Date.now().toString(36)}`,
      name: 'New field',
      type: 'text',
    };
    updateSection(sec, { fields: [...sec.fields, field] });
  };

  const updateField = (sec: SectionDef, field: FieldDef, patch: Partial<FieldDef>) => {
    updateSection(sec, {
      fields: sec.fields.map((f) => (f.id === field.id ? { ...f, ...patch } : f)),
    });
  };

  const removeField = (sec: SectionDef, field: FieldDef) => {
    Modal.confirm({
      title: `Remove field "${field.name}"?`,
      content: 'This is a destructive evolution. A Repair action will list affected objects.',
      okText: 'Remove',
      okButtonProps: { danger: true },
      onOk: () => {
        updateSection(sec, { fields: sec.fields.filter((f) => f.id !== field.id) });
        message.warning('Field removed. Affected objects now have orphaned values.');
      },
    });
  };

  return (
    <div className="twin-page">
      <h2 style={{ margin: 0 }}>Schema</h2>
      <Tabs
        defaultActiveKey="types"
        items={[
          {
            key: 'types',
            label: 'Types',
            children: (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 220, flexShrink: 0 }}>
                  <Card size="small" title="Types">
                    {doc.schema.types.map((t) => {
                      const hasConflict = conflictByType.has(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTypeId(t.id)}
                          style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            borderRadius: 4,
                            background:
                              (type?.id ?? doc.schema.types[0].id) === t.id
                                ? 'var(--twin-brand)'
                                : 'transparent',
                            color:
                              (type?.id ?? doc.schema.types[0].id) === t.id ? 'white' : 'inherit',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{t.name}</span>
                          {hasConflict ? (
                            <Tag color="orange" style={{ marginInline: 0 }}>
                              !
                            </Tag>
                          ) : null}
                        </div>
                      );
                    })}
                  </Card>
                </div>

                {type ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Card
                      size="small"
                      title={`${type.name} sections`}
                      extra={
                        <Button icon={<PlusOutlined />} size="small" onClick={addSection}>
                          Add section
                        </Button>
                      }
                    >
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext
                          items={type.sections.map((s) => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {type.sections.map((sec) => (
                            <SortableSection
                              key={sec.id}
                              sec={sec}
                              onRename={(name) => updateSection(sec, { name })}
                              onRemove={() => removeSection(sec)}
                              onAddField={() => addField(sec)}
                              updateField={(f, patch) => updateField(sec, f, patch)}
                              removeField={(f) => removeField(sec, f)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                      {conflictByType.has(type.id) ? (
                        <Button
                          type="primary"
                          danger
                          onClick={() => setConflictTypeId(type.id)}
                        >
                          Repair objects ({conflictByType.get(type.id)!.conflicts.length})
                        </Button>
                      ) : null}
                    </Card>
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: 'relations',
            label: 'Relation types',
            children: (
              <Card size="small" title="Relation types">
                {doc.schema.relationTypes.map((rt) => (
                  <div
                    key={rt.id}
                    style={{
                      borderBottom: '1px solid var(--twin-border)',
                      padding: 8,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{rt.name}</span>
                    <span className="mono" style={{ color: 'var(--twin-text-muted)' }}>
                      {rt.forwardLabel} / {rt.reverseLabel}
                    </span>
                    <Tag color={rt.propagatesReachability ? 'green' : 'default'}>
                      {rt.propagatesReachability ? 'propagates' : 'non-propagating'}
                    </Tag>
                    {rt.modeDependent ? <Tag color="purple">mode-dependent</Tag> : null}
                  </div>
                ))}
              </Card>
            ),
          },
          {
            key: 'caps',
            label: 'Capabilities',
            children: (
              <Card size="small" title="Capability flags">
                <Space wrap>
                  {doc.schema.capabilities.map((c) => (
                    <Tag key={c.id} bordered={false}>
                      {c.name}
                    </Tag>
                  ))}
                </Space>
              </Card>
            ),
          },
          {
            key: 'cats',
            label: 'Data categories',
            children: (
              <Card size="small" title="Data categories">
                {doc.schema.dataCategories.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      borderBottom: '1px solid var(--twin-border)',
                      padding: 8,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <Tag color="blue">{c.defaultClassification}</Tag>
                    <Space size={4} wrap>
                      {c.recommendedCapabilities.map((r) => (
                        <Tag key={r} bordered={false}>
                          {r}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                ))}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Repair objects"
        open={conflictTypeId != null}
        onCancel={() => setConflictTypeId(null)}
        onOk={() => setConflictTypeId(null)}
        okText="Close"
        width={720}
      >
        {conflictTypeId
          ? (() => {
              const c = conflictByType.get(conflictTypeId);
              if (!c) return null;
              return (
                <div>
                  <p>
                    The following objects have values that conflict with the current Type
                    schema. <b>No data has been discarded.</b> Review and act on each row.
                  </p>
                  <table style={{ width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th align="left">Object</th>
                        <th align="left">Field</th>
                        <th align="left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.conflicts.map((cf, i) => {
                        const o = doc.objects.find((x) => x.id === cf.objectId);
                        return (
                          <tr key={i} style={{ borderTop: '1px solid var(--twin-border)' }}>
                            <td>{(o?.values.name as string) ?? cf.objectId}</td>
                            <td className="mono">{cf.fieldId}</td>
                            <td>{cf.message}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()
          : null}
      </Modal>
    </div>
  );
}

// --- Sortable building blocks -----------------------------------------

interface SortableSectionProps {
  sec: SectionDef;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAddField: () => void;
  updateField: (f: FieldDef, patch: Partial<FieldDef>) => void;
  removeField: (f: FieldDef) => void;
}

function SortableSection({
  sec,
  onRename,
  onRemove,
  onAddField,
  updateField,
  removeField,
}: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sec.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    border: '1px solid var(--twin-border)',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    background: 'var(--twin-surface)',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Space style={{ marginBottom: 8, width: '100%' }} align="center">
        <Button
          size="small"
          type="text"
          icon={<HolderOutlined />}
          {...attributes}
          {...listeners}
          aria-label={`Reorder section ${sec.name}`}
          style={{ cursor: 'grab' }}
        />
        <Input
          value={sec.name}
          onChange={(e) => onRename(e.target.value)}
          style={{ width: 220 }}
        />
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
        <span style={{ flex: 1 }} />
        <Button size="small" onClick={onAddField}>
          + Field
        </Button>
      </Space>
      <SortableContext
        items={sec.fields.map((f) => f.id)}
        strategy={verticalListSortingStrategy}
      >
        {sec.fields.map((f) => (
          <SortableField
            key={f.id}
            f={f}
            onPatch={(patch) => updateField(f, patch)}
            onRemove={() => removeField(f)}
          />
        ))}
      </SortableContext>
    </div>
  );
}

interface SortableFieldProps {
  f: FieldDef;
  onPatch: (patch: Partial<FieldDef>) => void;
  onRemove: () => void;
}

function SortableField({ f, onPatch, onRemove }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: f.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'grid',
    gridTemplateColumns: '24px 1fr 1fr 110px 80px 80px 32px',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
    background: isDragging ? 'var(--twin-surface)' : 'transparent',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Button
        size="small"
        type="text"
        icon={<HolderOutlined />}
        {...attributes}
        {...listeners}
        aria-label={`Reorder field ${f.name}`}
        style={{ cursor: 'grab' }}
      />
      <Input value={f.name} onChange={(e) => onPatch({ name: e.target.value })} size="small" />
      {/* Field id is immutable post-creation: it's the stable key every object's
          value is stored under. Renaming it would orphan every value silently. */}
      <span className="mono" style={{ color: 'var(--twin-text-muted)', fontSize: 12, padding: '4px 8px' }}>
        {f.id}
      </span>
      <Select
        size="small"
        value={f.type}
        onChange={(t) => onPatch({ type: t as FieldDef['type'] })}
        options={[
          { value: 'text', label: 'text' },
          { value: 'enum', label: 'enum' },
          { value: 'multi-tag', label: 'multi-tag' },
          { value: 'boolean', label: 'boolean' },
          { value: 'number', label: 'number' },
          { value: 'ref', label: 'ref' },
        ]}
      />
      <span style={{ fontSize: 12 }}>
        <Switch size="small" checked={!!f.summary} onChange={(v) => onPatch({ summary: v })} /> summary
      </span>
      <span style={{ fontSize: 12 }}>
        <Switch size="small" checked={!!f.required} onChange={(v) => onPatch({ required: v })} /> required
      </span>
      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onRemove} />
    </div>
  );
}
