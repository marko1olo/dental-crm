# S1-speech-unauthenticated — state

STATUS: DEFECT CONFIRMED (but the dossier's description of it is WRONG)
HEAD when read: 40dd853fcda4058c198048629a779e24f797c662

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md,
apps/api/src/routes/speech.ts (284 lines, full), apps/api/src/accessGuard.ts (196, full),
apps/api/src/security/identity.ts (175, full), apps/api/src/security/authSecret.ts (125, full).

## Collision check
apps/api/src/routes/speech.ts — CLEAN, mine to edit.
apps/api/src/server.ts — ' M' dirty, NOT mine, NOT touched, NOT staged. Reported, not reverted.

## DOSSIER CORRECTION (packet text is wrong on the mechanism)
Packet claimed: transcribe-chunk "has no guard whatsoever ... no requireClinicalMutationAccess",
and "speech.ts imports both at :37 while only ever using the read one".
BOTH FALSE at HEAD. speech.ts:229 DOES call requireClinicalMutationAccess; :261 calls it too.
The lead read the REGISTRATION line (:282) and not the HANDLER BODY (:228-258).
File untouched since 2026-07-04 (6eea83a56) — not a concurrent fleet fix.

## THE REAL DEFECT (two independent causes, both confirmed)
1. requireClinicalMutationAccess is a NO-OP in this environment. accessGuard.ts:31-33 —
   when clinicalAdminSecret() is null AND clinicalMutationsUnguardedAllowed() it `return true`
   for a request carrying ZERO credentials. Measured live env (booleans only, no values printed):
     DENTE_CLINICAL_ADMIN_SECRET configured        = false
     DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS==="1"= true
     NODE_ENV === production                       = false
   -> gate returns true unauthenticated. Explains the lead's 400 and the reviewer's 201.
2. TENANT-BLIND WRITE, true in EVERY configuration: the handler never resolves an
   organizationId. validateSpeechClinicalScope looks up patients (:123) and visits (:130) by raw
   UUID with NO organizationId predicate, and speech/storage.ts:404-425
   resolveSpeechChunkOrganizationId derives the stored chunk's tenant FROM the caller-supplied
   patientId/visitId. So the chunk is filed under whatever organization the attacker names.

## Fix chosen (inside claim, existing accessor, no new one invented)
requireClinicalMutationContext (accessGuard.ts:157) = mutation gate + requireVerifiedOrganizationId
(401 AuthRequired, identity.ts:132-142, no env escape hatch without a token). Same pattern as
patientRecall.ts:68, patientDuplicates.ts:100, imports.ts:352, migrationRuns.ts:203.
Then ENFORCE the resolved org on the patient/visit lookups so it is not dead code.
Compatibility: web callers all send x-dente-clinic-token (AppHelpers.tsx:4061-4068, :6059-6061).

## Log
- STARTED -> AUTHORITY READ -> DEFECT CONFIRMED. Next: write the edit in speech.ts.
