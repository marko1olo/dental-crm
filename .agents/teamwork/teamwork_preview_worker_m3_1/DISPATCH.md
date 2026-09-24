## 2026-09-24T18:26:42Z
«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

ТВОЯ ИДЕНТИФИКАЦИЯ:
- Роль: Worker M3 (Statutory & Regulatory Assurance: EGISZ & Prescriptions)
- Archetype: teamwork_preview_worker
- Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m3_1
- Корень проекта: C:\Clinic_MVP\dental-crm
- Официальный файл исходного запроса: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
- Документ проекта: C:\Clinic_MVP\dental-crm\PROJECT.md
- Отчет разведчика (Survey Explorer 3): C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_r3.md и handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

ЖЕСТКИЕ ПРАВИЛА И ОГРАНИЧЕНИЯ (МАНДАТ 8t):
1. Single-Compiler Gate: ВОРКЕРАМ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО запускать глобальный tsc, build или typecheck (`npm run typecheck`, `tsc -b --noEmit`, `npm run build`). Проверяй синтаксис точечно через single-file юнит-тесты (например `npm test -- apps/web/src/components/egisz/__tests__/egiszRemdEngine.test.ts`) или ast-grep.
2. Владение файлами (Write Ownership): ты владеешь исключительно файлами:
   - `apps/web/src/components/egisz/remdXml/egiszRemdPresets.ts`
   - `apps/web/src/components/egisz/cdaR2XmlBuilder.ts`
   - `apps/web/src/components/egisz/EgiszRemdHubModal.tsx`
   - `apps/web/src/components/egisz/__tests__/egiszRemdEngine.test.ts`
   - `apps/web/src/components/prescriptions/PrescriptionPrintModal.tsx`
3. Строгая экспертиза РФ (Мандат 19) и Мандат 8s:
   - Номенклатура 804н, Форма 043/у, ЕГИСЗ (РЭМД CDA R2), Приказ Минздрава 1094н.
   - Никаких западных калек (HIPAA/FDA).
   - Ноль мультяшных эмодзи в медицинских документах.

ТВОЯ БОЕВАЯ ЗАДАЧА:
1. Исправить искажение OID в ЕГИСЗ:
   - В `apps/web/src/components/egisz/remdXml/egiszRemdPresets.ts:29`: изменить `NSI_SEMD_DOC_TYPES` с ошибочного `"1.2.643.5.1.13.13.11.1005"` (МКБ-10) на канонический OID справочника видов СЭМД `"1.2.643.5.1.13.13.11.1522"`, согласовав с `packages/shared/src/cda/oids.ts:40`.
   - В `apps/web/src/components/egisz/__tests__/egiszRemdEngine.test.ts:133`: обновить проверку на канонический OID `"1.2.643.5.1.13.13.11.1522"`.
2. Устранить запрещенный Enveloped XML-DSig в `cdaR2XmlBuilder.ts`:
   - Привести к стандарту Минздрава РФ: открепленная подпись CAdES-BES PKCS#7 (`.sig`), запретить enveloped XML-DSig transforms (`disallowEnvelopedSignature: true`).
3. Вычистить мок подписи:
   - В `apps/web/src/components/egisz/EgiszRemdHubModal.tsx:573`: убрать захардкоженную base64 заглушку `"U0VNRF8xMDVfTU9fU0lHTkFUVVJFCg=="`, обеспечить честное состояние подписания открепленной подписью УКЭП.
4. Проверить электронные рецепты:
   - Убедиться, что `PrescriptionPrintModal.tsx` и сопутствующие модули соответствуют Приказу 1094н (бланки 107-1/у и 148-1/у-88), чистый векторный SVG QR-код, ноль эмодзи.
5. Прогнать изолированный тест:
   `npm test -- apps/web/src/components/egisz/__tests__/egiszRemdEngine.test.ts`.
6. Записать подробный отчет обо всех сделанных изменениях в `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m3_1\handoff.md`.
7. Отправить краткое уведомление через `send_message`.
