# ADVERSARIAL REVIEW — X2-clinicmode-rework (second reviewer pass)

Reviewer: adversarial subagent, did not write the code. Posture: disbelief. Read-only on source.
Commit attacked: `7483b408290c9cb5464b8fb8ae479a1653ff819a`. Parent: `5e42aac183525b750b7bad1224eb363854b6b780`.
HEAD during THIS review: `1d22de291aa7fe8e994701923ea975339a4c3292` — five commits later than the previous
reviewer's HEAD (`f0121f0c2`), seventeen later than the attacked commit.

A previous reviewer's review.md occupied this path (verdict NEEDS_REWORK). I treated it as evidence, not
authority: every load-bearing number in it was re-measured from scratch, **two of its findings are
corrected** (§10), and **three findings are new** (F2, F3, F5). This file replaces it.

**Working-tree hazards, disclosed up front — one nearly produced a false finding of my own.**
- `apps/api/src/routes/workspaceProfile.ts` is dirty with another author's in-progress fix that makes
  `GET /api/workspace/profile` read the database and `POST` persist. Read from the working tree, that
  refutes the packet's central architectural justification; read from HEAD — the only correct frame for
  judging a commit — it confirms it. **All API claims below are measured with `git show HEAD:<path>`.**
- `apps/web/src/workspaceShell.tsx`, `useAppLogic.tsx`, `store/appStore.ts`, `store/documentStore.ts`
  and five more web files went dirty **during** this review. My typecheck and whole-suite runs therefore
  executed over HEAD *plus* those edits; both were green anyway. Line numbers I quote for
  `workspaceShell.tsx` are HEAD numbers (`git show`), not working-tree numbers.

---

## VERDICT: NEEDS_REWORK

The engineering is real and the direction is right. The extraction is genuine, the test executes real
assertions over real fixtures and prints the two surfaces the brief demanded, every measurement I could
re-derive comes back byte-identical, typecheck is green under `--force`, the whole web suite is
610/610, git hygiene is exemplary under live concurrency, and nothing regressed. This is not a facade
packet and it is not a revert.

It fails on proof integrity, in the places the packet chose to plant its flags:

1. **F1 — `REACHABILITY VERIFIED` is false.** The mount chain the packet certified ends in an orphan one
   link above where it stopped looking. The earlier packet commit `6dbd592b5` fixed a dead file — the
   exact outcome the builder wrote "would have made the packet a facade".
2. **F2 (new) — `onboardingStep` is never set to `"role"` anywhere in the repository.** That kills the
   second of the two pickers in the attacked commit, independently of any orphan or localStorage
   argument. Two grep commands the packet did not run.
3. **F5 (new) — the claimed type-level guarantee does not exist.** "Тронуть что-то помимо
   `hasMarketingModule` функция не может по своему типу, а не по обещанию" is written into a production
   doc comment and into the commit message. I disproved it with the compiler: the identical signature
   shape accepts a body that lowers `hasOrthodontics`, zero errors under `--strict`.
4. **F4 — `checkedFiles: 433` is not reproducible** and was used to convict W2's correct number, with an
   instruction to write the wrong one into `progress.md`.

Honest net delivery of the attacked commit: **one live role picker gated** (`App.tsx:2194`), one dead
one, plus a real and well-tested refactor of the mode→flag rule. Claimed: four of four pickers.
On today's real data the entire visible effect of the commit is **one role chip disappearing from the
first-run wizard** (F3).

---

## 1. THE DEFECT AT THE PARENT — CONFIRMED. The site count is inflated by one.

```
$ git grep -n "roleFocusOrder.map" 5e42aac18 -- apps/web/src     (the attacked commit's PARENT)
App.tsx:2168 , App.tsx:2525                                       → 2 hits, exit 0
$ git grep -n "roleFocusOrder.map" HEAD -- apps/web/src           → EMPTY, exit 1
$ git grep -n "roleFocusOrder.map" 6dbd592b5^ -- apps/web/src     → 3 hits, incl.
     components/workspace/onboarding/inline/InlineStepRole.tsx:30
```
Both line numbers in the commit message are exact and the defect is real: two wizard role pickers
rendered all five roles while `WorkspaceTopbar` filtered by mode, so the wizard could set «Управляющий»
in a solo clinic and the topbar would then show that role above a list not containing it.

**Overclaim:** the handoff says "Before my commit it returned 3 sites (…, InlineStepRole.tsx:30)". At its
own parent it returned **2**; the third had already been converted by the packet's own earlier commit
`6dbd592b5`, an ancestor of that parent. Measured independently at `6dbd592b5^` and `5e42aac18`.

## 2. F1 (HIGH) — `REACHABILITY VERIFIED` is false: the inline onboarding tree is an ORPHAN

Packet claim, verbatim:
> REACHABILITY VERIFIED - InlineStepRole … is genuinely mounted, so the earlier fix did not hit a dead
> file: `WorkspaceOnboardingInline.tsx:120` renders it …, and `WorkspaceOnboardingNoticeBars.tsx:58`
> mounts that.

Two links of a three-link chain were walked. Measured repo-wide, no path filter:
```
$ git grep -rn "WorkspaceOnboardingNoticeBars" -- .
apps/web/src/components/workspace/WorkspaceOnboardingNoticeBars.tsx:5:export function WorkspaceOnboardingNoticeBars() {
```
**One occurrence in the entire repository: its own declaration.** No import, no JSX use, no lazy import,
no test. Therefore `WorkspaceOnboardingInline` (referenced only by that orphan) never mounts, therefore
`InlineStepRole` (referenced only by it) never mounts. The live copy of that surface is App.tsx's own
duplicate at `App.tsx:2470`. Constitution §5: a decomposition must be IMPORTED AND USED.

The orphan predates X2. The certification of it is X2's, and X2 used that certification to license
trusting a previous incarnation's commit it had not otherwise verified.

## 3. F2 (HIGH, NEW) — `onboardingStep` is never set to `"role"`: the commit's second site is unreachable

The two changed pickers do not live on the same surface:

| site at HEAD | render condition | reachable |
|---|---|---|
| `App.tsx:2194` «Ваша рабочая роль» | fullscreen wizard, `onboardingStep === "team"` | **YES** |
| `App.tsx:2551` «Роль нового сотрудника» | in-workspace guide, `onboardingStep === "role"` | **NO** |

`onboardingSteps` (`AppHelpers.tsx:6107`) is `[intro, clinic, team, telegram, done]` — **no `role`
entry**. Every writer of the field, repo-wide:
```
useAppLogic.tsx:3065/3073/3088/3101   "team" / "clinic" / "legal" / "telegram"   (focusOnboardingIssue)
useAppLogic.tsx:3335  setOnboardingStep(step)   moveOnboardingTo(step) — called only with ids from
                                                onboardingSteps, its prev/next, and the literal "legal"
useAppLogic.tsx:3347  "intro"                   (reopenOnboarding)
useAppLogic.tsx:3356  if (step) …               openOnboardingGuide(step?) — BOTH call sites
                                                (App.tsx:2464, WorkspaceOnboardingNoticeBars.tsx:52)
                                                pass no argument
useAppLogic.tsx:3581  preferences.onboardingStep                       persisted value only
```
`git grep '"role"'` in onboarding/step context returns exactly four repo-wide hits: the two render
conditions (`App.tsx:2543`, `WorkspaceOnboardingInline.tsx:120`) and the two enum declarations
(`AppHelpers.tsx:3220`, `packages/shared/src/index.ts:7452`). **No writer anywhere produces the value.**
The only theoretical path is a legacy persisted `ui_preferences.onboardingStep === "role"` written by a
version of the app that had the step in its list — dead data, not a live path.

This also applies to `InlineStepRole`: even if F1's orphan were mounted tomorrow, its role branch still
would not render. The fix is dead twice over.

### 3a. The previous reviewer's independent unreachability argument — verified, holds
`showFullOnboardingGuide` (`useAppLogic.tsx:13534`) = `!onboardingDismissed && currentView ===
"settings" && settingsTab === "clinic" && onboardingGuideExpanded`, while reaching `App.tsx:2470` at all
requires passing the early return at `:2069` (`onboardingDismissed || isLocalOnboardingDismissed`). Both
hold only as `onboardingDismissed === false && isLocalOnboardingDismissed === true`. And
`isLocalOnboardingDismissed` (`App.tsx:2008-2011`) reads `dente_ui_preferences_v1`, which is **written by
nothing in `apps/web/src`** — only by `scratch/*.mjs` screenshot harnesses; app code writes
`dental-crm:web-ui-preferences:v1`. `saveOnboardingDismissed` writes the organisation-SCOPED key
(`AppHelpers.tsx:844`), so the unscoped `dental-crm:onboarding:v1` is only ever set for a null
organisation or by those harnesses. CONFIRMED. That whole in-workspace guide block is effectively
screenshot-harness-only, which is how it survived.

## 4. F3 (MEDIUM, NEW) — the one live surface it gates cannot see or change the mode, and on real data the whole commit is worth one chip

Read-only SQL on `127.0.0.1:5432` (connection string read in-process from `.env`, never printed):
```
organizations: 4 rows — 4a3420d1… d0000000… dce70000… dce70000…  ALL clinic_mode = "demo"
column clinic_mode: text, NOT NULL, DEFAULT 'demo'::text
workspace_feature_flags: NULL for all four organisations
```
`'demo'` is outside `clinicModeSchema` and is coerced at `apps/api/src/db/domainStateHydration.ts:350`
(`clinicModeSchema.catch("one_chair")`). It is the **column default**, so every future clinic is born
this way too. At `one_chair`, `visibleStaffRoles` = `[doctor, administrator, assistant, owner]`.

Therefore the measured product delta of this commit today is: **«Управляющий» silently disappears from
the first-run wizard's role chips.** Nothing else. The 26-vs-36 headline requires an operator to
deliberately pick «Отдельный врач».

Worse, the surface it gates is the one place the mode cannot be reached. Mapping the two onboarding
surfaces in `App.tsx`:
```
fullscreen wizard  (2069) : intro 2102 (wizard-mode-grid = DEMO vs CLEAN launch, not clinic mode),
                            clinic 2151 (name + phone only), team 2184 (THE GATED PICKER), done 2239
in-workspace guide (2470) : intro 2525, role 2543 (dead), clinic 2580 → mode-grid 2586 →
                            changeClinicMode 2593, legal 2666, team 2715, sources 2946,
                            telegram 3119, done 3383
```
The fullscreen wizard has **no clinic-mode selector at all**. So a real small clinic being onboarded is
denied «Управляющий» with no sentence explaining why and no way to correct the mode from that screen —
while the rail, gated by the same packet, does get its explanation and its «Изменить режим» link.
Constitution §3 (a grandmother must know what to do next) is satisfied on the rail and not on the
surface this commit actually touched. Before the commit that clinic could pick «Управляющий» in the
wizard; the packet's own argument is that the topbar then denied it anyway, which is fair — but the
trade is an incoherence swapped for an unexplained denial.

## 5. F5 (MEDIUM, NEW) — the type-level guarantee does not exist, and it is asserted in a production doc comment and the commit message

`lib/clinicCapabilities.ts:170-174` and commit body §2 both state that touching a clinical flag is
prevented **by the type**, "не по обещанию" (not by promise). Disproved with the compiler, outside the
repo, `--strict`:
```ts
export function alsoClinical<F extends { hasMarketingModule: boolean }>(flags: F): F {
  return { ...flags, hasOrthodontics: false };   // ← compiles. tsc --noEmit --strict, TRUE_EXIT=0
}
```
and at runtime `alsoClinical<Flags>({hasMarketingModule:true, hasOrthodontics:true})` →
`{"hasMarketingModule":true,"hasOrthodontics":false}`. The generic constraint restricts what callers
may pass in; it does **not** restrict which keys the body may override. What actually protects the
clinical flags is the three-line implementation plus `assert.deepEqual(touched, [])` in the test — i.e.
a promise plus a test, which is fine, but is not what the comment says. The previous reviewer blessed
this claim ("really does make touching a clinical flag a type error rather than a promise"); that
blessing was wrong.

Why this matters beyond pedantry: the next editor reads that comment, believes the compiler is the
guard, and stops writing the test that is the actual guard.

## 6. UNIT PROOF — REPRODUCED, byte for byte, and every measurement re-derived

The packet's literal command is **red at HEAD**:
```
$ cd apps/web && node --import tsx --test src/__tests__/clinicModeSurface.test.ts
ERR_UNKNOWN_FILE_EXTENSION ".css" → src/components/workspaceActions/workspaceActions.css
TRUE_EXIT=1  (tests 1 / pass 0 / fail 1)
```
Ownership measured, not assumed: `git log --diff-filter=A` puts that CSS file in **`f0121f0c2`**, i.e.
after the attacked commit; `git log -S'components/workspaceActions/WorkspaceActions' --
apps/web/src/workspaceShell.tsx` puts the importing line in the same commit; and
`git show 7483b4082:apps/web/src/workspaceShell.tsx | grep -i workspaceActions` → **no match**. The
packet's attribution and escalation are correct; the red is not X2's.

Re-ran with a CSS-stub ESM loader written **outside the repository** (`%TEMP%/x2rev/*.mjs`; no source
touched, no repo file added):
```
$ node --import tsx --import file:///C:/Users/Admin/AppData/Local/Temp/x2rev/reg.mjs \
       --test src/__tests__/clinicModeSurface.test.ts
tests 11 / pass 11 / fail 0    TRUE_EXIT=0
```
Printed output matches the packet's quotes exactly, including `ВИДИТ ОТДЕЛЬНЫЙ ВРАЧ (26)`,
`ВИДИТ СЕТЬ ФИЛИАЛОВ (36)` and the ten-item `РЕЖИМ УБРАЛ` line verbatim.

Note for the lead: `apps/web/testCssStub.mjs` is now **tracked**, and `apps/web/package.json`'s `test`
script already loads it, so the working closing command is `npm test -w @dental/web` — not the packet's
bare `node --import tsx --test` form, which will stay red.

Re-derived from the printed lists: rail **12 vs 14**; roles **2 vs 5** (`doctor, owner`), `one_chair` 4,
`small_clinic`/`network_clinic` 5; capabilities **3 vs 7**; flags **9 of 10**, exactly one lowered.
12+2+3+9 = **26**, 14+5+7+10 = **36**. The arithmetic closes.

Assertions are real, not decorative: the subset check is per-entry **by name** in a loop, `assert.equal`
on identity is strictEqual so the reference-preservation claim is genuinely tested, and
`assert.deepEqual(touched, [])` is a real assertion over a computed list. Fixtures exist:
`ModuleFlagFixture` is `Pick<WorkspaceFeatureFlags, …>` over ten keys that all exist, so a renamed flag
breaks compilation. No cycle-7 "fixtures the packet itself deleted" pattern.

Sibling: `node --import tsx --test src/tests/clinicCapabilities.test.ts` → **15/15, TRUE_EXIT=0**.
`staffRoleChoices` — the function this commit wires in — is covered there by seven assertions including
the stranded-role case.

Stated caveat, not a defect: `railFor` unions rail views over the roles visible in that mode, so the
12-vs-14 number blends mode filtering with role filtering. Visible in the test source, and the per-entry
subset assertion does not depend on it.

## 7. GATES I RAN THAT THE BUILDER WAS FORBIDDEN TO RUN (§7a)

| Gate | Result |
|---|---|
| `npm run typecheck -w @dental/web` | **TRUE_EXIT=0** |
| `npx tsc -b apps/web --noEmit --force` (incremental no-op ruled out) | **TRUE_EXIT=0, zero output** |
| `npm test -w @dental/web` (whole suite) | **tests 610 / pass 610 / fail 0, TRUE_EXIT=0** |
| `node scripts/check-css-tokens.mjs` | exit 0, `НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ: 0 имён, 0 вхождений` |
| `npm run smoke:web-text-encoding` | exit 0, `ok:true, mojibakeHits:0, requiredSnippets:13`, **checkedFiles 431** |
| `node scripts/smoke-workspace-shell-source.mjs` | exit 1, same two reds |
| `GET 127.0.0.1:4100/api/health` / `/api/dashboard` | **200** `{"ok":true,…}` / **401**. Confirms the packet's narrow claim |
| `npm test -w @dental/api` | **NOT RUN**, deliberately: the commit touches zero API files, and another author holds `apps/api/src/tests/webCallsExistingRoutes.test.ts` dirty against the single shared PostgreSQL instance (§7a, one writer per gate). Running it would have produced a number about someone else's edit. |

So the packet's largest NOT-PROVEN item closes **in its favour**: the App.tsx edit compiles.

Both smoke reds re-measured and both are **not** the packet's:
- Red #1 is a CRLF artefact, exactly as claimed. The smoke requires the LF literal
  `".nav-copy small {\n    display: none;"`; `styles/main.css` is CRLF and **does** contain the rule
  (4th of 4 occurrences of `.nav-copy small`, inside a media query). My measurement: `has CRLF: true /
  LF literal match: false / CRLF literal match: true` — byte-identical to the packet's. `main.css` and
  the smoke script were both last touched long before this packet.
- Red #2 is real and pre-existing: `ScheduleView.tsx:255`
  `?.scrollIntoView({ behavior: "smooth", block: "center" })`, 1 hit. `ScheduleView.tsx` appears in
  none of `f1c00a496`, `6dbd592b5`, `7483b4082` (`git diff --name-only` on each).

## 8. F4 (MEDIUM) — `checkedFiles: 433` is not reproducible, and it convicts a correct number

The smoke walks the **filesystem** (`scripts/smoke-web-text-encoding.mjs:19-30`, `readdirSync` over
`apps/web/src`), so its count includes untracked files and reflects whoever's work is on disk. Measured
four ways:
```
filesystem walk now (matches the smoke's 431)                : 431
tracked at HEAD 1d22de291                                     : 430
tracked at the attacked commit 7483b4082                      : 428
untracked matching files under apps/web/src right now         : 1   (430 + 1 = 431 ✓)
```
**433 is not a property of this commit at any point.** It was a true reading of a transient tree that
contained other authors' uncommitted files during the `f0121f0c2` window (which added four
`workspaceActions` files while four `floatingCorner` files still existed on disk). The packet's REWORK
DISPOSITION §3 declares W2's 429 "stale", asserts "checkedFiles is now 433", and instructs the lead to
copy that correction into `.agents/archon/progress.md`. **Do not.** Keep the other half of that
correction, which is true and useful: `requiredSnippets: 13` IS in the real output and W2 presented a
paraphrase as a quote.

## 9. WHAT I TRIED TO REFUTE AND COULD NOT

- **The architectural justification is TRUE at HEAD.** `git show HEAD:apps/api/src/routes/workspaceProfile.ts`:
  `GET /api/workspace/profile` returns a literal 19-field object with no database read, and cited line
  **`:451` is exactly `hasMarketingModule: true`** — the citation is exact. `POST /api/workspace/profile`
  destructures **17 flags and persists none** (`.set({ updatedAt: new Date() })`, then
  `reply.send({ ok: true })`). So §10 holds: no invented backend contract, and "reconcile downward only"
  stands on real ground. **Time bomb:** another author's dirty edit to that file makes GET read
  `organizations.workspace_feature_flags` and POST merge-and-persist. The moment it lands, three long
  doc comments (`clinicCapabilities.ts:162-168`, `useWorkspaceProfile.ts:150-160`, the test's fixture
  comment) describe a facade that no longer exists.
- **No orphan created by this commit, no dangling deletion.** `applyClinicModeToFlags` → used at
  `useWorkspaceProfile.ts:182` and six times in the test. `staffRoleChoices` → `App.tsx:2063`,
  `workspaceShell.tsx:488` (HEAD), `InlineStepRole.tsx:37`. The `hasCapability` import it removed from
  the hook is still consumed by `CommunicationsView.tsx:355` and `ManagerReportsPanel.tsx:166-167`.
- **§11 wiring is real** (earlier commit, not this one). At HEAD: `workspaceShell.tsx:261` mode read,
  `:262` rail filter, `:283` hidden-by-mode, `:286` `describeHiddenCapabilities`, `:287` the sentence,
  **rendered at `:367`** gated on `!collapsed`. Not orphaned.
- **Hygiene.** `--numstat` = 28/2 + 132/1 + 9/9 + 36/0 = **205 insertions / 12 deletions**, exactly as
  claimed. App.tsx has **exactly 4 hunks** (`@@ -323`, `@@ -2041`, `@@ -2168`, `@@ -2525`), all the
  packet's. Four files, no foreign file, no `dist`, no `.tsbuildinfo`, no `.data`. `git merge-base
  --is-ancestor 7483b4082 HEAD` → 0. Round-trip mojibake test on all four files and the commit message
  → `mojibake: false`, no BOM, no `U+FFFD`. Zero hardcoded hex and zero `px` in the added lines
  (`git show | grep '^+' | grep -Ei '#[0-9a-f]{3,6}|[0-9]+px'` → empty). Conventional Commits with a WHY
  body (§12). Nothing to complain about.
- **`selectedWorkspaceRole` really is `any`** (`store/appStore.ts:28`), as the packet disclosed — so the
  third argument is accepted without type safety. Honest disclosure, confirmed.

## 10. CORRECTIONS TO THE PREVIOUS REVIEWER (its numbers were not safe either)

1. **`staffCreationRoles` is NOT "four live copies".** Measured per file: `SettingsAuditTab.tsx:247` and
   `SettingsImportsTab.tsx:241` each contain **exactly one** occurrence — the declaration, never used.
   `SettingsViewHelpers.tsx:13` exports it with **zero consumers**. `LegacyMigrationStudio.tsx:227` and
   `SmartImportStudio.tsx:231` are `_`-prefixed dead. The **only** live one is
   `SettingsClinicTab.tsx:238`, rendered at `:592` — which is exactly what the packet handed over, with
   the correct addresses and a correct "one call" fix. **The packet was right; the previous reviewer
   over-counted.**
2. **The `SettingsView.tsx:1201/:1512` citations are not drift.** They were already wrong **at the
   attacked commit**: `git show 7483b4082:apps/web/src/SettingsView.tsx` gives **1200** and **1515**, the
   same as HEAD. Inaccurate when written, in four places including two production doc comments. (The
   `workspaceShell.tsx:487` citation, by contrast, is exact at the commit; it is 488 at HEAD.)
3. `checkedFiles` is **431** on disk / **430** tracked at today's HEAD, not the 429 that reviewer
   measured five commits ago. Its conclusion (433 is wrong, 429 was right for its time) survives.
4. The whole web suite is **610/610** at this HEAD, not 604.

## 11. ESCALATION FOUND WHILE PROBING THE PACKET'S DECLARED DEBT (not X2's, but it is the §5 core)

The packet declared, honestly, that it had **not probed** whether the second mode widget's draft reaches
the server (`SettingsClinicTab.tsx:330`). I probed it. **It does not.**
- `SettingsClinicTab.tsx:256` is the real four-mode `.mode-grid` → `changeClinicMode(mode)` → server.
- `SettingsClinicTab.tsx:319-346` is a second, two-option widget (`solo_doctor` / `small_clinic` only)
  whose buttons call `updateClinicProfileDraft("mode", …)`, with inline `px`, inline `fontSize` and a
  literal `'#fff'`.
- `buildClinicProfileUpdatePayload` (`AppHelpers.tsx:4893-4924`) builds the save payload and **has no
  `mode` field at all**. `clinicProfileDraftSignature` is `JSON.stringify` of that same payload, so
  clicking those chips does not even mark the draft dirty — no save is attempted and no error is shown.

So on the settings tab that the whole campaign is about, there is a live-looking control for the clinic
mode that lights up and saves nothing. That is a zero-mocks / §1 violation on the exact §5 surface, and
it is worse than "a decoy". It belongs in the ledger with an owner.

## 12. WHAT IS GENUINELY GOOD (stated because it is true and measured)

- The extraction is real work: a product rule moved out of a React hook body into a place where three
  assertions can hold it, and the behaviour is byte-identical to the expression it replaced (I diffed
  the old ternary against the new function — same short-circuit order, same identity on the no-change
  path, `useMemo` deps changed from `marketingFitsMode` to `clinicMode`, both stable).
- The test prints both surfaces in full, as the brief demanded, and the subset check is per-entry by
  name — the cheap version would have passed with the wrong ten items removed.
- Not one clinical section or clinical flag is gated; all six of each are asserted present for a solo
  dentist, and `getFilteredAppViews` is deliberately left mode-blind so `#marketing` still opens:
  hiding, not deleting (§4). The `in`-operator prototype trap in `isClinicMode` is a real trap really
  avoided.
- Reporting is honest where it counts: it corrected two of W2's claims, refused to claim UI or DB
  verification, labelled its esbuild run "syntax only" rather than calling it a typecheck, disclosed
  that its own proof was not re-runnable and why, named the collision without touching it, and declared
  the debt it could not fix with exact addresses. **The parts of the report that are wrong are wrong by
  under-measurement, not by invention.** That distinction is why this is NEEDS_REWORK and not REVERT.

---

## REQUIRED REWORK (numbered, actionable)

1. **Withdraw `REACHABILITY VERIFIED`.** `git grep -rn "WorkspaceOnboardingNoticeBars" -- .` returns one
   line: its own declaration. Record `WorkspaceOnboardingNoticeBars` → `WorkspaceOnboardingInline` →
   `InlineStep*` as an orphaned decomposition under §5, name the number of inline steps stranded, and
   state that `6dbd592b5` fixed a dead file — or adopt the component in `App.tsx:2450`/`:2470` and delete
   the duplicate.
2. **Declare `App.tsx:2551` unreachable instead of delivered, on the simple ground:** `onboardingSteps`
   (`AppHelpers.tsx:6107`) has no `role` entry and **no writer anywhere sets `onboardingStep` to
   `"role"`**. Then restate the delivery honestly: **1 of the 2 pickers in this commit is live; 2 of 4
   across the packet** (`App.tsx:2194` and `workspaceShell.tsx:488`).
3. **Delete the false type claim** from `lib/clinicCapabilities.ts:170-174` (and note the commit message
   cannot be rewritten). Counter-example, `--strict`, exit 0:
   `function f<F extends {hasMarketingModule:boolean}>(x:F):F { return {...x, hasOrthodontics:false}; }`.
   Replace with what is actually true: the implementation touches one key and
   `assert.deepEqual(touched, [])` is what holds it.
4. **Keep 433 out of the ledger.** `checkedFiles` = **428** at `7483b4082`, **430** tracked / **431** on
   disk at HEAD. W2's 429 was right for its time and must not be recorded as stale. Keep the true half
   (`requiredSnippets: 13`).
5. **Give the wizard role picker the sentence the rail already has** (`App.tsx:2184-2196`): one line
   naming the mode and a path to change it, because the fullscreen wizard has **no clinic-mode step at
   all** (its `intro` mode-grid is demo-vs-clean, not clinic mode). §3.
6. **Re-point `SettingsView.tsx:1201/:1512` → `1200/1515`** in all four places; they were wrong when
   written, not stale.
7. **Escalate the database default as the real §5 blocker.** `apps/api/src/db/schema.ts:228` defaults
   `clinic_mode` to `'demo'` — a value outside `clinicModeSchema`, coerced to `one_chair` at
   `domainStateHydration.ts:350`. All four live organisations hold it, and so will every new one. Until
   that default is a real mode, the campaign's gating is invisible by construction and this commit's
   entire visible effect is one missing role chip. Also fix the `// demo, single, network` comment on
   that line: a third mode vocabulary agreeing with neither `clinicModeSchema` nor `clinicModeLabels`.
8. **Open a ticket for the fake mode control** (§11 above): `SettingsClinicTab.tsx:319-346` writes
   `clinicProfileDraft.mode`, and `buildClinicProfileUpdatePayload` (`AppHelpers.tsx:4893`) has no `mode`
   field — the chips save nothing and do not even dirty the draft. Not X2's file; it is the §5 surface.

## FOR THE LEAD — commands, with what I already measured

| Command | My result |
|---|---|
| `npm run typecheck -w @dental/web` + `npx tsc -b apps/web --noEmit --force` | **exit 0, clean** — done, no need to repeat |
| `npm test -w @dental/web` | **610/610, exit 0** — use this, the stub is tracked now |
| `cd apps/web && node --import tsx --test src/tests/clinicCapabilities.test.ts` | **15/15, exit 0** |
| the packet's bare `node --import tsx --test src/__tests__/clinicModeSurface.test.ts` | **exit 1**, `.css` loader — superseded by the npm script |
| `node scripts/check-css-tokens.mjs` | exit 0 |
| `npm run smoke:web-text-encoding` | exit 0, `checkedFiles: 431` (not 433) |
| `node scripts/smoke-workspace-shell-source.mjs` | exit 1, both reds pre-existing and not the packet's |
| `SELECT id, clinic_mode FROM organizations;` | 4 rows, all `'demo'`; column default `'demo'::text` |
| `npm test -w @dental/api` | NOT RUN — zero API files touched, and another author holds an API test file dirty against the shared database |

UI VERIFIED remains yours. Before capturing: with `clinic_mode='demo'` you are looking at `one_chair`,
where **nothing leaves the rail**, the explanation sentence does not render at all (it is gated on
`hiddenByMode.length > 0`), and the only difference is the missing «Управляющий» chip. To see the 26-vs-36
surface you must pick «Отдельный врач» yourself.
