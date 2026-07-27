# C1-dicom-wrong-study — state

STATUS: DEFECT CONFIRMED
Agent: implementer under [ARCHON]
Started: 2026-07-28

## Claim
- apps/api/src/routes/dicomweb.ts (+ apps/api/src/routes/dicomweb.test.ts — pre-existing, extend it)
- Compile gate: npm run typecheck -w @dental/api

## HEAD when planned
bb74658dc371807f44eaaa592c868bf8bbee7e13 (moves — re-read before commit)

## Claimed files clean?
YES. `git status --porcelain -- apps/api/src/routes/dicomweb.ts apps/api/src/routes/imaging.ts` = empty.
(apps/api/dist/routes/dicomweb.js IS dirty, but dist/ is build output, not my claim.)

## AUTHORITY READ
- .agents/AGENTS.md (12 mandates) — full
- .agents/INDEX.md — full
- .agents/ARCHITECTURE.md — full

## DEFECT CONFIRMED — dossier §5.6 accurate
apps/api/src/routes/dicomweb.ts, whole file is 32 lines. ONE route registered:
  GET /api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid
Line 7 comment: "Simple WADO-URI mock for local development and demonstration"
Line 13: fallbackPath = path.resolve(process.cwd(), "../../.data/dicom/test.dcm")
Line 11: destructures instanceUid but uses it ONLY in the error log string.
=> studyUid, seriesUid, instanceUid are ALL ignored. Every UID on earth returns the same
   121356-byte file at <repo>/.data/dicom/test.dcm with Content-Type: application/dicom.
No QIDO-RS routes. No /metadata. No /frames. No bulkdata. Only that one instance resource.
Path shape is WADO-RS; payload is WADO-URI (raw application/dicom, not multipart/related).

## TENANT GATING: NONE
No preHandler, no requireOrganizationId, no requireClinicalReadAccess, no token check at all.
Contrast imaging.ts:6506+ which calls requireClinicalReadAccess() + requireOrganizationId()
on every study route. dicomweb.ts is an unauthenticated parallel owner of medical pixel data.

## REAL STORAGE EXISTS (so option (a) is on the table)
db/schema.ts:721 imagingStudies  {organizationId, patientId, dicomStudyUid, storagePath}
db/schema.ts:791 imagingSeries   {organizationId, studyId, dicomSeriesUid}
db/schema.ts:808 imagingInstances{organizationId, seriesId, dicomSopInstanceUid, storagePath NOT NULL}
=> a full study/series/instance triple keyed exactly like the route params.
STILL TO VERIFY: is imagingInstances ever WRITTEN, and does it have rows in the live DB.

## CALLER (execution chain)
apps/web/src/ImagingView.tsx:510
  imageIds={[`wadouri:http://localhost:3000/api/dicomweb/studies/${selectedImagingStudy?.dicomStudyUid}/series/1/instances/1`]}
Series and instance are the LITERAL strings "1"/"1". Host hardcoded to :3000 (API is :4100).
NOT my claim — report as a separate defect.

## NEXT SLOW COMMAND
about to run: psql row counts for imaging_instances / imaging_series, and curl against :4100
