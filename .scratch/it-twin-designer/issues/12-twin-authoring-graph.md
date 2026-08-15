# 12 — Twin authoring `/twin` graph + inspector + layout

**What to build:** The estate as a React Flow graph at `/twin`. One generic data-driven `twinNode` (icon from a typeId→icon registry, type tag, label, classification left-stripe darker = more sensitive, abbreviated capability badges) and one generic data-driven `twinEdge` (solid access edge with label + arrowhead; faint-dashed `contains` edge with label hidden until hover). `nodeTypes`/`edgeTypes` declared outside the component. Add an object of any starter-pack Type; draw typed directed relations between objects; edit an object's fields in an inspector side panel with the form grouped into the Type's Sections (Identity / Security / Classification / Data Layer as applicable). Tagging a Column with a data-category auto-applies its implied default classification + recommended capabilities, overridable. Capability flags annotate any object or relation as muted outlined badges. Manual node placement persists as `graphLayout` (the default layout for focused graphs); on-demand Dagre layered auto-layout is an action the user triggers (never live on every edit). React Flow owns nodes/edges via `useNodesState`/`useEdgesState`; a slim `flowStore` holds only `selectedIds`/`hoveredId`/`reachableIds` (no duplication of nodes/edges). Node/edge ids map 1:1 to object/relation ids so layout re-attaches after structural change. Pan, zoom, click-to-select; selecting a node syncs the side panel. `rf.toObject()` → merge into `twinStore` → debounced autosave. Decision-rich node/edge payloads (from the research prototype):

```ts
type TwinNodeData = {
  objectRefId: string; typeId: string; label: string;
  classification?: 'public'|'internal'|'confidential'|'restricted';
  capabilities: string[]; summaryFields: Record<string, unknown>;
};
type TwinEdgeData = {
  relationTypeId: string;
  direction: 'forward'|'reverse'|'bidirectional';
  propagatesReachability: boolean; hopOrder?: number;
};
```

**Blocked by:** 08 — Domain model, starter pack, persistence & twin management (needs `TwinObject`/`TwinRelation`, the starter-pack Types to instantiate, `graphLayout` persistence, and the autosave subscriber). Not blocked by 11 — authoring objects from starter-pack Types needs only the schema *data* (08 provides), not the schema *editor*.

**Status:** ready-for-agent

- [ ] The twin renders as a typed-node / typed-edge graph in React Flow; the demo "Acme" twin displays correctly on load.
- [ ] One generic `twinNode` shows icon + type tag + label + classification left-stripe (darker = more sensitive) + abbreviated capability badges; one generic `twinEdge` draws solid access (label + arrowhead) and faint-dashed `contains` (label hidden until hover).
- [ ] The user can add an object of any starter-pack Type and draw typed directed relations between objects.
- [ ] The inspector side panel edits an object's fields grouped into the Type's Sections; `name` = node label, `description` optional.
- [ ] Tagging a Column with a data-category auto-applies its implied default classification + recommended capabilities; the user can override.
- [ ] Capability flags annotate any object or relation as muted outlined badges; the classification stripe dominates each node (badges do not compete).
- [ ] Manual node placement persists as `graphLayout` and is the default; on-demand Dagre auto-layout is a triggered action that does not mutate logical data and never fights manual edits.
- [ ] Pan, zoom, click-to-select work; selecting a node syncs the inspector; `rf.toObject()` feeds the debounced autosave.
- [ ] Node/edge ids map 1:1 to object/relation ids so layout re-attaches after structural change; React Flow owns nodes/edges (no duplication in `flowStore`).

**Visual checks (multimodal verification):** The implementer is a multimodal LLM — screenshot and verify by sight. Screenshot the demo twin graph in both dark and light. Verify: the classification left-stripe ramps Public→Restricted (light `#86b6ef → #3987e5 → #1c5cab → #0d366b`; dark `#6da7ec → #3987e5 → #256abf → #184f95`), always label-paired, never color-alone; capability badges are muted/outlined so the stripe dominates; data-category tags are neutral icon+label chips, NOT hues; `contains` edges are faint-dashed with labels hidden until hover; access edges are solid with arrowhead + label; `tabular-nums` on numeric fields and monospace on object IDs / field keys. Render `prototype/viz-prototype.html` from disk and compare the node/edge treatment side-by-side. Confirm auto-layout is on-demand only (drag a node, verify it is not snapped back).