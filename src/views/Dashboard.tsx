'use client';

import { useMemo } from 'react';
import { Card, Col, Empty, Row, Space, Tag, Tooltip, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useTwinStore } from '@/state/twinStore';
import { useUiStore } from '@/state/uiStore';
import { computeReachability, graphRevisionOf } from '@/domain/reachability';
import { classificationVar } from '@/theme/theme';
import type { Classification } from '@/domain/types';
import { useEffect, useState } from 'react';

const { Title, Paragraph } = Typography;

interface ExposurePath {
  rootId: string;
  rootName: string;
  classification: string;
  reachableUsers: number;
  deepest: number;
}

export function Dashboard() {
  const router = useRouter();
  const doc = useTwinStore((s) => s.doc);
  const isBlank = doc && doc.objects.length === 0;
  const isDemo = doc && (doc.meta as { isDemo?: boolean })?.isDemo;
  const [coachmark, setCoachmark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem('twin-coachmark-seen');
    if (!seen && isDemo) setCoachmark(true);
  }, [isDemo]);

  const dismissCoachmark = () => {
    setCoachmark(false);
    if (typeof window !== 'undefined') window.localStorage.setItem('twin-coachmark-seen', '1');
  };

  // Top exposure paths
  const topPaths = useMemo<ExposurePath[]>(() => {
    if (!doc) return [];
    const cols = doc.objects.filter(
      (o) => o.typeId === 'type.column' && (o.values.classification === 'restricted' || (o.dataCategory?.length ?? 0) > 0),
    );
    return cols
      .map((c) => {
        const r = computeReachability(
          { schema: doc.schema, objects: doc.objects, relations: doc.relations },
          c.id,
          'data-to-user',
        );
        const users = doc.objects.filter(
          (o) => o.typeId === 'type.user' && r.reachableIds.has(o.id),
        );
        let deepest = 0;
        for (const h of r.perHopReachable.keys()) deepest = Math.max(deepest, h);
        return {
          rootId: c.id,
          rootName: (c.values.name as string) ?? c.id,
          classification: (c.values.classification as string) ?? 'unclassified',
          reachableUsers: users.length,
          deepest,
        };
      })
      .sort((a, b) => b.reachableUsers - a.reachableUsers)
      .slice(0, 5);
  }, [doc]);

  if (!doc) {
    return (
      <div className="twin-page">
        <Empty description="No twin loaded" />
      </div>
    );
  }

  const totalObjects = doc.objects.length;
  const totalRelations = doc.relations.length;
  const totalUsers = doc.objects.filter((o) => o.typeId === 'type.user').length;

  // Per-classification exposure: how many sensitive columns sit in each tier
  // (story 69). A column counts if it has a classification or a data-category tag.
  const sensitiveColumns = doc.objects.filter(
    (o) => o.typeId === 'type.column' && (o.values.classification || (o.dataCategory?.length ?? 0) > 0),
  );
  const byClassification = useMemo(() => {
    const tiers: { tier: Classification; count: number }[] = [
      { tier: 'public', count: 0 },
      { tier: 'internal', count: 0 },
      { tier: 'confidential', count: 0 },
      { tier: 'restricted', count: 0 },
    ];
    let unclassified = 0;
    for (const c of sensitiveColumns) {
      const cls = c.values.classification as Classification | undefined;
      const t = tiers.find((x) => x.tier === cls);
      if (t) t.count++;
      else unclassified++;
    }
    return { tiers, unclassified, total: sensitiveColumns.length };
  }, [sensitiveColumns]);

  return (
    <div className="twin-page">
      <Title level={3} style={{ margin: 0 }}>
        Exposure dashboard
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 8 }}>
        {doc.name}
      </Paragraph>

      {isBlank ? (
        <Card>
          <Title level={4}>Starter pack loaded</Title>
          <Paragraph>
            Add your first object to begin modeling. The IT-infra starter pack gives you 11 Types, 9 relation types,
            14 capability flags, and 14 data-categories.
          </Paragraph>
          <Space>
            <button
              type="button"
              onClick={() => router.push('/twin')}
              style={{
                background: 'var(--twin-brand)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Go to Twin →
            </button>
          </Space>
        </Card>
      ) : (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <div className="twin-stat">
                <span className="twin-stat__label">Objects</span>
                <span className="twin-stat__value tabular">{totalObjects}</span>
              </div>
            </Col>
            <Col span={8}>
              <div className="twin-stat">
                <span className="twin-stat__label">Relations</span>
                <span className="twin-stat__value tabular">{totalRelations}</span>
              </div>
            </Col>
            <Col span={8}>
              <div className="twin-stat">
                <span className="twin-stat__label">Users</span>
                <span className="twin-stat__value tabular">{totalUsers}</span>
              </div>
            </Col>
          </Row>

          <Card title="Exposure by classification" size="small" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Proportional bar: each tier's width is its share of sensitive columns. */}
              <div style={{ flex: 1, minWidth: 240, height: 22, display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--twin-border)' }}>
                {byClassification.total === 0 ? (
                  <div style={{ flex: 1, background: 'var(--twin-surface)' }} />
                ) : (
                  byClassification.tiers
                    .filter((t) => t.count > 0)
                    .map((t) => (
                      <Tooltip key={t.tier} title={`${t.tier}: ${t.count}`}>
                        <div
                          style={{
                            width: `${(t.count / byClassification.total) * 100}%`,
                            background: classificationVar(t.tier),
                          }}
                        />
                      </Tooltip>
                    ))
                )}
              </div>
              <Space wrap>
                {byClassification.tiers.map((t) => (
                  <Tag key={t.tier} style={{ marginInlineEnd: 0 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: classificationVar(t.tier),
                        marginInlineEnd: 6,
                      }}
                    />
                    <span className="tabular">{t.count}</span> {t.tier}
                  </Tag>
                ))}
                {byClassification.unclassified > 0 ? (
                  <Tag style={{ marginInlineEnd: 0 }}>
                    <span className="tabular">{byClassification.unclassified}</span> unclassified
                  </Tag>
                ) : null}
              </Space>
            </div>
            <div style={{ color: 'var(--twin-text-muted)', fontSize: 12, marginTop: 8 }}>
              {byClassification.total} sensitive column{byClassification.total === 1 ? '' : 's'} (classified or data-category tagged).
            </div>
          </Card>

          <Card title="Top exposure paths" size="small">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--twin-text-muted)', fontSize: 12 }}>
                  <th style={{ padding: '8px 4px' }}>Sensitive field</th>
                  <th style={{ padding: '8px 4px' }}>Classification</th>
                  <th style={{ padding: '8px 4px' }}>Reachable users</th>
                  <th style={{ padding: '8px 4px' }}>Max hop</th>
                </tr>
              </thead>
              <tbody>
                {topPaths.map((p) => (
                  <tr
                    key={p.rootId}
                    style={{ borderTop: '1px solid var(--twin-border)', cursor: 'pointer' }}
                    onClick={() => {
                      useUiStore.setState({ activeView: '/reachability' });
                      import('@/state/reachabilityStore').then(({ useReachabilityStore }) => {
                        useReachabilityStore.getState().setRoot(p.rootId);
                        useReachabilityStore.getState().setMode('data-to-user');
                        router.push('/reachability');
                      });
                    }}
                  >
                    <td style={{ padding: '8px 4px' }} className="mono">
                      {p.rootName}
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <Tag color={statusColor(p.classification)}>{p.classification}</Tag>
                    </td>
                    <td style={{ padding: '8px 4px' }} className="tabular">
                      {p.reachableUsers}
                    </td>
                    <td style={{ padding: '8px 4px' }} className="tabular">
                      {p.deepest}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Onboarding" size="small">
            <Paragraph>
              1. Pick a sensitive field above, or open the <b>Reachability</b> view. <br />
              2. The root picker only offers non-Public or tagged fields. <br />
              3. Run → see hop-by-hop who can reach the data.
            </Paragraph>
            <Space>
              <button
                type="button"
                onClick={() => router.push('/twin')}
                style={{
                  background: 'transparent',
                  color: 'var(--twin-text)',
                  border: '1px solid var(--twin-border)',
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                View twin
              </button>
              <button
                type="button"
                onClick={() => router.push('/reachability')}
                style={{
                  background: 'var(--twin-brand)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Run reachability
              </button>
            </Space>
          </Card>
        </>
      )}

      {coachmark ? (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            maxWidth: 360,
            background: 'var(--twin-surface)',
            border: '1px solid var(--twin-brand)',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 1000,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>👋 Welcome</div>
          <p style={{ margin: 0, fontSize: 13 }}>
            Pick a sensitive field on the dashboard → click <b>Run reachability</b> to see who can reach it.
          </p>
          <button
            type="button"
            onClick={dismissCoachmark}
            style={{
              marginTop: 12,
              background: 'var(--twin-brand)',
              color: 'white',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Map a classification tier to a status-palette CSS variable (story 77).
 *  Status vars are reserved for state/severity, which is exactly how the
 *  exposure table uses classification here. */
function statusColor(cls: string): string {
  switch (cls) {
    case 'restricted':
      return 'var(--twin-status-critical)';
    case 'confidential':
      return 'var(--twin-status-serious)';
    case 'internal':
      return 'var(--twin-status-warning)';
    case 'public':
      return 'var(--twin-status-good)';
    default:
      return 'var(--twin-text-muted)';
  }
}
