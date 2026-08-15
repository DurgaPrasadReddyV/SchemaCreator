# 07 — App shell, routing & theming spine

**What to build:** A browser-based, zero-install app opened from disk. Next.js (App Router, `output: 'export'`, `images.unoptimized`, `trailingSlash`) with five static routes — `/` (Exposure dashboard), `/schema`, `/twin`, `/tables`, `/reachability` — as empty placeholder pages. A single shared client shell (`RootShell`) owning the AntD `ConfigProvider` (dark default + light toggle), Zustand providers, `ReactFlowProvider`, and the Dexie `db`. AntD `Layout`: a collapsible `Sider` with a `Menu` of the five routes and a `Header`. In-SPA `useRouter` transitions keep client state alive across routes. AntD tokens are bridged to React Flow via CSS variables under one `ConfigProvider` (`cssVar: true`, two separate light/dark `ThemeConfig` objects) so the graph canvas and the chrome read as one system. This is the spine every later ticket hangs on; pages are empty but the shell, navigation, and theming are real and demoable.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] App opens from disk with zero install / no server (Next.js static export builds and runs from the file path).
- [ ] Five routes exist and are reachable from the collapsible `Sider` menu; in-SPA transitions keep client state alive (no full reload between routes).
- [ ] Dark theme is the default; a light toggle switches themes and the choice persists across reload.
- [ ] AntD chrome and the (empty) React Flow canvas share one visual system via the CSS-variable bridge — backgrounds, borders, and text colors match in both themes.
- [ ] `RootShell` mounts `ConfigProvider`, Zustand providers, `ReactFlowProvider`, and the Dexie `db` so later tickets add content, not plumbing.
- [ ] The five-color system is visually distinct: blue = classification, aqua = reachability, violet = primary/brand action, status palette reserved for state, neutral icon+label chips for categories (no hue collisions).

**Visual checks (multimodal verification):** The implementer is a multimodal LLM — capture screenshots and verify by sight, do not rely on the spec's "image verification bypassed" caveat. Screenshot each of the five routes in both dark and light. Verify: the `Sider` collapses/expands; the `Header` is uncluttered; dark and light are both ramp-validated (no low-contrast text, no color-alone encoding); the empty RF canvas background matches the AntD content background in each theme. Render `prototype/ui-shell-prototype.html` from disk and compare the shell's structure and theme parity side-by-side; match its layout intent.