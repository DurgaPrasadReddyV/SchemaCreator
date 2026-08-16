'use client';

import { Form, Input, InputNumber, Select, Switch, Empty, Tag, Space, Divider } from 'antd';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import { useReachabilityStore } from '@/state/reachabilityStore';
import { useMemo } from 'react';
import type { Classification, FieldDef, TwinObject, TwinRelation, TwinDoc, TypeDef } from '@/domain/types';
import { useAutosave } from '@/shell/useAutosave';
import { DataCategoryChips } from '@/views/chips';

export function Inspector() {
  useAutosave();
  const doc = useTwinStore((s) => s.doc);
  const patchDoc = useTwinStore((s) => s.patchDoc);
  const selectedId = useFlowStore((s) => s.selectedObjectId);
  const selectedRelationId = useFlowStore((s) => s.selectedRelationId);
  const setReachable = useFlowStore((s) => s.setReachable);
  const setSelected = useFlowStore((s) => s.setSelectedObject);
  const setSelectedRelation = useFlowStore((s) => s.setSelectedRelation);
  const reachResult = useReachabilityStore((s) => s.result);

  const rel = useMemo(
    () => (selectedRelationId ? doc?.relations.find((r) => r.id === selectedRelationId) ?? null : null),
    [doc, selectedRelationId],
  );

  if (!doc) return <div style={{ padding: 16 }}>No twin loaded</div>;

  // Relation editor takes precedence when an edge is selected (story 13).
  if (rel) {
    return (
      <RelationEditor
        rel={rel}
        doc={doc}
        onBack={() => setSelectedRelation(null)}
        onChange={(next) => patchDoc({ relations: doc.relations.map((r) => (r.id === next.id ? next : r)) })}
      />
    );
  }

  const obj = doc.objects.find((o) => o.id === selectedId) ?? null;
  const type = obj ? doc.schema.types.find((t) => t.id === obj.typeId) : undefined;

  if (!obj || !type) {
    return (
      <div style={{ padding: 16 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select a node or edge to edit"
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
              <DataCategoryChips ids={obj.dataCategory} schema={doc.schema} size="small" />
            </Space>
          </div>
        ) : null}
      </Form>

      {(() => {
        // Access chain for the selected node, when a reachability result is
        // live (story 65 — moved here from the Reachability side panel so the
        // chain lives next to the object being inspected).
        const chain = reachResult?.hopChains.find((c) => c.targetId === obj.id);
        if (!chain || chain.steps.length === 0) return null;
        return (
          <>
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
              Access chain
            </div>
            <ol style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              {chain.steps.map((s, i) => {
                const fromObj = doc.objects.find((o) => o.id === s.from);
                const toObj = doc.objects.find((o) => o.id === s.to);
                const rt = doc.schema.relationTypes.find((r) => r.id === s.relId);
                return (
                  <li key={i} className="mono">
                    {(fromObj?.values.name as string) ?? s.from}{' '}
                    <span style={{ color: 'var(--twin-text-muted)' }}>
                      {rt ? (s.dir === 'fwd' ? `─${rt.forwardLabel}→` : `←${rt.reverseLabel}─`) : ''}
                    </span>{' '}
                    {(toObj?.values.name as string) ?? s.to}
                    {s.flood ? (
                      <Tag color="geekblue" style={{ marginLeft: 6 }}>
                        flood via {String(doc.objects.find((o) => o.id === s.flood)?.values.name ?? s.flood)}
                      </Tag>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </>
        );
      })()}
    </div>
  );
}

/** Edge / relation editor (story 13): annotate a TwinRelation with capabilities. */
function RelationEditor({
  rel,
  doc,
  onBack,
  onChange,
}: {
  rel: TwinRelation;
  doc: TwinDoc;
  onBack: () => void;
  onChange: (next: TwinRelation) => void;
}) {
  const rt = doc.schema.relationTypes.find((r) => r.id === rel.relationTypeId);
  const fromObj = doc.objects.find((o) => o.id === rel.fromId);
  const toObj = doc.objects.find((o) => o.id === rel.toId);
  const fromType = doc.schema.types.find((t) => t.id === fromObj?.typeId);
  const toType = doc.schema.types.find((t) => t.id === toObj?.typeId);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: 'var(--twin-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
          Relation {rt?.name ?? rel.relationTypeId}
        </span>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          {(fromObj?.values.name as string) ?? rel.fromId}
          {' '}
          <span style={{ color: 'var(--twin-text-muted)' }}>─{rt?.forwardLabel ?? 'relates'}→</span>
          {' '}
          {(toObj?.values.name as string) ?? rel.toId}
        </div>
        <div className="mono" style={{ color: 'var(--twin-text-muted)', fontSize: 11 }}>
          {fromType?.name ?? '?'} → {toType?.name ?? '?'}
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--twin-brand)',
            cursor: 'pointer',
            padding: 0,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          ← Back to object
        </button>
      </div>
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
        Edge capabilities
      </div>
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        size="small"
        value={rel.capabilities ?? []}
        onChange={(caps: string[]) => onChange({ ...rel, capabilities: caps })}
        options={doc.schema.capabilities.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Add capabilities that protect this link"
      />
      <p style={{ fontSize: 11, color: 'var(--twin-text-muted)', marginTop: 8 }}>
        Capabilities on a relation describe protection applied to the data path itself
        (e.g. TLS on a connection), independent of either endpoint.
      </p>
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
