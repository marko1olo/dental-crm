# Progress - Worker M1 (Backend Contracts & Anti-Staleness)

Last visited: 2026-09-24T17:46:30Z
Current state: Reading Master Prompt and Survey reports.

## Checklist
- [ ] Read `C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md`
- [ ] Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, `survey_r1.md`, and Explorer `handoff.md`
- [ ] Inspect existing `packages/shared/src/`, `apps/api/src/services/patients/recallCandidates.ts`, `apps/api/src/routes/patientRecall.ts`, `apps/api/src/routes/pricelist.ts`, `apps/api/src/routes/settings.ts`
- [ ] Create/Update canonical schemas in `packages/shared/src/` (`recalls/` or contracts) and export from `packages/shared/src/index.ts`
- [ ] Refactor `apps/api/src/services/patients/recallCandidates.ts` to use `@dental/shared`
- [ ] Refactor `apps/api/src/routes/patientRecall.ts` to use `@dental/shared` Zod schemas
- [ ] Deduplicate 804n seeding between `pricelist.ts` and `settings.ts`
- [ ] Run isolated test (`npm test -- apps/api/src/money/patientDebt.test.ts` or recall test)
- [ ] Self-audit & write `handoff.md`
- [ ] Send message to parent
