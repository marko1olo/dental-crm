# ADVERSARIAL REVIEW — S1-speech-unauthenticated

Reviewer: adversarial subagent (did not write the code). Commit attacked:
`8f4d42fe361fb5ad65382cfd7c08e873a710cbb8`, plus the packet's follow-ups `46bed6dba`, `cb15cdec9`,
`0198d78f4`. Repo HEAD at review time: `0198d78f4`. Everything below was re-run by me; nothing is
quoted from the handoff as evidence.

**VERDICT: NEEDS_REWORK.** The central claim reproduces — credential-less writes are refused, the
cross-tenant write is refused, and I confirmed it on the live server and in the database. But two
stated claims are false, and a shipped artifact still carries the vulnerability.

---

## 1. Was the defect real before the commit? YES — and the BRIEF's diagnosis was FALSE

`git show 8f4d42fe3^:apps/api/src/routes/speech.ts` line 229:

```
229:  if (!(await requireClinicalMutationAccess(request, reply, "speech chunk transcribe"))) return;
```

The brief asserted the write endpoint had "no guard whatsoever … no requireClinicalMutationAccess",
and that speech.ts used "only … the read one". Both are false; the mutation guard was the handler's
first statement at :229 and was also used at :261. The builder caught this. CONFIRMED in his favour.

The defect was still real, for the two reasons he gives:
- `accessGuard.ts:31-33` — no `DENTE_CLINICAL_ADMIN_SECRET` + `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1`
  + `NODE_ENV!==production` → `return true` for a request with zero headers.
- `speech/storage.ts:489-510` (`resolveSpeechChunkOrganizationId`) reads the stored chunk's
  `organizationId` out of the CLIENT-supplied `visitId`/`patientId` with `eq(id, …)` and no tenant
  predicate; pre-fix `validateSpeechClinicalScope` did the same. The caller chose the tenant.

## 2. API VERIFIED — the packet declared it impossible. It is not, and it passes.

The packet's NOT-PROVEN list says the dev server "runs WITHOUT --watch". FALSE:
`apps/api/package.json` → `"dev": "tsx watch src/server.ts"`, and `Launcher.ps1:272` starts
`npm run dev`. I ran the packet's own closing command:

```
$ curl -s -w "HTTP:%{http_code}" -X POST http://127.0.0.1:4100/api/speech/transcribe-chunk \
    -H "Content-Type: application/json" -d "{}"
{"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}  HTTP:401
$ ... -H "x-organization-id: dce70000-…-09ff" (no token)   -> HTTP:401
$ ... -H "x-dente-clinic-token: not.a.token"               -> HTTP:401
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4100/api/speech/status -> 200
```

The live server serves the fix. The 200 on the neighbouring read under the same env is the control:
the 401 comes from the change, not the environment. API VERIFIED — promoted by me.

## 3. DB VERIFIED — the packet did not claim it. I did it.

Probe (scratch, now deleted) using the src route + `app.inject` + raw SQL:

```
[A] valid clinic token -> 201
[A][SQL] {"organization_id":"…09e1","patient_id":"…09f1","visit_id":"…09f2","status":"needs_review",
          "head":"Ревизорская метка 77: удаление 48 зуба, кровотечение остановлено.","envelope_len":1141}
[A][SQL] rows whose result_text contains the marker: {"n":1,"org":"…09e1"}
```

The transcript lands in `ai_jobs.result_text` (and the envelope in `input_text`) — note the packet's
closing SQL suggestion reads `input_storage_path like 'speech/%'`, but the real value is
`speech-recording://<recordingId>`, so that command would have returned nothing.

## 4. Bypass matrix — every status code I observed

| Attack | Result | Verdict |
|---|---|---|
| no headers at all (live 4100) | 401 AuthRequired | refused |
| empty body, no token | 401, not `SpeechChunkValidationError` | refused |
| malformed token | 401 | refused |
| token signed with a foreign secret | 401 | refused |
| empty `x-dente-admin-secret`, no token | 401 | refused |
| org-B token + org-A patientId | 404 `SpeechClinicalScopeError` | refused, non-leaking |
| org-B token + org-A visitId | 404 | refused |
| token whose org UUID is in NO `organizations` row + org-A patient | **404, and 0 rows written for that org** | refused — the packet's *untested reasoning* HOLDS, I tested it |
| staff-token-only (signed) | 201 | correct, a staff token is a credential |
| valid token, no patient and no visit | 400 with a clear message (not 500) | correct |
| **`DENTE_DEV_ALLOW_HEADER_ORG=1` + `x-organization-id`, NO token** | **201 Created** | **BYPASSED — see finding 1** |

## 5. FINDING 1 [HIGH] — "there is no environment-variable bypass" is DISPROVED

Commit body: «требует организацию из подписанного токена (401 без токена, **обхода через переменные
окружения там нет**)». handoff.md:43-44 repeats it: «у `requireOrganizationId` … обхода через
переменные окружения нет … и даже при "1" нужен заголовок». The test file states the same invariant
at line 28-29 and then **deletes the exact flag that breaks it** (line 69).

Measured, same process, same fixed source:

```
[B] DENTE_DEV_ALLOW_HEADER_ORG=1 + x-organization-id, NO token -> 201
    {"chunk":{"id":"4fdbcd3f-…","organizationId":"dce70000-…-09e1", …}}
```

Root cause: `security/identity.ts:107-113` sets `organizationId` from the client header with
`verified: false`, and `requireOrganizationId` (`identity.ts:132-142`) checks only that
`organizationId` is non-null — it never checks `identity.verified`. So the guard accepts an
attacker-named clinic UUID and the original defect returns in full: credential-less cross-tenant
clinical write, 201 Created.

"Even with 1 you need the header" is not a defence — the header is the attacker's input. And the flag
is not hypothetical here: `apply-dev-env.ps1:29` is a checked-in operator script whose stated purpose
is to restore "the usual mode", and it writes `DENTE_DEV_ALLOW_HEADER_ORG=1` into `.env`,
`.env.local` **and** `apps/api/.env` (lines 41-43). One run of it re-opens this hole. Seven test
files also set it. The running server does not have it today (probe above: 401), so the box is
currently safe.

Fixing it requires `accessGuard.ts`/`identity.ts`, which this packet was forbidden to touch — so the
builder is not at fault for leaving it. He is at fault for asserting it does not exist.

## 6. FINDING 2 [HIGH] — an existing gate DOES break; it is green only because it loads stale dist

The packet claims «Ни один существующий тест не опирался на открытость эндпоинта». True for
`npm test -w @dental/api`; FALSE for the smoke suite.

`scripts/smoke-speech-route-validation.mjs` case "speech chunk invalid payload" (lines 139-153) POSTs
to `/api/speech/transcribe-chunk` with `x-dente-admin-secret` only (it sets `NODE_ENV=production` and
`DENTE_CLINICAL_ADMIN_SECRET="synthetic-clinical-secret"`, lines 7-10) and asserts
`statusCode === 400` (`assertRouteValidationResponse`, line 100). No clinic token is sent, so the
fixed handler answers 401.

It passes today (`ROUTEVAL_EXIT=0`) because it resolves the **compiled** build, and that build is
pre-fix. I replayed its exact env and payload against the source:

```
[SMOKE-REPLAY on src] speech chunk invalid payload -> 401 {"error":"AuthRequired", …}
[SMOKE-REPLAY] smoke asserts 400; actual on fixed source: 401
```

So `npm run smoke:speech-route-validation` goes RED the moment `apps/api/dist` is rebuilt. This is
exactly the case the brief predicted: the smoke encoded the defect. It must be updated (send a clinic
token, or assert 401 for the credential-less case) — not reverted.

## 7. FINDING 3 [MEDIUM] — the committed build artifact still contains the vulnerable handler

`apps/api/dist/routes/speech.js` is **tracked** in git (`git ls-files --error-unmatch` succeeds), is
**clean** (no pending modification), and still reads:

```
9:  import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
149:   if (!(await requireClinicalMutationAccess(request, reply, "speech chunk transcribe")))
```

with no `organizationId` predicate on the patient/visit lookups. `grep -c requireClinicalMutationContext`
→ 0. mtime 2026-07-28 00:54 vs src 04:34. `apps/api/package.json` → `"start": "node dist/server.js"`.
So `npm start -w @dental/api` serves the unfixed endpoint, and the repository ships a vulnerable
build. The operator launcher uses `npm run dev`, so the live box is fixed — but for a security packet
this had to be stated, and the handoff never mentions `dist` at all. (149 dist files are tracked, 44
already dirty from other authors, so rebuilding-and-committing is a lead decision, not a silent one.)

## 8. FINDING 4 [LOW] — a guard-count gate is now satisfied by a comment

`scripts/smoke-clinical-mutation-guard.mjs:47` expects `apps/api/src/routes/speech.ts` to contain
`>= 2` mutation guards, counted as `(source.match(/requireClinicalMutationAccess/g).length) - 1`.
Occurrences: 3 at the parent (import + two real call sites) and 3 at HEAD (import + **the new
JSDoc comment at speech.ts:257** + one real call site). Real guarded mutation routes fell 2 → 1, and
the gate stays green on prose. No new breakage — that smoke is already red at the parent commit
(`apps/api/src/routes/patients.ts must guard 3 protected route(s), found 0`, because patients.ts uses
the hand-rolled `verifyToken` idiom) — but the gate is text-counting and cannot see guard removal.

## 9. FINDING 5 [LOW] — the test-count figure is wrong by 2

Reproduced at HEAD, twice: `tests 932`, deterministic. Run 1: `pass 932 | fail 0`, exit 0. The packet
claims `tests 931 | pass 931` and attributes `+6` to S2's `storageIdentity.test.ts`. Measured
directly: `storageIdentity.test.ts` = **4** tests, `storageRestoreCeiling.test.ts` = **3**. The
self-consistent chain is 925 (at 46bed6dba) + 4 + 3 = **932**, so the claimed 931 should have been
929, and the "+6" attribution is wrong. Substance holds; the number does not.

Also, out of S1 scope but on the record: my **second** full run exited 1 —
`apps/api/src/speech/tests/storageRestoreCeiling.test.ts` (packet S3, commit `1acbb98d7`) failed
`общее число поднятых записей не растёт с числом клиник`, `0 !== 1`. Its assertions depend on global
`ai_jobs` state, and I cannot exclude that my own DB probes perturbed it. S1's own suite passed in
both runs. No "npm test → all green" claim is safe at this HEAD.

## 10. Census — independently corroborated, with one frame caveat

Verified myself:
- No mutating registrations outside `apps/api/src/routes/` — zero hits.
- No `app.route({ method })` idiom anywhere in routes.
- No global auth hook: `server.ts:303` `onRequest` sets four security headers and calls
  `getRequestIdentity(request)`; it enforces nothing. Every route must guard itself. CONFIRMED.
- 169 mutating registrations by raw occurrence count in 45 files (builder: 183 across 63 route
  files — his figure resolves multi-line and `server.`/`fastify.` receivers, mine does not; same
  order, no contradiction).
- Only ONE route file has mutating-looking calls and zero auth vocabulary:
  `publicAppointmentActions.ts` — and that is a false positive of my own regex
  (`requestCounts.delete(key)`, a Map method, line 46).
- Spot-checks of all six claimed exceptions hold: `settings.ts:383/387` really are inert
  `{ success: true }` facades; `rateLimit.ts:78-79` really covers `^/api/public/` and `^/api/portal/`.

CAVEAT (the builder discloses it at handoff:256, «GET не считал»): the census frame is
POST/PUT/PATCH/DELETE only, and there is at least one **unauthenticated state-changing GET** —
`apps/api/src/routes/publicAppointmentActions.ts:260`, `GET /api/p/:code`, which sets an appointment
to `confirmed`/`cancelled` (lines 191, 207) and inserts a `communicationTasks` row (line 223). Its
credential is a random action code, it is IP rate-limited (30/min, line 36) and it uses an
org-scoped lookup, so it is not a hole — but "the speech write endpoint was the only one" is true
only inside that frame.

## 11. Reachability — independently traced, terminates at a real user

`apps/web/src/hooks/useVoiceAssistant.ts:198`, `useShortDictation.ts:97`,
`hooks/domains/useVisitLogic.ts:656` all `fetch("/api/speech/transcribe-chunk")` → registered at
`speech.ts:320` → `registerSpeechRoutes` invoked at `server.ts:409` → guard is the first statement at
`speech.ts:266`, before body parsing. Not dead code.

Legitimate users are not broken, and I checked the helper bodies rather than the names:
`AppHelpers.tsx:4056-4071` `denteAdminSecretRequestHeaders` attaches `x-dente-clinic-token` (and
`x-dente-staff-token`) from `localStorage` despite its name, and `AppHelpers.tsx:6058-6064`
`denteClinicalMutationHeaders` attaches `x-dente-clinic-token`. Both are conditional on a token
being present, which is the correct new behaviour.

Latent, and NOT a regression (identical before and after, since the pre-fix handler called the same
boolean gate): if `DENTE_CLINICAL_ADMIN_SECRET` is ever configured — and `apps/api/.env` already
contains it, though the running process clearly does not load that file, or the probe would have
answered 403 instead of 401 — then `requireClinicalMutationAccess` inside
`requireClinicalMutationContext` demands `x-dente-admin-secret`, which the dictation UI only sends
when the operator has typed the secret into the app. Worth the lead's attention, not this packet's.

## 12. Hollow-facade / hygiene sweep — clean

- No `{success:true}` over a no-op, no placeholder, no magic constant, no hardcoded hex/px/port/UUID
  added by the diff (grepped the `+` lines).
- No `TODO`/`FIXME`/`mock`/`placeholder` in either commit's additions.
- No mojibake: zero hits for `Ð|Ñ|â€|Â«|Â»` in `speech.ts` and the new test; the commit subject's
  bytes are clean UTF-8 (`320 264 320 270 320 272 321 202 …` = «диктовка»).
- No new user-facing strings: the two 404 messages already existed pre-fix, so no i18n debt.
- No listener/interval/handle added, no `useAppLogic` return field touched, no file deleted.
- No second owner introduced in speech.ts; `validateSpeechClinicalScope` gained a *required*
  `organizationId` field, which forces every call site to state its tenant instead of defaulting —
  the right shape. Read handlers pass `null` explicitly, behaviour byte-identical.

## 13. Git hygiene — clean, one disclosed deviation

All four packet commits touch ONLY claimed paths. No `apps/api/dist/**`, no `apps/api/.data/*.json`,
no `tsbuildinfo`, no `scratch/**`, no other author's work swept in (`server.ts`,
`MarketingView.tsx`, `AnalyticsDashboardView.tsx`, `seedOpsScreenshotDemo.ts`,
`patientRecall*`/`RecallListPanel` are dirty/untracked from other agents and were correctly left
alone). Subjects are Conventional Commits, in Russian, and name the DEFECT rather than the activity.
`8f4d42fe3`, `46bed6dba`, `cb15cdec9` lack the required `[ARCHON] ` prefix — self-disclosed, and the
refusal to rebase over another agent's commits is the correct call.

## 14. Reproduced proof commands (true exit codes, not `$?` after a pipe)

| Command | Result |
|---|---|
| `node --import tsx --test apps/api/src/tests/routes/speechTranscribeChunkAccess.test.ts` | tests 7, pass 7, fail 0, **skipped 0**, exit 0 — matches the claim exactly |
| `npm run typecheck -w @dental/api` | exit 0 — matches |
| `npm test -w @dental/api` (run 1) | tests 932, pass 932, fail 0, skipped 0, exit 0 |
| `npm test -w @dental/api` (run 2) | tests 932, pass 931, **fail 1**, exit 1 — failure in S3's `storageRestoreCeiling.test.ts`, not S1 |
| `curl POST /api/speech/transcribe-chunk` (live, no creds) | 401 AuthRequired |
| `npm run smoke:speech-route-validation` | exit 0 — but against stale dist; 401 vs asserted 400 on src |
| `npm run smoke:clinical-mutation-guard` | exit 1 — pre-existing, fails on `patients.ts`, not on speech |
| `npm run smoke:speech-clinical-scope` | exit 1 — pre-existing, fails on a `dentalPromptSource` dictionary-string assertion in a file this packet never touched |

## 15. Required rework

1. Delete the false claim from `handoff.md:41-44`, from the commit body of `8f4d42fe3`, and from the
   test docblock at `speechTranscribeChunkAccess.test.ts:28-29`. There IS an environment-variable
   bypass. Replace it with the measured reproduction: `DENTE_DEV_ALLOW_HEADER_ORG=1` +
   `x-organization-id: <any org UUID>` + no token → **201 Created**, chunk written into that org.
2. Open the next packet on `security/identity.ts:132-142`: `requireOrganizationId` must reject
   `identity.verified === false` for mutation contexts (`requireClinicalMutationContext`), and
   `apply-dev-env.ps1:29` must stop writing `DENTE_DEV_ALLOW_HEADER_ORG=1` into three env files by
   default. Until then S1's endpoint is one script-run away from being reopened.
3. Add a test to `speechTranscribeChunkAccess.test.ts` that sets `DENTE_DEV_ALLOW_HEADER_ORG=1` and
   asserts the write is still refused. The current suite deletes that flag, which hides the case.
4. Fix `scripts/smoke-speech-route-validation.mjs` (case "speech chunk invalid payload", lines
   139-153): it asserts 400 and the fixed handler returns 401. Send a valid clinic token so the body
   contract is still exercised, or split the case into 401-without-token and 400-with-token. It is
   green today only because it loads the stale `apps/api/dist`; it breaks on the next `npm run build`.
5. Decide and record what happens to `apps/api/dist/routes/speech.js`: it is tracked, clean, and
   still contains the pre-fix handler, so `npm start -w @dental/api` serves the vulnerability. Either
   rebuild and commit that one path, or untrack `apps/api/dist/**`. Silence is not an option for a
   security packet.
6. Correct the smoke figure: `npm test -w @dental/api` at HEAD is **932**, not 931; S2's
   `storageIdentity.test.ts` adds **4** tests, not 6. And state that the suite is not deterministically
   green at this HEAD (`storageRestoreCeiling.test.ts` failed on my second run).
7. Record in the census section that the frame was POST/PUT/PATCH/DELETE only and that at least one
   unauthenticated state-changing GET exists (`publicAppointmentActions.ts:260`, `GET /api/p/:code`),
   so "the speech write endpoint was the only one" is scoped, not absolute.
8. Optional, next packet: pass `context.organizationId` down into
   `speech/storage.ts resolveSpeechChunkOrganizationId` instead of letting it re-derive the tenant
   from client-supplied ids with an unscoped query (`storage.ts:489-510`). Correct today only because
   the route validates first — two owners of one decision.
