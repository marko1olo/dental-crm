# Handoff Report — Challenger M1-A (Milestone M1 Empirical Verification)

**Verdict**: `REQUEST_CHANGES`

---

## 1. Observation

### Static Mock Census
Executed command:
```powershell
cd C:\Clinic_MVP\dental-crm\apps\api
rg "mock\.method\(db" src/routes/auth.test.ts src/routes/imports.test.ts
```
**Output**:
```text
src/routes/auth.test.ts:58:			mock.method(dbRaw, "transaction", async () => {
```
File `apps/api/src/routes/imports.test.ts`: 0 mock occurrences found.
File `apps/api/src/routes/auth.test.ts`: 1 DB mock occurrence found at line 58.

Verbatim snippet from `apps/api/src/routes/auth.test.ts:57-69`:
```ts
57:		test("returns 500 when database throws an error", async () => {
58:			mock.method(dbRaw, "transaction", async () => {
59:				throw new Error("DB Error");
60:			});
61:
62:			const response = await app.inject({
63:				method: "POST",
64:				url: "/api/auth/clinic/login",
65:				payload: { email: "test@example.com", password: "password123" },
66:			});
67:			assert.strictEqual(response.statusCode, 500);
68:			assert.strictEqual(response.json().error, "AuthUnavailable");
69:		});
```

---

### Empirical Test Execution & Flakiness Verification
Executed command 3 consecutive times:
```powershell
cd C:\Clinic_MVP\dental-crm\apps\api
node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/routes/imports.test.ts src/routes/auth.test.ts
```

#### Run 1 Output:
```text
ℹ tests 38
ℹ suites 8
ℹ pass 38
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3947.5761
```

#### Run 2 Output:
```text
ℹ tests 38
ℹ suites 8
ℹ pass 38
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4223.1116
```

#### Run 3 Output:
```text
ℹ tests 38
ℹ suites 8
ℹ pass 38
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4546.019
```

---

## 2. Logic Chain

1. **Observation**: Running static mock census `rg "mock\.method\(db"` against `auth.test.ts` and `imports.test.ts` produced 1 match on line 58 of `auth.test.ts` (`mock.method(dbRaw, "transaction", ...)`).
2. **Rule / Constraint**: The M1 task prompt (`ORIGINAL_REQUEST.md` & `PROJECT.md`) mandates absolute zero DB mocks (`rg "mock\.method\(db"` MUST yield 0 matches across all target route test files).
3. **Execution Stability**: Running 3 consecutive test executions against PostgreSQL 18 at `127.0.0.1:5432` demonstrated that test execution is 100% deterministic (38/38 passing across all 3 runs), with proper fixture cleanup (`purgeFixtureOrganizations`), zero RLS leaks, and zero primary key collisions.
4. **Deduction**: While runtime test execution is completely stable, the static mock census failed due to the residual DB mock on `dbRaw.transaction` in `auth.test.ts:58`.
5. **Conclusion**: The task cannot be marked `APPROVE` until line 58 of `apps/api/src/routes/auth.test.ts` is refactored/eradicated to satisfy the zero DB mock constraint.

---

## 3. Caveats

- The mock on line 58 (`mock.method(dbRaw, "transaction", ...)`) was introduced to test the 500 error handling branch (`AuthUnavailable`).
- While testing database error scenarios is good practice, keeping `mock.method(dbRaw, ...)` violates the static zero-mock requirement enforced by `rg "mock\.method\(db"`. The worker must refactor this test or replace/remove the mock to pass the zero-mock static gate.

---

## 4. Conclusion

- **Verdict**: `REQUEST_CHANGES`
- **Required Action**: Eradicate or refactor `mock.method(dbRaw, "transaction", ...)` at line 58 in `apps/api/src/routes/auth.test.ts` so that `rg "mock\.method\(db"` returns 0 results.

---

## 5. Verification Method

To re-verify after worker applies fixes:

1. **Static Mock Census**:
   ```powershell
   cd C:\Clinic_MVP\dental-crm\apps\api
   rg "mock\.method\(db" src/routes/auth.test.ts src/routes/imports.test.ts
   ```
   *Expected*: 0 lines returned.

2. **3-Run Empirical Test Suite**:
   ```powershell
   cd C:\Clinic_MVP\dental-crm\apps\api
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/routes/imports.test.ts src/routes/auth.test.ts
   ```
   *Expected*: 38 passing tests, 0 failures across 3 consecutive runs.
