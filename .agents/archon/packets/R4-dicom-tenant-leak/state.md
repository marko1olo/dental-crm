# R4-dicom-tenant-leak — state

STATUS: DEFECT CONFIRMED
HEAD at start: d4029c0325184375242737931451bd1d97e9873e

## Authority read (complete)
- .agents/AGENTS.md (163 lines)
- .agents/INDEX.md (29 lines)
- .agents/ARCHITECTURE.md (69 lines)
- .agents/archon/packets/C1-dicom-wrong-study/review.md (337 lines)

## Git state
`git status --porcelain` on claimed files: CLEAN.
Only untracked neighbour file in apps/api/src/tests/: `?? apps/api/src/tests/routes/patientRecall.test.ts`
(another agent's, NOT mine, NOT touched, NOT staged).

## CLAIM PATH CORRECTION (for the lead)
The packet claim names `apps/api/src/tests/**/dicomweb.test.ts`. **No such file exists.** The dicomweb
tests live at `apps/api/src/routes/dicomweb.test.ts` (C1 put them next to the route; `npm test -w
@dental/api` globs `src/**/*.test.ts`, so both locations run). The packet body itself says "plus the
existing dicomweb.test.ts". I extend that existing file rather than creating a second file with the same
basename in another directory.

## Defect confirmed — every line verified by reading
1. `apps/api/src/routes/dicomweb.ts:204-207` — sample branch inside `resolveInstanceFilePath`:
   `const samplePath = sampleDicomPath(); if (await fileCarriesRequestedUids(...)) return samplePath;`
   The `organizationId` parameter is NOT referenced in that branch. CONFIRMED.
2. `apps/api/src/routes/dicomweb.ts:137-143` — comment documenting the hole. CONFIRMED verbatim.
3. `apps/api/src/routes/dicomweb.test.ts:41` sets `DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1"`,
   `:42` `delete process.env.DENTE_CLINICAL_ADMIN_SECRET`. CONFIRMED.
4. `apps/api/src/accessGuard.ts:63` — `if (clinicalReadsUnguardedAllowed()) return true;` inside the
   `if (!adminSecret)` branch => guard is a no-op in all 9 existing tests. CONFIRMED.
5. `apps/api/src/routes/dicomweb.ts:216` — `requireClinicalReadAccess` is the advertised guard. CONFIRMED.
6. **SHARED-GUARD WEAKNESS (report, do NOT fix here):**
   `apps/api/src/security/identity.ts:132-142` `requireOrganizationId` returns
   `getRequestIdentity(request).organizationId` straight from the token signature and never queries
   `organizations`. There is NO organization-existence check anywhere in apps/api
   (`rg "OrganizationNotFound|organizationExists|OrganizationUnknown|UnknownOrganization" apps/api/src`
   = 0 hits). So the nonexistent-org weakness is NOT local to dicomweb.ts — it is in the shared guard and
   affects every route. Per packet instruction I fix it locally in dicomweb.ts and report the shared guard
   as the next packet.
7. `organizations.id` is `uuid` PK (`db/schema.ts:209-210`) => a token carrying a non-UUID
   organizationId would make Postgres raise 22P02 (500) if handed straight to a `uuid` comparison.
   The local check must validate UUID shape before the query.

## Log
- STARTED — packet dir created, state.md written before reading anything.
- AUTHORITY READ — 4 documents complete.
- DEFECT CONFIRMED — 7 findings above, all at real lines.
