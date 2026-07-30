# X2-clinicmode-rework — state

STATUS: DONE — COMMITTED 7483b408290c9cb5464b8fb8ae479a1653ff819a (third of three X2 commits)
HEAD at first start: 13b17385668937370ff2594829661d221843c3ca
HEAD at resume:      6b063df202561552d36537a9087c0eda3b01bcdb

## What the dead incarnation already landed (verified by git show --stat)
- f1c00a49658f166624ac876a1eef15539d934e88 — commits the previously UNTRACKED
  apps/web/src/__tests__/clinicModeSurface.test.ts (114 insertions). Closes reviewer §7/§8.
- 6dbd592b52eea58faa7cd880da3b64608a39141a — 6 files, 361 insertions:
  __tests__/clinicModeSurface.test.ts, components/workspace/onboarding/inline/InlineStepRole.tsx,
  hooks/useWorkspaceProfile.ts, lib/clinicCapabilities.ts, tests/clinicCapabilities.test.ts,
  workspaceShell.tsx.
  Closes reviewer §9 (second owner hasMarketingModule), §11 (describeHiddenCapabilities orphaned),
  part of §10 (InlineStepRole), plus a self-found third copy of the ClinicMode union.
It died BEFORE writing handoff.md and before running the final proofs.

## Read complete this session
- .agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md
- .agents/archon/packets/W2-clinicmode-really-hides/review.md (SPEC, 209 lines), handoff.md, state.md
- apps/web/src/lib/clinicCapabilities.ts (258), workspaceShell.tsx (580),
  __tests__/clinicModeSurface.test.ts (177), hooks/useWorkspaceProfile.ts (296)

## Dirty check at resume — `git status --porcelain -- <9 claimed paths>` => EMPTY, exit 0
`git diff --cached --name-only` => EMPTY. No collision. App.tsx and SettingsClinicTab.tsx also clean.

## Still open from the reviewer list (to close this session)
- §10 remainder: App.tsx:2168 / :2525 role pickers (5 chips) — MUST first prove whether they are
  live or dead relative to InlineStepRole.tsx. If InlineStepRole is unmounted, the prior fix hit a
  dead file and the packet is a facade.
- §9 proof: the hook downgrade is asserted by a rule test, not exercised. Needs a real signal.
- §3 NIT, §4, §5, §6, §12, §13: statements to verify/correct in handoff.

## RECONNAISSANCE DONE (all by command at HEAD 6b063df20)
- InlineStepRole IS live: WorkspaceOnboardingInline.tsx:120 mounts it when onboardingStep==="role",
  and WorkspaceOnboardingNoticeBars.tsx:58 mounts that. The prior fix did NOT hit a dead file.
- App.tsx:2168 («Ваша рабочая роль», wizard step "team") and App.tsx:2525 («Роль нового сотрудника»)
  both mapped the full roleFocusOrder. Both inside `export function App()` (starts 956); the big
  appLogicValue destructure ends at 1923, dashboard at 1100, selectedWorkspaceRole at 1611.
- SettingsClinicTab.tsx:256-263 = real 4-mode grid -> changeClinicMode. :330 = second 2-chip widget
  -> updateClinicProfileDraft("mode") draft only, with inline styles and a literal '#fff'.
  :238 staffCreationRoles = doctor/administrator/assistant/manager, rendered at :592.
  ALL of components/settings/** is the non-fleet author's zone, not named by my packet -> DEBT.
- SettingsView.tsx HEAD:1199-1201 `const flags = useWorkspaceProfile()` then
  `if (!flags.hasMarketingModule) ... filter(t => t.id !== "marketing")`; panel gate at :1512.

## EDIT WRITTEN + SELF-CHECK PASSED
- lib/clinicCapabilities.ts: new pure `applyClinicModeToFlags<Flags extends {hasMarketingModule}>`.
- hooks/useWorkspaceProfile.ts: hook now calls it; the rule no longer lives inside React.
- App.tsx: +import, +`onboardingRoleChoices` const before line 2044, two call sites swapped.
- __tests__/clinicModeSurface.test.ts: +2 tests, prints both module surfaces (26 vs 36).
Ran: `node --import tsx --test src/__tests__/clinicModeSurface.test.ts` TRUE_EXIT=0 tests 11 pass 11.
Ran: `node --import tsx --test src/tests/clinicCapabilities.test.ts`   TRUE_EXIT=0 tests 15 pass 15.
Ran (read-only esbuild parse of App.tsx, NOT a typecheck): PARSE OK, 213256 bytes, exit 0.

## COMMITTED 7483b408290c9cb5464b8fb8ae479a1653ff819a
4 files, 205 insertions / 12 deletions, all mine. Index was empty before the commit; App.tsx had
exactly 4 hunks, all mine. Russian subject intact in `git log -1 --stat`.

## PROVEN (all commands actually run, true exit codes)
- `node --import tsx --test src/__tests__/clinicModeSurface.test.ts` (14:20) TRUE_EXIT=0, 11/11,
  both module surfaces printed: solo 26 entries vs network 36, 10 removed and all organisational.
- `node --import tsx --test src/tests/clinicCapabilities.test.ts` TRUE_EXIT=0, 15/15.
- `npm run smoke:web-text-encoding` TRUE_EXIT=0, checkedFiles 433, mojibakeHits 0, requiredSnippets 13
  (this last key is the one W2's "quoted" JSON omitted — reviewer §3 NIT confirmed).
- `node scripts/check-css-tokens.mjs` TRUE_EXIT=0, 0 unresolved var() names.
- `node scripts/smoke-workspace-shell-source.mjs` TRUE_EXIT=1 — same two pre-existing reds; the first
  re-measured as a CRLF artefact (has CRLF true / LF match false / CRLF match true), the second is
  ScheduleView.tsx:255, in none of my three commits.
- `curl /api/health` 200; `/api/dashboard` without token 401.
- `git grep -n "roleFocusOrder.map" HEAD -- apps/web/src` => EMPTY. All 4 role pickers gated.
- read-only esbuild parse of App.tsx: PARSE OK 213256 bytes, exit 0 (syntax only, NOT a typecheck).

## COLLISION — reported, not touched
apps/web/src/workspaceShell.tsx became dirty between 14:21 and 14:23, NOT by me (proof: at 14:21 the
porcelain listed only my 4 files and the index was empty; my commit contains 4 files, not that one).
Another author adds `import { WorkspaceActionsMount } from "./components/workspaceActions/WorkspaceActions"`.
That UNTRACKED module does `import "./workspaceActions.css"` at line 4, and node:test cannot load .css:
ERR_UNKNOWN_FILE_EXTENSION. Blast radius measured: clinicModeSurface.test.ts 0 -> 1,
workspaceShellNav.test.ts -> 1, panelsAreMounted.test.ts still 0. Not reverted, not fixed, not staged.

## DONE
handoff.md written with all 13 reviewer items answered (13 CLOSED-or-DEBT, 0 disputed), the false
claims of W2's handoff corrected, 6 debts recorded with exact file:line.
