# ADVERSARIAL REVIEW — packet AA2-guard-root-cause
Commit under attack: 82fd6427916f8633afa37d5bf7a8b92441cbd8f1
Second commit: d635fa3f3 (handoff docs)
Reviewer: adversarial reviewer (did NOT write this code). Posture: disbelief.
Started: in progress. THIS FILE IS WRITTEN AS I GO.

## 0. COMPILE CHECK (cheapest, most important) — DONE
- `npm run typecheck -w @dental/web` => TRUE_EXIT=0
- Re-run non-incremental to defeat stale tsbuildinfo:
  `cd apps/web && npx tsc -b --noEmit --force` => TRUE_EXIT=0
- Verified the new files are INSIDE the program: apps/web/tsconfig.json `include: ["src","vite.config.ts"]`,
  and the new files are src/tests/utils/componentReachability.ts + src/tests/panelsAreMounted.test.ts.
  So exit 0 is not vacuous.
- NOTE: the 11 known panelStateText errors at dispatch are GONE at current HEAD (AA1's job, not AA2's).
- VERDICT so far: committed code is GREEN inside its own claim.

## 1. DIFF STAT (reproduced)
9 files, +1687 / -1573. Matches claim exactly.
Parent = 99e5cbcf4b4a1a6e4641a459a328a8fa03bd6efe.

## 2. CLAIMED PROOFS RE-RUN BY ME (TRUE exit codes)
- `cd apps/web && node --import tsx --import ./testCssStub.mjs --test src/tests/panelsAreMounted.test.ts`
  => pass 9 / fail 0, TRUE_EXIT=0. Printed `перепись: 315 файлов, 195 компонентов, 5074 мс`.
  Numbers 315/195 reproduce the claim exactly. Wall clock 5074 ms (claim said 3853/6699) — same order,
  machine-dependent, NOT a fabricated figure.
- `... --test src/tests/patientCardDecomposition.test.ts` => pass 9 / fail 0, TRUE_EXIT=0.

## 3. INDEPENDENT RE-DERIVATION — DIFFERENT INSTRUMENT
Builder used @babel/parser. I used the **TypeScript compiler API** (`ts.createSourceFile`) —
script at .agents/archon/packets/AA2-guard-root-cause/reviewer-census.mjs (read-only).
Result:
  REVIEWER_FILES=315            (census claims 315)  MATCH
  REVIEWER_COMPONENTS=195       (census claims 195)  MATCH
  REVIEWER_PARSE_DIAG_FILES=0   (no file silently skipped) MATCH
  SHAPES={"exportFunction":158,"annotatedConst":34,"plainArrowConst":1,"otherConst":0,"classDecl":2}

### DEFECT 1 — CONFIRMED, but the builder's ARITHMETIC IS WRONG
Confirmed real: deleted yml at parent 99e5cbcf4, `scripts/lib/component-mount-rules.yml` rule
`component-decl` holds exactly 4 patterns, all requiring a variable_declarator WITHOUT a
type_annotation child, and NO class pattern at all:
    - pattern: export function $NAME($$$PARAMS) { $$$BODY }
    - pattern: export const $NAME = ($$$PARAMS) => $$$BODY
    - pattern: export const $NAME = $WRAPPER($$$WRAPPED)
    - pattern: export default function $NAME($$$PARAMS) { $$$BODY }
And the two cited orphans are exactly the annotated shape:
    apps/web/src/pages/PublicBookingWidget.tsx:46  `export const PublicBookingWidget: React.FC = () => {`
    apps/web/src/components/plan/ComparativePlannerDashboard.tsx:150 same shape.
My exportFunction count = 158 = EXACTLY the number the old guard printed. So the guard saw the
function-declaration shapes and nothing else.

**MY CORRECTION TO THE BUILDER (finding, not fatal):** the builder claims
"Gap = the annotated shapes exactly." 195 - 158 = **37**, and annotated shapes are **34**.
The gap is 37: 34 annotated + 2 CLASS components + 1 plain arrow. The builder's own
INVENTORIES line says "155 x export function" where the true count is **158**, and it omits
class components entirely, so its shape inventory sums to 190, not its own 195.
The DEFECT is real and slightly WORSE than stated. The number 195 and the number 158 are both
exactly right; only the attribution between them is sloppy.

### DEFECT 2 — CONFIRMED at the parent, at the exact cited lines
Read from `git show 99e5cbcf4:scripts/check-component-mount-reachability.mjs` (758 lines):
  :194  `return ALLOWLIST.find((entry) => relativePath.startsWith(entry.path)) ?? null;`  <- PREFIX match
  :659  `if (allowed) {`                    <- truthiness on the ENTRY OBJECT
  :660  `verdict.allowlistReason = allowed.reason;`
  :738  `const mark = verdict.allowlistReason ? "разрешено" : "НАРУШЕНИЕ";`
  :758  `process.exit(findings.length > 0 ? FINDINGS_EXIT : 0);`
Traced by hand: with `reason: ""`, `allowed` is a truthy object so the verdict is filtered OUT of
`findings` (=> «нарушений 0», exit 0), while `verdict.allowlistReason` is `""` (falsy) so :738
prints `[НАРУШЕНИЕ]` for that same verdict. Both statements in one run. CONFIRMED.
Combined with the :194 prefix match, `{ path: "apps/web/src", reason: "" }` silences the entire
tree. CONFIRMED by reading the code, no run needed — the logic is unambiguous.

## 4. INVENTORY RE-DERIVED ITEM BY ITEM — EXACT MATCH
Reviewer instrument #2 (.agents/archon/packets/AA2-guard-root-cause/reviewer-falsegreen.mjs):
TypeScript compiler API + reachability walk at **DECLARATION granularity** (STRICTER than the
census, which scores render sites at FILE granularity), rooted at main.tsx MODULE SCOPE
(`createRoot(...).render(<AppShell/>)`), following lazy() proxies through
`import("./App").then(m => ({default: m.App}))`.
  REVIEWER_COMPONENTS=195
  REVIEWER_DECL_LEVEL_REACHED=250
  REVIEWER_COMPONENTS_NOT_REACHED=34
Diff against DECLARED_UNMOUNTED (2) + LEGACY_UNMOUNTED_BACKLOG (32) = union 34:
  only in my list  : NONE
  only in their list: NONE
**The 34-item inventory is correct item for item, under a different parser and a stricter
reachability model.** No site was missed. No false green found.

## 5. HYPOTHESIS I RAISED AND THEN DISPROVED
H: `componentReachability.ts:767` scores `renderedAsTag` as
`fileFacts.jsxTags.has(component.name) || binders.some(({edge,local}) => facts.get(edge.from)?.jsxTags.has(local))`
— that is FILE-level, so a component whose ONLY render site sits inside a DEAD sibling component
in a LIVE file would be scored `rendered` (false green).
RESULT: structurally real, but it DOES NOT MANIFEST on this tree. My declaration-granularity walk
is strictly tighter and still returns the same 34. Latent imprecision, not a current false green.
Reported to the lead as a known limit, not as a defect of this commit.

## 6. WOULD THE TEST FAIL IF THE FIX WERE REVERTED? — YES, PROVEN
My own controls, .agents/archon/packets/AA2-guard-root-cause/reviewer-controls.mjs, NO source edited:
the real census is loaded and the test's assertion logic re-applied to MUTATED inputs.
  C0 baseline            : appeared=0 stale=0 on the real tree (gate genuinely green)
  C1 legacy entry removed: FIRED -> appeared: components/HelpHUD.tsx:HelpHUD
  C2 mounted listed      : FIRED -> stale: AppShell.tsx:AppShell
  C3 BLIND CENSUS        : FIRED -> stale: ComparativePlannerDashboard, PublicBookingWidget
  C4 blank/whitespace    : FIRED -> emptyReasons on both entries
  C5 119-char reason     : FIRED -> shallowReasons
  C6 33rd legacy entry   : FIRED -> 33 entries at ceiling 32
  C7 entry on dead file  : FIRED -> missingFiles
  CONTROLS FIRED 7 / 7.  Census: files=315 parsed=315 components=195 reachable=257 ms=4152.
  duplicateComponentNames = 0 (no ambiguous by-name binding anywhere in the tree).

**C3 IS THE DECISIVE ONE.** Simulating the deleted guard's blindness (drop the
`export const X: React.FC` shapes) makes the `stale` assertion fire, because the two DECLARED
debts ARE that shape. So the @babel/parser upgrade is LOAD-BEARING: this test structurally
CANNOT pass on the old ast-grep instrument. This is not ceremony (§8).

## 7. DELETION VERIFIED REPO-WIDE — the hole that broke a smoke is closed
`git grep -n "check-component-mount-reachability" HEAD -- .` and same for `component-mount-rules`:
- ZERO package.json references (`git grep ... HEAD -- '*package.json'` empty).
- ZERO import/require/spawnSync/execSync sites (regex grep empty).
- All three files gone from disk (ls: No such file or directory x3).
- apps/web/src/components/reports/ManagerReportsPanel.tsx:595 — VERIFIED inside a `{/* ... */}`
  JSX COMMENT block (read :585-600). NOT user-facing text. Builder's claim holds.
- apps/web/src/pages/DoctorPayoutDashboard.tsx:8 — VERIFIED inside a `/** */` block comment.
- apps/web/src/tests/panelsAreMounted.test.ts:492-494 — string literals in the deliberate
  "guard must not come back" assertion. Intentional.
- I found ONE prose file the builder did not list: .agents/lead/done-payouts-screen.md:200-201.
  **BUILDER EXONERATED**: `git cat-file -e 82fd64279:.agents/lead/done-payouts-screen.md` => did not
  exist at that commit; added later by 0f8d7dac5. Its inventory was complete as of its own commit.
Nothing can fail at load. Deletion rule satisfied.

## 8. GIT HYGIENE — CLEAN
9 files, exactly the claimed set, nothing foreign:
  3 x .agents/archon/packets/AA2-guard-root-cause/* (state.md, commitmsg.txt, preserved diff)
  apps/web/src/tests/{panelsAreMounted.test.ts, patientCardDecomposition.test.ts, utils/componentReachability.ts}
  3 x deleted scripts/*
- NO apps/api/dist, NO tsconfig.tsbuildinfo, NO .data/ swept in (grep returned NONE).
- Author marko1olo. Conventional Commits: `[ARCHON] fix(гейты): ...` — subject names the DEFECT
  ("страж достижимости не видел пятую часть компонентов и гасился пустой причиной"), not the fix. §12 OK.
- Round-trip mojibake test on the subject => `mojibake: false`.
- No neighbour's work swept in despite a very dirty shared worktree (34 modified files at review time).

## 9. FULL WORKSPACE GATE — RED, BUT NOT AA2's
`npm test -w @dental/web` => tests 697, pass 696, **fail 1**, TRUE_EXIT=1.
The single failure is `в таблице стилей панелей нет зашитых цветов`
(apps/web/src/tests/operationsPanelsStyling.test.ts:88), asserting no hardcoded hex in
`apps/web/src/styles/dente-operations.css`.
**PROVEN NOT AA2's:**
- `git status --porcelain apps/web/src/styles/dente-operations.css` => ` M` — the file is DIRTY,
  uncommitted work-in-progress from a concurrent agent.
- `git show 82fd64279:apps/web/src/styles/dente-operations.css | grep -oE "#[0-9a-fA-F]{6}"` => EMPTY.
- Same at AA2's parent 99e5cbcf4 => EMPTY.
So at AA2's committed tree that test is green; the red comes from uncommitted neighbour CSS.
AA2's own 18 tests (9 + 9) are inside the 696 passing.
LEAD: `npm test -w @dental/web` — where AA2 parked its gate — is currently red for an unrelated,
uncommitted reason. Not a reason to hold AA2.

## 10. OTHER CLAIMED PROOFS RE-RUN
- `npm run smoke:web-text-encoding` => checkedFiles 423, mojibakeHits 0, garbledQuestionHits 0,
  requiredSnippets 13, TRUE_EXIT=0. Reproduces the claim EXACTLY.
- `documentsViewDecomposition.test.ts` (third owner, NOT in AA2's claim) => tests 18, pass 18,
  fail 0, TRUE_EXIT=0. No contradiction introduced. Claim VERIFIED.
- Builder's own OPEN ITEM closed by me: `rg -n "createElement\(\s*[a-zA-Z]+\[" apps/web/src`
  => NO HITS. Broader `rg -n "Record<string,\s*(React\.)?(ComponentType|FC|FunctionComponent)"`
  => NO HITS. The disclosed false-green shape does not exist in this tree.

## 11. DEFECT 3 and DEFECT 4 — CONFIRMED
DEFECT 3: `git grep ... 99e5cbcf4 -- '*package.json'` => EMPTY at the parent. The guard was wired to
nothing. (Builder said "139 scripts"; I measure **137** in root package.json at the parent — the
load-bearing part, ZERO references, is right; the script count is off by 2.)
DEFECT 4: apps/web/src/tests/documentsViewDecomposition.test.ts holds
`knownUnwiredDocumentComponents = ["DocumentUkepSignButton.tsx"]` with a 5-line written reason
citing apps/api/src/routes/documents/signUkep.ts. So the deleted guard called it «[НАРУШЕНИЕ]» while
the neighbouring test accepted it with a reason. Real contradiction; now both agree (it sits in
LEGACY_UNMOUNTED_BACKLOG). CONFIRMED.

## 12. DECISION (c) ON PublicBookingWidget — REASON IS TRUE LINE FOR LINE
- apps/api/src/server.ts:457 => `await app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" });` EXACT.
- apps/api/src/tests/webCallsExistingRoutes.test.ts:110 => `/api/public/booking` in REGISTERED_PREFIXES. EXACT.
- apps/web/vite.config.ts:64 `rollupOptions:` contains ONLY `manualChunks` (:66); NO `input:`. TRUE.
- `ls apps/web/*.html` => apps/web/index.html only, single Vite entry. TRUE.
- main.tsx: `installApiAuthFetch();` executes BEFORE `createRoot(...).render(<AppShell/>)`. TRUE (read it).
The quarantine reason is verifiable, specific, and correctly argues the fix is an architecture call
outside the packet's claim. This is the brief's option (c) done properly, not a boilerplate blanket.

## 13. patientCardDecomposition.test.ts — orphan scan removal is DOCUMENTED, not silent
:203-227 is a block comment «ПОИСК СИРОТ ОТСЮДА УБРАН, И ЭТО НЕ ОСЛАБЛЕНИЕ» explaining that the
removed scan accepted an IMPORT as proof of mounting and matched on a commented-out line. The file
still asserts real things (9 tests pass, and they are about fields reaching the screen). Not hollow.

## 14. A FIFTH DEFECT THE BUILDER DID NOT NAME (strengthens the deletion)
The deleted guard's entire census stood on `ast-grep`, which is **NOT INSTALLED AND NOT DECLARED**:
  `ls node_modules/@ast-grep` => No such file or directory
  `rg -n "ast-grep" package.json apps/web/package.json` => NOT A DECLARED DEPENDENCY
So the guard could never have run in CI. On this host a single `npx --yes @ast-grep/cli ...` costs
**36.7 s just to FAIL** ("could not determine executable to run"). The deleted test spawned the guard
6 times (one `spawnSync` at :47 driving 6 test cases) and the guard itself has 3 `spawnSync` sites.
6 x ~37 s ~= 3m42s, same order as the claimed 4m33s.
=> The 4m33s figure is MECHANICALLY CORROBORATED. I cannot re-measure it (files deleted, binary
absent), so I record it as NOT RE-VERIFIABLE BUT NOT FABRICATED. The load-bearing new number
(4152-5074 ms measured by me across 3 runs, ceiling 60000 ms) reproduces.

## 15. FINDINGS AGAINST THIS PACKET

### F1 (finding, follow-up) — the legacy ratchet is COUNT-ONLY; the file claims it is MEMBERSHIP-ONLY
panelsAreMounted.test.ts:150-157 states «дописать его сюда нельзя» (a new orphan may not be appended)
and :155 «тест ниже запрещает ему расти». The enforced assertion (:325) is only
`LEGACY_UNMOUNTED_BACKLOG.length <= LEGACY_BACKLOG_CEILING`, measured 32 entries / ceiling 32.
FAILURE SCENARIO: an agent mounts `components/Badge.tsx:Badge` and removes its line (31 entries),
then appends a brand-new orphan `components/foo/NewOrphan.tsx:NewOrphan` (back to 32). Suite stays
GREEN, no reason is ever written, and the new orphan is laundered into the "nobody triaged these"
list — the exact "allowlist rots into a blanket" failure the brief ordered closed. Nothing pins
MEMBERSHIP; only the count. Also, `LEGACY_BACKLOG_CEILING` lives in the same file, so widening the
ratchet is a one-line edit — visible in a diff, but not blocked.
FIX: assert the current members are a SUBSET of the committed baseline (freeze the list identity),
not merely `length <= 32`.
NOT rework-grade: the blank-reason blanket IS closed (my C4/C5 fired), and laundering needs a freed slot.

### F2 (nit) — shape inventory arithmetic is wrong and understates the defect
CLAIMED_PROVEN says "Gap = the annotated shapes exactly" and INVENTORIES says "155 x export function".
Measured by me (TypeScript compiler API): 158 export-function, 34 annotated, 1 plain arrow,
2 CLASS components. Gap 195-158 = **37**, not 34. Its own inventory sums to 190, not 195, and omits
class components entirely. The two load-bearing numbers (195 total, 158 seen by the guard) are both
EXACTLY right; only the attribution is sloppy, and the true defect is slightly WORSE than stated.

### F3 (nit) — "139 scripts" is 137 at the parent
Root package.json at 99e5cbcf4 has 137 scripts, not 139. The load-bearing claim (ZERO guard
references) is confirmed.

### F4 (latent, not a current defect) — census scores render sites at FILE granularity
componentReachability.ts:767 `fileFacts.jsxTags.has(component.name) || binders.some(({edge,local}) =>
facts.get(edge.from)?.jsxTags.has(local))` is per-FILE, so a component whose only render site sits
inside a DEAD sibling component of a LIVE file would score `rendered`. I built the
declaration-granularity walk to hunt this and found ZERO instances on this tree (34 == 34). Latent
imprecision to note, NOT a false green today, NOT introduced regression.

## 16. WHAT I CHECKED AND FOUND CLEAN
- §10 shared contract synchrony: packet touched NO packages/shared and NO apps/api file. N/A.
  (No `npm run build -w @dental/shared` rebuild was needed for my typecheck to be valid.)
- §1/§13 invented values: `rg` for hex / px / UUID / long decimals across all three new files => NONE.
  The constants that exist (CENSUS_FLOOR, LEGACY_BACKLOG_CEILING, CENSUS_TIME_CEILING_MS) are
  documented ratchets with measured justification, not fabricated data.
- §3 human language: all new strings are Russian, grammatical, and tell the reader what to DO
  («Выхода два: отрисовать компонент из модуля, достижимого от main.tsx, или внести его в
  DECLARED_UNMOUNTED вместе с проверенной причиной»). No raw float interpolation; only integer
  counts and integer ms. These are developer-facing test messages, no user-facing button touched.
- Fourth checker? NO. Owner count went 3 -> 2 (one deleted, one merged in). The remaining second
  owner (documentsViewDecomposition.test.ts) is honestly disclosed in FOUND NOT FIXED.
- Teardown: census is readFileSync only, no server/timer/handle. Module-level cache is per-process
  and node:test isolates per file. No leak.
- preserved-uncommitted-guard-edit.diff is AUTHENTIC: its pre-image index `1901a7f4c` matches
  `git rev-parse 99e5cbcf4:scripts/check-component-mount-reachability.mjs` =
  1901a7f4cd93fe0de6e3feb8eac72fa3d7b7728e. A neighbour's 32 uncommitted lines were preserved
  before deletion rather than silently destroyed. Good hygiene.
- CLAIMED NOT PROVEN section is honest: it correctly withholds the project gates, the
  createElement hole (which I closed: no hits), the live-server test of PublicBookingWidget, and UI.
  No claim in it is secretly asserted elsewhere.

## 17. REVIEWER ARTIFACTS (mine, not project code — safe to delete)
.agents/archon/packets/AA2-guard-root-cause/reviewer-census.mjs      (TS-compiler-API census)
.agents/archon/packets/AA2-guard-root-cause/reviewer-falsegreen.mjs  (declaration-granularity walk)
.agents/archon/packets/AA2-guard-root-cause/reviewer-controls.mjs    (7 negative controls)
.agents/archon/packets/AA2-guard-root-cause/{mine,theirs}.txt        (the two 34-item lists diffed)
None is under apps/web/src, so none is seen by the census or any test glob. Nothing was committed.

## 18. VERDICT: SOUND_WITH_NITS
Every structural claim reproduced. The four named defects are real at the exact cited lines. The
inventory is exact item-for-item under a different parser AND a stricter reachability model. The
replacement gate is genuinely load-bearing (C3: it cannot pass on the old instrument). Deletion is
clean repo-wide. Committed code is green in its own claim. Git hygiene is clean in a very dirty
shared worktree. Findings F1-F4 are follow-ups, not rework: F1 is the only one with teeth.
