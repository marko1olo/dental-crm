# HH2-middle-risk-tier — adversarial review (in progress)

Reviewer: independent. Commit under review: `aabad8225522af75c1201618820a0690c37d2446`
Subject: `[ARCHON] test(смена): страж мёртвой ветки риска не видел сравнение, записанное не через ===`
Stat (mine): `apps/web/src/tests/shiftViewHumanText.test.ts | 91 +++++++-` → 1 file, +88/-3. Test-only.

## BRIEF MISMATCH (recorded before any verdict)

The review brief I was handed is a **money-conversion** brief: it asks me to count raw money
interpolations in `guards.ts`, to treat a changed money comparison as REVERT-grade, and to sweep for
`руб. ₽` / a second money helper. This commit contains **no money code at all**. The only tracked
`guards.ts` in the repo is `apps/api/src/documents/guards.ts`, which this commit does not touch and
which is not on the FILES list.

The implementer flagged the same mismatch in its own LABEL NOTE. I ran the money checks anyway (below)
so the numbers are measured rather than waved off, and then ran the equivalent checks for what this
commit actually is: a widening of a static text guard.

## 5. Attribution — PASS (measured first, cheapest)

- `git log -1 --format='%(trailers)' aabad8225…` → **empty** (1 byte, the trailing newline; `cat -A`
  shows only `$`).
- `git log -1 --format='%B' … | grep -Ein 'co-authored-by|anthropic|claude|generated with'` → **no
  match, exit 1**.
- Author and committer both `marko1olo <marko1olo@users.noreply.github.com>`.

## Preconditions for my own test runs

`git diff --quiet` exit 0 for all four files the test reads at HEAD:
`apps/web/src/ShiftView.tsx`, `apps/web/src/tests/shiftViewHumanText.test.ts`,
`packages/shared/src/index.ts`, `apps/web/src/AppHelpers.tsx`. So the implementer's claim that its
temporary ShiftView injection was reverted is **independently confirmed at HEAD**, and my runs measure
committed state, not another agent's half-written tree.

## 4. Would the test fail if the fix were reverted? — PASS, and the *delta* is load-bearing

Reproduced independently, with **zero repo writes**. I built four trees under
`C:/Users/Admin/AppData/Local/Temp/hh2rev/` from committed blobs (`git show aabad8225:<path>` for
`ShiftView.tsx`, `AppHelpers.tsx`, `packages/shared/src/index.ts`, plus the test). The test resolves its
inputs from `import.meta.url` (`webSource = ../`, `repoRoot = ../../..`), so a mirrored tree runs the
**byte-identical shipped test** — `md5sum` of my `v0` test copy equals the working-tree file
(`319575720f3bda0aca60f5b36fad0f51`).

| tree | ShiftView mutation | test version | result |
|---|---|---|---|
| v0 | none (HEAD blob) | post-commit | **EXIT 0, 7/7** |
| v1 | `riskLevel === "watch"` → `=== "medium"` (3 sites, true revert) | post-commit | **EXIT 1, 5 pass / 2 fail** |
| v2 | `=== "watch"` kept, added `riskLevel !== "medium"` | post-commit | **EXIT 1, 6 pass / 1 fail** |
| v2old | *same mutated file as v2* | **pre-commit (`aabad8225^`)** | **EXIT 0, 6/6 — blind** |

Assertions that break:

- v1 (true revert): `ShiftView.tsx: сравнение с «medium», которого нет в контракте (low | watch | high)
  — ветка мертва` in test «сравнения уровня риска ссылаются только на значения контракта», **plus**
  `ShiftView.tsx: у среднего уровня риска нет своей ветки оформления` in «средний уровень риска
  отличается от спокойного на вид».
- v2 (the spelling only the widened collector sees): the same `— ветка мертва` assertion, and **only**
  that one. `=== "watch"` was deliberately preserved so the pre-existing styling assertion could not be
  what fired.

v2 vs v2old is the point: **identical source, old test green, new test red.** The widening is not
ceremony — it closes a hole through which the exact defect this packet was opened for could return
invisibly. The implementer's injection claim reproduces.

Also confirmed the pre-existing assertion at line 229 (`source.includes('riskLevel === "watch"')`)
means a naive `=== "medium"` revert was *already* caught before this commit; the commit's own
contribution is precisely the four non-`===` spellings plus reversed operand order and `switch`/`case`.

## 1. Did it miss a site? — my own numbers

**Literal money question: N/A, measured not waved.** The only tracked `guards.ts` is
`apps/api/src/documents/guards.ts` (1303 lines, 136 money-ish tokens, 15 template interpolations,
imports `@dental/shared`). This commit does not touch it, is not on the FILES list for it, and contains
no money code. I cannot report "11 raw / 4 correct" for this commit because the commit has **0** money
sites of any kind. The brief's numbers belong to a different packet.

**Domain-equivalent question — machine-phrasing sites still raw in `ShiftView.tsx` at HEAD.** My grep,
not the brief's:

| pattern | my count at HEAD |
|---|---|
| `?? <obj>.<field>` raw-key fallbacks (regex `\?\?\s*\w+\.\w+`) | **0** |
| `?? app.status` / `?? queue.role` / `?? action.priority` | **0 / 0 / 0** |
| `дел: ${` | **0** |
| `шт.` | 1 — **line 738, inside `{/* … */}`** (comment only) |
| `1042` | 1 — **line 672, inside `{/* … */}`** (comment only) |
| Latin key interpolated as JSX text (`{x.status}`/`{x.role}`/`{x.riskLevel}` etc.) | **0** |

So inventory items 1-11 hold: nothing raw left in scope, and the `stripComments` rationale is real
(both surviving needles are provably comment-only). Items 13/14 also hold —
`apps/api/src/db/patientNoShowRiskQuery.ts:132` declares `let riskLevel: NoShowRiskLevel` and its
`"medium"` is a legitimate value of that separate enum; `patientInsightRiskSchema` is
`z.enum(["low","watch","high"])` at **`packages/shared/src/index.ts:2629`** (the inventory's "977" is
wrong; 977 is not the patient-insight schema). Repo-wide, the **only** `riskLevel` string comparisons in
non-test code are ShiftView:705/707 (`"high"`, `"watch"` — both in contract) and the NoShow ones.

**Genuine miss, outside the guard's one-file scope — `apps/web/src/components/PatientJourneyTimeline.tsx`.**
The same defect family the packet exists to kill is live there, unguarded:

- `:125` — `const insights: any[] = dashboard?.patientInsights || [];` — **`any`**, over the *same*
  `patientInsights` contract. This is verbatim the root cause the packet's own test asserts against
  («именно `any` позволил мёртвому сравнению дожить до сдачи») — closed in ShiftView, open here.
- `:28-33` — `const insightRiskLabels: Record<string, string>` containing **`medium: "контроль"`**. The
  ghost value is still in the web app. `Record<string, string>` means the compiler cannot see the drift;
  `AppHelpers.patientInsightRiskLabels` by contrast is `Record<Dashboard[…]["riskLevel"], string>` and is
  therefore correct by construction.
- `:134` — `status: insightRiskLabels[String(i.riskLevel)] ?? i.riskLevel` — a **raw-key fallback**, the
  exact shape banned in ShiftView by `FORBIDDEN_IN_SHIFT_VIEW`. It renders: `:267-271` prints
  `{evt.status}` in a `status-badge`. Currently unreachable (map covers low/watch/high), so **latent, not
  live** — but it is an English internal key one map-miss away from a user's screen.

Not introduced by this commit and outside its stated file scope; reported as follow-up, not as a defect
of `aabad8225`.

CSS checked too: `main.css` defines `.patient-insight-panel.risk-watch` / `.risk-high` and `.patient-row.risk-watch`
— the stylesheet speaks the contract vocabulary, no orphan `.risk-medium`. The middle tier is real both
inline and in CSS, so the user-visible fix is complete.

## 2. Did it touch a money COMPARISON? — NO. Not REVERT.

- `git show --numstat --format='' aabad8225 | grep -vc 'tests/'` → **0 non-test files.**
- Money/tolerance tokens (`kopeck|копе|amount|total|price|сумм|руб|₽|epsilon|tolerance|toFixed|Math.abs|<=|>=|formatKopecks`)
  on any added or removed line, case-insensitive → **0 hits.**
- Every equality operator in the diff is either the parser's own `source[closesAt] === "{"` /
  `depth === 0` brace bookkeeping, or a string literal inside the new self-check fixtures. **No
  comparison in product code was altered, and no epsilon or tolerance was introduced anywhere.**

## 3. Did it convert something that is NOT money? — NO

Nothing was converted; this commit adds no user-facing text and touches no counter, index, or row count.
`${index + 1}` line numbers and row counts are untouched (0 non-test files).

Guard-equivalent of this check — *does the widened collector red on correct code?* I extracted the two
shipped functions verbatim by line range (132-149, 162-179) and ran them under `tsx`:

| input | collected | verdict |
|---|---|---|
| A `x.riskLevel === "high" ? … : x.riskLevel === "watch" ? …` (real ShiftView shape) | `["high","watch"]` | correct |
| B `{ riskLevel: "medium", note: 1 }` (sampleData shape) | `[]` | **correct — object properties are not chased**, so items 13/14 stay out of the guard |
| E `"watch" === insight?.riskLevel` | `["watch"]` | correct |
| C `switch (sortKey === "riskLevel" ? a : b) { case "medium": }` | `["medium"]` | **FALSE POSITIVE** |
| D `switch (i.riskLevel) { case "watch": return "{"; }` + a foreign `switch (s.plan) { case "medium": }` | `["watch","medium"]` | **FALSE POSITIVE** |
| G `"medium" === insight!.riskLevel` | `[]` | **FALSE NEGATIVE** (`!` absent from `[\w.?\[\]]*`) |
| H `switch (getInsight(x).riskLevel) { case "medium": }` | `[]` | **FALSE NEGATIVE** (`[^)]*` cannot span the inner `)`) |

Case D matters because the commit body sells the brace counter as the thing that prevents exactly this:
«"до конца файла" приписало бы переключателю по риску `case` посторонних переключателей — страж
покраснел бы на верном коде». The counter is character-based and string-blind, so one unbalanced brace
inside a string literal reproduces the failure the message claims to have designed out. The same claim is
repeated in the in-file comment at lines 126-130.

Current exposure is **zero**: `grep -c switch apps/web/src/ShiftView.tsx` → **0**, and `!.` appears
**0** times in ShiftView.tsx and PatientsView.tsx. The literal `"riskLevel"` occurs only inside TS index
types, never as a sort key. So these are robustness/overclaim nits, not live breakage.

## Sweeps

- **`руб. ₽` adjacency** — `grep -rn 'руб\. *₽\|₽ *руб\.'` over `apps` + `packages` → **no hits.**
- **Second money helper** — the only formatter is `apps/web/src/AppHelpers.tsx:2592 export function money(...)`;
  `packages/shared/src/index.ts` exports **no** money formatter, so `money()` is the single
  implementation, not a duplicate. (Note for the lead: it takes **rubles** and does
  `Math.round(amount*100)%100`, which contradicts the brief's "integer kopecks with no epsilon" premise —
  further evidence the brief came from another repo/packet.)
- **Mojibake** — 0 U+FFFD in diff + message; all Cyrillic renders correctly; subject is clean.
- **English reaching a user** — the only Latin strings on added lines are code fixtures inside the
  self-check (`switch (appointment.status)`, `case "planned"`). Never rendered. All assertion messages
  are Russian.
- **Companion commit `957587053`** (on the FILES list): 1 file, `state.md`, +3, trailers empty, author
  `marko1olo`. Clean.

## Verdict: SOUND_WITH_NITS

Reproduced everything the implementer claimed that mattered, including the injection proof (my v2/v2old
pair is a stronger form of it, since it needs no repo write). Not REVERT: no comparison changed, no
tolerance introduced, no money code present. Not ceremony: the added test provably fails on a revert the
pre-commit test waved through.

Follow-ups (none block this commit):
1. `PatientJourneyTimeline.tsx` — `insights: any[]` at :125, ghost `medium:` key at :31, raw-key
   fallback `?? i.riskLevel` at :134 rendering at :271. Same defect family as this packet, unguarded.
2. Soften or satisfy the brace-counter claim at test lines 126-130 (case D falsifies it as written).
   Editing the in-file comment needs no history rewrite; the commit body cannot be amended now that two
   commits sit on top.
3. Optional: add `!` to the reversed-order char class and allow a call in the `switch` head (cases G/H).

Reproduction artifacts (outside the repo, safe to delete):
`C:/Users/Admin/AppData/Local/Temp/hh2rev/{v0,v1,v2,v2old}` + `*.log`,
`C:/Users/Admin/AppData/Local/Temp/hh2probe/probe.ts`.

