# ADVERSARIAL REVIEW — P6-doc-signer

Reviewer: adversarial subagent (did not write this code). Posture: disbelief by default.
Repo HEAD at review time: `198da887c5719a112f3413425a30ba7542789e15`

Commits under attack (the packet is TWO commits, not one):
- `5136239e62d0bbc4f0ab59380554496e364b54fa` — the SOURCE fix (documentQuery.ts, issue.ts, void.ts)
- `3ad6d461410ae9a087ce81ad5d2164710c245f4f` — the TEST only (documentQuery.test.ts)

**VERDICT: SOUND_WITH_NITS.**

Every one of the seven "BUILDER CLAIMED PROVEN" items reproduced under my own hands. This is the
first packet I have audited on this repo where the proof was real. The nits are reporting-shape
issues and one confirmed product hole that the builder itself disclosed and correctly deferred.

---

## 0. THE NAMED COMMIT IS NOT THE FIX

Packet metadata says `COMMIT TO ATTACK: 3ad6d4614` with four files changed. False as stated.

`git show 3ad6d4614 --stat`:
```
 apps/api/src/db/documentQuery.test.ts | 76 +++++++++++++++++++++++++++++++++++
 1 file changed, 76 insertions(+)
```

The three source files are in the immediate PARENT `5136239e6`:
```
 apps/api/src/db/documentQuery.ts       | 59 +++++++++++++++++++++++++++++++---
 apps/api/src/routes/documents/issue.ts |  9 +++++-
 apps/api/src/routes/documents/void.ts  |  8 ++++-
 3 files changed, 70 insertions(+), 6 deletions(-)
```

This is NOT a fabrication: `5136239e6` is the direct parent, both were authored five minutes
apart, and the test commit body explicitly cites `5136239e6` by hash. Splitting fix from
regression test is better hygiene than one blob. But the single-commit-four-files framing in the
report is wrong and the lead should record the pair. Reviewed as one packet across both.

---

## 1. ATTACK SURFACE

| # | Hypothesis I tried to prove | Result | Evidence |
|---|---|---|---|
| 1 | The defect was NOT real at the cited line (builder invented it) | **DISPROVED** | `git show 5136239e6^:apps/api/src/db/documentQuery.ts \| grep -n doctor` -> `190: issuedByUserId: "doctor", // usually from request, hardcoded in sampleData for now` and `236: voidedByUserId: "doctor",`. Real, and the second instance was NOT in the brief. |
| 2 | This is a fix to DEAD CODE dressed up as a product fix | **DISPROVED** | `rg -n "issueGeneratedDocumentInDb\(\|voidGeneratedDocumentInDb\(" apps packages scripts` (dist/node_modules excluded) -> exactly two production call sites: `routes/documents/issue.ts:181`, `routes/documents/void.ts:123`. Both updated. I then drove both over real HTTP (row 5). |
| 3 | The live server runs the stale `dist/`, so the API proof is meaningless | **DISPROVED** | `dist/db/documentQuery.js:139` still contains `issuedByUserId: "doctor"` (stale in worktree AND at HEAD). But PID 20812 on :4100 is `node --require .../tsx/dist/preflight.cjs --import .../tsx/dist/loader.mjs src/server.ts` — it serves **src**, not dist. The probe therefore exercised the fixed code. |
| 4 | "API VERIFIED" was never run / has no real status code | **DISPROVED** | I re-ran `node .agents/archon/packets/P6-doc-signer/probe-issue.mjs` myself. `HEALTH: 200`; `CREATE ...: 201`; `ISSUE ...: 200`; `issuedByUserId in RESPONSE: "e44d32ca-7777-4c00-a001-c88f01b92e21"`; `VOID: 200`. Fresh document id `d7c5e33d-a092-4447-90ce-778310155861` — **different from the builder's `8ae72f8f`**, so this is a genuine independent run, not a replayed transcript. |
| 5 | "DB VERIFIED" is a hand-typed JSON blob, not a real query | **DISPROVED** | My own `pg` read: `DB ROW AFTER ISSUE: [{"id":"d7c5e33d-...","status":"issued","issued_by_user_id":"e44d32ca-7777-4c00-a001-c88f01b92e21","voided_by_user_id":null}]`, then after void `status":"voided","voided_by_user_id":"e44d32ca-..."`. |
| 6 | The "acting user" e44d32ca is invented and does not exist | **DISPROVED** | `select id, full_name, role from users where id='e44d32ca-7777-4c00-a001-c88f01b92e21'` -> `[{"id":"e44d32ca-...","full_name":"Петров Иван Иванович","role":"owner"}]`. Real row, name renders clean (not mojibake). |
| 7 | The 22P02 claim (old write was impossible) is invented | **DISPROVED** | Reproduced twice. Pure read: `select 'doctor'::uuid` -> `22P02 invalid input syntax for type uuid: "doctor"`. Then the actual old write against a real row inside `BEGIN`/`ROLLBACK`: `update generated_documents set issued_by_user_id='doctor' where id=$1` -> `22P02 invalid input syntax for type uuid: "doctor"`, rolled back. Column types from `information_schema`: both `uuid`, `is_nullable=YES`. The pre-fix code genuinely could never write. |
| 8 | "TYPECHECK VERIFIED" was never run | **DISPROVED** | `npm run typecheck -w @dental/api` -> `tsc -p tsconfig.json --noEmit`, **TYPECHECK_EXIT=0**, zero output. Clean whole-project, not just in-scope. |
| 9 | "UNIT VERIFIED 4/4" is fabricated | **DISPROVED** | `node --import tsx --test src/db/documentQuery.test.ts` (cwd apps/api) -> `tests 4 / pass 4 / fail 0`, exit 0. |
| 10 | The neighbouring-tests claim (24 pass) is fabricated | **DISPROVED** | `node --import tsx --test src/tests/routes/documents.test.ts src/documents/documents.test.ts src/db/documentQuery.test.ts` -> `tests 24 / pass 24 / fail 0`, exit 0. Exact match. |
| 11 | The encoding baseline "27" is a made-up number and the packet files are dirty | **DISPROVED** | `node scripts/check-encoding.mjs` -> exit 1, first line literally `Найдены проблемы с кодировкой (27) среди 2077 файлов:`. Grep of the report for `documentQuery.ts\|documentQuery.test.ts\|documents/issue.ts\|documents/void.ts` -> **0 matches**. Both halves of the claim accurate. |
| 12 | It is a HOLLOW FACADE — `{success:true}` over a no-op, magic constant, fabricated 0 | **DISPROVED** | Diff scan of both commits: `success:true` added = 0; hardcoded port/URL added = 0; `process.env` added = 0; `as any` / `: any` added = 0. The only UUID literals added are the two test fixtures `00000000-0000-4000-8000-00000000000{1,2}`, deliberately non-existent so the guard fires before any row is touched. The only `mock` hit is the word "mock-org" inside a Russian comment citing the historical defect. |
| 13 | It creates a SECOND OWNER (duplicate uuid validator / parallel auth accessor) | **DISPROVED** | `z.string().uuid()` is already the repo-wide idiom (25+ hits across `routes/communicationsOutbox.ts`, `diary.ts`, `finance_family.ts`, `leads.ts`, …); there is no pre-existing shared `isUuid`/`validateUuid`/`UUID_RE` helper to duplicate. For auth, the builder used the existing `getRequestIdentity` from `security/identity.ts` — the same function `requireOrganizationId` already calls and that `server.ts:310` primes in an `onRequest` hook. No parallel accessor was invented. |
| 14 | It substituted a new placeholder / hardcoded UUID (the §1 violation the brief forbade) | **DISPROVED** | The absent-signer case is written as `null`, not a fake UUID. Verified in the DB, row 790ba951 below. |
| 15 | It deleted or renamed a field in the `useAppLogic.tsx` return block | **DISPROVED** | `git show --name-only 5136239e6 3ad6d4614 \| grep -c apps/web` -> **0**. No frontend file touched at all. |
| 16 | It introduced a listener/interval/subscription without teardown | **DISPROVED** | Diff scan: `setInterval\|setTimeout\|addEventListener\|subscribe(` added = **0**. |
| 17 | It added a hardcoded hex colour, or a static px where a relative unit belongs | **DISPROVED** | Diff scan: hex colours added = **0**, `\d+px` added = **0**. Backend-only diff. |
| 18 | Russian text in the diff or commit subjects is MOJIBAKE | **DISPROVED** | Scan of the combined diff for `[РС][\x80-\xFF]`, U+FFFD, and the Ð/Ñ/â cp1252 signatures -> **0 lines**. Subjects render correctly: `[ARCHON] fix(документы): выдача падала — подписантом писался литерал «doctor»` and `[ARCHON] test(документы): замок на подписанта — литерал вместо UUID больше не пройдёт`. Proper em-dash, proper guillemets, proper `ё`. |
| 19 | Real staff logins mint a non-UUID `userId`, so the new guard will 500 real users | **DISPROVED** | Every production minting site passes `userId: user.id` from the users table: `routes/auth.ts:215` (PIN login), `:483`, `:540`, `:616`. The patient portal token (`routes/portal.ts:553`) uses `sub`, not `userId`, so it can never populate `identity.userId`. No production path can feed a non-UUID to the guard. |
| 20 | The thrown guard error leaks internals or crashes the process | **DISPROVED** | `server.ts:313` `setErrorHandler` logs via `request.log.error` and replies `{error:"ServerError", message: publicApiErrorMessage(...)}` for 5xx. Loud, contained, no stack leak. |
| 21 | Brief item 6 (getDefaultOrganizationId still call-site-free) was skipped or faked | **DISPROVED** | Builder reported it in `state.md:75-81` and `handoff.md:180-186`. I verified independently: no module imports `getDefaultOrganizationId` from `documentQuery.js` (the sole importer of any copy is `clinicalQuery.ts:13`, and it takes it from `pricelistQuery.js`); every other mention in the tree is a comment. Builder also **refutes** the dossier's claim that this copy returns a hardcoded UUID — correct: `documentQuery.ts:81-84` is `SELECT ... FROM organizations LIMIT 1`. Not removed, per instructions. |
| 22 | A legally issued medical document can be created with NO signer at all | **CONFIRMED** | See §3. This is the one real hole, and the builder disclosed it. |
| 23 | The "unit" test is really a DB integration test in disguise | **CONFIRMED** | See §4 nit 2. |
| 24 | Smoke `smoke:document-lifecycle` contradicts the fix | **UNTESTABLE (declined by design)** | Closing it requires `npm run build -w @dental/api`, which rewrites tracked `apps/api/dist/**` files that are already dirty and that concurrent agents are using. A read-only reviewer must not cause that side effect. The builder's disclosure that dist is stale is independently corroborated: `dist/db/documentQuery.js:139` still reads `issuedByUserId: "doctor"`. |

---

## 2. WHAT THE CHANGE ACTUALLY DOES (read at HEAD, not from the diff)

`documentQuery.ts` gains `signerUserIdForColumn(value: string | null, column)` at :179, which
returns `null` unchanged and otherwise runs `z.string().uuid()`, throwing a named error that
quotes the column and the rejected value. Both write functions now call it on the way in
(`:215`, `:273`) and interpolate the validated result (`:231`, `:287`).

The load-bearing part is not the guard — it is the removal of `= {}`:

```ts
// before
options: { issuedAt?: string; ... } = {}
// after
options: { issuedByUserId: string | null; issuedAt?: string; ... }
```

Dropping the default makes `issuedByUserId` a required, explicitly typed field, so the compiler
now forces every caller to make a deliberate choice. That is precisely what brief item 4 ordered,
and it is why `TYPECHECK_EXIT=0` is meaningful here rather than decorative: it proves no caller
was left behind. Both routes pass `getRequestIdentity(request).userId`.

Reachability, traced and then driven, not assumed:
`server.ts:359` -> `routes/documents.ts:1031` -> `registerIssue` -> `routes/documents/issue.ts:55`
(`POST /api/documents/:id/issue`) -> `issue.ts:181`. Parallel void chain `void.ts:59` -> `:123`.

---

## 3. THE ONE REAL HOLE — CONFIRMED LIVE, CORRECTLY DEFERRED

The builder listed as NOT PROVEN: *"Live-route behaviour when x-dente-staff-token is absent
(expected: null written, no throw) is covered by unit test but not by a real HTTP call."*
I closed it myself, using the builder's own stated closing procedure (probe with the staff-token
header deleted):

```
CREATE (no staff token): 201 790ba951-1b39-46e8-a1de-cf0845239de5
ISSUE  (no staff token): 200
  issuedByUserId in RESPONSE: null
```
```
NO-STAFF-TOKEN DB ROW: [{"id":"790ba951-1b39-46e8-a1de-cf0845239de5","status":"issued",
                         "issued_by_user_id":null,"voided_by_user_id":null}]
```

The designed behaviour works exactly as the builder described: null passes, no throw, honest
record. **But it also confirms a live product hole.** `requireClinicalMutationAccess`
(`accessGuard.ts:26-54`) checks a server-wide `x-dente-admin-secret` and never looks at staff
identity; `requireOrganizationId` accepts a clinic token alone. Worse, on this deployment my
probe passed with **no admin secret header at all**, which means `configuredClinicalMutationSecret()`
is unset and `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1` — so the branch at `accessGuard.ts:33`
returns `true` unguarded.

Net effect: **a legally issued medical document can be created over HTTP, holding only a clinic
token, with no attributable human signer.** Row `790ba951` is that document and it is in the
database now.

This is not a builder defect. Brief item 4 explicitly authorised modelling an absent signer as
null, and the builder flagged the policy question in the commit body
(*"Отдельный вопрос — обязать ли выдачу документа входом сотрудника (401 вместо null) — оставлен
следующему пакету"*). It is the correct scope call. But the lead should know it is now **confirmed
live, not theoretical**, and it is the obvious next packet: require staff identity on issue/void
(401), and decide whether `issued_by_user_id` should become `NOT NULL` (P2 owns schema.ts).

---

## 4. NITS

1. **Packet metadata wrong** (§0). Named commit contains only the test; the fix is in the parent.
2. **"UNIT VERIFIED" is partly an integration test.** The first three cases are pure — the guard
   throws before any query. The fourth, `null проходит guard и не считается ошибкой`, actually
   opens a Postgres connection: that case takes 29ms and the file takes 10.5s wall clock. With the
   DB down it fails or hangs. Labelling it UNIT without disclosing the DB dependency overstates its
   portability. It passes; it is just not the kind of test the label implies.
3. **The null test proves less than the commit body implies.** It asserts the function returns
   `null` for a **nonexistent** document, which is the not-found path, not the write path. It never
   proves a null signer is persisted. I proved persistence separately (§3). The regression lock on
   `"doctor"` is genuinely tight; the null half is thin.
4. **Russian error text in a thrown backend Error** (`documentQuery.ts:184-188`). Consistent with
   existing convention (`identity.ts:137`, `accessGuard.ts:36` all send Russian), and it is
   swallowed by the 5xx sanitiser before reaching a client, so no new i18n debt is declared. Noted
   only for completeness.
5. **Pre-existing, untouched, out of scope:** `sampleData.ts:168` hardcodes
   `doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1"` and assigns it at `:11959/:12024/:12104`
   (mirrored in `sampleData_opt.ts`). That is the "hardcoded in sampleData for now" the deleted
   comment referred to. Not this packet's job; worth a future packet.
6. **Dead imports, pre-existing:** `taxXml.ts`, `pdf.ts`, `html.ts`, `auditFacts.ts`,
   `documents.ts` all import `issueGeneratedDocumentInDb`/`voidGeneratedDocumentInDb` and never
   call them. Not the builder's doing; a cleanup candidate.

---

## 5. GIT HYGIENE — CLEAN

`git show --name-only --format="" 5136239e6`:
```
apps/api/src/db/documentQuery.ts
apps/api/src/routes/documents/issue.ts
apps/api/src/routes/documents/void.ts
```
`git show --name-only --format="" 3ad6d4614`:
```
apps/api/src/db/documentQuery.test.ts
```

Exactly the claimed files, nothing else. **Zero churn swept in** — and this matters, because the
worktree is filthy: `apps/api/.data/dental-crm-state.json`, `apps/api/.data/speech-key-health.json`,
~45 modified `apps/api/dist/**.js`, `apps/api/src/server.ts`, `apps/web/src/MarketingView.tsx` and
`apps/api/src/scripts/seedOpsScreenshotDemo.ts` are all dirty from other agents. None of it was
committed. `git add` was per-file, as §8b demands.

Another agent's commit `0baa1f723` interleaved between the two — the builder noticed and recorded
it in `state.md:73`.

Conventional Commits: both compliant, both scoped `(документы)`, both name the DEFECT rather than
"improve"/"update"/"cleanup". The `fix:` body explains WHY at length (§12 satisfied) and correctly
states the severity upgrade — this was a total outage of document issuance, not a cosmetic wrong
name. Russian intact, no mojibake.

---

## 6. BOTTOM LINE

The defect was real, was worse than the brief said (a second instance at `:236` the brief never
mentioned, and a hard 22P02 outage rather than a cosmetic wrong signer), the path is genuinely
live, the fix is threaded through the existing auth machinery with no parallel accessor and no
placeholder, the compiler is used as the enforcement mechanism rather than as decoration, and
**all seven proof claims reproduced verbatim under independent re-run**. The builder's NOT-PROVEN
list was honest — I closed its biggest item and the result matched the builder's stated
expectation exactly.

**SOUND_WITH_NITS.** No rework required for this packet. Required follow-up belongs to the next
one: require staff identity on document issue/void, and decide the `NOT NULL` question with P2.
