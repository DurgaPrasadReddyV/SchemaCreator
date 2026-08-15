# 15 — Exposure dashboard `/` + onboarding

**What to build:** The landing surface at `/` (the Exposure dashboard) and onboarding. Estate counts, sensitive-field exposure by classification, and top exposure paths (derived from reachability). The dashboard doubles as the onboarding surface: a one-time coachmark ("pick a sensitive field → run reachability") guides the user to their first query result without a tutorial route. On first run the user lands on a populated dashboard via the seeded "Acme Corp" demo twin; a new blank twin shows a "starter pack loaded — add your first object" prompt. The status palette (good/warning/serious/critical) is reserved for actual state — save state, repair conflicts, exposure severity — and never used for series or category. Stat tiles use `tabular-nums`.

**Blocked by:** 14 — Reachability view (top exposure paths come from reachability), and 08 — Domain model, starter pack, persistence & twin management (needs the demo twin for a populated first run + estate counts).

**Status:** ready-for-agent

- [ ] `/` is the landing surface showing estate counts, sensitive-field exposure by classification, and top exposure paths.
- [ ] Top exposure paths are derived from reachability results (ties into the engine/view).
- [ ] First run lands on a populated dashboard (seeded demo twin); a new blank twin shows a "starter pack loaded — add your first object" prompt.
- [ ] A one-time coachmark guides "pick a sensitive field → run reachability" (no separate tutorial route).
- [ ] The status palette is used only for actual state (save state, repair conflicts, exposure severity) — never for series or category.
- [ ] Stat tiles use `tabular-nums`; numeric values align.

**Visual checks (multimodal verification):** Screenshot the dashboard on the demo twin (populated, exposure paths visible) and on a fresh blank twin (onboarding prompt), in both themes. Verify: stat tiles read as a coherent summary, not an empty graph; exposure severity uses the status palette (good/warning/serious/critical) and means severity, not category; the coachmark points clearly at the "run reachability" action and dismisses once; the "add your first object" prompt is visible and friendly on a blank twin. Confirm classification on the dashboard uses the same blue ramp as the graph (consistency across surfaces).