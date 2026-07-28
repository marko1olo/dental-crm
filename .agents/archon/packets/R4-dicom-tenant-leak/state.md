# R4-dicom-tenant-leak — state

STATUS: DONE
Commit: 1635a606fd47cf4e330b8eae66fa5f2b4394e636
HEAD at start: d4029c0325184375242737931451bd1d97e9873e
HEAD at handoff: 370d2f10f405a3b5839c9994c083a9284481297a (a neighbour's telegram fix landed on top)

## Milestones
- STARTED — packet dir + state.md written before reading anything.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/ARCHITECTURE.md,
  .agents/archon/packets/C1-dicom-wrong-study/review.md — all complete.
- DEFECT CONFIRMED — at real lines, listed below.
- EDIT WRITTEN — apps/api/src/routes/dicomweb.ts, apps/api/src/routes/dicomweb.test.ts.
- GATE PASSED — npm run typecheck -w @dental/api => exit 0.
- COMMITTED 1635a606f — explicit pathspec, index was empty beforehand, only my 4 files in the commit.
- PROVEN — UNIT 17/17, negative control 12/17 against pre-fix code, API VERIFIED on 127.0.0.1:4100,
  DB VERIFIED on 127.0.0.1:5432, TYPECHECK exit 0, encoding clean.
- DONE — handoff.md written.

## Git state
`git status --porcelain` on my two source files after all experiments: CLEAN.
Nothing left staged by me. Neighbour's untracked `apps/api/src/tests/routes/patientRecall.test.ts`
never touched, never staged.

## CLAIM PATH CORRECTION (for the lead)
The packet claim names `apps/api/src/tests/**/dicomweb.test.ts`. **No such file exists.** The dicomweb
tests live at `apps/api/src/routes/dicomweb.test.ts` (C1 put them next to the route; `npm test -w
@dental/api` globs `src/**/*.test.ts`, so both locations run). The packet body itself says "plus the
existing dicomweb.test.ts". I extended that existing file rather than creating a second file with the
same basename in another directory.

## Defect confirmed — every line verified by reading
1. `apps/api/src/routes/dicomweb.ts:204-207` (pre-fix) — sample branch inside
   `resolveInstanceFilePath`; `organizationId` NOT referenced. CONFIRMED.
2. `apps/api/src/routes/dicomweb.ts:137-143` (pre-fix) — comment documenting the hole. CONFIRMED.
3. `apps/api/src/routes/dicomweb.test.ts:41-42` (pre-fix) — unguarded-reads flag + admin-secret delete.
   CONFIRMED.
4. `apps/api/src/accessGuard.ts:63` — `if (clinicalReadsUnguardedAllowed()) return true;`. CONFIRMED.
5. `apps/api/src/routes/dicomweb.ts:216` (pre-fix) — the advertised `requireClinicalReadAccess`.
   CONFIRMED.
6. **SHARED-GUARD WEAKNESS — reported, deliberately NOT fixed here:**
   `apps/api/src/security/identity.ts:132-142` `requireOrganizationId` returns the token's
   organizationId without ever querying `organizations`. Zero existence checks anywhere in apps/api
   before this packet. Affects every route => next packet, per brief.
7. `organizations.id` is `uuid` PK (`db/schema.ts:209-210`) => a non-UUID organizationId handed to the
   comparison would raise Postgres 22P02 (500). Local check validates UUID shape first.

## Proof summary (details and quoted output in handoff.md)
- UNIT: `cd apps/api && node --import tsx --test src/routes/dicomweb.test.ts` => tests 17 / pass 17 /
  fail 0, exit 0.
- NEGATIVE CONTROL: same tests against the pre-fix route => pass 12 / fail 5, exit 1. The cross-tenant
  test failed with `200 !== 404` — reviewer probe G reproduced as a test.
- API: live 127.0.0.1:4100. Probe G (org B) 200/121356 -> **404 DicomInstanceNotFound**. Probe H (nil
  uuid org) 200/121356 -> **403 OrganizationUnknown**. Unknown UID still 404. No token still 401.
- Chain of custody: PID 30836 started 28.07.2026 03:54:58 WITHOUT --watch, restarted by someone else
  after my commit. Proven to execute my code behaviourally: `OrganizationUnknown` has 0 occurrences at
  pre-fix commit d4029c032 and exists only at dicomweb.ts:317.
- DB: organizations = 2 real rows; 0 rows for the nil UUID; imaging_studies single row has
  dicom_study_uid = null.
- TYPECHECK: exit 0. FULL SUITE: 911 tests, 910 pass, 1 fail — `dayConfirmations.test.ts` day-boundary
  test, outside my claim, reproduces standalone, not caused by me.
- ENCODING: broken=0 bom=false U+FFFD=0 on all packet files.

## Files left on disk
`.agents/archon/packets/R4-dicom-tenant-leak/state.md`, `commitmsg.txt`, `commitmsg2.txt`, `handoff.md`.
Probe scripts live OUTSIDE the repo and store no secrets:
`C:\Users\Admin\.claude\projects\c--hades\work-memory\r4-dicom-tenant-probe.mjs`,
`C:\Users\Admin\.claude\projects\c--hades\work-memory\r4-encoding-scan.cjs`.
