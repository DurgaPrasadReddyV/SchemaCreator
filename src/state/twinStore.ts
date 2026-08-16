/**
 * twinStore — source of truth for the active twin.
 * Holds schema, objects, relations, graphLayout, dirty flag.
 */

import { create } from 'zustand';
import type { TwinDoc } from '@/domain/types';
import { graphRevisionOf } from '@/domain/reachability';

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
  setDoc: (doc) => set({ doc, dirty: false, graphRevision: graphRevisionOf(doc.objects, doc.relations) }),
  setDirty: (d) => set({ dirty: d }),
  patchDoc: (patch) => {
    const cur = get().doc;
    if (!cur) return;
    const next = { ...cur, ...patch, updatedAt: Date.now() };
    set({ doc: next, dirty: true, graphRevision: graphRevisionOf(next.objects, next.relations) });
  },
  bumpRevision: () => set({ graphRevision: String(Date.now()) }),
}));
