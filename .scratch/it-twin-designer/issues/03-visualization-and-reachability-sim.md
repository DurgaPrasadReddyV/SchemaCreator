# 03 — Visualization & reachability-simulation design

Type: prototype
Status: closed
Assignee: claude
Blocked by: 01

## Question

Decide how the twin and its access-path reachability are **visualized** and **simulated** — the central UX of the tool. Raise fidelity with a concrete prototype (use `mattpocock-skills:prototype` + `frontend-design` + `dataviz`) the user can react to. Specifically:

1. **Graph view (React Flow)** — how the twin renders as a typed-node / typed-edge graph: node appearance per entity Type (icon, label, classification/category color), edge appearance per relation type (label, direction arrow, propagates-reachability styling). Layout approach (manual placement saved in the twin, vs. auto-layout). Interaction: pan/zoom, select, expand.
2. **Reachability simulation** — how running a query is shown: pick a root (a classified/tagged field OR a user), run, then animate the reachable subgraph — propagate outward along access edges hop-by-hop (play/pause/step), reachable nodes highlighted, unreachable dimmed; per-hop relation labels shown; per-node capability badges (masking/encryption) and classification badges visible along the path. Both directions (data→who, user→what).
3. **Tabular view** — the twin as tables (objects of a Type in an AntD `Table`, columns = the Type's summary fields), AND the reachability **result as a hop table** (row per hop: object, relation type traversed, direction, capability/classification flags), synced with the graph selection.
4. **Query/run UX** — how the user picks the root, runs, scrubs, and reads the result across graph + table. Where the controls live.

Prototype should cover all three views for the worked SSN example and demonstrate the animated reachability + hop table. Link the prototype artifact from the resolution.

## Resolution

Decided how the twin + access-path reachability are **visualized** and **simulated**. Grounded in a runnable prototype — `prototype/viz-prototype.html` — for the SSN worked example: the 11 starter-pack objects + relations, typed custom nodes/edges, and a pure BFS reachability engine. The engine is verified against starter-pack traces A & B (Jane↔SSN in both directions, descendant-flood-on-access, `memberOf` mode-dependence) by `prototype/verify-engine.mjs` — all checks pass. JS syntax validated (`node --check`).

> **Image verification bypassed per user instruction** (no image access available). The visual decisions below are justified by the prototype code + the architecture research (ticket 02) + design intuition, **not** by screenshot review. A headless render smoke-test was not run (no Chrome installed); correctness was verified at the logic/syntax level instead.
>
> **Transparency.** An earlier session had already built a `prototype/viz-prototype.html` + a `shots/` folder. While scaffolding this session I accidentally deleted that directory (`rm -rf` after `npm create vite` cancelled on the non-empty target) and it was not recoverable (no git repo; Git Bash `rm` bypasses the Recycle Bin). The prototype linked here is a **reconstruction** from the starter-pack (01) + architecture-research (02) context. The decisions are unaffected; the user was informed directly.

**1. Graph view (React Flow)**
- **Node** = icon + type tag + label; **classification as a colored left-stripe** (Restricted=red / Confidential=amber / Internal=blue / Public·none=grey); **capabilities as abbreviated badges** (M, EaR, Audit…). Stripe + abbreviated badges were chosen to scale to hundreds of nodes; full-text capability labels were rejected as clutter at scale (per 02's perf guidance to avoid heavy visuals).
- **Edge** = solid + arrowhead + relation label for access (propagating) edges; faint dashed, label-hidden-until-hover for `contains` (structural, non-propagating) so containment doesn't drown the access graph.
- **Layout = hybrid.** Manual placement, persisted as the separable `graphLayout` field (02), is the default for focused/authoring graphs (the SSN example is hand-placed); Dagre layered auto-layout is an **on-demand action** for larger twins, never live on every edit.
- **Interaction** = pan (drag) / zoom (wheel) / select (click → sync side panel + hop table). Expand/collapse of `contains` subtrees is a deferred refinement (unnecessary at the worked example's size; revisit if large twins clutter).

**2. Reachability simulation**
- Pure BFS (02 §6) produces `reachableIds` + per-hop buckets + parent/hop chains. The animation reveals hop 0 → maxHop: reachable nodes lit (accent stroke), unreachable dimmed (~0.14 opacity), root ringed in amber. Active BFS-tree edges get marching-ants in the prototype; **production uses per-hop `<animateMotion>` packets per 02** (avoids `stroke-dasharray` cost at scale).
- **Descendant-flood-on-access is made legible**: a step reached via flood annotates "accesses (flood via Customer)" and highlights the `contains` path container→column in a second accent color — the otherwise-invisible flood becomes visible.
- **Both directions** via a Segmented control ("Who can reach this" = data→user; "What this can reach" = user→data) that also re-filters the root picker. Controls: Play/Pause, Step ◀/▶, Reset, hop scrubber; ←/→/space keyboard.

**3. Tabular view**
- **Objects-of-a-Type table**: pick a Type → rows = its objects, columns = the Type's summary fields; classification/category + capability badges per row; click syncs the graph selection.
- **Reachability hop table**: one row per reachable node — Hop, Object, Reached-via (relation + direction), Classification, Caps — sorted by hop; click a row to sync graph + inspector; the full chain is shown in the inspector. Direction follows the mode Segmented.

**4. Query / run UX**
- Root picker filtered by mode (data→user → classified/categorized columns; user→data → Users). Run executes the query and auto-plays the propagation. **In-view layout**: graph as the main stage; right side panel stacks Query → Hop table → Objects table → Inspector; a slim bottom playback bar holds Reset / Step / Play / Step / Scrub + hop-count. (The top-level app shell + nav is ticket 05; this fixes only the in-view arrangement.)

**Alternatives weighed** (the structurally-different variants a UI-prototype session would normally let a human pick by eye — closed here by code + intuition, no image review):
- **B** — full-width graph + floating control dock + hop table as an overlay drawer; full capability labels. Rejected: full labels clutter at scale; the overlay hides the graph↔table cross-sync that makes the side panel valuable.
- **C** — top toolbar + hop table below the graph (horizontal split). Rejected: splits the graph's vertical room and detaches playback from the result.
- **Chose A** (side-panel-right + bottom playback bar) to maximize graph visibility while keeping query, hop table, and inspector co-located for graph↔table sync.

**Asset:** `prototype/viz-prototype.html` (reconstructed; run with `npx serve .` or open in a browser). Engine check: `prototype/verify-engine.mjs`.

**Effect on the map:** unblocks **04** (tech architecture, was blocked by 01/02/03) and **05** (UI structure & visual direction, was blocked by 03). No new tickets surfaced; no fog graduated — schema-evolution still waits on 04's field-value storage decision, one-twin-vs-many still waits on 05's shell decision.