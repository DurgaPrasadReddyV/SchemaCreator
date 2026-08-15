/**
 * flowStore — slim slice of derived UI state only.
 * React Flow owns nodes/edges via useNodesState/useEdgesState (no duplication).
 */

import { create } from 'zustand';

export interface FlowState {
  selectedObjectId: string | null;
  selectedRelationId: string | null;
  hoveredId: string | null;
  reachableIds: Set<string>;
  setSelectedObject: (id: string | null) => void;
  setSelectedRelation: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setReachable: (ids: Set<string>) => void;
  clear: () => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  selectedObjectId: null,
  selectedRelationId: null,
  hoveredId: null,
  reachableIds: new Set(),
  setSelectedObject: (id) => set({ selectedObjectId: id }),
  setSelectedRelation: (id) => set({ selectedRelationId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  setReachable: (ids) => set({ reachableIds: ids }),
  clear: () =>
    set({ selectedObjectId: null, selectedRelationId: null, hoveredId: null, reachableIds: new Set() }),
}));
