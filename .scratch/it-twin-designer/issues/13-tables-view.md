# 13 — Tables view `/tables`

**What to build:** A tabular read of the estate at `/tables`. Pick a Type → rows = objects of that Type; columns = the Type's summary fields. Each row carries classification/category and capability badges (the same sensitivity/protection context as the graph). `tabular-nums` on numeric columns; monospace on object IDs / field keys / technical values. Clicking a table row syncs the graph selection (cross-navigate between table and graph). The reachability hop table itself is delivered in ticket 14; this ticket is the objects-of-a-Type table.

**Blocked by:** 12 — Twin authoring `/twin` graph + inspector + layout (needs objects to list, the Type summary-field definitions, and graph-selection sync).

**Status:** ready-for-agent

- [ ] Picking a Type lists its objects as rows with the Type's summary fields as columns.
- [ ] Each row shows classification/category + capability badges matching the graph's badge treatment.
- [ ] `tabular-nums` on numeric columns; monospace on object IDs / field keys / technical values.
- [ ] Clicking a row syncs the graph selection (and the inspector), so table and graph cross-navigate.

**Visual checks (multimodal verification):** Screenshot the table for `Column` (badge-heavy) and for `Database` or `Server` in both themes. Verify: badges match the graph's classification stripe ramp and muted capability style; numeric columns align on the decimal/right-edge via `tabular-nums`; IDs/keys render in monospace and scan vertically; row-click visibly highlights the corresponding graph node (and vice versa). Confirm 14 data-categories remain legible as neutral icon+label chips, not a rainbow.