# Handoff Report — Integrity Violation Remediation Plan (Session R5)

**Explorer**: `explorer_r5_4`
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_r5_4`
**Target File**: `apps/web/src/tests/themeContrastGuard.test.ts`
**Project Root**: `C:\Clinic_MVP\dental-crm`

---

## 1. Observation

### 1.1 The Finding
In `apps/web/src/tests/themeContrastGuard.test.ts` lines 28–31:
```typescript
28: import { fileURLToPath } from "node:url";
29: // @ts-expect-error
30: import { describe, test } from "vitest";
31: 
```

### 1.2 Monorepo Test Architecture Reality
1. **`apps/web/package.json` Test Script**:
   ```json
   "test": "node --import tsx --import ./testCssStub.mjs --test \"src/**/*.test.ts\" \"src/**/*.test.tsx\""
   ```
   The test runner for `@dental/web` is Node's native test runner (`node:test`) executed via `node --test` with `tsx`.

2. **Package Inventory**:
   `vitest` is **not installed** in `apps/web/package.json` or root `package.json`.

3. **Project Standards**:
   - `apps/web/src/types/modules.d.ts` lines 5–16 explicitly record that `vitest` was removed from module declarations to prevent `tsc` from masking uninstalled test runner imports.
   - All 104 other test files in `apps/web/src` (e.g. `apiAuthFetch.test.ts`, `documentCreationTimestamps.test.ts`, `workspaceUiLabels.test.ts`, `AuthArtBackground.test.ts`) import directly from `node:test` (`import { describe, it, test } from "node:test";`) and `node:assert` / `node:assert/strict`.

4. **Runtime Execution Error**:
   Running the test runner on `themeContrastGuard.test.ts`:
   ```powershell
   npx tsx --import ./testCssStub.mjs --test src/tests/themeContrastGuard.test.ts
   ```
   Fails at runtime with:
   ```
   Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vitest' imported from C:\Clinic_MVP\dental-crm\apps\web\src\tests\themeContrastGuard.test.ts
   ```

5. **`npm test -w @dental/web`**:
   Exits with code 1 due to `themeContrastGuard.test.ts`.

---

## 2. Logic Chain

1. **Premise 1**: `@dental/web` uses Node's native runner `node:test` for all test execution.
2. **Premise 2**: `vitest` is not an installed dependency in this monorepo.
3. **Observation 1**: The import `import { describe, test } from "vitest";` was placed in `themeContrastGuard.test.ts`, and `// @ts-expect-error` was added to suppress `TS2307: Cannot find module 'vitest'`.
4. **Observation 2**: While `// @ts-expect-error` silenced `npm run typecheck`, it broke `npm test -w @dental/web` with `ERR_MODULE_NOT_FOUND`.
5. **Observation 3**: The test body in `themeContrastGuard.test.ts` uses standard `describe(...)` and `test(...)` blocks, along with `node:assert/strict` assertions (`assert.equal`, `assert.ok`, `assert.deepEqual`). It does not use any Vitest-specific APIs (such as `vi`, `expect`, `beforeAll`, etc.).
6. **Inference**: `themeContrastGuard.test.ts` can be natively executed by replacing `vitest` with `node:test` and removing the `// @ts-expect-error` line.
7. **Conclusion**: Changing line 30 to `import { describe, test } from "node:test";` and removing line 29 fixes both static type checking (with zero `@ts-expect-error` suppressions) and native runtime test execution (`npm test -w @dental/web`).

---

## 3. Caveats

- **Explorer Read-Only Constraint**: As an Explorer agent, I cannot modify source/test files directly. An Implementer/Worker agent must execute the file change.
- **Scope Isolation**: No other files in `apps/web/src` require changes. `themeContrastGuard.test.ts` was the sole file using `// @ts-expect-error` or importing `vitest`.

---

## 4. Conclusion & Remediation Plan

### Exact Code Replacement Instructions

**Target File**: `C:\Clinic_MVP\dental-crm\apps\web\src\tests\themeContrastGuard.test.ts`

**Start Line**: 25
**End Line**: 31

**Target Content**:
```typescript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error
import { describe, test } from "vitest";
```

**Replacement Content**:
```typescript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
```

---

## 5. Verification Method

To independently verify the fix after implementation:

1. **Verify TypeScript Typecheck**:
   ```powershell
   npm run typecheck -w @dental/web
   ```
   **Expected Result**: `tsc -b --noEmit` exits with 0 errors.

2. **Verify Single Test Execution**:
   From `apps/web`:
   ```powershell
   npx tsx --import ./testCssStub.mjs --test src/tests/themeContrastGuard.test.ts
   ```
   **Expected Result**: Test executes natively and output shows:
   ```
   ✔ контраст правок считается по палитре, которая выигрывает каскад (ms)
   ✔ тронутые правила не возвращают литералы (ms)
   ✔ ни одна поправка на тёмную тему не забывает «Тепло» (ms)
   ℹ tests 7
   ℹ pass 7
   ℹ fail 0
   ```

3. **Verify Web Package Test Suite Execution**:
   From root (`C:\Clinic_MVP\dental-crm`):
   ```powershell
   npm test -w @dental/web
   ```
   **Expected Result**: All tests pass without any `ERR_MODULE_NOT_FOUND` errors.
