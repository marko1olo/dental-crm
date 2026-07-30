# U6-state-snapshot-writes — ADVERSARIAL REVIEW

Reviewer: adversarial subagent, did not write the code. Read-only on source.
Repo HEAD when the review ran: `0112f293e` (a foreign `[ARCHON] fix(угол)` landed after the U6
handoff HEAD `94871d09a`; it touches apps/web only).
Commits attacked: `01f7a797b` (fix) + `0d219199e` (test) + `94871d09a` (test, mixed call sites).

VERDICT: **SOUND_WITH_NITS**. Every claimed proof reproduced, several character for character.
The defect was real, the fix is reachable, the measurement harness is honest and re-runnable, and
git hygiene is the cleanest I have audited in this campaign. Two confirmed defects in the NEW
code and one undeclared behavioural trade-off keep it off SOUND.

---

## 1. PROOF AUDIT — every claimed command re-run by me, true exit code

| Claim | My result |
|---|---|
| `cd apps/api && node --import tsx --test src/tests/mutableStateFlushCoalescing.test.ts` exit 0, 7/7 | **CONFIRMED.** `TRUE_EXIT=0`, `tests 7 / suites 1 / pass 7 / fail 0`, 1591 ms. Printed lines identical to the handoff: `ДО (DENTAL_STATE_FLUSH_DELAY_MS=0): 20 действий -> 20 записей, 725 680 Б`, `ПОСЛЕ (окно 60 мс): 20 действий -> 1 запись, 36 284 Б`, `поток: 25 действий за ~250 мс -> 7 записей (окно 50 мс)` |
| `npm run typecheck -w @dental/api` exit 0 | **CONFIRMED.** `TRUE_EXIT=0`, no diagnostics. |
| `npm test -w @dental/api` green | **CONFIRMED.** `TRUE_EXIT=0`, `tests 970 / suites 158 / pass 970 / fail 0 / duration_ms 26046.6`. Builder claimed 964/157 — the delta is the foreign commit that landed after handoff, not a discrepancy. Their suite entry (`слияние записей снимка состояния`) is present and green at line 1292 of my run log. |
| `measure-state-write.mjs` — 236,648 B / 4.61 ms; 5,803,929 B / 49.54 ms | **CONFIRMED on bytes, exactly**, three runs: 236,648 on disk / 177,187 compact / 5,803,929 at 10k / clinicalRules 79,488 B / auditEvents 76,401 B / 58,039,290 B per 10 saves. **Milliseconds drift**: CASE A median 3.64 / 4.87 / 4.70 (claimed 4.61); CASE B 42.90 / 50.49 / 43.98 (claimed 49.54). The claimed pair is inside the spread; not fabricated, not a constant either. |
| 31 real call sites, dossier's "32" was the rg hit count | **CONFIRMED.** `git show 01f7a797b^:apps/api/src/sampleData.ts \| rg -c "persistMutableState\(\)"` = **32**, one of which is the declaration ⇒ 31. Dossier correction is right. |
| Readership: boot seed, `routes/system.ts:669`, `:694`, migration script | **CONFIRMED.** `applyPersistentState()` declared at pre-fix :4975 and invoked at pre-fix :5044 (HEAD: 5054 / 5123); `GET /api/system/persistence/verify` → `getPersistentStateIntegrityReport()`; `GET /api/system/persistence/export` → `buildPersistentStateExport()`; `apps/api/src/scripts/migrateStateToDb.ts` → `loadPersistentState()`. Deleting the file was correctly rejected. |
| "one Telegram webhook = 3–5 persist calls in a row" (commit body) | **CONFIRMED by call graph.** telegram.ts:2464 `claimDenteTelegramWebhookUpdate` (persists at sampleData 10269/10284) → :2482 `handleDenteTelegramAppointmentCallback` → :2496 `consumeDenteTelegramLinkCode` → a care/contact/document mutator → :2606 `recordDenteTelegramWebhookEvent` (persists at 10315). |

Nothing I re-ran contradicted the handoff. No fabricated screenshot, no fabricated count, no
"0 errors" that was not 0.

## 2. INDEPENDENT PROOF THE BUILDER DID NOT PRODUCE

Their test calls `flushPersistentStateNow()` directly; it never proves the
`process.on("exit", …)` wiring that the whole "graceful shutdown loses nothing" claim rests on.
I proved it myself with a throwaway probe (tmp dir only, production default delay, env var unset):

```
PROBE same-tick: state file present right after the mutation? false
PROBE after exit: file present? true | mutation inside it? true
```

So: (a) at the production default the write really is off the originating request's path, and
(b) the exit handler really does flush. `server.ts:551-552` registers SIGINT/SIGTERM →
`gracefulShutdown` → `process.exit(0)`, so an orderly stop is covered. CONFIRMED.

## 3. CONFIRMED DEFECTS IN THE NEW CODE

### 3.1 The mutation is no longer durable when the API returns 200 — undeclared

`apps/api/src/sampleData.ts:4843`. Proven with a hard-kill probe: a child mutates state, prints
READY (the instant the HTTP response would go out), the parent SIGKILLs it immediately
(TerminateProcess on Windows → no `exit` handlers):

```
PRE-FIX  (DENTAL_STATE_FLUSH_DELAY_MS=0): state file written? true  | mutation durable at response time? true
POST-FIX (default 250 ms):                state file written? false | mutation durable at response time? false
```

Why it matters more than "it's only a JSON mirror": for the 15 HTTP-reachable call sites — all
Telegram — that file is the **only** durable store.
- `db/domainStateHydration.ts:205+` hydrates organizations, clinics, users, chairs, patients,
  appointments, visits, treatmentItems, payments, generatedDocuments, communicationTasks,
  communicationEvents, imagingStudies, services, clinicalRules, protocolTemplates. **None of the
  four Telegram collections.**
- `rg "insert\(schema\.denteTelegram|insert\(denteTelegram" apps/api/src` returns exactly one hit,
  `telegram/config.ts:141` (bot configs). Nothing ever inserts a link code, chat link, webhook
  event or outbox receipt into Postgres.
- `apps/api/src/telegram/linkCodes.ts` and `chatLinks.ts` do have Drizzle SELECT/UPDATE helpers —
  and **nothing imports either module**. Dead (pre-existing, not this packet).
- `createDenteTelegramLinkCode` (sampleData.ts:6091) and `recordAuditEvent` (:12060) touch no DB;
  sampleData.ts imports no db client at all.

Concrete failure: the receptionist issues a Telegram link code, gets the code + QR + deep link in
the 200, and a hard kill / OOM / power loss inside 250 ms means the code the patient is holding
exists nowhere. Same window for a patient↔chat binding and for the webhook idempotency claim.

This is the trade the brief authorised ("debounce/coalesce … move it off the request path"), so it
is not wrong — but the handoff never states it. `handoff.md` lists "durability belongs in
Postgres" as *future debt*, not as a cost *this commit incurs*. Under AGENTS.md §8b that belongs
in `НЕ ПРОВЕРЕНО` / a declared risk, and under §4 it belongs stated plainly.

Untested, would need a server restart (forbidden to me): whether `tsx watch` escalates to SIGKILL
before `gracefulShutdown` finishes `app.close()` + `pool.end()`. If it does, this window is hit
routinely in this very repo every time an agent saves a file. PLAUSIBLE, not proven.

### 3.2 The env guard that exists specifically to stop "silently becomes 0" lets 0 through

`sampleData.ts:4813-4821`. The comment reads: *«Мусор в переменной окружения не должен молча
превращаться в ноль: это вернуло бы синхронную запись на каждое действие, и никто бы не
заметил.»* `Math.floor()` on the last line does exactly that for any value in (0, 1). Probed:

```
unset (production default)                 -> writes in same tick: 0
0 (documented: restores synchronous)       -> writes in same tick: 10   <-- expected
not-a-number (guard claims: default)       -> writes in same tick: 0
-5 (guard claims: default)                 -> writes in same tick: 0
0.5 (fraction under 1 ms)                  -> writes in same tick: 10   <-- DEFECT RESTORED
1e-9                                       -> writes in same tick: 10   <-- DEFECT RESTORED
999999999999 (over 2^31-1)                 -> TimeoutOverflowWarning, duration set to 1 ms
Infinity                                   -> writes in same tick: 0
```

Two holes, both in the guard the handoff advertises as a feature: no rejection of sub-1 ms
fractions, and no upper bound (Node clamps >2^31-1 to 1 ms and prints
`TimeoutOverflowWarning`, i.e. near-synchronous again). The unit test only covers `"не число"`.
Low blast radius — an operator has to type a fractional millisecond — but it is a confirmed
defect that reinstates the exact behaviour the packet exists to remove.

## 4. NITS

1. **"запись ушла с пути запроса" is imprecise.** The write leaves the *originating* request's
   latency, but it is still `writeFileSync` on the single-threaded event loop 250 ms later, so it
   still blocks whichever request is in flight then. The real win is 20x less total blocking work
   per burst, and that is what the numbers show. Debt item 2 concedes the O(entire state) part.
2. **"95.0 % fewer bytes" is the write-count ratio restated.** 725,680 / 20 = 36,284 exactly; the
   per-write size is unchanged, so 19/20 = 95 % is not a second independent metric.
3. **Handoff line citations are pre-fix.** `sampleData.ts:4976` / `:5044` resolve only at
   `01f7a797b^`; at HEAD they are 5055 / 5123 (the fix itself inserted 79 lines above them).
   Same for `rg … = 32`, which is 33 at HEAD because the new doc comment names the function.
   Internally consistent, but a reader checking at HEAD lands in the wrong place.
4. **The 250 ms derivation does not scale past its own measurement.** 49.54 ms per write / 250 ms
   window = 19.8 % duty cycle at 10k patients, which is exactly the stated reasoning. At 100k
   patients the write costs ~0.5 s and the fixed 250 ms window saturates the loop with nothing
   warning about it. Debt item 2 names the right fix (per-collection dirty tracking).
5. **Export/integrity can lag the window.** `/api/system/persistence/export` is documented to the
   user as the emergency-recovery download and can be up to 250 ms stale. The builder identified
   this (debt item 4), named the one-line fix (`flushPersistentStateNow()` first), and declined it
   on scope. Correct call, but it should not be forgotten.
6. **Latent: the flush target path is resolved at flush time, not at call time.** A caller that
   mutates with `DENTAL_STATE_FILE` pointed at a temp dir and then restores/deletes the env var
   before process exit will have its deferred write land in `apps/api/.data/dental-crm-state.json`
   instead. No live victim today — the only tests that redirect `DENTAL_STATE_FILE`
   (`persistentState.test.ts`, `persistentStateExport.test.ts`) do not import sampleData, and the
   new test flushes before restoring env and deleting its temp dir (its `after` comment says so
   explicitly). Worth a sentence in the doc block.

## 5. HYPOTHESES TESTED AND DISPROVED

- **Second owner / half-applied fix.** `rg persistMutableState apps/api/src` hits
  `telegram/legacyMocks.ts:22` — comment only, not a call site. `sampleData_opt.ts` (the 429 KB
  dead twin with the same 32 hits) has zero importers and is excluded at
  `apps/api/tsconfig.json:41`; `git grep sampleData_opt HEAD -- apps/` returns only that comment
  and the tsconfig line. DISPROVED.
- **Hollow facade.** No `{success:true}` over a no-op, no placeholder, no magic constant:
  `defaultStateFlushDelayMs = 250` is named, derived from a reproducible measurement, and
  env-overridable per the anti-hardcode doctrine. DISPROVED.
- **Timer/listener without teardown.** The timer is cleared on flush, re-armed only when null
  (fixed window, no starvation — proven by the 25-actions/7-writes case), and `unref()`'d.
  `process.on("exit")` is registered once at module load of a module with a single instance
  (all 33 imports use the same `sampleData` specifier). DISPROVED.
- **Test pollutes shared state.** `recordAuditEvent` and `saveUiPreferences` touch no Postgres;
  sampleData.ts imports no db client. Env is redirected to `os.tmpdir()` *before* the dynamic
  import, and no `dente-state-flush-*` directory is left behind after my runs. DISPROVED.
- **Mutate-then-read inside one handler.** The only file readers are the two read-only GET
  handlers and the migration script; no handler mutates and then reads the file back. DISPROVED.
- **Cache in front of a design problem (§ TWO STRIKES).** A fixed coalescing window is not a
  cache, the brief listed it as an approved option, and the handoff states plainly that the write
  is still O(entire state) and that the real level is `persistentState.ts` + Postgres. DISPROVED.
- **Mojibake.** Zero hits for `РљР|СЂРёР|РЅРµРІ|вЂ|В«|В»|РЎС‚` in both changed files; all three
  commit subjects render as clean Cyrillic Conventional Commits naming the defect.

## 6. LIVE DISK CORROBORATION (mine, not claimed by the builder)

`apps/api/.data/backups` holds exactly 30 files. Decode the save time from each *name* — the
mtime is misleading because Windows `CopyFile` preserves the source timestamp — and the retained
window is 01:34:00Z … 04:06:30Z = **152 minutes**, against the 50-minute window the handoff
measured before the fix. Consistent with coalescing, confounded by activity level, so:
corroboration, not proof. Less flattering reading of the same data: across that whole 2.5 h,
including the pre-fix half, the smallest gap between two consecutive saves is 8 seconds — on this
box no burst inside a 250 ms window ever occurred, so the realised saving here is ~0. The builder
declared exactly that limitation ("only the per-burst ratio is proven"). Honest, and it caps the
claim.

## 7. GIT HYGIENE — clean

```
01f7a797b  M  apps/api/src/sampleData.ts
0d219199e  A  apps/api/src/tests/mutableStateFlushCoalescing.test.ts
94871d09a  M  apps/api/src/tests/mutableStateFlushCoalescing.test.ts
```

Exactly the two claimed source files, one file per commit. No `apps/api/.data/*.json`, no
`tsbuildinfo`, no `scratch/**`, nothing from the seven dirty foreign paths that were in the
worktree the whole time (`DocumentsView.tsx`, `documentStore.ts`, `main.css`, `routes/diary.ts`,
`speech-key-health.json`, …). `routes/telegram.ts` — frozen — untouched. Conventional Commits,
Russian subjects naming the defect, bodies explaining the WHY with numbers. Nothing to report.

## 8. REQUIRED FOLLOW-UP (numbered, specific)

1. `sampleData.ts:4819` — reject sub-1 ms fractions and cap the upper bound, so the validator
   actually delivers what its comment promises: e.g. reject `parsed > 0 && parsed < 1` (return the
   default) and clamp to `2_147_483_647`. Add both to
   `mutableStateFlushCoalescing.test.ts` beside the existing `"не число"` case: `"0.5"` must NOT
   produce a write per action, and a >2^31 value must NOT produce a `TimeoutOverflowWarning`.
2. `handoff.md` / `state.md` — declare the trade this commit makes, in `НЕ ПРОВЕРЕНО`: a mutation
   is no longer on disk when the API answers 200, the exposure window is `DENTAL_STATE_FLUSH_DELAY_MS`
   (default 250 ms), it is closed for SIGINT/SIGTERM/`process.exit` by the `exit` handler and open
   for SIGKILL/OOM/power loss, and it lands on the four Telegram collections specifically because
   `hydrateDomainStateFromDb` does not hydrate them and nothing inserts them into Postgres. Cite
   the hard-kill probe rather than asserting it.
3. Same doc block — one sentence that the flush resolves `DENTAL_STATE_FILE` at flush time, so a
   caller that redirects the state file must flush before restoring the env var.
4. Carry debt items 4 and 5 forward as their own packet against `persistentState.ts` +
   `routes/system.ts`: `flushPersistentStateNow()` at the head of the two GET handlers, time-based
   backup rotation instead of per-write, a write counter in `getPersistentStateMeta()`, and
   `auditEvents` moved to the Postgres table that already exists.
5. Optional, cheap, and it would close the one gap the builder named himself: run the closing
   command from `handoff.md §НЕ ПРОВЕРЕНО 1` when Telegram unfreezes (two `POST
   /api/telegram/link-codes` in a row, `ls apps/api/.data/backups | wc -l` before/after — old code
   +2, new code +1). That converts the only unproven claim into API VERIFIED.
