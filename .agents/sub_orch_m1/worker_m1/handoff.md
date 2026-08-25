# Handoff Report — Milestone M1 (Worker M1)

**HEAD: 2f87c57fca2dbe95cb2e841172e52a73e8dda0fb**
**Date: 2026-08-18T21:13:40+04:00**
**Role: Worker M1 (Compiler Gate & Core Hydration/Toast Remediation)**

---

## 1. Observation

### Target Files & Modifications
1. `apps/web/src/hooks/domains/useOnboardingLogic.ts`
   - Added missing `logger` import (`import { logger } from "../../utils/logger";`) on line 6 to resolve TS2304 error at line 301 (`logger.warn(...)`).
2. `apps/web/src/hooks/usePatientResource.ts`
   - Added `_reloadToken` to the `useEffect` dependency array (`[patientId, _reloadToken]`) around line 132 so that invoking `reload()` triggers data refetching.
3. `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts`
   - Updated catch block in `loadDashboard` to suppress user-facing error toasts when receiving 401/403 unauthenticated / session expired errors (smoothly transitioning to unlock screen via `setAccessUnlockRequired(true)`), while preserving red error toasts for genuine 5xx server failures and network disconnects.
4. `apps/web/src/browserContinuity.ts`
   - Removed user-facing `showToast` call from `browserIndexedDbWritable()` (~line 105) so low-level background storage diagnostics do not trigger false-alarm popups. Removed unused `showToast` and `actionFailureToast` imports.

### Git Status & Diff
`git status --short apps/web/src/hooks/domains/useOnboardingLogic.ts apps/web/src/hooks/usePatientResource.ts apps/web/src/hooks/domains/useDashboardLoaderLogic.ts apps/web/src/browserContinuity.ts`:
```text
 M apps/web/src/browserContinuity.ts
 M apps/web/src/hooks/domains/useDashboardLoaderLogic.ts
 M apps/web/src/hooks/domains/useOnboardingLogic.ts
 M apps/web/src/hooks/usePatientResource.ts
```

Exact diff:
```diff
diff --git a/apps/web/src/browserContinuity.ts b/apps/web/src/browserContinuity.ts
index 960856583..e1ab37a69 100644
--- a/apps/web/src/browserContinuity.ts
+++ b/apps/web/src/browserContinuity.ts
@@ -1,5 +1,3 @@
-import { showToast } from "./components/GlobalToast";
-import { actionFailureToast } from "./lib/panelStateText";
 import {
 	safeLocalStorageRemoveItem,
 	safeLocalStorageSetItem,
@@ -102,13 +100,6 @@ export async function browserIndexedDbWritable(): Promise<boolean> {
 		window.indexedDB.deleteDatabase("test-dente-db-support");
 		idbWorks = true;
 	} catch (_e) {
-		showToast(
-			actionFailureToast(
-				"Ошибка выполнения операции",
-				(_e as { status?: number })?.status ?? null,
-			),
-			"error",
-		);
 		idbWorks = false;
 	}
 	return idbWorks;
diff --git a/apps/web/src/hooks/domains/useDashboardLoaderLogic.ts b/apps/web/src/hooks/domains/useDashboardLoaderLogic.ts
index df737a1e0..06c76cfeb 100644
--- a/apps/web/src/hooks/domains/useDashboardLoaderLogic.ts
+++ b/apps/web/src/hooks/domains/useDashboardLoaderLogic.ts
@@ -59,31 +59,27 @@ export function useDashboardLoaderLogic({
 				setAccessUnlockRequired(false);
 				setAccessUnlockMessage("");
 			} catch (err) {
-				showToast(
-					actionFailureToast(
-						"Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
-						(err as { status?: number })?.status ?? null,
-					),
-					"error",
-				);
 				if (isStaleResponse()) return;
-				// БЫЛО: любая ошибка загрузки (обрыв сети, 401, 500) подменяла реальные
-				// данные клиники ВЫМЫШЛЕННЫМИ: «Демо Клиника DENTE» и пациент
-				// «Смирнов Алексей Петрович» с id "pat-1", который тут же выбирался
-				// активным. Врач мог диктовать приём в карту несуществующего человека.
-				// Кроме того, catch никогда не пробрасывал ошибку дальше, поэтому
-				// все .catch() у вызывающих (в том числе принудительный релогин при 401)
-				// были мёртвым кодом, и истёкшая сессия не приводила к повторному входу.
 				logger.error("[Dente] Не удалось загрузить данные клиники:", err);
+				const status = (err as { status?: number })?.status ?? null;
 				const isAuthError =
-					err instanceof Error &&
-					/401|403|Требуется авторизация|Сессия истекла/i.test(err.message);
+					status === 401 ||
+					status === 403 ||
+					(err instanceof Error &&
+						/401|403|Требуется авторизация|Сессия истекла/i.test(err.message));
 				if (isAuthError) {
 					setAccessUnlockRequired(true);
 					setAccessUnlockMessage(
 						"Сессия истекла. Войдите в кабинет клиники заново.",
 					);
 				} else {
+					showToast(
+						actionFailureToast(
+							"Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
+							status,
+						),
+						"error",
+					);
 					setError(
 						"Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
 					);
diff --git a/apps/web/src/hooks/domains/useOnboardingLogic.ts b/apps/web/src/hooks/domains/useOnboardingLogic.ts
index 12cfe95d2..0f576bce2 100644
--- a/apps/web/src/hooks/domains/useOnboardingLogic.ts
+++ b/apps/web/src/hooks/domains/useOnboardingLogic.ts
@@ -3,6 +3,7 @@ import { useSettingsStore } from "../../store/settingsStore";
 import { type OnboardingStep, type UiPreferences } from "@dental/shared";
 import { type AppView } from "../../utils/routeUtils";
 import { loadOnboardingDismissalState, onboardingSteps } from "../../AppHelpers";
+import { logger } from "../../utils/logger";
 export interface OnboardingLogicProps {
     clinicProfileDraft: any;
     dashboard: any;
diff --git a/apps/web/src/hooks/usePatientResource.ts b/apps/web/src/hooks/usePatientResource.ts
index fa5c30c36..7b8a05545 100644
--- a/apps/web/src/hooks/usePatientResource.ts
+++ b/apps/web/src/hooks/usePatientResource.ts
@@ -129,7 +129,7 @@ export function usePatientResource<T>(
 			cancelled = true;
 			controller.abort();
 		};
-	}, [patientId]);
+	}, [patientId, _reloadToken]);
 
 	const reload = useCallback(() => setReloadToken((token) => token + 1), []);
 
```

---

## 2. Logic Chain

1. **Compiler Defect Resolution**:
   - Observation: `apps/web/src/hooks/domains/useOnboardingLogic.ts:301` called `logger.warn(...)`, but `logger` was never imported.
   - Inference: Adding `import { logger } from "../../utils/logger";` gives TypeScript the symbol definition and restores the compiler gate to green.

2. **Hydration Reload Defect Resolution**:
   - Observation: `usePatientResource.ts` defined `reload = useCallback(() => setReloadToken(t => t + 1), [])` and maintained `_reloadToken` in state, but the data-fetching `useEffect` only watched `[patientId]`.
   - Inference: When child widgets invoked `reload()`, state changed but `useEffect` never re-triggered. Adding `_reloadToken` into the dependency array `[patientId, _reloadToken]` ensures every call to `reload()` triggers a fresh, cancellation-guarded fetch.

3. **Cold-Start Spurious Auth Toast Suppression**:
   - Observation: In `useDashboardLoaderLogic.ts`, `loadDashboard` catch block immediately invoked `showToast(actionFailureToast(...), "error")` before checking if the response was a 401 unauthenticated error.
   - Inference: When cold starting unauthenticated or with an expired session, the dashboard fetch returns 401. Showing a red error toast alongside the unlock prompt degrades UX. Guarding `showToast` so it only fires when `!isAuthError` eliminates spurious toasts while preserving legitimate 5xx and network error notifications.

4. **Background Diagnostic Toast Muting**:
   - Observation: In `browserContinuity.ts`, `browserIndexedDbWritable()` called `showToast` upon probe failure.
   - Inference: Background continuity probing during tab focus/visibility change is a diagnostic capability check, not a user-action failure. Removing `showToast` prevents false-alarm popups.

---

## 3. Verification Commands & Results

### 1. TypeScript Compiler Gate across monorepo (`npm run typecheck`)
```text
> dental-crm@0.1.0 typecheck
> npm run build -w @dental/shared && npm run typecheck -w @dental/shared && npm run typecheck:tests -w @dental/shared && npm run typecheck -w @dental/api && npm run typecheck:tests -w @dental/api && npm run typecheck -w @dental/web

> @dental/shared@0.1.0 build
> tsc -p tsconfig.json

> @dental/shared@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit

> @dental/shared@0.1.0 typecheck:tests
> tsc -p tsconfig.tests.json --noEmit

> @dental/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit

> @dental/api@0.1.0 typecheck:tests
> tsc -p tsconfig.tests.json --noEmit

> @dental/web@0.1.0 typecheck
> tsc -b --noEmit

Exit code: 0 (PASS)
```

### 2. Web Unit & Integration Tests (`npm test -w @dental/web`)
```text
ℹ tests 1451
ℹ suites 245
ℹ pass 1451
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8433.2337
Exit code: 0 (PASS)
```

### 3. Shared Unit Tests (`npm test -w @dental/shared`)
```text
ℹ tests 211
ℹ suites 44
ℹ pass 211
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 407.1204
Exit code: 0 (PASS)
```

### 4. UTF-8 Encoding Gate (`npm run check:encoding`)
```text
Кодировка в порядке: проверено 2656 файлов, замечаний нет.
Exit code: 0 (PASS)
```

---

## 4. Caveats
- No caveats. All 4 target files are within exclusive ownership, zero extraneous files were modified, and all quality gates pass 100%.

---

## 5. Conclusion & Verification Method
- **Status**: ПРОВЕРЕНО
- **Verification Commands for Peer/Auditor**:
  1. `npm run typecheck` (verifies 0 TypeScript errors across @dental/shared, @dental/api, @dental/web)
  2. `npm test -w @dental/web` (verifies 1451/1451 web tests pass)
  3. `npm test -w @dental/shared` (verifies 211/211 shared tests pass)
  4. `npm run check:encoding` (verifies 0 encoding defects)
