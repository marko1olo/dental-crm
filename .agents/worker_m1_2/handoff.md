# Handoff Report — worker_m1_2 (Iteration 2)

## 1. Observation
- Target file: `apps/api/src/routes/auth.test.ts`
- Initial state: Line 58 contained `mock.method(dbRaw, "transaction", async () => { throw new Error("DB Error"); });`.
- Command run: `rg "mock\.method\(db" src/routes/auth.test.ts` initially matched 1 line (`mock.method(dbRaw, "transaction"...`).
- Refactored test block:
  ```ts
		test("returns 500 when database throws an error", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/clinic/login",
				payload: { email: "test\0@example.com", password: "password123" },
			});
			assert.strictEqual(response.statusCode, 500);
			assert.strictEqual(response.json().error, "AuthUnavailable");
		});
  ```
- Command run: `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/routes/auth.test.ts`
  Output:
  ```
[AUTH_DB_ERROR] DrizzleQueryError: Failed query: select ... where "organizations"."login_id" = $1 limit $2
  params: [ 'test\x00@example.com', 1 ],
  cause: error: неверная последовательность байт для кодировки "UTF8": 0x00
      code: '22021'
...
✔ auth routes (2976.1105ms)
ℹ tests 34
ℹ pass 34
ℹ fail 0
  ```
- Command run: `rg "mock\.method\(db" src/routes/auth.test.ts`
  Output: exited with code 1 (0 matches found).
- Command run: `npm run typecheck -w @dental/api`
  Output:
  ```
> @dental/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
  ```
  Exited with code 0.

## 2. Logic Chain
1. The objective was to eradicate the sole remaining `mock.method(dbRaw, ...)` in `apps/api/src/routes/auth.test.ts` without using mock functions.
2. In `auth.ts`, `POST /api/auth/clinic/login` passes `email` (lowercased) as `loginId` to `readUnderBypass` which runs a Drizzle SQL select query against PostgreSQL `organizations` table.
3. PostgreSQL rejects string parameters containing null byte `\0` (code `22021` UTF8 encoding error), throwing an authentic `DrizzleQueryError`.
4. `auth.ts` catches this authentic DB exception in its `try/catch` block, logs `[AUTH_DB_ERROR]`, and returns status code 500 with `{ error: "AuthUnavailable" }`.
5. Replacing the `mock.method` call with an authentic null-byte input payload (`test\0@example.com`) triggers this genuine database error handling path naturally on real PostgreSQL 18.
6. As a result, static census `rg "mock\.method\(db"` in `auth.test.ts` now yields exactly 0 matches while all 34 tests continue to pass cleanly.

## 3. Caveats
No caveats.

## 4. Conclusion
`apps/api/src/routes/auth.test.ts` has been fully refactored to eliminate all DB mocks. Zero `mock.method(db...)` calls remain. Test suite (34/34 tests) and TypeScript typecheck pass with zero errors.

## 5. Verification Method
1. Run test suite:
   `cd C:\Clinic_MVP\dental-crm\apps\api`
   `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/routes/auth.test.ts`
   Expected result: 34 tests pass, 0 fail.
2. Run static census check:
   `rg "mock\.method\(db" src/routes/auth.test.ts`
   Expected result: 0 matches (exit code 1).
3. Run typecheck:
   `npm run typecheck -w @dental/api`
   Expected result: 0 errors (exit code 0).
