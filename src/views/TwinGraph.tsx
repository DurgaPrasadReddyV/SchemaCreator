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
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type OnConnect,
  Panel,
} from '@xyflow/react';
import { Button, Form, Input, Modal, Select, Empty, Space, message } from 'antd';
import { PlusOutlined, PartitionOutlined } from '@ant-design/icons';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import { TwinNode } from '@/graph/TwinNode';
import { TwinEdge } from '@/graph/TwinEdge';
import { applyDagreLayout, buildGraphFromTwin } from '@/graph/graphAdapter';
import { Inspector } from '@/views/Inspector';
import { useAutosave } from '@/shell/useAutosave';

const nodeTypes = { twinNode: TwinNode };
const edgeTypes = { twinEdge: TwinEdge };

export function TwinGraph() {
  useAutosave();
  const doc = useTwinStore((s) => s.doc);
  const setDoc = useTwinStore((s) => s.setDoc);
  const patchDoc = useTwinStore((s) => s.patchDoc);
  const selectedId = useFlowStore((s) => s.selectedObjectId);
  const setSelected = useFlowStore((s) => s.setSelectedObject);
  const setSelectedRelation = useFlowStore((s) => s.setSelectedRelation);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => (doc ? buildGraphFromTwin(doc) : { nodes: [], edges: [] }),
    [doc?.id],
  );

  const [nodes, setNodes] = useNodesState<Node>(initialNodes);
  const [edges, setEdges] = useEdgesState<Edge>(initialEdges);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  // When the doc changes (twin switch), re-seed nodes/edges.
  useEffect(() => {
    if (doc) {
      const { nodes: n, edges: e } = buildGraphFromTwin(doc);
      setNodes(n);
      setEdges(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.updatedAt]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!doc) return;
      if (!connection.source || !connection.target) return;
      const fromObj = doc.objects.find((o) => o.id === connection.source);
      const toObj = doc.objects.find((o) => o.id === connection.target);
      if (!fromObj || !toObj) return;
      // Pick a relation type that allows this source→target
      const candidate = doc.schema.relationTypes.find(
        (rt) =>
          rt.fromTypeIds.includes(fromObj.typeId) && rt.toTypeIds.includes(toObj.typeId),
      );
      if (!candidate) {
        message.warning('No relation type allows this connection');
        return;
      }
      const newRel = {
        id: `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        relationTypeId: candidate.id,
        fromId: connection.source,
        toId: connection.target,
      };
      patchDoc({ relations: [...doc.relations, newRel] });
      setEdges((eds) =>
        addEdge(
          {
            id: newRel.id,
            source: newRel.fromId,
            target: newRel.toId,
            type: 'twinEdge',
            data: { relationTypeId: newRel.relationTypeId, relationId: newRel.id },
          },
          eds,
        ),
      );
    },
    [doc, patchDoc, setEdges],
  );

  // Persist positions back to twinStore whenever they change (debounced via autosave).
  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      if (!doc) return;
      const persisted = (doc.graphLayout?.nodes as Array<{ id: string; position?: { x: number; y: number } }>) ?? [];
      const next = [
        ...persisted.filter((n) => n.id !== node.id),
        { id: node.id, position: node.position },
      ];
      patchDoc({
        graphLayout: {
          nodes: next as unknown[],
          edges: doc.graphLayout?.edges ?? [],
          viewport: doc.graphLayout?.viewport,
        },
      });
    },
    [doc, patchDoc],
  );

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setSelectedRelation(null);
      setSelected(node.id);
    },
    [setSelected, setSelectedRelation],
  );

  const handleEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      const relationId = (edge.data as { relationId?: string } | undefined)?.relationId;
      if (relationId) {
        setSelected(null);
        setSelectedRelation(relationId);
      }
    },
    [setSelected, setSelectedRelation],
  );

  const handlePaneClick = useCallback(() => {
    setSelected(null);
    setSelectedRelation(null);
  }, [setSelected, setSelectedRelation]);

  const autoLayout = useCallback(() => {
    setNodes((nds) => {
      const next = [...nds];
      applyDagreLayout(next, edges);
      return next;
    });
  }, [edges, setNodes]);

  const addObject = (values: { typeId: string; name: string }) => {
    if (!doc) return;
    const id = `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newObj = {
      id,
      typeId: values.typeId,
      values: { name: values.name },
      capabilities: [],
    };
    patchDoc({ objects: [...doc.objects, newObj] });
    setAddOpen(false);
    form.resetFields();
  };

  if (!doc) {
    return (
      <div className="twin-page">
        <Empty description="No twin loaded" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }} className="twin-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls />
          <MiniMap pannable zoomable />
          <Panel position="top-left">
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
              >
                Add object
              </Button>
              <Button icon={<PartitionOutlined />} onClick={autoLayout}>
                Auto-layout
              </Button>
            </Space>
          </Panel>
        </ReactFlow>
        <Modal
          open={addOpen}
          title="Add object"
          okText="Create"
          onCancel={() => setAddOpen(false)}
          onOk={() => form.submit()}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={addObject}>
            <Form.Item label="Type" name="typeId" rules={[{ required: true }]}>
              <Select
                options={doc.schema.types.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Choose a type"
              />
            </Form.Item>
            <Form.Item label="Name" name="name" rules={[{ required: true }]}>
              <Input placeholder="Object name" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
      <div
        style={{
          width: 360,
          borderLeft: '1px solid var(--twin-border)',
          background: 'var(--twin-surface)',
          overflow: 'auto',
        }}
      >
        <Inspector />
      </div>
    </div>
  );
}
