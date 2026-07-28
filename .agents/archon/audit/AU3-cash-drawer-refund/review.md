# AU3 — audit of 554919f62 «fix(касса): возврат больше не занижает наличные в ящике на свою сумму»

Auditor: adversarial, read-only. Nothing here is authority; the lead re-runs what matters.
Status: **готово** — verdict NEEDS_REWORK (§13 below). Не REVERT: HEAD is never worse than the parent.
No source file was written, no git state touched, no workspace gate run.

Commit: `554919f629bbae3d4bb21ad50e13e8487d0b7b2c`, parent `554919f62^`.
Files: `apps/web/src/components/finance/cashDaySummary.ts`,
`apps/web/src/components/finance/cashDaySummary.test.ts`,
`apps/web/src/components/finance/CashDayTally.tsx`.

## 0. HEAD drift check — none

```
git diff 554919f62..HEAD -- apps/web/src/components/finance/
```
exit 0. Only `FamilyWalletPanel.tsx` differs (a different commit's work). Verified byte-identical for the
audited file:
```
diff <(git show HEAD:apps/web/src/components/finance/cashDaySummary.ts) /tmp/head_impl.ts
-> HEAD_FILE_IDENTICAL_TO_COMMIT   (exit 0)
```
So auditing the commit == auditing HEAD for these three files.

## 1. The functional change is ONE line

`git diff --no-index parent head` filtered to code lines: everything except one line is comment/JSDoc.
The single behavioural edit is the **removal** of

```ts
if (payment.method === "cash") cashRub = addRub(cashRub, -amount);
```

from the `status === "refunded"` branch (which already ended in `continue`, in the parent too).

## 2. DEFECT REPRODUCES AT THE PARENT — CONFIRMED, with my own arithmetic

Instrument: neither the author's test nor `npm test`. I extracted both file versions with
`git show <rev>:<path>` into `/tmp` (outside the repo — no repo file created) and executed each under
Node 24 type-stripping with my own driver, no test framework:

```
git show 554919f62^:apps/web/.../cashDaySummary.ts > /tmp/parent_impl.ts
git show 554919f62:apps/web/.../cashDaySummary.ts  > /tmp/head_impl.ts
node --input-type=module-typescript --eval "$(cat /tmp/<impl>.ts)$DRIVER"
```

Realistic day (all same local day 2026-07-28): cash 5000, cash 1500.50, cash 300.01, card 4000,
**cash refund 1200**, **card refund 800**.

| | receivedRub | cashRub (drawer) | refundedRub |
|---|---|---|---|
| PARENT `554919f62^` (exit 0) | 10800.51 | **5600.51** | 2000 |
| HEAD `554919f62` (exit 0) | 10800.51 | **6800.51** | 2000 |
| my hand arithmetic (refund = status flip on same row) | 10800.51 | 6800.51 | 2000 |

`byMethod` is identical in both: `cash 6800.51 / 3 rows`, `card 4000 / 1 row`.

**The parent is internally inconsistent regardless of interpretation**: the `refunded` branch `continue`s
*before* `receivedRub`/`cashRub`/`byMethod` are incremented, so the refunded row's amount was **never
added** to the drawer — yet the parent subtracted it. Parent's own `byMethod` says cash 6800.51 while
its own `cashRub` says 5600.51: the two numbers on one screen disagree by exactly the cash refund. That
asymmetry is a genuine defect, not a framing choice. Deficit of 1200 ₽ ⇒ the parent's `differenceRub`
goes positive ⇒ the UI prints «в ящике на 1 200 ₽ больше … скорее всего, оплату приняли, но не записали
в программу», i.e. a fabricated accusation of unrecorded cash. Subject line is not a lie.

**Card refund does not touch the drawer in EITHER version** (800 card refund left `cashRub` untouched at
both revisions) — so the "fix forgot the method" failure mode is DISPROVED for card; see below for the
other five methods.

## 3. §8b exactness — no float tail, but rubles-as-float is pre-existing

Probe through the HEAD code, three cash rows 300.01 + 300.05 + 300.07:

```
HEAD  receivedRub = 900.13   cashRub = 900.13
raw   300.01+300.05+300.07  = 900.1299999999999
```

`addRub` = `Math.round((total + addition) * 100) / 100` per step, so the tail is killed at every step.
900.13, not 900.1299999999999. Money is held in **rubles as JS number**, not integer kopecks, and the
module does **not** import `packages/shared/src/utils/money.ts`. `addRub` is untouched by this commit
(pre-existing). No epsilon comparison anywhere in the changed code; the `differenceRub === 0` equality in
`CashDayTally.tsx:97-98` is exact (`Math.round(delta*100)/100`, then `=== 0`).

**No second money helper introduced.** `addRub` pre-dates the commit; the diff adds no arithmetic helper.
`CashDayTally` formats through the screen's shared `money()` prop only. §8b: no epsilon, no float tail, no
rounding that destroys a kopeck. PASS for this commit's own change.

## 4. Sign convention — SINGLE-OWNED AND POSITIVE. Fix does not invert the error.

The failure mode "refunds are stored negative AND subtracted again" is DISPROVED. Every writer of the
`payments` table, enumerated with `rg --multiline "insert\(\s*(schema\.)?payments\s*\)"` and
`rg --multiline "update\(\s*(schema\.)?payments\s*\)"` over the whole repo (excl. node_modules/dist):

| writer | status written | amount sign |
|---|---|---|
| `apps/api/src/db/billingQuery.ts:97` (`createPaymentInDb`, the cash-desk intake) | hardcoded `"paid"` | `positiveMoneyRubSchema` (`> 0`), `packages/shared/src/index.ts:27` |
| `apps/api/src/routes/finance_family.ts:484` (family-wallet debit) | hardcoded `"paid"` | positive |
| `apps/api/src/routes/finance_family.ts:617` (family-wallet top-up) | hardcoded `"planned"` | positive |
| `apps/api/src/migration/loader.ts:1055` (import from another CRM) | hardcoded `"paid"` | positive |
| `apps/api/src/scripts/seedOpsScreenshotDemo.ts:405` (fixture seeder) | hardcoded `"paid"` | positive |
| `db.update(payments)` | **does not exist anywhere in the repo** — the only textual hit is the comment `apps/api/src/documents/guards.ts:408` which itself states «db.update(payments) не вызывается ни разу» | n/a |

`createPaymentSchema` (`packages/shared/src/index.ts:4573`) has **no `status` field at all**, so the
client cannot choose one. The summary additionally guards with `if (amount <= 0) continue;`
(`cashDaySummary.ts:161`) — present in the parent too — so a negative row would be skipped, not
double-counted. There is no DB-level CHECK on `payments.amount_rub` (`rg CHECK apps/api/drizzle/*.sql`
finds none for payments), but no code path can produce one.

Live DB (read-only SELECT via `pg`, no secret printed, exit 0):

```
payments grouped by organization_id, status, method
  d0000000-…-d001  'Демо-клиника для снимков'  paid  card   n=8  min 5400.00  sum 67400.00
organizations
  d0000000-…-d001  Демо-клиника для снимков    <- FIXTURE (excluded per campaign facts)
  4a3420d1-…-e191  Стоматология, 1 кабинет     <- REAL clinic: ZERO payments rows
select count(*) from payments where amount_rub <= 0            -> 0
select status,count(*) from generated_documents
   where kind='payment_refund_correction_request'              -> [] (none)
```

Split by organization with the fixture excluded, the real clinic has **0 payments**, therefore **0 rows
with status='refunded'** and **0 negative amounts**.

## 5. FINDING A (high, §2) — the fixed branch is UNREACHABLE through any product write path

Nothing in the product can set `payments.status='refunded'`: no `UPDATE`, every `INSERT` hardcodes
`paid`/`planned`, and the create schema has no `status` field. Confirmed by the API's own comment at
`apps/api/src/documents/guards.ts:407-409`.

Consequence: the commit message states as fact a concrete admin experience —
«принял 5 000 ₽ наличными, отдельно принял и вернул 1 200 ₽ наличными … программа писала «по записям
должно быть 3 800 ₽»» — that **cannot be produced by using the program**. To reach it the row's status
must be flipped by hand in SQL. The code defect is real (proved in §2); the reported *symptom* is not
reachable end-to-end. That is the same shape as the campaign's «commit message describing a defect that
does not reproduce at its own parent», one level in: the arithmetic reproduces, the user story does not.

## 6. FINDING B (high, §1/§10) — the REAL refund path is a different table, and the drawer is still blind to it

Refunds in this product are recorded as documents, not as a payment status:
`generated_documents.kind='payment_refund_correction_request'`, `status='issued'`, payload
`paymentRefundCorrection` — `packages/shared/src/index.ts:3882-3899`:

```
action:       full_refund | partial_refund | payment_transfer | receipt_correction | payer_details_correction
amountRub:    positiveMoneyRubSchema           <- the refund's own amount
refundMethod: cash | card | bank_transfer | internal_offset | no_money_movement   <- the refund's own method
```

and `apps/api/src/documents/guards.ts:402-433` (`alreadyRefundedRubForPayment`) sums exactly those issued
documents as the source of truth for "how much of this payment has been returned", explicitly noting that
no extra column or migration is needed because «источник истины — сами документы возврата».

Therefore, at HEAD:
- `summary.refundedRub` is **0 for every refund the clinic actually performs** → the «Возвращено
  пациентам» row never renders. The panel that claims to show refunds shows none.
- A real **cash** refund removes physical banknotes from the drawer and `cashRub` accounts for it
  **nowhere** — not before this commit and not after. At close of day the counted cash is short and the
  panel prints «В ящике на X меньше, чем по записям», i.e. an unexplained shortfall on a legitimate
  refund. (No regression from this commit — the parent was equally blind, because the parent's subtraction
  only fired on `status='refunded'` rows that never exist.)
- `refundMethod` is stored **separately from the payment's method**, so a card payment can be refunded in
  cash. The parent's `if (payment.method === "cash")` therefore read the wrong field even in the
  hypothetical status-flip model. Removing that line is correct; keying off the original payment's method
  would have been wrong.
- The commit's DEBT note («нужна колонка refunded_at или отдельная строка возврата») **misidentifies the
  missing piece.** The refund's date, amount and method already exist in `generated_documents`. No
  migration is required to compute this correctly, and `dashboard.documents` is already delivered to the
  web (`FinanceView.tsx:344` passes `dashboard?.documents` to `FinanceLedger`), so `CashDayTally` can read
  them today.

## 7. FINDING C (medium, §3/§2) — the new hint names a cause that is not the product's behaviour

`CashDayTally.tsx:218`, added by this commit:

> «В ящике на X меньше, чем по записям. Проверьте сдачу и возвраты: возврат по оплате, принятой в другой
> день, в сегодняшний итог не попадает — программа не хранит время возврата.»

Two false implications for the person reading it:
1. «программа не хранит время возврата» — the program **does** store it: the issued refund document has
   its own date and amount (§6). The sentence is a statement about the product, shown to the user, and it
   is wrong.
2. It implies that a refund on a payment accepted **today** *does* land in today's total. It never does,
   for any day, because no code sets the status (§5). The admin is sent to check «возвраты за другой
   день» — a lead that cannot explain the shortfall.

This hint also fires on every shortfall cause (change given, miscount, an unrecorded withdrawal, theft)
and now leads with an explanation of an internal data-model gap rather than the action to take. §3 asks
the text to tell the grandmother what to DO next; «программа не хранит время возврата» tells her about
our schema.

## 8. FINDING D (medium, §13) — a refunded row contributes exactly 0 to the drawer: that is a GUESS

For a `refunded` row the drawer contribution is now 0, which is only correct if the refund happened on
the **same** day as the payment. Measured on my own driver, payment day = 2026-07-28, refund date unknown:

| refund actually happened | correct `cashRub` for the payment day | PARENT | HEAD |
|---|---|---|---|
| same day | 0 | −A (wrong by A) | **0 (right)** |
| a later day | +A (cash sat in the drawer at close) | −A (wrong by 2A) | 0 (wrong by A) |

So HEAD is better or equal in every case and never worse — no revert. But in the later-day case HEAD
still understates the drawer by A and prints the very same «В ящике на A больше, чем по записям. Скорее
всего, оплату приняли, но не записали в программу» false accusation the commit says it removed, at half
the magnitude. §13 «never a fabricated 0 or default substituted for an unknown»: the 0 is a substituted
default for "was the refund today?". Mitigating: it is stated in the JSDoc and hinted in the UI, so it is
a documented guess, not a silent one.

## 9. FINDING E (nit) — `refundedRub` takes the payment's FULL amount, but refunds can be partial

`paymentRefundCorrectionPayloadSchema.action` includes `partial_refund`, and
`alreadyRefundedRubForPayment` is built to accumulate several partial refunds against one payment while
that payment's status stays `paid`. If a `refunded` status is ever written after a partial refund, the
tally will report the whole payment as returned to the patient. Latent, gated on FINDING A.

## 10. Reachability — VERIFIED LINK BY LINK. The component is mounted.

1. `apps/web/src/workspaceShell.tsx:54` — `appViews` contains `"finance"`.
2. `apps/web/src/AppHelpers.tsx:6125-6132` — `viewFromHash()` takes `location.hash.split("/")[0]` and
   returns it only if `appViews.includes(...)`; `#finance` → `"finance"`.
3. `apps/web/src/App.tsx:4055` — `{currentView === "finance" ? (` … `<FinanceView …>` at 4068, behind
   `lazy(() => import("./FinanceView")…)` at `App.tsx:388` — a real import, not an orphan.
4. `apps/web/src/FinanceView.tsx:10` — `import { CashDayTally } from "./components/finance/CashDayTally";`
   rendered at `FinanceView.tsx:337`.
5. `FinanceView.tsx:338` — `payments={dashboard?.payments}`, i.e. the whole clinic's journal (NOT
   `activePayments`), so the panel's claim «по всей клинике, а не только по выбранному пациенту»
   (`CashDayTally.tsx:227`) is **true**. Checked because it would have been a §2 lie otherwise.
6. `CashDayTally.tsx:85` — `summarizeCashDay(payments, dayKey)` → the changed line.
7. Server side: `apps/api/src/db/domainStateHydration.ts:261` hydrates `payments` with
   `selectByOrganization` = `select().from(payments).where(organizationId = …)` — **no status filter**, so
   a `refunded` row would reach the browser if one existed.

The changed line is reachable from a routed view. Only the *data* that exercises the changed branch is
unreachable (FINDING A).

## 11. Tests — THEY ASSERT. Proved by executing the parent with the new expectations.

```
node --import tsx --test apps/web/src/components/finance/cashDaySummary.test.ts
tests 14 | suites 2 | pass 14 | fail 0 | cancelled 0 | skipped 0 | todo 0
TRUE_EXIT=0
```
`apps/web/package.json` test glob is `src/**/*.test.ts`, so the file is inside the workspace run the
author claims to have used. Runner is `node:test` via tsx — no Vitest, no Playwright added.

Reversion standard, measured rather than argued — the author's two scenarios run against the PARENT
implementation:

```
##### PARENT (fix reverted) #####
T1 cashRub = 3800  | assert.equal(summary.cashRub, 5000) -> FAIL: Expected values to be strictly equal
T2 cashRub = -3000 | assert.equal(summary.cashRub, 0)    -> FAIL: Expected values to be strictly equal
##### HEAD (fix present) #####
T1 cashRub = 5000  -> PASS
T2 cashRub = 0     -> PASS
```

Named assertions that break on reversion:
- `cashDaySummary.test.ts:178` — `assert.equal(summary.cashRub, 5000)` in «возврат не входит в приход и НЕ
  занижает ящик» (parent yields 3800).
- `cashDaySummary.test.ts:188` — `assert.equal(summary.cashRub, 0)` in «возврат единственной наличной
  оплаты не делает ящик отрицательным» (parent yields −3000).

Not ceremony. §8 satisfied. The other 18 added lines are comment/rename, and the renamed test title now
matches what it asserts (the old title «наличный возврат уменьшает ящик» asserted the defect).

## 12. Constitution sweep of the added lines — clean

```
git show 554919f62 --unified=0 -- apps/web/src/components/finance/ | grep '^+' \
  | grep -E '#[0-9a-fA-F]{3,6}|[0-9]+px|Internal Server|Error:'     -> no output
git show 554919f62 -- .../finance/ | grep -cE 'Р[°-Ÿ]|Ð[°-Ÿ]|РІ|Ã'  -> 0 (exit 1, no mojibake)
```
No hex colour, no px, no English user-facing string, no mojibake, no invented contract field, no second
money helper, no `{success:true}` facade, no `clinicMode` hardcode, no retyped FDI tooth list, no test
that cannot run.

Pre-existing, NOT introduced by this commit (found not fixed):
- `cashDaySummary.ts:16` cites «cashDayTally.test.ts» as the file that executes the function. That file
  does not exist (`ls apps/web/src/components/finance/`); the test is `cashDaySummary.test.ts`.
- `CashDayTally.tsx` inline hardcoded px/values: `margin: "8px 0 0"` (113, 118), `marginTop: "12px"` (188),
  `maxWidth: "280px"` (194), `fontSize: "13px"` (226). §13 forbids px outside hairlines.
- Orphan `CashShiftWidget.css` in the same folder (acknowledged in the file's own header).

## 13. Verdict

**NEEDS_REWORK.** The one-line change is correct, minimal, kopeck-exact and genuinely fixes an internal
arithmetic asymmetry (parent subtracted an amount it never added — its own `byMethod` cash total
contradicted its own `cashRub` by exactly the cash refund). The tests really assert. The component is
really mounted. Nothing here is worse than what it replaced, so **not a revert.**

What blocks SOUND: the commit ships a user-facing sentence that is false about the product (FINDING C),
narrates as observed fact an admin experience the product cannot produce (FINDING A), and records a DEBT
that points at a migration nobody needs while the refund data the drawer needs already exists in
`generated_documents` (FINDING B). In a cash-reconciliation panel a wrong explanation is expensive: it
tells the person counting banknotes to look in the wrong place.

### Required rework
1. `CashDayTally.tsx:218` — drop «программа не хранит время возврата». It is false: refund date, amount
   and method live in the issued `payment_refund_correction_request` document. Replace with what the
   number actually excludes and what to do: refunds are not in this total at all, so check the refund
   documents for today.
2. Correct the commit's DEBT note (in the follow-up commit body or a code comment): no `refunded_at`
   column is required. `generated_documents` + `paymentRefundCorrection.{amountRub, refundMethod}` +
   the document's issue date is the existing source of truth, per
   `apps/api/src/documents/guards.ts:402-433`.
3. Make `summarizeCashDay` read refunds from issued `payment_refund_correction_request` documents keyed by
   the refund's OWN date and `refundMethod`, and subtract only `refundMethod === "cash"` from `cashRub`.
   `dashboard.documents` is already on the client (`FinanceView.tsx:344`). Until that exists, the panel's
   «Возвращено пациентам» row is dead code: it can never render.
4. Either give `payments.status='refunded'` a writer or state plainly (comment + commit message) that the
   branch is currently unreachable and the fix is prophylactic. Right now the commit body describes an
   admin experience that no sequence of clicks can produce.
5. Handle `refundMethod` values `internal_offset` and `no_money_movement` explicitly when (3) lands —
   neither may touch `cashRub`, and `bank_transfer`/`card` must not either.
6. Optional, cheap: `cashDaySummary.ts:16` — fix the cited test filename to `cashDaySummary.test.ts`.

### Gaps I did NOT close (honest, with the command that would close them)
- No browser/runtime proof. Forbidden this cycle (three agents mid-edit, 5173 is not evidence). The
  command that would close it, for the lead only: `npm run build -w @dental/web` then load `#finance`
  with a payment whose status was flipped to `refunded` by hand and read the panel.
- No workspace typecheck (`npm run typecheck -w @dental/web`) — §7a, lead only. The change removes a
  line and adds comments/strings only; no new identifier, no signature change, so a type break is
  implausible but unmeasured by me.
- CLOSED during the audit: no other consumer assumed the old "refunds already deducted" semantics.
  `rg -l "cashRub|summarizeCashDay|CashDaySummary" apps/web/src apps/api/src packages/shared/src` returns
  exactly three files — `CashDayTally.tsx`, `cashDaySummary.ts`, `cashDaySummary.test.ts`. No server-side
  or cross-module contract depends on the changed semantics, so §10 (synchronous update of all sides of a
  shared contract) is not engaged.

Status: **audit complete**.

