/**
 * First-run bootstrap. Browser-only.
 *
 * - If no twins exist, create the Acme demo twin.
 * - Load the last-active twin id from kv (if any) and load that doc.
 * - Load saved theme from kv.
 * - Return everything to the shell for store hydration.
 */

import { getDb, getKv, putTwin, setKv } from '@/state/db';
import { buildAcmeDemoTwin } from '@/domain/demoTwin';
import type { TwinDoc } from '@/domain/types';

export interface BootstrapResult {
  doc: TwinDoc | null;
  activeTwinId: string | null;
  theme: 'light' | 'dark' | null;
}

export async function bootstrapFirstRun(): Promise<BootstrapResult> {
  const db = getDb();
  const [theme, savedActiveId, allTwins] = await Promise.all([
    getKv<'light' | 'dark'>('theme'),
    getKv<string>('activeTwinId'),
    db.twins.toArray(),
  ]);

  if (allTwins.length === 0) {
    const demo = buildAcmeDemoTwin();
    await putTwin(demo);
    await setKv('activeTwinId', demo.id);
    return { doc: demo, activeTwinId: demo.id, theme: theme ?? 'dark' };
  }

  const activeId = savedActiveId && allTwins.find((t) => t.id === savedActiveId)
    ? savedActiveId
    : allTwins[0].id;

  const doc = (await db.twins.get(activeId)) ?? allTwins[0];
  await setKv('activeTwinId', doc.id);
  return { doc, activeTwinId: doc.id, theme: theme ?? 'dark' };
}
