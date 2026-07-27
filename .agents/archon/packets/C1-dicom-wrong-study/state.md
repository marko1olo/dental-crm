# C1-dicom-wrong-study — state

STATUS: DONE
Agent: implementer under [ARCHON]
Date: 2026-07-28

## Timeline
STARTED -> AUTHORITY READ -> DEFECT CONFIRMED -> EDIT WRITTEN -> GATE PASSED ->
COMMITTED f70a47ff215f180de9ba5e327e566a01e81dc5f4 -> PROVEN ->
COMMITTED 370fd2933df8536d54af209c16f04dbe32fd950e (tests) -> DONE

## Claim
- apps/api/src/routes/dicomweb.ts
- apps/api/src/routes/dicomweb.test.ts (pre-existing, extended)
- Compile gate: npm run typecheck -w @dental/api

## HEAD
Planned at bb74658dc371807f44eaaa592c868bf8bbee7e13.
Final HEAD 370fd2933df8536d54af209c16f04dbe32fd950e.
Foreign commits landed between mine: 2f18e4406, e71445757. Branch is shared.

## Claimed files clean before edit?
YES. `git status --porcelain -- apps/api/src/routes/dicomweb.ts apps/api/src/routes/imaging.ts` = empty.
(apps/api/dist/routes/dicomweb.js IS dirty, but dist/ is build output, not my claim.)
Index was EMPTY before both `git add`s — no foreign files swept in. Verified with
`git diff --cached --name-only` before staging and after, both times.

## AUTHORITY READ
- .agents/AGENTS.md (12 mandates) — full
- .agents/INDEX.md — full
- .agents/ARCHITECTURE.md — full

## DEFECT CONFIRMED — dossier §5.6 accurate
apps/api/src/routes/dicomweb.ts, whole file was 32 lines. ONE route registered:
  GET /api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid
Line 7 comment: "Simple WADO-URI mock for local development and demonstration"
Line 13: fallbackPath = path.resolve(process.cwd(), "../../.data/dicom/test.dcm")
Line 11: destructured instanceUid but used it ONLY in the error log string.
=> studyUid, seriesUid, instanceUid were ALL ignored. Every UID on earth returned the same
   121356-byte file at <repo>/.data/dicom/test.dcm with Content-Type: application/dicom.
No QIDO-RS routes. No /metadata. No /frames. No bulkdata. Only that one instance resource.
Path shape is WADO-RS; payload is WADO-URI (raw application/dicom, not multipart/related).

## TENANT GATING BEFORE: NONE
No preHandler, no requireOrganizationId, no requireClinicalReadAccess, no token check at all.
Contrast imaging.ts:6506/6519/6537/6693 — both gates on every study route.
AFTER: requireClinicalReadAccess + requireOrganizationId, and every SQL predicate carries
organizationId (on all three join levels).

## REAL STORAGE — measured against live PostgreSQL 18 (127.0.0.1:5432/dental_crm)
db/schema.ts:721 imagingStudies  {organizationId, patientId, dicomStudyUid, storagePath}
db/schema.ts:791 imagingSeries   {organizationId, studyId, dicomSeriesUid}
db/schema.ts:808 imagingInstances{organizationId, seriesId, dicomSopInstanceUid, storagePath NOT NULL}
LIVE ROW COUNTS: imaging_studies=1, imaging_series=0, imaging_instances=0, organizations=2
The one study row has dicom_study_uid=NULL and storage_path=NULL.
NOTHING WRITES imaging_series / imaging_instances: the only writer, apps/api/src/scripts/
ingestDicom.ts, never executes its inserts — it calls .toSQL() and console.log()s them
(lines 35-72; lines 52/63 use randomUUID() marked "// mock"; line 83 claims "Postgres is
offline", it is online). That script is itself a mock.

## CALLER (execution chain)
apps/web/src/ImagingView.tsx:510
  imageIds={[`wadouri:http://localhost:3000/api/dicomweb/studies/${...dicomStudyUid}/series/1/instances/1`]}
Series and instance are the LITERAL strings "1"/"1". Host hardcoded to :3000.
netstat: nothing LISTENS on :3000 (only 4100 API and 5173 web). Viewer call chain is DEAD.
No clinic token is attached either. NOT my claim — reported as separate debt.

## PROOFS RUN
- npm run typecheck -w @dental/api -> exit 0, twice
- node --import tsx --test src/routes/dicomweb.test.ts -> 9/9 pass, twice
- live HTTP against 127.0.0.1:4100, 7 probes, real signed clinic token
- direct SQL against 127.0.0.1:5432
Full detail with quoted output: handoff.md

## FILES LEFT ON DISK
.agents/archon/packets/C1-dicom-wrong-study/{state.md, commitmsg.txt, commitmsg2.txt, handoff.md}
