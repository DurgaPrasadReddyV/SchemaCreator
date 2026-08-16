'use client';

/**
 * TwinNode — generic data-driven node component.
 *
 * Shows: type icon, type tag, label, classification left-stripe, capability badges.
 * Honours reachability state from flowStore.
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import * as Icons from '@ant-design/icons';
import { classificationVar } from '@/theme/theme';
import type { Classification, TwinObject } from '@/domain/types';
import { useTwinStore } from '@/state/twinStore';
import { useFlowStore } from '@/state/flowStore';
import { useReachabilityStore } from '@/state/reachabilityStore';
import { CapabilityBadges } from '@/views/chips';

export interface TwinNodeData {
  objectRefId: string;
  [k: string]: unknown;
}

function getIcon(name?: string) {
  if (!name) return null;
  // AntD dynamic icon lookup
  const map = Icons as unknown as Record<string, React.FC<{ style?: React.CSSProperties }>>;
  return map[name] ?? null;
}

function classificationOf(o: TwinObject | undefined): Classification | undefined {
  if (!o) return undefined;
  return o.values.classification as Classification | undefined;
}

function TwinNodeImpl({ data, id }: NodeProps) {
  const objectRefId = (data as TwinNodeData).objectRefId as string;
  const doc = useTwinStore((s) => s.doc);
  const reachable = useFlowStore((s) => s.reachableIds.has(id));
  const rootId = useReachabilityStore((s) => s.rootId);
  const isRoot = rootId === id;

  // Per-hop reveal: a node lights up only when its BFS hop has been reached
  // by the animation scrubber. Nodes outside the reachable set stay dimmed.
  const perHop = useReachabilityStore((s) => s.result?.perHopReachable);
  const currentHop = useReachabilityStore((s) => s.currentHop);

  const obj = doc?.objects.find((o) => o.id === objectRefId);
  const type = doc?.schema.types.find((t) => t.id === obj?.typeId);
  const Icon = type ? getIcon(type.icon) : null;
  const label = (obj?.values.name as string) ?? objectRefId;
  const cls = classificationOf(obj);

  const dimmed = useFlowStore(
    (s) => s.reachableIds.size > 0 && !s.reachableIds.has(id),
  );

  // The hop at which this node was reached (undefined if no result / not reached).
  let nodeHop: number | undefined;
  if (perHop) {
    for (const [h, set] of perHop) {
      if (set.has(id)) {
        nodeHop = h;
        break;
      }
    }
  }
  // Root is always at hop 0; with no result, reachable is false so this stays false.
  const revealed = reachable && (nodeHop == null || nodeHop <= currentHop);

  const className = [
    'twin-node',
    isRoot ? 'twin-node--root' : '',
    revealed ? 'twin-node--reachable' : '',
    dimmed ? 'twin-node--unreachable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={
        {
          ['--twin-stripe' as string]: classificationVar(cls),
        } as React.CSSProperties
      }
    >
      <div className="twin-node__stripe" />
      <Handle type="target" position={Position.Top} />
      <div className="twin-node__type">
        {Icon ? <Icon /> : null} {type?.name ?? '?'}
      </div>
      <div className="twin-node__label">{label}</div>
      <div className="twin-node__badges">
        {obj ? <CapabilityBadges ids={obj.capabilities} schema={doc?.schema} max={4} /> : null}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const TwinNode = memo(TwinNodeImpl);
