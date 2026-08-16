'use client';

import { useState } from 'react';
import { Card, Form, Input, Select, Switch, Tabs, Empty, Button, Space, Modal, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined, EditOutlined } from '@ant-design/icons';
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
import { detectRepairConflicts, resolveRepairConflicts } from '@/domain/migrate';
import {
  reorderFields,
  reorderSections,
  addType,
  updateType,
  removeType,
  addRelationType,
  updateRelationType,
  removeRelationType,
  addCapability,
  updateCapability,
  removeCapability,
  addDataCategory,
  updateDataCategory,
  removeDataCategory,
  generatedId,
} from '@/domain/schemaOps';
import type {
  CapabilityDef,
  DataCategoryDef,
  FieldDef,
  RelationDirection,
  RelationTypeDef,
  SectionDef,
  TwinSchema,
  TypeDef,
} from '@/domain/types';
import { CLASSIFICATION_OPTIONS, FIELD_TYPE_OPTIONS } from '@/domain/types';
import { useAutosave } from '@/shell/useAutosave';
import { DataCategoryChips } from '@/views/chips';

/** AntD icon names offered for Types. Matches the starter-pack icon set. */
const ICON_OPTIONS = [
  'DesktopOutlined',
  'DatabaseOutlined',
  'TableOutlined',
  'FieldNumberOutlined',
  'UserOutlined',
  'SafetyOutlined',
  'KeyOutlined',
  'CloudOutlined',
  'LinkOutlined',
  'AppstoreOutlined',
  'ApiOutlined',
  'GlobalOutlined',
  'ClusterOutlined',
  'HddOutlined',
];

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

  const updateSchema = (next: TwinSchema) => {
    patchDoc({ schema: next });
  };

  const updateTypeSchema = (next: TypeDef) => {
    updateSchema({ ...doc.schema, types: doc.schema.types.map((t) => (t.id === next.id ? next : t)) });
  };

  const handleAddType = () => {
    const id = generatedId('type', 'New type');
    const newType: TypeDef = {
      id,
      name: 'New type',
      icon: 'AppstoreOutlined',
      sections: [
        {
          id: `sec-${Date.now().toString(36)}`,
          name: 'Identity',
          fields: [{ id: 'name', name: 'Name', type: 'text', required: true, summary: true }],
        },
      ],
    };
    updateSchema(addType(doc.schema, newType));
    setActiveTypeId(id);
  };

  const handleRemoveType = (t: TypeDef) => {
    Modal.confirm({
      title: `Remove Type "${t.name}"?`,
      content: 'Objects of this Type become orphaned. A Repair action may be required.',
      okText: 'Remove',
      okButtonProps: { danger: true },
      onOk: () => {
        updateSchema(removeType(doc.schema, t.id));
        if (activeTypeId === t.id) setActiveTypeId(null);
      },
    });
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
    updateTypeSchema(next);
  };

  const updateSection = (sec: SectionDef, patch: Partial<SectionDef>) => {
    if (!type) return;
    updateTypeSchema({
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
        updateTypeSchema({
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

  const discardConflicts = () => {
    if (!conflictTypeId) return;
    const next = resolveRepairConflicts(doc.schema, doc.objects, conflictTypeId);
    patchDoc({ objects: next });
    message.success('Conflicting values discarded.');
    setConflictTypeId(null);
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
                  <Card
                    size="small"
                    title="Types"
                    extra={
                      <Button icon={<PlusOutlined />} size="small" onClick={handleAddType}>
                        Add
                      </Button>
                    }
                  >
                    {doc.schema.types.map((t) => {
                      const hasConflict = conflictByType.has(t.id);
                      const selected = (type?.id ?? doc.schema.types[0].id) === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTypeId(t.id)}
                          style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            borderRadius: 4,
                            background: selected ? 'var(--twin-brand)' : 'transparent',
                            color: selected ? 'white' : 'inherit',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>{t.name}</span>
                          <Space size={4}>
                            {hasConflict ? (
                              <Tag color="orange" style={{ marginInline: 0 }}>
                                !
                              </Tag>
                            ) : null}
                            {!t.id.startsWith('type.') || true ? (
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveType(t);
                                }}
                                style={{ color: selected ? 'white' : undefined }}
                              />
                            ) : null}
                          </Space>
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
                      {/* Type details: name + icon (the only type-level edits). */}
                      <Space style={{ marginBottom: 12 }} wrap>
                        <Input
                          value={type.name}
                          onChange={(e) => updateTypeSchema({ ...type, name: e.target.value })}
                          style={{ width: 200 }}
                          addonBefore="Name"
                        />
                        <Select
                          value={type.icon}
                          onChange={(icon) => updateTypeSchema({ ...type, icon })}
                          options={ICON_OPTIONS.map((i) => ({ value: i, label: i }))}
                          style={{ width: 200 }}
                          showSearch
                        />
                      </Space>
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
              <RelationTypesManager schema={doc.schema} onUpdate={updateSchema} />
            ),
          },
          {
            key: 'caps',
            label: 'Capabilities',
            children: <CapabilitiesManager schema={doc.schema} onUpdate={updateSchema} />,
          },
          {
            key: 'cats',
            label: 'Data categories',
            children: <DataCategoriesManager schema={doc.schema} onUpdate={updateSchema} />,
          },
        ]}
      />

      <Modal
        title="Repair objects"
        open={conflictTypeId != null}
        onCancel={() => setConflictTypeId(null)}
        footer={[
          <Button key="close" onClick={() => setConflictTypeId(null)}>
            Close
          </Button>,
          <Button key="discard" type="primary" danger onClick={discardConflicts}>
            Discard conflicting values
          </Button>,
        ]}
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
                    schema. <b>No data has been discarded.</b> Review, then discard the
                    conflicting values when ready.
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

// --- Relation types manager ----------------------------------------------

function RelationTypesManager({
  schema,
  onUpdate,
}: {
  schema: TwinSchema;
  onUpdate: (next: TwinSchema) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RelationTypeDef | null>(null);
  const [form] = Form.useForm();
  const typeOptions = schema.types.map((t) => ({ value: t.id, label: t.name }));

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      forwardLabel: '',
      reverseLabel: '',
      fromTypeIds: [],
      toTypeIds: [],
      propagatesReachability: true,
      direction: 'bidirectional',
      modeDependent: false,
    });
    setOpen(true);
  };

  const openEdit = (rt: RelationTypeDef) => {
    setEditing(rt);
    form.setFieldsValue({ ...rt });
    setOpen(true);
  };

  const submit = () => {
    form
      .validateFields()
      .then((v) => {
        if (editing) {
          onUpdate(updateRelationType(schema, { ...editing, ...v }));
        } else {
          const id = generatedId('rel', v.name);
          onUpdate(addRelationType(schema, { id, ...v } as RelationTypeDef));
        }
        setOpen(false);
      })
      .catch(() => {});
  };

  return (
    <Card
      size="small"
      title="Relation types"
      extra={
        <Button icon={<PlusOutlined />} size="small" onClick={openAdd}>
          Add
        </Button>
      }
    >
      {schema.relationTypes.map((rt) => (
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
          <Tag>{rt.direction}</Tag>
          {rt.modeDependent ? <Tag color="purple">mode-dependent</Tag> : null}
          <span style={{ flex: 1 }} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(rt)} />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onUpdate(removeRelationType(schema, rt.id))}
          />
        </div>
      ))}
      <Modal
        title={editing ? 'Edit relation type' : 'Add relation type'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText={editing ? 'Save' : 'Create'}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Forward label" name="forwardLabel" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item label="Reverse label" name="reverseLabel" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item label="From types" name="fromTypeIds" rules={[{ required: true }]}>
            <Select mode="multiple" options={typeOptions} placeholder="Source types" />
          </Form.Item>
          <Form.Item label="To types" name="toTypeIds" rules={[{ required: true }]}>
            <Select mode="multiple" options={typeOptions} placeholder="Target types" />
          </Form.Item>
          <Space>
            <Form.Item label="Propagates reachability" name="propagatesReachability" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Direction" name="direction">
              <Select
                style={{ width: 160 }}
                options={[
                  { value: 'forward', label: 'forward' },
                  { value: 'reverse', label: 'reverse' },
                  { value: 'bidirectional', label: 'bidirectional' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Mode-dependent" name="modeDependent" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

// --- Capabilities manager ------------------------------------------------

function CapabilitiesManager({
  schema,
  onUpdate,
}: {
  schema: TwinSchema;
  onUpdate: (next: TwinSchema) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CapabilityDef | null>(null);
  const [form] = Form.useForm();
  const typeOptions = schema.types.map((t) => ({ value: t.id, label: t.name }));

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ name: '', abbreviation: '', homeTypes: [], badgeStyle: 'outlined' });
    setOpen(true);
  };

  const openEdit = (c: CapabilityDef) => {
    setEditing(c);
    form.setFieldsValue({ ...c });
    setOpen(true);
  };

  const submit = () => {
    form
      .validateFields()
      .then((v) => {
        if (editing) {
          onUpdate(updateCapability(schema, { ...editing, ...v }));
        } else {
          const id = generatedId('cap', v.name);
          onUpdate(addCapability(schema, { id, ...v, homeTypes: v.homeTypes ?? [] } as CapabilityDef));
        }
        setOpen(false);
      })
      .catch(() => {});
  };

  return (
    <Card
      size="small"
      title="Capability flags"
      extra={
        <Button icon={<PlusOutlined />} size="small" onClick={openAdd}>
          Add
        </Button>
      }
    >
      {schema.capabilities.map((c) => (
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
          {c.abbreviation ? <Tag>{c.abbreviation}</Tag> : null}
          <span className="mono" style={{ color: 'var(--twin-text-muted)', fontSize: 11 }}>
            {c.id}
          </span>
          <span style={{ flex: 1 }} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(c)} />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onUpdate(removeCapability(schema, c.id))}
          />
        </div>
      ))}
      <Modal
        title={editing ? 'Edit capability' : 'Add capability'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText={editing ? 'Save' : 'Create'}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Abbreviation" name="abbreviation">
            <Input placeholder="e.g. mask, enc, tls" />
          </Form.Item>
          <Form.Item label="Default home types" name="homeTypes">
            <Select mode="multiple" options={typeOptions} placeholder="Node types this flag usually lives on" />
          </Form.Item>
          <Form.Item label="Badge style" name="badgeStyle">
            <Select
              options={[
                { value: 'outlined', label: 'outlined' },
                { value: 'filled', label: 'filled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// --- Data categories manager ---------------------------------------------

function DataCategoriesManager({
  schema,
  onUpdate,
}: {
  schema: TwinSchema;
  onUpdate: (next: TwinSchema) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DataCategoryDef | null>(null);
  const [form] = Form.useForm();
  const capOptions = schema.capabilities.map((c) => ({ value: c.id, label: c.name }));

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      defaultClassification: 'internal',
      recommendedCapabilities: [],
      icon: 'TagOutlined',
    });
    setOpen(true);
  };

  const openEdit = (c: DataCategoryDef) => {
    setEditing(c);
    form.setFieldsValue({ ...c });
    setOpen(true);
  };

  const submit = () => {
    form
      .validateFields()
      .then((v) => {
        if (editing) {
          onUpdate(updateDataCategory(schema, { ...editing, ...v }));
        } else {
          const id = generatedId('cat', v.name);
          onUpdate(
            addDataCategory(schema, {
              id,
              ...v,
              recommendedCapabilities: v.recommendedCapabilities ?? [],
            } as DataCategoryDef),
          );
        }
        setOpen(false);
      })
      .catch(() => {});
  };

  return (
    <Card
      size="small"
      title="Data categories"
      extra={
        <Button icon={<PlusOutlined />} size="small" onClick={openAdd}>
          Add
        </Button>
      }
    >
      {schema.dataCategories.map((c) => (
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
          <DataCategoryChips ids={[c.id]} schema={schema} />
          <Tag color="blue">{c.defaultClassification}</Tag>
          <Space size={4} wrap>
            {c.recommendedCapabilities.map((r) => (
              <Tag key={r} bordered={false}>
                {r}
              </Tag>
            ))}
          </Space>
          <span style={{ flex: 1 }} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(c)} />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onUpdate(removeDataCategory(schema, c.id))}
          />
        </div>
      ))}
      <Modal
        title={editing ? 'Edit data category' : 'Add data category'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText={editing ? 'Save' : 'Create'}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Default classification" name="defaultClassification" rules={[{ required: true }]}>
            <Select options={CLASSIFICATION_OPTIONS} />
          </Form.Item>
          <Form.Item label="Recommended capabilities" name="recommendedCapabilities">
            <Select mode="multiple" options={capOptions} placeholder="Capabilities applied on tag" />
          </Form.Item>
          <Form.Item label="Icon" name="icon">
            <Select options={ICON_OPTIONS.map((i) => ({ value: i, label: i }))} showSearch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
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
        options={FIELD_TYPE_OPTIONS as { value: string; label: string }[]}
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