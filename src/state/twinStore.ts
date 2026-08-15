/**
 * twinStore — source of truth for the active twin.
 * Holds schema, objects, relations, graphLayout, dirty flag.
 */

import { create } from 'zustand';
import type { TwinDoc } from '@/domain/types';

export interface TwinState {
  doc: TwinDoc | null;
  dirty: boolean;
  graphRevision: string;
  setDoc: (doc: TwinDoc) => void;
  setDirty: (d: boolean) => void;
  patchDoc: (patch: Partial<TwinDoc>) => void;
  bumpRevision: () => void;
}

export const useTwinStore = create<TwinState>((set, get) => ({
  doc: null,
  dirty: false,
  graphRevision: '0',
  setDoc: (doc) => set({ doc, dirty: false, graphRevision: hashRevision(doc) }),
  setDirty: (d) => set({ dirty: d }),
  patchDoc: (patch) => {
    const cur = get().doc;
    if (!cur) return;
    const next = { ...cur, ...patch, updatedAt: Date.now() };
    set({ doc: next, dirty: true, graphRevision: hashRevision(next) });
  },
  bumpRevision: () => set({ graphRevision: String(Date.now()) }),
}));

function hashRevision(doc: TwinDoc): string {
  const o = doc.objects.map((x) => x.id).sort().join(',');
  const r = doc.relations
    .map((x) => `${x.id}:${x.fromId}->${x.toId}:${x.relationTypeId}`)
    .sort()
    .join(',');
  return `${o.length}:${o}|${r.length}:${r}`;
}
