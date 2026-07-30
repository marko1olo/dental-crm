# X6-auth-idiom-converge — state

STATUS: AUTHORITY READ
HEAD at start: 2cf36a1e7a2decc3323b92ed721a969382eaabdf
Claimed files at start: BOTH CLEAN (`git status --porcelain` empty for patients.ts, accessGuard.ts, security/identity.ts)

## Authority read complete
.agents/AGENTS.md (full), .agents/INDEX.md (full), .agents/CLINICAL_RULES.md (full),
apps/api/src/routes/patients.ts (full, 315 lines), apps/api/src/accessGuard.ts (full, 197 lines),
apps/api/src/security/identity.ts (full, 275 lines), security/authSecret.ts (full),
utils/cryptoHelper.ts (full), db/patientArchiveReasonsAndBlacklistsQuery.ts (full),
tests/security/unverifiedOrganizationMutation.test.ts (full, the U1 test).

## VERDICT ON THE PACKET QUESTION (preliminary, pre-proof)
The shared helper is **NOT** as strong as the hand-rolled one. => DO NOT CONVERGE.
Weakness at `security/identity.ts:112-115` (`unverifiedOrganizationUsable`):
    if (!isStateChangingRequest(request)) return true;
For GET/HEAD/OPTIONS an UNVERIFIED, caller-chosen `x-organization-id` is accepted even on a
listening network server, whenever DENTE_DEV_ALLOW_HEADER_ORG=1. U1 closed only the MUTATION half.
`patients.ts` has 3 GET handlers and they are the crown-jewel PII reads (full patient list,
communication timelines, blacklist). Converging them onto `requireOrganizationId` would open a
cross-tenant PII read. Preserving the stricter hand-rolled code is the correct outcome (packet §3).

Second, independent reason not to converge: `requireClinicalMutationAccess` is an **admin-secret**
gate (`x-dente-admin-secret`), not a tenant gate. Wiring it into POST/PUT /api/patients would make
ordinary patient creation demand the clinic admin secret => 403 for the receptionist.

## SEPARATE, REAL, IN-CLAIM DEFECT FOUND while reading (reachable from patients.ts)
`GET /api/patients/:patientId/archive-status` (patients.ts:279-290) leaks the WHOLE clinic's
blacklist into every patient's card. `db/patientArchiveReasonsAndBlacklistsQuery.ts:7` names the
parameter `_patientId` and never uses it. Identical defect class to the one this same file already
documents as fixed for communication-timelines at patients.ts:264-266.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [ ] DEFECT CONFIRMED / ABSENT
- [ ] EDIT WRITTEN
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE
