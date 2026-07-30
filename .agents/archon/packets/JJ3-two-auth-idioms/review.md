# JJ3-two-auth-idioms — adversarial review

COMMIT UNDER REVIEW: 072cff4a5c709500b10b1a0ed5418ac086a86fc6
Author: marko1olo <marko1olo@users.noreply.github.com>  Date: 2026-07-29 07:13:12 +0400
Diff scope (verified `git show --stat`): apps/api/src/routes/patients.ts ONLY, 32 insertions / 30 deletions.

## Ground-truth correction #1 — FILES list overstates the commit
The task FILES list names `apps/api/src/tests/routes/patientReclamationTicketAuth.test.ts`.
That file is NOT in 072cff4a5. It landed in a SEPARATE commit `da00ca5fd`
("[ARCHON] test(пациенты): рекламации и задачи ничем не держали различие ...") one minute LATER
(07:14 vs 07:13). Both are ancestors of HEAD. Test-after-fix ordering => must check the test can
still fail (see check 4).
The three packet files (.agents/archon/packets/JJ3-two-auth-idioms/*) are UNTRACKED
(`git status` => `?? .agents/archon/packets/JJ3-two-auth-idioms/`), i.e. not committed at all.

## Ground-truth correction #2 — checks 1-3 of the brief target a different packet
Checks 1-3 ask about money interpolation in `guards.ts`, money COMPARISONS, and non-money
conversions. The money guard file is `apps/api/src/documents/guards.ts`. This commit does not
touch it (`git show --name-only` => patients.ts only). guards.ts money work belongs to
d0c0d196d / 185f181ac / a3f83ebeb. Reported as zero below, measured not assumed.

## Guard function at HEAD (apps/api/src/routes/patients.ts:326-341) — CORRECT
Sends the reply itself, then returns null; so the call sites' `if (!orgId) return reply;` is the
right Fastify "reply handled manually" idiom, not an accidental empty 200.
  missing/empty token -> 401 {error:"AuthRequired", message: clinicAuthRequiredMessage}
  verifyToken fail or no organizationId -> 401 {error:"AuthExpired", message: clinicAuthRejectedMessage}
Organization comes only from the signed token payload. No x-organization-id path. Confirmed by read.

## Check 1 — DID IT MISS A SITE? (my own grep, not the brief's numbers)

(a) Literal reading of the brief (money-in-text in guards.ts). MY NUMBERS CONTRADICT THE DISPATCH.
The dispatch said "11 raw and 4 already correct". My grep over apps/api/src/documents/guards.ts at
HEAD finds 11 money interpolations into refusal text and 0 of them raw — every one goes through
`moneyRubText(...)` or `moneyKopecksText(...)`:
  424, 540, 544, 545, 744, 758, 772, 783, 841, 850, 881
`rg -c formatKopecksRu apps/api/src/documents/guards.ts` => 0 matches. My first pass mis-scored these
as "raw" only because I filtered on the shared helper's name; the file routes money through two local
wrappers instead. RAW COUNT AT HEAD = 0. Not attributable to this packet either way: 072cff4a5 does
not touch guards.ts.

(b) The check that actually applies to this diff (weak auth idiom still raw at HEAD).
`rg '^\s*app\.(get|post|put|delete|patch)\(' apps/api/src/routes/patients.ts` => 15 handlers.
`rg 'requireClinicOrganizationId\(request' ...` => 16 hits = 1 definition + 15 call sites.
I checked the two lines following EVERY one of the 15 handler declarations (343, 363, 401, 433, 503,
565, 593, 646, 689, 738, 766, 831, 874, 909, 937): all fifteen open with

    const orgId = requireClinicOrganizationId(request, reply);
    if (!orgId) return reply;

as the FIRST statement — no handler reaches a DB call before the gate.
`rg readClinicOrgId apps/api/src` => only 2 hits, both PROSE (patients.ts:312 docstring,
patientReclamationTicketAuth.test.ts:13 docstring). The weak helper is deleted, not orphaned.
SITES MISSED INSIDE THE PACKET'S FILE = 0. The "fifteen handlers" claim is accurate.

(c) Sites still carrying the same class of defect at HEAD, outside the packet's file — DISCLOSED by
the author, and the disclosure is accurate:
  apps/api/src/routes/schedule.ts:171,173 and :200,202   (2 handlers)
  apps/api/src/routes/visits.ts:171,173 / 212,214 / 230,232 / 255,257   (4 handlers)
These already DO distinguish the two states (`AuthRequired` vs `AuthExpired`) but send a body with NO
`message` at all: `reply.code(401).send({ error: "AuthRequired" })`. So the residual defect there is
the missing human-readable cause, exactly as the inventory says. Line numbers in the inventory
(schedule 169/198, visits 164/205/223/248) point at the token-read line rather than the reply line —
cosmetic drift, not a false claim.

## Check 2 — DID IT TOUCH A MONEY COMPARISON? NO. Not revert-grade.
Grepped every +/- line of the diff for comparison operators, Math.*, epsilon/EPSILON/tolerance.
Only two lines match, and BOTH are deletions of the retired helper:

    -  const readClinicOrgId = (request: { headers: Record<string, unknown> }): string | null => {
    -    if (typeof clinicToken !== "string" || !clinicToken) return null;

That `typeof` test is a header type-check, not a money comparison, and it survives verbatim inside
`requireClinicOrganizationId` (patients.ts:328-331). Zero money tokens in the diff at all
(kopeck/копе/amount/сумм/руб/₽/toFixed/formatKopecks/price/цен => no matches on any +/- line).
No tolerance introduced anywhere. The integer-kopecks-no-epsilon invariant is untouched by this
commit, and guards.ts:84-85 still documents it ("Сравнения этим не затронуты: они идут в целых
копейках без допуска").

## Check 3 — DID IT CONVERT SOMETHING THAT IS NOT MONEY? NO.
No money formatting was applied anywhere in this diff. Grepped +/- lines for `index + 1`, `.length`,
`count` => zero matches. (For the record, the `${index + 1}` line number at guards.ts:744 sits
OUTSIDE any money wrapper, which is correct, and this commit did not go near it.)

## Check 4 — WOULD THE TEST FAIL ON REVERT? YES — 3 of its 4 tests fail.
Ran it at HEAD: `node --import tsx --test apps/api/src/tests/routes/patientReclamationTicketAuth.test.ts`
=> EXIT=0, tests 4 / pass 4 / fail 0. Reproduced the author's claim exactly.
The test is real runtime proof, not source inspection: it builds a Fastify app, calls
`registerPatientRoutes`, and drives all 8 routes through `app.inject`, asserting 401 (not 404 — so
route match AND handler execution are both proven).

Assertions that BREAK on revert (old code answered `{error:"AuthRequired", message:"Требуется
авторизация рабочего кабинета клиники."}` for BOTH states on these 8 routes):
  - line 111 `assert.equal(body.error, "AuthExpired")` — CLEANEST BREAK. Old code sent
    "AuthRequired" for a corrupt token on all 8 routes.
  - line 125 `assert.equal(error, "AuthExpired")` for the expired token — old code sent "AuthRequired".
  - line 96 `assert.match(String(body.message), /Войдите в кабинет клиники/)`. Verified by running the
    old literal against the regex: /Войдите в кабинет клиники/ on the old message => FALSE, on the new
    message => TRUE. /Войдите в кабинет клиники заново/ on old => FALSE, on new rejected msg => TRUE.

CEREMONY, disclose it: test 4 ("заголовок организации не заменяет токен") asserts 401 + AuthRequired,
which the OLD code also returned (no token => null => AuthRequired). It passes either way, so it does
not guard this fix. It is still a legitimate forward guard against a future consolidation onto
`requireOrganizationId`, and the test says so at lines 29-34.
The test is in a SEPARATE commit (da00ca5fd), one minute after the fix — so it never ran red against
the real defect in CI; the red-on-revert property is what I verified above instead.

## Check 5 — ATTRIBUTION. CLEAN.
`git log -1 --format=%(trailers) 072cff4a5c709500b10b1a0ed5418ac086a86fc6` => EMPTY (no output).
`git log -1 --format='%s%n%b' | grep -icE 'co-authored-by|anthropic|claude|generated with'` => 0.
Author: marko1olo <marko1olo@users.noreply.github.com>.
Test commit da00ca5fd: trailers also EMPTY, same author.

## Sweeps
- «руб. ₽» double unit: `rg 'руб\.\s*₽|₽\s*руб' apps/api/src apps/web/src` => ZERO. guards.ts writes
  `${moneyRubText(x)} руб.` (decimal string + unit), which is why formatKopecksRu (₽-suffixed) is
  correctly absent from that file.
- Second money helper beside @dental/shared: `moneyRubText` (guards.ts:87) and `moneyKopecksText`
  (guards.ts:102) are LOCAL, but they are thin try/catch wrappers that delegate to @dental/shared
  ("Реализация та же самая, из `@dental/shared`", :99-101) and fall back to a `?.??` sentinel. Not a
  rival implementation. Untouched by this commit.
- Mojibake in diff or subject: ZERO (grepped for the usual Ð / Ñ / Â / replacement-char signatures
  across the whole `git show`).
- English string reaching a user: ZERO added. The only English in the diff is the machine-readable
  `error` field values `AuthRequired` / `AuthExpired`, which are wire codes, not display text; both
  user-facing strings are Russian and both name a cause and a next step.
- Smoke gate excuse VERIFIED, not accepted on trust: scripts/lib/api-route-census.mjs throws
  ("Исходников новее своей сборки" / "Компилируемых файлов без выхода сборки") BEFORE any HTTP
  request. `apps/api/dist/routes/patients.js` = 2026-07-28 19:28 vs
  `apps/api/src/routes/patients.ts` = 2026-07-29 07:10. Stale-build guard, not a security failure.
  Consequence to state plainly: the behavioural gate never exercised the new code. The app.inject
  test is the only runtime proof, and it is sufficient for the route bodies.

## FINDING 1 (substantive) — the user-visible cure asserted in the commit body does not happen
The commit body and the new docstring both rest on this causal chain: "клиент, не получив различия
причин, строит совет по коду 401 (apps/web/src/lib/panelStateText.ts) и отправляет к администратору,
хотя достаточно войти в кабинет заново. Врач с оборвавшейся смены бросал фиксацию рекламации."
The commit then deliberately keeps the status identical: "Код ответа не изменился: 401 в обоих
состояниях, как и было."

But the two consuming widgets build EVERY failure string from the HTTP status alone and never read the
response body on failure:
  - apps/web/src/lib/panelStateText.ts:120 `requestFailureCause(status: number | null)` — switches on
    the number only; 401/403 both return the single fixed string at :123.
  - :205 `actionFailureToast(action, status)` => `${action}: ${requestFailureCause(status)}.` — the
    mutation path. PatientReclamationsWidget.tsx:143 and PatientTaskTicketsWidget.tsx:131 pass
    `res.status`, never `body.message`.
  - the read path: usePatientResource exposes only `error` + `failureStatus` (:56-58, :133) and never
    parses the body on the failure branch (:102 logs the status, :107 parses only on success);
    PatientReclamationsWidget.tsx:284 renders `<PanelLoadFailure status={failureStatus} .../>`.
  - `rg AuthExpired apps/web/src` => ZERO HITS. Nothing in the client knows the new code exists.

Therefore the doctor's on-screen text for these 8 routes is byte-identical before and after this
commit: "у вашей смены нет доступа к этим данным — войдите в смену заново или попросите администратора
открыть доступ". The improved `message` lands in a field these screens discard.
Severity: this is an overclaim in the commit narrative, NOT a code regression. The API contract
improvement is real and is a precondition for a client fix; nothing regressed. But the packet must not
be recorded as having fixed the abandoned-reclamation journey — it did not.

## FINDING 2 (minor) — the premise overstates the old client behaviour
The claim is that the client "отправляет человека к администратору". The actual 401 string
(panelStateText.ts:123) leads with "войдите в смену заново" and offers the administrator only as the
alternative, and panelRetryLabel(401) at :155 is already "Я вошёл — прочитать снова". The old advice
was already re-login-first, so even the diagnosis of client behaviour is half right.

## NON-FINDINGS I actively tried to make stick and could not
- `if (!orgId) return reply;` sending an empty 200: NO. The guard calls
  `reply.code(401).send({...})` on both failure branches BEFORE `return null` (patients.ts:328-341),
  so returning the reply object is the correct Fastify "handled manually" signal.
- AuthRequired -> AuthExpired breaking a client auto-logout/token-clear branch: NO.
  `rg AuthRequired apps/web/src` finds only unrelated codes (`StaffAuthRequired` in
  ScannerView.tsx:65, `ClinicAuthRequired` mentioned in a StaffPinPad comment, and a settings test
  fixture). Nothing branches on the patients.ts code, so the rename breaks nothing.
- The direction-of-consolidation justification being style-picked: NO, it is verifiable and TRUE.
  security/identity.ts:112-114 `unverifiedOrganizationUsable` returns `true` for any
  non-state-changing request, so `requireOrganizationId` on a GET really would accept an
  x-organization-id header under DENTE_DEV_ALLOW_HEADER_ORG=1, while this handwritten guard reads the
  org only from the signed token payload. Consolidating onto the shared helper would have WEAKENED
  the 8 read routes. Keeping the handwritten guard was the right call.
- Type/compile risk from the new call signature: the identical call form already existed at 7
  pre-existing sites (incl. handlers with :patientId params), so the pattern is proven to compile.
  Not verified by typecheck — running it was out of bounds for this review (other agents mid-edit).

## VERDICT: SOUND_WITH_NITS
The code change is correct, safe, and a genuine de-duplication: two handwritten auth idioms in one
file reduced to one, the surviving one is the STRICTER of the two and stricter than the shared helper
on reads, all 15 handlers gate on it as their first statement, and the retired helper is fully
deleted. No comparison touched, no money touched, no non-money conversion, no mojibake, no English
user text, attribution clean, and the accompanying test genuinely fails on revert (3 of 4 tests, the
cleanest being the AuthExpired assertion at line 111).
The nits are claim-hygiene, not code: the commit body sells a user-visible cure that the client cannot
deliver because it discards the response body for these panels (Finding 1), and it overstates the old
client advice (Finding 2). Follow-ups, not rework: teach the client to prefer a server-supplied
`message` over status-only text, and give schedule.ts/visits.ts (6 handlers) the missing `message`.
