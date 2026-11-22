# Доказательства верификации: Модуль ДМС и сплит со-оплаты (Insurance, VMI & DMS Co-Pay)

## 1. Архитектурный манифест хирургической чистки (Red Team Fixer — Мандаты 8e, 8n, 8x, 8bf, 8bm)
1. Искоренение бюрократического сленга («804н»):
   - Файл `dmsNomenclature804n.ts` физически удален (`git rm`) и заменен на канонический SSOT `packages/shared/src/insurance/catalogs/dmsServiceNomenclature.ts`.
   - Все термины и функции приведены к клиническому стандарту: `DMS_SERVICE_CATALOG`, `DmsServiceNomenclatureItem`, `searchDmsServices`, `getDmsServiceByCode`.
   - В UI: в `InsuranceDmsTariffTable.tsx` заголовок «804н / Категория» заменен на «Каталог процедур» / «Код услуги и раздел». В карточке пациента (`PatientInsuranceSection.tsx`, `SnilsOmsFields.tsx`) убран чуждый частной клинике «Полис ОМС», оставлены «Страхование ДМС» и «СНИЛС для налогового вычета 13%».
2. **Снос дубликата модалки (`git rm`):**
   - Удален `apps/web/src/components/insurance/DmsGuaranteeLetterModal.tsx` (`git rm`). Все точки вызова в интерфейсе клиники (`ReportsComplianceLaunchers.tsx`, `PatientCardModalSubModals.tsx`, `VisitBillingModals.tsx`) переведены на каноническую шторку `DmsStudioModal.tsx`.
3. **Консолидация микро-шредера в `@dental/shared/src/insurance/`:**
   - 11 микро-файлов `guaranteeModules/` и 12 микро-файлов `registryModules/` консолидированы в чистые SSOT модули `guaranteeLetters.ts` и `claimsRegistry.ts`.
   - 1313-строчный монолит `dmsPresetsAndCatalogs.ts` зачищен от дублирующихся интерфейсов и удален мертвый калькулятор `calculateServiceDmsDistribution`.
4. **Канонический копеечный контракт `DmsCoPaymentSplitResult`:**
   - В `dmsFranchiseEngine.ts` устранена шизофрения алиасов. Закреплен единый типизированный контракт на копейках: `totalBillKopecks`, `dmsCoveredKopecks`, `patientCoPayKopecks`, `lineItems`.
   - В `DmsPolicyCard.tsx` удален ручной расчет `Math.round(val * 100)`, форматирование ведется строго через `@dental/shared/src/money.ts`.
5. Снятие блокировок врача (Мандат 8e — Автономия врача):
   - В бэкенде `guaranteeLetterUsageHandlers.ts` ликвидирована блокирующая ошибка HTTP 400 `LimitExceeded`. При превышении остатка гарантийного письма доступный остаток тихо списывается на страховую компанию, статус письма переводится в `exhausted`, а оставшаяся разница переносится в сооплату пациента (`patientCoPayKopecks`) без остановки приёма.
6. Поддержка демо-режима и строковых ID пациентов:
   - В `apps/api/src/routes/insuranceRoutes/types.ts` Zod-валидация `patientId` ослаблена с жесткого UUID до `z.string().min(1).optional()`, поддерживая ID `pat-1` и `pat-dms-01`.
   - В `DirectInsuranceLauncher.tsx` устранен баг перезаписи активного пациента демо-именем.
   - В `useDmsStudioState.ts` убран небезопасный вызов `window.open` + `document.write`, заменен на изолированную печать через `printHtmlViaIframe`.

---

## 2. 4-State Visual Proofs (Личный осмотр аудитором)
- ☀️ PC Light (1440x900): `01_dms_studio_pc_light_1440x900.png` — идеальный контраст, Sentence case, чипы ТОП-6 страховщиков РФ, единый Primary CTA «Утвердить ДМС-сплит».
- 🌙 PC Dark (1440x900): `02_dms_studio_pc_dark_1440x900.png` — 100% тёмные токены `var(--paper)`, `var(--line)`, WCAG AAA, zero-clipping.
- 📱 Mobile Light (390x844): `03_dms_studio_mobile_light_390x844.png` — Apple HIG Bottom Sheet, хитбоксы $\ge 44$px, кнопка в Natural Thumb Zone, 0px горизонтального скролла.
- 📱 Mobile Dark (390x844): `04_dms_studio_mobile_dark_390x844.png` — темная сенсорная эргономика, аккуратные бейджи и чипы без обрезания слов.

---

## 3. Матрица верификации тестов
- `billingAndInsuranceMockPurity.test.ts`: 6/6 PASS
- `dmsGuaranteePersistence.test.ts`: 1/1 PASS (ACID транзакция и мягкое списание остатка ГП с переносом в сооплату)
- `insuranceGuaranteeLetterSafety.test.ts`: 6/6 PASS (Postgres 22P02, UUID guard, mandatory Idempotency-Key)
- `dmsFranchiseEngine.test.ts`: 21/21 PASS (целочисленный расчет франшизы и сплита копейка-в-копейку)
- `dmsInsurance.test.ts`: 15/15 PASS
- `insuranceMathRegistry.test.ts`: 4/4 PASS
- `wave115MockPurification.test.ts`: 6/6 PASS
- `wave116MockAndEmojiPurification.test.ts`: 5/5 PASS
- `check:diff`: 0 костылей, 0 float-money, 0 as any (Exit Code 0)
- `check:encoding`: 20 025 файлов в UTF-8 без BOM, 0 моджибаке (Exit Code 0)
- `packages/shared`: 0 ошибок TypeScript (Exit Code 0)
- `apps/web/src/components/insurance/`: 0 ошибок TypeScript (Exit Code 0)
