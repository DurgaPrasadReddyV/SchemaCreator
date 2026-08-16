'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import { Button, Empty, Segmented, Select, Space, Table, Tag, Slider, message } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import { useReachabilityStore } from '@/state/reachabilityStore';
import { computeReachability, graphRevisionOf, isValidRoot } from '@/domain/reachability';
import { buildGraphFromTwin } from '@/graph/graphAdapter';
import { TwinNode } from '@/graph/TwinNode';
import { TwinEdge } from '@/graph/TwinEdge';
import type { QueryMode, TwinObject } from '@/domain/types';

const nodeTypes = { twinNode: TwinNode };
const edgeTypes = { twinEdge: TwinEdge };

export function ReachabilityView() {
  const doc = useTwinStore((s) => s.doc);
  const graphRevision = useTwinStore((s) => s.graphRevision);

  const rootId = useReachabilityStore((s) => s.rootId);
  const mode = useReachabilityStore((s) => s.mode);
  const result = useReachabilityStore((s) => s.result);
  const currentHop = useReachabilityStore((s) => s.currentHop);
  const isPlaying = useReachabilityStore((s) => s.isPlaying);
  const setRoot = useReachabilityStore((s) => s.setRoot);
  const setMode = useReachabilityStore((s) => s.setMode);
  const setResult = useReachabilityStore((s) => s.setResult);
  const setCurrentHop = useReachabilityStore((s) => s.setCurrentHop);
  const setPlaying = useReachabilityStore((s) => s.setPlaying);
  const reset = useReachabilityStore((s) => s.reset);

  const setReachable = useFlowStore((s) => s.setReachable);
  const setSelected = useFlowStore((s) => s.setSelectedObject);
  const selectedId = useFlowStore((s) => s.selectedObjectId);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => (doc ? buildGraphFromTwin(doc, 'manual') : { nodes: [], edges: [] }),
    [doc?.id, doc?.graphLayout],
  );

  const [nodes, setNodes] = useNodesState<Node>(initialNodes);
  const [edges, setEdges] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    if (doc) {
      const { nodes: n, edges: e } = buildGraphFromTwin(doc, 'manual');
      setNodes(n);
      setEdges(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.graphLayout]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const validRoots = useMemo<TwinObject[]>(() => {
    if (!doc) return [];
    return doc.objects.filter((o) => isValidRoot(o, mode));
  }, [doc, mode]);

  // Run the query
  const runQuery = useCallback(() => {
    if (!doc || !rootId) return;
    const r = computeReachability(
      { schema: doc.schema, objects: doc.objects, relations: doc.relations },
      rootId,
      mode,
    );
    setResult(r);
    setReachable(r.reachableIds);
    setCurrentHop(0);
  }, [doc, rootId, mode, setResult, setReachable, setCurrentHop]);

  // Auto-run on first mount if a root is already chosen
  useEffect(() => {
    if (doc && rootId) {
      const r = computeReachability(
        { schema: doc.schema, objects: doc.objects, relations: doc.relations },
        rootId,
        mode,
      );
      setResult(r);
      setReachable(r.reachableIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, graphRevision, rootId, mode]);

  // Animation ticker
  useEffect(() => {
    if (!isPlaying || !result) return;
    const maxHop = Math.max(0, ...Array.from(result.perHopReachable.keys()));
    const id = setInterval(() => {
      const next = useReachabilityStore.getState().currentHop + 1;
      if (next > maxHop) {
        setPlaying(false);
        setCurrentHop(maxHop);
        return;
      }
      setCurrentHop(next);
    }, 900);
    return () => clearInterval(id);
  }, [isPlaying, result, setCurrentHop, setPlaying]);

  // Keyboard: ←/→/space
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!result) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const maxHop = Math.max(0, ...Array.from(result.perHopReachable.keys()));
      if (e.key === 'ArrowRight') {
        setCurrentHop(Math.min(maxHop, currentHop + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentHop(Math.max(0, currentHop - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!isPlaying);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, currentHop, isPlaying, setCurrentHop, setPlaying]);

  const maxHop = result ? Math.max(0, ...Array.from(result.perHopReachable.keys())) : 0;

  const onScrub = (h: number) => {
    setCurrentHop(h);
  };

  if (!doc) {
    return (
      <div className="twin-page">
        <Empty description="No twin loaded" />
      </div>
    );
  }

  const chain = result?.hopChains.find((c) => c.targetId === selectedId) ?? null;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }} className="twin-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, n) => setSelected(n.id)}
          onPaneClick={() => setSelected(null)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            background: 'var(--twin-surface)',
            border: '1px solid var(--twin-border)',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Button
            icon={<StepBackwardOutlined />}
            onClick={() => setCurrentHop(Math.max(0, currentHop - 1))}
            disabled={currentHop <= 0}
          />
          {isPlaying ? (
            <Button
              icon={<PauseOutlined />}
              onClick={() => setPlaying(false)}
            />
          ) : (
            <Button
              icon={<CaretRightOutlined />}
              onClick={() => setPlaying(true)}
              disabled={currentHop >= maxHop}
            />
          )}
          <Button
            icon={<StepForwardOutlined />}
            onClick={() => setCurrentHop(Math.min(maxHop, currentHop + 1))}
            disabled={currentHop >= maxHop}
          />
          <Button icon={<ReloadOutlined />} onClick={reset}>
            Reset
          </Button>
          <Slider
            style={{ flex: 1, marginInline: 12 }}
            min={0}
            max={maxHop}
            value={currentHop}
            onChange={onScrub}
            tooltip={{ formatter: (v) => `Hop ${v}` }}
          />
          <span className="mono" style={{ color: 'var(--twin-text-muted)' }}>
            hop {currentHop}/{maxHop}
          </span>
        </div>
      </div>
      <div
        style={{
          width: 380,
          borderLeft: '1px solid var(--twin-border)',
          background: 'var(--twin-surface)',
          overflow: 'auto',
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Query</div>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v as QueryMode);
              setRoot(null);
            }}
            options={[
              { label: 'Who can reach this', value: 'data-to-user' },
              { label: 'What this can reach', value: 'user-to-data' },
            ]}
            block
          />
          <Select
            showSearch
            placeholder={
              mode === 'data-to-user'
                ? 'Pick a sensitive field (Column)'
                : 'Pick a user (User)'
            }
            style={{ width: '100%' }}
            value={rootId ?? undefined}
            onChange={(v) => setRoot(v)}
            options={validRoots.map((o) => {
              const name = (o.values.name as string) ?? o.id;
              const cls = (o.values.classification as string) ?? '';
              const cats = (o.dataCategory ?? []).join(', ');
              return {
                value: o.id,
                label: `${name}${cls ? ` [${cls}]` : ''}${cats ? ` (${cats})` : ''}`,
              };
            })}
            optionFilterProp="label"
          />
          <Button type="primary" block onClick={runQuery} disabled={!rootId}>
            Run
          </Button>
        </Space>

        <div style={{ fontWeight: 600, margin: '16px 0 8px' }}>Hop table</div>
        {result ? (
          <Table
            size="small"
            rowKey="targetId"
            pagination={false}
            dataSource={result.hopChains}
            onRow={(record) => ({
              onClick: () => setSelected(record.targetId),
              style: { cursor: 'pointer' },
            })}
            columns={[
              {
                title: 'Hop',
                dataIndex: 'targetId',
                key: 'hop',
                width: 50,
                render: (id: string) => {
                  let h = 0;
                  for (const [k, v] of result.perHopReachable) if (v.has(id)) h = k;
                  return (
                    <Tag color={h === currentHop ? 'green' : 'default'}>h{h}</Tag>
                  );
                },
              },
              {
                title: 'Object',
                dataIndex: 'targetId',
                key: 'obj',
                render: (id: string) => {
                  const o = doc.objects.find((x) => x.id === id);
                  return o ? (o.values.name as string) ?? id : id;
                },
              },
              {
                title: 'Reached via',
                dataIndex: 'targetId',
                key: 'via',
                render: (id: string) => {
                  const chain = result.hopChains.find((c) => c.targetId === id);
                  const last = chain?.steps[chain.steps.length - 1];
                  if (!last) return '–';
                  const rt = doc.schema.relationTypes.find((r) => r.id === last.relId);
                  const label = rt
                    ? last.dir === 'fwd'
                      ? rt.forwardLabel
                      : rt.reverseLabel
                    : last.relId;
                  return (
                    <span className="mono" style={{ fontSize: 11 }}>
                      {label}
                      {last.flood ? ` (flood via ${doc.objects.find((o) => o.id === last.flood)?.values.name ?? last.flood})` : ''}
                    </span>
                  );
                },
              },
            ]}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Run a query" />
        )}

        {chain ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Access chain</div>
            <ol style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
              {chain.steps.map((s, i) => {
                const fromObj = doc.objects.find((o) => o.id === s.from);
                const toObj = doc.objects.find((o) => o.id === s.to);
                const rt = doc.schema.relationTypes.find((r) => r.id === s.relId);
                return (
                  <li key={i} className="mono">
                    {(fromObj?.values.name as string) ?? s.from}
                    {' '}
                    <span style={{ color: 'var(--twin-text-muted)' }}>
                      {rt
                        ? s.dir === 'fwd'
                          ? `─${rt.forwardLabel}→`
                          : `←${rt.reverseLabel}─`
                        : ''}
                    </span>
                    {' '}
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
