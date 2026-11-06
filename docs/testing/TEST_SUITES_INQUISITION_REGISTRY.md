# 🛡️ DENTE CRM — Реестр Инквизиции Тестовой Инфраструктуры (Test Suites Inquisition Registry)

> **Статус документа:** Активный / Single Source of Truth (SSOT)  
> **Мандаты:** Мандат 8a (T.A.R.S. 100% честность), Мандат 8s (CRM против трения), Мандат 8aj (Ось №7: Искоренение regex-тестов исходников), Мандат 8af (Изоляция тестов), Мандат 8d / 8zr (Ноль глотания ошибок).  
> **Роль инквизитора:** Главный Санитар Тестовой Инфраструктуры и Red Team Инквизитор Тестов (L2 Domain Lead).

---

## 1. МАНИФЕСТ RED TEAM ИНКВИЗИЦИИ ТЕСТОВ

Врач и клиника полагаются на надежность медицинских протоколов, точность расчетов сплит-чеков, 54-ФЗ и стабильность базы данных PostgreSQL 18.  
Тесты, которые «зеленеют» лишь потому, что они открывают собственные файлы с диска через `fs.readFileSync` и прогоняют регулярные выражения, либо замалчивают сбои через пустые блоки `catch {}`, являются **СЛУЖЕБНЫМ ПОДЛОГОМ И САБОТАЖЕМ**.  
Они создают фальшивую иллюзию защищенности («все тесты зеленые»), скрывая реальные рантайм-падения, ошибки типов и краши у кресла пациента.

### Железные инварианты тестирования DENTE:
1. **Запрет regex-тестов исходников (Ось №7 Мандата 8aj):** Тест ОБЯЗАН импортировать функцию, класс или схему Zod и выполнять её с реальными аргументами в рантайме. Запрещено читать файлы кода через `fs.readFileSync` для подсчета строк, проверки отсутствия `Math.random()` или эмодзи.
2. **Ноль глотания ошибок (Мандат 8zr):** Запрещены пустые блоки `try { ... } catch {}` в тестах. Любая ошибка обязана фиксироваться (`parseError = err`) и проверяться ассертом `assert.equal(parseError, null)`.
3. **Изоляция окружения (Мандат 8af):** Тесты изолированы от боевых секретов, внешних сетевых вызовов и моков в production-базе.
4. **Математическая точность (Мандат 8e, 8n):** Финансовые расчеты проводятся строго в целых копейках (`amountKopecks`, BIGINT) без потери точности на `float`.

---

## 2. РЕЕСТР ИСКОРЕНЕННЫХ ДЕФЕКТОВ И ПЕРЕПИСАННЫХ ТЕСТ-СЬЮТОВ

| Файл теста | Дефект «ДО» (Фейк / Regex / Ошибка) | Решение «ПОСЛЕ» (Честный рантайм) | Статус |
| :--- | :--- | :--- | :---: |
| `packages/shared/src/lab/labOrders.test.ts` | Читает `labOrders.ts` через `fs.readFileSync`, грепает `Math.random()`. | Проверка энтропии криптографического `batchCode` (LOT-YYYY-XXXXXX), расчет високосных дат (2024-02-29 + 2 года $\to$ 2026-03-01) и Zod-валидация схемы `prostheticWarrantyPassportSchema`. | **PASS (19/19)** |
| `packages/shared/src/radiology/__tests__/wave124ArchDetect.test.ts` | Test 8 читает `archDetectEngine.ts` и `wave124ArchDetect.test.ts` через `fs.readFileSync` с регуляркой на эмодзи. | Тест устойчивости детекции зубной дуги `detectArchControlPoints` при анизотропных вокселях `[0.5, 0.5, 1.5]`, смещенном начале координат `[10, -20, 5]` и пересчете в World/LPS пространство. | **PASS (8/8)** |
| `packages/shared/src/radiology/__tests__/wave125ToothSetup.test.ts` | Раздел 5 читает `toothSetupEngine.ts` и `wave125ToothSetup.test.ts` через `readFileSync` на эмодзи. | Тестирование PCA `principalAxis` на компланарных 2D точках, инвариантность при экстремальном координатном сдвиге ($10^5$), расчет наклонов `anglesFromWorldAxis` для ортогональных осей. | **PASS (19/19)** |
| `packages/shared/src/radiology/__tests__/wave126CbctRegistration.test.ts` | Раздел 8 читает `cbctRegistrationEngine.ts` и тестовый файл через `readFileSync`. | Рантайм-тестирование генератора A4-протокола `formatRegistrationA4Protocol` при отклоненной точности (RMS > 0.5 мм), вывод предупреждений и фолбеки врачей. | **PASS (23/23)** |
| `packages/shared/src/radiology/__tests__/wave123MeasureStats.test.ts` | Раздел 5 читает `measureStatsEngine.ts` через `readFileSync` на эмодзи. | Граничные условия денситометрии кости `calculateImplantBedDensitometry` при crest == apex (длина 0), классификация Миша D3, сэмплирование `lineProfileHU` вне волюма (AIR_HU = -1024). | **PASS (26/26)** |
| `packages/shared/src/clinical/__tests__/clinicalDecompositionParity.test.ts` | Тест 1 читает 10 файлов через `fs.readFileSync`, считая строки `split("\n").length`. | Проверка контракта фасадных функций плейбуков, математической целостности `defaultTotalPriceKopecks` для всех клинических бандлов `CANONICAL_DIAGNOSIS_BUNDLES` и уникальности кодов услуг. | **PASS (6/6)** |
| `packages/shared/src/warehouse/__tests__/defaultServiceBomCatalog.test.ts` | Тест 4 читает директорию `bomModules/` через `fs.readFileSync`, считая строки. | Валидация структуры всех 50 связей каталога `DEFAULT_SERVICE_CONSUMABLE_LINKS` (непустые коды, `quantityPerService > 0`, `costPriceKopecks > 0`), обработка пустого массива и неизвестных кодов. | **PASS (4/4)** |
| `apps/api/src/services/fns/__tests__/apiMockPurityWave108.test.ts` | Тесты 2, 3, 4 читали `documentTemplates.ts`, `publicEstimatesService.ts`, `sberPosWebhookRoute.ts` через `fs.readFileSync`. | 1) Рантайм-парсер паспорта `parsePassportFromString`; 2) Регистрация и получение метаданных публичной сметы `PublicEstimatesService.getMeta`; 3) Криптографическая валидация HMAC-SHA256 вебхука `verifySberPosWebhookChecksum`; 4) Проверка отсутствия стационарного блоата в `renderDocumentHtml`. | **PASS (5/5)** |
| `apps/api/src/tests/cashboxShiftModules.test.ts` | Тест 5 читал файлы `cashboxShiftModules/` через `fs.readFileSync`, считая строки. | Проверка точной копеечной конвертации `rubToKopecks` / `kopecksToRub` без потери центов, генерация фискальных тегов 54-ФЗ (ФН, ФД, ФПД, QR-строка `t=...&s=...`) для боевых организаций. | **PASS (5/5)** |
| `apps/api/src/routes/speechLive.test.ts` | Пустые блоки `try { ... } catch {}` на строках 79 и 139 при парсинге WebSocket сообщений. | Ошибки парсинга сохраняются в `parseError` и проверяются строгим ассертом `assert.equal(parseError, null)`. Исключено тихое проглатывание битых кадров. | **PASS (3/3)** |
| `apps/api/src/services/backupWorker.test.ts` | Слепой `catch {}` в блоке очистки `afterEach`. | Проверка `fs.existsSync(tempDir)` с явной обработкой ошибки и трассировкой в `DEBUG`. | **PASS (4/4)** |
| `packages/shared/src/tests/medicalDomainGenerativeFuzzing.test.ts` | Отсутствие стохастического стресс-тестирования клинического ядра на миллионах мутаций. | 10 000 мутаций строк формулы FDI (гомоглифы, пробельные бомбы, невалидные зубы), 10 000 сплит-транзакций в целых BigInt копейках (`sum === total`), 10 000 грязных строк прайс-листов (советские цены 1500-00), СанПиН 3.3686-21 високосные даты и защита от RangeError. Выполнение за 391ms (<3000ms). | **PASS (12/12)** |
| `apps/web/tests/e2e/clinical-master-journey.spec.ts` | Отсутствие сквозного E2E сценария полного приёма врача (расписание -> визит -> одонтограмма Wheeler -> 3 тарифа -> черновик ИДС -> касса). | Сквозной браузерный Playwright-тест полного клинического пути врача: экспресс-запись без ассистента (Мандат 8n), норма в 1 клик (Мандат 8e), одонтограмма Wheeler 2.5D (зуб 36, кариес K02.0), генерация 3 тарифов лечения, печать ИДС с водяным знаком «ЧЕРНОВИК», 4-State Proof. | **PASS (1/1, 18.7s)** |
| `apps/web/tests/e2e/billing-and-family-split-e2e.spec.ts` | Риск потери точности при сплит-оплате, блокировка кассы при 100% скидке врача, требование ИНН физлиц. | Сквозной финансовый сценарий: сплит-тендер (депозит семьи + карта + нал), точный расчет копеек без расхождений (Hamilton-Hare exact math), врачебная скидка 100% на переделку без пароля начмеда (Мандат 8e), чек 54-ФЗ без ИНН физлиц (Мандат 8n), 4-State Proof. | **PASS (1/1, 13.4s)** |
| `apps/web/tests/e2e/warehouse-soft-negative-e2e.spec.ts` | Панические блокирующие модалки и остановка приёма врача при нулевом остатке расходников на складе. | Сквозной складской сценарий: бесшумное пакетное списание расходников по техкартам оказанных услуг в режиме Soft Negative Stock (Мандаты 8n, 8v) с фиксацией мягкого овердрафта в бэк-офисе, 1-клик сверка и оприходование накладной поставщика, 4-State Proof. | **PASS (1/1, 19.6s)** |

---

## 3. ВЫЯВЛЕННЫЕ И УСТРАНЕННЫЕ БОЕВЫЕ БАГИ (PRODUCTION CODE FIXES)

В процессе инквизиции и перевода тестов на реальный рантайм был обнаружен и исправлен скрытый дефект:
- **`packages/shared/src/radiology/scanRegistration/registrationProtocol.ts` (строка 148):**
  Функция `formatRegistrationA4Protocol(result, patientName, doctorName)` вызывала `patientName.trim()` без проверки на `undefined` или дефолтных параметров. При вызове с неполными метаданными происходил краш `TypeError: Cannot read properties of undefined (reading 'trim')`.  
  **Исправление:** добавлены безопасные дефолты и оператор нулевого слияния:
  ```ts
  export function formatRegistrationA4Protocol(
      result: RegistrationProtocolInput,
      patientName: string = "Не указан",
      doctorName: string = "Врач-стоматолог",
  ): string {
      const pName = (patientName ?? "").trim() || "Не указан";
      const dName = (doctorName ?? "").trim() || "Врач-стоматолог";
      ...
  ```

---

## 4. СВОДКА МАШИННЫХ ГЕЙТОВ (DEFINITION OF DONE)

1. **UTF-8 Encoding:** `npm run check:encoding` $\to$ Exit Code 0 (23 934 файлов проверено, 0 замечаний).
2. **Stub Overrides:** `npm run check:stub-overrides` $\to$ Exit Code 0 (139 свойств, 27 модулей, 0 перекрытий).
3. **Fetch Response Guard:** `npm run check:fetch-response` $\to$ Exit Code 0 (14 422 файлов, 2 исключения).
4. **Dynamic Imports:** `npm run check:dynamic-imports` $\to$ Exit Code 0 (18 196 файлов, 532 импорта, 0 битых).
5. **Затронутые тесты:** 100% PASS ($\le 3$ секунды на сьют, ноль таймаутов, утечек соединений и зависаний).
