# 💰 Billing, 54-FZ Fiscal Cashiering & Integrations Highway

> **Canonical Authority**: Mandates 8, 8b, 8c, 8e in [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) and [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md).  
> **Related Documents**: [INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) • [ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md) • [API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md) • [DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) • [TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md) • [WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) • [CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md) • [DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) • [API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md) • [FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md).

---

## 📐 1. Точные математические правила: целочисленные копейки (Zero Float Drift)

Все финансовые операции, начисления, скидки, остатки счетов, кассовые чеки 54-ФЗ и расчеты вычетов в DENTE ведутся **строго в целочисленных копейках** (`integer` в TypeScript / `bigint` / `numeric` в PostgreSQL). Использование чисел с плавающей запятой (`float` / `double`) для хранения и сложения денег **категорически запрещено** (Мандат 8b, The Hammer Часть 8 п. 2).

### 1.1. Базовые функции конвертации (`@dental/shared`):
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

## 🧾 2. Касса 54-ФЗ (ФФД 1.2): 1-клик комбинированная оплата и правила ИНН

Кассовый контур DENTE полностью соответствует Федеральному закону № 54-ФЗ и формату фискальных данных ФФД 1.2 (Приказ ФНС России от 14.09.2020 № ЕД-7-20/662@).

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
* **Счета 70, 68.01, 69** — Начисление заработной платы врачам (форма Т-51), удержание НДФЛ и страховые взносы.

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
| **Кассовый чек 54-ФЗ** | [`FiscalReceipt54FzModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/FiscalReceipt54FzModal.tsx) | [`fiscalReceiptRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts) |
| **1-Клик касса / Split** | [`CashRegisterModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashRegisterModal.tsx) | `POST /api/fiscal/receipts` |
| **Fast Checkout Engine** | [`fastCheckoutEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/checkout/fastCheckoutEngine.ts) | `POST /api/billing/payments` |
| **Семейный кошелек** | [`FamilyWalletModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/FamilyWalletModal.tsx) | [`finance_family.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts) |
| **Справка ФНС КНД 1151156**| [`TaxDeductionCertificateModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/TaxDeductionCertificateModal.tsx) | [`taxDeductionEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/taxDeductionEngine.ts) |
| **Экспорт 1С CommerceML** | [`Billing1CExportModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/Billing1CExportModal.tsx) | [`commerceMl.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts) |

---

## 🔗 7. Связанные документы архитектуры

* **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральный реестр документации проекта.
* **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Главная конституция и операционный мандат.
* **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — 3-уровневая архитектура, Mandate 8e и эргономика кассы.
* **[FRONTEND_VIEWS_MAP.md](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md)** — Карта представлений фронтенда, модалок и кассовых шторок.
* **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Исчерпывающий каталог Fastify API эндпоинтов финансового контура.
* **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил и валидации приёма.

