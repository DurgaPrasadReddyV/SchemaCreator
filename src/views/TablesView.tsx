'use client';

import { useMemo, useState } from 'react';
import { Select, Table, Tag, Space, Empty, Input } from 'antd';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import type { FieldDef, TwinObject, TypeDef } from '@/domain/types';

export function TablesView() {
  const doc = useTwinStore((s) => s.doc);
  const setSelected = useFlowStore((s) => s.setSelectedObject);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const type = useMemo<TypeDef | undefined>(
    () => (typeId ? doc?.schema.types.find((t) => t.id === typeId) : undefined),
    [doc, typeId],
  );

  const summaryFields = useMemo<FieldDef[]>(
    () =>
      type
        ? type.sections.flatMap((s) => s.fields).filter((f) => f.summary)
        : [],
    [type],
  );

  const rows = useMemo<TwinObject[]>(() => {
    if (!doc || !typeId) return [];
    return doc.objects.filter((o) => o.typeId === typeId);
  }, [doc, typeId]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((o) =>
      JSON.stringify(o.values).toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (!doc) {
    return (
      <div className="twin-page">
        <Empty description="No twin loaded" />
      </div>
    );
  }

  if (!typeId) {
    return (
      <div className="twin-page">
        <h2>Tables</h2>
        <p style={{ color: 'var(--twin-text-muted)' }}>
          Choose a Type to see its objects as rows.
        </p>
        <Space wrap>
          {doc.schema.types.map((t) => (
            <Select.Option key={t.id} value={t.id}>
              {t.name}
            </Select.Option>
          ))}
        </Space>
        <div style={{ marginTop: 16 }}>
          <Select
            style={{ width: 320 }}
            placeholder="Select a Type"
            onChange={(v) => setTypeId(v)}
            options={doc.schema.types.map((t) => ({
              value: t.id,
              label: `${t.name} (${doc.objects.filter((o) => o.typeId === t.id).length})`,
            }))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="twin-table-wrap">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          style={{ width: 240 }}
          value={typeId}
          onChange={(v) => setTypeId(v)}
          options={doc.schema.types.map((t) => ({
            value: t.id,
            label: `${t.name} (${doc.objects.filter((o) => o.typeId === t.id).length})`,
          }))}
        />
        <Input.Search
          placeholder="Search…"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
      </Space>
      <Table<TwinObject>
        rowKey="id"
        dataSource={filteredRows}
        pagination={{ pageSize: 25 }}
        onRow={(record) => ({
          onClick: () => setSelected(record.id),
          style: { cursor: 'pointer' },
        })}
        columns={[
          ...summaryFields.map((f) => ({
            title: f.name,
            dataIndex: ['values', f.id],
            key: f.id,
            className: f.type === 'number' ? 'tabular mono' : 'mono',
            render: (v: unknown) => {
              if (f.id === 'classification' && v) {
                return <Tag color="blue">{String(v)}</Tag>;
              }
              if (Array.isArray(v)) return v.join(', ');
              if (typeof v === 'boolean') return v ? '✓' : '–';
              return v == null ? '–' : String(v);
            },
          })),
          {
            title: 'Capabilities',
            key: 'capabilities',
            render: (_, record) => (
              <Space size={[4, 4]} wrap>
                {record.capabilities.slice(0, 3).map((c) => (
                  <Tag key={c} bordered={false}>
                    {c}
                  </Tag>
                ))}
                {record.capabilities.length > 3 ? (
                  <Tag bordered={false}>+{record.capabilities.length - 3}</Tag>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
