# S1-speech-unauthenticated — state

STATUS: DONE
HEAD at start: 40dd853fcda4058c198048629a779e24f797c662
HEAD after my work: 46bed6dba2415d4ee1ea2a98c0168e19197e8561

## Timeline
STARTED -> AUTHORITY READ -> DEFECT CONFIRMED (dossier description wrong) -> EDIT WRITTEN ->
GATE PASSED -> COMMITTED 8f4d42fe3 -> PROVEN (unit 7/7, suite 925/925) -> COMMITTED 46bed6dba ->
CENSUS DONE (5 iterations) -> DONE

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md,
apps/api/src/routes/speech.ts (full), apps/api/src/accessGuard.ts (196, full),
apps/api/src/security/identity.ts (175, full), apps/api/src/security/authSecret.ts (125, full).

## Collision check
apps/api/src/routes/speech.ts — CLEAN at start, mine.
apps/api/src/server.ts — ' M' dirty, NOT mine, NOT touched, NOT staged, NOT reverted. Reported.

## DOSSIER CORRECTION
Packet claimed transcribe-chunk had "no guard whatsoever ... no requireClinicalMutationAccess" and
that speech.ts "only ever uses the read one". BOTH FALSE: speech.ts:229 called
requireClinicalMutationAccess; :261 too. The lead read the REGISTRATION line (:282), not the handler
body. File untouched since 2026-07-04 (6eea83a56) — not a concurrent fleet fix.

## THE REAL DEFECT (two independent causes, both confirmed)
1. accessGuard.ts:31-33 returns true for a credential-less request when DENTE_CLINICAL_ADMIN_SECRET
   is unset and DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1. Measured live (booleans only):
   secret configured=false, flag==="1"=true, NODE_ENV production=false. Explains 400 and 201.
2. Tenant-blind write, true in EVERY config: no organizationId was ever resolved; patient/visit were
   looked up by bare UUID, and speech/storage.ts:404-425 derives the stored chunk's organization FROM
   the client-supplied patientId/visitId.

## Fix
speech.ts only. requireClinicalMutationContext (accessGuard.ts:157) + organizationId enforced on the
patient/visit lookups. Reads pass organizationId: null explicitly so the remaining gap is visible.
accessGuard.ts and server.ts NOT touched.

## Proofs actually run
- node --import tsx --test apps/api/src/tests/routes/speechTranscribeChunkAccess.test.ts
  -> tests 7, pass 7, fail 0, skipped 0, exit 0
- npm run typecheck -w @dental/api -> exit 0
- npm test -w @dental/api -> tests 925, pass 925, fail 0, exit 0
- API VERIFIED unavailable: shared server runs without --watch. Exact closing curl is in handoff.md.

## Census (report only, nothing fixed)
183 mutating registrations across 63 route files; 177 gated; 6 without, all 6 read by hand:
4 public by design (portal OTP x2, publicBooking, lab portal token), 2 inert no-op stubs
(settings.ts:383/387). Conclusion: the speech asymmetry was UNIQUE — contradicts the packet's
hypothesis. Method and all five false-positive iterations documented in handoff.md.

## Re-verified after HEAD moved (S2 rewrote speech/storage.ts, my dependency)
At HEAD cb15cdec9, with S2's d6c1eed82 storage rewrite in the tree:
- my node:test -> 7/7 pass, 0 skipped, exit 0
- npm run typecheck -w @dental/api -> exit 0
- npm test -w @dental/api -> 931/931 pass, exit 0 (931 not 925: S2 added storageIdentity.test.ts)
- git grep confirms my guard present at apps/api/src/routes/speech.ts:266

## Deviation I am disclosing
My three commits lack the required '[ARCHON] ' subject prefix. NOT rewriting history: another
agent's commits (d6c1eed82, f11f64153) sit on top of mine, so any rebase/amend would rewrite THEIR
commits and change their hashes on the shared branch. Reported instead of risking that.

## Files left on disk
state.md, commitmsg.txt, commitmsg-test.txt, handoff.md — all in this packet dir.
