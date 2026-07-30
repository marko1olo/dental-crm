# X3-orphan-decomposition — ADVERSARIAL REVIEW (pass 2, independent)

Reviewer: adversarial subagent #2. Did not write the code. Did not write the prior review either.
Posture: disbelief toward the packet AND toward the prior review.md, which I found already on disk
(24 547 bytes, 14:52) and backed up to `/tmp/prior-review-X3.md` before overwriting. Every number in it
is re-derived below; where I could not reproduce one, I say so.

HEAD at my review start: `1d22de291aa7fe8e994701923ea975339a4c3292` (3 commits past the prior
reviewer's `5cd08696a`).
Commits under attack: `1e31a9f00` (source F1+F2+F3) · `a02eb310b` (gate) · `fd90d224b` (packet record).
All three verified ancestors of HEAD (`git merge-base --is-ancestor` → 0 for each).

Status: WRITING AS I GO.

---

## 0. Diff, read complete, not skimmed

`1e31a9f00` — 5 files `M`, +77/−206:
- `apps/web/src/DocumentsView.tsx` −202: 173 destructure names deleted from the two
  `useDocumentStore()` blocks, one new import, one 8-line comment, 4 chip handlers collapsed to
  `appendChipToText(...)`.
- `components/documents/DocumentPayloadCard.tsx`: comment only.
- `components/documents/documentChipText.ts`: comment only.
- `components/documents/forms/PersonalDataProcessingConsentForm.tsx`: `interface DocumentClinicOperator`
  → `export type DocumentClinicOperator = Pick<ClinicProfileDraft, "legalName"|"clinicName"|"inn"|"address">`
  plus `import type { ClinicProfileDraft } from "../../../AppHelpers"`.
- `scripts/smoke-document-payload-ui-source.mjs`: `documentComponentSources()` recursive reader added to
  the corpus; card assertion rewritten.

`a02eb310b` — 1 new file, 223 lines. `fd90d224b` — paperwork only.

Zero altered markup, className, CSS, hex, px or user-visible Russian string. Every added Russian line is
inside a `//` or `/* */` comment. Verified by reading the whole diff.

**Store subscription unchanged (a behaviour question the packet did not raise and I had to settle):**
`documentStore.ts:1` `import { create } from "zustand"`, `:2678` `export const useDocumentStore =
create<DocumentState>(`. The call sites are `useDocumentStore()` with **no selector**, so the component
subscribes to the whole store regardless of how many names it destructures. Removing 173 names therefore
changes neither subscription nor render count. No hidden perf claim, no hidden regression.

(sections appended below as evidence lands)

## 1. PROOF AUDIT — every claimed command re-run by me, TRUE exit captured

| # | Packet claim | My re-run at HEAD `1d22de291` | Verdict |
|---|---|---|---|
| 1 | gate 18/18, exit 0 | `cd apps/web && node --import tsx --test src/tests/documentsViewDecomposition.test.ts` → `tests 18 · suites 2 · pass 18 · fail 0`, `duration_ms 548.5`, **TRUE_EXIT=0** | REPRODUCED |
| 2 | line counts 5094→4363→4187 | `git show <rev>:apps/web/src/DocumentsView.tsx \| wc -l`: `64d17693^` **5094**, `64d17693` **4363**, `1e31a9f00` **4187**, `a02eb310b` 4187, `fd90d224b` 4187, HEAD 4187, worktree 4187 | EXACT |
| 3 | 173 names removed, each 0 occurrences | Harvested the removed-name list from the diff itself → **exactly 173 unique identifiers**. Loop of `rg -c -w <name> apps/web/src/DocumentsView.tsx` over all 173 → `still_referenced_count=0` | EXACT |
| 4 | 814 declared / 173 dead at W6 → 641 / 0 at HEAD | Own probe, independent implementation: pre-W6 **814 / dead 2**, W6 **814 / dead 173**, HEAD **641 / dead 0**. 814−173=641 | EXACT |
| 5 | needle «12 цифр, если есть» moved, not lost | `rg -n` → exactly ONE hit, `components/documents/forms/TaxDeductionApplicationForm.tsx:80`. Same `rg` over the smoke's old eight-file corpus → **exit 1** (absent) | EXACT |
| 6 | 28 = 21 inline + 7 forms | Own per-file probe over the whole new corpus: **kindMounts 28, inlineCards 21, formMounts 7, sum 28, distinct kinds 28, duplicated 0**, all 28 in `DocumentsView.tsx` and nowhere else | EXACT |
| 7 | smoke exit 1, missing 50, neither W6 needle in it | `node scripts/smoke-document-payload-ui-source.mjs` → **TRUE_EXIT=1**, parsed `missing.length = 50`; `12 цифр` absent, card-mount needle absent, hidden-DOM needle absent | REPRODUCED |
| 8 | encoding smoke exit 0 | `npm run smoke:web-text-encoding` → **TRUE_EXIT=0**, `ok:true, checkedFiles:431, mojibakeHits:0, garbledQuestionHits:0` (431 not 429 — the tree grew after the packet) | REPRODUCED |
| 9 | appendChipToText 8 of 8 | `rg -n "appendChipToText\("` → 9 occurrences = 1 declaration + **8 call sites**: DocumentsView 1152/1415/1454/1470, Refusal 87/95/103/111 | EXACT |
| 10 | gate is part of the suite (claimed only from the glob) | Not inferred — **executed**: `npm test -w @dental/web` prints `▶ экран не объявляет состояние форм, которых не рисует ✔` and `▶ в каталоге документов нет незамеченных сирот ✔` by name | STRONGER THAN CLAIMED |
| 11 | typecheck "not mine, risk narrow" | `npm run typecheck -w @dental/web` → **TRUE_EXIT=0**. Then defeated the incremental cache: `cd apps/web && npx tsc -b --noEmit --force` → **TRUE_EXIT=0**, zero diagnostics | DISCHARGED |
| 12 | whole suite not run | `npm test -w @dental/web` → **`tests 610 · suites 98 · pass 610 · fail 0`, `duration_ms 6743.97`, TRUE_EXIT=0** | GREEN |

### Negative control, re-done with my own instrument

I did not trust the builder's re-implementation of its own gate. I wrote a separate probe and ran it over
three blobs, and added a **stricter** second pass that also deletes trailing `// …` comments and every
quoted string / template literal, so a name mentioned only in prose or inside a string cannot pass as a
use:

```
pre-W6 (64d17693^)   GATE: declared=814 dead=2    HARD: declared=814 dead=2    false-pass candidates=0
W6     (64d17693)    GATE: declared=814 dead=173  HARD: declared=814 dead=173  false-pass candidates=0
HEAD   (1d22de291)   GATE: declared=641 dead=0    HARD: declared=641 dead=0    false-pass candidates=0
```

Independently: `rg -c -w` per name against the W6 blob gives an occurrence histogram of **173 × count=1**
— every one of the 173 appeared exactly once at W6, and that once is the destructure line itself. So the
defect was **real at the parent**, the deletion is **provably safe**, and the gate is **falsifiable**
(red at W6's own commit, green at HEAD). `dead=2` at pre-W6 names exactly `isDocumentIngesting`,
`setIsDocumentIngesting`, corroborating "pre-existing".

Whole-app check the packet did not make: for each of the 173 removed names, `rg -l -w` over `apps/web/src`
excluding `store/documentStore.ts` and every `*.test.ts(x)` → **0 names lost their last product
consumer**. The deletion orphaned no store field.

## 2. ORPHAN CENSUS — re-derived per file, product importers separated from test importers

`fd -t f -e ts -e tsx . apps/web/src/components/documents` → **exactly 13 files**.

| file | product importers | test importers | render / use site (product only) |
|---|---|---|---|
| `AnamnesisField.tsx` | 3 | 0 | DocumentsView 2002/2009/2017/2048/2056, ProcedureSpecific:135, Anesthesia:70 |
| `DocumentPayloadCard.tsx` | 6 | 1 | Informed:52, Anesthesia:41, PersonalData:54, PhotoVideo:41, ProcedureSpecific:65, TaxDeduction:65 |
| `QuickChipsRow.tsx` | 1 | 1 | Refusal 87/95/103/111 |
| `documentChipText.ts` | 2 | 1 | 8 `appendChipToText(` call sites |
| `forms/documentFormTypes.ts` | 7 | 0 | type references, DocumentsView:8 + 6 forms |
| `forms/TaxDeductionApplicationForm.tsx` | 1 | 1 | DocumentsView:2090 |
| `forms/InformedConsentForm.tsx` | 1 | 1 | DocumentsView:2101 |
| `forms/ProcedureSpecificConsentForm.tsx` | 1 | 1 | DocumentsView:2109 |
| `forms/AnesthesiaConsentLogForm.tsx` | 1 | 1 | DocumentsView:2553 |
| `forms/PhotoVideoConsentForm.tsx` | 1 | 1 | DocumentsView:2643 |
| `forms/PersonalDataProcessingConsentForm.tsx` | 1 | 1 | DocumentsView:3453 |
| `forms/MedicalInterventionRefusalForm.tsx` | 1 | 1 | DocumentsView:3457 |
| `DocumentUkepSignButton.tsx` | **0** | **0** | **none — the one true orphan, pre-existing** |

All 11 W6 files are state **(a)** — imported AND rendered. Nothing in (b), nothing in (c). Every line
number the packet published matches mine. **The brief's premise that W6 produced orphans is false**, and
the packet said so instead of inventing orphans to fix — the correct call.

## 3. REACHABILITY — a real user does walk this path

`workspacePreload.ts:8` preloads `./DocumentsView`; `App.tsx:390` lazy-imports it; `App.tsx:3926` renders
it. The kind `<select>` at `DocumentsView.tsx:1050-1063` is fed from `documentFactoryGroups`
(`packages/shared/src/index.ts:708`) — I parsed it: **5 groups, 31 kind literals**, and all seven extracted
forms' guard kinds are selectable (`tax_deduction_application`, `informed_consent`,
`procedure_specific_consent_packet`, `anesthesia_consent_log`, `photo_video_consent`,
`personal_data_processing_consent`, `medical_intervention_refusal`). All 28 mounted kinds also exist as
literals in the shared factory list — **0 unreachable mounts**. Not dead code sold as a product fix.

## 4. NEGATIVE CONTROL FOR THE ORPHAN HALF — nobody had proven this half falsifiable

The builder's negative control exercised only the dead-fields half. I built the missing one: a read-only
probe that replays the gate's exact orphan logic against a git revision via `git ls-tree` + `git show`,
never touching the worktree, with the committed `knownUnwiredDocumentComponents` list verbatim.

| revision | documents files | undeclared orphans the gate would report | walk floor `>= 13` |
|---|---|---|---|
| `64d17693^` (pre-W6) | 4 | **2 — `NdflTaxCalculatorsWidget.tsx`, `TaxDeductionApplicationForm.tsx`** | RED (4) |
| `64d17693` (W6) | 14 | **1 — `NdflTaxCalculatorsWidget.tsx`** | GREEN (14) |
| `1e31a9f00` (packet) | 13 | **0** | GREEN (13) |
| HEAD | 13 | **0** | GREEN (13) |

So the orphan assertion is genuinely falsifiable, the pre-W6 orphan W6 fixed is confirmed by a third
instrument, and the W6 review's "two orphans" was true when written. It also produces finding F2 below.

## 5. ATTACK SURFACE — what I tried to break

- **Hidden behaviour change in the data path.** The removed names never carried document data to the API.
  `useAppLogic.tsx:1911` destructures the document store, `documentLogic.ts:108 documentPayloadForKind`
  builds the payload (`:466`, `:1260`), called from `useAppLogic.tsx:12023`. DocumentsView's destructure
  was never on that path. Creating a document is unaffected.
- **Store subscription / render count.** `useDocumentStore()` with no selector reads the whole store
  regardless of destructure count. No perf change, no hidden claim.
- **Gate false-pass via strings or trailing comments.** My HARD probe strips trailing line comments, every
  quoted string and every template literal: **0 false-pass candidates at all three revisions**.
- **Dynamic / string-keyed access to a removed name.** `rg -c -w` matches inside strings too, and returned
  **0 occurrences** for all 173. No name survives in any form.
- **A removed name losing its last consumer.** For each of the 173, `rg -l -w` over `apps/web/src`
  excluding `store/documentStore.ts` and every test file gives **0**. Nothing orphaned in the store.
- **Corpus expansion masking a real regression.** Harvested **all 388** needles the smoke asserts (355
  `requiredSnippets` + 34 inline `source.includes`) — not a subset. Old script vs new script over the same
  tree: **52 to 50**, exactly 2 flips RED to GREEN (both claimed), **0 GREEN to RED**. Exactly one needle is
  satisfied only because the directory was added, «12 цифр, если есть». The single needle whose text occurs
  in the orphan (the document PDF fetch path) is present elsewhere too, so **0 false-green candidates**.
  See F4 for the latent hole this leaves.
- **`hidden` DOM regression.** The pattern `className="document-payload-card" hidden={selectedDocumentKind
  !==` has **0 occurrences** anywhere in the corpus. 28 distinct kinds, 0 duplicated mounts.
- **The `!important` cascade — the packet's one honest НЕ ПРОВЕРЕНО. I re-derived it and it holds, 13/13.**
  W6 deleted three inline objects per copy: on `<details>` `{background, padding, borderRadius, border,
  marginTop}` (5), on `<summary>` `{cursor, fontWeight, color, userSelect}` (4), on the content block
  `{marginTop, display, flexDirection, gap}` (4) = 13. In `dente-redesign.css:1285-1310`:
  `.document-manual-override` declares background / padding / border-radius / border / margin-top all
  `!important`; `.document-manual-override > summary` declares cursor / font-weight / color / user-select all
  `!important`; `.document-payload-collapsed-content` declares margin-top / display / flex-direction / gap
  all `!important`. None of the deleted inline declarations was itself `!important`, so an important author
  declaration outranks each one — the CSS values (10px / 12px / 10px / `var(--teal-dark)`) were what
  rendered, exactly as the comment says. `documentPayloadForms.test.ts:288-312` guards all 13 against the
  real CSS file and is non-vacuous (`assert.ok(start > 0)` guards the block lookup).
- **Do the new tests actually assert?** All 18 do, against real files — no fixtures at all, so the cycle-7
  "fixtures the packet deleted" pattern is structurally impossible here. Both halves proven falsifiable.
- **Deletion to dangling reference.** No file was deleted. `DocumentClinicOperator` keeps its name
  (`interface` to `type` alias) and `rg` over the whole repo minus `node_modules`/`.git`/`dist` finds only
  its own three self-references.
- **Mojibake / BOM / U+FFFD.** Round-trip test (the `AGENTS.md` rule-5 form, not the banned regex) over all
  6 changed files gives `problems=0`, no BOM, no `U+FFFD`. `npm run check:encoding` → **TRUE_EXIT=0**,
  "проверено 2054 файлов, замечаний нет". `npm run smoke:web-text-encoding` → **TRUE_EXIT=0**. All three
  commit subjects render intact.
- **§10 invented contract.** `AppHelpers.tsx:3233` `ClinicProfileDraft` declares `clinicName`, `legalName`,
  `inn`, `address` as required non-optional `string`. The `Pick` is type-identical to the deleted
  interface — no widening, no invented field.
- **The declared nullable debt is accurate to the line** (checked against `HEAD:` blobs, not the dirty
  worktree): `appStore.ts:18 clinicProfileDraft: any`, `:243 clinicProfileDraft: null`; the form
  dereferences unguarded at `:62/:69/:74`; `useAppLogic.tsx:4024-4035` hydrates as soon as `dashboard`
  exists, and useAppLogic itself guards `if (!clinicProfileDraft) return []` at `:2965/:3016`. Pre-existing,
  parent identical, correctly reported and not fixed.
- **`DocumentUkepSignButton.tsx` facade** — real, 225 lines: the "Тестовое подписание (DEV)" button renders
  inside the `!hasPlugin` branch while `handleSign` throws `"Подписание невозможно: отсутствует плагин или
  сертификат."` whenever `!(hasPlugin && selectedThumbprint)`, so it can only throw. Server route exists
  (`apps/api/src/routes/documents/signUkep.ts:8`). Reported, not patched — correct: wiring it is a new
  user-visible feature the brief forbids.
- **`NdflTaxCalculatorsWidget.tsx`** — gone. Deleting commit `a457fb49f` is **NOT** an ancestor of
  `64d17693`, so the packet's correction to W6's handoff is right. Surviving references are prose in
  `docs/competitive-audit/GAP_REPORT_2026-07-27.md` and a comment in an api test — inside the brief's
  `docs/`/prose allowance.
- **Git hygiene.** `git show --name-only` per commit gives exactly the claimed 5 / 1 / 5 files, author
  `marko1olo` throughout, +657/−206, no neighbour work swept in. Conventional Commits with WHY-bodies.
  `git diff fd90d224b HEAD` over every packet path is **empty** — the code is byte-identical from the
  packet's own commit to current HEAD — and `git status --porcelain` over those paths is empty too.
- **`apps/api/dist`.** No proof of mine loads it: this packet is web-source only, both test files read
  source / render in memory, and the smoke reads source text. No rebuild was required and none was skipped.

### Six other document smokes are red — I attributed every one, and none is this packet's

`rg -l DocumentsView scripts/*.mjs` finds 9 smokes. Results: `smoke-tax-ui-year-source` **exit 0**;
`smoke-documents-view-source`, `smoke-document-legal-confirmations`,
`smoke-daily-surfaces-keyboard-accessibility`, `smoke-workspace-shell-source`, `smoke-ui-preferences`
**exit 1**; `smoke-tax-knd-xml` exit 1 on HTTP 401 (needs a live server — the brief forbids starting one).

Decisive attribution, not assumption: the failing needles target `App.tsx` / `useAppLogic.tsx` /
`documentStore.ts` / patients / schedule / sidebar, and **`git show --name-only 1e31a9f00` touches none of
those files**. At the packet's parent `1e31a9f00^` the needles already count **0** in every file those
smokes read (`const [documentCreateSavingKind, setDocumentCreateSavingKind]` gives 0/0/0;
`const [documentIssueClinicSigned, setDocumentIssueClinicSigned] = useState(false)` gives 0/0), and
`git log -S` attributes their removal to `8352f0438 refactor(monolith): extract 616 lines of document state
into Zustand store` and `0fc0b5bb0`. **All pre-existing. Zero attributable to X3.**

Worth the lead's attention as context, not as rework: the packet's own argument is "a gate red for a false
reason hides the real regression". Five source smokes are red for that same class of reason — needles
pinned to a location the code left many commits ago — and the packet fixed one of them.

### Live-tree caveat, stated so the lead can reproduce

HEAD moved under me mid-review: `1d22de291` to `76061362b`, and a neighbour is actively editing
`useAppLogic.tsx`, `appStore.ts`, `workspaceShell.tsx`, `apps/api/src/db/schema.ts` and others. The
typecheck (exit 0, forced) and the 610-test suite run were taken at `1d22de291` with a much cleaner tree; I
re-ran the gate (18/18, exit 0) and the source smoke (exit 1, missing 50) again at `76061362b` and both
hold. `git diff fd90d224b HEAD` over the packet's paths is empty, so every measurement I took against the
worktree applies to the committed bytes exactly.

## 6. FINDINGS

### F1 — `LEAD MUST RUN` item 3 is unactionable, and all four of its evidence statements are false at HEAD
The packet's `CLAIMED NOT PROVEN` #2 blames "another agent's **UNCOMMITTED untracked**
`apps/web/src/components/workspaceActions/`" and tells the lead to wait until "the neighbour commits or
drops the .css import". Measured at HEAD:

| packet statement | my measurement |
|---|---|
| "UNCOMMITTED untracked `components/workspaceActions/`" | `git ls-files` → **6 files TRACKED**, incl. `workspaceActions.css` |
| "`git grep … HEAD -- apps/web/src/workspaceShell.tsx` → exit 1 (not in HEAD)" | `git grep -n workspaceActions HEAD -- apps/web/src/workspaceShell.tsx` → **exit 0**, `:29 import { WorkspaceActionsMount } from "./components/workspaceActions/WorkspaceActions"` |
| "all three importers dirty" | not dirty when the claim was published |
| "blocked for everyone right now, not just me" | true, but the wait it prescribes can never end |

Cause established by timestamps, not inference: `git log -S 'workspaceActions/WorkspaceActions' --
apps/web/src/workspaceShell.tsx` returns a **single** commit, `f0121f0c2` at **14:29:55**, which added
`components/workspaceActions/WorkspaceActions.tsx` and `workspaceActions.css` (`A`) and modified
`workspaceShell.tsx` (`M`). The packet's docs commit `fd90d224b` landed at **14:32:29** — 2 m 34 s later —
and published "uncommitted / not in HEAD / all dirty" as current fact. §8b ("commit before reporting",
"start a report with the real `HEAD:`") exists for exactly this.

Consequence: the packet's literal closer `cd apps/web && node --import tsx --test
src/tests/documentPayloadForms.test.ts` is **TRUE_EXIT=1** at HEAD with
`ERR_UNKNOWN_FILE_EXTENSION ".css" for …/workspaceActions/workspaceActions.css`. The repo already solved
this repo-wide in `dc04935bd` (14:59) by committing `apps/web/testCssStub.mjs` and putting
`--import ./testCssStub.mjs` into the web `test` script — so the packet told the lead to wait for an event
that had already happened, while the working command existed.

**The substance survives and I proved what the builder could not.** With the repo's own committed stub:
`node --import tsx --import ./testCssStub.mjs --test src/tests/documentPayloadForms.test.ts` →
`tests 25 · suites 4 · pass 25 · fail 0`, `duration_ms 568.8`, **TRUE_EXIT=0**. Inside
`npm test -w @dental/web` all 25 run green by name. Reporting-accuracy defect, not a code defect.
**Correct closer: `npm test -w @dental/web`.**

### F2 — the new gate's walk floor is pinned to the exact current file count, so deleting the orphan turns it red for the wrong reason
`documentsViewDecomposition.test.ts:191-197`:
```ts
assert.ok(documentFiles.length >= 13,
  `в components/documents найдено ${documentFiles.length} файлов исходников — ожидалось не меньше 13`);
```
`fd -t f -e ts -e tsx . apps/web/src/components/documents` → **exactly 13**. My revision replay: W6
count=14 GREEN, packet and HEAD count=13 GREEN **at the boundary**, 12 → **RED**. The packet explicitly
keeps deletion of `DocumentUkepSignButton.tsx` open as one of two legitimate resolutions; taking it turns
this gate red on a reason unrelated to orphanhood, with a message that blames the directory walk. That is
the same failure mode — «красная проверка по ложной причине скрывает настоящую регрессию» — that this
packet's own commit message says it fixed in the smoke. Contrast the sibling guard
`allWebFiles.length > 100` against 346, deliberately loose. Fix: a real anti-breakage floor (e.g. `>= 5`)
and let the per-file `it()` blocks carry the census. Deterministic from source; no runtime needed.

### F3 — the gate proves IMPORT, never RENDER, so brief-state (b) passes silently
`documentsViewDecomposition.test.ts:204-221` asserts only `importPattern.test(read(other))`. The brief
required every "(b) imported but never rendered" file — which it called *worse* than orphaned, "because it
looks wired" — to end the packet used or deleted, and called limbo *the* defect. A future (b) file
satisfies this gate. Latent, not live: I re-derived render sites for all 11 by hand (§2), so there is no
(b) file today. The gate's commit message is honest about checking imports, but the one state the brief
singled out is the one it cannot see.

### F4 — the corpus expansion opens a NEW false-green channel: a test file under `components/documents` would satisfy product-source assertions
`scripts/smoke-document-payload-ui-source.mjs:27` accepts **every** `.ts`/`.tsx` under
`apps/web/src/components/documents` with **no test-file exclusion and no orphan exclusion**:
```js
if (full.endsWith(".tsx") || full.endsWith(".ts")) collected.push(fs.readFileSync(full, "utf8"));
```
The old corpus was an explicit 8-file list and was immune by construction. Now
`components/documents/anything.test.ts` containing a needle turns a product-source assertion green — the
cycle-7 failure mode where a test satisfies an assertion about product code. Worse, text living in the
declared orphan also counts as shipped UI. Latent today, and I measured it rather than assuming: all 13
files in the directory are product files, and over all 388 needles there are **0 false-green candidates**;
exactly 1 needle whose text appears in the orphan is also present elsewhere. Fix: skip `*.test.ts(x)` and
skip the `knownUnwiredDocumentComponents` entries in `documentComponentSources`.

### Nits

- **N1 (in the builder's disfavour).** The self-downgrade "the reviewer's 52 is no longer reproducible" is
  wrong. It reproduces exactly: the pre-packet script (blob from `1e31a9f00^`, only its lib import
  rewritten to an absolute file URL, cwd = repo root) against the current tree gives **52**; the current
  script on the same tree gives **50**; the set difference is precisely the two claimed needles, and
  nothing flips the other way. The packet proved the two needles individually, which is fine, but the
  apples-to-apples instrument was available and would have been stronger.
- **N2.** `DocumentPayloadCard.tsx:6-8` says the markup was repeated 28 times "вместе с ТРЕМЯ объектами
  `style={{ … }}` **на каждой копии**". Measured at pre-W6: `className="document-payload-card"` = **28**,
  but `className="document-manual-override"` = **27** and `document-payload-collapsed-content` = **27**. So
  27 of 28 copies carried the three objects — 81, not 84. The packet audited and corrected the numbers in
  that exact sentence («четырьмя» → «ТРЕМЯ», «13 свойств») and left this one off by one.
- **N3.** The same comment is past tense ("БЫЛА ПОВТОРЕНА 28 РАЗ") while **21 copies remain at HEAD**, each
  still carrying all three dead inline style objects — 63 objects, 273 dead properties, measured. Only 7 of
  28 kinds left the duplication (6 on the shared card + 1 own shell). Out of scope for a behaviour-neutral
  refactor and honestly reflected in the rewritten smoke (which now expects 21), but the comment invites a
  reader to think the duplication is gone.
- **N4.** "two pre-existing dead bindings … went too" reads as dead *store* state. `isDocumentIngesting` /
  `setIsDocumentIngesting` are alive elsewhere in the app; they were dead *in this file only*. The
  "pre-existing" half is exact — my probe reports `dead=2` at `64d17693^` naming both.
- **N5.** `CLAIMED PROVEN` #12 quotes the web `test` script as `node --import tsx --test "src/**/*.test.ts"
  …`. At HEAD it is `node --import tsx --import ./testCssStub.mjs --test …` (`dc04935bd`, 14:59 — after the
  packet). Correct when written, stale now. Not a defect; recorded so the lead does not chase it.

### Not findings — checked and cleared
- The CSS citation `dente-redesign.css:1262-1287` was **correct at the packet's own commit** (`git show
  1e31a9f00:…` → rule at 1262, collapsed-content at 1282). It drifted to 1285/1305 via `af88f6850`, later.
- `Pick<ClinicProfileDraft, …>` is type-identical to the deleted interface; forced typecheck exit 0.
- The 4 rewritten chip handlers are expression-identical to `appendChipToText` (`documentChipText.ts:16-19`),
  including the un-lowercased empty-field fallback.
- All 28 mounted kinds exist as literals in `documentFactoryGroups` (`packages/shared/src/index.ts:708`,
  5 groups / 31 kinds) — 0 unreachable mounts.

## 7. VERDICT — SOUND_WITH_NITS

Every substantive claim in this packet reproduces, and most reproduce **exactly**: 5094 → 4363 → 4187;
814 → 641 with dead 173 → 0; 173 names each at 0 occurrences; 28 = 21 + 7 with 0 duplicated kinds;
52 → 50 with 0 green-to-red; 8 of 8 chip sites; 13 of 13 `!important` properties; 18/18 gate; 610/610
suite; forced typecheck 0. The two things the builder honestly refused to claim — the typecheck and the
CSS cascade — both hold when I run and re-derive them. The negative control survives instruments the
builder did not use, and I supplied the one it never built: the orphan half is falsifiable too (2 orphans
at pre-W6, 1 at W6, 0 at HEAD). The orphan census survives per-file re-derivation with matching line
numbers, product importers separated from test importers. Nothing user-visible changed, and the data path to
the API never went through the deleted code.

What keeps it off a clean SOUND: F1 published four evidence statements that were already false when the
commit landed and left the lead an instruction to wait for an event that had happened 2.5 minutes earlier,
while the working command existed; F2 builds a red-for-the-wrong-reason tripwire into the very gate whose
purpose is to stop red-for-the-wrong-reason; F3 cannot see the one state the brief singled out; F4 hands the
smoke a new channel through which a test file — or the declared orphan — can satisfy a product-source
assertion. All four are cheap, and none is fabricated proof.

Nothing here is REVERT or NEEDS_REWORK territory: no defect was introduced, no claim failed reproduction,
the deletion is provably safe, and the packet corrected its own brief's false premise instead of inventing
orphans to fix.

## 8. My own hygiene disclosure

Read-only on source, as ordered: `git status --porcelain` over every file this packet touches is empty.
The 18 dirty source files in the tree are neighbours' concurrent work, present before I started or appearing
during my run; I edited none of them and staged nothing.

Two writes I did make, disclosed rather than hidden:
- `apps/web/tsconfig.tsbuildinfo` — rewritten by `npx tsc -b --noEmit --force`. It is a build artefact and
  it was **already** listed as `M` before I ran anything. Defeating the incremental cache was worth it: a
  stale `.tsbuildinfo` has hidden defects in this repo before.
- this `review.md`, which is untracked.

Probes were written to `%LOCALAPPDATA%\Temp`, never into the repo (§9). All `node -e` / probe use was
read-only measurement over blobs and stdin — no file surgery, no regex rewrites of source. `madge` and
biome were not run: not installed / would reformat the repo, per the review brief.
