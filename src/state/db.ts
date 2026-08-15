/**
 * Dexie persistence layer.
 *
 * One TwinDoc per row, plus a `kv` table for app prefs (active twin, theme, last view).
 */

import Dexie, { type Table } from 'dexie';
import type { TwinDoc } from '@/domain/types';

export interface KvEntry {
  key: string;
  value: unknown;
}

class TwinDB extends Dexie {
  twins!: Table<TwinDoc, string>;
  kv!: Table<KvEntry, string>;

  constructor() {
    super('it-twin-designer');
    this.version(1).stores({
      twins: 'id, name, updatedAt',
      kv: 'key',
    });
  }
}

let _db: TwinDB | null = null;

/** Lazy singleton — only created in the browser. */
export function getDb(): TwinDB {
  if (typeof window === 'undefined') {
    throw new Error('Dexie is browser-only');
  }
  if (!_db) _db = new TwinDB();
  return _db;
}

export async function putTwin(doc: TwinDoc): Promise<void> {
  await getDb().twins.put({ ...doc, updatedAt: Date.now() });
}

export async function getTwin(id: string): Promise<TwinDoc | undefined> {
  return getDb().twins.get(id);
}

export async function listTwins(): Promise<TwinDoc[]> {
  return getDb().twins.orderBy('updatedAt').reverse().toArray();
}

export async function deleteTwin(id: string): Promise<void> {
  await getDb().twins.delete(id);
}

export async function setKv(key: string, value: unknown): Promise<void> {
  await getDb().kv.put({ key, value });
}

export async function getKv<T = unknown>(key: string): Promise<T | undefined> {
  const row = await getDb().kv.get(key);
  return row?.value as T | undefined;
}
