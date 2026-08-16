'use client';

/**
 * Shared presentational chips: data-category icon+label chips and capability
 * abbreviation badges. One source of truth so TwinNode, the hop table, the
 * tables view, the inspector, and the schema builder all render the same way.
 *
 * Capability badges show `CapabilityDef.abbreviation ?? id` (stories 48/75).
 * Data-category chips show `DataCategoryDef.icon` + label (story 74).
 */

import { Tag, Tooltip } from 'antd';
import * as Icons from '@ant-design/icons';
import type { TwinSchema } from '@/domain/types';

const ICON_MAP = Icons as unknown as Record<string, React.FC<{ style?: React.CSSProperties }>>;

function getIcon(name?: string): React.FC<{ style?: React.CSSProperties }> | null {
  if (!name) return null;
  return ICON_MAP[name] ?? null;
}

/** Human label for a capability id: abbreviation if defined, else the id. */
export function capabilityLabel(schema: TwinSchema | undefined, capId: string): string {
  const c = schema?.capabilities.find((x) => x.id === capId);
  return c?.abbreviation ?? capId;
}

export function CapabilityBadges({
  ids,
  schema,
  max = 4,
  className = 'twin-badge',
  asTag = false,
}: {
  ids: string[];
  schema: TwinSchema | undefined;
  max?: number;
  className?: string;
  asTag?: boolean;
}) {
  const shown = ids.slice(0, max);
  const overflow = ids.length - shown.length;
  if (asTag) {
    return (
      <>
        {shown.map((c) => (
          <Tooltip key={c} title={schema?.capabilities.find((x) => x.id === c)?.name ?? c}>
            <Tag bordered={false} style={{ marginInlineEnd: 4 }}>
              {capabilityLabel(schema, c)}
            </Tag>
          </Tooltip>
        ))}
        {overflow > 0 ? <Tag bordered={false}>+{overflow}</Tag> : null}
      </>
    );
  }
  return (
    <>
      {shown.map((c) => (
        <Tooltip key={c} title={schema?.capabilities.find((x) => x.id === c)?.name ?? c}>
          <span key={c} className={className}>
            {capabilityLabel(schema, c)}
          </span>
        </Tooltip>
      ))}
      {overflow > 0 ? <span className={className}>+{overflow}</span> : null}
    </>
  );
}

export function DataCategoryChips({
  ids,
  schema,
  size = 'default',
}: {
  ids: string[] | undefined;
  schema: TwinSchema | undefined;
  size?: 'default' | 'small';
}) {
  if (!ids || ids.length === 0) return null;
  return (
    <>
      {ids.map((id) => {
        const cat = schema?.dataCategories.find((c) => c.id === id);
        const Icon = getIcon(cat?.icon);
        return (
          <Tag key={id} bordered={false} style={{ marginInlineEnd: 4, fontSize: size === 'small' ? 11 : undefined }}>
            {Icon ? <Icon style={{ marginInlineEnd: 4 }} /> : null}
            {cat?.name ?? id}
          </Tag>
        );
      })}
    </>
  );
}