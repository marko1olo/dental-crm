## 2026-10-20T06:36:35Z
[PARAGRAPH 1: РОЛЬ, СТАТУС И КОНСТИТУЦИЯ]
Ты назначен Судебным Аудитором Честности Milestone 3 Gen 2 (teamwork_preview_auditor_m3_gen2). Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_auditor_m3_gen2. Твой родитель — 1dba1dd3-1b54-431d-9253-a722303ba51f.
В первом шаге открой через view_file и прочитай конституционные документы: C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md (раздел R3 — Eradication of Production Hardcoded Fallbacks & Silent Dummy Data), C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md и C:\Clinic_MVP\dental-crm\.agents\AGENTS.md (Мандаты 8f, 8am честность 100%, 8wy боевой прод vs демо-витрина).

[PARAGRAPH 2: СЫРЫЕ СЛОВА СОЗДАТЕЛЯ 1:1 И МАНДАТ ЧЕСТНОСТИ]
Сырые слова создателя из C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md:
«R3. Eradication of Production Hardcoded Fallbacks & Silent Dummy Data:
- Eliminate hardcoded sample patients (SAMPLE_PATIENTS in HeaderGlobalSearch.tsx).
- Eliminate synthetic payroll calculations (61 500 ₽ / 6,150,000 kopecks) and dummy doctor names in DoctorPayoutDashboard.tsx and DoctorPayrollModal.tsx.
- Eliminate hardcoded clinic requisites in TreatmentPipeline.tsx.
- Eliminate hardcoded tooth fallbacks (e.g. tooth [21]) in TreatmentPlanPriceValidatorModal.tsx.
- Eliminate synthetic services in fastPrintConsentAndMemoBuilder.ts and hardcoded caries K02.1 in MobileChairsideEHR.tsx.»

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

[PARAGRAPH 3: ТЕХНИЧЕСКИЙ СКОУП ЭКСПЕРТИЗЫ]
Предыдущий воркер реализовал изменения в коммите `a26be4a9a` («feat(data-purity): eradicate hardcoded fallbacks and silent dummy data across CRM»).
Ревьюеры Reviewer M3_1 и Reviewer M3_2 оба выдали вердикт APPROVE.
Твоя задача — провести финальную независимую судебно-техническую экспертизу (Forensic Integrity Audit):
1. Anti-Cheat / Zero-Mocks инспекция:
   - Проверь `apps/web/src/components/HeaderGlobalSearch.tsx`: убедись, что нет скрытых массивов `SAMPLE_PATIENTS` или их копий под другими именами.
   - Проверь `apps/web/src/components/payroll/DoctorPayrollModal.tsx` и `apps/web/src/components/DoctorPayoutDashboard.tsx`: убедись, что нет зашитых 61 500 ₽, при отсутствии доктора рендерится честный `EmptyState`.
   - Проверь `apps/web/src/pages/coordinator/TreatmentPipeline.tsx`: убедись, что реквизиты читаются из стора `useDocumentBrandingStore` и контекста, а при отсутствии выводится предупреждающая плашка.
   - Проверь `apps/web/src/components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx`: убедись, что зуб [21] нигде не подставляется по умолчанию, пустой план блокирует наряд ЗТЛ.
2. Anti-Tautology Verification:
   - Проверь `apps/web/src/tests/milestone3DataPurityInquisition.test.ts` — убедись, что тесты проверяют реальные условия и структуру, а не являются тривиальными тавтологиями (`assert.ok(true)`).
3. Запусти тесты в `apps/web`:
   `node --import tsx --import ./testCssStub.mjs --test "src/tests/milestone3DataPurityInquisition.test.ts" "src/tests/planPriceValidation.test.ts" "src/components/payroll/__tests__/payrollTimesheetSoloDoctorAutonomy.test.ts"`
4. Сформируй и сохрани `handoff.md` в своей директории `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_auditor_m3_gen2\handoff.md` со строгим бинарным вердиктом: **CLEAN** или **INTEGRITY VIOLATION**.
5. Отправь сообщение оркестратору (1dba1dd3-1b54-431d-9253-a722303ba51f) через send_message с вердиктом и кратким резюме экспертизы.
