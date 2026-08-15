# 09 — Export/import & twin-document migration (seam 2, part A)

**What to build:** Twin portability and the document normalizer. Export a twin as a JSON file (the `TwinDoc` row itself) via a header action + `Modal`, with a toggle for whether export includes the `graphLayout` (so a shared twin does not impose the author's hand-placed layout). Import a JSON file: parse → `migrateTwinDoc` normalizer → assign a fresh id → `db.twins.add` (import never overwrites an existing twin). `migrateTwinDoc` normalizes an older-shape imported twin to the current `TwinDoc` shape (missing fields filled, `schemaVersion` migrated) and is separate from Dexie's DB-level versioned schema migration; the embedded `schemaVersion` lives in `TwinDoc.schema`. Upgrades are cumulative and idempotent. The separable `graphLayout` field never mutates logical data on export. This ticket delivers **seam 2 part A** — the pure document-layer tests live here.

**Blocked by:** 08 — Domain model, starter pack, persistence & twin management (needs `TwinDoc`, Dexie, the twin picker/header).

**Status:** ready-for-agent

- [ ] Export writes a JSON file of the twin; a toggle controls whether `graphLayout` is included.
- [ ] Import reads a JSON file, runs `migrateTwinDoc`, assigns a fresh id, and adds the twin (never overwrites).
- [ ] **Seam 2 test — normalizer:** an older-shape imported twin is normalized to the current `TwinDoc` shape (missing fields filled, `schemaVersion` migrated) without dropping modeled data.
- [ ] **Seam 2 test — export/import round-trip:** a twin exported and re-imported equals the original modulo a fresh id.
- [ ] **Seam 2 test — layout-separable export:** exporting with `graphLayout` stripped yields a valid twin that re-imports and re-attaches layout; the separable `graphLayout` field does not mutate logical data on export.
- [ ] `migrateTwinDoc` upgrades are cumulative and idempotent (running twice yields the same doc).
- [ ] These are pure, UI-agnostic tests (no React/RF/IndexedDB in the unit under test) runnable in Node.