# ADVERSARIAL REVIEW — V5-payload-before-auth

Reviewer: adversarial subagent (did not write this code). Posture: disbelief; every claim re-run.
Target commit: `06246d0532ffce6adc18ae13c494debe7372bfba`
HEAD at review start: `5f28a0d38117a1686de11c64d3c3bd53815ad70f`
HEAD at review end: `9de69093a1ce3df2b71cccf51ac81818c7992d31` — the repo moved **8 commits** under me
mid-review (including `d62af23ea`, which rewrote the gate 701 -> 913 lines). Every number below is
stamped with the revision it was taken at.

**VERDICT: SOUND_WITH_NITS.** The defect was real, reproduced three independent ways at the parent.
The fix is minimal, reachable, and holds on real data. Every reproducible claimed measurement
reproduced. All findings below are record/scope gaps, not code defects.

---

## 0. Setup facts

- The packet's 3 commits contain EXACTLY the claimed files:
  `06246d053` -> `apps/api/src/routes/auth.ts` only, **+31/-9**;
  `dd91e67a2` -> `apps/api/src/routes/auth.test.ts` only, **+298**;
  `5f28a0d38` -> the 5 packet docs, **+460** (26+30+29+203+172). All three exact.
- `git log 5f28a0d38..HEAD -- auth.ts auth.test.ts` EMPTY; both clean; worktree == HEAD == packet
  commit for both (EOL-normalised). What I tested is what was committed.
- FALSE ALARM I chased and killed: raw byte compare of worktree vs blob differs by exactly 719
  bytes = 719 lines. Cause is `core.autocrlf=true`, not content.
- Two foreign commits (`fe0b5081f`, `e39f4b182`) are interleaved between the fix and test commits.
  Nothing foreign was swept into the builder's commits.
- I touched no source. Harness lived in `apps/api/.tmp-v5-review/` and `.tmp/v5-review/` (both
  matched by `.gitignore:17 .tmp*/`, absent from `git status`), and both are now deleted.
  Final `git status --porcelain -- apps/api/src scripts/` is EMPTY.

## 1. WAS THE DEFECT REAL AT THE PARENT? — CONFIRMED, THREE WAYS

### 1a. Static, at `06246d053^` — every claimed line number is EXACT
| claim | at `06246d053^` |
|---|---|
| `279-281` newPassword length -> 400 | EXACT |
| `292-295` `if (!isOrgAdmin && !hasValidSetupKey)` -> 403 | EXACT |
| `327-329` `!body.userId` -> 400 | EXACT |
| `330-332` PIN `/^\d{4,12}$/` -> 400 | EXACT |
| `343-346` guard -> 403 | EXACT |
| `348-357` DB existence lookup, BEHIND the guard | EXACT |
| 697 lines; auth.test.ts 278 lines | EXACT |

### 1b. Behavioural — the COMMITTED test file run against the parent's auth.ts
The committed test byte-for-byte except its import specifier, imports rehomed into the real
`apps/api/src` tree so `db` mocking still bites the same module instances.
```
CONTROL (test vs HEAD auth.ts):  tests 19  pass 19  fail 0   EXIT 0
ATTACK  (test vs 06246d053^):    tests 19  pass 17  fail 2   EXIT 1
  ✖ set-password без прав …   AssertionError actual: 400, expected: 403
  ✖ set-pin без прав …        AssertionError actual: 400, expected: 403
  ✔ the four contract tests pass on BOTH revisions
```
Exactly 2 failures, exactly `actual: 400, expected: 403`, exactly the two anonymous tests. The
load-bearing claim reproduces to the letter. This is a real fixture, not an assertion.

### 1c. The leak itself, measured (anonymous, `db.*` mocked to throw)
Distinct response bodies for 6 anonymous payloads per route:

| route | parent `06246d053^` | fix `06246d053` |
|---|---|---|
| `/api/auth/clinic/set-password` | **2** | **1** |
| `/api/auth/staff/set-pin` | **3** | **1** |

Parent leaked verbatim to a caller with no token: `400 "Новый пароль должен быть не короче 8
символов."`, `400 "Не указан сотрудник."`, `400 "PIN должен состоять из 4–12 цифр."`
`msg_len=43` re-derived: both 403 messages are exactly 43 chars (80 / 77 UTF-8 bytes). Equal
length across the two routes is a coincidence, not a shared string.

### 1d. I independently CONFIRMED all three of the builder's record corrections
`db calls on the anonymous path: []` at **both** revisions. `identity.ts` read in full:
`getRequestIdentity` imports only `verifyToken` + `authTokenSecret`, has **no `db` import at all**.
So the ORIGINAL BRIEF was wrong twice and the builder was right to correct it rather than inherit:
- "checks that the employee exists … before the rights check" — no such check ever existed; only
  `!body.userId` field presence. The DB lookup sat at `348-357`, already behind the guard.
- "latent 500/side-effect surface … validation that touches the database before authorisation" —
  does not apply to either handler.
- Brief's set-pin lines `331-337`/`339-348` are wrong; real are `327-332`/`343-346`.

## 2. IS THE FIX REACHABLE, OR DEAD CODE? — REACHABLE, verified live

11 anonymous POSTs to the live shared server `127.0.0.1:4100` (not restarted by me; health 200),
zero headers, zero tokens: 5 bodies to set-password and 6 to set-pin, **one identical 403 body per
route**, 43-char message, no digit. Reachable by any unauthenticated caller that can reach the
port — the whole point of the defect. Not dead code.

## 3. DOES IT HOLD ON REAL DATA, NOT JUST THE FIXTURE? — YES, gap closed

The packet honestly declared `DB VERIFIED — not done`: the authorised path was proven with a
**mocked** db. I closed that for every path that does not mutate credentials, in-process against
**real native PostgreSQL 18 on 127.0.0.1:5432**, no mock anywhere, real HEAD route code:
```
REAL PostgreSQL reached. row counts BEFORE: {"users":7,"organizations":2,"audit":924}
OK set-password {}                                    -> 400 "Новый пароль должен быть не короче 8 символов."
OK set-password {"newPassword":"1234567"}             -> 400 "Новый пароль должен быть не короче 8 символов."
OK set-password {organizationId: <foreign>, ...}      -> 403 "Нельзя менять пароль чужой организации."
OK set-pin      {}                                    -> 400 "Не указан сотрудник."
OK set-pin      {userId}                              -> 400 "PIN должен состоять из 4–12 цифр."
OK set-pin      {userId, newPin:"12"}                 -> 400 "PIN должен состоять из 4–12 цифр."
OK set-pin      {userId, newPin:"abcd"}               -> 400 "PIN должен состоять из 4–12 цифр."
OK set-pin      {userId, newPin:"1234"}               -> 404 "Сотрудник не найден в вашей организации."
AUTHORISED CONTRACT vs REAL PostgreSQL: 8/8 exact status+message matches
ANONYMOUS, real DB available: 4 bodies -> 1 distinct response per route
row counts AFTER: {"users":7,"organizations":2,"audit":924}   NOTHING WRITTEN: true
```
The 404 is the load-bearing one: it proves the guard opened all the way through to a real
org-scoped SELECT against Postgres, and that the refusal still fires before `db.update`. Row
counts identical before/after prove I wrote nothing.
Still unproven (deliberately, by me too): the **200 write** path against real Postgres, because it
mutates credentials. It changes no schema.

## 4. DID THE FIX INTRODUCE A REGRESSION? — I attacked the obvious one; it held

Moving `getRequestIdentity` and `timingSafeSecretEqual(body.adminKey ?? null, …)` ahead of body
validation newly exposes them to anonymous malformed input that previously short-circuited at 400.
If either could throw, the fix would have created exactly the anonymous-triggerable 500 the brief
feared. 23 hostile raw bodies x 2 routes x 2 configs (`ADMIN_SETUP_KEY` unset AND set — the latter
being the only config where `timingSafeSecretEqual` is actually invoked):
```
status histogram: {"400":4,"403":19}   worst=403   db calls: []   Object.prototype polluted? no
```
- **Zero 500s.** `timingSafeSecretEqual` sha256-normalises both sides, so the buffers are always
  32 bytes and `timingSafeEqual`'s length throw is unreachable; `verifyToken` is fully try/catch'd.
  Static reading and the fuzz agree.
- All 19 bodies that REACH the handler return the ONE identical 403 — including `adminKey` as
  number / object / array / true / null / 100 000 chars, and non-object bodies
  `null` / `"abc"` / `123` / `[1,2,3]` / `true`, and deep nesting.
- `__proto__` and `constructor` payloads are rejected by Fastify's secure JSON parser. No
  prototype pollution.
- The 4 non-403 are `FST_ERR_CTP_INVALID_JSON_BODY` / `FST_ERR_CTP_EMPTY_JSON_BODY` from the
  content-type parser, raised BEFORE the handler. Verified **identical at the parent revision**, so
  pre-existing and unchanged, and they carry no application policy text.
- Only behaviour delta for anonymous callers: a malformed body now also pays the constant 200 ms
  `authFailureDelay()` instead of returning instantly. A timer, not CPU; well-shaped anonymous
  bodies already paid it pre-fix. Not a regression.
- Authorised contract: same codes, same messages, same order — proven by the four contract tests
  green on BOTH revisions (§1b) and by 8/8 against real Postgres (§3).
- No giveaway of the "cycle-5 shape" (fixed one thing, broke a viewport): zero web files touched,
  zero web callers exist.

## 5. FOR A GATE PACKET: CAN THE GATE GO RED? — NO, AND THIS IS THE ONE REAL FINDING

The brief promised the "cleanest possible proof": the two routes must vanish from the gate's
printed `payloadBeforeAuthorisation` list. The builder declared this **impossible** and filed it
under NOT PROVEN. **The builder is correct** — the list is a hardcoded literal
(`scripts/smoke-clinical-mutation-guard.mjs:310-325` today, `:273-288` at the builder's revision),
consumed at `:441` as the probe BODY and echoed verbatim into the report. No auth.ts edit can
shrink it. My gate run still prints both entries.

I went further and measured what that costs. Replaying the gate's EXACT probe payloads against the
DEFECTIVE parent:
```
DEFECTIVE parent 06246d053^
  WITH the payloadBeforeAuthorisation entry:  set-password -> 403  => GATE PASSES (green)
  WITH the payloadBeforeAuthorisation entry:  set-pin      -> 403  => GATE PASSES (green)
  WITHOUT it (entry deleted):                 set-password -> 400  => GATE FAILS "НЕ ЗАЩИЩЁН"
  WITHOUT it (entry deleted):                 set-pin      -> 400  => GATE FAILS "НЕ ЗАЩИЩЁН"
FIXED 06246d053 (== HEAD)
  WITHOUT it (entry deleted):                 both routes  -> 403  => GATE PASSES
```
**While those two entries stand, the gate is provably GREEN on the very defect it is credited with
finding, and blind to its re-introduction.** Deleting them makes it red at the parent and green at
HEAD — a genuine regression detector, one deletion away. The gate's own staleness machinery does
not help: `:538-544` only checks the probe route still EXISTS, and the `ЗАПИСЬ ИСКЛЮЧЕНИЯ УСТАРЕЛА`
warning at `:509-514` fires only for entries in `exceptions`, which these two are not. Hence
`warnings: []` despite two obsolete entries.

Fairness to the builder: `scripts/` was outside its file claim; the file was being concurrently
rewritten by another agent (committed mid-review as `d62af23ea`); §7a/§9 forbid sweeping foreign
work. Not editing it was the right call. And state.md:70-71 and :140 DO state the regression-test
consequence. But handoff.md NOT-PROVEN #1 — the document the lead actually reads — frames the
deletion as cosmetic ("behaviour already measured: empty body -> 403") and omits the load-bearing
half. Record gap, not a code defect.

Secondary: those two entries also ship two FALSE facts in a live gate report — stale line numbers
(`auth.ts:278-281`/`283-292`, `331-337`/`339-348`) and the clause "проверяет наличие сотрудника",
which was never true. The builder flagged both as debt.

## 6. PROOF AUDIT — every claimed command re-run

| claim | my result | verdict |
|---|---|---|
| `node --import tsx --test apps/api/src/routes/auth.test.ts` -> exit 0, tests 19 / suites 6 / pass 19 / fail 0 | exit 0, tests 19, suites 6, pass 19, fail 0 | REPRODUCED |
| same test vs `auth.ts@06246d053^` -> exit 1, exactly 2 fail, `actual: 400, expected: 403` | exit 1, 17 pass / 2 fail, both `actual: 400, expected: 403`, the four contract tests green on both | REPRODUCED |
| `npm run typecheck -w @dental/api` -> exit 0 | exit 0 | REPRODUCED |
| `npm run build -w @dental/api` -> exit 0 | exit 0 twice (11:00:33, 11:03:46 after the foreign commits) | REPRODUCED |
| fresh dist carries the fix | guard offset < first-validation offset in `dist/routes/auth.js` for both routes; gate's own `buildFreshness.staleOutputCount: 0` | REPRODUCED |
| `node scripts/smoke-clinical-mutation-guard.mjs` -> exit 0, `ok: true`, `warnings: []` | GATE_EXIT=0, `"ok": true`, `"warnings": []`, zero failures | REPRODUCED |
| gate counts 472 / 470 / 441 / 173 | 464 / 462 / 433 / **173** | ATTRIBUTED (below) |
| live 4100 anonymous -> all 403, `msg_len=43`, no digit | 11/11 -> 403, 43 chars, no digit, one body per route | REPRODUCED |
| rebuilt-dist probe: empty AND shaped -> 403 both routes | 403 for all, plus 19 hostile shapes | REPRODUCED (exceeded) |
| `npm test -w @dental/api` = 980 tests / 159 suites, flaky, 3 named files fail on shared-PG teardown, each passes standalone | `tests 980`, `suites 159`; exit 1, pass 979 / fail 1 with 3 suite-level ✖ in exactly `assemblyAiRetention.test.ts`, `portalOtp.test.ts`, `speechTranscribeChunkAccess.test.ts`, FK error `23503`; all three EXIT=0 standalone; `auth routes` ✔ inside the full run | REPRODUCED, incl. the flakiness |
| `mojibake_lines=0` in auth.ts; Russian subjects intact | 0 in auth.ts (4735 Cyrillic chars), 0 in auth.test.ts, 0 in all 5 packet docs, 0 in all 3 commit messages | REPRODUCED |
| `git grep` both routes across apps/web packages scripts docs -> 2 hits, both in the smoke script, 0 in apps/web | exactly 2 hits, both `scripts/smoke-clinical-mutation-guard.mjs`; repo-wide the only others are the packet's own docs and `.agents/archon/cycle6.workflow.js` (the brief) | REPRODUCED |
| diff sizes +31/-9, +298, +460 | exact | REPRODUCED |
| dist mtime `10:39:42` proved the gate loaded fixed code | not verifiable retrospectively — dist was already `10:49:41` before I touched it (someone else rebuilt) | UNTESTABLE; substance re-derived by rebuilding |
| authorised path on the LIVE server | blocked: `.ops-shot-tokens.json` tokens are EXPIRED (`exp_in_future=false`) and neither local `dev-auth-secret` is the live server's secret (it is set externally) | UNTESTABLE via 4100; closed instead against real PostgreSQL in-process, 8/8 (§3) |

**The gate-count delta is NOT a mis-measurement.** 472->464, 470->462, 441->433 is exactly -8 while
`challengedMutatingRoutes` is IDENTICAL at 173. Attributed: foreign commit `320ae2175` deleted 4
GET routes from `clinical.ts` (`custom-examination-form-catalogs`, `extended-odontogram-states`,
`non-dental-examination-forms`, `diagnocat-findings`); Fastify auto-registers a HEAD twin per GET,
so 4 x 2 = 8 route-table entries, all non-mutating — which is exactly why the mutating count did
not move. The builder's numbers were right at its own revision.

## 7. GIT HYGIENE

- Three commits, each ONLY the claimed files (verified by `--numstat`). No foreign file in any,
  despite a shared index holding 8-11 staged foreign deletions at the time.
- Conventional Commits with scope; bodies explain WHY, not WHAT.
- Russian subjects name the DEFECT, and the naming is accurate against what I reproduced:
  "смена пароля клиники и PIN сотрудника проверяли тело до прав". No mojibake in any subject/body.
- Minor unreconcilable number: handoff §Долг.4 says **8** foreign staged files; the summary handed
  to me says **11**. I observed 11 staged deletions at review start, and the index demonstrably
  moved (those deletions are now committed by others). Both can be true at different instants.
  Benign, but the count should have carried a timestamp.
- No scratch garbage committed by the builder. Mine is deleted.

## 8. HOLLOW FACADE / SECOND OWNER / STANDARD TRAPS — all clean

- No `useAppLogic` change, no deleted return field, no web file touched; `git grep` proves zero web
  callers of either route, so the "breaks 50+ files" trap is not in play.
- No hardcoded hex/px, no new user-facing string (every response text pre-existed) -> no i18n debt.
  Verified: the diff adds only comments and relocates existing blocks.
- Teardown present and correct: outer `afterEach` does `app.close()` + `mock.restoreAll()`; the new
  describe adds its own `beforeEach`/`afterEach` that SAVE AND RESTORE `ADMIN_SETUP_KEY` — which
  matters, because leaking that env var would silently authorise sibling suites.
- The tests cannot pass for the wrong reason: "охранник открывается" pins 200 for an owner and the
  contract tests pin the 400s, so a permanently-closed route would fail. Both directions are held.
- No `// TODO`, no placeholder, no mock in product code.
- Third instance (`POST /api/auth/staff/unlock`) reported and deliberately NOT fixed. I confirmed
  at HEAD: body validation `177-179` -> 400 runs before the clinic-token check `186-188` -> 401.
  Its gate entry still carries `expectedStatusCodes: [400]`, so the builder's stated reason (c) —
  flipping it would strand a gate entry it may not edit — is factually correct.

## 9. REQUIRED REWORK (record/scope only — no code change is required)

1. Amend handoff.md NOT-PROVEN #1 to state the load-bearing consequence: with the two
   `payloadBeforeAuthorisation` entries in place the gate is GREEN on this defect and blind to its
   re-introduction. Measured: parent -> 403 with the entry (pass), 400 without it (fail).
2. Close the gate debt (lead-owned, `scripts/` was out of the packet's claim): delete both entries,
   rebuild, re-run. Expected: still `"ok": true` — and the gate becomes an actual regression
   detector for this defect class.
3. Correct the two false facts inside the gate's own reason strings before or while deleting them:
   stale line numbers and "проверяет наличие сотрудника", which was never true.
4. Qualify the "byte-identical 403 for every body shape" phrasing: true for every body that reaches
   the handler; a syntactically invalid or empty raw body gets Fastify's generic
   `FST_ERR_CTP_*` 400 pre-handler (pre-existing, unchanged, no policy text).
5. Stamp the foreign-staged-file count with a timestamp (handoff says 8, summary says 11; the index
   moved between).
6. Drop dist mtime as a proof instrument. In a repo where any agent's build overwrites `dist`, an
   mtime is not evidence; rebuild-then-measure is, and the gate's own `buildFreshness` block now
   does it properly.
7. Optional, lead's call: the 200 write path against real PostgreSQL, and the timing side-channel
   (200 requests per body shape, compare medians). Neither was measured by the builder or by me.
