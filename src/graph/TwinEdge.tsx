'use client';

/**
 * TwinEdge — generic data-driven edge component.
 * Solid access / dashed contains. Reachability highlight via opacity + stroke.
 *
 * Reachability visualization:
 * - Per-hop reveal: an edge lights up only when its target node's BFS hop has
 *   been reached by the animation scrubber (`currentHop`).
 * - Flood edges (a contains-subtree reached via `accesses`) stroke in the
 *   amber flood accent, distinct from the aqua reachability highlight.
 * - `<animateMotion>` packets flow along revealed reachable access edges,
 *   gated per-edge (no stroke-dasharray marching ants at scale).
 * - `contains` edge labels are hidden until hover.
 */

import { memo, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import { useReachabilityStore } from '@/state/reachabilityStore';

export interface TwinEdgeData {
  relationTypeId: string;
  relationId: string; // the TwinRelation instance id (for flood lookup + selection)
  [k: string]: unknown;
}

/** Hop at which `id` was reached, or undefined if not in the result. */
function hopOf(perHop: Map<number, Set<string>> | undefined, id: string): number | undefined {
  if (!perHop) return undefined;
  for (const [h, set] of perHop) {
    if (set.has(id)) return h;
  }
  return undefined;
}

function TwinEdgeImpl(props: EdgeProps) {
  const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const doc = useTwinStore((s) => s.doc);
  const reachable = useFlowStore((s) => s.reachableIds);
  const perHop = useReachabilityStore((s) => s.result?.perHopReachable);
  const hopChains = useReachabilityStore((s) => s.result?.hopChains);
  const currentHop = useReachabilityStore((s) => s.currentHop);
  const [hovered, setHovered] = useState(false);

  const relationTypeId = (data as TwinEdgeData | undefined)?.relationTypeId as string;
  const relationId = (data as TwinEdgeData | undefined)?.relationId as string | undefined;
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
    reachable.size > 0 && reachable.has(source) && reachable.has(target);

  const targetHop = hopOf(perHop, target);
  const revealed = isReachableEdge && (targetHop == null || targetHop <= currentHop);

  // Is this edge instance a flood step? (target reached via an accesses flood.)
  let isFlood = false;
  if (hopChains && relationId) {
    for (const chain of hopChains) {
      for (const step of chain.steps) {
        if (step.relInst === relationId && step.flood != null) {
          isFlood = true;
          break;
        }
      }
      if (isFlood) break;
    }
  }

  const showPacket = revealed && !isContains;

  const className = [
    isContains ? 'dashed' : '',
    revealed ? (isFlood ? 'twin-edge--flood' : 'twin-edge--highlight') : '',
    reachable.size > 0 && !isReachableEdge ? 'twin-edge--dim' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // `contains` labels are hidden until hover; access labels always show.
  const showLabel = !isContains || hovered;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wide path for hover hit area + selection. */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={16}
        fill="none"
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge id={id} path={edgePath} className={className} />
      {showPacket ? (
        <circle r={3} className={isFlood ? 'twin-edge__packet twin-edge__packet--flood' : 'twin-edge__packet'}>
          <animateMotion dur="1.4s" repeatCount="indefinite" path={edgePath} rotate="auto" />
        </circle>
      ) : null}
      {showLabel ? (
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
              color: isFlood ? 'var(--twin-flood)' : 'var(--twin-text-muted)',
            }}
            className="mono"
          >
            {rt?.forwardLabel ?? relationTypeId}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}

export const TwinEdge = memo(TwinEdgeImpl);