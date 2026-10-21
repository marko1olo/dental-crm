# Task Assignment: Milestone M_E2E (4-Tier E2E Test Suite & Verification)

## Working Directory
`C:/Clinic_MVP/dental-crm/.agents/test_writer_e2e`

## References to Read
1. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
2. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
3. `C:/Clinic_MVP/dental-crm/PROJECT.md`
4. `C:/Clinic_MVP/dental-crm/TEST_INFRA.md`

## Objectives
1. **4-Tier E2E Test Suite Creation & Verification**:
   - Verify requirement-driven test cases covering Features 1-10 across 4 tiers per `TEST_INFRA.md`:
     * Tier 1 (Feature Coverage): >= 50 tests (>=5 tests per feature)
     * Tier 2 (Boundary & Corner Cases): >= 50 tests (>=5 tests per feature)
     * Tier 3 (Cross-Feature Combinations): >= 10 pairwise test suites
     * Tier 4 (Real-World Clinical Application Scenarios): >= 5 realistic end-to-end clinical workflow test suites (Patient visit -> 043/u EMR -> electronic signature -> inventory deduction -> 54-FZ cashier receipt -> Sberbank acquiring / NDFL certificate; Concurrent booking conflict resolution; Annual tax deduction & doctor payroll).
2. **Execute Tests**:
   - Run the full test suite using Node.js test runner / TypeScript runners.
   - Ensure all tests pass 100% with exit code 0.
3. **Publish TEST_READY.md**:
   - Write `C:/Clinic_MVP/dental-crm/TEST_READY.md` containing the exact runner command, coverage matrix across all 10 features, and summary of results.

## Mandatory Integrity Warning
DO NOT CHEAT. All tests must genuinely test actual production implementations and real database logic. No mock facades, no hardcoded passing dummy assertions.

## Output Requirements
- Write your progress in `C:/Clinic_MVP/dental-crm/.agents/test_writer_e2e/progress.md`
- Create/update test files in the test suite
- Publish `C:/Clinic_MVP/dental-crm/TEST_READY.md`
- Write handoff report in `C:/Clinic_MVP/dental-crm/.agents/test_writer_e2e/handoff.md` and send message to parent.
