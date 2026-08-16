/**
 * Adapter: TwinDoc → React Flow nodes/edges.
 */

import type { Edge, Node } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { TwinDoc } from '@/domain/types';

export function buildGraphFromTwin(doc: TwinDoc, layout: 'dagre' | 'manual' = 'dagre'): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = doc.objects.map((o) => {
    const persisted = doc.graphLayout?.nodes as Array<{ id: string; position?: { x: number; y: number } }> | undefined;
    const persistedPos = persisted?.find((n) => n.id === o.id)?.position;
    return {
      id: o.id,
      type: 'twinNode',
      position: persistedPos ?? { x: 0, y: 0 },
      data: { objectRefId: o.id, label: (o.values.name as string) ?? o.id },
    };
  });

  const edges: Edge[] = doc.relations.map((r) => ({
    id: r.id,
    source: r.fromId,
    target: r.toId,
    type: 'twinEdge',
    data: { relationTypeId: r.relationTypeId, relationId: r.id },
  }));

  if (layout === 'dagre' && !doc.graphLayout) {
    applyDagreLayout(nodes, edges);
  }

  return { nodes, edges };
}

export function applyDagreLayout(nodes: Node[], edges: Edge[]): void {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });
  for (const n of nodes) g.setNode(n.id, { width: 200, height: 80 });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  for (const n of nodes) {
    const dn = g.node(n.id);
    if (dn) n.position = { x: dn.x - 100, y: dn.y - 40 };
  }
}
