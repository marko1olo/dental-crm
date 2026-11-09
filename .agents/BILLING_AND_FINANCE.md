# 💰 Billing, 54-FZ Fiscal Cashiering & Integrations Highway


> 🧭 **Navigation:** [🗺️ Master Documentation Index (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Documentation Knowledge Hub (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
> **Canonical Authority**: Mandates 8, 8b, 8c, 8e, 8n in [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) and [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md).  
> **Related Documents**: [INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) • [ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md) • [API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md) • [DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) • [TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md) • [WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) • [CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md) • [DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) • [API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md) • [FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md).

---

## 🎯 СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1: СОЛО-ВРАЧ И НЕБОЛЬШАЯ КЛИНИКА (1–3 КРЕСЛА, МАНДАТ 8n)

> 🎯 **ДО БОЛЬШИХ СЕТЕВЫХ КЛИНИК НАМ ЕЩЁ РАСТИ И РАСТИ!**
> 
> Наш главный пользователь — **соло-врач на аренде кресла (ИП, самозанятый)** и **небольшая частная клиника на 1–3 кресла**.
> 1. Полная финансовая автономия врача: 1-клик касса клиники без ввода ИНН физлица, мгновенный приём нал/карта/СБП, свобода применения персональных скидок (до 100% на переделки и персонал) без согласований с администратором.
> 2. Закон отсутствия тупиков (Zero Dead-Ends): программа никогда не блокирует оплату или закрытие чека из-за отсутствия необязательных полей. Сетевые модули (филиальные счета, сложная инкассация) закладываются «на вырост» без тупиков.

---

## 📐 1. Точные математические правила: целочисленные копейки (Zero Float Drift)

Все финансовые операции, начисления, скидки, остатки счетов, кассовые чеки и расчеты вычетов в DENTE ведутся **строго в целочисленных копейках** (`integer` в TypeScript / `bigint` / `numeric` в PostgreSQL). Использование чисел с плавающей запятой (`float` / `double`) для хранения и сложения денег **категорически запрещено** (Мандат 8b, The Hammer Часть 8 п. 2).

### 1.1. Базовые функции конвертации и финансовые контракты (`@dental/shared`):
* `export type Kopecks = number` — фундаментальный тип целочисленных копеек (SSOT: `@dental/shared`, `@dental/shared/finance`). Любые локальные переобъявления запрещены (Мандат 8d, 8s).
* `export type GeneratedDocument` — канонический Zod DTO контракт документов (SSOT: `@dental/shared`, `@dental/shared/documents`).
* `export type ToothState / ToothClinicalState / ToothStatus` — канонический клинический контракт зубной формулы (SSOT: `@dental/shared`, `@dental/shared/clinical`).
* `rubToKopecks(rub: number): number => Math.round(rub * 100)`
* `kopecksToRub(kop: number): number => kop / 100`
* `kopecksToNumericString(kop: number): string => (kop / 100).toFixed(2)`
* `formatMoneyRu(rub: number): string => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(rub)`

### 1.2. Округление без потерь при Split Tender (Комбинированная оплата):
При разбиении чека на несколько способов оплаты (наличные, карта, СБП, аванс, семейный кошелек, сертификат) сумма составляющих обязана с точностью до копейки равняться общей стоимости позиций:
$$\sum \text{AllocatedKopecks} \equiv \text{TotalBillKopecks}$$
Если кассир указывает суммы в рублях, движок `fiscal54fzEngine.ts` и `fastCheckoutEngine.ts` транслируют их в копейки и проверяют баланс:
```typescript
const remainingKopecks = totalBillKop - (cashKop + cardKop + sbpKop + advanceKop + familyKop + certKop);
if (remainingKopecks !== 0) {
  // Вычисляется точный остаток/переплата без потерь
}
```
Сдача по наличным рассчитывается без погрешности:
```typescript
const changeKopecks = Math.max(0, receivedCashKopecks - requiredCashKopecks);
const shortageKopecks = Math.max(0, requiredCashKopecks - receivedCashKopecks);
```

---

## 🧾 2. Касса и Единый чекаут (Ликвидация птичьего языка законов, Мандаты 8ap, 8x, 8am)

Кассовый контур DENTE очищен от канцелярского дев-сленга и сырых регуляторных аббревиатур.
В пользовательском интерфейсе используются живые клинические термины:
* Вместо «54-ФЗ» -> **«Кассовый чек» / «Касса»**
* Вместо «804н» -> **«Прайс-лист услуг» / «Каталог процедур» / «Акт услуг»**
* Вместо «043/у» -> **«Медицинская карта приёма» / «Номер карты»**
* Вместо «ФФД 1.2» -> **«Кассовый чек»**
* Вместо «Постановление 659» -> **«Освобождение от НДС по медицинским услугам»**

### 2.0. Канонические компоненты Единого чекаута и кассы:
1. **`CashierStudioModal.tsx` & `DirectCashierLauncher.tsx`**: Каноническая Студия кассы, чеков и смены DENTE CRM (Cashier Studio SSOT). Sweet Spot 400–480 строк (`CashierStudioModal.tsx`) + 70–90 строк (`DirectCashierLauncher.tsx`). Полноценный тест-сьют `cashierSSOTSuite.test.tsx` на нативном `node:test` (18/18 тестов зеленые).
2. **`CashReceiptModal.tsx`**: Каноническое модальное окно кассового чека, фискализации и приема платежей (ранее `FiscalReceipt54FzModal.tsx`).
3. **`ServiceReceiptPrintDocument.tsx`**: Товарный чек / Акт оказанных стоматологических услуг и печать фискального чека (ранее `Order804nFiscalReceiptPrint.tsx`).
4. **`TaxExemptionBanner.tsx`**: Информационный баннер освобождения от НДС медицинских услуг и согласования манипуляций у кресла (ранее `InvoiceDecree659Banner.tsx` / `InvoiceTaxDecreeBanner.tsx`).
5. **Единый чекаут и запрет карнавала кнопок (Мандат 8am)**:
   * Ровно **ОДНА Primary CTA кнопка** стиля `var(--teal, #0d9488)` в нижней трети экрана (Natural Thumb Zone).
   * Оплата принимается в 1 клик (Наличные, Терминал, СБП, Смешанная оплата) без обязательного требования ИНН с физлиц.
   * Свобода врача: скидки до 100% (гарантийные переделки, коллеги) без блокировки мастер-паролями (Мандат 8e).

### 2.1. Законное отсутствие требования ИНН у физических лиц (Zero Barrier Law):
* **Физические лица (пациенты розницы)**: По ст. 4.7 Федерального закона № 54-ФЗ реквизит «ИНН покупателя (клиента)» (Тег 1228) **НЕ ТРЕБУЕТСЯ** при наличных и безналичных расчетах с физическими лицами!
* **Кодовая гарантия (`validateBuyerInn` в `fastCheckoutEngine.ts` и `CashRegisterModal.tsx`)**:
  ```typescript
  // Note: Buyer INN is strictly NOT required for physical persons (FFD 1.2 tag 1228 only applies to B2B legal entities).
  export function validateBuyerInn(params: { clientType?: ClientLegalType; buyerInn?: string }) {
    const clientType = params.clientType ?? "physical_person";
    if (clientType === "physical_person") {
      // ИНН строго опционален. Поле пустое — 100% валидно, кассир НЕ блокируется!
      return { isValid: true, isRequired: false };
    }
    // Юрлица (10 цифр) и ИП (12 цифр) — валидация контрольной суммы
    return validateCorporateInn(params.buyerInn);
  }
  ```
* Запрещено делать кнопку «Пробить чек» неактивной (`disabled`) из-за отсутствия ИНН пациента (Мандат 8e).

### 2.2. Комбинированная оплата в 1 клик (Split Tender):
Поддерживается единовременный расчет чека любой комбинацией 6 платежных инструментов:
1. **Наличные (Тег 1031)** — сумма наличных средств в чеке.
2. **Безналичные / Карта (Тег 1081)** — эквайринг (Сбербанк, Тинькофф, POS-терминал).
3. **СБП (Система быстрых платежей / QR-код)** — безналичный платеж с динамическим QR.
4. **Зачет аванса (Тег 1215)** — списание ранее внесенной предоплаты пациента.
5. **Семейный баланс / кошелек** — оплата со счета объединенной семейной группы.
6. **Подарочный сертификат / Бонусы (Тег 1217)** — встречное предоставление.

### 2.3. Признаки способа и предмета расчета (Теги 1214 и 1212):
* **Тег 1214 (Признак способа расчета)**:
  * `1` — Предоплата 100%
  * `2` — Частичная предоплата (например, 30% или 50% аванс перед операцией)
  * `3` — Аванс
  * `4` — Полный расчет (включая зачет аванса по Тегу 1215)
* **Тег 1212 (Признак предмета расчета)**:
  * `4` — Медицинская услуга (по Номенклатуре 804н)
  * `10` — Платеж / Внесение аванса
  * `1` — Товар (средства гигиены, ортодонтические щетки)
* **Честный ЗНАК (Маркировка лекарств и имплантов)**: Тег 1162 / 1163 для маркированных позиций с валидацией DataMatrix криптохвоста.

### 2.4. Предотвращение дублирования (Idempotency Gating):
Каждая операция фискализации отправляет уникальный составной ключ `clientMutationId` / `idempotencyKey`:
```typescript
const idempotencyKey = `${orgId}:${orderId}:${totalKopecks}:${timestamp}`;
```
На бэкенде `POST /api/fiscal/receipts` и `POST /api/billing/payments` сверяют хэш полезной нагрузки. При совпадении возвращается существующий чек со статусом `200 OK`, предотвращая двойное списание денег у пациента.

### 2.5. Банковский POS-терминал и единый чекаут (Мандаты 8k, 8s, 8am, 8ap):
* **Ликвидация псевдо-ЖК экранчиков**: Тотальный отказ от процедурных симуляторов винтажных LCD-дисплеев терминалов и дампов протокола Pilot-NT в интерфейсе кассира. Банковский терминал отображается как чистая статусная карточка в дизайн-системе DENTE (`SberPosLcdDisplay.tsx`, `SberPosTerminalModal.tsx`).
* **Строго 1 Primary CTA кнопка**: В модалках быстрой оплаты и предпросмотра чека (`FastCheckoutReceiptPreview.tsx`) присутствует ровно одна Primary CTA кнопка (`execute-fast-checkout-btn`). Вспомогательные шлюзы (автономный терминал) стилизуются как `secondary-button`.
* **Защита автономии персонала и врача (Мандат 8e)**: Валидация ИНН (`cashboxInnValidation.ts`) гарантирует `isValid: true, isRequired: false` для физлиц, исключая блокировку проведения чека. Скидки врача до 100% применяются без административных преград.

---

## 👨‍👩‍👧‍👦 3. Семейный баланс и кошельки (Family Finance)

Позволяет семье объединять баланс и оплачивать лечение близких с единого счета с прозрачным аудитом.

### 3.1. Структура данных (`apps/api/src/db/schema.ts`):
* Таблица `family_groups`:
  * `id` — UUID первичный ключ
  * `name` — Название группы (например, «Семья Смирновых»)
  * `walletBalanceRub` — Общий доступный остаток в рублях/копейках
  * `organizationId` — Изоляция филиала
* Таблица `patients`:
  * `familyGroupId` — Внешний ключ на `family_groups.id`
  * `familyRole` — Роль (`head`, `spouse`, `child`, `relative`)

### 3.2. Операции и транзакционная безопасность (`apps/api/src/routes/finance_family.ts`):
* `GET /api/finance/family/patient/:patientId` — получение группы и баланса.
* `POST /api/finance/family/payment` — списание средств со счета семьи:
  1. Блокировка строки кошелька в транзакции: `FOR UPDATE`.
  2. Проверка доступного остатка: списание суммы `amountRub`.
  3. Создание платежа в таблице `payments` с привязкой к конкретному члену семьи.
  4. Моментальная рассылка события по WebSocket через `wsBroker.broadcastToOrganization` для обновления кассовых экранов регистратуры.
* **Red Team ACID Concurrency Proof (`apps/api/src/tests/concurrency/billingDoubleSpendDefense.test.ts`)**:
  - Защита от Double-Spend: 15 параллельных запросов по 4 000 ₽ при балансе 10 000 ₽ дают ровно 2 успешных списания и 13 отказов `402 Insufficient Funds`, остаток в БД строго 2 000.00 ₽ (200 000 копеек).
  - Multi-Tap Storm: 20 параллельных запросов с одинаковым `clientMutationId` исполняют ровно 1 списание, 19 идемпотентных повторов.
  - Exact Kopecks: 20 параллельных пополнений по 133.37 ₽ дают точную сумму 2 667.40 ₽ без ошибок floating-point.

---

## 🏛️ 4. Справка об оплате медицинских услуг для ФНС (КНД 1151156)

Выдача справок для получения социального налогового вычета 13% НДФЛ в соответствии с **Приказом ФНС России от 08.11.2023 № ЕА-7-11/824@** (форма по КНД 1151156, формат версии 5.01).

### 4.1. Разделение по кодам услуг (Код 1 vs Код 2):
* **Код услуги «1» (Обычное лечение)**:
  * Стандартная терапия, гигиена, несложное удаление зубов, рентгенография.
  * **Законодательный лимит**: с 1 января 2024 года совокупный лимит составляет **150 000 ₽** в год (максимальный возврат НДФЛ 13% = 19 500 ₽). До 2024 года лимит составлял 120 000 ₽ (возврат 15 600 ₽).
* **Код услуги «2» (Дорогостоящее лечение)**:
  * Хирургическая имплантация, костная пластика, синус-лифтинг, сложное челюстно-лицевое и ортодонтическое протезирование в соответствии с **Перечнем, утвержденным Постановлением Правительства РФ от 08.04.2020 № 458**.
  * **Лимит отсутствует**: налоговый вычет 13% рассчитывается со **всей фактически уплаченной суммы** без ограничений в 150 000 ₽.

### 4.2. Автоматическая классификация услуг по Номенклатуре 804н:
Движок `taxDeductionEngine.ts` на лету анализирует чеки пациента и автоматически группирует суммы по кодам 1 и 2:
```typescript
export function classifyTaxDeduction804n(code804n: string): "1" | "2" {
  if (EXPENSIVE_TREATMENT_804N_CODES.includes(code804n)) {
    return "2"; // Дорогостоящее лечение
  }
  return "1"; // Обычное лечение
}
```

### 4.3. Семейные справки и коды родства (Приказ № 824@):
Если плательщиком выступает родственник (муж за жену, родитель за ребенка), в справке фиксируется:
* `01` — Супруг (супруга)
* `02` — Родитель
* `03` — Сын (дочь) в возрасте до 18 лет (до 24 лет при очном обучении)
* `04` — Подопечный

### 4.4. Экспорт и форматы:
* Печатная форма бланка КНД 1151156 с двухмерным штрихкодом PDF417 / QR-кодом и линейным Code 128.
* Электронный реестр XML в формате `NO_MEDOPL` (версия 5.01) для прямой пакетной передачи в налоговые органы через операторов ЭДО / ТКС.

---

## 🏢 5. Экспорт в 1С:Предприятие 8.3 (CommerceML 2.09)

Служит для бесшовной передачи данных о выручке, медицинских услугах, списании медикаментов и зарплате в 1С:Бухгалтерию предприятия 8.3 и 1С:Медицина.

### 5.1. План счетов бухгалтерского учета РФ:
* **Счет 50.01** — Касса организации (наличные платежи регистратуры).
* **Счет 57.03** — Переводы в пути (эквайринг по банковским картам и терминалам Сбербанка).
* **Счет 51** — Расчетные счета (безналичная оплата от юридических лиц и СБП).
* **Счет 62.01 / 62.02** — Расчеты с покупателями / Авансы полученные (учет предоплат пациентов).
* **Счет 10.01 / 10.06 -> 20.01** — Списание медикаментов, анестетиков и расходников со склада в производство.
* **Счета 70, 68.01, 69** — Начисление заработной платы врачам (расчёт сдельной оплаты), удержание НДФЛ и страховые взносы.

### 5.2. Налоговая льгота по НДС:
Все медицинские услуги в пакете CommerceML помечаются признаком **«Без НДС»** на основании **пп. 2 п. 2 ст. 149 Налогового кодекса РФ** (медицинские услуги, оказываемые медицинскими организациями, не подлежат налогообложению НДС).

### 5.3. Эндпоинты интеграции (`apps/api/src/routes/commerceMl.ts`):
* `GET /api/v1/integrations/1c/commerceml/export` — выгрузка XML-пакета CommerceML 2.09.
* `POST /api/v1/integrations/1c/commerceml/check-double-posting` — проверка SHA-256 хэша пакета во избежание повторного проведения в 1С.
* `POST /api/v1/integrations/1c/commerceml/sync` — прием входящих остатков номенклатуры и статусов проводок из 1С.

---

## 🔗 6. Карта файлов и компонентов

| Назначение | Frontend компонент | Backend маршрут |
| :--- | :--- | :--- |
| **Кассовый чек** | [`FiscalReceipt54FzModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/FiscalReceipt54FzModal.tsx) | [`fiscalReceiptRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts) |
| **Единый SSOT Кассы (Кассовая студия)** | [`CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx) | `POST /api/cashbox/payments`, `POST /api/fiscal/receipts` |
| **Единый лаунчер кассы (Диплинки `#cashbox`, `#checkout`)** | [`DirectCashboxLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/DirectCashboxLauncher.tsx) | Единый перехват всех алиасов `#cashbox`, `#cashbox_ssot`, `#cash_register`, `#shift_closing` |
| **Журнал счетов (UI SSOT)** | [`InvoicesView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/InvoicesView.tsx) | `GET /api/invoices`, `POST /api/invoices` (UUIDv7 в `patient_invoices`) |
| **Канонический менеджер очереди печати ККТ** | [`FiscalReceiptQueueManager.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/hardware/fiscalReceiptQueueManager.ts) | `fiscalReceiptQueue` в БД (PostgreSQL 18), ACID транзакции |
| **Офлайн-очередь платежей** | [`offlinePaymentQueue.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/offline/offlinePaymentQueue.ts) | Сквозная синхронизация с `/api/cashbox/payments` |
| **Кассовая смена и Z-отчёт SSOT** | [`CashShiftClosingModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/shift/CashShiftClosingModal.tsx) | `POST /api/cashbox/shifts/close`, `POST /api/cash/cash-box-all-closing` |
| **Журнал кассовых смен SSOT** | [`CashShiftJournalView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/shift/CashShiftJournalView.tsx) | `GET /api/cashbox/shifts` |
| **1-Клик касса / Split** | [`CashRegisterModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashRegisterModal.tsx) | `POST /api/fiscal/receipts` |
| **Fast Checkout Engine** | [`fastCheckoutEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/checkout/fastCheckoutEngine.ts) | `POST /api/billing/payments` |
| **Семейный кошелек** | [`FamilyWalletModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/FamilyWalletModal.tsx) | [`finance_family.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts) |
| **Справка ФНС КНД 1151156**| [`TaxDeductionCertificateModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/TaxDeductionCertificateModal.tsx) | [`taxDeductionEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/taxDeductionEngine.ts) |
| **Экспорт 1С CommerceML** | [`Billing1CExportModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/Billing1CExportModal.tsx) | [`commerceMl.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts) |
| **Управленческая аналитика SSOT** | [`ExecutiveAnalyticsStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/ExecutiveAnalyticsStudioModal.tsx) | [`reports.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts) |
| **Ведомость зарплат Net Revenue** | [`DoctorPayrollReport.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/DoctorPayrollReport.tsx) | `GET /api/reports/doctor-payroll` |
| **Загрузка кресел (Норма 65–85%)** | [`ChairOccupancyReport.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/ChairOccupancyReport.tsx) | `GET /api/reports/chairs` |
| **Лаунчер аналитики клиники** | [`DirectAnalyticsLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/DirectAnalyticsLauncher.tsx) | Диплинки `#analytics`, `#dashboard`, `#executive-studio` |

---

## 🛡️ 7. Реестр устранённых дефектов кассово-финансового контура (DEF-FIN-01...07)

1. **DEF-FIN-01 [ЗАКРЫТО]**: Мокап счетов в LocalStorage в обход БД в `InvoicesView.tsx` полностью заменен на реальное взаимодействие с `POST /api/invoices` и `GET /api/invoices`. Создание счета генерирует UUIDv7 в PostgreSQL (`patient_invoices`), исключая ошибку `BillingValidationError: invalid uuid` при последующей оплате.
2. **DEF-FIN-02 [ЗАКРЫТО]**: В `useInvoicesData.ts` исправлен приоритет разбора ответа сервера (`data.invoices ?? (Array.isArray(data) ? data : data.items ?? [])`), что гарантирует корректную загрузку счетов, а не позиций услуг.
3. **DEF-FIN-03 [ЗАКРЫТО]**: Полная синхронизация колонок `total_rub` и `total_amount_rub` в `createInvoiceDraftTool.ts` и роутах счетов.
4. **DEF-FIN-04 [ЗАКРЫТО]**: Раздвоение кассовых смен устранено: паразитная таблица `cash_shifts` удалена из сидеров, все кассовые смены и операции ведутся строго через `cash_box_shifts` и `cash_operations`.
5. **DEF-FIN-05 [ЗАКРЫТО]**: Вымышленное «Постановление №659» и блокирующий `Decree659Error` полностью удалены. Заменены на пассивные информационные разъяснения по ст. 149 НК РФ (освобождение медицинских услуг от НДС). Тесты-саботажники `decree659*.test.ts` физически удалены через `git rm`.
6. **DEF-FIN-06 [ЗАКРЫТО]**: Сигнатуры роутов получения счетов `GET /api/invoices` и `GET /api/billing/invoices` взаимно унифицированы (`{ success: true, data, invoices, items }`).
7. **DEF-FIN-07 [ЗАКРЫТО]**: Канцелярит и сырые регуляторные теги («ФФД 1.2», теги 1214/1054) полностью устранены из пользовательского UI в пользу чистого клинического русского языка.
8. **Сироты и дубликаты [ЗАКРЫТО]**: Физически удалены через `git rm`:
   - 13 файлов в `apps/web/src/components/finance/cashRegisterModalModules/`
   - 14 файлов в `apps/web/src/components/cashbox/cashboxViewModules/`
   - `InvoiceDecree659Banner.tsx` и `InvoiceTaxDecreeBanner.tsx`
9. **4-State Visual Proof [ЗАКРЫТО]**: Сняты реальные скриншоты живого приложения на `http://127.0.0.1:5173/?checkout=1` и лично отсмотрены через `read_file`:
   - ☀️ PC Light 1440x900 (`01_cashbox_studio_pc_light_1440x900.png` — 81.3 KB)
   - 🌙 PC Dark 1440x900 (`02_cashbox_studio_pc_dark_1440x900.png` — 78.6 KB)
   - 🌙 PC Shift Dark 1440x900 (`03_cashbox_shift_pc_dark_1440x900.png` — 42.6 KB)
   - ☀️ PC Tape Light 1440x900 (`04_cashbox_tape_pc_light_1440x900.png` — 39.0 KB)
   - 📱 Mobile Light 390x844 (`05_cashbox_studio_mobile_light_390x844.png` — 130.5 KB)
   - 📱 Mobile Dark 390x844 (`06_cashbox_studio_mobile_dark_390x844.png` — 147.2 KB)

---

## 🔗 7. Связанные документы архитектуры

* **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральный реестр документации проекта.
* **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Главная конституция и операционный мандат.
* **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — 3-уровневая архитектура, Mandate 8e и эргономика кассы.
* **[FRONTEND_VIEWS_MAP.md](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md)** — Карта представлений фронтенда, модалок и кассовых шторок.
* **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Исчерпывающий каталог Fastify API эндпоинтов финансового контура.
* **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил и валидации приёма.

