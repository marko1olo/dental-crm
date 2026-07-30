# ADVERSARIAL REVIEW — Y3-mount-chain-guard

Reviewer: adversarial critic (did not write this code). Target commits:
`ab33125957d739350fd7166c2f67fd9a3a00d18e` (deletion, 10 files) and its parent
`75db7eb5d508343b57831df41ef95d9c53da94f4` (the guard, 3 files).
VERDICT: **NEEDS_REWORK** — the deletion half is sound and better proven than claimed; the guard half
has a proven false-negative class covering 19% of the components, three live misses in the repo today,
and one proof claim that is simply false.

Every command below was run by me and its TRUE exit code captured.

---

## PART 1 — WHAT SURVIVED THE ATTACK (claims I reproduced)

### C1. Guard output reproduces exactly
`node scripts/check-component-mount-reachability.mjs`, my run, **TRUE_EXIT=1**:
368 scanned / 153 component files / 159 declared / 257 reachable / `App.tsx достижим да` /
`workspaceShell достижим да` / 128 rendered / 1 lazy / 0 by-value / 0 declared-never / 0 imported-never /
19 orphaned / 11 unreachable-subtree / 0 test-only. `ИТОГ: нарушений 30, в исключениях 0`.
Byte-identical to the claim.

### C2. The defect WAS real at the parent, and the guard fires on it
`git archive 75db7eb5d apps/web/src scripts` extracted to `%TEMP%/y3parent` (outside the repo); guard run
there: **TRUE_EXIT=1**, naming `apps/web/src/components/workspace/WorkspaceOnboardingNoticeBars.tsx:5`
`orphaned`, and `WorkspaceOnboardingInline.tsx:13` plus all eight `InlineStep*` as
`rendered-only-inside-an-unreachable-tree`. The gate demonstrably goes red on the reintroduced defect.

Clean-tree re-derivation (both trees from git, my instrument, not the dirty worktree):
parent = 379 files / 169 components / **41** violations (21 orphaned + 20 subtree);
HEAD = 369 files / 159 components / **31** violations (20 orphaned + 11 subtree).
Delta exactly **−10**: −1 orphan (NoticeBars) and −9 subtree (Inline + 8 InlineStep*). The builder's
40 → 30 is the same delta measured against their dirty worktree; the +1 offset is
`components/schedule/WaitlistDrawer.tsx`, revived by another agent's uncommitted edit.

### C3. The mount chain is real, link by link — I checked every link
- `apps/web/src/main.tsx:35` `createRoot(document.getElementById("root")!).render(<React.StrictMode><AppShell /></React.StrictMode>)` — the only `createRoot` call.
- `main.tsx:3` `import { AppShell } from "./AppShell"`.
- `AppShell.tsx:79` `export function AppShell()`.
- `AppShell.tsx:6` `const DentalWorkspace = lazy(() => import("./App").then((module) => ({ default: module.App })))` — verbatim.
- `App.tsx:957` `App` FunctionDeclaration spanning 957–4875 (structural, `@babel/parser`).

### C4. The gate arithmetic is right, and it corrects the dossier
Structural check with `@babel/parser` (`%TEMP%/y3-enclosing.mjs`): `App` is a single FunctionDeclaration
957–4875 whose body has exactly one direct `return` (line **2337**) plus if-returns at 2014, 2026,
**2069**, 2307, 2318, 2333. Therefore lines 2450 / 2470 / 2551 / 3471 / 3483 all sit inside the JSX of
the single main return at 2337, reachable only if the `if` at 2069 did NOT fire.

- `App.tsx:2007-2010` — `isLocalOnboardingDismissed` reads `dental-crm:onboarding:v1` (unscoped) OR
  `dente_ui_preferences_v1`.
- `App.tsx:2069` — `if (!onboardingDismissed && !isLocalOnboardingDismissed) return <fullscreen wizard>`.
- `App.tsx:2450` gate — `!onboardingDismissed && !showFullOnboardingGuide && !isLocalOnboardingDismissed`,
  the exact negation of the entry condition. **2450–2468 is dead in every state.** CONFIRMED; the dossier's
  "2551 is the dead branch" was wrong and the builder's correction is right.
- `useAppLogic.tsx:13669-13673` — `showFullOnboardingGuide = !onboardingDismissed && currentView ===
  "settings" && settingsTab === "clinic" && onboardingGuideExpanded`. Combined with the entry condition,
  the block `2470–3468` (which contains the role picker at 2543/2551) renders exactly when
  `!onboardingDismissed && isLocalOnboardingDismissed` — a stale key or a harness seed. CONFIRMED.

### C5. "Nothing is lost" — verified mechanically, not read
`%TEMP%/y3-lostui.mjs`: `@babel/parser` over all ten deleted files (dumped from the parent commit),
extracting every Cyrillic-bearing StringLiteral / JSXText / template chunk — **176 strings across the ten
files. Missing from `App.tsx`: 0. Missing from the whole `apps/web/src` tree: 0.** Every user-visible
string of the deleted chain exists verbatim in the surviving code. The four `NoticeBars` sections are in
`App.tsx` at 2450 (compact strip, identical text), 2470 (the wizard), 3471 (draft strip, identical gate
AND text) and 3483 (requisites strip, identical gate AND text). The "gates are strictly weaker" claim also
holds: `NoticeBars:26` lacks the `!isLocalOnboardingDismissed` term that `App.tsx:2450` carries, so
mounting would resurrect a strip `App.tsx` suppresses.

### C6. The deletion is clean repo-wide
`git grep -n "<Base>" HEAD -- .` for all ten names: only prose remains —
`.agents/archon/cycle9.workflow.js` (this packet's own brief) and the explanatory header of
`scripts/check-component-mount-reachability.mjs`. Six of the ten names have **zero** references anywhere.
No leftover directory on disk (`components/workspace/onboarding/inline` is gone), no orphaned CSS.

### C7. All 19 orphan verdicts are correct — zero false positives
Independent importer census (`%TEMP%/y3-importers.mjs`, `@babel/parser` import declarations + dynamic
`import()` scan, resolved with the same candidate order the guard uses): every one of the 19 has
**static-importers=0, dynamic=0**. The guard's orphan column does not cry wolf.

### C8. The localStorage analysis is right, and better than the brief's
`saveOnboardingDismissed` (`AppHelpers.tsx:4259+`) writes **only** `onboardingLocalKey(organizationId)`
= `dental-crm:onboarding:v1[:<orgId>]`; `loadOnboardingDismissalState` (`AppHelpers.tsx:4225`) reads
scoped first, unscoped as legacy fallback. So `App.tsx:2009`'s unscoped read silently misses for any
clinic that has an `organizationId`, and `App.tsx:2010`'s `dente_ui_preferences_v1` has exactly ONE
reference in `apps/` — that read (64 files repo-wide write it, all under `scratch/` and `scripts/`).
The brief's "the real key is `dental-crm:web-ui-preferences:v1` at AppHelpers.tsx:687" pointed at
`uiPreferencesStorageKey`, a different bag; the builder's correction is correct.

### C9. Gates I ran that the builder was forbidden to run
| command | TRUE_EXIT | result |
|---|---|---|
| `node scripts/check-component-mount-reachability.mjs` | 1 | as claimed, red by design |
| `node --import tsx --test scripts/tests/check-component-mount-reachability.test.mjs` | **0** | tests 6, pass 6, fail 0 |
| `npm run smoke:web-text-encoding` | **0** | `ok:true, checkedFiles:421, mojibakeHits:0, garbledQuestionHits:0, requiredSnippets:13` |
| `npm run check:encoding` | **0** | 2092 files, no findings |
| `npm run typecheck -w @dental/web` | 1 | **10 errors, NONE from this packet** — see below |
| `npm test -w @dental/web` | 1 | tests 620, pass 618, **fail 2, both in a neighbour's file** |

Both gate failures are provably a neighbour's in-flight work, not Y3's. Every typecheck error is
`'title' does not exist in type 'PanelSubject'` / `'retryable' does not exist on type 'PanelText'`.
`git show HEAD:apps/web/src/lib/panelStateText.ts` has `readonly title: string` at line 69; the **dirty
worktree** copy has replaced it with a whole-sentence field and renamed `retryable`→`retryLabel`, and its
six consumers are not yet updated. `git status`: ` M apps/web/src/lib/panelStateText.ts`. The two failing
tests are both `src/lib/panelStateText.test.ts`. Zero occurrences of `WorkspaceOnboarding` / `InlineStep`
anywhere in either gate's output — **the 10-file deletion breaks no type and no test.** The builder's
"reasoned, not run" zero-risk argument is now RUN and confirmed.

### C10. Git hygiene — immaculate
`git show --name-status`: commit 1 = 3 `A` files, all under `scripts/`; commit 2 = 10 `D` files, all the
claimed onboarding chain. No `apps/api/.data/*.json`, no `tsbuildinfo`, no `scratch/**`, no
`packages/shared/dist`, nothing from another author. The neighbour's staged `git rm` of
`apps/api/src/db/rebookingConversionRulesQuery.ts` and
`apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx` is still staged and still absent
from both commits. Conventional Commits satisfied, Russian subjects name the DEFECT, bodies explain WHY.
Encoding round-trip on all three new files and both commit messages: `validUtf8=true bom=false
mojibake=false U+FFFD=false`. Packet notes left untracked on disk as claimed.

---

## PART 2 — WHAT DID NOT SURVIVE

### F1 (SEVERE). The guard is blind to 38 of 197 component declarations, and misses THREE live orphans today
Independent census with `@babel/parser` (`%TEMP%/y3-census.mjs`): **198 exported PascalCase declarations
containing JSX** under `apps/web/src` — 197 real, plus one false positive of mine
(`SharedOnboardingUI.tsx:18 SPECIALIZATIONS`, an array holding icon JSX). The guard's `component-decl`
rule matches **159**. The gap is exact and structural:

- **37** are `export const Name: React.FC<...> = (...) => {...}` — the pattern
  `export const $NAME = ($$$PARAMS) => $$$BODY` has no slot for a type annotation on the binding.
- **1** is `export function Name(...): JSX.Element {...}`
  (`components/workspaceActions/WorkspaceActions.tsx:317 WorkspaceActionsMount`) — no slot for a return type.

Verified at the rule level, not inferred: `npx ast-grep scan --rule scripts/lib/component-mount-rules.yml
--json=compact apps/web/src` yields 159 `component-decl` matches in 153 files, and
`ConsentTemplateEditor.tsx`, `PublicBookingWidget.tsx`, `ComparativePlannerDashboard.tsx`,
`WorkspaceActions.tsx`, `PanelLoadFailure.tsx`, `PatientFamilyCard.tsx` are all absent from the match set.

**Three of the 38 are dead right now and the guard says nothing:**

| file:line | every reference in the whole repo |
|---|---|
| `apps/web/src/components/ConsentTemplateEditor.tsx:4` | its own declaration + its own `import './ConsentTemplateEditor.css'`. Zero importers. |
| `apps/web/src/pages/PublicBookingWidget.tsx:46` | its own declaration + its own CSS import + a **comment** at `apps/api/src/server.ts:442`. Zero importers. |
| `apps/web/src/components/plan/ComparativePlannerDashboard.tsx:125` | its own declaration + a **comment** at `components/odontogram/OdontogramModule.tsx:442`. Zero importers. |

That is the identical fingerprint of the incident this packet exists to prevent — "exactly one reference
in the entire repository, its own declaration". Falsification fixture (`%TEMP%/y3-fn-orphan`, outside the
repo): the builder's own healthy 3-link app plus `export const OrphanFc: React.FC = () => <span/>` and
`export function OrphanRet(): JSX.Element {...}`, imported by nobody →
`просмотрено файлов 6 · файлов с компонентами 3 · компонентов объявлено 3 · ИТОГ: нарушений 0`,
**TRUE_EXIT=0. GREEN on two orphans.**

Had `WorkspaceOnboardingNoticeBars` been written as `export const WorkspaceOnboardingNoticeBars:
React.FC<Props> = ...` — the form 37 files in this repo already use — **this guard would have reported
nothing.** The handoff declares three precision boundaries (camelCase bindings, re-export name lists,
same-file render) and not this one, which is by far the largest; the "negative control" it describes tested
only that non-components are excluded, never that real components are included. The headline
"30 violations of 159 components" understates the denominator by 19%.

### F2 (SEVERE, FALSE PROOF CLAIM). A reasonless allowlist entry silently turns the gate green
CLAIMED PROVEN: "Proves an allowlist entry only clears a violation together with a non-empty reason."
**No such enforcement exists.** `allowlistEntryFor()` matches `path` prefix only; `findings` drops the
verdict on any match; and `const allowed = verdicts.filter((v) => v.allowlistReason)` then discards the
entry from the exception count because `""` is falsy.

Reproduced twice on copies outside the repo:
1. `%TEMP%/y3-allowlist` — 3-link app + one orphan + `{ path: "apps/web/src/components/Orphan", reason: "" }`.
   Output prints `[НАРУШЕНИЕ] apps/web/src/components/Orphan.tsx:1 Orphan` and then
   `ИТОГ: нарушений 0, в исключениях 0`, **TRUE_EXIT=0**. A self-contradictory report with a green exit.
2. `%TEMP%/y3-blanket` — the **real clean HEAD tree** + `{ path: "apps/web/src", reason: "" }`. Per-state
   table still honestly shows 20 orphaned + 11 unreachable-subtree; footer says
   `ИТОГ: нарушений 0, в исключениях 0`; **TRUE_EXIT=0**. All 31 violations silenced by four lines, with
   no `разрешено` marker and no reason recorded anywhere.

The commit message boasts there is deliberately no `--root` escape hatch "иначе им можно было бы навести
проверку на пустой каталог и получить зелёный". The hatch it does ship is cheaper: no flag, no trace in
the exception count. The test that allegedly forbids it only asserts that the single hand-written entry in
the shipped array happens to have a non-empty string — a test asserting an invariant the code does not
implement. On this campaign's charge sheet, that is the disease itself.

### F3. The guard is wired to nothing — a gate nobody runs
`grep -c reachability package.json` = **0**. No `.github/`, no `.gitlab-ci.yml`. Whole-repo
`git grep -n "check-component-mount-reachability" HEAD -- .` returns **only the guard's own three files**.
`npm run lint` = `check:encoding && typecheck`; `npm test` = the three workspace suites. Its unit test is
equally unreferenced — there is no `test:scripts` script, and on my host that suite takes **4m33s**, not
the "~11–23 s" the packet quotes. The brief's words were "it must become visible to a gate"; the delivered
artefact is visible to nobody but a human who remembers the path. The real obstacle is legitimate and
unstated: the guard is red on arrival, so it cannot be wired into `lint` without either an allowlist
campaign or a documented `--baseline N` ratchet. That decision is exactly what should have been named.

### F4. TWO pre-existing owners of this exact invariant, both running, neither declared
1. `apps/web/src/tests/panelsAreMounted.test.ts` (217 lines) opens with "Страж: панель или раздел,
   которых никто не отрисовывает, — это несделанная работа" and cites the same `AppRouter.tsx` incident
   the new guard cites as reason #1. Textual, hand-lists 7 panels.
2. `apps/web/src/tests/documentsViewDecomposition.test.ts` contains a suite literally named
   **"в каталоге документов нет незамеченных сирот"** — an orphan gate for the documents directory, with a
   **named exception list carrying prose reasons**, i.e. the same design the new guard reimplements
   globally.

Unlike the new guard, both of these actually **run**, inside `npm test -w @dental/web`. Neither the
handoff nor either commit body mentions either of them. AGENTS.md §6 mandates a global census for legacy
systems before building a new one; there is no census here.

Two concrete consequences, not stylistic ones:
- The same component now has two contradictory verdicts. `DocumentUkepSignButton.tsx` is
  `[НАРУШЕНИЕ] orphaned` in the new guard, and in `documentsViewDecomposition.test.ts:170` it is an
  **accepted exception with a written reason** ("Путь на сервере рабочий … Подключить её — это НОВАЯ
  возможность на экране"). One invariant, two owners, opposite answers — the same pathology this packet
  correctly diagnosed for the onboarding localStorage keys.
- Three of the seven panels the old test protects — `PatientDuplicateAlert`, `RecallListPanel`,
  `FreedSlotsPanel` — are `React.FC`-annotated and therefore **invisible to the new structural guard**.
  The old text-based guard is currently the only thing covering them.

### F4a. The single-entry topology is correct — one attack that failed
I expected a second bundle entry to turn `GuestLabPortal` / `OnboardingPreview` / `PublicBookingWidget`
into legitimate roots and the guard's orphan column into noise. It does not: `git ls-files apps/web` has
exactly one `.html` (`apps/web/index.html`), `vite.config.ts` declares no extra `rollupOptions.input`, and
`rg createRoot apps/web/src` returns only `main.tsx:2` and `main.tsx:35`. `TOPOLOGY.entry` is right and the
refusal to declare `App.tsx` / `workspaceShell.tsx` as roots is a genuinely good decision.

That check did surface one more piece of evidence for F1, though: `apps/api/src/server.ts:457` really does
`await app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" })`. So the public booking
**backend is live** while its only front end, `pages/PublicBookingWidget.tsx:46`, is an orphan the new
guard cannot see — the identical shape as the `DocumentUkepSignButton` case the older test documents.

### F5 (nits)
- **Dead code left in limbo.** `App.tsx:2450-2468` is proven dead in every state and was not removed;
  `App.tsx:2470-3468` (~1000 lines, the second wizard) is reachable only via a key nothing in `apps/`
  writes. Both are recorded as debt with a real reason (packet scope said "NOT App.tsx unless clean and
  strictly required"; removing the `isLocalOnboardingDismissed` reads changes behaviour and would blind
  60+ harness scripts). §1's no-limbo rule is bent, not broken — but the repo still holds two first-run
  wizards in `App.tsx` and a third dead one (`OnboardingPreview` → `OnboardingSetupWizard` → `Step1..7`).
- **Absolute before/after numbers are not reproducible from git** — only the −10 delta is. 40/30 was
  measured against a worktree carrying neighbours' uncommitted edits; from the commits it is 41/31.
- **"145 single-quoted import lines"**: my `rg "^\s*(import|export).*from '"` gives **141 lines / 47
  files**. The file count matches exactly; the 4-line gap is multi-line import statements — the very
  instrument sensitivity this packet is about. Non-load-bearing.
- **"3 re-exports"** is right and my regex was wrong (it found 2, missing the multi-line
  `ctPlanningTools.tsx:20`); ast-grep's own `reexport-source` count is 3. Credit where due.
- **"45 dynamic import sites"** reproduces exactly: 51 total `import(` occurrences, of which 6 are in
  `src/tests/`.
- Neither commit carries the `[ARCHON]` subject prefix the three preceding commits use. More
  Conventional-Commits-correct, but a ledger that filters on the prefix will miss these two.
- **The orphan list is already drifting under the lead's feet.** Between my first and last `git status` in
  this review, neighbours staged `git rm` on `apps/web/src/components/patient/PatientCoreForm.tsx` — item 13
  of the guard's own 19-orphan list — and on `apps/api/src/db/patientCommunicationTimelinesQuery.ts`. Re-run
  the guard immediately before acting on any inventory line; do not act on the numbers in the handoff.
- I left no footprint: nothing written inside the repo except this file; every fixture lives under `%TEMP%`.
  The guard itself contains no `writeFile`/`mkdir`/`unlink` — read-only, confirmed by grep.

---

## REQUIRED REWORK
1. Teach `component-decl` the annotated forms: a variant with a type annotation on the binding
   (`export const $NAME: $TYPE = ($$$PARAMS) => $$$BODY`) and one with a return type
   (`export function $NAME($$$PARAMS): $RET { $$$BODY }`). Re-run and publish the new denominator (expect
   ~197, not 159). Add a positive-control test per form to
   `scripts/tests/check-component-mount-reachability.test.mjs` — the existing negative control is not
   enough.
2. Rule on the three orphans the fix will surface: `components/ConsentTemplateEditor.tsx:4`,
   `pages/PublicBookingWidget.tsx:46` — **do not simply delete this one**: `apps/api/src/server.ts:457`
   registers `/api/public/booking` for real, so this is a live backend with a dead UI, the mount-vs-delete
   call belongs to the lead — and `components/plan/ComparativePlannerDashboard.tsx:125`.
3. Make the allowlist reason load-bearing: reject an entry whose `reason` is missing/blank with exit 2, or
   count it as a violation. Then withdraw or rewrite the CLAIMED PROVEN sentence about the unit test, and
   make the test actually inject a reasonless entry and assert the guard refuses it.
4. Fix the report contradiction: a row printed `[НАРУШЕНИЕ]` must be counted in `ИТОГ`, and an allowlisted
   row must print `разрешено` plus its reason.
5. Wire the guard, or state in writing why it cannot be wired yet. Concretely: add
   `"check:mount-reachability": "node scripts/check-component-mount-reachability.mjs"` and
   `"test:scripts": "node --import tsx --test scripts/tests/*.test.mjs"`, and either accept red or add a
   declared, ratcheting baseline that can only decrease. Note the 4m33s runtime in `leadMustRun`.
6. Declare the relationship with `apps/web/src/tests/panelsAreMounted.test.ts`: retire its hand-kept
   7-panel list in favour of the structural guard, or record why both must exist. Until item 1 lands, the
   old test is the only thing covering `PatientDuplicateAlert`, `RecallListPanel` and `FreedSlotsPanel`.
7. Add the blind-spot section to the handoff's "Границы точности" list. An undeclared blind spot in a
   guard is what let this class recur three times.
