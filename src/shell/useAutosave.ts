'use client';

/**
 * useAutosave — debounced (400ms) subscription to twinStore changes.
 * Persists the active twin to IndexedDB and clears the dirty flag.
 */

import { useEffect, useRef } from 'react';
import { useTwinStore } from '@/state/twinStore';
import { putTwin } from '@/state/db';

const DEBOUNCE_MS = 400;

export function useAutosave(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useTwinStore.subscribe((state, prev) => {
      if (!state.doc) return;
      if (state.dirty === prev.dirty && state.doc === prev.doc) return;
      if (!state.dirty) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        if (!state.doc) return;
        try {
          await putTwin(state.doc);
          useTwinStore.getState().setDirty(false);
        } catch (e) {
          // ignore — surface via UI later
        }
      }, DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
