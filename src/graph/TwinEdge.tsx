'use client';

/**
 * TwinEdge — generic data-driven edge component.
 * Solid access / dashed contains. Reachability highlight via opacity + stroke.
 */

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import { useReachabilityStore } from '@/state/reachabilityStore';
import type { TwinRelation } from '@/domain/types';

export interface TwinEdgeData {
  relationTypeId: string;
  [k: string]: unknown;
}

function TwinEdgeImpl(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const doc = useTwinStore((s) => s.doc);
  const reachable = useFlowStore((s) => s.reachableIds);
  const hopBuckets = useReachabilityStore((s) => s.result?.perHopReachable);

  const relationTypeId = (data as TwinEdgeData | undefined)?.relationTypeId as string;
  const rel = doc?.relations.find((r: TwinRelation) => r.relationTypeId === relationTypeId) as
    | { relationTypeId: string }
    | undefined;
  const rt = doc?.schema.relationTypes.find((r) => r.id === relationTypeId);

  const isContains = relationTypeId === 'rel.contains';
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const isReachableEdge =
    reachable.size > 0 && reachable.has(props.source) && reachable.has(props.target);

  // Determine hop order of the target node (best-effort)
  let hopOrder: number | undefined;
  if (hopBuckets) {
    for (const [h, set] of hopBuckets) {
      if (set.has(props.target)) {
        hopOrder = h;
        break;
      }
    }
  }

  const className = [
    isContains ? 'dashed' : '',
    isReachableEdge ? 'twin-edge--highlight' : '',
    reachable.size > 0 && !isReachableEdge ? 'twin-edge--dim' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <BaseEdge id={id} path={edgePath} className={className} />
      {!isContains ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: 'var(--twin-surface)',
              padding: '0 6px',
              fontSize: 10,
              pointerEvents: 'none',
              border: '1px solid var(--twin-border)',
              borderRadius: 4,
              color: 'var(--twin-text-muted)',
            }}
            className="mono"
          >
            {rt?.forwardLabel ?? relationTypeId} {hopOrder != null ? `·h${hopOrder}` : ''}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const TwinEdge = memo(TwinEdgeImpl);
