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

/**
 * ELK layered layout for dense graphs (story 51). Dynamically imports the
 * bundled (worker-free) ELK so it's never evaluated at build/prerender time
 * and only loaded when a graph is large enough to need it. Mutates node
 * positions in place, matching `applyDagreLayout`.
 */
export async function applyElkLayout(nodes: Node[], edges: Edge[]): Promise<void> {
  const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
  const elk = new ELK();
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '70',
      'elk.spacing.nodeNode': '50',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: nodes.map((n) => ({ id: n.id, width: 200, height: 80 })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
  const result = await elk.layout(graph);
  const posById = new Map(
    (result.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]),
  );
  for (const n of nodes) {
    const p = posById.get(n.id);
    if (p) n.position = p;
  }
}
