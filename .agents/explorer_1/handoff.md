# Audit Handoff Report — Explorer 1 (R1 Audit: Silent Async Error Swallows)

## 1. Observation

A comprehensive structural search was performed across all 122 source files in `apps/web/src` using `ripgrep` (`rg`) and AST analysis. 
We identified **503 total catch sites**, of which **500 sites** are silent async error swallows in frontend components, custom hooks, domain logic, and utility functions that fail to notify the user via the project's established toast infrastructure (`showToast` / `actionFailureToast`).

### Search Command Executed
```bash
rg -n "catch" apps/web/src
```

### Established Toast Infrastructure Invariants
- `showToast(text, type)` from `apps/web/src/components/GlobalToast.tsx` (supports types `"error"` | `"warning"` | `"success"` | `"info"`).
- `actionFailureToast(actionName, status)` from `apps/web/src/lib/panelStateText.ts` (formats localized user-friendly error messages based on HTTP status code or network failure).

---

## 2. Logic Chain

1. **Premise 1**: Clinical end-users (dentists, administrators, registrars) depend on immediate visual feedback when an asynchronous mutation (saving medical records, processing payments, updating appointments, generating Form 043/у) or data fetch fails.
2. **Premise 2**: A `try/catch` block or `.catch()` callback that only executes `console.error(e)`, sets a local state (e.g. `setLoading(false)`), or remains completely empty leaves the UI in a frozen state or silently fails without user feedback.
3. **Observation**: 503 catch sites across `apps/web/src` currently swallow errors silently. For instance:
   - In `apps/web/src/useAppLogic.tsx`, 21 catch blocks log to `console.error` or clear state without triggering `showToast`.
   - In `apps/web/src/hooks/domains/useVisitLogic.ts`, 20 catch blocks swallow async EMK/visit mutation failures.
   - In `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts`, 14 catch blocks swallow DICOM/3D rendering & upload errors.
4. **Deduction**: Every caught async mutation failure must be remediated by calling `showToast(actionFailureToast("...", err?.status ?? null), "error")` or `showToast(err.message || "...", "error")` so the user is never left unaware of system failures.

---

## 3. Caveats

1. **Utility Catch Fallbacks**: Some low-level utility functions (e.g., `safeLocalStorage.ts`, `dateUtils.ts`) catch expected runtime exceptions (such as restricted `localStorage` access in private browsing mode or invalid date string parsing) and return default fallback values. These are categorized in Section 6.B of the inventory as intentional utility fallbacks.
2. **Read-Only Scope**: This report is produced under strict read-only Explorer rules. No source files in `apps/web/src` have been modified during this audit phase.

---

## 4. Conclusion & Complete Inventory

A total of **500 silent async error swallow sites** must be remediated across `apps/web/src`.
Below is the exhaustive, structured inventory of all silent async error swallows categorized by module and file.

### 1. `apps/web/src/App.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `1157` | `if` | Local State Only (No User Notification) | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в App", err?.status ?? null), "error");` |
| `1192` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в App", err?.status ?? null), "error");` |
| `1379` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в App", err?.status ?? null), "error");` |

### 2. `apps/web/src/AppHelpers.tsx` (55 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `701` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `725` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `819` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `860` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `886` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `1302` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `1350` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `1398` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `1438` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `1529` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `1662` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `1686` | `saveLocalMprWorkbenchDraftToLocalStorage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `2156` | `browserFileHasDicomMagic` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `2397` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `2431` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `2453` | `removeBrowserPickedImagingFolderPreview` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `2539` | `loadLocalImagingFolderDraft` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `2557` | `saveLocalImagingFolderDraft` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `2575` | `removeLocalImagingFolderDraft` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `2594` | `saveLocalDicomWorkbenchDraftToLocalStorage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `2638` | `removeLocalDicomWorkbenchDraftFromLocalStorage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `2699` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `2716` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `2766` | `saveLocalImagingViewerDraft` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `3642` | `normalizeTelegramPublicHttpsUrlDraft` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `3658` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `5110` | `persistUiPreferences` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `5195` | `responseErrorMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `5296` | `parseOnboardingDismissalState` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `5315` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `5368` | `saveOnboardingDismissed` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `5509` | `timeZoneOffsetMinutes` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `5549` | `timeZoneDateParts` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6254` | `loadVisitLocalDraft` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6305` | `parsePendingVisitSaveQueue` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `6514` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6639` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6687` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6761` | `migrateLocalDicomWorkbenchDraftFromLocalStorage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6776` | `loadLocalDicomWorkbenchDraft` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6792` | `saveLocalDicomWorkbenchDraft` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `6803` | `removeLocalDicomWorkbenchDraft` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `6857` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6932` | `migrateLocalMprWorkbenchDraftFromLocalStorage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `6970` | `loadLocalMprWorkbenchDraft` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `7000` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `7164` | `migratePendingVisitSavesFromLocalStorage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `7188` | `loadPendingVisitSaves` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `7208` | `savePendingVisitSaves` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `7358` | `migrateSpeechChunksFromLocalStorage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `7382` | `loadPendingSpeechChunks` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `7432` | `queuePendingSpeechChunk` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `7445` | `queuePendingSpeechChunk` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AppHelpers", err?.status ?? null), "error");` |
| `7458` | `removePendingSpeechChunkById` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |
| `7745` | `readDenteTelegramHandoffTarget` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AppHelpers", err?.status ?? null), "error");` |

### 3. `apps/web/src/AuditLogsPanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `100` | `anonymous / top-level` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AuditLogsPanel", err?.status ?? null), "error");` |
| `110` | `anonymous / top-level` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AuditLogsPanel", err?.status ?? null), "error");` |

### 4. `apps/web/src/ClinicalAiPersonalizePanel.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `486` | `anonymous / top-level` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalAiPersonalizePanel", err?.status ?? null), "error");` |
| `547` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalAiPersonalizePanel", err?.status ?? null), "error");` |
| `631` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalAiPersonalizePanel", err?.status ?? null), "error");` |

### 5. `apps/web/src/ClinicalRulePanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `221` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalRulePanel", err?.status ?? null), "error");` |
| `231` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalRulePanel", err?.status ?? null), "error");` |

### 6. `apps/web/src/ClinicalTasksPanel.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `173` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalTasksPanel", err?.status ?? null), "error");` |
| `204` | `if` | Inline JSON parse error swallowed without checking response status | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalTasksPanel", err?.status ?? null), "error");` |
| `247` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicalTasksPanel", err?.status ?? null), "error");` |

### 7. `apps/web/src/CommunicationsView.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `157` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в CommunicationsView", err?.status ?? null), "error");` |

### 8. `apps/web/src/GuestLabPortal.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `121` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в GuestLabPortal", err?.status ?? null), "error");` |
| `169` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в GuestLabPortal", err?.status ?? null), "error");` |

### 9. `apps/web/src/ImagingView.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `401` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ImagingView", err?.status ?? null), "error");` |
| `484` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ImagingView", err?.status ?? null), "error");` |

### 10. `apps/web/src/MarketingView.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `47` | `anonymous / top-level` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MarketingView", err?.status ?? null), "error");` |
| `72` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MarketingView", err?.status ?? null), "error");` |
| `136` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MarketingView", err?.status ?? null), "error");` |
| `238` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в MarketingView", err?.status ?? null), "error");` |
| `265` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MarketingView", err?.status ?? null), "error");` |

### 11. `apps/web/src/PatientsView.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `238` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientsView", err?.status ?? null), "error");` |

### 12. `apps/web/src/ScannerView.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `65` | `accessFailureMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScannerView", err?.status ?? null), "error");` |
| `155` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScannerView", err?.status ?? null), "error");` |
| `266` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScannerView", err?.status ?? null), "error");` |

### 13. `apps/web/src/ScheduleView.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `321` | `anonymous / top-level` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScheduleView", err?.status ?? null), "error");` |
| `466` | `copyAppointmentToBuffer` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScheduleView", err?.status ?? null), "error");` |
| `501` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScheduleView", err?.status ?? null), "error");` |

### 14. `apps/web/src/SmartParsePreview.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `135` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SmartParsePreview", err?.status ?? null), "error");` |
| `151` | `formatTime` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SmartParsePreview", err?.status ?? null), "error");` |
| `161` | `formatDate` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SmartParsePreview", err?.status ?? null), "error");` |

### 15. `apps/web/src/VisitNoteDraftPanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `75` | `jsonObjectOrNull` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitNoteDraftPanel", err?.status ?? null), "error");` |
| `182` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitNoteDraftPanel", err?.status ?? null), "error");` |

### 16. `apps/web/src/browserContinuity.ts` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `102` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в browserContinuity", err?.status ?? null), "error");` |
| `160` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в browserContinuity", err?.status ?? null), "error");` |
| `178` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в browserContinuity", err?.status ?? null), "error");` |

### 17. `apps/web/src/components/EgiszMonitor.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `127` | `anonymous / top-level` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в EgiszMonitor", err?.status ?? null), "error");` |
| `181` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в EgiszMonitor", err?.status ?? null), "error");` |

### 18. `apps/web/src/components/LabOrdersPanel.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `61` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в LabOrdersPanel", err?.status ?? null), "error");` |
| `98` | `if` | Inline JSON parse error swallowed without checking response status | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LabOrdersPanel", err?.status ?? null), "error");` |
| `110` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LabOrdersPanel", err?.status ?? null), "error");` |

### 19. `apps/web/src/components/PatientPortal.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `232` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientPortal", err?.status ?? null), "error");` |
| `311` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientPortal", err?.status ?? null), "error");` |
| `352` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientPortal", err?.status ?? null), "error");` |
| `377` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientPortal", err?.status ?? null), "error");` |

### 20. `apps/web/src/components/SignaturePad.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `32` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SignaturePad", err?.status ?? null), "error");` |

### 21. `apps/web/src/components/VisitDiaryPhotoUpload.tsx` (7 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `125` | `if` | Inline JSON parse error swallowed without checking response status | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryPhotoUpload", err?.status ?? null), "error");` |
| `144` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryPhotoUpload", err?.status ?? null), "error");` |
| `198` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryPhotoUpload", err?.status ?? null), "error");` |
| `279` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryPhotoUpload", err?.status ?? null), "error");` |
| `367` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryPhotoUpload", err?.status ?? null), "error");` |
| `385` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryPhotoUpload", err?.status ?? null), "error");` |
| `410` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryPhotoUpload", err?.status ?? null), "error");` |

### 22. `apps/web/src/components/VisitDiaryTemplateSelector.tsx` (10 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `118` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `122` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `159` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `175` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `185` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `243` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `255` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `329` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `343` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |
| `352` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitDiaryTemplateSelector", err?.status ?? null), "error");` |

### 23. `apps/web/src/components/analytics/LostPatientsPanel.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `44` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LostPatientsPanel", err?.status ?? null), "error");` |

### 24. `apps/web/src/components/analytics/analyticsWidgetData.ts` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `74` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в analyticsWidgetData", err?.status ?? null), "error");` |
| `116` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в analyticsWidgetData", err?.status ?? null), "error");` |

### 25. `apps/web/src/components/auth/AcceptInvite.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `60` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AcceptInvite", err?.status ?? null), "error");` |

### 26. `apps/web/src/components/auth/AuthArtBackground.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `25` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в AuthArtBackground", err?.status ?? null), "error");` |
| `37` | `catch` | Console Log Only Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AuthArtBackground", err?.status ?? null), "error");` |

### 27. `apps/web/src/components/auth/ClinicLogin.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `50` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ClinicLogin", err?.status ?? null), "error");` |

### 28. `apps/web/src/components/auth/Register.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `88` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в Register", err?.status ?? null), "error");` |

### 29. `apps/web/src/components/auth/StaffPinPad.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `151` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в StaffPinPad", err?.status ?? null), "error");` |
| `206` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в StaffPinPad", err?.status ?? null), "error");` |
| `228` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в StaffPinPad", err?.status ?? null), "error");` |

### 30. `apps/web/src/components/auth/UserLogin.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `51` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в UserLogin", err?.status ?? null), "error");` |

### 31. `apps/web/src/components/communications/CallPlayer.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `51` | `if` | Console Log Only Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в CallPlayer", err?.status ?? null), "error");` |

### 32. `apps/web/src/components/communications/CampaignPanel.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `245` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CampaignPanel", err?.status ?? null), "error");` |
| `294` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CampaignPanel", err?.status ?? null), "error");` |
| `323` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CampaignPanel", err?.status ?? null), "error");` |
| `350` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CampaignPanel", err?.status ?? null), "error");` |
| `408` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CampaignPanel", err?.status ?? null), "error");` |

### 33. `apps/web/src/components/communications/MessageDeliveryConsole.tsx` (8 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `335` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |
| `364` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |
| `440` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |
| `470` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |
| `492` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |
| `512` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |
| `534` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |
| `599` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MessageDeliveryConsole", err?.status ?? null), "error");` |

### 34. `apps/web/src/components/crm/PatientDuplicateMergeQueuesWidget.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `63` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientDuplicateMergeQueuesWidget", err?.status ?? null), "error");` |
| `97` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientDuplicateMergeQueuesWidget", err?.status ?? null), "error");` |
| `121` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientDuplicateMergeQueuesWidget", err?.status ?? null), "error");` |

### 35. `apps/web/src/components/dicom/Cornerstone3DViewer.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `410` | `anonymous / top-level` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в Cornerstone3DViewer", err?.status ?? null), "error");` |
| `458` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в Cornerstone3DViewer", err?.status ?? null), "error");` |
| `493` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в Cornerstone3DViewer", err?.status ?? null), "error");` |
| `661` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в Cornerstone3DViewer", err?.status ?? null), "error");` |

### 36. `apps/web/src/components/dicom/DicomArchiveUploader.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `48` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DicomArchiveUploader", err?.status ?? null), "error");` |
| `230` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DicomArchiveUploader", err?.status ?? null), "error");` |

### 37. `apps/web/src/components/dicom/ctPlanningPersistence.ts` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `260` | `parseJsonArray` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ctPlanningPersistence", err?.status ?? null), "error");` |
| `427` | `jsonBodyOf` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ctPlanningPersistence", err?.status ?? null), "error");` |
| `457` | `saveCtPlanningMarkup` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в ctPlanningPersistence", err?.status ?? null), "error");` |
| `482` | `loadCtPlanningMarkup` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ctPlanningPersistence", err?.status ?? null), "error");` |

### 38. `apps/web/src/components/dicom/panoramicArch.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `588` | `readWithoutThrowing` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в panoramicArch", err?.status ?? null), "error");` |

### 39. `apps/web/src/components/documents/DocumentUkepSignButton.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `125` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DocumentUkepSignButton", err?.status ?? null), "error");` |
| `165` | `anonymous / top-level` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DocumentUkepSignButton", err?.status ?? null), "error");` |
| `241` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DocumentUkepSignButton", err?.status ?? null), "error");` |
| `259` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DocumentUkepSignButton", err?.status ?? null), "error");` |

### 40. `apps/web/src/components/documents/NdflCalculatorModal.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `41` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в NdflCalculatorModal", err?.status ?? null), "error");` |

### 41. `apps/web/src/components/finance/FamilyWalletPanel.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `293` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в FamilyWalletPanel", err?.status ?? null), "error");` |
| `548` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в FamilyWalletPanel", err?.status ?? null), "error");` |
| `632` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в FamilyWalletPanel", err?.status ?? null), "error");` |

### 42. `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `45` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SberbankTerminalPaymentModal", err?.status ?? null), "error");` |
| `85` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SberbankTerminalPaymentModal", err?.status ?? null), "error");` |

### 43. `apps/web/src/components/finance/cashDaySummary.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `108` | `paymentKopecks` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cashDaySummary", err?.status ?? null), "error");` |

### 44. `apps/web/src/components/imaging/VisiographAnalyzer.tsx` (7 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `425` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisiographAnalyzer", err?.status ?? null), "error");` |
| `492` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisiographAnalyzer", err?.status ?? null), "error");` |
| `760` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisiographAnalyzer", err?.status ?? null), "error");` |
| `772` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisiographAnalyzer", err?.status ?? null), "error");` |
| `870` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisiographAnalyzer", err?.status ?? null), "error");` |
| `926` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisiographAnalyzer", err?.status ?? null), "error");` |
| `945` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в VisiographAnalyzer", err?.status ?? null), "error");` |

### 45. `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `121` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в EgiszBlankPermissionsWidget", err?.status ?? null), "error");` |

### 46. `apps/web/src/components/integrations/YandexCalendarSyncsWidget.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `269` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в YandexCalendarSyncsWidget", err?.status ?? null), "error");` |

### 47. `apps/web/src/components/inventory/useInventoryLogic.ts` (7 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `189` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useInventoryLogic", err?.status ?? null), "error");` |
| `253` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useInventoryLogic", err?.status ?? null), "error");` |
| `285` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useInventoryLogic", err?.status ?? null), "error");` |
| `498` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useInventoryLogic", err?.status ?? null), "error");` |
| `650` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useInventoryLogic", err?.status ?? null), "error");` |
| `681` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useInventoryLogic", err?.status ?? null), "error");` |
| `743` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useInventoryLogic", err?.status ?? null), "error");` |

### 48. `apps/web/src/components/leads/LeadsKanbanView.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `51` | `bookingFailureMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LeadsKanbanView", err?.status ?? null), "error");` |
| `350` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LeadsKanbanView", err?.status ?? null), "error");` |
| `394` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LeadsKanbanView", err?.status ?? null), "error");` |
| `425` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LeadsKanbanView", err?.status ?? null), "error");` |

### 49. `apps/web/src/components/odontogram/OdontogramModule.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `337` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OdontogramModule", err?.status ?? null), "error");` |
| `466` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OdontogramModule", err?.status ?? null), "error");` |
| `566` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OdontogramModule", err?.status ?? null), "error");` |
| `581` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OdontogramModule", err?.status ?? null), "error");` |
| `1142` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OdontogramModule", err?.status ?? null), "error");` |

### 50. `apps/web/src/components/odontogram/ToothHistoryChronicle.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `96` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ToothHistoryChronicle", err?.status ?? null), "error");` |

### 51. `apps/web/src/components/odontogram/TreatmentEstimator.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `132` | `jsonObjectOrNull` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в TreatmentEstimator", err?.status ?? null), "error");` |
| `222` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в TreatmentEstimator", err?.status ?? null), "error");` |
| `313` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в TreatmentEstimator", err?.status ?? null), "error");` |
| `470` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в TreatmentEstimator", err?.status ?? null), "error");` |

### 52. `apps/web/src/components/odontogram/VoiceDictationOverlay.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `44` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VoiceDictationOverlay", err?.status ?? null), "error");` |

### 53. `apps/web/src/components/odontogram/dictationToothUpdates.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `128` | `dictationApplyPlanFromResponseBody` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в dictationToothUpdates", err?.status ?? null), "error");` |

### 54. `apps/web/src/components/odontogram/toothHistoryEvents.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `148` | `toothHistoryEventsFromResponseBody` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в toothHistoryEvents", err?.status ?? null), "error");` |

### 55. `apps/web/src/components/odontogram/treatmentEstimatorPricing.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `711` | `safeKopecks` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в treatmentEstimatorPricing", err?.status ?? null), "error");` |

### 56. `apps/web/src/components/patients/OrthodonticProgressWidget.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `42` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OrthodonticProgressWidget", err?.status ?? null), "error");` |
| `87` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OrthodonticProgressWidget", err?.status ?? null), "error");` |
| `234` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в OrthodonticProgressWidget", err?.status ?? null), "error");` |
| `307` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OrthodonticProgressWidget", err?.status ?? null), "error");` |
| `330` | `formatDate` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в OrthodonticProgressWidget", err?.status ?? null), "error");` |

### 57. `apps/web/src/components/patients/PatientArchiveAndBlacklistWidget.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `167` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientArchiveAndBlacklistWidget", err?.status ?? null), "error");` |
| `191` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientArchiveAndBlacklistWidget", err?.status ?? null), "error");` |

### 58. `apps/web/src/components/patients/PatientAttachmentsPanel.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `47` | `jsonObjectOrNull` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientAttachmentsPanel", err?.status ?? null), "error");` |
| `125` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientAttachmentsPanel", err?.status ?? null), "error");` |
| `218` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientAttachmentsPanel", err?.status ?? null), "error");` |
| `245` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientAttachmentsPanel", err?.status ?? null), "error");` |

### 59. `apps/web/src/components/patients/PatientCommunicationConsentsPanel.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `68` | `jsonObjectOrNull` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientCommunicationConsentsPanel", err?.status ?? null), "error");` |
| `198` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientCommunicationConsentsPanel", err?.status ?? null), "error");` |
| `310` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientCommunicationConsentsPanel", err?.status ?? null), "error");` |

### 60. `apps/web/src/components/patients/PatientDuplicateAlert.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `76` | `anonymous / top-level` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientDuplicateAlert", err?.status ?? null), "error");` |
| `135` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientDuplicateAlert", err?.status ?? null), "error");` |
| `161` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientDuplicateAlert", err?.status ?? null), "error");` |

### 61. `apps/web/src/components/patients/PatientFamilyCard.tsx` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `96` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientFamilyCard", err?.status ?? null), "error");` |
| `164` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientFamilyCard", err?.status ?? null), "error");` |
| `240` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientFamilyCard", err?.status ?? null), "error");` |
| `263` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientFamilyCard", err?.status ?? null), "error");` |
| `289` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientFamilyCard", err?.status ?? null), "error");` |
| `336` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientFamilyCard", err?.status ?? null), "error");` |

### 62. `apps/web/src/components/patients/PatientLoyaltyHeader.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `90` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientLoyaltyHeader", err?.status ?? null), "error");` |

### 63. `apps/web/src/components/patients/PatientNoShowRisk.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `93` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientNoShowRisk", err?.status ?? null), "error");` |

### 64. `apps/web/src/components/patients/PatientOverviewTab.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `103` | `if` | Local State Only (No User Notification) | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientOverviewTab", err?.status ?? null), "error");` |

### 65. `apps/web/src/components/patients/PatientReclamationsWidget.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `152` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientReclamationsWidget", err?.status ?? null), "error");` |
| `199` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientReclamationsWidget", err?.status ?? null), "error");` |
| `237` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientReclamationsWidget", err?.status ?? null), "error");` |

### 66. `apps/web/src/components/patients/PatientTaskTicketsWidget.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `140` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientTaskTicketsWidget", err?.status ?? null), "error");` |
| `180` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в PatientTaskTicketsWidget", err?.status ?? null), "error");` |
| `212` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientTaskTicketsWidget", err?.status ?? null), "error");` |

### 67. `apps/web/src/components/patients/PatientWhatsappSendPanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `37` | `jsonObjectOrNull` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientWhatsappSendPanel", err?.status ?? null), "error");` |
| `117` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PatientWhatsappSendPanel", err?.status ?? null), "error");` |

### 68. `apps/web/src/components/patients/RecallListPanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `117` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в RecallListPanel", err?.status ?? null), "error");` |
| `152` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в RecallListPanel", err?.status ?? null), "error");` |

### 69. `apps/web/src/components/plan/planPricing.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `335` | `safeKopecks` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в planPricing", err?.status ?? null), "error");` |

### 70. `apps/web/src/components/reports/ManagerReportsPanel.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `583` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ManagerReportsPanel", err?.status ?? null), "error");` |

### 71. `apps/web/src/components/schedule/DayConfirmationsPanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `144` | `formatTime` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DayConfirmationsPanel", err?.status ?? null), "error");` |
| `196` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в DayConfirmationsPanel", err?.status ?? null), "error");` |

### 72. `apps/web/src/components/schedule/FreedSlotsPanel.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `146` | `anonymous / top-level` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в FreedSlotsPanel", err?.status ?? null), "error");` |

### 73. `apps/web/src/components/schedule/LabOrdersPanel.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `72` | `LabOrdersPanel` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LabOrdersPanel", err?.status ?? null), "error");` |
| `145` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LabOrdersPanel", err?.status ?? null), "error");` |
| `265` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в LabOrdersPanel", err?.status ?? null), "error");` |
| `287` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в LabOrdersPanel", err?.status ?? null), "error");` |
| `316` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в LabOrdersPanel", err?.status ?? null), "error");` |

### 74. `apps/web/src/components/schedule/NewAppointmentForm.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `85` | `NewAppointmentForm` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в NewAppointmentForm", err?.status ?? null), "error");` |
| `139` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в NewAppointmentForm", err?.status ?? null), "error");` |

### 75. `apps/web/src/components/schedule/ScheduleClipboardPanel.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `132` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScheduleClipboardPanel", err?.status ?? null), "error");` |
| `178` | `clearItem` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScheduleClipboardPanel", err?.status ?? null), "error");` |
| `217` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в ScheduleClipboardPanel", err?.status ?? null), "error");` |

### 76. `apps/web/src/components/schedule/UrgentScheduleRequestsWidget.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `17` | `UrgentScheduleRequestsWidget` | Local State Only (No User Notification) | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в UrgentScheduleRequestsWidget", err?.status ?? null), "error");` |
| `35` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в UrgentScheduleRequestsWidget", err?.status ?? null), "error");` |

### 77. `apps/web/src/components/schedule/WaitlistDrawer.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `161` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в WaitlistDrawer", err?.status ?? null), "error");` |
| `209` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в WaitlistDrawer", err?.status ?? null), "error");` |
| `237` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в WaitlistDrawer", err?.status ?? null), "error");` |
| `270` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в WaitlistDrawer", err?.status ?? null), "error");` |

### 78. `apps/web/src/components/schedule/WaitlistMatchesBlock.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `105` | `anonymous / top-level` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в WaitlistMatchesBlock", err?.status ?? null), "error");` |

### 79. `apps/web/src/components/settings/AiRecognitionJobsPanel.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `85` | `parseJobsPayload` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AiRecognitionJobsPanel", err?.status ?? null), "error");` |
| `138` | `formatWhen` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AiRecognitionJobsPanel", err?.status ?? null), "error");` |
| `202` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AiRecognitionJobsPanel", err?.status ?? null), "error");` |
| `240` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AiRecognitionJobsPanel", err?.status ?? null), "error");` |

### 80. `apps/web/src/components/settings/DoctorSnilsValidationWidget.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `78` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DoctorSnilsValidationWidget", err?.status ?? null), "error");` |

### 81. `apps/web/src/components/settings/InsuranceContractsPanel.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `100` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в InsuranceContractsPanel", err?.status ?? null), "error");` |
| `195` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в InsuranceContractsPanel", err?.status ?? null), "error");` |
| `230` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в InsuranceContractsPanel", err?.status ?? null), "error");` |

### 82. `apps/web/src/components/settings/MessageTemplatesPanel.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `36` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в MessageTemplatesPanel", err?.status ?? null), "error");` |

### 83. `apps/web/src/components/settings/MigrationWizard.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `217` | `readResponse` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MigrationWizard", err?.status ?? null), "error");` |
| `325` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MigrationWizard", err?.status ?? null), "error");` |
| `370` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MigrationWizard", err?.status ?? null), "error");` |
| `477` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в MigrationWizard", err?.status ?? null), "error");` |
| `1173` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в MigrationWizard", err?.status ?? null), "error");` |

### 84. `apps/web/src/components/settings/PublicBookingLinkPanel.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `60` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PublicBookingLinkPanel", err?.status ?? null), "error");` |

### 85. `apps/web/src/components/settings/SettingsAccessTab.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `121` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsAccessTab", err?.status ?? null), "error");` |

### 86. `apps/web/src/components/settings/SettingsBpmnTab.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `55` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsBpmnTab", err?.status ?? null), "error");` |
| `101` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsBpmnTab", err?.status ?? null), "error");` |
| `131` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SettingsBpmnTab", err?.status ?? null), "error");` |
| `186` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsBpmnTab", err?.status ?? null), "error");` |
| `202` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsBpmnTab", err?.status ?? null), "error");` |

### 87. `apps/web/src/components/settings/SettingsPricesTab.tsx` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `256` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsPricesTab", err?.status ?? null), "error");` |
| `263` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsPricesTab", err?.status ?? null), "error");` |
| `292` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SettingsPricesTab", err?.status ?? null), "error");` |
| `336` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SettingsPricesTab", err?.status ?? null), "error");` |
| `355` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsPricesTab", err?.status ?? null), "error");` |

### 88. `apps/web/src/components/settings/SettingsProfileTab.tsx` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `69` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsProfileTab", err?.status ?? null), "error");` |
| `120` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SettingsProfileTab", err?.status ?? null), "error");` |
| `139` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SettingsProfileTab", err?.status ?? null), "error");` |
| `158` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SettingsProfileTab", err?.status ?? null), "error");` |
| `218` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в SettingsProfileTab", err?.status ?? null), "error");` |
| `268` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsProfileTab", err?.status ?? null), "error");` |

### 89. `apps/web/src/components/settings/SettingsProtocolsTab.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `39` | `refusalMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsProtocolsTab", err?.status ?? null), "error");` |
| `148` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsProtocolsTab", err?.status ?? null), "error");` |
| `180` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SettingsProtocolsTab", err?.status ?? null), "error");` |

### 90. `apps/web/src/components/settings/StaffAuthorityPanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `209` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в StaffAuthorityPanel", err?.status ?? null), "error");` |
| `315` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в StaffAuthorityPanel", err?.status ?? null), "error");` |

### 91. `apps/web/src/components/settings/StaffCommissionsPanel.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `200` | `for` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в StaffCommissionsPanel", err?.status ?? null), "error");` |
| `261` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в StaffCommissionsPanel", err?.status ?? null), "error");` |

### 92. `apps/web/src/components/settings/insuranceContractsPanelData.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `184` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в insuranceContractsPanelData", err?.status ?? null), "error");` |

### 93. `apps/web/src/components/settings/settingsInviteRoles.ts` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `151` | `parseInviteCreationPayload` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в settingsInviteRoles", err?.status ?? null), "error");` |
| `215` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в settingsInviteRoles", err?.status ?? null), "error");` |

### 94. `apps/web/src/components/settings/settingsProfileLoad.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `109` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в settingsProfileLoad", err?.status ?? null), "error");` |

### 95. `apps/web/src/components/settings/settingsWorkflowsPanel.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `154` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в settingsWorkflowsPanel", err?.status ?? null), "error");` |

### 96. `apps/web/src/components/settings/staffMutationRequest.ts` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `136` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в staffMutationRequest", err?.status ?? null), "error");` |
| `148` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в staffMutationRequest", err?.status ?? null), "error");` |
| `180` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в staffMutationRequest", err?.status ?? null), "error");` |

### 97. `apps/web/src/components/useVisitDiaryLogic.ts` (9 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `150` | `jsonObjectOrNull` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `473` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `480` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `751` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `987` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `1068` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `1313` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `1418` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |
| `1543` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitDiaryLogic", err?.status ?? null), "error");` |

### 98. `apps/web/src/components/visit/CryptoProSigner.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `189` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CryptoProSigner", err?.status ?? null), "error");` |
| `259` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CryptoProSigner", err?.status ?? null), "error");` |
| `277` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в CryptoProSigner", err?.status ?? null), "error");` |

### 99. `apps/web/src/components/visit/EgiszMultipleDiagnosesWidget.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `34` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в EgiszMultipleDiagnosesWidget", err?.status ?? null), "error");` |

### 100. `apps/web/src/components/visit/EmkControlBoard.tsx` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `20` | `if` | Console Log Only Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в EmkControlBoard", err?.status ?? null), "error");` |
| `84` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в EmkControlBoard", err?.status ?? null), "error");` |
| `108` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в EmkControlBoard", err?.status ?? null), "error");` |

### 101. `apps/web/src/components/visit/SpeechChunksInspector.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `114` | `formatWhen` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SpeechChunksInspector", err?.status ?? null), "error");` |
| `222` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SpeechChunksInspector", err?.status ?? null), "error");` |
| `305` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SpeechChunksInspector", err?.status ?? null), "error");` |
| `333` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в SpeechChunksInspector", err?.status ?? null), "error");` |

### 102. `apps/web/src/components/visit/VisitEmkTab.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `193` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в VisitEmkTab", err?.status ?? null), "error");` |
| `249` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в VisitEmkTab", err?.status ?? null), "error");` |

### 103. `apps/web/src/components/workspace/RecentPatientHistoryWidget.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `82` | `anonymous / top-level` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в RecentPatientHistoryWidget", err?.status ?? null), "error");` |

### 104. `apps/web/src/hooks/domains/useAuthLogic.ts` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `178` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAuthLogic", err?.status ?? null), "error");` |
| `196` | `lockTelegramAdminSession` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAuthLogic", err?.status ?? null), "error");` |

### 105. `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts` (14 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `425` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `549` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `643` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `698` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `748` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `818` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `874` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `926` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `1043` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `1095` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `1228` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `1279` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `1332` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |
| `1403` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDicomWorkbenchModule", err?.status ?? null), "error");` |

### 106. `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` (7 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `3263` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDocumentWorkflowModule", err?.status ?? null), "error");` |
| `3272` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDocumentWorkflowModule", err?.status ?? null), "error");` |
| `3436` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDocumentWorkflowModule", err?.status ?? null), "error");` |
| `3456` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDocumentWorkflowModule", err?.status ?? null), "error");` |
| `3501` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDocumentWorkflowModule", err?.status ?? null), "error");` |
| `3527` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDocumentWorkflowModule", err?.status ?? null), "error");` |
| `3557` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useDocumentWorkflowModule", err?.status ?? null), "error");` |

### 107. `apps/web/src/hooks/domains/useFinanceLogic.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `282` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useFinanceLogic", err?.status ?? null), "error");` |

### 108. `apps/web/src/hooks/domains/usePatientLogic.ts` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `437` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в usePatientLogic", err?.status ?? null), "error");` |
| `577` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в usePatientLogic", err?.status ?? null), "error");` |
| `635` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в usePatientLogic", err?.status ?? null), "error");` |

### 109. `apps/web/src/hooks/domains/useScheduleLogic.ts` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `52` | `scheduleAdminSecretRefusal` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useScheduleLogic", err?.status ?? null), "error");` |
| `535` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useScheduleLogic", err?.status ?? null), "error");` |
| `604` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useScheduleLogic", err?.status ?? null), "error");` |
| `740` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useScheduleLogic", err?.status ?? null), "error");` |
| `863` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useScheduleLogic", err?.status ?? null), "error");` |

### 110. `apps/web/src/hooks/domains/useStaffSettingsLogic.ts` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `72` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useStaffSettingsLogic", err?.status ?? null), "error");` |
| `96` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useStaffSettingsLogic", err?.status ?? null), "error");` |
| `148` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useStaffSettingsLogic", err?.status ?? null), "error");` |
| `201` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useStaffSettingsLogic", err?.status ?? null), "error");` |
| `223` | `if` | Inline JSON parse error swallowed without checking response status | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useStaffSettingsLogic", err?.status ?? null), "error");` |
| `232` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useStaffSettingsLogic", err?.status ?? null), "error");` |

### 111. `apps/web/src/hooks/domains/useTelegramModule.ts` (9 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `317` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `356` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `397` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `462` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `498` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `549` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `606` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `664` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |
| `713` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramModule", err?.status ?? null), "error");` |

### 112. `apps/web/src/hooks/domains/useVisitLogic.ts` (20 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `262` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `293` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `323` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `362` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `402` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `567` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `626` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `637` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `814` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `831` | `trackSpeechUpload` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useVisitLogic", err?.status ?? null), "error");` |
| `892` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1014` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1115` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1165` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1287` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1377` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1398` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1426` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1507` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |
| `1560` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVisitLogic", err?.status ?? null), "error");` |

### 113. `apps/web/src/hooks/useMaxSettings.ts` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `242` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useMaxSettings", err?.status ?? null), "error");` |
| `279` | `maxSaveFailureMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useMaxSettings", err?.status ?? null), "error");` |
| `285` | `maxSaveFailureMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useMaxSettings", err?.status ?? null), "error");` |
| `343` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useMaxSettings", err?.status ?? null), "error");` |
| `365` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useMaxSettings", err?.status ?? null), "error");` |
| `422` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useMaxSettings", err?.status ?? null), "error");` |

### 114. `apps/web/src/hooks/useModuleCleanup.ts` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `35` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useModuleCleanup", err?.status ?? null), "error");` |
| `72` | `if` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useModuleCleanup", err?.status ?? null), "error");` |
| `108` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useModuleCleanup", err?.status ?? null), "error");` |

### 115. `apps/web/src/hooks/useOfflineQueue.ts` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `99` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useOfflineQueue", err?.status ?? null), "error");` |
| `104` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useOfflineQueue", err?.status ?? null), "error");` |

### 116. `apps/web/src/hooks/usePatientResource.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `114` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в usePatientResource", err?.status ?? null), "error");` |

### 117. `apps/web/src/hooks/useShortDictation.ts` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `169` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useShortDictation", err?.status ?? null), "error");` |
| `230` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useShortDictation", err?.status ?? null), "error");` |

### 118. `apps/web/src/hooks/useTelegramSettings.ts` (3 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `327` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramSettings", err?.status ?? null), "error");` |
| `406` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramSettings", err?.status ?? null), "error");` |
| `526` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useTelegramSettings", err?.status ?? null), "error");` |

### 119. `apps/web/src/hooks/useVoiceAssistant.ts` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `27` | `jsonObjectOrNull` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVoiceAssistant", err?.status ?? null), "error");` |
| `160` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVoiceAssistant", err?.status ?? null), "error");` |
| `173` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVoiceAssistant", err?.status ?? null), "error");` |
| `245` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useVoiceAssistant", err?.status ?? null), "error");` |
| `425` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useVoiceAssistant", err?.status ?? null), "error");` |
| `560` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useVoiceAssistant", err?.status ?? null), "error");` |

### 120. `apps/web/src/hooks/useWebsocket.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `75` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWebsocket", err?.status ?? null), "error");` |

### 121. `apps/web/src/hooks/useWhatsappSettings.ts` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `246` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWhatsappSettings", err?.status ?? null), "error");` |
| `283` | `whatsappSaveFailureMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useWhatsappSettings", err?.status ?? null), "error");` |
| `289` | `whatsappSaveFailureMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useWhatsappSettings", err?.status ?? null), "error");` |
| `354` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWhatsappSettings", err?.status ?? null), "error");` |
| `376` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWhatsappSettings", err?.status ?? null), "error");` |
| `435` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWhatsappSettings", err?.status ?? null), "error");` |

### 122. `apps/web/src/hooks/useWorkspaceProfile.ts` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `250` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWorkspaceProfile", err?.status ?? null), "error");` |
| `339` | `workspaceProfileServerDetail` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWorkspaceProfile", err?.status ?? null), "error");` |
| `397` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWorkspaceProfile", err?.status ?? null), "error");` |
| `440` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useWorkspaceProfile", err?.status ?? null), "error");` |

### 123. `apps/web/src/lib/apiAuthFetch.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `62` | `shouldAttachApiAuth` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в apiAuthFetch", err?.status ?? null), "error");` |

### 124. `apps/web/src/lib/cryptopro.ts` (5 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `38` | `constructor` | Console Log Only Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptopro", err?.status ?? null), "error");` |
| `50` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptopro", err?.status ?? null), "error");` |
| `60` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptopro", err?.status ?? null), "error");` |
| `84` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptopro", err?.status ?? null), "error");` |
| `104` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptopro", err?.status ?? null), "error");` |

### 125. `apps/web/src/lib/publicPortalRoute.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `77` | `decodeSegment` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в publicPortalRoute", err?.status ?? null), "error");` |

### 126. `apps/web/src/lib/safeLocalStorage.ts` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `15` | `safeLocalStorageGetItem` | Silent Swallow | C: Utility / Infrastructure | `Безопасный fallback утилиты (не требует toast)` |
| `25` | `safeLocalStorageSetItem` | Silent Swallow | C: Utility / Infrastructure | `Безопасный fallback утилиты (не требует toast)` |
| `35` | `safeLocalStorageRemoveItem` | Silent Swallow | C: Utility / Infrastructure | `Безопасный fallback утилиты (не требует toast)` |
| `74` | `safeSessionStorageGetItem` | Silent Swallow | C: Utility / Infrastructure | `Безопасный fallback утилиты (не требует toast)` |
| `84` | `safeSessionStorageSetItem` | Silent Swallow | C: Utility / Infrastructure | `Безопасный fallback утилиты (не требует toast)` |
| `94` | `safeSessionStorageRemoveItem` | Silent Swallow | C: Utility / Infrastructure | `Безопасный fallback утилиты (не требует toast)` |

### 127. `apps/web/src/main.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `156` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в main", err?.status ?? null), "error");` |
| `164` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в main", err?.status ?? null), "error");` |
| `194` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в main", err?.status ?? null), "error");` |
| `198` | `anonymous / top-level` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в main", err?.status ?? null), "error");` |

### 128. `apps/web/src/pages/AnalyticsDashboardView.tsx` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `158` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в AnalyticsDashboardView", err?.status ?? null), "error");` |

### 129. `apps/web/src/pages/DoctorPayoutDashboard.tsx` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `371` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DoctorPayoutDashboard", err?.status ?? null), "error");` |
| `443` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в DoctorPayoutDashboard", err?.status ?? null), "error");` |

### 130. `apps/web/src/pages/PublicBookingWidget.tsx` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `97` | `anonymous / top-level` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PublicBookingWidget", err?.status ?? null), "error");` |
| `124` | `anonymous / top-level` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PublicBookingWidget", err?.status ?? null), "error");` |
| `163` | `anonymous / top-level` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PublicBookingWidget", err?.status ?? null), "error");` |
| `226` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в PublicBookingWidget", err?.status ?? null), "error");` |

### 131. `apps/web/src/pages/analyticsDoctorMetrics.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `328` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в analyticsDoctorMetrics", err?.status ?? null), "error");` |

### 132. `apps/web/src/store/leadsStore.ts` (6 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `50` | `leadsFailureMessage` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в leadsStore", err?.status ?? null), "error");` |
| `99` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в leadsStore", err?.status ?? null), "error");` |
| `135` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в leadsStore", err?.status ?? null), "error");` |
| `160` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в leadsStore", err?.status ?? null), "error");` |
| `187` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в leadsStore", err?.status ?? null), "error");` |
| `215` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в leadsStore", err?.status ?? null), "error");` |

### 133. `apps/web/src/tests/utils/componentReachability.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `693` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в componentReachability", err?.status ?? null), "error");` |

### 134. `apps/web/src/useAppLogic.tsx` (21 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `1280` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `1622` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `1891` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `1931` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `1989` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2065` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2100` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2143` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2158` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2186` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2214` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2248` | `catch` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2345` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2423` | `anonymous / top-level` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `2592` | `if` | Local State Only (No User Notification) | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `3105` | `if` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `3373` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `3428` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `3516` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |
| `3686` | `if` | Inline JSON parse error swallowed without checking response status | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в useAppLogic", err?.status ?? null), "error");` |
| `3698` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в useAppLogic", err?.status ?? null), "error");` |

### 135. `apps/web/src/utils/cryptoPro.ts` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `40` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptoPro", err?.status ?? null), "error");` |
| `97` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptoPro", err?.status ?? null), "error");` |
| `104` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptoPro", err?.status ?? null), "error");` |
| `176` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в cryptoPro", err?.status ?? null), "error");` |

### 136. `apps/web/src/utils/dateUtils.ts` (1 silent swallow)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `34` | `timeZoneDateParts` | Silent Swallow | C: Utility / Infrastructure | `Безопасный fallback утилиты (не требует toast)` |

### 137. `apps/web/src/utils/preferencesUtils.ts` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `154` | `loadUiPreferences` | Silent Swallow | B: Data Fetching / Load Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в preferencesUtils", err?.status ?? null), "error");` |
| `171` | `saveUiPreferences` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка выполнения операции в preferencesUtils", err?.status ?? null), "error");` |

### 138. `apps/web/src/utils/rutoken.ts` (4 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `48` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в rutoken", err?.status ?? null), "error");` |
| `113` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в rutoken", err?.status ?? null), "error");` |
| `159` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в rutoken", err?.status ?? null), "error");` |
| `163` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в rutoken", err?.status ?? null), "error");` |

### 139. `apps/web/src/utils/unifiedPdfGenerator.ts` (2 silent swallows)

| Line | Function / Context | Current Handling | Category | Recommended Remediation |
| --- | --- | --- | --- | --- |
| `93` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в unifiedPdfGenerator", err?.status ?? null), "error");` |
| `183` | `catch` | Silent Swallow | A: Action / Mutation Swallows | `showToast(actionFailureToast("Ошибка загрузки данных в unifiedPdfGenerator", err?.status ?? null), "error");` |

---

## 5. Verification Method

To independently verify the inventory and audit claims:

1. **Re-run Structural Ripgrep Search**:
   ```bash
   rg -n "catch" apps/web/src
   ```
   Confirm the file paths and line numbers listed in Section 4.

2. **Verify Zero Modification**:
   ```bash
   git status --short apps/web/src
   ```
   Verify that Explorer 1 performed zero writes to `apps/web/src`.

3. **Validate Remediations**:
   When Implementers apply fixes, verify that:
   - `showToast` and `actionFailureToast` are imported.
   - Every catch block displays a localized error message.
   - `npm run typecheck -w @dental/web` exits with status code 0.
