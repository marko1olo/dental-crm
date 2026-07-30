# KK3-ratchet-rework — adversarial review

Reviewer: adversarial reviewer (did not write this code), reporting to ARCHON. READ-ONLY — no repo
writes; all mutation work done on an out-of-repo copy under `%TEMP%/kk3rev/`.

Commits: `80aa42a3a5f8f1bff93dfce299f2559615270e28` (1/2) + `adf92f08d328d8ead9e2906c3f910eaaddb12b59` (2/2).

**VERDICT: SOUND_WITH_NITS.** Every claim the agent made, I reproduced. It also *under*-claimed twice
(two of the three new assertions it never proved, I proved) and disclosed a negative result that worked
against its own case. No money comparison touched. Attribution clean.

---

## 0. Scope reality — the brief's inventory is stale boilerplate, and the agent was right to say so

The agent's first inventory line declared `SCHEMA MISMATCH` and refused to pretend it had done money
work. **Confirmed from the dispatch source**, not taken on trust:

`.agents/archon/cycle22.workflow.js:145-149` defines KK3 as:
- `files: 'apps/api/src/tests/webCallsExistingRoutes.test.ts'`
- `gate: 'node --import tsx --test apps/api/src/tests/webCallsExistingRoutes.test.ts'`
- brief body: prove the ratchet **fails** on a synthetic "path exists, method differs" violation, and
  give a verdict on each dead debt-list line. Explicitly: `НЕ ЧИНИТЕ САМИ МАРШРУТЫ`.

The money-formatting checklist in *my* reviewer brief is a template reused verbatim across cycles — the
identical sweep sentence («руб. ₽» … `formatKopecksRu`) is present in `cycle14`, `15`, `16`, `17`, `18`,
`19` and `22` `.workflow.js`. It does not describe KK3. The agent's refusal to fabricate money sites is
the correct behaviour and it flagged it in the first line of its inventory.

`git show --stat` on both commits: exactly one file each, `apps/api/src/tests/webCallsExistingRoutes.test.ts`
(129+/19-, then 65+/3-). `state.md` untracked as claimed.

## 1. Did it miss a money site? — my own grep

`guards.ts` at HEAD has **15** `${…}` interpolation lines total:

- **11 carry money — all 11 already wrapped** in `moneyRubText`/`moneyKopecksText`:
  424, 540, 544, 545, 744, 758, 772, 783, 841, 850, 881.
- **4 are not money and correctly raw**: 199 (`documentLabel` + key list), 445 and 451 (fiscal-receipt
  IDs), 954 (tax **years** `input.taxYear` / `application.requestedTaxYear`).

**Raw money-in-text sites in guards.ts at HEAD: ZERO.** A repo-wide sweep of `apps/api/src/**/*.ts` for
`${…Rub|Kopeck|amount|price|total…}` outside a formatter returned nothing.

The brief's "11 raw at dispatch" never described `guards.ts` at dispatch. `guards.ts` was last touched by
`185f181ac` ("отказ по денежному документу бросал исключение вместо объяснения суммы"), which is an
**ancestor** of `80aa42a3a` — the money work landed *before* this packet. Even at `185f181ac^` the same
11 sites were already formatted, just verbosely (`kopecksToNumericString(parseKopecks(...))`);
`185f181ac` only extracted the two helpers. Neither KK3 commit touches `guards.ts`.

### Pre-existing raw money outside guards.ts (ancestor code, NOT this packet's scope — for the lead)

- `apps/api/src/migration/loader.ts:1100` — `сумма ${amountRub} руб.` in an audit-event reason, no formatter.
- `apps/api/src/ai/treatmentPlanPersonalize.ts:192` and `:196` — `${s.estimatedAmountRub} + " руб."` and
  `${input.payload.estimatedTotalRub} + " руб."` into an LLM prompt, no formatter.
- `apps/api/src/documents/renderDocument.ts:98` is **fine** — `amount` there derives from
  `kopecksToNumericString(parseKopecks(value))` with `ru-RU` grouping.

## 2. Did it touch a money COMPARISON? — NO. Not REVERT-grade.

`git grep -c -iE 'money|kopeck|rub|amount|price|сумма|руб'` on the touched file returns **nothing** —
zero money identifiers, before or after. The only comparison changes in the entire two-commit diff:

```
+		if (known.some((entry) => candidate === entry)) continue;
-			if (KNOWN_METHOD_MISMATCH.some((known) => candidate === known)) continue;
```

String equality, plus `Set.has` membership. No `epsilon`, no `tolerance`, no `Math.abs`, no `toFixed`,
no numeric relational operator anywhere in the diff. The integer-kopecks-without-epsilon gates are
untouched.

## 3. Did it convert something that is not money? — NO conversions at all.

The packet contains zero formatting changes. `guards.ts:744`'s `строка ${index + 1}` remains a raw row
index (correct — only the two sums on that line are wrapped), and the packet never went near it.

## 4. Would the test fail if the fix were reverted? — YES. Five mutations, all EXIT=1.

Method: `git show HEAD:<file>` into `%TEMP%/kk3rev/base.ts`, then rewrote **only** the two path
constants (`apiSrc`/`webSrc`, derived from `import.meta.url`) to absolute repo paths so the copy reads
the **real** tree. Baseline on that copy: **EXIT=0, tests 8 / pass 8 / fail 0** — matches the agent's
claimed green state, so the copy is faithful.

| mutation | EXIT | pass/fail | assertion that breaks |
|---|---|---|---|
| **A** revert the fix: `isServed(candidate, withMethod)` -> `isServed(candidate.slice(…), paths)` inside `methodMismatches` | 1 | 7/1 | `assert.deepEqual(caught, ["DELETE /api/clinical/rules/:param — зовут: useAppLogic.tsx"])` in «отбор падает на искусственном нарушении «путь есть, метод другой»» — actual `[]` |
| **B** fabricated `OPTIONS /api/clinical/rules/:param` in `KNOWN_METHOD_MISMATCH` | 1 | 6/2 | `uncalledPairs` — «Эти пары метод+адрес не зовёт ни один файл интерфейса…» |
| **C** entry -> `PATCH /api/clinical/rules/:param` (which *is* registered) | 1 | 6/2 | `methodNowServed` — «Эти пары уже обслуживаются — маршрут добавлен…» |
| **D** entry path -> nonexistent `DELETE /api/clinical/no-such-thing/:param` | 1 | 5/3 | `misfiled` — «У этих записей больше нет самого пути на сервере…» *and* `uncalledPairs` |
| **E** reduce `isServed` itself (`index === 0 ||` — stop comparing the method segment) | 1 | 5/3 | «закрепление: isServed различает метод» *and* the new test *and* `misfiled` |

- **A** confirms the agent's MUTATION PROOF A exactly (same test, same message, `[]` vs one item).
- **B** confirms MUTATION PROOF B exactly.
- **C** and **D** are proofs the agent did **not** provide. Commit 2/2 added *three* new assertions;
  the agent proved one. I proved the other two are live. No ceremony among them.
- **E** shows the renamed «закрепление» test is **not** pure ceremony: it guards the *other* reduction
  site (inside `isServed`), which the new test alone would not catch. Together the two tests cover both
  sites — caller and callee. The rename is honest, not a demotion of a useless test.

**The agent's disclosed negative result is CONFIRMED.** On mutation A, both «закрепление: isServed
различает метод» *and* the real-tree «каждый вызванный адрес обслуживается ТЕМ ЖЕ методом» **PASS**. The
integration test is vacuous under the reduction — its expected value is `[]` because both live defects
sit in `KNOWN_METHOD_MISMATCH`, and the reduction only ever makes the list emptier. So the synthetic unit
test is the *only* thing that catches the regression. The agent reported this against its own interest
instead of burying it; that is the reason the extraction of `methodMismatches` was necessary rather than
cosmetic.

### Both declared defects verified live at HEAD, independently

- `routes/clinical.ts`: `POST /api/clinical/rules/evaluate:46`, `POST /api/clinical/rules:75`,
  `PATCH /api/clinical/rules/:ruleId:87` — **no DELETE**. Web calls `DELETE` at
  `apps/web/src/useAppLogic.tsx:11060-11066` (`removeClinicalRule`) and `PATCH` on the same path at
  `:11084-11092`. The delete button cannot ever work.
- `routes/xray.ts`: `POST /api/xray/scans:99`, `POST /api/xray/scans/:id/analyze:144`, `GET:206`,
  `GET /:id:227`, `DELETE /:id:249` — **no PUT**.

Parser floor: measured `calls.size = **200**` (asserted `> 150`), so no collateral silence.

## 5. Attribution — clean

```
git log -1 --format=%(trailers) 80aa42a3a5f8f1bff93dfce299f2559615270e28  ->  (empty)
git log -1 --format=%(trailers) adf92f08d                                ->  (empty)
```

`grep -icE 'co-authored-by|anthropic|claude|generated with|noreply@anthropic'` over both full bodies:
**0** and **0**. Author and committer on both: `marko1olo <marko1olo@users.noreply.github.com>`.

## Sweeps

- **«руб. ₽» double unit**: zero in product code. All hits are inside `.agents/archon/*.workflow.js`,
  `progress.md` and `commitmsg-cycle14.txt` — i.e. the text of the brief itself.
- **Second money helper**: none. `guards.ts:87/102` `moneyRubText`/`moneyKopecksText` are thin
  `try/catch` wrappers over `@dental/shared`'s `parseKopecks` + `kopecksToNumericString`, and the
  docstring at `guards.ts:72-75` says so explicitly. `formatKopecksRu` is **not** used there.
- **Mojibake**: 0 in both subjects, both bodies, and all added diff lines. Russian renders correctly.
- **English reaching a user**: none added. The only Latin text in added strings is the fixture filename
  `useAppLogic.tsx` and route paths.

## Nits (not rework-grade)

1. **`methodFromOptions` change is a provable no-op on this tree — measured, not argued.** I instrumented
   both variants (with and without the two new early-returns) and dumped the parsed pair set: **identical,
   200 keys, zero difference either way**. So the change has no test and no observable effect today. The
   agent labelled it correctly («здесь закрыт не живой дефект, а дорога к нему») instead of overclaiming,
   which is the right call. But the docstring's wording *"На этом дереве ни одной такой записи нет"* is
   imprecise: a `{ method }` shorthand fetch-options object **does** exist at
   `apps/web/src/components/settings/SettingsProtocolsTab.tsx:108` (present at `adf92f08d`). It never
   reaches `methodFromOptions` only because its first argument is the variable `url`, so the earlier
   `literalValue(args[0])` / `startsWith("/api/")` filter drops it first. The claim should read "no such
   entry *reaches this function*", not "no such entry exists".
2. **Silent-drop path has no ratchet.** `webCallsWithMethod` does `if (!method) continue;` — a `null`
   return makes the call **invisible** to the ratchet, and the two new early-returns add two more sources
   of that false negative. The only guard is `calls.size > 150` against an actual 200, i.e. 50 pairs of
   slack. A moderate refactor toward `{ method }` shorthand could shrink ratchet coverage without
   reddening anything. Follow-up worth queueing: assert on the count of *dropped* `/api/` fetch calls,
   not only on the count of parsed ones.

## Tree hygiene — NOT this packet's fault, but the lead should know

The working tree right now carries an **uncommitted** 204+/27- modification to this very file from a
concurrent agent, adding a 9th test «разбор серверных файлов не считает маршрутом ни комментарий, ни
строку» (`git status --porcelain` -> ` M`; real repo file runs 9/9, HEAD runs 8/8). The packet's own
committed state is clean at HEAD and no commit since `adf92f08d` touches this file. Flagging it because a
bare `git commit -a` by any agent would ship it — the same shared-index hazard the packet itself reported
and cleared during its own mutation run.
