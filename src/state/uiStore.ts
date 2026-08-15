/**
 * uiStore — theme, active view, active twin id, panels.
 */

import { create } from 'zustand';

export type Theme = 'light' | 'dark';

export interface UiState {
  theme: Theme;
  activeTwinId: string | null;
  activeView: '/' | '/schema' | '/twin' | '/tables' | '/reachability';
  setTheme: (t: Theme) => void;
  setActiveTwin: (id: string | null) => void;
  setActiveView: (v: UiState['activeView']) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  activeTwinId: null,
  activeView: '/',
  setTheme: (t) => set({ theme: t }),
  setActiveTwin: (id) => set({ activeTwinId: id }),
  setActiveView: (v) => set({ activeView: v }),
}));
