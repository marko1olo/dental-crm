# R4-dicom-tenant-leak — ADVERSARIAL REVIEW (FINAL)

Reviewer: adversarial subagent, reporting to ARCHON. Read-only on repo source; nothing edited,
staged, committed or reverted. Scratch artefacts live under
`C:\Users\Admin\.claude\projects\c--hades\work-memory\`.

Commit under attack: `1635a606fd47cf4e330b8eae66fa5f2b4394e636`
Follow-up docs commit: `842158bf01d2886bdfc76163d9ba8a75fe6777ff`
Review run at repo HEAD `842158bf0`.

**VERDICT: SOUND_WITH_NITS.** The defect was real, the fix is real, the fix is reachable, and every
central proof reproduced on my own run — including a differential I ran against the real PostgreSQL
`organizations` table that is strictly stronger than what the builder claimed. Four minor findings,
none of them blocking, two of them already self-declared as debt by the builder.

---

## 1. Commit shape — CLEAN

`git show 1635a606f --numstat`:
```
51	0	.agents/archon/packets/R4-dicom-tenant-leak/commitmsg.txt
49	0	.agents/archon/packets/R4-dicom-tenant-leak/state.md
273	24	apps/api/src/routes/dicomweb.test.ts
116	14	apps/api/src/routes/dicomweb.ts
```
4 files, 489 insertions / 38 deletions. No `apps/api/dist/**`, no `.data/*.json`, no tsbuildinfo, no
scratch, no other author's work. `git diff --cached --name-only` is empty now.
Conventional Commits with a Russian subject naming the defect:
`[ARCHON] fix(снимки): образец DICOM уходил чужой и несуществующей организации`. Body explains WHY at
length, quotes the pre-fix code, and states where the weakness really lives.
Packet header listed `commitmsg2.txt` + `handoff.md`; those are in the later docs commit `842158bf0`.

## 2. Was the defect real? — CONFIRMED

`git show 1635a606f^:apps/api/src/routes/dicomweb.ts`, sample branch:
```
  const samplePath = sampleDicomPath();
  if (await fileCarriesRequestedUids(samplePath, studyUid, seriesUid, instanceUid)) {
    return samplePath;
  }
```
`organizationId` appears nowhere in it, and the handler had no organization-existence check.
`git grep -c -E "OrganizationNotFound|organizationExists|OrganizationUnknown|UnknownOrganization"
d4029c032 -- apps/` → exit 1, zero hits: before this packet **nothing anywhere in apps/ verified that
an organization id resolves to a real organization.** The builder's diagnosis is exact.

## 3. Proof audit — every claimed command re-run by me

| Claim | Command | My result | Verdict |
|---|---|---|---|
| UNIT 17/17 | `cd apps/api && node --import tsx --test src/routes/dicomweb.test.ts` | `tests 17 / pass 17 / fail 0`, EXIT=0 | REPRODUCED |
| TYPECHECK 0 | `npm run typecheck -w @dental/api` | banner only, `TYPECHECK_EXIT=0` | REPRODUCED |
| Live probes A/B/G/H/I/C | `node .../work-memory/r4-dicom-tenant-probe.mjs` from `apps/api` | `A no token 401 AuthRequired`; `B org A 404 DicomInstanceNotFound`; `G org B (d0000000) 404 DicomInstanceNotFound`; `H nil uuid 403 OrganizationUnknown`; `I malformed 403 OrganizationUnknown`; `C invented UIDs 404` | REPRODUCED verbatim, byte counts included |
| DB state | that script's read-only `pg.Client` | 2 orgs (`4a3420d1… Стоматология, 1 кабинет`, `d0000000… Демо-клиника для снимков`), 0 rows for the nil uuid, single `imaging_studies` row `uid=null path=null` | REPRODUCED |
| ENCODING clean | builder's `r4-encoding-scan.cjs` **and** my own independent scanner over all 6 files | `broken=0 bom=false U+FFFD=0` everywhere; Russian renders intact in source, commitmsg, handoff and `git log -1 --format=%s` | REPRODUCED |
| 9 → 17 tests, all C1 tests kept | `rg -o '^test\("([^"]+)"' -r '$1'` on both revisions | all 9 C1 test names present at HEAD (one renamed `образец отдаётся только под своими собственными UID` → `…организации-владельцу под её собственными UID`), 8 new | REPRODUCED |
| Reachability `server.ts:43` / `:418` | `rg -n registerDicomwebRoutes apps/api/src/server.ts` | `43: import …` / `418: await registerDicomwebRoutes(app)` | REPRODUCED |
| Chain of custody, PID 30836 | `Get-NetTCPConnection -LocalPort 4100` + `Get-CimInstance Win32_Process` | PID is now **18992**, START `28 Jul 2026 4:02:15`, cmd `node --require …tsx/preflight.cjs --import …tsx/loader.mjs src/server.ts`, no `--watch` | STALE but substance holds. Builder's process is gone (restarted again by a neighbour). I re-established custody the same behavioural way: the process answers `OrganizationUnknown`, a string with zero hits at `d4029c032`, so it executes post-fix src |
| SUITE 911 / 910 / 1 fail | `npm test -w @dental/api` | **`tests 918 / pass 918 / fail 0`, EXIT=0**; `dayConfirmations.test.ts` alone → `tests 11 / pass 11 / fail 0` | NOT REPRODUCIBLE — and in the builder's favour. Count grew because neighbours landed test commits after `1635a606f`; the one failure they reported was a day-boundary flake that no longer fires. Nothing to hold against them, but the number in the report is not today's number |
| Negative control 12 pass / 5 fail | needs the pre-fix file written into `apps/api/src/routes/` — impossible under my read-only constraint | consistency checks instead: HEAD `dicomweb.test.ts:216` IS `assert.strictEqual(response.statusCode, 404)` inside the "вторая клиника" test, exactly where the builder quoted `200 !== 404`; the 5 tests that must fail pre-fix are identifiable line-by-line and are exactly the 5 they named | CONSISTENT, not re-executed. Stated as such, not as proof |

## 4. I proved MORE than the builder — real-Postgres differential

The builder honestly labelled "live 200 to the owning organization" NOT PROVEN, because the shared
server has no `DENTE_DICOM_SAMPLE_ORGANIZATION_ID` and they refused to restart it. That means their
live probes cannot distinguish "the tenant gate works" from "the sample branch is off for everybody" —
both give 404. So I closed it myself without touching the server: the real route, the real
`organizations` table, `app.inject()`, SELECTs only, no listen, no writes. Script:
`C:\Users\Admin\.claude\projects\c--hades\work-memory\r4-review-inject-differential.mts`

```
=== OWNER SET to ORG_A (real Postgres organizations lookup) ===
1 owner org A, true sample UIDs           200 application/dicom  bytes=121356 magic@128="DICM"
2 neighbour org B (real row, not owner)   404 application/json   bytes=389 error=DicomInstanceNotFound
3 nonexistent org (nil uuid)              403 application/json   bytes=141 error=OrganizationUnknown
4 malformed org id                        403 application/json   bytes=141 error=OrganizationUnknown
5 owner org A, invented UIDs              404 application/json   bytes=260 error=DicomInstanceNotFound
6 no token at all                         401 application/json   bytes=128 error=AuthRequired
7 owner UUID UPPERCASED in token          404 application/json   bytes=389 error=DicomInstanceNotFound
8 owner org A + trailing space in token   403 application/json   bytes=141 error=OrganizationUnknown
=== OWNER SET to ORG_B ===
9  org A now denied                       404 DicomInstanceNotFound
10 org B now served                       200 application/dicom  bytes=121356 magic@128="DICM"
=== OWNER SET to nil uuid ===
11 nil-uuid token, nil-uuid owner         403 OrganizationUnknown
=== OWNER UNSET (state of apps/api/.env today) ===
12 org A, no owner configured             404 DicomInstanceNotFound
=== CLINICAL READ GATE ARMED (admin secret set) ===
13 owner, no admin header                 403 ClinicalReadSecretRequired
14 owner, wrong admin header              403 ClinicalReadSecretRequired
15 owner, correct admin header            200 application/dicom  bytes=121356 magic@128="DICM"
16 NEIGHBOUR, correct admin header        404 DicomInstanceNotFound
```

What this settles that neither the unit tests nor the live probes could:
- The cross-tenant differential is real against a **real** `organizations` row: org B exists, is
  looked up successfully, and still gets 404 while the owner gets 121356 bytes of DICOM. This is the
  claim the reviewer's probe G broke, and it now holds on real data.
- Probes 9/10 flip when the env var flips. The owner check is not a hardcoded constant and not a
  no-op — it is the configured value.
- Probe 3 returns **403** while probes 1/2 pass the gate, against the live database. That can only
  happen if `where(eq(organizations.id, organizationId))` genuinely filters on the requested id. This
  independently closes the one real weakness in the unit tests (F2 below).
- Probe 16 is a test the builder never wrote: a valid admin secret does **not** bypass the tenant
  gate. No privilege escalation through the clinical-read guard.
- Probe 11: with the nil UUID configured as owner, the existence gate still fires first (403). Defence
  in depth is ordered correctly.
- Probe 12 confirms the fail-closed default that `apps/api/.env` actually has today.

## 5. Reachability — verified independently, builder's claim holds

`apps/api/src/server.ts:43` imports and `:418` calls `registerDicomwebRoutes`; route registered at
`dicomweb.ts:286`; the organization gate is `dicomweb.ts:292-320` and runs on every request — my own
live 403 `OrganizationUnknown` out of PID 18992 proves it executes, not merely exists.

Bypass I checked and the builder did not: `x-organization-id` header spoofing.
`DENTE_DEV_ALLOW_HEADER_ORG` is absent from both `.env` and `apps/api/.env`, and
`curl -H "x-organization-id: 4a3420d1-…"` with no token against 4100 returns **401 AuthRequired**.
Not bypassable today. Standing hazard for whoever writes the shared-guard packet: if that flag is ever
set, `security/identity.ts:107-113` lets an unauthenticated caller name any organization and this
route's owner comparison falls with it.

In-app consumer still dead, as declared: `apps/web/src/ImagingView.tsx:510` builds
`wadouri:http://localhost:3000/api/dicomweb/...`; only 4100 and 5173 listen. `rg "api/dicomweb/studies"`
finds only the route, its test, and that one dead line. Correctly scoped out as reviewer finding F10.

## 6. Findings

### F1 — LOW / PRE-EXISTING, NOT THIS BUILDER'S DOING: the tracked `dist` build still contains the fully unguarded route
`apps/api/dist/routes/dicomweb.js` is tracked in git (last committed `4ad7b10ec chore: sync 328 files`,
26 Jul — before both C1 and R4) and is the **pre-C1** route in full: 26 lines, no
`requireClinicalReadAccess`, no `requireOrganizationId`, no UID verification, no organization check. It
stats `.data/dicom/test.dcm` and streams it as `application/dicom` to anyone. `dist/server.js:385`
registers it. `apps/api` declares `"start": "node dist/server.js"`.
Severity is LOW, not MEDIUM, because `apps/api/Dockerfile:30` runs
`npx turbo run build --filter=@dental/api` before `CMD ["node","dist/server.js"]`, so a container
rebuilds `dist` from `src` and does get both fixes. The stale artefact only bites a bare local
`npm start`. Correctly excluded from this commit; 30+ `dist` files are dirty in the worktree right now.
Next-packet material (whole tracked-`dist` tree), not R4 rework.

### F2 — LOW: the `db.select` stub is predicate-blind, so the unit tests alone cannot prove tenant filtering
`dicomweb.test.ts:116` — `node.where = () => node`. Rows are selected by the `.from()` table only. An
`organizationExists` that queried `organizations` with **no** `where`, or with a hardcoded id, would
pass all 17 tests. The move off the positional queue onto table-keyed lookup is a genuine improvement
and the builder's reasoning for it is correct; the gap is that the file's most important implicit claim
("*this* organization was looked up") is never asserted. Empirically closed by my probe 3 and the live
probe H — i.e. by HTTP evidence, not by the suite. Cheap fix: capture the `where` argument, or assert
`dbCalls.calls === 1` on the nonexistent-org test.

### F3 — LOW: the sample-owner comparison is case-sensitive while the database is not
`dicomweb.ts:274` — `sampleOwnerOrganizationId === organizationId` is a JS string compare, but
`organizations.id` is a `uuid` column, so PostgreSQL considers `4A3420D1-…` and `4a3420d1-…` the same
organization. My probe 7 confirms the consequence: an uppercase-UUID token passes the existence gate
(the DB agrees it is the owner) and then gets 404 on its own sample. Fails closed, so not a security
hole, but the route now holds two different definitions of "same organization" — case-insensitive for
the `imaging_studies` / `imaging_instances` branches, case-sensitive for the sample branch. One
`.toLowerCase()` on both sides.

### F4 — INFORMATIONAL: the fix introduces an organization-existence oracle
The file argues at length that cross-tenant answers must be indistinguishable from invented-UID answers
(both 404) so neighbours cannot be enumerated. The new gate then answers 403 `OrganizationUnknown` vs
404 `DicomInstanceNotFound`, which distinguishes "this org exists" from "this org exists but has no such
study". Exploiting it requires minting tokens for arbitrary org ids, i.e. `AUTH_TOKEN_SECRET`, at which
point everything is already lost — so this is a note for the next reader, not a defect. Worth one
sentence in the comment, because as written the two paragraphs read as contradicting each other.

### Already self-declared by the builder — not held against them
- New env var `DENTE_DICOM_SAMPLE_ORGANIZATION_ID` documented nowhere outside the source (no
  `.env.example` exists in this repo at all): handoff debt item 6, with the value to set.
- One extra `organizations` SELECT per instance request, uncached, on a route whose own comment says a
  CBCT study is "сотни объектов": handoff debt item 4, with the reason a cache was refused.
- Two new hardcoded Russian error strings with no server-side i18n dictionary: handoff debt item 5,
  explicitly added to the i18n debt rather than hidden.
- Branch 1 still streams `path.resolve(instanceRow.storagePath)` with no storage-root restriction
  (`dicomweb.ts:248`; `DENTE_IMAGING_STORAGE_ROOT` exists nowhere in the repo): handoff debt item 2,
  correctly attributed to C1's reviewer F4 and left out of scope.
- The shared-guard weakness stays in `security/identity.ts:132-142`, closed only locally as the brief
  demanded. Verified: `organizationExists` / `OrganizationUnknown` appear at HEAD **only** in
  `dicomweb.ts` (4 hits, none elsewhere in `apps/api/src`). Handoff debt item 1.
- Packet-claim path correction (`src/tests/**` vs the real `src/routes/`): stated in the handoff.

### Non-findings I hunted for and did not find
- HOLLOW FACADE: no. Probes 9/10 flip with the env var, 13/14/15 flip with the secret. No
  `{success:true}` over a no-op, no placeholder, no fabricated 0/default. `SAMPLE_BYTES=121356` and the
  three UIDs are facts read out of the file on disk (asserted at test load, `dicomweb.test.ts:70-74`);
  `UUID_SHAPE` is a shape check, not a magic constant.
- REAL-DATA TRAP (the cycle-2 panorama shape): no. I exercised the route against live PostgreSQL, not
  a fixture, and the owner path returns 121356 real bytes with `DICM` at offset 128.
- SECOND OWNER: no. The only other mention of a default-organization concept is `xray.ts:63`, a comment
  documenting a `DEFAULT_ORGANIZATION_ID` fallback a previous packet already removed.
- C1 REGRESSION: no. `/studies/1/series/1/instances/1` still 404 live and in test; wrong-series and
  wrong-instance tests retained and passing.
- FILE HANDLES / LISTENERS: `readDicomIdentity` closes its handle in `finally`; nothing new is opened.
- Deleted file with live references / `useAppLogic` return-field surgery / hardcoded hex / static px:
  not applicable, API-only diff.
- MOJIBAKE: none, in source, tests, commit subject, commitmsg, commitmsg2, state.md or handoff.md.
- SMOKE COLLATERAL: the only dicomweb-named smoke script
  (`scripts/smoke-dicomweb-connector-boundary.mjs`) hits `/api/imaging/dicomweb/check`, a different
  route. Full suite is green at HEAD (918/918).
- TEST GLOB: `apps/api` test script is `node --import tsx --test "src/**/*.test.ts"`, so the new tests
  really do run in CI.
- The broad `catch` around `organizationExists` would turn a programming error into a 503 "try later"
  rather than a 500 — but it logs `err` at `error` level, so the bug stays visible. Acceptable.

## 7. Required rework
None blocking. F2 and F3 are worth folding into whatever packet next touches this file; F1 belongs to a
tracked-`dist` packet; F4 is a comment.
