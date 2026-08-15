/**
 * reachabilityStore — query/result/animation state.
 */

import { create } from 'zustand';
import type { QueryMode, ReachabilityResult } from '@/domain/types';

export interface ReachabilityState {
  rootId: string | null;
  mode: QueryMode;
  result: ReachabilityResult | null;
  currentHop: number;
  isPlaying: boolean;
  setRoot: (id: string | null) => void;
  setMode: (m: QueryMode) => void;
  setResult: (r: ReachabilityResult | null) => void;
  setCurrentHop: (h: number) => void;
  setPlaying: (p: boolean) => void;
  reset: () => void;
}

export const useReachabilityStore = create<ReachabilityState>((set) => ({
  rootId: null,
  mode: 'data-to-user',
  result: null,
  currentHop: 0,
  isPlaying: false,
  setRoot: (id) => set({ rootId: id, currentHop: 0 }),
  setMode: (m) => set({ mode: m, currentHop: 0 }),
  setResult: (r) => set({ result: r, currentHop: 0 }),
  setCurrentHop: (h) => set({ currentHop: h }),
  setPlaying: (p) => set({ isPlaying: p }),
  reset: () => set({ currentHop: 0, isPlaying: false }),
}));
