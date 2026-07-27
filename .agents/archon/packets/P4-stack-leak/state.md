# P4-stack-leak — black box

Packet: P4-stack-leak
Lane: WEB
Claimed files: apps/web/src/workspaceRouteErrorBoundary.tsx (+ new test file)
Compile gate: npm run typecheck -w @dental/web
HEAD at start: 0b208ef17edba4b8e145bbdbb3e42ea68cd87267 (dossier cited f09869601 — tree moved)

## Milestones
- STARTED 2026-07-28 — packet dir created.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md read complete.
- DEFECT CONFIRMED — apps/web/src/workspaceRouteErrorBoundary.tsx:22 returns
  `[Error] ${error.message}\n${error.stack || ''}` with NO import.meta.env branch;
  rendered at :61 inside `<small>{this.state.detail}</small>`.
  DOSSIER DRIFT: packet said render site is :62. :62 is the button. Real render site is :61.
  Formatter citation :22 is EXACT.

- EDIT WRITTEN — apps/web/src/workspaceRouteErrorBoundary.tsx rewritten (read in full first);
  new file apps/web/src/tests/workspaceRouteErrorBoundary.test.ts.
- UNIT VERIFIED — `node --import tsx --test apps/web/src/tests/workspaceRouteErrorBoundary.test.ts`
  -> pass 7 / fail 0, duration_ms 369.9588.
- ABOUT TO RUN (slow): `npm run typecheck -w @dental/web` — the compile gate. If I die here, the edit
  is already on disk and the unit test is already green; just re-run the gate and commit.

- GATE PASSED — `npm run typecheck -w @dental/web` EXIT=0, no output.
- COMMITTED 800bde54f2a599aa8108ebf9035b631e8f178525 — 2 files, 237 insertions / 19 deletions.
  Russian subject intact, no mojibake, no foreign files rode along.

- REGRESSION FOUND BY PROOF (post-commit): scripts/smoke-workspace-shell-source.mjs:160-164 asserts the
  literal string "workspaceRouteErrorDetail" exists in the boundary source. I renamed that symbol in
  800bde54f, so I turned a PASSING assertion red on a smoke that was already baseline-RED on two others.
  FIX: restore a real function named `workspaceRouteErrorDetail` as the operator-readable hint producer
  (this also matches the sibling `appShellErrorDetail` name exactly), keep
  `workspaceRouteErrorPresentation` as the tested wrapper. Second commit, no amend.
  Other assertions in that smoke against my file still hold: "class WorkspaceRouteErrorBoundary",
  "componentDidCatch(error: unknown, errorInfo: ErrorInfo)", "window.location.reload()",
  "Раздел временно не открылся. Уже введенные данные не менялись."

- REGRESSION MEASURED AND CLOSED.
  BEFORE fix, `node scripts/smoke-workspace-shell-source.mjs` exit 1 with THREE failures:
    - Route error boundary must explain lazy route failures with operator-readable copy  <- MINE
    - Sidebar view hints must collapse on mobile to protect bottom navigation            <- baseline
    - ScheduleView must not force smooth programmatic scrolling                          <- baseline
  AFTER fix, exit 1 with exactly the TWO documented baseline failures. Mine is gone.
  `node scripts/smoke-app-update-recovery-source.mjs` -> "app update recovery source smoke passed", exit 0.
  Unit test now 8/8 pass.
- ABOUT TO RUN (slow): `npm run typecheck -w @dental/web` again + `node scripts/check-encoding.mjs`,
  then SECOND commit (no amend). Working tree currently holds the un-committed regression fix in
  apps/web/src/workspaceRouteErrorBoundary.tsx and apps/web/src/tests/workspaceRouteErrorBoundary.test.ts.

- COMMITTED 068cc6f0cb73e0eb2888e6bed85a75958914a365 — CONTAMINATED, see below.
- PROVEN — typecheck exit 0, unit 8/8, shell-source smoke back to baseline-2, encoding guard red only
  on scripts/*.mjs (5 files, none mine).

- DONE — handoff.md written. Tree clean of my files (both committed).

## !! COMMIT CONTAMINATION — TELL THE LEAD !!
Commit 068cc6f0c contains a THIRD file I never staged:
  apps/web/src/components/visit/VisitDictation.tsx | 399 ---------  (deletion)
CAUSE: `git commit -F <msg>` commits the ENTIRE INDEX, not the pathspec I passed to `git add`.
Another agent had already staged that deletion; my commit swept it up. The briefing's retry-loop recipe
is vulnerable to this whenever a neighbour has staged work. SAFE FORM:
  git commit -F <msgfile> -- <explicit paths>
NOT REVERTED, deliberately. The deletion is coherent third-party work: apps/web/src/VisitView.tsx:337
carries their comment "Здесь стоял <VisitDictation /> — вторая диктовка на том же ...", their
VisitView.tsx edit is still uncommitted, and no live JSX reference to the component remains
(typecheck exit 0). Restoring the file would fight their in-flight packet and orphan a component.
The damage is attribution only, not tree content. First commit 800bde54f was clean (2 files).

## Sibling convention (read, not edited)
- apps/web/src/AppShell.tsx:13-19 `appShellErrorDetail` — chunk/import/loading -> Russian network hint;
  ELSE a fixed Russian reassurance "Интерфейс остановлен до перезагрузки, чтобы не показывать неполное
  рабочее место." NEVER echoes error.message, NEVER a stack. THIS is the vocabulary to converge on.
- apps/web/src/AppShell.tsx:33-37 componentDidCatch console.error gated `!import.meta.env.PROD`
  (identical to the leaky boundary's :41-44).
- THIRD boundary apps/web/src/components/ErrorBoundary.tsx:55 renders `{this.state.error?.message}`
  unconditionally — raw English exception string to the user. Leaks less than the stack but still leaks.
  OUTSIDE MY CLAIM. Reported as found-not-fixed.
- No correlation-id / trace-id concept exists anywhere in apps/web (searched). Timestamp is the only
  honest support reference available.
- Dev gating convention in apps/web is `!import.meta.env.PROD` (AppShell.tsx:34, main.tsx:84,
  workspaceRouteErrorBoundary.tsx:41). Follow it.

## Plan
1. Extract pure exported `workspaceRouteErrorPresentation(error, {includeDiagnostics, occurredAt})`
   following the lib/themeClasses.ts extraction convention (pure fn + node:test).
2. Prod branch: hint only, no message, no stack. Dev branch: hint + full `[Error] msg\nstack`.
3. Un-swallow: move console.error out of the !PROD gate so prod keeps a console trace
   (before this fix the on-screen stack was production's ONLY trace).
4. Add soft retry (resets boundary) next to the existing hard reload.
5. New test: apps/web/src/tests/workspaceRouteErrorBoundary.test.ts
