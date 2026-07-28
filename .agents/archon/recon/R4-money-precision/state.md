# R4-money-precision — state black box

- STARTED 2026-07-28 (run 2). A prior R4 run existed in this dir and was killed after writing finding
  F0 only. My initial `state.md` write clobbered its state log; its `dossier.md` (F0) and `q.mjs`
  survived. I am RE-DERIVING every F0 number myself rather than inheriting it.
- READ complete: .agents/AGENTS.md (234 l), .agents/INDEX.md (28 l), .agents/BILLING_AND_FINANCE.md
  (44 l), .agents/DATABASE.md (124 l), .agents/DOCUMENTS_LIFECYCLE.md (66 l).
  DATABASE.md:114-117 already documents the mid-migration state; the stale
  "amountRub is an integer" claim lives in the recon dossier, not in the constitution docs.
- Runner: q.mjs (read-only, SET default_transaction_read_only=on, refuses non-SELECT). Reused as-is.
- NEXT: re-derive full live money column inventory.
- CONFIRMED F1 (mode split 14 number / 24 string), F2 (drift gate blind to scale+precision+mode+2 files),
  F3 (12 money columns absent from ORM). Written to dossier.md.
- Instrument: exp-mode-audit.mjs (mine), exp-numeric-roundtrip.mjs (mine), q.mjs (prior run's, read-only).
- NEXT: legal documents money path (ndfl / 54-FZ receipt), then float smells, then representation clashes.
- CONFIRMED F4 (38/45 money fields z.number().int()), F5 (parts vs aggregate contract clash),
  F6 (Math.round on debt, stale comment), F7 (money.ts used by 2 prod files only), F8 (measured shapes).
- NEXT: legal doc paths (ndfl cert + 54-FZ receipt) and family wallet; then float-smell census.
- CONFIRMED F9 (family wallet door nailed shut, arithmetic exact), F10 (strict float == gates fiscal
  receipt issue; 3/7 measured drift), F11 (tax cert total = float reduce), F12 (rub() never shows 2dp).
- NEXT: float-smell census across money paths; 54-FZ receipt dispatch; then dossier paragraph + ranking.
- CONFIRMED F13 (0.01 tolerance magnitude-dependent, 4/10 missed), F14 (screen formatter fixed, paper not),
  F15 (no 54-FZ path exists at all - corrects the packet's assumption), F16 (no amount-in-words).
- NEXT: reconcile.ts / pricelist analyzer / biAnalytics; parseFloat + /100 census; then deliverables.
- CONFIRMED F17 (import rounds every payment+price to whole rubles, exact kopecks discarded one line away),
  F18 (price-list import truncates kopecks; my 100x first read was WRONG and is recorded as corrected),
  F19 (parseFloat on money to screen), F20 (debt subtraction in float).
- NEXT: build the full column inventory table + corrected dossier paragraph + ranked list.
- CONFIRMED F21 (treatment_plans duplicate totals, "alias" comment false), F22 (multiplyKopecks refuses
  fractional qty the schema is built for), F23 (past 100x revenue bug from the kopecks naming trap).
- RE-VERIFIED the 38/45 headline count with a second independent parser: 45 = 38 int + 5 money + 2 plain,
  0 unaccounted. Numbers hold.
- DELIVERABLES 1-4 written to dossier.md (inventory table, corrected paragraph, ranked packets, limits).
- DONE. Nothing in this tree was edited; no gate, no migration, no server restart, no git command.
