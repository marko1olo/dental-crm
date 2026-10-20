# Handoff Report — Milestone 3 (teamwork_preview_worker_m3_data_purity)

## 1. Observation
1. **TreatmentPipeline.tsx**:
   - In `apps/web/src/pages/coordinator/TreatmentPipeline.tsx`, `TreatmentPlanPresenterModal` was previously invoked with hardcoded fallback `"Стоматологическая клиника"`, `"Лечащий врач"`, and dashes `"—"` for requisites.
   - Live clinic branding and organization data existed in `useDocumentBrandingStore` (`branding.clinicName`, `branding.clinicLegalName`, `branding.clinicInn`, `branding.clinicOgrn`, `branding.clinicAddress`) and `useOptionalAppLogicContext` (`appLogic?.dashboard?.organization`).
   - If a treatment card had no assigned doctor, it fell back to `"Лечащий врач"` without warning or selection capability.

2. **DoctorPayoutDashboard.tsx & DoctorPayrollModal.tsx**:
   - In `apps/web/src/components/payroll/DoctorPayrollModal.tsx`, line 35 hardcoded default `clinicName = "ООО «Денте Стоматология»"`.
   - In `apps/web/src/components/payroll/useDoctorPayrollModalState.ts`, lines 26-28 previously auto-selected the first doctor in `doctorsList[0]`, which in standalone/demo routes fetched synthetic services for "doc-voronov" totaling 61 500 ₽.
   - When no doctor was selected, `DoctorPayrollModalContent` previously still displayed empty rental tables and 0 kopeck calculations instead of an honest `EmptyState`.

3. **HeaderGlobalSearch.tsx**:
   - In `apps/web/src/components/headerModules/HeaderGlobalSearch.tsx`, lines 20-39 defined `SAMPLE_PATIENTS` containing "Иванов Иван Иванович", "Смирнова Анна Сергеевна", and "Кузнецов Дмитрий Павлович".
   - The search previously filtered only in-memory loaded dashboard patients with fallback to `SAMPLE_PATIENTS`.
   - The backend route `GET /api/patients?search=...` (implemented in `apps/api/src/routes/patients/crudRoutes.ts:45`) supports debounced search over names and phone numbers.

4. **TreatmentPlanPriceValidatorModal.tsx**:
   - In `apps/web/src/components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx`, line 261 contained:
     `return teeth.length > 0 ? Array.from(new Set(teeth)) : [21];`
     This silently injected tooth 21 (central incisor) into every lab order even when the plan contained no teeth.
   - Lines 69 and 71 in `EMPTY_PLAN_PAYLOAD` contained dummy placeholders `"Пациент"` and `"Врач"`.
   - `handleGenerateWorkOrder` and `handleGenerateCompletedAct` lacked explicit guards ensuring patient and items existed before generating orders/acts.

5. **fastPrintConsentAndMemoBuilder.ts & fastPrintDiaryBuilder.ts**:
   - In `apps/web/src/components/visit/view/fastPrintModules/fastPrintConsentAndMemoBuilder.ts`, lines 219-222 and 325-329 contained synthetic service items with prices 1500, 4500, 5500, 4800, and 12500 ₽.
   - In `fastPrintDiaryBuilder.ts`, `extractClinicRequisites` omitted `dashboard?.clinicSettings`.

6. **MobileChairsideEHR.tsx**:
   - In `apps/web/src/components/mobile/MobileChairsideEHR.tsx`, lines 87-90 initialized state with:
     `const [diagnosis, setDiagnosis] = useState<string>("К02.1 Кариес дентина");`
     `const [treatmentPlan, setTreatmentPlan] = useState<string>("Препарирование, медикаментозная обработка, пломбирование светоотверждаемым композитом");`
     This pre-filled every new chairside encounter with caries and preparation regardless of clinical reason.

## 2. Logic Chain
1. By binding `TreatmentPipeline.tsx` to `useDocumentBrandingStore` and `useOptionalAppLogicContext`, requisites are derived dynamically from the clinic's real settings. If requisites are unpopulated, a floating amber warning bar (`⚠️ Реквизиты клиники не заполнены в профиле организации (Настройки -> Клиника)`) warns the user. If doctor is unassigned, a staff selector `<select data-testid="pipeline-doctor-assign-select">` lets the user select an active doctor from staff or displays «Врач не назначен».
2. By eradicating `clinicName = "ООО «Денте Стоматология»"` from `DoctorPayrollModal.tsx` and dynamically resolving it from `branding`/`organization`, and updating `useDoctorPayrollModalState` to initialize `selectedDoctorId` to `params.initialDoctorId || ""` (returning `activeDoc: null` and all 0 kopeck fields with label "Врач не выбран" when unselected), `DoctorPayrollModalContent` now displays an honest `EmptyState` («Выберите врача для формирования расчетного листа») with a dropdown of available clinic doctors. In `DoctorPayoutDashboard.tsx`, `dente:open-doctor-payroll` event without a doctor opens the modal in this honest EmptyState.
3. By removing `SAMPLE_PATIENTS` and implementing a 250ms debounced `fetch` to `/api/patients?search=${encodeURIComponent(query)}&limit=25`, `HeaderGlobalSearch.tsx` queries live patients from PostgreSQL 18, shows a loading spinner, displays results cleanly with birth year, and renders an honest empty state (`Пациенты не найдены по запросу «...»`) when no match exists.
4. By changing `[21]` to `[]` in `TreatmentPlanPriceValidatorModal.tsx`, setting `EMPTY_PLAN_PAYLOAD` patient/doctor names to `""`, and adding validation guards to `handleGenerateWorkOrder` and `handleGenerateCompletedAct`, no phantom teeth are injected into `LabWorkOrderModal` and empty plans produce clear feedback.
5. In `fastPrintConsentAndMemoBuilder.ts`, replacing fallback items with `Array.isArray(activePlan?.items) ? activePlan.items : []` and rendering empty state rows (`Услуги не выбраны` / `Позиции плана лечения не указаны`) eliminates phantom 1500–12500 ₽ services. In `fastPrintDiaryBuilder.ts`, `extractClinicRequisites` now checks `clinicSettings`.
6. In `MobileChairsideEHR.tsx`, accepting `initialDiagnosis = ""` and `initialTreatmentPlan = ""` and initializing state to empty strings ensures clean new encounters, while preserving 1-tap template items for rapid filling on demand.

## 3. Caveats
- `PayrollStandaloneLauncher.tsx` is strictly guarded by `if (!isDemoShowcaseMode()) return null;`. Dev-mode bypass was removed to prevent leakage of demo services in development unless demo showcase mode is explicitly activated.
- The single-compiler lockout (Mandate 8t) was respected: heavy whole-monorepo `npm run typecheck` was not run; targeted test runs (`node --import tsx --import ./testCssStub.mjs --test ...`) verified syntactic, functional, and structural correctness.

## 4. Conclusion
All synthetic dummy data, fake fallbacks, hardcoded names, and fake requisites identified in Milestone 3 have been completely eradicated across `TreatmentPipeline`, `DoctorPayoutDashboard` / `DoctorPayrollModal`, `HeaderGlobalSearch`, `TreatmentPlanPriceValidatorModal`, `fastPrintConsentAndMemoBuilder`, and `MobileChairsideEHR`. All modified modules strictly obey Mandates 8f, 8am (100% honesty, zero mocks), 8wy (production vs demo showcase isolation), and 8e/8n (clinician autonomy).

## 5. Verification Method
Execute the following verification command in `apps/web`:
```powershell
node --import tsx --import ./testCssStub.mjs --test "src/tests/milestone3DataPurityInquisition.test.ts" "src/tests/mobileHigPrimitivesAndChairside.test.tsx" "src/tests/planPriceValidation.test.ts" "src/components/payroll/__tests__/payrollTimesheetSoloDoctorAutonomy.test.ts"
```
Expected output: 50 passing tests across 11 test suites with exit code 0.
