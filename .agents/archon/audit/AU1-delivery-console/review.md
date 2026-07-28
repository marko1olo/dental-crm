# AU1 — adversarial audit of 35ced8f1b «fix(связь): отказ отправки выглядел на экране как успешная отправка»

Auditor: adversarial, read-only. Author: marko1olo, 2026-07-28 21:07 +0400.
Parent: `eed3a4e2012c7f2c82061f7388956b7561091d79`. Files: only
`apps/web/src/components/communications/MessageDeliveryConsole.tsx` (+107/-19).
HEAD at audit time: `39a72952336614e3394c5743ae510f90dd5f313c`.

`git log --oneline -8 -- apps/web/src/components/communications/MessageDeliveryConsole.tsx` → 35ced8f1b is
still the newest commit touching the file, so HEAD content == commit content for this file.

**VERDICT: NEEDS_REWORK.** The change is a genuine, real improvement on five of five *thrown-exception*
paths. It does NOT achieve its own stated goal, because on both of the two paths where the server answers
`200 OK` and the messages still did not go out, the screen shows a calm grey `role="status"` line — the
exact artefact the commit exists to abolish — and on the dispatch path it **deleted the one number
(`claimed`) that used to make the discrepancy visible.**

---

## 0. Did the claimed defect exist at the parent? YES — reproduced with my own instrument.

`git show 35ced8f1b^:apps/web/src/components/communications/MessageDeliveryConsole.tsx > /tmp/parent_console.tsx` → exit=0
`grep -n 'setNotice\|role="status"' /tmp/parent_console.tsx` → exit=0:

- parent L193 `const [notice, setNotice] = useState<string | null>(null);` — one untyped string field.
- parent L307 / L322 / L346 / L365 / L384 — five catch blocks, every one
  `setNotice(error instanceof Error ? error.message : String(error));`
- parent L437 — the ONLY renderer of `notice`:
  `<p className="ops-notice" role="status" aria-live="polite">{notice}</p>`
- `readJson` (parent L164-174, unchanged at HEAD L175-185) throws `new Error("Сервер ответил ${status}")`
  on `!response.ok`.

So a 500 from `/api/communications/outbox/dispatch` really did land as «Сервер ответил 500» in the SAME
grey `.ops-notice` with `role="status"` as «Шаблон создан.». The commit message's premise is REAL, not
invented. Not taken on trust — read off the parent's own lines.

## 1. Reachability — VERIFIED LINK BY LINK. The component IS mounted.

1. `apps/web/src/workspaceShell.tsx:54` — `appViews` contains `"communications"`.
2. `apps/web/src/AppHelpers.tsx:6125-6132` `viewFromHash()` — `appViews.includes(view)` → `#communications` resolves.
3. `apps/web/src/App.tsx:4140` `{currentView === "communications" ? (` … `:4152` `<CommunicationsView …>`
   (lazy import declared at `App.tsx:389`).
4. `apps/web/src/CommunicationsView.tsx:6` imports `MessageDeliveryConsole`; `:354` renders
   `<MessageDeliveryConsole />` **unconditionally** — the `hasCapability(clinicMode,"massCampaigns")` gate
   on the very next line applies to `CampaignPanel`, not to this console.
5. `workspaceShell.tsx:174-183` — every clinicMode nav list contains `"communications"`.
6. The changed notice renderer is `MessageDeliveryConsole.tsx:518-528`, inside the component's main
   `return`; the only earlier return is the `loadError` branch at `:472`.

**CONFIRMED reachable.** This is not a fix to an unmounted file.

## 2. The CSS class exists and is genuinely red, from theme tokens.

`apps/web/src/styles/dente-operations.css:471-475`
`.ops-notice--error { border-color: transparent; background: var(--bad-bg); color: var(--bad-fg); }`
(base `.ops-notice` at `:461`). No hex, no new px. §13 clean.

## 3. What the fix genuinely got right — do not undo these.

- Five thrown-error paths now render `ops-notice--error` + `role="alert"` and each carries a specific,
  actionable Russian hint naming what did NOT happen. That is real §3 work.
- `countLabel` is imported from the single sanctioned pluralizer (`AppHelpers.tsx:2539-2546`, used in 10+
  other files). No second helper was created. Pluralization logic verified by reading: `11-14`→many,
  `last===1`→one, `last 2..4`→few, else many; `0`→«0 сообщений» ✓.
- Per-row retry is **server-side safe**: `apps/api/src/routes/communicationsOutbox.ts:666-694` restricts
  retry to `inArray(status, ["failed","cancelled","suppressed"])` and returns 409
  «Повторить можно только неудачное, отменённое или задержанное сообщение.» A `sent`/`delivered` row
  cannot be re-sent. **No double-messaging defect. Hypothesis 4: DISPROVED.**
- The notice's promise «кнопкой «Повторить» можно попробовать снова» is kept for the `failed` rows it
  refers to: `dispatcher.ts:670` writes `status:"failed"`, and `MessageDeliveryConsole.tsx:722-730` renders
  «Повторить» for `failed|cancelled|suppressed`. §3 button-promise holds here.
- **Hypothesis 5 (optimistic state): DISPROVED for the list.** There is no optimistic mutation anywhere;
  every handler does `setNotice(null)` → await → `loadAll()`. Nothing is marked «отправлено» before the
  request resolves, so nothing needs rolling back. (But see FINDING 3 for the settings form.)
- No mojibake in added lines: `rg '\x{fffd}|Ð[°-¿]|Ñ[€-]' /tmp/d.patch` → exit=1 (no match).
- No new hardcode: `rg '#[0-9a-fA-F]{3,8}|[0-9]+px|toFixed|Math\.round|parseFloat|\* 100|/ 100'` over the
  added lines → exit=1 (no match). No money arithmetic added; no second money helper.
- «200 with an error body» does **not** apply to this API: every failure path is a real non-2xx —
  `validationError` → `reply.code(400)` (`communicationsOutbox.ts:195-197`), 409 for conflicts, and
  `requireClinicalMutationContext` short-circuits. `rg 'reply.code\(200\)|success: true'` over
  `communicationsOutbox.ts` → exit=1. **So `readJson`'s `!response.ok` check is sufficient — for HTTP.
  The per-recipient refusal is instead carried INSIDE the 200 body, in `report`. That is FINDING 1.**

---

## FINDING 1 — SEVERE, and it is a REGRESSION, not merely an incomplete fix.
## `runDispatch` renders a gateway refusal as a calm grey success line, and it DELETED the only number
## that used to expose the discrepancy.

The server report is **seven** fields, not four.
`apps/api/src/services/communications/dispatcher.ts:375-383`
```
export type DispatchReport = {
  readonly claimed: number; readonly sent: number; readonly retried: number;
  readonly failed: number; readonly suppressed: number; readonly deferred: number;
  readonly releasedStuck: number;
};
```
The route returns it whole — `apps/api/src/routes/communicationsOutbox.ts:700-714` → `return { report }`.

The web component declares a 4-field subset (`MessageDeliveryConsole.tsx:376`)
`{ report: { claimed: number; sent: number; failed: number; suppressed: number } }`
and branches only on `sent` / `failed` / `suppressed` (`:388-401`).

`retried` is the **transient-refusal** outcome. `dispatcher.ts:640-664`: the provider send returned
`ok:false`, `decideAfterFailure` chose `retry`, the row is written back with `status:"queued"`,
`attempts+1`, `lastErrorClass`/`lastErrorMessage` set and a back-off `nextAttemptAt`; `processRow` returns
`"retried"` (`:664`), and `dispatchDueMessages` counts it into `report.retried` (`:723`) — **never into
`failed`.**
`deferred` is the quiet-hours outcome — `dispatcher.ts:602-604` → `markDeferred` (`:515-528`) sets
`status:"queued"` with a future `nextAttemptAt`.

**Failure scenario, gateway down (the most common real failure), 5 messages claimed:**
report = `{claimed:5, sent:0, retried:5, failed:0, suppressed:0, deferred:0}`.
Web path: `claimed !== 0` → `parts = ["Отправлено: 0 сообщений."]`; `failed>0` false → no error part;
`suppressed>0` false → no part; `kind = report.failed > 0 ? "fail" : "done"` → **`"done"`** → rendered at
`:524` as `<p className="ops-notice" role="status" aria-live="polite">`.
**Screen reads exactly: «Отправлено: 0 сообщений.» in the calm grey box, no colour, no `role="alert"`,
no instruction.**

**This is worse than the parent.** The parent printed
`Разобрано 5: отправлено 0, ошибок 0, не отправлено 0`, where `claimed=5` next to `sent=0` was the one
on-screen trace that five messages had been taken and none went out. The new text **drops `claimed`
entirely**, so that trace is gone. Same for the quiet-hours `deferred` case.

**Second-press amplification.** After that batch, the retried/deferred rows carry a future
`nextAttemptAt`, and `claimBatch` filters `lte(nextAttemptAt, now)` (`dispatcher.ts:418`). So on the next
press `claimed === 0` and the new empty branch (`:380-386`) fires:
«**Отправлять было нечего: в очереди нет сообщений, готовых к отправке. Они появятся после кнопки
«Поставить напоминания» или после запуска рассылки.**» — grey, `role="status"`, and it invites the
administrator to **queue MORE messages** while five undelivered ones sit backed off. `«готовых к отправке»`
is technically true; the second sentence is false in this state.

**Partial mitigation, stated honestly.** The red banner at `:545-563` fires when
`configuredChannels.length > 0 && !automaticSending.enabled && automaticSending.waiting > 0`, and
`waiting` (`communicationsOutbox.ts:875-893`) counts `status='queued' AND scheduledAt <= now` —
`markDeferred`/retry change `nextAttemptAt`, not `scheduledAt`, so retried and deferred rows DO count as
`waiting`. So on a dev box with the worker off there is a red banner above. **In production with the
background worker ON (`automaticSending.enabled === true`) the banner is suppressed and the grey
«Отправлено: 0 сообщений.» is the only signal at the top of the screen.** The journal below does show the
rows as «В очереди» with `lastErrorMessage`, so the information is not literally absent — but the notice
the administrator reads is the calm grey one, which is the whole defect.

Hypothesis 1: **CONFIRMED as still-broken for `retried` and `deferred`.**

## FINDING 2 — SEVERE. `runReminders` reports «Поставлено напоминаний: N» in grey while patients who
## will NOT be reminded are counted server-side and never named.

`apps/api/src/services/communications/appointmentReminders.ts:43-53`:
```
export type ReminderScheduleReport = {
  organizations; examined; queued; alreadyQueued;
  /** Нет ни одного канала с контактом, согласием и шаблоном. */ skippedNoChannel: number;
  /** Шаблон есть, но не хватило значения переменной — отправка остановлена. */ skippedNoTemplateData: number;
  problems: string[];
};
```
`:339-342` increments `skippedNoChannel` / `skippedNoTemplateData`. `rg 'problems.push'` over that file →
only TWO sites, `:160` (a thrown error per organization) and `:211` (no active template). **Neither
`skippedNoChannel` nor `skippedNoTemplateData` is ever pushed into `problems`.**

The web component (`MessageDeliveryConsole.tsx:421`) declares only
`{ report: { queued: number; alreadyQueued: number; problems: string[] } }` and reads only those three.

**Failure scenario:** 10 appointments tomorrow, 3 patients have no phone / no consent →
`{queued:7, alreadyQueued:0, skippedNoChannel:3, skippedNoTemplateData:0, problems:[]}`.
Web: `problems.length === 0` → `{kind:"done", text:"Поставлено напоминаний: 7. Уже стояли в очереди: 0."}`
→ grey `role="status"`. **Three patients will not be reminded, will not come, and the screen says nothing
about them.** The clinic will blame the patients. This is the same defect class the commit was written to
kill, on the sibling handler, untouched. §1 / §3.

Hypothesis 2 (partial success): **CONFIRMED as unhandled on the reminders path, and unhandled for
`retried`/`deferred` on the dispatch path.** On the dispatch path the `failed`/`suppressed` counts ARE
surfaced, but only as counts — the recipients are named only in the journal below, not in the notice.
That part is acceptable (same screen, `recipientAddress` + `lastErrorMessage` per row at `:696-705`).

## FINDING 3 — the new reassurance «переключатели ниже показывают то, что действует сейчас» is FALSE
## for the two quiet-hours fields. A fabricated reassurance in an error message.

`MessageDeliveryConsole.tsx:461-465` (new): on a failed `saveSettings` the screen asserts
«Правила не сохранены, на сервере осталось прежнее. Попробуйте ещё раз — **переключатели ниже показывают
то, что действует сейчас.**»

But `:882-892` and `:896-906` are **uncontrolled** inputs:
`<input id="quiet-start" type="time" defaultValue={minutesToTime(settings.quietHoursStartMinute)} onBlur=…>`
— `defaultValue`, no `value`, **no `key`**. React applies `defaultValue` only at mount; the element's
position in the tree is stable, so it never remounts. On a failed save `settings` is unchanged, the field
keeps what the administrator typed. Screen then shows, simultaneously: the hint at `:874` reading the
server value («Тихие часы: 22:00 — 08:00») and the input reading the rejected value (23:00), with an error
message asserting the input is authoritative.

The checkbox at `:911-920` IS controlled (`checked={settings.appointmentReminderEnabled}`) and does snap
back — `setBusy(true)` forces a re-render. So the sentence is true of the checkbox and false of the two
time fields, and the same sentence is shown for all three controls because they all call `saveSettings`.
§2 (a claim without proof, asserted in the UI) and §3.

## FINDING 4 — «Но не для всех» contradicts the very clause it prefixes, and the message shows a raw
## organization UUID to a dentist.

`MessageDeliveryConsole.tsx:428-432` (new):
`{ kind: "fail", text: `${done} Но не для всех: ${report.problems.join(" ")}` }`

When `appointmentReminders.ts:211-214` fires (reminders enabled, no active
`appointment_confirmation` template — the exact state the component's own hint at `:921-926` warns about),
`queued === 0` and `problems` holds one string. The screen reads:

> Поставлено напоминаний: 0. Уже стояли в очереди: 0. **Но не для всех:** Организация
> `4a3420d1-…`: напоминания включены, но нет активного шаблона с назначением «Подтверждение приёма».
> Ни одно напоминание не отправлено.

«Но не для всех» is wrong — it was for **nobody**, as the same sentence then says. And
`Организация ${organizationId}` (both push sites, `:161` and `:212`) puts a raw tenant UUID on a dentist's
screen. The UUID leak is inherited from the parent (`problems.join(" ")` was already rendered), but this
commit re-plumbed that text and left it; the self-contradicting «Но не для всех» is **newly introduced**.
§3, §13 (machine identifier in the interface).

## FINDING 5 — §3 nit, inherited but not aggravated: raw English and raw HTTP status still reach the user.

`failNotice` (`:200-203`) appends `` `Причина: ${reason}` `` where `reason` is `error.message` verbatim.
- Browser offline → «… **Причина: Failed to fetch**» (Chrome) / «NetworkError when attempting to fetch
  resource.» (Firefox) — **English, to a Russian dentist.**
- `readJson` fallback (`:181`) → «Причина: Сервер ответил 500» — a raw HTTP status code.
- If a 200 body lacks `report`, `report.claimed` throws → «Причина: Cannot read properties of undefined
  (reading 'claimed')» — an English runtime message.

This is materially **better** than the parent (where those strings were the ENTIRE message, with no
Russian hint and no red); the commit's own design note says the cause deliberately follows the hint rather
than replacing it. So: a real §3 breach, pre-existing, not made worse. Fixable by routing `reason` through
a Russian mapper (the repo already has `operatorReadableErrorDetail` in `AppHelpers`, imported by
`components/odontogram/TreatmentEstimator.tsx:6`).

## FINDING 6 — the new empty-queue text points a SOLO doctor at a screen they do not have.

New text at `:385`: «Они появятся после кнопки «Поставить напоминания» или **после запуска рассылки**.»
`CampaignPanel` (the only «рассылка» launcher) is gated at `CommunicationsView.tsx:355` by
`hasCapability(clinicMode, "massCampaigns")`, and `apps/web/src/lib/clinicCapabilities.ts:81`
`const SOLO_DOCTOR = ["callList", "messaging", "managerReports"]` — **no `massCampaigns`**. The stated
primary user of this product is the solo practitioner. Half the new instruction names an affordance that
is not on their screen. §3 / §5 (mode-dependent text written as if unconditional).

## FINDING 7 — the `suppressed` hint enumerates three causes and omits the one that actually happens.

New text at `:396`: «Отправлять не стали: N **(тихие часы, нет согласия или нет адреса)** — эти в журнале
со состоянием «Не отправлено».»
But `suppressed` also covers **«шлюз не настроен»**: `channelRouter.ts:152` returns
`{ok:false, errorClass:"not_configured", …}`, `deliveryPolicy.ts:192` `return errorClass ===
"not_configured"` classifies it as suppress, and `dispatcher.ts:670` writes `status:"suppressed"`. The
API's own test asserts precisely this — `apps/api/src/tests/routes/communicationsOutbox.test.ts:300-320`
«ненастроенный шлюз даёт suppressed с причиной, а не «отправлено»»,
`assert.equal(row?.lastErrorClass, "not_configured")`.
So with Telegram configured but SMS not (`configuredChannels.length > 0`, so the red channels banner is
suppressed), the screen says «Отправлять не стали» — which reads as a deliberate, benign decision — in
**grey**, for messages that **cannot be sent at all**. The parenthetical actively misdirects the
administrator away from the real cause.

---

## Tests — judged by the reversion standard: NONE. Zero coverage added.

`git show 35ced8f1b --stat` → `1 file changed, 107 insertions(+), 19 deletions(-)`. No test file touched.

`rg -n "Отправлять было нечего|Не ушло из-за ошибки|Текст ниже не пропал|Но не для всех|failNotice"
apps/web/src/tests apps/api/src/tests` → **TRUE_EXIT=1, 0 bytes of output.** Not one new string, and not
the new `failNotice` helper, is asserted anywhere.

The only test referencing this file is `apps/web/src/tests/operationsPanelsStyling.test.ts:25`, a
source-text guard for hardcoded colours / `style=` attributes. I ran it:
`cd apps/web && node --import tsx --test src/tests/operationsPanelsStyling.test.ts` →
`pass 11, fail 0`, **TRUE_EXIT=0**. It passes at HEAD and would pass identically at the parent (the parent
already used `ops-notice--error` in four places and had no `style=` attributes), so **reverting this fix
would break no assertion anywhere in the repo.**

Note on the commit's own «ЧЕМ ПРОВЕРЕНО»: it claims «в таблице стилей панелей нет зашитых цветов» was
failing as a known false positive. At HEAD that test **passes** — it was fixed by `fff515a76`
«Страж оформления краснел на объяснении…». The claim is stale, not false at the time.

There is no rendering proof available in this repo at all, and the codebase says so itself
(`apps/web/src/tests/patientCommunicationLogPanel.test.ts:12-15`: «Отрисовки в проекте нет (браузерных
тестов нет вовсе)»): no jsdom, no happy-dom, no testing-library —
`rg 'jsdom|happy-dom|testing-library' apps/web/package.json package.json` → exit=1. Every finding above is
therefore **static, derived from the real production code paths of both sides**, not from a rendered
screen. The commit itself declares «НЕ ПРОВЕРЕНО: в браузере не открывал, живого отказа шлюза не
наблюдал» — that is honest under §2, and it is exactly where the two 200-OK gaps hid.

Live-API probe attempted and honestly reported as inconclusive:
`curl -s -o /tmp/gw.json -w "HTTP=%{http_code}" http://127.0.0.1:4100/api/communications/gateway-status`
→ `HTTP=401`, `{"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}`.
The API is up but needs a clinic token; I did not forge one and did not read secrets. A POST to
`/api/communications/outbox/dispatch` would also have mutated real outbox rows, so I did not run it.

## Constitution ledger

| § | Verdict |
|---|---|
| §1 depth not facade | **BREACH** — the fix is a facade on the two 200-OK paths (F1, F2): the failure is still styled as success. |
| §2 honesty | **BREACH** — F3 (the UI asserts the fields show the server value; they do not). Commit message itself is honest about what it did not verify. |
| §3 grandmother / button keeps its promise | **BREACH** — F1 (grey calm line for a real refusal), F4 (self-contradicting «Но не для всех» + raw tenant UUID), F6 (points at a screen solo mode lacks), F7 (misdirecting cause list), F5 (English + raw 500). |
| §4 no visual overload | OK — the existing "one alarm at a time" guards at `:539-543` are respected. |
| §5 modularity | **minor BREACH** — F6, mode-dependent text hardcoded as unconditional. Otherwise good: reuses `countLabel`, no orphan files. |
| §8 effort | OK — real work, no ceremony. |
| §8b money exact | N/A — no money arithmetic touched. (`.toFixed(2)` on the SMS balance at `:640` is pre-existing.) |
| §10 no invented contracts | OK on invention; **BREACH on completeness** — no field was invented, but the web type silently narrows a 7-field server contract to 4 (F1) and a 7-field reminder report to 3 (F2), and the two ignored fields are the failure signals. A shared contract must be handled on all sides. |
| §11 Russian, UTF-8 | OK — no mojibake, all new strings Russian. |
| §13 anti-hardcode | OK for new lines (no hex/px/price/UUID added); F4's rendered UUID comes from the API string. |

## Required rework (numbered, actionable)

1. `MessageDeliveryConsole.tsx:376` — widen the declared report type to the real
   `DispatchReport` (`dispatcher.ts:375-383`): add `retried`, `deferred`, `releasedStuck`.
2. `:388-401` — make `kind` `"fail"` when `report.retried > 0`, and add a sentence naming it, e.g.
   «Не удалось отправить сейчас: N — шлюз отказал, попытка повторится автоматически; причина по каждому в
   журнале ниже.» Add a separate non-red line for `deferred` naming quiet hours.
3. `:388` — put `claimed` back into the success text, or add an explicit
   «Взято из очереди: X, ушло: Y» so a `claimed ≠ sent` gap is never invisible again. Do not ship a
   dispatch summary that can read «Отправлено: 0 сообщений.» in grey.
4. `:380-386` — the empty branch must not claim the queue will only fill from a button press. Distinguish
   «в очереди вообще ничего нет» from «есть N сообщений, но их срок следующей попытки ещё не наступил»
   (the API already exposes `automaticSending.waiting` / `oldestWaitingAt`), and drop or gate the
   «после запуска рассылки» clause behind `hasCapability(clinicMode,"massCampaigns")`.
5. `:396` — add «шлюз не настроен» to the `suppressed` cause list, or drop the parenthetical and let the
   journal carry the reason. It currently omits the most likely cause.
6. `:421` and `:427-432` — read `skippedNoChannel` and `skippedNoTemplateData` from
   `ReminderScheduleReport` and surface them as a red line naming how many patients will NOT be reminded;
   the count is already computed at `appointmentReminders.ts:339-342` and thrown away.
   Alternatively push them into `problems` server-side — but then both sides change in one commit (§10).
7. `:428-432` — replace «Но не для всех» with wording that survives `queued === 0`, e.g.
   «Что помешало: …». Strip the `Организация <uuid>` prefix before display (or remove it from
   `appointmentReminders.ts:161,212`, changing both sides together).
8. `:461-465` — either make the two quiet-hours inputs controlled (`value` + `onChange`, or a `key` derived
   from `settings`) so they truly show the server state, or delete the clause
   «переключатели ниже показывают то, что действует сейчас». Do not ship a reassurance that is false.
9. `:200-203` — route `reason` through a Russian mapper (`operatorReadableErrorDetail` already exists in
   `AppHelpers`) so «Failed to fetch», «Сервер ответил 500» and TypeError text never reach a dentist verbatim.
10. Add one source-text guard test in the style of
    `apps/web/src/tests/patientCommunicationLogPanel.test.ts` asserting that `runDispatch` branches on
    `retried` and that `runReminders` branches on `skippedNoChannel` — otherwise this regresses silently
    and nothing in the repo would notice. Reverting the current fix breaks zero assertions today.

## Found nearby, not caused by this commit

- `apps/web/src/CommunicationsView.tsx:33-40` `ruCount()` — a **second Russian pluralizer** duplicating
  `AppHelpers.countLabel` in the very file that mounts this console. `ruCount` uses `Math.abs` and
  `countLabel` does not, so they disagree on negative counts. One owner should survive.
- `MessageDeliveryConsole.tsx:640` `balance.amount.toFixed(2)` — float money display for the SMS gateway
  balance, contrary to the kopeck rule; pre-existing, untouched by this commit.
- `MessageDeliveryConsole.tsx:374` `body: JSON.stringify({ batchSize: 25 })` — magic number, present
  verbatim at the parent (`/tmp/parent_console.tsx:335`). The API already exposes
  `automaticSending.batchSize`; the console ignores it. §13.
- `appointmentReminders.ts:161,212` — both `problems.push` sites emit a raw organization UUID into a
  string that is rendered in the UI.
- `apps/api/src/routes/communicationsOutbox.ts:875-893` — `waiting` filters on `scheduledAt`, while
  `claimBatch` (`dispatcher.ts:418`) claims on `nextAttemptAt`. Two different clocks decide "is this
  message waiting" vs "is this message due"; the banner and the dispatcher can therefore disagree. Not
  wrong today (it is what makes the banner fire for backed-off rows) but it is undocumented coupling.

## Proof audit — every command I ran, with its TRUE exit code

| Command | True exit | What it established |
|---|---|---|
| `git log --oneline -5` / `git rev-parse HEAD` | 0 | HEAD = 39a729523 |
| `git log -1 --format=… 35ced8f1b` | 0 | parent = eed3a4e20; full message |
| `git show 35ced8f1b --stat --format=""` | 0 | 1 file, +107/-19, **no tests** |
| `git show 35ced8f1b --format="" -- …MessageDeliveryConsole.tsx` | 0 | full diff |
| `git log --oneline -8 -- …MessageDeliveryConsole.tsx` | 0 | HEAD == commit for this file |
| `git show 35ced8f1b^:…MessageDeliveryConsole.tsx > /tmp/parent_console.tsx` | 0 | parent source |
| `grep -n 'setNotice\|role="status"' /tmp/parent_console.tsx` | 0 | **defect reproduced at parent** |
| `rg -n "export function countLabel" apps/web/src -A 20` | 0 | single sanctioned pluralizer, correct |
| `rg -n "MessageDeliveryConsole" -g '!*.md' .` | 0 | mounted via CommunicationsView:354 |
| `rg -n "ops-notice" apps/web/src/styles/*.css` | 0 | `--error` class real, token-based |
| `rg -n "viewFromHash" AppHelpers.tsx -A 25` | 0 | hash chain link |
| `rg -n "export type DispatchReport" dispatcher.ts -A 30` | 0 | **7 fields, web declares 4** |
| `rg -n 'return "retried"…' dispatcher.ts -B 12` | 0 | `retried` = provider refusal |
| `rg -n "async function claimBatch" dispatcher.ts -A 35` | 0 | claims on `nextAttemptAt <= now` |
| `rg -n "async function markDeferred" dispatcher.ts -A 20` | 0 | deferred stays `queued`, future attempt |
| `sed -n '30,70p' appointmentReminders.ts` | 0 | `skippedNoChannel`/`skippedNoTemplateData` exist |
| `rg -n "problems.push" appointmentReminders.ts -A 4` | 0 | **only 2 sites; skipped counts never pushed** |
| `sed -n '640,700p' communicationsOutbox.ts` | 0 | retry restricted to failed/cancelled/suppressed |
| `rg -n "function validationError" apps/api/src -A 10` | 0 | failures are 400/409, never 200 |
| `rg -n 'reply.code\(200\)\|success: true' communicationsOutbox.ts` | 1 | no 200-with-error-body |
| `rg -n massCampaigns clinicCapabilities.ts -B6 -A6` + `sed -n '60,90p'` | 0 | SOLO_DOCTOR lacks massCampaigns |
| `rg -n "not_configured" services/communications/*.ts` | 0 | unconfigured gateway → `suppressed` |
| `rg …"Отправлять было нечего\|…\|failNotice" apps/*/src/tests` | **1** | **zero tests reference the change** |
| `node --import tsx --test src/tests/operationsPanelsStyling.test.ts` | **0** | pass 11 / fail 0 — green, and green at parent too |
| `rg '\x{fffd}\|Ð[°-¿]\|Ñ[€-]' /tmp/d.patch` | 1 | no mojibake |
| `rg '#[0-9a-f]{3,8}\|[0-9]+px\|toFixed\|Math.round\|\* 100\|/ 100'` on added lines | 1 | no new hardcode / float money |
| `rg 'kopeck\|money\|price\|amount' MessageDeliveryConsole.tsx` | 0 | only pre-existing `balance.toFixed(2)` |
| `rg 'jsdom\|happy-dom\|testing-library' apps/web/package.json package.json` | 1 | no DOM test infra exists |
| `curl … 127.0.0.1:4100/api/communications/gateway-status` | 0 | HTTP=401 AuthRequired — live check not closable without a token |
| `node --import tsx -e "import('./src/AppHelpers.tsx')…"` | 0 | IMPORT_FAILED (`.css` extension) — `countLabel` not executable outside Vite; verified by reading instead |

Gaps I could not close, and the exact command that would close them:
- I never saw a rendered screen. `node --import tsx --test` cannot render React here (no jsdom).
  A live observation of FINDING 1 needs, by the lead only:
  `curl -s -X POST -H 'x-dente-clinic-token: <real token>' -H 'content-type: application/json'
   -d '{"batchSize":25}' http://127.0.0.1:4100/api/communications/outbox/dispatch | node -e "…"`
  and reading `retried` in the response — **this mutates outbox rows, so it is the lead's call, not mine.**
- I did not run `npm run typecheck`/`build`/full `test` (three agents mid-edit, §7a). The commit's claim of
  0 typecheck errors is unverified by me. The one substantive type risk — the `countLabel` import — checks
  out by reading: exported at `AppHelpers.tsx:2539` with the matching 4-arg signature, and
  `from "../../AppHelpers"` is the style used by 16 other files under `apps/web/src/components`.

**No file in the repository was modified by this audit except this review file.** Scratch artefacts were
written only under `/tmp` (`parent_console.tsx`, `d.patch`, and grep outputs), outside the working tree.
