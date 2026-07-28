# R1-tab-depth-audit — state black box

- STARTED 2026-07-28 — packet dir created, nothing read yet.
- Read .agents/INDEX.md + .agents/AGENTS.md complete (212 lines).
- Gate 'smoke-clinical-mutation-guard.mjs' REFUSES to run: build stale (api-route-census.mjs:228). Cannot build (lead's gate). Falling back to source+live-server route inventory.
- Built own route table: 312 routes (route-table.txt). Built per-view eager import graph (view-api-graph-eager.json).
- Per-view route-existence match done (match-final.txt). Filtered extractor artefacts by reading each call site.
- CONFIRMED live-404 set: patients 3, visit 5, settings 14, marketing 1.
- Findings 1-4 written to dossier.md (404 map, patient-card 404s, 146-table/59-zero-writer census, comm-timelines wrong table).
- Findings 5-13 appended (settings 14 dead addrs, orphan finance pages, dual error systems, clinicMode gaps, patients double-search, hardcoded colours, DocumentsView correction, marketing localStorage, what is REAL).
- Findings 14-15 + full 14-view table + 10 ranked packets appended.
- FINDING 16 (20 undeclared live tables) + method limits appended. DOSSIER COMPLETE.
