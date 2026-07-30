# P8-encoding-red — ADVERSARIAL REVIEW

Reviewer: independent (did not write the code). Posture: disbelief by default.
Commit under attack: `679e0ee694e79c220c386ae35ce4443fdd8b9335`
Review HEAD at time of review: `3ad6d461410ae9a087ce81ad5d2164710c245f4f` (tree moved 7 commits past the
commit under attack; other agents were committing concurrently).
Read complete before judging: `.agents/AGENTS.md` (163 lines), `.agents/INDEX.md` (29 lines).

**VERDICT: SOUND_WITH_NITS.**

Every load-bearing claim the builder made was re-run by me and reproduced. The central technical claim —
that operand B was a byte-exact cp1252 double-encoding of operand A, therefore dead, therefore the
assertion could not fail on mojibake — is not just plausible, it is arithmetically provable and I proved
it independently. The nits are all in the *reporting* layer: the committed packet docs carry a
`UNIT VERIFIED` label the builder verbally retracted, two different file counts are quoted for the same
run, the category breakdown of the remaining 27 is wrong, the brief's explicit "report the full list"
instruction was only ~60% satisfied, and the debt note misdiagnoses the line-384 failure.

---

## 1. THE DIFF

`git show 679e0ee69 --stat` → **1 file changed, 1 insertion(+), 2 deletions(-)**, exactly
`scripts/smoke-visit-workflow-forms-lifecycle.mjs`.

`git show 679e0ee69 | cat -A`, the whole hunk:

```
@@ -527,8 +527,7 @@ for (const formCase of visitWorkflowCases) {
 ^I^I`${formCase.kind}: HTML must contain document title`,
 ^I);
 ^Iassert(
-^I^IissuedHtml.includes("M-PM-^^M-QM-^BM-PM-<M-PM-5M-QM-^BM-PM-:M-PM-0 M-PM-> M-PM-?M-PM->M-PM-4M-PM-?M-PM-8M-QM-^AM-PM-0M-PM-=M-PM-8M-PM-8") ||
-^I^I^IissuedHtml.includes("M-CM-^PM-EM->M-CM-^QM-bM-^@M-^ZM-CM-^PM-BM-<...M-CM-^QM-BM-^A..."),
+^I^IissuedHtml.includes("M-PM-^^M-QM-^BM-PM-<M-PM-5M-QM-^BM-PM-:M-PM-0 M-PM-> M-PM-?M-PM->M-PM-4M-PM-?M-PM-8M-QM-^AM-PM-0M-PM-=M-PM-8M-PM-8"),
 ^I^I`${formCase.kind}: HTML must include signature attestation block`,
 ^I);
```

The added line's Cyrillic bytes are character-for-character the removed clean operand. The only textual
delta on that line is the removal of the trailing ` ||`. **Zero Russian bytes were authored.** In a repo
with a documented 10,554-character mass-corruption incident, "pure deletion" is the correct shape of a
mojibake repair and the builder chose it deliberately.

Opened at HEAD in context: the assertion at 529-532 sits inside `for (const formCase of visitWorkflowCases)`
(line 372), after the `GET /api/documents/:id/html` fetch at 516-524, before the per-case
`formCase.fragments` loop at 533-538. `documentKindMetadata[...].title` is asserted immediately above at
526. The single-operand shape is now consistent with its neighbours.

---

## 2. ATTACK SURFACE

| # | Hypothesis I tried to prove | Result | Evidence |
|---|---|---|---|
| 1 | The defect was NOT real at the cited line before the commit (i.e. builder invented it) | **DISPROVED** — defect was real | `git show 679e0ee69^:scripts/smoke-visit-workflow-forms-lifecycle.mjs` → line 531 is the second `includes(...)` operand. Guard predicate applied to that blob: `BEFORE-blob | validUTF8=yes | U+FFFD@-1 | mojibake=LINE 531`. Applied to the post-commit blob and to the worktree file: `mojibake=NONE`. |
| 2 | Operand B was NOT a double-encoding of A (i.e. the "provably dead" claim is hand-waving) | **DISPROVED** — B is byte-exact | Ran cp1252 reverse-map over B's codepoints. `B reversed hex: d09ed182d0bcd0b5d182d0bad0b020d0be20d0bfd0bed0b4d0bfd0b8d181d0b0d0bdd0b8d0b8` / `A utf8 hex: d09ed182d0bcd0b5d182d0bad0b020d0be20d0bfd0bed0b4d0bfd0b8d181d0b0d0bdd0b8d0b8` / `MATCH: true`. A is 20 chars, all in U+0400..U+045F plus two spaces. |
| 3 | The U+0081 "machine-generated, not typed" tell was fabricated | **DISPROVED** — it was there | Codepoint dump of B: `00d0 017e 00d1 201a 00d0 00bc 00d0 00b5 00d1 201a 00d0 00ba 00d0 00b0 0020 00d0 00be 0020 00d0 00bf 00d0 00be 00d0 00b4 00d0 00bf 00d0 00b8 00d1 0081 ...` — `00d1 0081` is UTF-8 `D1 81` misread through cp1252, whose byte `0x81` has no glyph. `B has U+0081: true`. |
| 4 | Deleting B changed behaviour (i.e. it was not actually dead) | **DISPROVED** — inert | B could only match if the product emitted the mojibake form. Searched both the source and the exact artifact the smoke loads: `apps/api/src/documents/renderDocument.ts \| clean-heading lines: [512] \| mojibake-heading lines: []` and `apps/api/dist/documents/renderDocument.js \| clean-heading lines: [398] \| mojibake-heading lines: []`. `A \|\| false ≡ A`. |
| 5 | This is a fix to dead code sold as a live fix | **CONFIRMED, and the builder said so first** | `npm run smoke:visit-workflow-forms-lifecycle` → exit 1 at `scripts/smoke-visit-workflow-forms-lifecycle.mjs:384:3`, `Error: informed_consent: visit-required form without visit must be blocked`. Line 530 is never reached. The builder labelled this НЕ ПРОВЕРЕНО in both `state.md` and `handoff.md` and repeated it in the report. Disclosed, not concealed. |
| 6 | The asserted string is not on any route a real user can reach | **DISPROVED (static), UNTESTABLE (live)** | `grep -n "issueSignatureAttestationBlock" apps/api/src/documents/renderDocument.ts` → exactly two hits: definition at 508, single call at **631**, inside the shared `<body>` shell between the patient `.meta` div and `${body}`, i.e. OUTSIDE the per-kind `bodyByKind` dispatch. Same shape in dist: definition 393, call 519. So every non-draft document with an attestation renders the heading. I could not confirm this on a live render — see §4. |
| 7 | HOLLOW FACADE: `{success:true}` over a no-op, placeholder, magic constant, hardcoded UUID/port/endpoint, fabricated `0` | **DISPROVED** | The entire change is `-2/+1` lines consisting of one deleted `includes()` operand and one deleted ` ||`. Nothing was added. There is nothing in the diff that could be a facade. |
| 8 | SECOND OWNER created (duplicate helper, parallel vocabulary, second source of truth) | **DISPROVED — it removes one** | Three files assert this heading. Post-commit shapes: `smoke-document-lifecycle.mjs:194` single operand; `smoke-visit-workflow-forms-lifecycle.mjs:530` single operand (this fix); `smoke-patient-forms-lifecycle.mjs:334-335` still `A \|\| mojibake(A)`. The change moved 1 of the 2 divergent files onto the existing correct shape. |
| 9 | `useAppLogic.tsx` return block field deleted/renamed | **DISPROVED** | `git show --name-status 679e0ee69` → one line: `M scripts/smoke-visit-workflow-forms-lifecycle.mjs`. No web file in the commit. |
| 10 | Listener / interval / subscription added without teardown | **DISPROVED** | Deletion-only diff. No `setInterval`, `addEventListener`, `.on(`, or `subscribe` anywhere in the hunk. |
| 11 | Hardcoded hex colour, undeclared Russian literal (i18n debt), static px where a relative unit belongs | **DISPROVED** | Zero bytes added other than the removal of ` ||` from an existing line. No new literal of any kind. |
| 12 | Russian text in the diff or the commit subject is MOJIBAKE | **DISPROVED** | Subject codepoint dump: `5b 41 52 43 48 4f 4e 5d 20 66 69 78 28 441 43c 43e 443 43a 29 ...` — `has C1/Latin1 mojibake range: false`, `pure ascii+cyrillic: true`. Every non-ASCII codepoint is in U+0400..U+045F. The surviving diff line likewise decodes to clean two-byte Cyrillic (hyp. 2). |
| 13 | The builder's diagnosis of the line-384 blocker is correct | **DISPROVED** | `handoff.md:161-169` blames `apps/api/src/documents/guards.ts:1022` (`requiresVisit && !input.visitId`). I instrumented a temp copy of the smoke to print the real status: `PROBE without-visit status: 401 {"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}`. That is `apps/api/src/accessGuard.ts:122`. The request never reaches the visit guard. The next request in the loop then fails the same way (`missing structured payload must be blocked` at 397 in my probe copy). The debt note points the next packet at the wrong file. |
| 14 | The brief's instruction "report the full list" of other flagged files was satisfied | **DISPROVED (partial)** | Guard reports 27 problems. `handoff.md` blocker #2 names ~17 of them. Not named anywhere: `scripts/smoke-api-text-encoding.mjs` (U+FFFD lost text — **an encoding smoke that is itself encoding-damaged**), `scripts/smoke-telegram-validation.mjs` (U+FFFD), `scripts/smoke-document-issue-chains.mjs` (mojibake), `scripts/smoke-tax-knd-xml.mjs` (mojibake), `apps/api/src/tests/repairMojibake.test.ts`, `apps/api/src/text/repairMojibake.test.ts`, `scratch/decode-mojibake.mjs`, `scratch/probe-mojibake-pattern.mjs`. |
| 15 | The category breakdown of the remaining 27 is accurate | **DISPROVED** | Builder: "11 non-UTF-8 … 6 with U+FFFD … and 10 mojibake". Actual, counted off the live guard output: **12** не-UTF-8, **7** потерянный текст, **8** мохибака (= 27). Both triples sum to 27, which is how the error survived. Later commits `679e0ee69..HEAD` touched only `scratch/audit-prefilled-defaults.mjs` and `scratch/audit-tab-crashes.mjs`, neither of which is flagged, so this is not drift — it is a miscount. |
| 16 | The two quoted "after" runs of the guard are self-consistent | **DISPROVED** | `handoff.md:77` — `Найдены проблемы с кодировкой (27) среди 2061 файлов`. Report to the lead — `(27) среди 2067 файлов`. Same claimed run, two different verbatim numbers. My run at a later HEAD: `(27) среди 2069 файлов`. The problem count is stable and correct; the scanned-file figure was transcribed inconsistently. |
| 17 | `UNIT VERIFIED` is an honest label for what was run | **DISPROVED for the committed artifacts** | `state.md:97` and `handoff.md:81` both carry `UNIT VERIFIED`. No `node:test` exists. The builder's report to the lead explicitly retracts it ("this is a script execution with quoted output, NOT a node:test … do not read this as UNIT VERIFIED") — but that retraction lives only in the chat, not in the two files a future agent will read. |
| 18 | Another permanently-passing assertion of the same class exists and was not named | **CONFIRMED** | `scripts/smoke-tax-knd-xml.mjs:999` — `!issuedXmlAfterMutationResponse.body.includes('<mojibake-attr>="7777"')`. A NEGATIVE assertion whose needle is mojibake can never fire, so it passes unconditionally. Same disease, opposite polarity. Builder named only `smoke-patient-forms-lifecycle.mjs`. |
| 19 | The commit swept in churn or another agent's file | **DISPROVED** | `git show --pretty=format: --name-status 679e0ee69` → exactly one `M`. No `apps/api/.data/*.json`, no `apps/web/tsconfig.tsbuildinfo`, no `scratch/**`. The 4 packet docs went into a separate later commit `150c815fc`, all four inside `.agents/archon/packets/P8-encoding-red/`, all `A` (added), nothing else. |
| 20 | The packet's own docs trip the guard they were written to satisfy | **DISPROVED** | `node scripts/check-encoding.mjs \| grep -E 'smoke-visit-workflow\|P8-encoding-red'` → no match. The builder wrote the docs with hex notation instead of literal mojibake, exactly as `check-encoding.mjs`'s own header does for itself. |
| 21 | The IRON GATE hook claims were invented | **DISPROVED** | `git config core.hooksPath` → `C:/Users/Admin/.git-hooks`. That `pre-commit` contains `THE IRON GATE (Pre-Commit Check)` at line 4, `gitleaks protect -v --staged` at line 9, and at 21-31 `if command -v biome …` / `else … "Biome not found in PATH, skipping format check."`. The quoted behaviour matches the hook source exactly. |

---

## 3. PROOF AUDIT — every "BUILDER CLAIMED PROVEN", re-run

**Claim 1 — `node scripts/check-encoding.mjs`, 28 → 27, my file absent, exit still 1.**
RE-RUN. `node scripts/check-encoding.mjs` → `EXIT=1`, header
`Найдены проблемы с кодировкой (27) среди 2069 файлов:`, `grep -nE 'smoke-visit-workflow|P8-encoding-red'`
over the output → no match, `grep -c '^  \['` → `27`.
The "28 before" half cannot be re-run at this HEAD, so I proved it a different way: I extracted the
pre-commit blob and applied the guard's own three predicates to it (`TextDecoder fatal`, `indexOf U+FFFD`,
`MOJIBAKE_PATTERN`). Result `mojibake=LINE 531`. So the file WAS one of the flagged set before and is not
in it now, and 28→27 follows. **REPRODUCES.** The builder's refusal to claim exit 0 is correct and matches
reality. *Nit: the "среди 2061/2067 файлов" inconsistency, hyp. 16.*

**Claim 2 — read-only `node -e` byte check of the surviving predicate.**
RE-RUN independently (I did not copy his script). All four sub-claims reproduce:
`operands remaining on line 530: 1` → confirmed, `grep -n "||" scripts/smoke-visit-workflow-forms-lifecycle.mjs`
now returns only lines 18-19 (the `existsSync` build guard), nothing in the assert block.
`expected hex bytes: d09e…d0b8` → confirmed identical.
`any codepoint >0x7F but <0x400: false` → confirmed, `A pure Cyr+sp: true`.
`compiled artifact contains it: true` → confirmed, `apps/api/dist/documents/renderDocument.js` line 398.
**REPRODUCES.** The builder's own disclosure that this is a script run and not a `node:test` is accurate
and he was right to refuse the label in his report — but see hyp. 17, the committed files still say
`UNIT VERIFIED`.

**Claim 3 — `node --check` → SYNTAX OK.**
RE-RUN. `node --check scripts/smoke-visit-workflow-forms-lifecycle.mjs` → exit 0.
The scoping caveat is also true: `apps/api/tsconfig.json`, `apps/web/tsconfig.json` and
`packages/shared/tsconfig.json` all have `"include": ["src"...]` — no tsc project covers `scripts/`.
**REPRODUCES**, and the builder correctly downgraded it to "syntax only".

**Claim 4 — negative control: byte-identical smoke failure before and after.**
This is the claim I attacked hardest, because "my change is inert" is exactly the kind of thing that gets
asserted and never tested. RE-RUN BOTH SIDES:
- AFTER (`npm run smoke:visit-workflow-forms-lifecycle`): exit 1,
  `Error: informed_consent: visit-required form without visit must be blocked`,
  `at scripts/smoke-visit-workflow-forms-lifecycle.mjs:384:3`.
- BEFORE: extracted `679e0ee69^` blob to a temp dir, copied `scripts/lib` beside it so its relative
  `./lib/documentIssueAttestation.mjs` import resolves, ran it with cwd = repo root so its `path.resolve`
  dist lookups still hit the real artifacts. Exit 1,
  `Error: informed_consent: visit-required form without visit must be blocked`,
  `at …/before.mjs:384:3`.
Identical message, identical line, identical exit. **REPRODUCES.** The change neither caused nor fixed it.

**Claim 5 — commit integrity.**
RE-RUN. `git show --stat` → 1 file, 1 insertion, 2 deletions. `--name-status` → single `M` on the claimed
path. Subject codepoints are ASCII + U+0400..U+045F only, no mojibake. Hook source confirms the gitleaks /
Biome-skipped behaviour. `git status --porcelain -- scripts/smoke-visit-workflow-forms-lifecycle.mjs
.agents/archon/packets/P8-encoding-red/` → empty. **REPRODUCES.**

**Claim 6 — build freshness.**
RE-RUN. `stat -c '%y %n'`:
`2026-07-28 00:54:29 apps/api/dist/routes/documents.js` vs `2026-07-26 18:37:44 apps/api/src/routes/documents.ts`;
`2026-07-28 00:54:29 apps/api/dist/documents/renderDocument.js` vs `2026-07-26 13:31:02 apps/api/src/documents/renderDocument.ts`.
dist is newer in both cases. **REPRODUCES.**

**No fabrications found in the PROVEN block.** Given this repo's history — 49 registry features citing 49
screenshots that do not exist, and a UI milestone certified on a byte-identical Vite error overlay — that
is the finding that matters. Six claims, six re-runs, six reproductions.

---

## 4. WHAT I TRIED AND COULD NOT CLOSE

The builder's disclosed gap — "the single-operand assertion was never observed passing against live
rendered HTML" — I attempted to close for him, twice, and failed both times:

1. **Direct render.** Called the exported `renderDocumentHtml` from `apps/api/dist/documents/renderDocument.js`
   with a synthetic issued `informed_consent` document. It throws, because `bodyByKind` (dist:3456) is a plain
   object literal, so **every** kind's body renderer is invoked eagerly on every call regardless of
   `document.kind`. Satisfying `informedConsent` (needs `aftercareRequirements`, `doctorFullName`,
   `consentConfirmedAt`) just moves the failure to the next kind's renderer. Fabricating a payload valid for
   all ~25 kinds would be building glue to force a green path — the exact sin this packet removed.
2. **HTTP path.** Instrumented a temp copy of the smoke with the line-384 assert replaced by a status
   print. Result: `401 AuthRequired` from `accessGuard.ts:122`. Reaching line 530 requires a valid clinic
   workspace token; forging one is outside a read-only review.

So the gap stands, exactly as the builder described it. What IS proven statically is strong: single call
site, in the shared shell, outside the per-kind dispatch, clean string present in the loaded artifact.
What is NOT proven is a live render. The builder said precisely that. No overclaim.

---

## 5. GIT HYGIENE

Clean. `679e0ee69` contains exactly `scripts/smoke-visit-workflow-forms-lifecycle.mjs` and nothing else —
no `apps/api/.data/*.json`, no `apps/web/tsconfig.tsbuildinfo`, no `scratch/**`, no other agent's file.
The worktree is currently filthy with ~40 `apps/api/dist/**` rebuilds and `.data` churn from concurrent
agents; **none of it rode along.** Packet docs were correctly split into their own commit `150c815fc`
(4 files, all `A`, all inside the packet dir).

Subject: `[ARCHON] fix(смоук): проверка подписи засчитывала испорченную кодировку как успех`.
Conventional Commits with a `fix(scope):` prefix; the scope and subject are Russian, which is the house
style here. It names the DEFECT ("the signature check counted corrupted encoding as a pass") rather than
"improve"/"update"/"cleanup". Not mojibake — verified at codepoint level. The body explains the WHY
(mandate 12): why deletion instead of repair, why it is safe, and what the side effect on the guard is.

---

## 6. REQUIRED REWORK

None that blocks. The following should be carried forward, in this order:

1. **Fix the two `UNIT VERIFIED` labels in the committed artifacts.** `state.md:97` and `handoff.md:81`.
   The builder retracted that label verbally; the files a future agent will read still assert it. In a repo
   whose disease is fabricated proof, an unretracted proof label on disk is the exact contagion vector.
2. **Correct the line-384 debt note.** `handoff.md:161-169` blames `guards.ts:1022`. The route actually
   returns `401 AuthRequired` from `accessGuard.ts:122` and never reaches the visit guard. Same root cause
   as the `401` the builder hit in `smoke-document-lifecycle`. One auth fix probably unblocks both smokes —
   and would let line 530 finally execute.
3. **Publish the full 27-file list** as the brief demanded, with the corrected 12/7/8 breakdown. Flag
   `scripts/smoke-api-text-encoding.mjs` specifically: it carries U+FFFD lost text, meaning a second
   encoding guard is itself encoding-damaged.
4. **Next packet: `scripts/smoke-patient-forms-lifecycle.mjs:334-335`** — the identical `A || mojibake(A)`
   disabled assertion, already correctly identified by the builder as blocker #1. Same one-line deletion.
5. **Add `scripts/smoke-tax-knd-xml.mjs:999` to that packet** — a negative assertion whose needle is
   mojibake, therefore permanently true. Not named by the builder.
