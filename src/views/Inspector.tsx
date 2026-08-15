'use client';

import { Form, Input, InputNumber, Select, Switch, Empty, Tag, Space, Divider } from 'antd';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import { useMemo } from 'react';
import type { Classification, FieldDef, TwinObject, TwinDoc, TypeDef } from '@/domain/types';
import { useAutosave } from '@/shell/useAutosave';

export function Inspector() {
  useAutosave();
  const doc = useTwinStore((s) => s.doc);
  const patchDoc = useTwinStore((s) => s.patchDoc);
  const selectedId = useFlowStore((s) => s.selectedObjectId);
  const setReachable = useFlowStore((s) => s.setReachable);
  const setSelected = useFlowStore((s) => s.setSelectedObject);

  const obj = useMemo(
    () => doc?.objects.find((o) => o.id === selectedId) ?? null,
    [doc, selectedId],
  );
  const type = useMemo<TypeDef | undefined>(
    () => (obj ? doc?.schema.types.find((t) => t.id === obj.typeId) : undefined),
    [doc, obj],
  );

  if (!doc) return <div style={{ padding: 16 }}>No twin loaded</div>;
  if (!obj || !type) {
    return (
      <div style={{ padding: 16 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select a node to edit"
        />
      </div>
    );
  }

  const updateObj = (patch: Partial<TwinObject>) => {
    const next = doc.objects.map((o) => (o.id === obj.id ? { ...o, ...patch } : o));
    patchDoc({ objects: next });
  };

  const updateValues = (key: string, value: unknown) => {
    const next = doc.objects.map((o) =>
      o.id === obj.id ? { ...o, values: { ...o.values, [key]: value } } : o,
    );
    patchDoc({ objects: next });
  };

  const updateCapabilities = (caps: string[]) => {
    const next = doc.objects.map((o) =>
      o.id === obj.id ? { ...o, capabilities: caps } : o,
    );
    patchDoc({ objects: next });
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: 'var(--twin-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
          {type.name}
        </span>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          {(obj.values.name as string) ?? obj.id}
        </div>
        <div className="mono" style={{ color: 'var(--twin-text-muted)', fontSize: 11 }}>
          {obj.id}
        </div>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <Form layout="vertical" size="small">
        {type.sections.map((sec) => (
          <div key={sec.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                textTransform: 'uppercase',
                color: 'var(--twin-text-muted)',
                marginBottom: 6,
              }}
            >
              {sec.name}
            </div>
            {sec.fields.map((f) => (
              <Form.Item
                key={f.id}
                label={f.name}
                style={{ marginBottom: 8 }}
                required={f.required}
              >
                {renderField(f, obj, updateValues, doc)}
              </Form.Item>
            ))}
          </div>
        ))}

        <Divider style={{ margin: '12px 0' }} />
        <div
          style={{
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            color: 'var(--twin-text-muted)',
            marginBottom: 6,
          }}
        >
          Capabilities
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          value={obj.capabilities}
          onChange={updateCapabilities}
          options={doc.schema.capabilities.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Add capabilities"
        />
        {obj.dataCategory && obj.dataCategory.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              {obj.dataCategory.map((c) => (
                <Tag key={c}>{c}</Tag>
              ))}
            </Space>
          </div>
        ) : null}
      </Form>
    </div>
  );
}

function renderField(
  f: FieldDef,
  obj: TwinObject,
  update: (k: string, v: unknown) => void,
  doc: TwinDoc,
) {
  const v = obj.values[f.id];
  switch (f.type) {
    case 'text':
      return (
        <Input
          value={(v as string) ?? ''}
          onChange={(e) => update(f.id, e.target.value)}
          className={f.id === 'name' ? '' : 'mono'}
        />
      );
    case 'number':
      return (
        <InputNumber
          value={typeof v === 'number' ? v : undefined}
          onChange={(n) => update(f.id, n ?? null)}
          className="tabular"
          style={{ width: '100%' }}
        />
      );
    case 'boolean':
      return <Switch checked={!!v} onChange={(b) => update(f.id, b)} />;
    case 'enum': {
      if (f.id === 'classification') {
        return (
          <Select
            value={(v as Classification) ?? undefined}
            onChange={(c) => update(f.id, c)}
            allowClear
            options={[
              { value: 'public', label: 'Public' },
              { value: 'internal', label: 'Internal' },
              { value: 'confidential', label: 'Confidential' },
              { value: 'restricted', label: 'Restricted' },
            ]}
          />
        );
      }
      return (
        <Select
          value={(v as string) ?? undefined}
          onChange={(s) => update(f.id, s)}
          options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
          allowClear
        />
      );
    }
    case 'multi-tag': {
      if (f.id === 'dataCategory') {
        return (
          <Select
            mode="multiple"
            value={(v as string[]) ?? []}
            onChange={(tags: string[]) => {
              update(f.id, tags);
              // Auto-apply implied default classification + recommended capabilities when a
              // category is added (overridable by the user).
              if (obj.typeId === 'type.column' && tags.length > 0) {
                const last = tags[tags.length - 1];
                const cat = doc.schema.dataCategories.find((c) => c.id === last);
                if (cat) {
                  const cur = obj.values.classification as Classification | undefined;
                  if (!cur) {
                    update('classification', cat.defaultClassification);
                  }
                }
              }
            }}
            options={doc.schema.dataCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
        );
      }
      return (
        <Select
          mode="multiple"
          value={(v as string[]) ?? []}
          onChange={(s) => update(f.id, s)}
          options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
        />
      );
    }
    case 'ref':
      return <Input value={(v as string) ?? ''} onChange={(e) => update(f.id, e.target.value)} />;
    default:
      return null;
  }
}
