# ADVERSARIAL REVIEW — W2-clinicmode-really-hides

Reviewer: adversarial subagent (did not write the code). Posture: disbelief. Read-only on source.
Commits attacked: `58fabefb3938871b40b271d49a56b79b25f79d99`, `47c09002a9d7c51ef654e7c357bcc2cb290e86b0`.
HEAD MOVED DURING THIS REVIEW: `6bb2bb0ab` → `e2d41dc74` (five commits from other packets landed while I worked).
That movement is itself a finding — see §8.

VERDICT: **NEEDS_REWORK**. No fabricated proof — every quoted command reproduces with the true exit code
and identical printed output, and the numbers are exact to the insertion. But one delivery claim was false
at the packet's own HEAD, one state-of-the-world claim is a misread that was used to defer a numbered brief
item, and the §6 global census missed a second, live, competing flag system that already owns the same
product decision.

---

## 1. DEFECT REAL AT PARENT — CONFIRMED

`git show 2ff49559b:apps/web/src/store/settingsStore.ts` line 158:
```
  clinicMode: "network_clinic", // default
```
Brief's line number and value exact.

## 2. THE FIELD WAS DEAD — CONFIRMED, re-derived independently

`git grep -nw "clinicMode" 2ff49559b -- apps/web/src` + `git grep -n "setClinicMode" 2ff49559b`:
6 destructure sites, each appearing exactly once per file (i.e. never referenced again in that file):
SettingsView.tsx:872/873 · LegacyMigrationStudio.tsx:1335/1336 · SettingsAuditTab.tsx:1244/1245 ·
SettingsImportsTab.tsx:1241/1242 · SmartImportStudio.tsx:1339/1340 · useSettingsDerivations.tsx:1333/1334.
`setClinicMode` call sites: **zero**. Dead bindings survive because `tsconfig.base.json` sets no
`noUnusedLocals`. The packet's "6 / 0 / 0" is exact, and its refusal to just flip the default was correct.

## 3. PROOF AUDIT — every claimed command re-run, true exit codes

| Claim | Re-run result | Verdict |
|---|---|---|
| committed test 13/13 exit 0 | `tests 13 / pass 13 / fail 0`, TRUE_EXIT=0. Printed lists identical: solo `doctor, owner`; one_chair `doctor, administrator, assistant, owner`; small+network all five. | CONFIRMED |
| held surface test 7/7 exit 0 | `tests 7 / pass 7`, TRUE_EXIT=0. Printed `отдельный врач (12)` vs `сеть (14)` byte-for-byte as quoted. | CONFIRMED |
| `panelsAreMounted` pass 2 | Now `pass 5` — but `git show 47c09002a:...` has exactly 2 `test(` blocks. Accurate when made; extended later by 41a22b63d. | CONFIRMED (not a false claim) |
| encoding smoke `ok:true, 0 mojibake` | TRUE_EXIT=0, `ok: true`, `mojibakeHits: 0`. | CONFIRMED |
| encoding smoke `checkedFiles: 429` | Now **416**. Drift explained by later deletions (7821bef70 −3 web files, 6bb2bb0ab −2, 41a22b63d −4). Also: the real output has a 5th key `requiredSnippets: 13` that the "quoted" JSON omits — a paraphrase presented as a quote. | NIT |
| commit sizes 3 files 94/11 and 2 files 111/6 | `--numstat`: 69+18+7 = 94 / 6+3+2 = 11; 20+91 = 111 / 6+0 = 6. **Exact.** | CONFIRMED |
| API defaults: hydration `catch("one_chair")`, seed `one_chair` | domainStateHydration.ts:350 and sampleData.ts:283 confirmed verbatim. **Strengthened:** live PostgreSQL has `clinic_mode='demo'` for BOTH organizations (read-only SELECT), which is outside the enum and coerces to `one_chair`. | CONFIRMED + strengthened |
| workspaceProfile GET 19 hardcoded flags / POST 17 destructured, none persisted | Counted by hand: GET returns exactly **19** literal flags incl. `workspacePreset:"enterprise"`, discarding the resolved `organizationId`; POST destructures exactly **17** and `.set({ updatedAt: new Date() })` only. **Both exact.** | CONFIRMED |
| `smoke-workspace-shell-source.mjs` exits 1, "I did NOT establish whose red this is" | Reproduced, same two lines. **Ownership established — see §5.** | CONFIRMED + closed |
| TYPECHECK "not mine to run" | I ran it. **See §4.** | Upgraded |

## 4. TYPECHECK — run twice, W2 is clean, HEAD is red from another packet

`npm run typecheck -w @dental/web` (`tsc -b --noEmit`), run once before and once after 41a22b63d landed.
Both runs: **TRUE_EXIT=1, exactly 3 errors, all in `src/App.tsx`**:
```
src/App.tsx(4775,40): error TS2769: Type '"inventory"' is not assignable to type 'LazyWorkspaceView'.
src/App.tsx(4789,40): error TS2769: Type '"scanner"'   is not assignable to type 'LazyWorkspaceView'.
src/App.tsx(4797,40): error TS2769: Type '"leads"'     is not assignable to type 'LazyWorkspaceView'.
```
Root cause `apps/web/src/workspaceRouteErrorBoundary.tsx:3` — `LazyWorkspaceView` lacks the three new views.
**Zero errors in any W2 file** (settingsStore.ts, useSettingsDerivations.tsx, clinicCapabilities.ts, its
test, workspaceShell.tsx, clinicModeSurface.test.ts). W2's typecheck signal is GREEN; HEAD's red belongs to
41a22b63d. Also confirms the `?? FULL` / `if (!allowed)` removal is type-safe: `Record<ClinicMode, …>` over a
literal union is not an index signature, so `noUncheckedIndexedAccess` adds no `undefined`.

## 5. THE SMOKE RED IS NOT W2'S — and half of it is not a defect at all

- **"Sidebar view hints must collapse on mobile" is a FALSE RED.** The rule exists at
  `apps/web/src/styles/main.css:13156-13157`. The smoke asserts the literal
  `".nav-copy small {\n    display: none;"`, but the file is CRLF. Measured:
  `has CRLF: true / LF match: false / CRLF match: true`. `main.css` is untouched by everyone.
  A line-ending artefact masquerading as a UI defect — the same class of bug as the "45 hollow modules" regex.
- **"ScheduleView must not force smooth programmatic scrolling" is REAL but pre-existing.** 1 hit in
  `apps/web/src/ScheduleView.tsx`, file untouched by W2, red at HEAD.

## 6. REACHABILITY — the fix is NOT dead code, and the packet's own report about this is WRONG

End-to-end path verified: SettingsClinicTab mode-grid → `changeClinicMode(mode)` (useAppLogic:7302) →
`POST /api/settings/clinic/mode` (settings.ts:351) → `updateClinicModeInDb` → `getClinicSettingsFromDb` →
`dashboard.clinicSettings.profile.mode` → `resolveClinicMode` → rail + role switcher. Reachable.

**But the packet's CLAIMED NOT PROVEN item 4 is a misread.** It states SettingsClinicTab "offers only 2 of 4
modes and writes a profile DRAFT instead of calling changeClinicMode". Reality:
- `SettingsClinicTab.tsx:256-269` renders `<div className="mode-grid">` over `typedClinicModes` =
  `Object.keys(clinicModeLabels)` = **all 4 modes** (workspaceUiLabels.ts:345), `onClick={() => changeClinicMode(mode)}`.
  A real, working, 4-mode switcher that does POST.
- `SettingsClinicTab.tsx:320-346` is a **second, separate** widget: 2 hardcoded chips writing a draft.
- Onboarding also drives it: `InlineStepClinic.tsx:31/39` maps all modes and calls `changeClinicMode`.

So brief item 5 ("if the settings UI cannot currently change the mode, that is part of the packet … or
record precisely why not") was deferred on a false premise. The correct finding was the opposite one: there
are **two** mode pickers in one settings tab that disagree, and the 2-chip one is a draft-only decoy.

## 7. WHAT IS ACTUALLY DELIVERED — measured, not read

`git grep` at the packet's own HEAD (`6bb2bb0ab`) for `visibleStaffRoles|resolveClinicMode|marketingSection|clinicModes`:
**production consumers: ZERO.** Every hit outside `lib/clinicCapabilities.ts` was in its own test file.
So at the time the packet reported:
- a solo dentist was still offered **5** role chips, not 2;
- `marketingSection` hid nothing;
- `resolveClinicMode` was never called on real data.

The packet's SUMMARY ("Committed: … a solo dentist is now offered 2 roles instead of 5") and its
CONSTITUTION SELF-CHECK ("PROVEN for the role switcher (committed, 2 of 5)") were **false as statements
about HEAD**. What was committed is a pure function plus its test; the only consumer was the held file.
The hold is disclosed elsewhere in the packet, so this is an internal contradiction and an over-claim, not
fabricated evidence — but it is exactly the claim a lead would have relied on.

**Impact on the live database is one role chip.** `clinic_mode='demo'` → coerced to `one_chair` →
`hasCapability('one_chair','marketingSection') === true`, so zero rail entries are removed; `visibleStaffRoles`
drops only `manager`. The entire user-visible delivery on the actual database is the «Управляющий» chip
disappearing from the topbar. Everything else requires an operator to deliberately choose «Отдельный врач».

**The default change is behaviourally a no-op.** `clinicCapabilities(null)` returns `FULL`, which is the
identical set to `network_clinic`; `visibleStaffRoles(order, null)` returns the full order, identical to
`network_clinic`. Combined with the field being dead, commit 58fabefb3's subject sells a documentation
change as a behaviour fix.

## 8. CONCURRENCY: THE HELD FILE WAS SWEPT IN BY ANOTHER PACKET — code committed, test not

`41a22b63d fix(разделы): склад, стерилизация и воронка обращений не открывались ничем` (11:49:39, 7 minutes
after 47c09002a) committed `apps/web/src/workspaceShell.tsx` whole. It therefore contains W2's work:
```
HEAD:apps/web/src/workspaceShell.tsx:31   import { type ClinicMode, hasCapability, resolveClinicMode, visibleStaffRoles } …
HEAD:apps/web/src/workspaceShell.tsx:205  export function getVisibleRailViews(role: StaffRole, mode: ClinicMode | null): AppView[]
HEAD:apps/web/src/workspaceShell.tsx:243  const allowedViews = getVisibleRailViews(role, clinicMode);
HEAD:apps/web/src/workspaceShell.tsx:409  const availableRoles = visibleStaffRoles(roleFocusOrder, clinicMode);
```
Consequences:
- The gating is now LIVE at HEAD — by accident, not by W2.
- §12 audit trail broken: no commit message anywhere explains why «Маркетинг/SEO» and «Обращения» left the rail.
- **`apps/web/src/__tests__/clinicModeSurface.test.ts` is STILL UNTRACKED** (`git ls-files --error-unmatch`
  → "did not match any file(s) known to git"). Live gating with no committed test.
- AGENTS.md §7a says concurrent edits go through separate worktrees or file lists proven disjoint. W2 knew
  the other author was restructuring that exact file, wrote into it anyway, and left it dirty. The
  predictable outcome happened in 7 minutes. The hold decision was justified in isolation and correctly
  reasoned (HEAD had no render branch for inventory/scanner/leads — verified: `LazyWorkspaceView` still
  doesn't); leaving the edit in a shared dirty file was not.

## 9. SECOND OWNER — a whole competing modularity system the census missed (§6, §10)

The packet calls its table "the ONE existing capability table". It is not.
`apps/web/src/hooks/useWorkspaceProfile.ts` is a second, larger modularity system: `WorkspaceFeatureFlags`
with 19 fields, defaults `hasAssistants: true, hasMultipleChairs: true, workspacePreset: "enterprise"`, and
a client-side preset table `solo` / `clinic` / `enterprise` (lines 172-199) that sets
`hasAssistants`, `hasMultipleChairs`, `hasMarketingModule`, `hasPayrollModule`, `numberOfDoctors`…

It has real consumers:
- `SettingsView.tsx:1201` — `if (!flags.hasMarketingModule) typedSettingsTabs = …filter(t => t.id !== "marketing")`
- `SettingsView.tsx:1512` — `settingsTab === "marketing" && flags.hasMarketingModule`
- `hooks/domains/useScheduleLogic.ts:312` — `if (!workspaceProfile.hasMultipleChairs …)`

So `hasMarketingModule` already owned "does this clinic do marketing". W2 invented `marketingSection` as a
second name for the same rule — the exact hazard its own comment in `getVisibleRailViews` warns about
("два имени для одного правила разъезжаются при первой же правке одного из них"). The divergence is live at
HEAD: for a `solo_doctor` clinic the rail entry «Маркетинг/SEO» is hidden while Settings → Маркетинг stays
visible, because the server hardcodes `hasMarketingModule: true`.

And `changeClinicMode` itself refetches that facade (useAppLogic:7332) under the comment
`// Refetch workspace profile so that sidebar tabs reflect the updated ClinicMode flags immediately` — an
endpoint that ignores the mode entirely. The packet recorded the facade's numbers correctly but never
noticed that its own mechanism's sibling call is that facade.

## 10. GATING COVERS 1 OF 4 ROLE PICKERS

`visibleStaffRoles` is applied in `WorkspaceTopbar` only. Still ungated, all mapping the full
`roleFocusOrder` and all writing the same `setSelectedWorkspaceRole`:
- `App.tsx:2168` — onboarding step "team", «Ваша рабочая роль», 5 chips
- `App.tsx:2525` — onboarding step "role", «Роль нового сотрудника», 5 chips
- `components/workspace/onboarding/inline/InlineStepRole.tsx:30` — «Роль нового сотрудника», 5 chips

App.tsx belongs to W3 this cycle, but `InlineStepRole.tsx` is claimed by nobody and was neither gated nor
disclosed. Reachable inconsistency: onboarding sets `manager` in a `solo_doctor` clinic → the topbar reads
«Роль: Управляющий» while offering only «Врач» and «Владелец», with no chip highlighted. Escapable (owner
chip exists — the packet's owner-retention test is genuinely load-bearing), but incoherent.

Also ungated, and explicitly named in the brief ("staff-management surfaces, anything that presupposes
colleagues"): `SettingsClinicTab.tsx:238` `staffCreationRoles = ["doctor","administrator","assistant","manager"]`
— a solo dentist is still invited to create an assistant, an administrator and a manager.

## 11. §3 / §4 — THE GRANDMOTHER IS NEVER TOLD WHY

`describeHiddenCapabilities` has **zero production consumers** at HEAD and in the working tree — the one
function whose entire purpose is explaining a vanished section is orphaned (pre-existing, but W2 added a new
hiding rule on top of it without wiring it). Net effect for a solo_doctor clinic: two rail entries and up to
three role chips vanish with no on-screen explanation, no «показать больше», and no hint that Settings →
Режим is the way back. And the explanation would be incomplete anyway: `describeHiddenCapabilities("solo_doctor")`
names "раздел продвижения и отзывов" but never mentions «Обращения», which the same capability also hides.

## 12. WHAT IS GENUINELY GOOD (stated because it is true, not to soften)

- The self-caught `in`-operator prototype bug is real, was found by the packet's own test rather than by
  reasoning, and was fixed at the root (`clinicModes.includes`) with the now-unreachable guards removed.
- Deletions are clean: nothing was half-deleted. `clinicMode`/`setClinicMode` removed from
  useSettingsDerivations were not in that hook's return block — `git grep` at HEAD finds only a prose comment.
- Commit hygiene is exemplary: 3 files then 2 files, all W2's, insertion counts exact, and none of the
  concurrent author's staged deletions (AppRouter.tsx, PayrollView.tsx, OmnichannelInboxView.tsx/css) swept in.
- Zero new CSS, zero hardcoded hex/px, zero new panels, no mojibake in diff or subjects, no teardown debt
  (`useAppLogicContext` is a bare `useContext` with a `{}` fallback, and the "outside the provider → null →
  show everything" claim is accurate: `contexts/AppLogicContext.tsx` returns `{} as AppLogicContextType`).
- The owner-retention test is not cosmetic: role determines section membership and «Врач» has neither
  «Оплаты» nor «Настройки», so dropping `owner` would strand a solo dentist with no route back to the mode
  switch. That reasoning is correct and locked.
- `StaffRole` has exactly 5 members and `roleFocusOrder` exactly 5 — `ROLES_BY_MODE` drops nothing silently.

## 13. NOT W2's (recorded so the lead does not misattribute)

- 3 typecheck errors in App.tsx → 41a22b63d / `LazyWorkspaceView`.
- Both `smoke-workspace-shell-source` reds → pre-existing; one is a CRLF artefact.
- Uncommitted `.agents/AGENTS.md` edit (new §7a, AGENT-SCOUT rewrite) → the lead's own governance work.
- `workspaceProfile.ts` GET/POST facades → pre-existing; W2 measured them correctly and left them as debt.
