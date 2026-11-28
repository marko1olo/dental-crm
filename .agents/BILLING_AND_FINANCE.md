# 💰 Billing, 54-FZ Fiscal Cashiering & Integrations Highway


> 🧭 **Navigation:** [🗺️ Master Documentation Index (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Documentation Knowledge Hub (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
> Canonical Authority: Mandates 8, 8b, 8c, 8e, 8n in [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) and [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md).  
> Related Documents: [INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) • [ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md) • [API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md) • [DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) • [TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md) • [WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) • [CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md) • [DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) • [API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md) • [FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md).

---

## 🎯 СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1: СОЛО-ВРАЧ И НЕБОЛЬШАЯ КЛИНИКА (1–3 КРЕСЛА, МАНДАТ 8n)

> 🎯 ДО БОЛЬШИХ СЕТЕВЫХ КЛИНИК НАМ ЕЩЁ РАСТИ И РАСТИ!
> 
> Наш главный пользователь — соло-врач на аренде кресла (ИП, самозанятый) и небольшая частная клиника на 1–3 кресла.
> 1. Полная финансовая автономия врача: 1-клик касса клиники без ввода ИНН физлица, мгновенный приём нал/карта/СБП, свобода применения персональных скидок (до 100% на переделки и персонал) без согласований с администратором.
> 2. Закон отсутствия тупиков (Zero Dead-Ends): программа никогда не блокирует оплату или закрытие чека из-за отсутствия необязательных полей. Сетевые модули (филиальные счета, сложная инкассация) закладываются «на вырост» без тупиков.

---

## 📐 1. Точные математические правила: целочисленные копейки (Zero Float Drift)

Все финансовые операции, начисления, скидки, остатки счетов, кассовые чеки и расчеты вычетов в DENTE ведутся строго в целочисленных копейках (`integer` в TypeScript / `bigint` / `numeric` в PostgreSQL). Использование чисел с плавающей запятой (`float` / `double`) для хранения и сложения денег категорически запрещено (Мандат 8b, The Hammer Часть 8 п. 2).

### 1.1. Базовые функции конвертации и финансовые контракты (`@dental/shared`):
* `export type Kopecks = number` — фундаментальный тип целочисленных копеек (SSOT: `@dental/shared`, `@dental/shared/finance`). Любые локальные переобъявления запрещены (Мандат 8d, 8s).
* `export type GeneratedDocument` — канонический Zod DTO контракт документов (SSOT: `@dental/shared`, `@dental/shared/documents`).
* `export type ToothState / ToothClinicalState / ToothStatus` — канонический клинический контракт зубной формулы (SSOT: `@dental/shared`, `@dental/shared/clinical`).
* `rubToKopecks(rub: number): number` — строгий перевод рублей в целые копейки через `packages/shared/src/money.ts` (`parseKopecks` / `Math.round`) без float-арифметики накопления
* `kopecksToRub(kop: number): number` — обратная граница конвертации в число рублей для DTO через `packages/shared/src/money.ts`
* `kopecksToNumericString(kop: number): string` — целочисленное строковое форматирование `numeric(12, 2)` через `packages/shared/src/money.ts` (без деления `float`)
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
* Вместо «54-ФЗ» -> «Кассовый чек» / «Касса»
* Вместо «804н» -> «Прайс-лист услуг» / «Каталог процедур» / «Акт услуг»
* Вместо «043/у» -> «Медицинская карта приёма» / «Номер карты»
* Вместо «ФФД 1.2» -> «Кассовый чек»
* Вместо «Постановление 659» -> «Освобождение от НДС по медицинским услугам»

### 2.0. Канонические компоненты Единого чекаута и кассы:
1. **`CashRegisterStudioModal.tsx` & `DirectCashboxLauncher.tsx`**: Каноническая Студия кассы, чеков и смены DENTE CRM (Cashier Studio SSOT). Sweet Spot 400–480 строк (`CashRegisterStudioModal.tsx`) + 70–90 строк (`DirectCashboxLauncher.tsx`). Полноценный тест-сьют `cashierSSOTSuite.test.tsx` на нативном `node:test` (18/18 тестов зеленые).
2. **`CashReceiptPrintModal.tsx`**: Каноническое модальное окно предпросмотра и печати кассового товарного чека.
3. **`ServiceReceiptPrintDocument.tsx`**: Товарный чек / Акт оказанных стоматологических услуг и печать фискального чека (ранее `Order804nFiscalReceiptPrint.tsx`).
4. **`TaxExemptionBanner.tsx`**: Информационный баннер освобождения от НДС медицинских услуг и согласования манипуляций у кресла (ранее `InvoiceDecree659Banner.tsx` / `InvoiceTaxDecreeBanner.tsx`).
5. Единый чекаут и запрет карнавала кнопок (Мандат 8am):
   * Ровно ОДНА Primary CTA кнопка стиля `var(--teal, #0d9488)` в нижней трети экрана (Natural Thumb Zone).
   * Оплата принимается в 1 клик (Наличные, Терминал, СБП, Смешанная оплата) без обязательного требования ИНН с физлиц.
   * Свобода врача: скидки до 100% (гарантийные переделки, коллеги) без блокировки мастер-паролями (Мандат 8e).

### 2.1. Законное отсутствие требования ИНН у физических лиц (Zero Barrier Law):
* Физические лица (пациенты розницы): По ст. 4.7 Федерального закона № 54-ФЗ реквизит «ИНН покупателя (клиента)» (Тег 1228) НЕ ТРЕБУЕТСЯ при наличных и безналичных расчетах с физическими лицами!
* **Кодовая гарантия (`validateBuyerInn` в `fastCheckoutEngine.ts` и `CashRegisterStudioModal.tsx`)**:
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
1. Наличные (Тег 1031) — сумма наличных средств в чеке.
2. Безналичные / Карта (Тег 1081) — эквайринг (Сбербанк, Тинькофф, POS-терминал).
3. СБП (Система быстрых платежей / QR-код) — безналичный платеж с динамическим QR.
4. Зачет аванса (Тег 1215) — списание ранее внесенной предоплаты пациента.
5. Семейный баланс / кошелек — оплата со счета объединенной семейной группы.
6. Подарочный сертификат / Бонусы (Тег 1217) — встречное предоставление.

### 2.3. Признаки способа и предмета расчета (Теги 1214 и 1212):
* Тег 1214 (Признак способа расчета):
  * `1` — Предоплата 100%
  * `2` — Частичная предоплата (например, 30% или 50% аванс перед операцией)
  * `3` — Аванс
  * `4` — Полный расчет (включая зачет аванса по Тегу 1215)
* Тег 1212 (Признак предмета расчета):
  * `4` — Медицинская услуга (по Номенклатуре 804н)
  * `10` — Платеж / Внесение аванса
  * `1` — Товар (средства гигиены, ортодонтические щетки)
* Честный ЗНАК (Маркировка лекарств и имплантов): Тег 1162 / 1163 для маркированных позиций с валидацией DataMatrix криптохвоста.

### 2.4. Предотвращение дублирования (Idempotency Gating):
Каждая операция фискализации отправляет уникальный составной ключ `clientMutationId` / `idempotencyKey`:
```typescript
const idempotencyKey = `${orgId}:${orderId}:${totalKopecks}:${timestamp}`;
```
На бэкенде `POST /api/fiscal/receipts` и `POST /api/billing/payments` сверяют хэш полезной нагрузки. При совпадении возвращается существующий чек со статусом `200 OK`, предотвращая двойное списание денег у пациента.

### 2.5. Банковский POS-терминал и единый чекаут (Мандаты 8k, 8s, 8am, 8ap):
* Ликвидация псевдо-ЖК экранчиков: Тотальный отказ от процедурных симуляторов винтажных LCD-дисплеев терминалов и дампов протокола Pilot-NT в интерфейсе кассира. Банковский терминал отображается как чистая статусная карточка в дизайн-системе DENTE (`SberPosLcdDisplay.tsx`, `SberPosTerminalModal.tsx`).
* Строго 1 Primary CTA кнопка: В модалках быстрой оплаты и предпросмотра чека (`FastCheckoutReceiptPreview.tsx`) присутствует ровно одна Primary CTA кнопка (`execute-fast-checkout-btn`). Вспомогательные шлюзы (автономный терминал) стилизуются как `secondary-button`.
* Защита автономии персонала и врача (Мандат 8e): Валидация ИНН (`cashboxInnValidation.ts`) гарантирует `isValid: true, isRequired: false` для физлиц, исключая блокировку проведения чека. Скидки врача до 100% применяются без административных преград.

### 2.6. Единый кассовый транзакционный процессор SSOT (Мандаты 8bf, 8bm, 8bo):
* Канонический движок проведения платежей: Все платежи клиники (касса, инвойсы, визиты, сплиты, гарантии, сертификаты, ДМС, депозиты) проводятся строго через единый сервис `processCashboxPayment` (`apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts`).
* Устранение легаси-клонов и дублирующих пайплайнов:
  * Ликвидированы 4 устаревших файла-клона: `paymentCreationPipeline.ts`, `paymentSplitValidation.ts`, `paymentRecordExecutor.ts`, `paymentVisitSettlement.ts`.
  * Создан канонический фасад-адаптер `cashboxPaymentAdapter.ts`, делегирующий вызовы `createPaymentInDb` и `validateAndResolvePaymentSplit` в единый кассовый процессор с сохранением обратной совместимости для сервисных тестов.
  * `paymentCreateHandler.ts` переведен с `createPaymentInDb` на прямой вызов `processCashboxPayment`.
* Тотальная ликвидация Float-бомб (Мандат 8bm):
  * Все операции с деньгами ведутся через `@dental/shared/src/money.ts` (`rublesToKopecks`, `kopecksToRubles`, `kopecksToNumericString`, `sumKopecks`).
  * Полностью искоренены опасные конструкции `Math.round(x * 100)` и `x / 100` в `cashboxPaymentProcessor.ts`, `cashboxRefundRoutes.ts`, `createTreatmentPlanHandler.ts` и `useFinanceLogic.ts`.
* Автоматическое зачисление наличной сдачи на авансовый депозит (Мандат 8e):
  * При внесении наличных свыше остатка по визиту (до 5 000 ₽ сдачи) излишек автоматически фиксируется в `advanceDepositTaggings` со статусом `unallocated` и меткой `patient_deposit`.
* Устранение 4-кратного дублирования модалки кассы во фронтенде (Мандат 8aq, 8bi):
  * В `InvoicesView.tsx` / `InvoicesModalsLayer.tsx` устранены 4 параллельных монтирования `CashRegisterStudioModal`.
  * Создан хук `useInvoicesCashboxConfig.ts`, централизующий конфигурацию модалки. В DOM монтируется строго ОДИН экземпляр `{activeCashboxConfig && <CashRegisterStudioModal {...activeCashboxConfig} />}`.
* Ликвидация фантомных ручных полей в чекауте:
  * Из `CashboxQuickCard.tsx` и `FinanceCashboxSection.tsx` удален мертвый шеврон ручной формы.
  * В `useFinanceLogic.ts` удалена отправка фейковых регуляторных полей `fiscalReceipt: { fn, fd, fpd }`, платежи направляются напрямую в `POST /api/cashbox/payments`.

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

Выдача справок для получения социального налогового вычета 13% НДФЛ в соответствии с Приказом ФНС России от 08.11.2023 № ЕА-7-11/824@ (форма по КНД 1151156, формат версии 5.01).

### 4.1. Разделение по кодам услуг (Код 1 vs Код 2):
* Код услуги «1» (Обычное лечение):
  * Стандартная терапия, гигиена, несложное удаление зубов, рентгенография.
  * Законодательный лимит: с 1 января 2024 года совокупный лимит составляет 150 000 ₽ в год (максимальный возврат НДФЛ 13% = 19 500 ₽). До 2024 года лимит составлял 120 000 ₽ (возврат 15 600 ₽).
* Код услуги «2» (Дорогостоящее лечение):
  * Хирургическая имплантация, костная пластика, синус-лифтинг, сложное челюстно-лицевое и ортодонтическое протезирование в соответствии с Перечнем, утвержденным Постановлением Правительства РФ от 08.04.2020 № 458.
  * Лимит отсутствует: налоговый вычет 13% рассчитывается со всей фактически уплаченной суммы без ограничений в 150 000 ₽.

### 4.2. Автоматическая классификация услуг по Номенклатуре 804н:
Канонический движок `@dental/shared/src/fiscal/fnsTaxDeductionEngine.ts` и `taxCertificateEngine.ts` на лету анализируют чеки пациента и автоматически группируют суммы по кодам 1 и 2:
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
* Счет 50.01 — Касса организации (наличные платежи регистратуры).
* Счет 57.03 — Переводы в пути (эквайринг по банковским картам и терминалам Сбербанка).
* Счет 51 — Расчетные счета (безналичная оплата от юридических лиц и СБП).
* Счет 62.01 / 62.02 — Расчеты с покупателями / Авансы полученные (учет предоплат пациентов).
* Счет 10.01 / 10.06 -> 20.01 — Списание медикаментов, анестетиков и расходников со склада в производство.
* Счета 70, 68.01, 69 — Начисление заработной платы врачам (расчёт сдельной оплаты), удержание НДФЛ и страховые взносы.

### 5.2. Налоговая льгота по НДС:
Все медицинские услуги в пакете CommerceML помечаются признаком «Без НДС» на основании пп. 2 п. 2 ст. 149 Налогового кодекса РФ (медицинские услуги, оказываемые медицинскими организациями, не подлежат налогообложению НДС).

### 5.3. Эндпоинты интеграции (`apps/api/src/routes/commerceMl.ts`):
* `GET /api/v1/integrations/1c/commerceml/export` — выгрузка XML-пакета CommerceML 2.09.
* `POST /api/v1/integrations/1c/commerceml/check-double-posting` — проверка SHA-256 хэша пакета во избежание повторного проведения в 1С.
* `POST /api/v1/integrations/1c/commerceml/sync` — прием входящих остатков номенклатуры и статусов проводок из 1С.

---

## 🔗 6. Карта файлов и компонентов

| Назначение | Frontend компонент | Backend маршрут |
| :--- | :--- | :--- |
| **Печать чека / Товарный чек** | [`CashReceiptPrintModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashReceiptPrintModal.tsx) | [`fiscalReceiptRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts) |
| **Единый SSOT Кассы (Кассовая студия)** | [`CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx) | `POST /api/cashbox/payments`, `POST /api/fiscal/receipts` |
| **Единый лаунчер кассы (Диплинки `#cashbox`, `#checkout`)** | [`DirectCashboxLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/DirectCashboxLauncher.tsx) | Единый перехват всех алиасов `#cashbox`, `#cashbox_ssot`, `#cash_register`, `#shift_closing` |
| **Журнал счетов (UI SSOT)** | [`InvoicesView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/InvoicesView.tsx) | `GET /api/invoices`, `POST /api/invoices` (UUIDv7 в `patient_invoices`) |
| **Канонический менеджер очереди печати ККТ** | [`FiscalReceiptQueueManager.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/hardware/fiscalReceiptQueueManager.ts) | `fiscalReceiptQueue` в БД (PostgreSQL 18), ACID транзакции |
| **Офлайн-очередь платежей** | [`offlinePaymentQueue.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/offline/offlinePaymentQueue.ts) | Сквозная синхронизация с `/api/cashbox/payments` |
| **Кассовая смена и Z-отчёт SSOT** | [`CashShiftClosingModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/shift/CashShiftClosingModal.tsx) | `POST /api/cashbox/shifts/close`, `POST /api/cash/cash-box-all-closing` |
| **Журнал кассовых смен SSOT** | [`CashShiftJournalView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/shift/CashShiftJournalView.tsx) | `GET /api/cashbox/shifts` |
| **Комбинированная оплата семьи (Мульти-тендер SSOT)** | [`CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx) | `POST /api/cashbox/payments` (единый атомарный мульти-тендер) |
| **Кассовый мульти-сплит и экспресс-чекаут** | [`cashRegisterSplitsData.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/cashRegisterSplitsData.ts) | `POST /api/cashbox/payments` |
| **Семейный кошелек** | [`FamilyWalletModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/family/FamilyWalletModal.tsx) | [`finance_family.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts) |
| **Справка ФНС КНД 1151156**| [`DocumentsStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/DocumentsStudioModal.tsx) | [`taxCertificateEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/taxCertificateEngine.ts) |
| **Экспорт 1С CommerceML** | [`Billing1CExportModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/Billing1CExportModal.tsx) | [`commerceMl.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts) |
| **Управленческая аналитика SSOT** | [`ExecutiveAnalyticsStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/ExecutiveAnalyticsStudioModal.tsx) | [`reports.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts) |
| **Ведомость зарплат Net Revenue** | [`DoctorPayrollReport.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/DoctorPayrollReport.tsx) | `GET /api/reports/doctor-payroll` |
| **Загрузка кресел (Норма 65–85%)** | [`ChairOccupancyReport.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/ChairOccupancyReport.tsx) | `GET /api/reports/chairs` |
| **Лаунчер аналитики клиники** | [`DirectAnalyticsLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/DirectAnalyticsLauncher.tsx) | Диплинки `#analytics`, `#dashboard`, `#executive-studio` |

---

## 🛡️ 7. Реестр устранённых дефектов кассово-финансового контура (DEF-FIN-01...13)

1. DEF-FIN-01 [ЗАКРЫТО]: Мокап счетов в LocalStorage в обход БД в `InvoicesView.tsx` полностью заменен на реальное взаимодействие с `POST /api/invoices` и `GET /api/invoices`. Создание счета генерирует UUIDv7 в PostgreSQL (`patient_invoices`), исключая ошибку `BillingValidationError: invalid uuid` при последующей оплате.
2. DEF-FIN-02 [ЗАКРЫТО]: В `useInvoicesData.ts` исправлен приоритет разбора ответа сервера (`data.invoices ?? (Array.isArray(data) ? data : data.items ?? [])`), что гарантирует корректную загрузку счетов, а не позиций услуг.
3. DEF-FIN-03 [ЗАКРЫТО]: Полная синхронизация колонок `total_rub` и `total_amount_rub` в `createInvoiceDraftTool.ts` и роутах счетов.
4. DEF-FIN-04 [ЗАКРЫТО]: Раздвоение кассовых смен устранено: паразитная таблица `cash_shifts` удалена из сидеров, все кассовые смены и операции ведутся строго через `cash_box_shifts` и `cash_operations`.
5. DEF-FIN-05 [ЗАКРЫТО]: Вымышленное «Постановление №659» и блокирующий `Decree659Error` полностью удалены. Заменены на пассивные информационные разъяснения по ст. 149 НК РФ (освобождение медицинских услуг от НДС). Тесты-саботажники `decree659*.test.ts` физически удалены через `git rm`.
6. DEF-FIN-06 [ЗАКРЫТО]: Сигнатуры роутов получения счетов `GET /api/invoices` и `GET /api/billing/invoices` взаимно унифицированы (`{ success: true, data, invoices, items }`).
7. DEF-FIN-07 [ЗАКРЫТО]: Канцелярит и сырые регуляторные теги («ФФД 1.2», теги 1214/1054) полностью устранены из пользовательского UI в пользу чистого клинического русского языка.
8. DEF-FIN-08 [ЗАКРЫТО]: Свободный чек (Walk-In payment) и розничная продажа без карты пациента (ст. 1.2 и 4.7 54-ФЗ). В `useCashRegisterStudioState.ts` разрешена продажа физлицам без `patientId` (`isRetailSale: true`), а в `cashboxPaymentProcessor.ts` снята блокировка `400 PatientRequired` — операция фискализируется и связывается с системным розничным покупателем в PostgreSQL 18.
9. DEF-FIN-09 [ЗАКРЫТО]: Восстановление позиций услуг в счетах (`createInvoiceHandler.ts`, `getInvoiceByIdHandler.ts`, `listInvoicesHandler.ts`).
10. DEF-FIN-10 [ЗАКРЫТО]: Ликвидация раскола платежных пайплайнов (Мандат 8bf). Вызовы проведения платежей на фронтенде унифицированы на единый канонический роут `POST /api/cashbox/payments` без костыльных цепочек фолбеков (`recordCrmPayment.ts`, `executeManualCardTerminalConfirm.ts`, `familyCombinedCheckoutApi.ts`). `cashboxPaymentRequestSchema` расширена поддержкой `familyGroupId`, `payerFullName` и раздельных рублей/копеек по тендерам (`cashAmountRub`, `electronicAmountRub`, `depositAmountRub`, `bonusAmountRub`).
11. DEF-FIN-11 [ЗАКРЫТО]: Реляционная таблица `invoice_items` (Мандат 8bf). Устранен антипаттерн парсинга `treatment_items.notes LIKE '%invoiceId%'`. Добавлена физическая таблица `invoice_items` с RLS-изоляцией, внешними ключами и индексами, выполнена DDL-миграция `0244_invoice_items_table.sql`. Создание и чтение счетов в `createInvoiceHandler.ts`, `getInvoiceByIdHandler.ts` и `listInvoicesHandler.ts` переведено на прямую реляционную связь.
12. DEF-FIN-12 [ЗАКРЫТО]: Атомарный комбинированный сплит с семейным кошельком (Мандат 8bf). Исключен сценарий рассинхрона из двух последовательных сетевых запросов (`/api/finance/family/pay` с последующим `/api/billing/payments`). Клиент совершает ровно 1 сетевой вызов с мульти-тендером, сервер атомарно в одной транзакции блокирует строку кошелька `FOR UPDATE`, дебетует баланс, проводит платеж и ставит чек в очередь 54-ФЗ.
13. DEF-FIN-13 [ЗАКРЫТО]: Устранение фиктивных ФД/ФПД и хардкодного ФН (Мандаты 8e, 8n). В `fiscalAccounting.ts` удалена генерация фиктивных номеров ФД и хэш-функции ФПД до реальной печати на ККТ. Удален хардкод ФН `"9960440300123456"`. Подлинные фискальные атрибуты сохраняются только из ответа ККТ/драйвера, а чеки до печати ставятся в `fiscalReceiptQueue` со статусом `pending_print`.
14. Сироты и дубликаты [ЗАКРЫТО]: Физически удалены через `git rm`:
   - 9 файлов мёртвой папки `apps/web/src/components/cashbox/checkout/`
   - 5 фасадов-пустышек (`CashCheckoutStudioModal.tsx`, `CashRegisterCheckoutModal.tsx` и др.)
   - 10 тестов к Постановлению №659 и файл `decree659Audit.ts`
   - Тесты и каталоги бренда StomX
15. 4-State Visual Proof [ЗАКРЫТО]: Сняты реальные скриншоты живого приложения и лично отсмотрены через `read_file`:
   - ☀️ PC Light 1440x900 (`01_cashbox_studio_pc_light_1440x900.png` — 71.6 KB)
   - 🌙 PC Dark 1440x900 (`02_cashbox_studio_pc_dark_1440x900.png` — 70.8 KB)
   - 📱 Mobile Light 390x844 (`03_cashbox_studio_mobile_light_390x844.png` — 117.4 KB)
   - 📱 Mobile Dark 390x844 (`04_cashbox_studio_mobile_dark_390x844.png` — 114.1 KB)
16. DEF-FIN-16 [ЗАКРЫТО] (Red Team Демайнинг и Анти-Any по Мандатам 8be/8bk):
   - В `apps/web/src/components/cashbox/studioModules/useCashRegisterStudioState.ts` устранен скрытый двойной каст `(netErr as unknown as { status: number })` при обработке сбоев сети 502/503/504. Реализован строгий типизированный класс `CashRegisterNetworkError` с безопасным `instanceof` guard.
   - Во всем модуле кассы и фискального стека (`CashRegisterStudioModal.tsx`, `useCashRegisterStudioState.ts`, `studioModules/`, `cashboxPaymentProcessor.ts`, `fiscal/`) гарантировано 0 вхождений `as any`, `as unknown as`, `as never` и non-null assertions `!`.
   - Все финансовые расчеты ведутся строго в целочисленных копейках `amountKopecks` (BIGINT) с защитой от float-ошибок.
   - Внедрен 0px визуальный шум для нормы: пациент-физлицо по умолчанию (без требования ИНН, без 3 гигантских плиток). Вторичный переключатель «Организация / ИП →» аккуратно открывает сегментированный выбор с валидацией 10/12 цифр ИНН только для юрлиц/ИП.
   - Автономия врача (Мандат 8e): скидки до 100% (гарантийная переделка 0 ₽ без фискального чека), 0 заблокированных кнопок на Primary CTA.
   - Сплит-оплата: атомарный мульти-тендер (нал + терминал + СБП QR + семейный депозит/аванс) с авто-расчетом остатка в 1 клик.
   - Машинные гейты (Exit Code 0): `check:encoding`, `check:react-hooks`, `check:buttons`, unit-тесты (11/11 web, 76/76 fiscal, 18/18 api).
17. DEF-FIN-17 [ЗАКРЫТО] (Red Team Fixer 1 — Касса, 54-ФЗ, Сплит, Семейный баланс):
   - Sev 1: Ликвидированы битые импорты удаленного `paymentModalTypes.js` в `types.ts`, `VisitBillingSummarySection.tsx`, `useVisitSummaryModalState.ts`. `PaymentMethodTab` централизован в `apps/web/src/components/cashbox/cashRegisterSplitsData.ts`.
   - Sev 1: Ликвидирован OOM Full Table Scan в `apps/api/src/services/familyWallet/familyFnsTaxService.ts:98-105` — фильтрация всех платежей организации в Node.js заменена на строгий реляционный SQL-запрос через `inArray(payments.patientId, memberIds)` с защитным условием пустых участников.
   - Sev 2: Снята блокировка Primary CTA (Мандат 8e) в `RefundModalFooter.tsx:40-41` (`!hasSelection` удален из `disabled`, исключены классы `disabled:cursor-not-allowed` и `disabled:opacity-50`, обеспечен мгновенный клик без искусственных барьеров).
   - Sev 2: Устранена утечка ТЗ «ИНН для физических лиц не требуется» и хардкод `#0f172a` в `CashFlowFormInputs.tsx` с заменой на семантический токен `var(--ink)`.
   - Sev 2: Устранены градиенты на кнопках в `OfflineFiscalBatchModal.tsx` с заменой на благородный тиловый токен `bg-[var(--teal,#0d9488)]`.
   - **Снос сирот (`git rm`)**: Физически удалены 8 мертвых файлов (`PaymentFamilyDepositView.tsx`, `DepositTopupModal.tsx`, `depositModal/` 6 файлов).
   - 4-State Visual Proof: Сняты 4 канонических скриншота на живом сервере Vite (81 KB, 78 KB, 125 KB, 124 KB) и лично осмотрены через `read_file` (Zero-Clipping, 1 Primary CTA #0d9488, 0px горизонтального скролла, Apple HIG).
18. DEF-FIN-18 [ЗАКРЫТО] (Red Team Lead Cashbox Fixer — Унификация платежных контуров, DTO счетов, канонические смены и снос призрачных роутов):
   - Ликвидация параллельного платежного контура: Устаревший `POST /api/billing/payments` в `apps/api/src/routes/billingRoutes/handlers/paymentCreateHandler.ts` полностью перенаправлен на канонический транзакционный процессор `processCashboxPayment` (`cashboxPaymentProcessor.ts`), гарантируя единую ACID-транзакцию с `pg_advisory_xact_lock`, очередь фискализации `fiscalReceiptQueue`, сплит-тендеры, депозиты и 100% скидки врача.
   - Синхронизация DTO счетов: `apps/api/src/routes/billingRoutes/handlers/billingInvoicesHandler.ts` переведен на прямой вызов `handleListInvoices`, устраняя рассинхрон DTO и обеспечивая возврат полных позиций услуг и ФИО пациента.
   - Единый источник копеечной арифметики: `packages/shared/src/fiscal/kopecksArithmetic.ts` переведен на прозрачный ре-экспорт из `packages/shared/src/money.ts` (`rublesToKopecks`, `kopecksToRubles`), устраняя дублирование алгоритмов.
   - Канонический эндпоинт кассовой смены: В `apps/web/src/components/shift/cashShiftService.ts` ликвидирован массив перебора fallback-роутов. Закреплен ровно 1 канонический путь: `POST /api/cashbox/shift/open` и `POST /api/cashbox/shift/close`.
   - Снос призрачного роута в ЭМК: В `apps/web/src/components/visit/emkTab/VisitEmkModals.tsx` призрачный вызов несуществующего `/api/billing/fiscalize-receipt` заменен на штатный запуск кассовой студии через `dente:open-cashbox` (`mode: "checkout"`).
   - Машинные гейты и 4-State Visual Proof: `tsc --noEmit` по затронутым модулям — 0 ошибок. Тесты `financialConcurrentPayments.test.ts` (6/6 PASS), `apiContractsAndErrorHardening.test.ts` (37/37 PASS), `cashboxSsotScreens.test.tsx` (11/11 PASS), `fiscal` тесты (76/76 PASS). В `docs/proofs/cashbox/` зафиксированы и лично осмотрены через `read_file` 4 скриншота: `01_cashbox_studio_pc_light_1440x900.png` (77.9 KB), `02_cashbox_studio_pc_dark_1440x900.png` (74.8 KB), `03_cashbox_studio_mobile_light_390x844.png` (123.9 KB), `04_cashbox_studio_mobile_dark_390x844.png` (123.6 KB).

---

## 💼 8. Реестр устранённых дефектов расчета зарплаты и смен врачей (DEF-PAYROLL-01...04)

1. DEF-PAYROLL-01 [ЗАКРЫТО]: Паралич экрана начислений в продакшене устранен. В `useDoctorPayrollTabData.ts` добавлена автоматическая гидратация списка врачей клиники через `GET /api/v1/doctors` при отсутствии входного пропса `doctorsList`. Исключен ложный пустой стейт «Врачи не зарегистрированы».
2. DEF-PAYROLL-02 [ЗАКРЫТО]: Ликвидировано двойное монтирование модалки в `FinancePatientModalsSubhost.tsx` (ранее рендерилась дважды под `s.isTimesheetT13Open` и `isDoctorPayrollOpen`).
3. DEF-PAYROLL-03 [ЗАКРЫТО]: Искоренен советский птичий язык и канцелярит Т-51 / Т-13 в пользовательском UI. Заменены на естественные клинические термины: «Ведомость начисления зарплаты» и «Табель рабочего времени» (Мандат 8x).
4. DEF-PAYROLL-04 [ЗАКРЫТО]: Консолидирован расчет процентов и комиссий вокруг канонического `doctorPayrollEngine.ts` из `@dental/shared`. Устранен тройной раскол логики, обеспечена формула Net Revenue = Услуги - ЗТЛ - Материалы.
5. DEF-PAYROLL-05 [ЗАКРЫТО]: Полная синхронизация расчета зарплат между `payroll.ts`, `doctorPerformancePayrollRoutes.ts` (`financialExecutiveReports.ts`) и `payoutsHandler.ts` (`doctorPayouts/formula.ts`). Расчёт выплат переведён на стандарт PAY-01 (Net Revenue = Выручка - Материалы - ЗТЛ, Начислено = Net Base × Ставка). Устранены `as any` и небезопасные касты `request.query / request.body`, внедрены строгие Zod-схемы `payrollCalculationsQuerySchema` и `reopenSettlementSchema`. Восстановлены и успешно пройдены 21/21 тестов `doctorPayouts.test.ts`. В `staffPayrollExports.ts` введены канонические функции клинических ведомостей `generateStaffPayrollLedgerCsv` и `generateStaffPayrollLedgerHtml`.
6. DEF-PNL-01 [ЗАКРЫТО]: В `kpiPnlMath.ts` (`@dental/shared`) полностью ликвидированы синтетические захардкоженные проценты расходов клиники (ранее 35% материалы, 25% лаборатория, 28% ФОТ). При отсутствии первичных проводок из базы данных возвращается строго 0 копеек и флаги фактического наличия данных (`hasActualMaterialsCost`, `hasActualLabCost`, `hasActualDoctorPayroll`) без галлюцинаций затрат из воздуха. Закреплено юнит-тестом `prevents DEFECT-PNL-SYNTHETIC-COSTS` в `executiveDashboard.test.ts`.
7. 4-State Visual Proof [ЗАКРЫТО]:
   - ☀️ PC Light 1440x900 (`01_doctor_payroll_pc_light_1440x900.png` — 151.1 KB)
   - 🌙 PC Dark 1440x900 (`02_doctor_payroll_pc_dark_1440x900.png` — 187.5 KB)
   - 📱 Mobile Light 390x844 (`03_doctor_payroll_mobile_light_390x844.png` — 148.0 KB)
   - 📱 Mobile Dark 390x844 (`04_doctor_payroll_mobile_dark_390x844.png` — 143.1 KB)
   - Лично осмотрены через `read_file`: Zero-Clipping, 1 Primary CTA #0d9488, Segmented Control, 0px горизонтального скролла.

8. DEF-PAYROLL-FIXER-01...06 [ЗАКРЫТО] (Red Team Fixer Surgeon — Безопасность начислений, ликвидация хардкодов и сдвоенных модалок):
   - DEF-PAYROLL-01 [ЗАКРЫТО] (Утечка зарплат коллег врачу): в `apps/api/src/routes/payroll.ts` внедрен `requirePayoutAccess`. Если у пользователя `payroll.read.own` (роль `doctor`/`assistant`), запрещен просмотр чужих данных и `?doctorId=all` с выдачей 403 `PermissionDenied`. Закрытие и открытие периодов ограничено `payroll.read` (403 для рядовых врачей).
   - DEF-PAYROLL-02 [ЗАКРЫТО] (Рассинхрон прав в отчетах): в `apps/api/src/routes/reports/doctorPerformancePayrollRoutes.ts` роут `/api/reports/doctor-payroll` переведен с `analytics.read` на `requirePayoutAccess`. В `financialExecutiveReports.ts` добавлена поддержка `filterDoctorId`: для врачей с `payroll.read.own` отдаются строго их строки и исключаются данные коллег и ассистентов.
   - **DEF-PAYROLL-03 [ЗАКРЫТО] (Хардкод "doc-volkov" в UI)**: в `GlobalDoctorPayrollModal.tsx` удален позорный хардкод `|| "doc-volkov"`. При отсутствии выбранного врача модалка отображает честный пустой стейт / выбор специалиста (Мандат 8k/8bj).
   - DEF-PAYROLL-04 [ЗАКРЫТО] (Дублирование открытия модалки): из `DirectPayrollLauncher.tsx` удален слушатель `dente:open-doctor-payroll`, исключено параллельное открытие двух окон.
   - DEF-PAYROLL-05 [ЗАКРЫТО] (Копеечные DTO и ликвидация делений на 100 в БД): в `payrollSettlementDbQueries.ts` сырое деление `/ 100` заменено на канонический `kopecksToRubles` из `@dental/shared`. В `payroll.ts` схема `closeSettlementSchema` унифицирована на целочисленные копейки `*Kopecks: z.number().int()`.
   - DEF-PAYROLL-06 [ЗАКРЫТО] (Маскирование ставок комиссии в общем списке): в `GET /api/v1/doctors` процентные ставки (`commissionPercent`, `defaultShiftRateKop`, `minGuaranteeMonthlyKop`) маскируются (0%), если у вызывающего нет прав `payroll.read` (и он не смотрит себя).
   - Тестовое покрытие и 4-State Visual Proofs: 8/8 API тестов в `payrollStudioInquisition.test.ts` (100% green), 74/74 Web payroll vitest (100% green). Сняты 4 скриншота в `docs/proofs/payroll/` (`01_payroll_pc_light.png`, `02_payroll_pc_dark.png`, `03_payroll_mobile_light.png`, `04_payroll_mobile_dark.png`) и лично осмотрены через `read_file` по 8 осям визуальной инспекции.

9. DEF-PAYROLL-07...12 [ЗАКРЫТО] (Doctor Payroll Fixer Surgeon — Устранение 6 дефектов в модуле начисления зарплаты):
   - DEF-PAYROLL-07 [ЗАКРЫТО] (Изоляция арендаторов в GET /api/v1/doctors): устранен тихий fallback `"00000000-0000-0000-0000-000000000001"`. При отсутствии `identity.organizationId` сервер возвращает 401 `AuthRequired` (Мандат 8n).
   - DEF-PAYROLL-08 [ЗАКРЫТО] (Сквозной Idempotency-Key в PostgreSQL): в `POST /api/v1/payroll/close-settlement` внедрена проверка и транзакционное сохранение заголовка `Idempotency-Key` (UUIDv7) в таблице `idempotencyKeys` (ACID-транзакция со списанием РКО). Повторные запросы возвращают сохраненный статус с `idempotency-replayed: true` (Мандат 8bo, 8zp).
   - DEF-PAYROLL-09 [ЗАКРЫТО] (Ликвидация Math.round float во фронтенде): в `GlobalDoctorPayrollModal.tsx` ручные `Math.round(rub * 100)` заменены на канонический `rublesToKopecks` из `@dental/shared/src/money.ts` (Мандат 8bm).
   - DEF-PAYROLL-10 [ЗАКРЫТО] (Прогрессивный расчет НДФЛ в кошельке врача): в `useDoctorWalletLogic.ts` примитивный `Math.round(earnedKop * 0.13)` заменен на канонический `calculateProgressiveNdflTax` из `@dental/shared` со шкалой 13%/15% и округлением до рубля по ст. 224/225 НК РФ.
   - DEF-PAYROLL-11 [ЗАКРЫТО] (Единая формула комиссии врача в API): в `doctorMyEarningsHandler.ts` инлайн-расчет комиссий заменен на `calculateDoctorCommissionKopecks` из `@dental/shared` (Мандат 8bf).
   - DEF-PAYROLL-12 [ЗАКРЫТО] (Снос сироты DirectDoctorWalletLauncher): мертвый неиспользуемый файл `DirectDoctorWalletLauncher.tsx` физически удален через `git rm` (Мандат 8aq, 8bj).
   - Тестовое покрытие: 10/10 тестов в `payrollStudioInquisition.test.ts` (100% green), 7/7 тестов в `doctorPayroll.test.ts` (100% green), 4/4 в `payrollCalculationsRealDb.test.ts`, 11/11 в `doctorPayrollSSOTSuite.test.tsx`. Компиляторы `tsc` API и Web — Exit Code 0.

10. DEF-PAYROLL-13...16 [ЗАКРЫТО] (Red Team Fixer Surgeon Домен N — Сдельная оплата, Net Margin и синхронизация кошелька врача):
   - DEF-PAYROLL-13 [ЗАКРЫТО] (Снос клонов doctorNetSalaryEngine.ts и локального реэкспорта doctorShiftEarnings.ts): физически удалены `packages/shared/src/finance/doctorNetSalaryEngine.ts` и `apps/web/src/components/doctor/doctorShiftEarnings.ts` (`git rm`). В `doctorNetSalaryBridge.ts` вычищены устаревшие методы `calculateDoctorSalary`, `calculateStandardDoctorSalary`, `calculateDoctorNetSalary`, `calculateServicesPayrollBreakdown`, `calculateDiscountSalaryBase`. Импорты всех веб-компонентов переведены на канонический `@dental/shared` (Мандат 8bf, 8bj).
   - DEF-PAYROLL-14 [ЗАКРЫТО] (Искоренение float-деления / 100 в расчете комиссий врача и аренды кресла): в `doctorRentalAndBonusEngine.ts` и `doctorShiftEarnings.ts` ручные деления `/ 100` заменены на канонические функции `percentageOfKopecks` и `calculatePercentDiscountKopecks` из `packages/shared/src/money.ts`. Исключен копеечный дрейф (Мандат 8bm).
   - DEF-PAYROLL-15 [ЗАКРЫТО] (Испарение расходов ЗТЛ при превышении выручки отдельной услуги, DEFECT 2): в `doctorPayrollDbQueries.ts` реализован гарантированный алгоритм дораспределения затрат зуботехнической лаборатории: сначала по свободной марже ортопедических услуг, затем по объёму ортопедических услуг, а при их отсутствии — через балансовую запись периода (`ЗТЛ-БАЛАНС`), гарантируя сохранение всех 1,500,000 коп. расходов ЗТЛ без потерь (тест `doctorPayroll.test.ts:555` 100% PASS).
   - DEF-PAYROLL-16 [ЗАКРЫТО] (Синхронизация построчных и агрегированных начислений в кошельке врача): в `doctorMyEarningsHandler.ts` расчет построчных комиссий услуг и категориальной разбивки приведен в строгое соответствие с `doctorPayrollEngine` (`percentageOfKopecks`, учет `retail_hygiene` и кодов услуг), обеспечивая равенство сумм по строкам и итогового `totalDoctorEarnedKop`.
   - Тестовое покрытие: 8/8 в `doctorPayroll.test.ts`, 12/12 в `doctorPayrollEngine.test.ts`, 6/6 в `doctorNetSalaryEngine.test.ts`, 4/4 в `payrollCalculationsRealDb.test.ts`, 11/11 в `payrollStudioInquisition.test.ts`, 3/3 в `doctorShiftEarnings.test.ts` (100% green). Санитарный храповик `check-staged-safety.mjs` — Exit Code 0.

---

## 🏥 8.1. Реестр устранённых дефектов страховой медицины и ДМС (DEF-DMS-01...06, Red Team Fixer Домен 25)

1. DEF-DMS-01 [ЗАКРЫТО] (Декомпозиция DmsStudioModal.tsx, Мандат 8b):
   - Монолит `DmsStudioModal.tsx` сокращен с 575 до 230 строк (значительно ниже лимита 400 строк).
   - Стейт табов, загрузка гарантийных писем из Fastify API, расчет сплита франшизы и экспорт реестров вынесены в специализированный хук `apps/web/src/components/insurance/studio/useDmsStudioState.ts` (275 строк).
2. DEF-DMS-02 [ЗАКРЫТО] (Ликвидация TS2305 DmsSplitLineResult, Мандат 8be):
   - В `apps/web/src/components/insurance/studio/DmsSplitBillingTab.tsx:4` несуществующий тип `DmsGuaranteeLineSplit` заменен на канонический `DmsSplitLineResult` из `@dental/shared`.
   - В `packages/shared/src/index.ts` добавлен канонический алиас `export type DmsGuaranteeLineSplit = DmsSplitLineResult;`.
3. DEF-DMS-03 [ЗАКРЫТО] (Ликвидация хардкодных цветов Tailwind, Мандаты 8am, 8bh):
   - В `InsuranceContractModal.tsx:187,389,405,432` и `InsuranceGuaranteeLettersList.tsx:37,64` устранены утилиты `bg-emerald-500/15`, `text-emerald-600`, `text-blue-500`, `accent-emerald-600`.
   - Все контролы и индикаторы переведены на семантические CSS-токены DENTE: `var(--teal)`, `var(--teal-surface)`, `var(--muted)`, `var(--line)`.
4. DEF-DMS-04 [ЗАКРЫТО] (Ликвидация non-null assertion '!', Мандат 8be):
   - В `apps/web/src/components/settings/insuranceModules/InsuranceDmsTariffTable.tsx:42` устранен `contracts[0]!`.
   - Внедрен безопасный fallback и защитный guard-clause `if (!selectedContract) return null;`.
5. DEF-DMS-05 [ЗАКРЫТО] (Сквозной ДМС-сплит у кресла и касса, Мандат 8e):
   - В `apps/web/src/components/visit/VisitBillingModals.tsx` добавлен проброс коллбэка `onApplySplitToCashbox` и эвент `dente:dms-split-applied`, мгновенно передающий утвержденный сплит визита в кассовый контур.
6. DEF-DMS-06 [ЗАКРЫТО] (Автозакрытие модалки и изоляция z-index футера, Мандат 8am):
   - В `useDmsStudioState.ts:handleApplySplit` добавлено автоматическое закрытие модалки на `onClose()` при подтверждении сплита.
   - В `apps/web/src/components/insurance/insurance.css` z-index модального бэкдропа установлен в `100050`, а футера модалки — в `100060`. Фоновые тосты (`z-index: 99999`) больше не перекрывают Primary CTA «Утвердить ДМС-сплит».
7. 4-State Visual Proof [ЗАКРЫТО]:
   - ☀️ PC Light 1440x900 (`01_dms_insurance_pc_light_1440x900.png` — 397 KB)
   - 🌙 PC Dark 1440x900 (`02_dms_insurance_pc_dark_1440x900.png` — 478 KB)
   - 📱 Mobile Light 390x844 (`03_dms_insurance_mobile_light_390x844.png` — 165 KB)
   - 📱 Mobile Dark 390x844 (`04_dms_insurance_mobile_dark_390x844.png` — 166 KB)
   - Лично осмотрены через `read_file`: Zero-Clipping, ровно 1 Primary CTA, 0px горизонтального скролла, отсутствие перекрытия кнопки тостами.

8. DEF-DMS-FIXER-01...05 [ЗАКРЫТО] (Red Team Fixer Surgeon — Домен 11: ДМС и Страхование, Мандаты 8bm, 8bo, 8zp):
   - **DEF-DMS-FIXER-01 [ЗАКРЫТО] (Ликвидация Float-Math и ручных `* 100` / `/ 100`, Мандат 8bm)**: В `guaranteeLetterHandlers.ts` (строки 98-100, 174-175, 223, 259, 283-284, 373-377, 416-417, 632-637, 641-643, 691-692, 732), `insuranceAnalyticsHandlers.ts` (строки 288-291, 311-312, 401-407) и `dmsFranchiseEngine.ts` (строки 388, 460, 467, 484, 545-546, 571, 576-583) все кустарные `Math.round(* 100)` и деления `/ 100` заменены на канонические функции `rublesToKopecks` и `kopecksToRubles` из `@dental/shared/src/money.ts`.
   - **DEF-DMS-FIXER-02 [ЗАКРЫТО] (Транзакционная целостность через `await db.transaction`, Мандат 8bo)**: В `claimApprovalHandlers.ts` (роуты `/api/insurance/claims/transition-status` и `/api/insurance/pre-auth/request`), `guaranteeLetterHandlers.ts` (роуты создания, редактирования, отзыва ГП и списания), `policyMutationHandlers.ts` (роуты создания, редактирования, деактивации договоров ДМС и `POST /quick-attach`) все мутации БД обернуты в атомарные `await db.transaction(async (tx) => { ... })` со строгими блокировками `for("update")` и запретом глобального `db` внутри транзакции.
   - DEF-DMS-FIXER-03 [ЗАКРЫТО] (Сквозная идемпотентность списания по ГП, Мандаты 8zp, 8bo): В `guaranteeLetterHandlers.ts` (`POST /api/insurance/guarantee-letters/:letterId/record-usage`) внедрено извлечение `request.headers['idempotency-key']`, `x-idempotency-key` и `clientMutationId`, сверка с таблицей `idempotencyKeys` (с возвратом `idempotency-replayed` для выполненных или 409 Conflict для in_flight) и сохранение результата в единой ACID-транзакции.
   - DEF-DMS-FIXER-04 [ЗАКРЫТО] (Заголовки мутаций договоров ДМС в UI, Мандат 8zp): В `useInsuranceContractsController.ts` в функциях `handleCreateContract`, `handleUpdateContract`, `handleDeleteContract` устаревший `auth.denteClinicalReadHeaders` заменен на канонический `auth.denteClinicalMutationHeaders`, передающий сквозной `Idempotency-Key` на сервер.
   - DEF-DMS-FIXER-05 [ЗАКРЫТО] (Ликвидация сырого console.warn в рантайме ЭМК): В `useVisitBillingDms.ts` вызов `console.warn` заменен на тихий логгер `logger.warn`, а расчет остатков покрытия переведен на `kopecksToRubles`.
   - Тестовое покрытие и компилятор: 21/21 тест `dmsFranchiseEngine.test.ts` PASS, 5/5 тестов `insuranceBody.test.ts` PASS, 5/5 тестов `insuranceGuaranteeLetterSafety.test.ts` PASS, 8/8 тестов `insuranceDmsCoverage.test.ts` PASS, 4/4 тестов `insuranceCashboxSplitAndOverdraft.test.ts` PASS, 8/8 тестов `insuranceRegistry.test.ts` PASS. Exit Code 0 по компиляторам `@dental/api` и `@dental/web` для всех затронутых модулей.

---

## 🎁 8.2. Реестр устранённых дефектов программы лояльности, сертификатов и семейного баланса (DEF-LOYALTY-01...06, Red Team Fixer Домен 27)

1. **DEF-LOYALTY-01 [ЗАКРЫТО] (Физический снос 4 мертвых сирот через `git rm`, Мандаты 8bf, 8aq)**:
   - Физически удалены 4 устаревших псевдо-компонента и хука:
     * `apps/web/src/components/patients/PatientLoyaltyHeader.tsx`
     * `apps/web/src/components/patients/loyalty/LoyaltyTierDropdown.tsx`
     * `apps/web/src/components/patients/loyalty/loyaltyConfig.ts`
     * `apps/web/src/components/patients/loyalty/usePatientLoyalty.ts`
   - Единым и единственным SSOT закреплены `packages/shared/src/finance/loyaltyProgram.ts` и Студия `apps/web/src/components/loyalty/LoyaltyStudioModal.tsx`.
2. DEF-LOYALTY-02 [ЗАКРЫТО] (Синхронизация матрицы грейдов и клинический язык, Мандаты 8ap, 8x):
   - В `loyaltyProgram.ts`, `loyaltyCatalogData.ts` и `loyaltyEngine.test.ts` полностью синхронизирована матрица программы:
     * Silver: 3% кэшбэк, 30% лимит списания;
     * Gold: 5% кэшбэк, 50% лимит списания;
     * Platinum: 10% кэшбэк, 70% лимит списания;
     * Family: 7% кэшбэк, 50% лимит списания.
   - Устранен корпоративный дев-сленг и лозунги: в привилегиях закреплен чистый клинический язык («Приоритетная связь с лечащим врачом»).
3. DEF-LOYALTY-03 [ЗАКРЫТО] (Целочисленные копейки без float drift, Мандат 8bm):
   - Полная ликвидация вычислений с плавающей точкой в балансах, начислениях, списаниях и номиналах сертификатов.
   - В `bonusBalanceService.ts`, `bonusRedemptionService.ts`, `familyWalletTypes.ts`, `familyPriceGuard.ts`, `familySpendAuthorization.ts` все суммы переведены на `*Kopecks` / `*Kop` (целые числа).
4. **DEF-LOYALTY-04 [ЗАКРЫТО] (Ликвидация уязвимости `|| orgId` в сертификатах)**:
   - В `apps/api/src/routes/loyaltyCertificates.ts` устранен опасный fallback `|| orgId` при погашении сертификатов, исключающий утечку и погашение сертификатов чужих организаций и филиалов.
5. DEF-LOYALTY-05 [ЗАКРЫТО] (Идемпотентность транзакций и Zero-Leak честный Empty State, Мандаты 8zp, 8zq, 8k):
   - Все POST-запросы начисления и списания снабжены заголовком `"Idempotency-Key": crypto.randomUUID()`.
   - В `LoyaltyStudioModal.tsx` удален синтетический мок-пациент по умолчанию `pat-demo-01`. При открытии без контекста пациента отображается честный Empty State с выбором пациента.
6. DEF-LOYALTY-06 [ЗАКРЫТО] (Соблюдение Sweet Spot строк, Apple HIG и машинные гейты, Мандаты 8b, 8be, 8am):
   - `LoyaltyStudioModal.tsx` декомпозирован и зафиксирован на 471 строке (норма 380–480 строк).
   - `loyaltyCatalogData.ts` оптимизирован до 332 строк (норма 280–350 строк).
   - `DirectLoyaltyLauncher.tsx` смонтирован в `AppShell.tsx:381`.
   - Дизайн-токены: ровно 1 Primary CTA `bg-[var(--primary)] text-white`, нейтральный Secondary, sentence case без `uppercase`, тач-таргеты >= 44x44px.
   - Тесты: 69/69 web unit tests PASS, 31/31 api tests PASS. В домене 27 — 0 ошибок `tsc --noEmit`.
7. 4-State Visual Proof [ЗАКРЫТО]:
   - ☀️ PC Light 1440x900 (`loyalty_01_pc_light_1440x900.png` — 71.6 KB)
   - 🌙 PC Dark 1440x900 (`loyalty_02_pc_dark_1440x900.png` — 71.1 KB)
   - 📱 Mobile Light 390x844 (`loyalty_03_mobile_light_390x844.png` — 51.1 KB)
   - 📱 Mobile Dark 390x844 (`loyalty_04_mobile_dark_390x844.png` — 51.4 KB)
   - Лично осмотрены через `read_file`: Zero-Clipping, 1 Primary CTA в Noble Teal, 0px горизонтального скролла, нативные Segmented Controls.

---

## 🧾 8.3. Реестр устранённых дефектов кассы, сплит-платежей и чеков 54-ФЗ (DEF-FIN-18 / DEF-CASHBOX-01...06, Red Team Fixer Домен E)

1. DEF-FIN-18 / DEF-CASHBOX-01 [ЗАКРЫТО] (Ликвидация дублирующего фасада, Мандаты 8bf, 8aq):
   - Физически удален дублирующий фасад `apps/web/src/components/cashbox/cashboxCatalogData.ts` через `git rm`.
   - Все импорты перенаправлены на единый канонический SSOT `apps/web/src/components/cashbox/cashRegisterCatalogData.ts`.
   - Очищены ре-экспорты в `apps/web/src/components/cashbox/index.ts` и тестовые импорты в `cashboxSsotScreens.test.tsx`.
2. **DEF-CASHBOX-02 [ЗАКРЫТО] (Нормализация денежных расчётов через `@dental/shared/src/money.ts`, Мандат 8bm)**:
   - Ликвидированы все самодельные функции и кустарные вычисления `* 100` / `/ 100` в UI:
     * `CheckoutSplitPaymentPanel.tsx`: удалена кустарная `rubToKopecks`, подключен канонический `rublesToKopecks` из `@dental/shared`.
     * `CashierPaymentLauncherHosts.tsx`: вычисление `Math.round(debtRub * 100)` заменено на `rublesToKopecks(debtRub)`.
     * `sbpQrEngine.ts`: вычисление `Math.round(sumRub * 100)` заменено на `rublesToKopecks(sumRub)`.
     * `cashRegisterSplitsData.ts`: сырые деления `/ 100` заменены на `kopecksToRubles` и `formatKopecksToRubles` из `@dental/shared`.
     * `cashShiftService.ts`: `Math.round((payload.netRevenueRub || 0) * 100)` заменено на `rublesToKopecks`.
3. **DEF-CASHBOX-03 [ЗАКРЫТО] (Соблюдение контракта `exactOptionalPropertyTypes`, Мандат 8bl)**:
   - В интерфейс `CashRegisterStudioModalProps` в `apps/web/src/components/cashbox/CashRegisterStudioModal.tsx` добавлено поле `readonly orderId?: string | undefined;` в строгом соответствии с `exactOptionalPropertyTypes: true`.
   - Ошибка компилятора `TS2339` в строке 219 полностью устранена, `tsc --noEmit` по фронтенд-пакету чист.
4. DEF-CASHBOX-04 [ЗАКРЫТО] (Дизайн-токены и ликвидация сырого Tailwind, Мандат 8am):
   - Вычищены все прямые утилитарные цвета Tailwind (`text-emerald-600`, `bg-emerald-500/10`, `text-amber-600`, `text-rose-600`, `text-blue-600`) из модулей `studioModules/`:
     * `CashRegisterTapeSection.tsx`: иконка успешной печати переведена на семантический токен `text-[var(--success-ink)]`.
     * `CashRegisterCheckoutSection.tsx`: плашки и статусы переведены на `bg-[var(--success-soft)]`, `text-[var(--success-ink)]`, `text-[var(--warning-ink)]`.
     * `CheckoutDiscountAndPayerControls.tsx`: бейджи скидки оформлены через `text-[var(--success-ink)]`.
     * `CheckoutPaymentMethods.tsx`: кнопки способов оплаты переведены на `text-[var(--success-ink)]`, `text-[var(--warning-ink)]`, `text-[var(--danger-ink)]`.
     * `CheckoutSplitPaymentPanel.tsx`: сплиты и статус сходимости оформлены через семантические токены без неона.
     * `CashRegisterShiftSection.tsx`: статусы смены переведены на токены дизайн-системы.
5. DEF-CASHBOX-05 [ЗАКРЫТО] (Фискальная очередь и DEF-FIN-13 соответствие в тестах):
   - В тесте `apps/api/src/tests/routes/cashboxWalkInRetailPayment.test.ts` устаревшая проверка генерации номера чека до физической печати на ККТ заменена на валидацию постановки в фискальную очередь `fiscalReceiptQueueId` в полном соответствии со стандартом 54-ФЗ.
6. DEF-CASHBOX-06 [ЗАКРЫТО] (4-State Visual Proof и машинные гейты):
   - Пройдены все машинные гейты: `check:encoding` (20 141 файл OK), `check:buttons` (0 violations), `check:css-tokens` (0 violations), `check:react-hooks` (3 031 файл OK), unit-тесты (11/11 web, 27/27 api).
   - 4-State Visual Proof на живом приложении (Fastify 4100 + Vite 5173 + Postgres 5432) сняты и лично осмотрены через `read_file`:
     * ☀️ PC Light 1440x900 (`01_cashbox_pc_light_1440x900.png` — 80.6 KB)
     * 🌙 PC Dark 1440x900 (`02_cashbox_pc_dark_1440x900.png` — 78.4 KB)
     * 📱 Mobile Light 390x844 (`03_cashbox_mobile_light_390x844.png` — 125.0 KB)
     * 📱 Mobile Dark 390x844 (`04_cashbox_mobile_dark_390x844.png` — 124.1 KB)
   - Подтверждено: Zero-Clipping, ровно 1 Primary CTA (`bg-[var(--primary)] text-white`), 0px горизонтального скролла, нативный Apple HIG Bottom Sheet на мобильных с Drag Handle 36x5px.

---

## 🛡️ 10. Red Team Инквизиция и Хирургическое Устранение Дефектов Биллинга и Кассы

В рамках рейда Red Team по домену «Billing, 54-FZ Cash Register & Financial Flows» выполнены следующие бескомпромиссные меры:
1. **[СНОС МЁРТВОЙ ПАПКИ-КЛОНА (Мандат 8bf)]**: Физически удалена через `git rm` мертвая папка `apps/web/src/components/finance/fiscal/engine/` (7 файлов-клонов: `fnsReceiptQrString.ts`, `incomeReturnDraft.ts`, `receptionQuickContact.ts`, `roundToHundreds.ts`, `shiftCloseZReport.ts`, `zReportAndDiscounts.ts`, `zReportReceiptTape.ts`), имевшая 0 импортов в кодовой базе.
2. DEFECT-BILL-01 [ЗАКРЫТО] (Устранение HTTP 400 при списании аванса пациента): В `apps/web/src/components/patients/tabs/finance/useDepositOperations.ts` ликвидирована отправка отрицательного `amountRub: -amount` на `/api/finance/payments`. Списание личного аванса переведено на канонический кассовый эндпоинт возврата `/api/cashbox/refund` с передачей `patientId` и обработкой человеческих ошибок.
3. DEFECT-BILL-02 [ЗАКРЫТО] (Сохранение связи возврата с карточкой пациента): В `apps/api/src/routes/cashbox/cashboxSchemas.ts` в `cashRefundBodySchema` добавлено опциональное поле `patientId: z.string().uuid().optional()`. В `apps/api/src/routes/cashbox/cashboxRefundRoutes.ts` поддержано определение `effectivePatientId` из `req.body.patientId`, благодаря чему возврат из кассы уменьшает баланс конкретного пациента и сохраняет фискальную привязку в `fiscalReceiptQueue` и `payments`.
4. DEFECT-BILL-03 [ЗАКРЫТО] (Искоренение кустарных дублей валюты, Мандат 8bf): В `apps/web/src/components/cashbox/cashRegisterCatalogData.ts` удалены самодельные дубли `formatRubles`, `formatKopecksToRubles`, `rubToKopecks`, заменены на канонические импорты и реэкспорты из `@dental/shared/src/money.ts`.
5. DEFECT-BILL-04 [ЗАКРЫТО] (Розничные чеки 54-ФЗ без медкарты): В `apps/api/src/db/billing/paymentCreationPipeline.ts` снят бюрократический барьер обязательного `patientId` для розничных продаж средств гигиены по ст. 1.2 и 4.7 54-ФЗ. При отсутствии `patientId` система находит или создает системную запись «Розничный покупатель», исключая падение пайплайна с ошибкой.
6. DEFECT-BILL-05 [ЗАКРЫТО] (Декомпозиция монолита cashRegisterSplitsData.ts, Мандат 8b): Монолит объемом 1132 строки декомпозирован на 4 чистых, специализированных модуля:
   - `stageAdvanceCalculator.ts` (130 строк): этапы лечения и расчет предоплат (ФФД 1.2 Теги 1214/1215/1212).
   - `fiscalReceiptPayloadBuilder.ts` (90 строк): генератор фискального чека 54-ФЗ `generateFiscalReceiptPayload` / `generate54FzFiscalPayload`.
   - `fastCheckoutPresetEngine.ts` (250 строк): валидация сплитов, расчет сдачи `calculateCashChangeKop` и пресеты чекаута.
   - `tenderAllocationEngine.ts` (251 строка): распределение остатков по источникам и семейный сплит.
   - Сам `cashRegisterSplitsData.ts` сокращен с 1132 до 376 строк (Sweet Spot Мандата 8b <= 400 строк).
7. 4-State Visual Proofs: Все 4 натурных снимка в `docs/proofs/cashbox/` (01 PC Light 77.1 KB, 02 PC Dark 74.4 KB, 03 Mobile Light 121.1 KB, 04 Mobile Dark 116.9 KB) повторно сняты на живом приложении и лично проверены через `read_file` по 8 осям визуальной инспекции (0px клиппинга, ровно 1 Primary CTA noble teal, нативный Apple HIG Bottom Sheet на смартфонах).
8. 100% Тестовое покрытие: Все целевые тесты кассы и биллинга проходят со 100% успехом: `fastCheckout.test.ts` (15/15 PASS), `financeAuditInquisition.test.ts` (21/21 PASS), `zReportAndWarranty.test.ts` (3/3 PASS), `dualModeZeroMockBatch4.test.ts` (8/8 PASS), `cashboxShiftModules.test.ts` (5/5 PASS), `cashboxWalkInRetailPayment.test.ts` (5/5 PASS), `cashboxDepositPaymentIntegrity.test.ts` (10/10 PASS).
9. **DEFECT-BILL-06 [ЗАКРЫТО] (Ликвидация обхода кассовой смены и `payments` в траншах рассрочки, Мандаты 8bo, 8zp, 8bm)**:
   - В `apps/api/src/routes/cashbox/installmentModules/` (`installmentContractsRoutes.ts`, `installmentTranchePayRoutes.ts`) ликвидирована Ловушка №2: первоначальный взнос при создании договора рассрочки и оплата очередных траншей (`POST /api/installments/tranches/:id/pay`) теперь ОБЯЗАТЕЛЬНО создают проводку в таблице `payments` со статусом `paid`, увеличивают `incomeTotalRub` активной смены `cash_box_shifts` и ставят чек в `fiscalReceiptQueue` (54-ФЗ). (Устаревший монолит `cashInstallmentsRoutes.ts` декомпозирован на модули.)
   - Ликвидирован Float-Drift: все расчеты и DTO траншей переведены на `@dental/shared/src/money.ts` (`rublesToKopecks`, `kopecksToRubles`, `parseKopecks`, `kopecksToNumericString`, `splitKopecks`).
   - Защита от Double-Spend: строгая fail-closed валидация `Idempotency-Key` (RFC 9562 UUIDv7, HTTP 400 `IdempotencyKeyRequired` при отсутствии или невалидном ключе) и дедупликация с возвратом заголовка `idempotency-replayed: true` без двойного списания задолженности и без повторного зачисления выручки в смену.
   - Реализован канонический сервис `PatientBalanceService` (`apps/api/src/routes/cashbox/patientBalanceService.ts`), гарантирующий строгую изоляцию личных авансов пациента (`advanceDepositTaggings`), семейных кошельков (`familyGroups`) и бонусов лояльности.
   - Написан и подтвержден 100% прохождением интеграционный тест `cashboxInstallmentsAndBalanceIntegrity.test.ts`. Все тесты кассы (12/12 PASS), `tsc -p apps/api/tsconfig.json` Exit Code 0.

---

## 🔗 11. Связанные документы архитектуры

* **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральный реестр документации проекта.
* **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Главная конституция и операционный мандат.
* **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — 3-уровневая архитектура, Mandate 8e и эргономика кассы.
* **[FRONTEND_VIEWS_MAP.md](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md)** — Карта представлений фронтенда, модалок и кассовых шторок.
* **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Исчерпывающий каталог Fastify API эндпоинтов финансового контура.
* **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил и валидации приёма.

---

## 💎 12. Реестр хирургических исправлений Red Team: Рассрочки, Сертификаты, Реферальная Лояльность и Баланс Семьи (DEF-1...DEF-7)

1. DEF-1 [SEV-1 КРИТИЧЕСКИЙ] (Ликвидация фантомных оплат рассрочки на фронтенде):
   - В `apps/web/src/components/billing/usePatientInstallmentsApi.ts` метод `payTranche` генерирует и передаёт обязательный заголовок `Idempotency-Key` (UUIDv7) и выбрасывает исключение с понятным текстом при `!res.ok`.
   - В `apps/web/src/components/billing/installments/usePatientInstallmentsState.ts` обновление локального стейта, печать квитанции и успешный тост вызываются исключительно после подтверждённого сервером ответа `res.ok === true`.
2. DEF-2 [SEV-1] (Защита от Double-Spend и идемпотентность подарочных сертификатов 54-ФЗ):
   - В `apps/api/src/routes/loyaltyCertificates.ts`, `certificateIssuance.ts` и `certificateRedemption.ts` внедрено извлечение `Idempotency-Key` (RFC 9562 UUIDv7) и проверка существующих платежей по `clientMutationId`.
   - При повторных сетевых вызовах возврат состояния происходит дедуплицированно без двойного списания баланса сертификата и без повторного начисления оплат.
3. DEF-3 [SEV-1] (Ликвидация уязвимости бесконечного начисления бонусов за один чек — Replay Bonus Exploit):
   - В `apps/api/src/routes/loyaltyModules/loyaltyReferralRoutes.ts` (`POST /api/loyalty/referrals/credit`) добавлена проверка дубликата начисления по `relatedPaymentId = paymentId` и `type = "accrual_referral"`.
   - В `apps/api/src/routes/loyaltyModules/bonusBalanceService.ts` метод `executeBonusAccrual` под строгим row lock (`for("update")`) отсекает повторные начисления по одному и тому же платежу с возвратом HTTP 409 Conflict.
4. **DEF-4 [SEV-2] (Ликвидация повторной каскадной транзакции и разрыва RLS в `awardBonusPoints`)**:
   - В `apps/api/src/services/telegram/referralLoyalty/referralRewardsEngine.ts` устранено дублирующее открытие `withTenantCtx` при наличии переданного внешнего дескриптора `tx`. Вся операция выполняется в единой ACID-транзакции.
5. **DEF-5 [SEV-2] (Безопасность Telegram WebApp при наличии `DENTE_TELEGRAM_BOT_TOKEN`)**:
   - В `apps/api/src/routes/telegramBotLoyalty/telegramWebAppSessionHandlers.ts` и `telegramReferralActionHandlers.ts` исправлена логика флага `allowDevBypass`: обход HMAC-подписи запрещен, если задан хотя бы один из токенов (`TELEGRAM_BOT_TOKEN` или `DENTE_TELEGRAM_BOT_TOKEN`).
6. DEF-6 [SEV-2] (Атомарное связывание семейной группы в единой ACID-транзакции):
   - В `apps/api/src/routes/loyaltyModules/loyaltyFamilyRoutes.ts` (`POST /api/loyalty/family/link`) создание группы, привязка главы семьи, привязка родственника и вызов `ensureFamilyMemberSpendAuthorization(tx, ...)` объединены в единый `db.transaction(async (tx) => ...)`.
7. **DEF-7 [SEV-3] (Строгая реляционная привязка баланса семьи вместо эвристики `ilike`)**:
   - В `apps/api/src/routes/family/familyBalanceService.ts` ликвидирован текстовый поиск подстрок `ilike '%семейн%депозит%'`. Выборка пополнений и возвратов переведена на строгий реляционный ключ `payments.documentId = familyGroupId`, а списаний — на `payments.method = "family_wallet"`.
8. Ликвидация мок-заглушек и починка тестов (Saboteur Purge):
   - В `referralRewardsEngine.ts` и `familyAndChurnManager.ts` ликвидированы фиктивные fallback-заглушки («Иван», «Семья Ивановых») в блоках `catch`.
   - Починены тесты `cashInstallmentsPartialPay.test.ts` и `cashboxInstallmentsAndBalanceIntegrity.test.ts` (100% PASS).

---

## 🦷 13. Реестр устранённых дефектов расчета зарплаты, комиссий и чистого дохода врачей (Doctor Commission & Net Revenue, DEF-PAYROLL-01...07)

В рамках рейда Red Team по домену «Зарплаты врачей, сдельная оплата, комиссии и чистый доход (Net Revenue = Выручка минус Материалы BOM минус ЗТЛ)» устранены 7 дефектов:
1. DEF-PAYROLL-01 [SEV-1 КРИТИЧЕСКИЙ] (Specialty ID Mismatch сбрасывал специальности клиники в general_dentist — 25% вместо 30%):
   - В `packages/shared/src/finance/payrollModules/doctorFilterAndResolver.ts` в `resolveDoctorPreset` внедрен словарь канонических алиасов `SPECIALTY_ALIAS_MAP`:
     * `therapy` -> `therapist` (30%, удержание материалов BOM)
     * `orthopedics` -> `orthopedist` (30%, удержание ЗТЛ)
     * `surgery` -> `surgeon_implantologist` (20%)
     * `hygiene` -> `hygienist` (30%)
     * `pediatric` -> `pediatric_dentist` (25%)
     * `solo-doctor` -> `general_dentist` (25%)
     * `solo_rental` -> `solo_practitioner` (100%)
   - Ликвидировано несправедливое занижение ставки терапевтов и ортопедов клиники.
2. DEF-PAYROLL-02 [SEV-1 КРИТИЧЕСКИЙ] (Утечка и «испарение» затрат ЗТЛ — Dental Lab Cost Evaporation):
   - В `apps/api/src/routes/doctorPayrollDbQueries.ts` ликвидирована потеря затрат ЗТЛ: после сопоставления услуг с заказами ЗТЛ нераспределенный остаток `remainingUnallocatedLabKop` гарантированно дораспределяется по услугам ортопедии врача, затем по остальным услугам, либо формирует балансовую строку ЗТЛ периода. 100% затрат ЗТЛ вычитаются из Net Revenue, предотвращая кассовые убытки клиники.
3. DEF-PAYROLL-03 [SEV-2] (Списание материалов BOM искажалось порядком обхода услуг визита):
   - В `apps/api/src/routes/doctorPayrollDbQueries.ts` внедрено детерминированное пропорциональное распределение затрат на материалы визита `matCostByVisit` по выручке услуг визита (по аналогии с кассовым распределением сплитов). Результат стал строго воспроизводимым и независимым от порядка обхода услуг в массиве.
4. DEF-PAYROLL-04 [SEV-1 КРИТИЧЕСКИЙ] (Закрытие расчетного периода markPaid: true НЕ создавало проводку в кассе):
   - В `apps/api/src/routes/payrollSettlementDbQueries.ts` внутри ACID-транзакции закрытия периода при `markPaid: true` и наличии `rkoNumber`:
     * Создается расходная операция в `cash_operations` (`operationType: 'expense'`, `reasonCode: 1` — Зарплата персонала, сумма `payoutKop`, ссылка на `statementId`, `rkoNumber`).
     * Списывается сумма с баланса кассового ящика `cash_boxes.balance_kopecks` и `balance_rub`. Полное соблюдение 54-ФЗ и кассовой дисциплины.
5. DEF-PAYROLL-05 [SEV-2] (Ручные float-деления / 100 и Math.round в финансовом отчете):
   - В `apps/api/src/services/reports/managerReports/financialExecutiveReports.ts` ручные деления `/ 100` и `Math.round` заменены на канонический `kopecksToRubles` из `@dental/shared/src/money.ts`.
6. DEF-PAYROLL-06 & 07 [SEV-2/SEV-3] (Мобильный кошелек врача игнорировал Net Revenue и синтетически угадывал часы):
   - В `apps/web/src/components/finance/doctorPayoutWallet/doctorShiftsComputer.ts`:
     * Вычисление заработка смены переведено на чистую базу Net Revenue (Выручка минус Материалы смены минус ЗТЛ смены).
     * Устранена синтетическая эвристика `vList.length * 1.5`: длительность смены берется из фактического интервала приемов (от 4 до 12 ч.) либо клинического стандарта 6 часов (ст. 350 ТК РФ).
7. Тестовое покрытие и валидация:
   - Интеграционные тесты `apps/api/src/tests/routes/doctorPayroll.test.ts` (7/7 PASS):
     * Проверка нормализации алиасов специальностей (DEF-PAYROLL-01).
     * Проверка детерминированного распределения материалов визита (DEF-PAYROLL-03).
     * Проверка сохранения 100% затрат ЗТЛ без испарения (DEF-PAYROLL-02).
     * Проверка создания расходной операции в кассе и списания баланса кассы по РКО (DEF-PAYROLL-04).
   - Юнит-тесты мобильного кошелька `DoctorPayoutMobileWallet.test.ts` (10/10 PASS).
   - Санитарный храповик `npm run check:ratchet` — Exit Code 0 (0 новых `any`, 0 новых супрессий).

---

## 💎 14. Реестр хирургических исправлений Red Team: Касса, 54-ФЗ, Сплит-оплаты, Фискализация, Депозиты (DEF-1...DEF-7)

В рамках рейда Red Team Fixer Surgeon по Домену 28 устранены 7 дефектов:
1. **DEF-1 [ЗАКРЫТО] (Ликвидация плавающего float / 100 и .toFixed(2) в расчете сдачи кассира, Мандат 8bm)**:
   - В `packages/shared/src/fiscal/fiscalValidation/receiptTotalsValidation.ts` функция `calculateCashChange` переведена на канонические функции целочисленной копеечной арифметики `rublesToKopecks`, `kopecksToRub` и `kopecksToNumericString` из `@dental/shared/src/money.ts`.
2. **DEF-2 [ЗАКРЫТО] (Устранение неточного SQL-деления ::numeric / 100 в incomeTotalRub, Мандат 8bm/8bo)**:
   - В `apps/api/src/routes/cashbox/paymentStages/cashboxLedgerStage.ts` (строки 193, 263) обновление выручки активной смены `incomeTotalRub` переведено на строгую формулу с `ROUND(..., 2)`: `ROUND((ROUND(COALESCE(incomeTotalRub, 0) * 100)::bigint + resolvedKop::bigint)::numeric / 100, 2)`. Исключен дрейф хвоста numeric.
3. **DEF-3 [ЗАКРЫТО] (Синхронизация amountRub и amountKopecks в payments при частичном возврате, Мандат 8bm/8bo)**:
   - В `apps/api/src/routes/fiscal/receiptRoutes/correction/receiptCorrectionSelfCalculation.ts` (`updateRefundedPaymentRecord`) обновляются ОБА поля: `amountRub: kopecksToRub(remainingKop)` и `amountKopecks: BigInt(remainingKop)`. Исключен рассинхрон между копейками и рублями.
4. **DEF-4 [ЗАКРЫТО] (Устранение сырого .toFixed(2) и деления / 100 при возвратах кассы и семейных депозитах, Мандат 8bm)**:
   - В `apps/api/src/routes/cashbox/cashboxRefundRoutes.ts` все вызовы `.toFixed(2)` и деления `/ 100` заменены на `kopecksToNumericString` и `ROUND(..., 2)` в SQL-обновлении `familyGroups.balance`.
5. **DEF-5 [ЗАКРЫТО] (Приведение цветов кассы к дизайн-токенам DENTE, Мандат 8am)**:
   - В `CashboxQuickCard.tsx`, `CashRegisterStudioFooter.tsx`, `CashRegisterCheckoutSection.tsx` и `CheckoutDiscountAndPayerControls.tsx` ликвидирован хардкод `#0d9488` и `var(--teal)` с заменой на канонические семантические токены дизайн-системы `var(--primary)`, `var(--primary-hover)` и `var(--primary-soft)`.
6. **DEF-6 [ЗАКРЫТО] (Сохранение семейного баланса при стандартном открытии кассы, Мандат 8e/8n)**:
   - В `apps/web/src/views/financeView/modalModules/FinanceModalsHost.tsx` в модалку `CashRegisterStudioModal` (состояние `s.isCashboxOpen`) добавлен проброс `patientFamilyBalanceRub={resolvePatientFamilyBalanceRub(docPat)}`. Семейный баланс пациента больше не теряется при переходе в студию кассы.
7. **DEF-7 [ЗАКРЫТО] (Идемпотентный реплей и защита от повторных сетевых вызовов, Мандат 8zp/8bo)**:
   - В `apps/api/src/routes/cashbox/paymentStages/validateAndLockStage.ts` верифицирован и усилен блок идемпотентного реплея: сумма существующего платежа вычисляется с приоритетом точных `amountKopecks`, учитываются все тендерные суффиксы сплита (`:card`, `:cash`, `:deposit`, `:bonus`, `:certificate`, `:dms`), возвращается полный контракт данных (`paymentId`, `amountKopecks`, `amountRub`, `fiscalReceiptNumber`, `clientMutationId`, `isReplay: true`, семейные балансы) с HTTP 200 OK без повторных списаний.
8. **Тестовое покрытие и валидация**:
   - `splitPaymentEngine.test.ts` (17/17 PASS);
   - `money.test.ts` (28/28 PASS);
   - `financialFixerSurgeonVerifications.test.ts` (3/3 PASS, включая атомарный инкремент выручки смены);
   - `cashboxInstallmentsAndBalanceIntegrity.test.ts` (1/1 PASS);
   - `cashboxWalkInRetailPayment.test.ts` (5/5 PASS);
   - `dualModeZeroMockBatch4.test.ts` (8/8 PASS);
   - `pediatricAndFiscalHotkeys.test.ts` (5/5 PASS);
   - `redTeamZeroBloatInquisition.test.ts` (12/12 PASS);
   - `tsc --noEmit` во всех затронутых пакетах — 0 ошибок.

---

## 🏷️ 15. Реестр устранённых дефектов Red Team Домена 23: Прейскурант, Номенклатура 804н, BOM Техкарты и Soft Negative Stock (DEF-23-01...08)

В рамках рейда Red Team Fixer Surgeon по Домену 23 устранены 8 дефектов и выполнена консолидация SSOT:
1. **DEF-23-01 [SEV-1 КРИТИЧЕСКИЙ] (Устранение рассинхрона копеечных колонок цен и себестоимости в БД, Мандаты 8b, 8bm)**:
   - В `apps/api/src/db/pricelistQuery.ts` переписан хелпер `moneyColumns`: поля `priceKopecks` и `basePriceKopecks` гарантированно синхронизируются с рублями (`basePriceRub`) через канонический `BigInt(rublesToKopecks(rub))`.
   - В мутациях `createServiceCatalogItemInDb`, `updateServiceCatalogItemInDb` и `upsertServiceBomInDb` синхронно рассчитываются и сохраняются `materialsCostKopecks = BigInt(rublesToKopecks(materialsCostRub))` и `labCostKopecks = BigInt(rublesToKopecks(labCostRub))`.
   - Исключено превращение цен услуг в «0 ₽» при чтении финансовым движком и расчете чеков.
2. **DEF-23-02 [SEV-1 КРИТИЧЕСКИЙ] (Устранение обхода ACID-транзакций в батч-импортах и сканировании, Мандат 8bo)**:
   - В `apps/api/src/db/pricelistQuery.ts` во все методы мутаций (`selectOwnedRow`, `createServiceCatalogItemInDb`, `updateServiceCatalogItemInDb`, `deactivateServiceCatalogItemInDb`) внедрен параметр `executor?: TenantDb | typeof db`.
   - Создан единый канонический сервис `apps/api/src/routes/pricelist/batchPricelistCommitService.ts`, который выполняет все операции импорта, сканирования и парсинга строго внутри `await withTenantCtx(organizationId, async (tx) => ...)`, передавая транзакционный `tx` в генераторы записей.
3. **DEF-23-03 [SEV-1 КРИТИЧЕСКИЙ] (Предотвращение затирания внутренних артикулов клиники при импорте, Мандат 8x)**:
   - В `batchPricelistCommitService.ts` ликвидировано принудительное форсирование кода `A16.07.002` на все позиции клиники.
   - Внутренний артикул клиники (`rawCode` / `item.code`) сохраняется в `code`, а код номенклатуры 804н сопоставляется независимо в `order804nCode`. Услуги без кода 804н сохраняют свой оригинальный внутренний код клиники.
4. **DEF-23-04 [SEV-1 КРИТИЧЕСКИЙ] (Изоляция Multi-Tenant RLS через withTenantCtx в pricelistQuery.ts)**:
   - Все методы прейскуранта (`getServiceCatalogForOrganization`, `getSingleServiceCatalogItemFromDb`, `createServiceCatalogItemInDb`, `updateServiceCatalogItemInDb`, `deactivateServiceCatalogItemInDb`, `seedBaseline804nServicesInDb`, `batchRepriceServicesInDb`, `getServiceBomFromDb`, `upsertServiceBomInDb`) обернуты в вызов `withTenantCtx(organizationId, async (tx) => ...)`.
   - Гарантирована 100% RLS изоляция данных организаций на уровне PostgreSQL 18.
5. **DEF-23-05 [SEV-2] (Консолидация дублирующего роута экспорта прейскуранта, Мандат 8bf)**:
   - В `apps/api/src/routes/export.ts` дублирующий блок генерации CSV (строки 189-243) удален и перенаправлен напрямую на единый канонический обработчик `handleExportPricelist(request, reply)` из `routes/pricelist/handlersExportAndReprice.js`.
6. **DEF-23-06 [SEV-2] (Ликвидация ручных операций * 100 и Math.round на фронтенде, Мандат 8bm)**:
   - В `apps/web/src/components/catalog/pricelistCatalogData.ts` (строка 66) ручной расчет `Math.round(num * 100)` заменен на канонический `rublesToKopecks(num)`.
   - В `apps/web/src/components/catalog/pricelist/usePricelistStudioState.ts` (строки 302, 369) расчет себестоимости материалов переведен на целочисленную арифметику без плавающих коэффициентов.
7. **DEF-23-07 [SEV-2] (Внедрение заголовка Idempotency-Key в мутации каталога и техкарт BOM, Мандат 8zp)**:
   - В `apps/web/src/components/catalog/pricelist/pricelistCatalogStorage.ts` в методы `syncServiceItemToBackend` и `batchSyncPricelistToBackend` внедрен заголовок `"Idempotency-Key": generateUuidV7()`.
   - В `apps/web/src/components/inventory/bomModules/useMaterialBomsMutations.ts` в мутации `handleSeedDefaults`, `handleSaveRule` и `handleDeleteRule` внедрен заголовок `"Idempotency-Key": generateUuidV7()`.
8. **DEF-23-08 [SEV-3] (Сохранение кода номенклатуры 804н при базовом сидировании)**:
   - В `seedBaseline804nServicesInDb` добавлено явное сохранение `order804nCode: baseline.code`.
9. **Снос дубликатов под `git rm` (Мандат 8bf)**:
   - Физически удалены файлы-клоны импорта `apps/api/src/routes/pricelist/serviceBatchImportCommit.ts`, `apps/api/src/routes/pricelist/serviceScanCommit.ts`, `apps/api/src/routes/pricelist/serviceIngestCommit.ts`.
   - Точка входа `catalogOperations.ts` переведена на единый `batchPricelistCommitService.ts`.
10. **Ликвидация блокировок и починка FEFO-движка**:
    - В `apps/api/src/routes/settings/serviceCatalogRoutes.ts` барьер `requireSettingsMutationAccess` заменен на `requireCatalogMutationAccess` (автономия врача у кресла, Мандат 8e).
    - В `apps/api/src/services/inventory/fefoModules/fefoDeficitResolver.ts` устранена ошибка `ReferenceError: purchaseOrderDraft is not defined`.
    - В `apps/api/src/services/treatmentConsumables/unifiedStockDeductionEngine.ts` добавлен недостающий импорт `eq`.
    - Накатана миграция БД `0287_procedure_tech_card_alternatives.sql`.
11. **Тестовая верификация (Exit Code 0)**:
    - `apps/api/src/tests/routes/pricelistCatalogInquisition.test.ts` (8/8 PASS);
    - `apps/api/src/tests/routes/pricelist.test.ts` (23/23 PASS);
    - `apps/api/src/tests/routes/pricelistBatchImportRoute.test.ts` (4/4 PASS);
    - `apps/api/src/tests/routes/pricelistScanAndImportRoute.test.ts` (5/5 PASS);
    - `apps/api/src/tests/routes/chairsideVisitBomFefoIntegration.test.ts` (4/4 PASS);
    - `apps/api/src/tests/routes/inventoryRedTeamBOMAndInvoices.test.ts` (3/3 PASS);
    - `npm run check:diff` — 0 костылей;
    - `npm run check:encoding` — 19968 файлов UTF-8 без замечаний;
    - `tsc --noEmit` — 0 ошибок типов в бэкенде и фронтенде по Домену 23.

---

## 🏷️ 16. Реестр устранённых дефектов Red Team Домена 21: Программа лояльности, Бонусный счет, Подарочные сертификаты, Реферальная система и Семейный баланс (DEF-21-01...07)

В рамках рейда Red Team Fixer Surgeon по Домену 21 устранены 7 дефектов, физически ликвидирован легаси-дубликат `referrals.ts` и консолидирован канонический SSOT:
1. **DEF-21-01 [SEV-1 КРИТИЧЕСКИЙ] (Устранение уязвимости Double-Spend при списании бонусов семейного счета, Мандаты 8zp, 8bo)**:
   - В `apps/api/src/routes/loyaltyModules/loyaltyFamilyRoutes.ts` (роут `POST /api/loyalty/family/spend`) внедрен обязательный `extractIdempotencyKey` с валидацией UUIDv7/v4.
   - Значение заголовка передается в `executeBonusRedeem` как `clientMutationId: idempotencyKey`. Повторные сетевые клики («двойной тап») возвращают сохраненный результат без повторного списания баллов (заголовок `idempotency-replayed: "true"`).
2. **DEF-21-02 [SEV-1 КРИТИЧЕСКИЙ] (Ликвидация вечного статуса `pending` у рефералов и рассинхрона начислений, Мандаты 8e, 8bo)**:
   - В `apps/api/src/routes/loyaltyModules/loyaltyReferralRoutes.ts` в транзакционном начислении реферального вознаграждения (`POST /api/loyalty/referrals/credit`) добавлено обязательное обновление записи `patientReferrals`: `status = 'rewarded'`, `qualifyingPaymentId = verifiedPayment.id`, `qualifyingAmountRub`, `rewardedAt = new Date()`, `updatedAt = new Date()`.
   - Рефералы гарантированно переходят в статус вознагражденных с привязкой к чеку оплаты в базе данных PostgreSQL 18.
3. **DEF-21-03 [SEV-2] (Физический снос легаси-клона `referrals.ts` через `git rm` и ликвидация float-арифметики, Мандаты 8bf, 8bm)**:
   - Файл-дубликат `apps/api/src/routes/referrals.ts` физически удален через `git rm`.
   - Маршруты `GET /api/referrals/my-code/:patientId`, `POST /api/referrals/attribute`, `POST /api/referrals/reward-first-visit` перенесены в канонический модуль `loyaltyReferralRoutes.ts`.
   - Ликвидированы `.toFixed(2)` и прямой обход транзакционного FIFO-журнала: вознаграждения начисляются через канонический `executeBonusAccrual` в целочисленных копейках с созданием бухгалтерской проводки в `patient_bonus_ledger`.
4. **DEF-21-04 [SEV-2] (Синхронизация баланса касс при продаже сертификатов и семейных возвратах, Мандат 8bm)**:
   - В `apps/api/src/routes/loyaltyModules/certificateIssuance.ts` при продаже подарочного сертификата в кассе атомарно обновляются обе колонки: `balanceRub = kopecksToNumericString(newBalanceKop)` и `balanceKopecks = newBalanceKop`.
   - В `apps/api/src/services/familyWallet/modules/familyRefundOperation.ts` обновляются обе колонки кассы `balanceRub` и `balanceKopecks`, устраняя прогрессирующий рассинхрон копеечных остатков.
5. **DEF-21-05 [SEV-2] (Канонический приоритет `balanceKopecks` над устаревшей строкой `balance` в Family Wallet, Мандат 8bm)**:
   - В `depositAndFamilyStage.ts`, `familyWalletFacade.ts`, `familySpendAuthorization.ts` и `familyRefundOperation.ts` чтение баланса семейной группы переведено на безопасный канонический приоритет `(family.balanceKopecks && Number(family.balanceKopecks) > 0) ? Number(family.balanceKopecks) : (family.balance ? parseKopecks(family.balance) : 0)`.
   - Исключены ошибки чтения нулевого дефолта `balance_kopecks` для старых записей и гарантирована автоматическая синхронизация обеих колонок при любой финансовой мутации.
6. **DEF-21-06 [SEV-3] (Устранение float-арифметики в кроне сгорания бонусов по сроку жизни, Мандат 8bm)**:
   - В `apps/api/src/routes/loyaltyModules/bonusBalanceService.ts` (метод `processExpiredBonusesForAllPatientsBatch`) вычисление сгоревших бонусов переведено с плавающего сложения строк на строгое копеечное суммирование через `sumKopecks` и `parseKopecks`.
7. **DEF-21-07 [SEV-3] (Интеграция инпутов списания бонусов и подарочных сертификатов в UI кассы, Мандаты 8e, 8am, 8al)**:
   - В `apps/web/src/components/cashbox/studioModules/checkout/CheckoutSplitPaymentPanel.tsx` добавлены эргономичные карточки списания подарочного сертификата (с номером и суммой) и списания бонусных баллов (с отображением доступного баланса и кнопкой «Макс»).
   - В `useCashRegisterStudioState.ts` добавлены состояния `splitBonusRub` и `splitCertRub`, сбалансированные в пресетах сплита (50/50, 100% нал/карта/СБП), формирующие корректные тендеры списания в `splitTenders`.
8. **Тестовая верификация и подтверждение чистоты (Exit Code 0)**:
   - `apps/api/src/tests/concurrency/loyaltyAndCertificateAcidStress.test.ts` (4/4 PASS: 10 parallel redemptions double-spend defense, 15 concurrent replay storms);
   - `apps/api/src/tests/routes/loyaltyMarketingInquisitionSuite.test.ts` (7/7 PASS: ACID-сплит, откат при нехватке, BOLA/IDOR защита, списание по доверенности, рефералы в БД, 3D RFM когорты, 2-phase hold/confirm/release);
   - `apps/api/src/tests/loyaltyBonusTtlExpiration.test.ts` (4/4 PASS: JIT TTL сгорание, FIFO очередность списания, защита от отрицательного баланса, фоновый крон);
   - `npm run check:diff` — Exit Code 0 (0 костылей, 0 float money);
   - `tsc --noEmit` — Exit Code 0 по всем затронутым модулям.




---

## 🧹 17. ROT-015 (Wave 9) и `§3.3 DEAD_INTERNAL`: вывод `*Rub` колонок БД и зачистка мёртвых роутов

- **ROT-015 1B (DDL миграция `apps/api/drizzle/0308_rot015_echelon1_drop_rub.sql`)**: физически удалены 17 legacy `*Rub` колонок, полностью дублировавших `*Kopecks BIGINT`:
  - `uis_sms_chat_quotas.cost_rub` (1 колонка -> `cost_kopecks` в `uisSmsChatQuotasQuery.ts`);
  - `migration_reconciliations.{source,loaded,quarantined}_money_total_rub` (3 колонки -> `*Kopecks` в `reconcile.ts`, `migrationStatusRoutes.ts`, `migrationProgressHandlers.ts`);
  - `doctor_payroll_statements` (все 12 `*Rub` колонок: `gross_revenue_rub`, `lab_cost_rub`, `materials_cost_rub`, `net_base_revenue_rub`, `calculated_piecework_rub`, `fixed_salary_rub`, `service_salary_price_rub`, `bonuses_total_rub`, `penalties_total_rub`, `total_accrued_rub`, `ndfl_13_rub`, `net_payout_rub` + снос сиротского PG view `staff_payroll_settlements`, расчёты и запросы переведены на `*Kopecks`);
  - `advance_deposit_taggings.deposit_amount_rub` (1 колонка -> `deposit_amount_kopecks` в `advanceCreditOp.ts`, `advanceDebitOp.ts`, `advanceRefundOp.ts`, `balanceQueryService.ts`, `depositAndFamilyStage.ts`, `settlementAndBomStage.ts`, `refundExecutionEngine.ts`).
  - Отложенный блокер Эшелона 1: `cash_operations.{balance_before_rub, balance_after_rub}` сохранены в схеме до синхронного обновления raw SQL в стоп-зонном тесте `apps/api/src/tests/backupSchemaParity.test.ts:309`.
- **`§3.3 DEAD_INTERNAL` (2FP консолидация роутов)**: удалены 36 мёртвых/дублирующих `/api` маршрутов (`1273 -> 1237`), включая заглушки `403`/`410` (`POST /api/whatsapp/qr/session/simulate-auth`, `POST /api/settings/reset-demo`, `POST /api/settings/reset-zero`), невызываемые одиночные роуты (`POST /api/billing/refunds/partial`, `POST /api/clinical/dental-lab/express-order`, `POST /api/clinical/dental-lab/check-plan-continuity`, `POST /api/finance/family/refund`, `POST /api/imaging/decode-heic`, `POST /api/services/batch-update`, `POST /api/visits/fast`, `POST /api/visits/:visitId/work-order/complete`, `POST /api/v1/message-templates/seed`, `GET /api/analytics/chairs-utilization`, `GET /api/analytics/diagnocat`, `GET /api/lan/status`, `POST /api/lan/token`) и неиспользуемые алиасы кассовых смен, X-отчётов, коррекции, retry-fiscalize, справочника статей расхода и черновика приёма (`/api/v1/visits/:visitId/diary`, `/api/visits/:visitId/emk`), с синхронизацией `scripts/config/single-doors-allowlist.json`, `scripts/check-route-callers.mjs` и `scripts/smoke-clinical-mutation-guard.mjs`.


---

## 18. Реестр закрытых дефектов Red Team: Финансы, Касса, Депозиты, ЗП IDENT и 1С (P0-1..P2)

- **P0-1 & P0-2 (Личный аванс, сальдо пациента и изоляция от семейного депозита):**
  - Введены `isPersonalAdvanceOffsetPayment` (`packages/shared/src/finance/paymentRefundNormalization.ts`) и `calculationMethod: "advance_offset"` + `isPersonalAdvanceOffset` / `isPersonalAdvanceTopup` / `isFamilyWallet` (`packages/shared/src/fiscal/fiscalReceiptSchemas.ts`).
  - `apps/api/src/routes/cashbox/paymentStages/{depositAndFamilyStage.ts, splitAllocationStage.ts}` и `balanceModules/advanceDebitOp.ts`: сначала проверяются личные `advanceDepositTaggings` (убран захват личного депозита семейным пулом при `familyGroupId`), удалено `Math.max(advanceTotalKop, ledgerOverpaidKop)`, личные авансовые зачёты пишутся с `method: "other"` и `calculationMethod: "advance_offset"` + `isPersonalAdvanceOffset: true`.
  - `apps/api/src/money/patientDebtLedger.ts` и `apps/api/src/services/reports/managerReports/debtReports.ts` исключают строки зачёта личного аванса из суммарных оплат пациента (исключён двойной учёт оплаты `paidKopecks`), сохраняя их учёт в `buildVisitLedger` и `reconcileInvoiceBalanceInDb`.
- **P1-1, P1-2, P1-8 & P2 (Возвраты 54-ФЗ, сверка счетов, гарантия и блокировка переплаты):**
  - `apps/api/src/routes/billingRoutes/invoiceBalanceReconciler.ts`: при полном/частичном возврате счёт получает статус `"refunded"` / `"partially_refunded"` (без отката в `"draft"`), поддерживается откат позиций `treatment_items` при in-place возврате.
  - `apps/api/src/routes/cashbox/refundModules/{refundExecutionEngine.ts, refundLookupAndValidation.ts}`, `cashboxSchemas.ts`, `cashboxRefundRoutes.ts`: поддержка `"sbp"`, `refundedItemIds`, пометка исходного платежа `status = "refunded"` + `fiscalReceipt.refundedInPlace = true` при 100% возврате (при проверке доступного остатка в `lockAndValidateRefundTargets` учитываются оригинальные положительные строки с `refundedInPlace = true`).
  - `apps/api/src/routes/cashbox/paymentStages/{warrantyStage.ts, acquireLockAndReplayStage.ts}`: запрет оплаты/гарантии на `voided`/`cancelled`/`refunded` (`409 InvoiceVoidedConflict`) и переплаты (`400 InvoiceOverpaymentError`).
  - UI `RefundServiceModal` (`refundServiceModalModules/{types.ts, RefundPaymentMethodSelector.tsx, refundUtils.ts, useRefundServiceModalController.ts}`): добавлен выбор `"sbp"`, передача UUID `refundedItemIds`, убран дубль локальной `FiscalReceiptQueueManager.enqueueReceipt` при `hardware_offline`.
- **P1-3, P1-4, P1-5, P1-7 (Рассрочки, разнесение по кассам, Z-отчёт/смены, ККТ-очередь):**
  - `apps/web/src/components/cashbox/studioModules/cashRegisterApi.ts`: убрано лишнее поле `totalAmountKopecks` из payload `POST /api/installments`.
  - `apps/api/src/routes/fiscal/receiptRoutes/receiptCashBoxLedger.ts`: раздельное зачисление наличных (`chosenBox`) и безналичных карта+СБП (`cashlessBox`) даже при явно переданном `cashBoxId`.
  - `apps/api/src/routes/cashbox/cashboxShiftModules/{shiftCloseHandler.ts, shiftReconciliationEngine.ts}` и `apps/web/src/components/shift/CashShiftClosingModal.tsx`: раздельный учёт РКО и возвратов (`expenseTotalRub`), зачисление безнала/СБП/ДМС на `main` в соло-режиме при отсутствии открытой безналичной смены, сохранение `countedCashRub` от сброса при редактировании.
  - `apps/api/src/services/hardware/queueModules/fiscalQueueWorker.ts` и `receiptQueueHandlers.ts`: `withSavepoint` на обновлении статуса платежа при ретрае очереди и флаг `ignoreBackoff: true` для ручного `/api/fiscal/queue/retry-all`.
- **P1-6 & P1-9 (ЗП IDENT и 1С CommerceML 2.09):**
  - `apps/api/src/routes/payrollModules/{payrollTypesAndQueries.ts, payrollDatasetQuery.ts, payrollCalculationsHandler.ts, payrollSettlementHandlers.ts, payrollSchemas.ts, doctorMyEarningsHandler.ts}` и фронт `apps/web/src/components/payroll/{payrollCatalogData.ts, doctorPayrollModalUtils.ts, DoctorPayrollTabPanel.tsx, DoctorPayrollStudioModal.tsx}` + `useDoctorWalletLogic.ts`: атрибуция оплат с `payments.visitId IS NULL` через `LEFT JOIN patient_invoices`, хронологическая сортировка `priorDebtCarryOverKop`, детерминированный `ORDER BY` для `storno`, загрузка профиля врача и категорий IDENT вместо хардкода `400000`/`"employee"`, границы дат по `clinicTimeZone`, корректные заголовки `Authorization` и единые `computePayrollPeriodKey`.
  - `apps/api/src/services/finance/commerceMl/modules/{packageBuilder.ts, materialsAndPayrollReconciliation.ts, paymentReconciliation.ts}`: таймзона клиники для границ выгрузки, фильтрация складских списаний без приходных накладных (`receipt`), исключение 30% взносов при `ndfl13Kopecks === 0` (`self_employed`/`chair_rental`), перенос отрицательного сальдо ЗП и выгрузка дней с возвратами (`!== 0`).
- **Верификация и переписанные честные тесты (Правило 6Г):**
  - Новый PG18 интеграционный suite `apps/api/src/tests/routes/redteamFinancePayroll1cRegression.test.ts` (4/4 PASS).
  - Переписаны на реальный SUT без `readFileSync`/`typeof`-пустышек: `settlementPeriodCloseIntegration.test.ts` (3/3), `doctorPayrollFixerRegression.test.ts` (4/4), `canonicalPayrollHubSsot.test.ts` (8/8), `soloDoctorInvoicingAndTelephonyAutonomy.test.tsx` (14/14).
  - Суммарные таргетные прогоны после финальных правок: backend+settlement 161/161 PASS (36 suites, 0 skip) + redteam PG18 4/4 PASS + web UI/payroll/refund 29/29 PASS (8 suites, 0 skip).
