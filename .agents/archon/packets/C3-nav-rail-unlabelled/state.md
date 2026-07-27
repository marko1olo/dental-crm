# C3-nav-rail-unlabelled — state

STATUS: DONE
Code commit: e71445757cbd4ce11c4f38de16509754aa6f26a1
Proof commit: see `git log --grep="страховка от возврата трех одинаковых значков"`
Time: 2026-07-28
Agent: implementer under [ARCHON]

## Timeline
- STARTED
- AUTHORITY READ (.agents/AGENTS.md, INDEX.md, UI_STANDARDS.md, archon/VISUAL_VERDICT.md full)
- DEFECT CONFIRMED (both halves)
- SMOKE BASELINE RECORDED (exit 1, exactly 2 pre-existing failures)
- EDIT WRITTEN (apps/web/src/workspaceShell.tsx only)
- GATE PASSED (npm run typecheck -w @dental/web -> EXIT=0)
- SMOKE AFTER == BASELINE (diff IDENTICAL, no third failure)
- COMMITTED e71445757cbd4ce11c4f38de16509754aa6f26a1
- PROVEN (unit 7/7 + negative control + full web suite 365/365 + typecheck)
- DONE (handoff.md written, proof commit staged with explicit pathspec)

## HEAD history observed (it moves — never reason from a remembered hash)
bb74658dc (start) -> f70a47ff2 -> 2f18e4406 -> e71445757 (my code commit) -> b78dfc69b

## Git identity warning for the lead
`git config user.name` = marko1olo. My commits are authored "marko1olo" too. Fleet commits
and the non-fleet author's commits are INDISTINGUISHABLE by author. The only separator is
the "[ARCHON] " subject prefix.

## Smoke baseline (recorded BEFORE the edit, byte-identical AFTER)
    node scripts/smoke-workspace-shell-source.mjs   -> EXIT=1
    - Sidebar view hints must collapse on mobile to protect bottom navigation
    - ScheduleView must not force smooth programmatic scrolling
Both pre-existing, both outside my claim. Failure #1 diagnosed and PROVEN to be a CRLF
false negative in the smoke script itself — see handoff.md "Долг" item 3.

## Files changed by me
apps/web/src/workspaceShell.tsx                    (+95 / -28)   commit e71445757
apps/web/src/__tests__/workspaceShellNav.test.ts   (new)         proof commit
.agents/archon/packets/C3-nav-rail-unlabelled/*    (new)         proof commit
apps/web/src/styles/dente-redesign.css — NOT touched. No token was missing; the caption
inherits its colour from .nav-item, so light/dark/night work with zero new colour values.

## What is NOT proven
Rendered appearance. Screenshots belong to the lead. Full list with the exact closing
command for each item is in handoff.md, section "НЕ ПРОВЕРЕНО".
