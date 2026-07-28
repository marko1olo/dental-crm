# Разведка: можно ли посчитать выплату врачу из живых данных

Дата: 2026-07-28. HEAD на момент разведки: `676afd40f`.
Код не правился — только чтение файлов и `SELECT` по живой базе
(`DATABASE_URL` из корневого `.env`, PostgreSQL 18 на `127.0.0.1:5432`, БД `dental_crm`).

**ВЕРДИКТ: partial.** Выручка врача за период считается целиком и уже посчитана в бою.
Удержание за материалы и «к выплате» не считаются НИ ДЛЯ ОДНОГО врача: в живой базе нет ни
одной строки себестоимости и ни одной строки ставки. Фасад
(`FinancialDashboard` + `DoctorPayoutDashboard`) монтировать нельзя — он обещает шесть колонок,
из которых честны две.

---

## 0. Что подтвердилось из вводных ведущего

Перепроверено, а не принято на слово.

* Страж достижимости `scripts/check-component-mount-reachability.mjs` — запущен, вывод дословно:
  `СИРОТА — не импортирует никто (19)`, и в списке
  `apps/web/src/pages/FinancialDashboard.tsx:18 FinancialDashboard`,
  `apps/web/src/pages/DoctorPayoutDashboard.tsx:16 DoctorPayoutDashboard`
  с пометкой «рендерится из `FinancialDashboard.tsx`, но эта ветка не связана с `main.tsx`».
  Оба экрана недостижимы. **ПРОВЕРЕНО.**
* `FinancialDashboard` принимает `metrics: FinancialMetrics`
  (`apps/web/src/pages/FinancialDashboard.tsx:18`), тип объявлен там же на строках 5-16,
  производителя нет. **ПРОВЕРЕНО.**
* `DoctorPayoutDashboard.tsx:23` зовёт `GET /api/billing/payouts`; адрес числится в списке
  заведомо отсутствующих — `apps/api/src/tests/webCallsExistingRoutes.test.ts:72`, в блоке
  «Незаконченные разделы». **ПРОВЕРЕНО.**
* «Средний чек» уже есть в работающем отчёте:
  `apps/web/src/components/reports/ManagerReportsPanel.tsx:350` (заголовок) и `:372` (значение).
  **ПРОВЕРЕНО.**

---

## 1. ВЫРУЧКА ВРАЧА ЗА ПЕРИОД

### Единственная связь деньги → врач, которая существует фактически

В таблице `payments` (`apps/api/src/db/schema.ts:515-556`) **колонки врача нет вовсе**. Есть
`patientId`, `visitId`, `documentId`. Врач достаётся только цепочкой из трёх соединений:

```
payments.visit_id      -> visits.id              (schema.ts:519, :399)
visits.appointment_id  -> appointments.id        (schema.ts:402, :381)
appointments.doctor_user_id -> users.id          (schema.ts:384)
```

`appointments.doctorUserId` — единственное поле врача в этой цепочке, и оно настоящий FK на
`users.id`. Ничего не выдумано: это ровно та цепочка, которой уже пользуется рабочий отчёт
`doctorPerformance` — `apps/api/src/services/reports/managerReports.ts:170-186`, и его же
комментарий на `:164-167` называет её вслух.

### Живые писатели по каждому кандидату

| Таблица | Писатель в `apps/api/src` (не тест, не скрипт) | Строк в живой БД | Связь с врачом |
| --- | --- | --- | --- |
| `payments` | **ЕСТЬ**: `db/billingQuery.ts:78` `createPaymentInDb` (маршрут `POST /api/billing/payments`); плюс `routes/finance_family.ts:484` и `:617` (семейный кошелёк) | **8** | только через `visits`→`appointments` |
| `treatment_items` | **частично**: `routes/diary.ts:213` `.update()` ставит `status='completed'`; `INSERT` в рабочем коде нет — только `scripts/seedOpsScreenshotDemo.ts:372` и тесты | **10** | через `visits`→`appointments`; `planned_doctor_user_id` заполнен у **0 из 10** |
| `patient_invoices` | **НЕТ НИ ОДНОГО** (`db.insert(patientInvoices)` не встречается нигде) | **0** | — |
| `treatment_plans` | нет в рабочем коде | **0** | `doctor_id` заполнен у 0 из 0 |
| `treatment_plan_items_new` | `routes/odontogram.ts:479` | **0** | врача нет в таблице вовсе |
| `visit_diaries.doctor_id` | подпись пишет `locked_by_user_id`/`co_signed_by_user_id` (`diary.ts:174-184`), а `doctor_id` не пишет никто | **0** | мёртвый путь |
| `doctor_payrolls` | нет | **0** | таблица есть в БД, писателя нет |
| `pricelist_doctor_payrolls` | нет | **0** | таблица есть в БД, писателя нет |

### Доказательство на живых данных

```
PAYMENT_TO_DOCTOR_CHAIN:
  payments_total 8 | have_visit 8 | visit_has_appt 8 | appt_has_doctor 8
  sum_all 67400.00 | sum_attributable 67400.00
```

Все восемь платежей доходят до врача, «не отнесено» = 0,00 ₽. Разрез:

```
Гаврилов Никита Сергеевич  (d005 -> см. ниже) 4 платежа  44000.00
Смирнова Елена Владимировна                   4 платежа  23400.00
```

(в выборке по `payments` d006 = 44 000, d005 = 23 400; по `treatment_items` наоборот
d005 = 76 400, d006 = 44 000 — суммы плана и суммы кассы расходятся, см. п. 5).

`visit_diaries` = **0 строк**, поэтому путь «через дневник» даёт ноль:
`diary_doctor_id_present 0`, `diary_author_present 0`. Использовать его нельзя.

### ВЫБОР ИСТОЧНИКА

**`payments` + `visits` + `appointments`, фильтр `payments.status='paid'` и
`payments.paid_at` в периоде.** Причины:

1. Это единственный источник, где деньги ФАКТИЧЕСКИ получены. `treatment_items.price_rub` —
   это назначенная цена, а не касса; платить процент с невыставленных денег нельзя.
2. У него есть живой писатель на пользовательском маршруте.
3. Связь с врачом не додумана: она уже используется в проде.

`payments.amount_rub` — `numeric(12,2)`, в схеме объявлен с `mode: "number"` (schema.ts:535),
то есть drizzle отдаёт число, а не строку. Точность до копейки соблюдена.

Статусы платежей в перечислении: `planned | paid | refunded | voided`. В живой базе все 8 —
`paid`/`card`. Возвраты (`refunded`) считать вычетом нельзя без указания ведущего: писателя,
переводящего платёж в `refunded`, в рабочем коде нет (`documents/guards.ts:377` прямо
фиксирует, что `db.update(payments)` не вызывается ни разу). Поэтому в отчёте берётся строго
`status='paid'`, а не «всё минус возвраты» — иначе получится вычитание из пустого множества,
выданное за учёт возвратов.

---

## 2. МАТЕРИАЛЫ — источника нет, цепочка мертва на четырёх шагах подряд

### Как это устроено в коде

Таблица инвентарных транзакций: **`inventory_transactions`** (`schema.ts:1620-1635`).
Живые колонки (проверено в `information_schema`, порядок физический):

| Колонка | Живой тип | NULL | Роль |
| --- | --- | --- | --- |
| `organization_id` | uuid | NO | область клиники |
| `visit_id` | uuid | YES | **привязка к визиту** |
| `inventory_item_id` | uuid | **NO** | позиция склада |
| `quantity_changed` | **integer** | **NO** | количество, отрицательное при расходе |
| `unit_cost_rub` | numeric | **NO** | **цена единицы** |
| `transaction_type` | text | NO | **тип**, для расхода `auto_deduct` |
| `user_id` | uuid | YES | кто подписал |
| `item_id`, `qty`, `notes` | uuid/numeric/text | YES | поздние псевдонимы, не заполняются |

Себестоимость по визиту = `sum(unit_cost_rub * abs(quantity_changed))` по строкам с
`transaction_type='auto_deduct'` и нужным `visit_id`. К врачу привязки в таблице НЕТ:
`user_id` — это подписант дневника, а не врач приёма. К врачу строка приходит той же цепочкой
`visit_id → visits.appointment_id → appointments.doctor_user_id`.

Писатель: `routes/diary.ts:336-344`, внутри церемонии подписания дневника (плюс ручное
движение склада `routes/inventory.ts:215`).

### ЧТО ПОКАЗАЛА ЖИВАЯ БАЗА

```
service_catalog_items       0
procedure_material_rules    0
inventory_items             0
inventory_transactions      0
treatment_items с service_id 0   (из 10 строк)
visit_diaries               0
```

Цепочка обрывается **на каждом** из четырёх звеньев, и вдобавок обрывается в коде:
`diary.ts:224` — `if (!item.serviceId) continue;`. У всех 10 живых `treatment_items`
`service_id` = NULL, значит цикл списания не начинается даже теоретически, независимо от
правил и остатков. И `visit_diaries` = 0 означает, что церемония подписания в этой базе не
выполнялась ни разу: статус `completed` у позиций проставлен сеялкой напрямую.

**Себестоимость материалов по визиту получить неоткуда. Ни одного визита с ценой материала в
базе не существует. Проверять «цена не NULL» не на чем — строк нет.**

### Две ловушки, которые ждут, когда склад заполнят

1. `inventory_items.unit_cost_rub` в живой БД — `numeric NOT NULL DEFAULT '0'`. Позиция,
   завезённая без цены, даёт себестоимость 0,00 ₽ молча. В выплате это означает завышение
   суммы врачу, и никакой ошибки при этом не будет. Отчёт обязан отличать «материалов не
   было» от «материал без цены», иначе он тихо переплачивает.
2. `quantity_changed` в живой БД — **integer**, а `treatment_items.quantity` — `numeric(10,2)`.
   Услуга с количеством 1,5 при правиле 1 требует записать «-1.5» в integer-колонку;
   PostgreSQL отвергает запрос, ошибка не является `DiarySigningError` и уходит 500-м.
   Это уже описано долгом в самом коде — `diary.ts:314-324`, — и решение за ведущим.

---

## 3. СТАВКА — какие колонки реально заполняются

### Живая структура `doctor_commissions` против объявления в схеме

Объявление: `schema.ts:1681-1695`. Живые колонки (физический порядок вскрывает историю):

| Колонка | Живой тип | NULL | DEFAULT |
| --- | --- | --- | --- |
| `user_id` | uuid | **NO** | — |
| `specialty` | enum `dental_specialty` | **NO** | нет |
| `service_category` | enum `service_category` | **NO** | нет |
| `commission_pct` | numeric(5,2) | **NO** | `'25'` |
| `material_cost_deduction_pct` | numeric(5,2) | **NO** | `'0'` |
| `is_active` | boolean | NO | `true` |
| `effective_from` | timestamptz | NO | `now()` |
| `effective_to` | timestamptz | YES | — | **в `schema.ts` этой колонки НЕТ** |
| `doctor_id` | uuid | **YES** | — | дописана позже |
| `commission_percent` | numeric(5,2) | **YES** | `'25'` | дописана позже |

`user_id` — NOT NULL, `doctor_id` — nullable и добавлена позже. Это уже отвечает на вопрос
ведущего: рабочая колонка — **`userId`**.

### Что делают оба писателя

**Писатель 1 — `routes/diary.ts:369-377`** (подпись дневника, если ставки ещё нет; поиск на
`:357-366` идёт по `doctorCommissions.userId`):

```
organizationId, userId, specialty: "universal", serviceCategory: "therapy",
commissionPct: "30.00", materialCostDeductionPct: "100.00", isActive: true
```

**Писатель 2 — `routes/workspaceProfile.ts:779-786`** (мастер первого запуска):

```
organizationId, userId: newUser?.id, specialty: "therapist",
serviceCategory: "consultation", commissionPct: (s.percentage ?? 25).toString()
```

### Факты, которые из этого следуют

1. **`doctorId` не пишет НИКТО.** Оба писателя пишут `userId`. Отчёт, соединяющий ставку по
   `doctor_id`, получит пустоту всегда. Джойнить только по `user_id`.
2. **`commissionPercent` не пишет НИКТО**, но колонка NOT NULL-ной не является и имеет
   DEFAULT `'25'`. Значит после `diary.ts` в одной строке лежит `commission_pct = 30.00` и
   `commission_percent = 25.00` одновременно. Отчёт, читающий `commission_percent`, заплатит
   врачу 25% там, где система назначила 30%, — и не покажет ни ошибки, ни расхождения.
   **Читать только `commission_pct`.**
3. **Два писателя задают РАЗНУЮ политику материалов.** `diary.ts` ставит
   `materialCostDeductionPct = 100.00`, `workspaceProfile.ts` не ставит вовсе, и колонка
   получает живой DEFAULT `0`. То есть у врача, заведённого мастером, материалы не
   удерживаются, а у врача, чья ставка родилась при подписи приёма, удерживаются полностью.
   Одна клиника, две зарплатные политики, зависящие от того, каким путём появилась строка.
4. **Уникальности нет.** Единственный индекс на таблице — `doctor_commissions_pkey` по `id`.
   Ни `unique(user_id)`, ни `unique(user_id, service_category)`. Мастер вставляет
   безусловно, `diary.ts` делает select-then-insert без ограничения в БД. У одного врача
   может оказаться несколько активных строк ставки, и «какую взять» решает не база.
5. **`specialty` и `service_category` — NOT NULL без DEFAULT.** Любой третий писатель,
   забывший их, получит отказ БД, а не строку со значением по умолчанию.

### ЧТО В ЖИВОЙ БАЗЕ

```
doctor_commissions          0 строк
doctor_commissions с doctor_id  0
doctor_commissions с user_id    0
```

Ставки нет ни у одного из 7 пользователей и ни в одной из 2 организаций. Врачи без ставки:
`d0000000-…-d005`, `d0000000-…-d006`, `8356141b-…` — `rate_rows 0` у каждого.

**Что произойдёт, если строки нет.** Ничего само не подставится: `LEFT JOIN` даст NULL, а
`30%` из `diary.ts:374` — это значение, которое код пишет при создании строки, а не факт о
клинике. Молча посчитать по 30% значит выдать выдуманное число за расчёт зарплаты. Отчёт
обязан в этом случае показать сумму выручки и явный отказ считать выплату: **«Ставка врача не
задана. Задайте процент, иначе сумму к выплате считать не из чего.»** — с причиной и
действием, а не прочерком.

---

## 4. ФОРМУЛА

Точный порядок. Все суммы — `numeric(12,2)`, до копейки.

```
Для врача D и периода [FROM, TO):

Выручка(D)  = SUM( payments.amount_rub )
              WHERE payments.organization_id = :orgId
                AND payments.status = 'paid'
                AND payments.paid_at >= FROM AND payments.paid_at < TO
                AND appointments.doctor_user_id = D
              соединение: payments.visit_id = visits.id
                       AND visits.appointment_id = appointments.id

Материалы(D) = SUM( inventory_transactions.unit_cost_rub
                    * ABS(inventory_transactions.quantity_changed) )
               WHERE inventory_transactions.organization_id = :orgId
                 AND inventory_transactions.transaction_type = 'auto_deduct'
                 AND appointments.doctor_user_id = D
                 AND <период по тому же визиту, что и выручка>
               соединение: inventory_transactions.visit_id = visits.id
                        AND visits.appointment_id = appointments.id

Ставка(D)   = doctor_commissions.commission_pct        -- ТОЛЬКО commission_pct
УдержМат(D) = doctor_commissions.material_cost_deduction_pct
              WHERE doctor_commissions.user_id = D     -- ТОЛЬКО user_id
                AND doctor_commissions.organization_id = :orgId
                AND doctor_commissions.is_active = true
                AND doctor_commissions.effective_from <= TO
              при нескольких строках — ORDER BY effective_from DESC LIMIT 1

ЕСЛИ Ставка(D) IS NULL:
    Выплата(D) = НЕ ОПРЕДЕЛЕНА. Показать выручку, показать причину, НЕ подставлять 30%.

ИНАЧЕ:
    Начислено(D) = ROUND( Выручка(D) * Ставка(D) / 100, 2 )
    Удержано(D)  = ROUND( Материалы(D) * УдержМат(D) / 100, 2 )
    Выплата(D)   = Начислено(D) - Удержано(D)
```

**Порядок удержания материалов — после начисления процента, не до.** Процент считается от
выручки, и только потом из начисленного вычитается доля себестоимости. Обратный порядок
(`(Выручка - Материалы) * Ставка`) даёт другое число и означает другую договорённость с
врачом; какая из двух действует в клинике, из кода не следует — `diary.ts` заводит два
независимых процента (`commissionPct` и `materialCostDeductionPct`), и второй имеет смысл
только как доля ОТ СЕБЕСТОИМОСТИ, а не как участие в базе начисления. Если ведущий скажет
иначе — это продуктовое решение, и его надо зафиксировать явно, а не угадать здесь.

**`Выплата` может быть отрицательной** (материалы дороже начисленного процента). Обнулять
нельзя — это долг врача клинике, и прятать его значит терять деньги. Показывать со знаком.

---

## 5. ЧТО НЕВОЗМОЖНО

1. **Колонку «Материалы» показать нельзя вообще.** Ни одной строки себестоимости в базе нет
   (`inventory_transactions` = 0), и заполниться ей неоткуда: `service_catalog_items` = 0,
   `procedure_material_rules` = 0, `inventory_items` = 0, `treatment_items.service_id` = NULL
   у всех 10 строк. Ноль в этой колонке прочитают как «материалов не потратили», а не как
   «мы это не считаем» — это хуже отсутствующей колонки.
2. **Колонку «К выплате» показать нельзя ни для одного врача сейчас.** `doctor_commissions`
   = 0 строк. Пока владелец не задаст процент, считать не из чего.
3. **Ставка по услуге/специальности не работает.** `service_category` и `specialty` в
   таблице NOT NULL, но оба писателя ставят их константами (`therapy`/`universal` и
   `consultation`/`therapist`), а `payments` категории услуги не содержит вовсе — связи
   платежа с категорией нет, потому что `treatment_items.service_id` не заполняется.
   Значит ставка применима только как ОДНА на врача. Разные проценты за терапию и
   ортопедию — долг, а не настройка.
4. **Возвраты в расчёт не входят.** `refunded`/`voided` есть в перечислении, но писателя,
   переводящего платёж в эти статусы, в рабочем коде нет. Колонка «возвраты» была бы
   гарантированным нулём.
5. **Кассовый сдвиг между планом и кассой не объясняется.** По `payments` d006 = 44 000, а по
   `treatment_items` d005 = 76 400 при кассе 23 400: в живой базе 4 завершённых приёма у d005
   и 1 у d006 не имеют оплаты вовсе (`COMPLETED_APPTS_WITHOUT_PAYMENT`). Отчёт по кассе — это
   верно, но владелец спросит «почему у врача выработка больше»; без колонки «выполнено, не
   оплачено» ответа не будет. Данные для неё ЕСТЬ (`treatment_items.status='completed'`
   + отсутствие платежа), но это отдельная колонка, а не подмена выручки.
6. **Роли: сервер не умеет отличить «свои выплаты» от «чужих».** См. п. 6 — прав уровня
   «зарплата» в закрытом списке `PERMISSIONS` не существует.
7. **`FinancialMetrics` не реализуем.** `totalLabCosts` — себестоимости нет (п. 1);
   `conversionRate` — конверсия планов требует `treatment_plans` (0 строк, писателя нет);
   `revenueByDepartment` — разбивка по отделениям требует категории услуги у платежа, которой
   нет (п. 3). Из шести полей типа честны два: `averageInvoice` (и он уже есть в
   `ManagerReportsPanel.tsx:350`) и `totalDebts` (для него есть рабочий
   `GET /api/reports/receivables`). **Фасад надо удалять, а не монтировать.**

Итог: честны **три колонки** — «Врач», «Получено за период», «Ставка / причина её отсутствия».
Четвёртая («К выплате») появляется у врача ровно тогда, когда ему задана ставка. Шесть колонок
`DoctorPayoutDashboard` — три из них выдуманы.

---

## 6. КУДА МОНТИРОВАТЬ

### Что уже есть в финансах

`apps/web/src/FinanceView.tsx` — 273 строки, разрез **по одному пациенту**
(`:151-153`: «Сводка по пациенту»): оплаты, план, вычет, семейный кошелёк. Зарплата целого
врача за месяц сюда не относится по смыслу — это не карточка пациента.

Более того, на `FinanceView.tsx:249-267` лежит комментарий о том, что четыре пустых блока
отсюда уже удаляли, и среди них — **«Начисления врачам по прайсу»** (та самая пустая
`pricelist_doctor_payrolls`, 0 строк, подтверждено). Комментарий заканчивается долгом:
«расчёт зарплаты врача… требует поля процента у сотрудника; ни того, ни другого в базе нет».
**Эта часть комментария устарела и должна быть исправлена:** поле процента существует —
`doctor_commissions.commission_pct` — и у него два живых писателя. Отсутствуют не поля, а
строки. Возвращать блок в `FinanceView` при этом всё равно не нужно.

### Предлагаемое место

**`apps/web/src/components/reports/ManagerReportsPanel.tsx`, существующий раздел «Врачи»
(`:329-397`).** Обоснование фактами, а не вкусом:

1. Разрез уже смонтирован и работает: `apps/web/src/App.tsx:4202` рендерит
   `<ManagerReportsPanel clinicMode={…} />` в разделе «Аналитика». Данные приходят из
   `GET /api/reports/summary` (`ManagerReportsPanel.tsx:185`).
2. В таблице уже стоит колонка **«Маржа»** с жёстким прочерком и подсказкой
   «Себестоимость материалов и процент врача в системе не заданы»
   (`ManagerReportsPanel.tsx:375-382`). Это ровно то место, которое ждёт этих данных.
3. На сервере под это уже есть типизированная заглушка: `DoctorPerformanceRow.marginRub:
   null` с комментарием «Поле оставлено, чтобы интерфейс показывал прочерк осознанно» —
   `apps/api/src/services/reports/managerReports.ts:142-146`. Расширять надо
   `doctorPerformance()` (`:169`), а не изобретать `/api/billing/payouts`.
4. Период там уже есть и уже валидируется (`routes/reports.ts:54-72`, предел 400 дней),
   умолчание — текущий месяц. Владелец смотрит выплаты раз в месяц — совпадает.

Итог по монтированию: **новый экран не нужен.** Нужны три колонки в существующей таблице
«Врачи» и расчёт в `managerReports.doctorPerformance`. `FinancialDashboard.tsx` и
`DoctorPayoutDashboard.tsx` (+ их `.css`) — удалить: они недостижимы, зовут отсутствующий
маршрут и обещают невыполнимое.

### Роли — как модульность сделана ФАКТИЧЕСКИ

Здесь два разных механизма, и путать их нельзя.

**Механизм 1 — режим клиники, `apps/web/src/lib/clinicCapabilities.ts`.** Таблица
`CAPABILITIES_BY_MODE` (`:108-113`), возможность `doctorBreakdown` (`:52`) есть у
`one_chair`, `small_clinic`, `network_clinic` и НЕТ у `solo_doctor` (`:81`). Панель уже это
читает: `ManagerReportsPanel.tsx:166` `hasCapability(clinicMode, "doctorBreakdown")`.
Выплаты наследуют это правило бесплатно: у отдельного врача разрез по врачам скрыт целиком.
Это про «осмысленно ли», а не про «можно ли смотреть».

**Механизм 2 — права на сервере, `apps/api/src/security/permissions.ts`.** Единственная
реальная защита. И вот в чём проблема:

* `PERMISSIONS` (`:33-61`) — закрытый список из 17 прав. **Права уровня «зарплата» в нём
  нет.** Ближайшее — `analytics.read` (`:47`).
* `analytics.read` выдан `owner`, `admin` (`:73-74`), `manager` (`:82`) и **`administrator`
  (`:95`)**. То есть администратор ресепшена его имеет.
* У роли `doctor` (`:102-110`) `analytics.read` **нет вовсе**.
* Отчёты закрыты именно этим правом: `routes/reports.ts:86`
  `enforcePermissionWhenStaffKnown(request, reply, "analytics.read")`.

**Вывод: повесить выплаты на `analytics.read` — прямое нарушение требования.** Администратор
увидел бы зарплаты всех врачей, а врач не увидел бы даже свою. Нужно новое право в закрытом
списке — например `payroll.read` (все врачи клиники) у `owner`/`admin`/`manager`, и
`payroll.read.own` (только свои строки, фильтр `doctor_user_id = identity.userId` на сервере)
у `doctor`. `administrator` и `assistant` — не получают ни одного. Список закрытый, поэтому
опечатка в имени права не скомпилируется, а неизвестная роль не получает ничего
(`permissionsForRole`, `:123-126`, fail closed).

**Две ловушки, которые нельзя обойти молчанием.**

1. `enforcePermissionWhenStaffKnown` при неопознанном сотруднике **пропускает запрос**:
   `permissions.ts:199-202`, `if (!identity.userId || !identity.role) return true;`. Запрос с
   одним лишь `x-dente-admin-secret` (а `DoctorPayoutDashboard.tsx:23` шлёт именно его)
   проходит мимо ролевой проверки. Для зарплат этого недостаточно: маршрут выплат должен
   требовать опознанного сотрудника жёстко (`requirePermission`, а не «когда известен»),
   иначе фильтр «врач видит только свои» обходится отсутствием токена. **Это решение за
   ведущим — оно меняет контракт доступа.**
2. `selectedWorkspaceRole` на клиенте — **не роль, а настройка интерфейса**:
   `AppHelpers.tsx:2843` (тип), `:3541` (умолчание — `"owner"`), `:3861` (читается из
   `uiPreferences`). Пользователь переключает её сам в шапке. Прятать зарплаты по ней —
   косметика, которая обходится одним кликом. Клиентское скрытие допустимо только как
   удобство ПОВЕРХ серверного запрета, никогда вместо него.

---

## 7. ПРОВЕРЕНО / НЕ ПРОВЕРЕНО

### ПРОВЕРЕНО (прочитан код и/или выполнен SELECT по живой базе)

* Цепочка `payments → visits → appointments.doctor_user_id` — единственная связь деньги/врач;
  на живой базе 8/8 платежей доходят до врача, сумма 67 400,00 ₽, «не отнесено» 0,00 ₽.
* Живой писатель платежей — `db/billingQuery.ts:78`; `finance_family.ts:484`, `:617`.
* `patient_invoices`: писателя нет ни одного, 0 строк.
* Материальная цепочка пуста на всех звеньях: `service_catalog_items` 0,
  `procedure_material_rules` 0, `inventory_items` 0, `inventory_transactions` 0,
  `treatment_items.service_id` NULL у 10/10.
* `doctor_commissions` 0 строк; живые `user_id NOT NULL`, `doctor_id` nullable;
  `commission_percent` nullable с DEFAULT `'25'`; `material_cost_deduction_pct` DEFAULT `'0'`;
  колонка `effective_to` есть в БД и отсутствует в `schema.ts`; единственный индекс — pkey.
* Оба писателя ставки пишут `userId` + `commissionPct`; `doctorId` и `commissionPercent` не
  пишет никто; `workspaceProfile.ts` не задаёт `materialCostDeductionPct`.
* `quantity_changed` — integer в живой БД против `numeric(10,3)` в `schema.ts`;
  `inventory_items.unit_cost_rub` — NOT NULL DEFAULT 0.
* Оба фасадных экрана — сироты (страж запущен, вывод приведён); `/api/billing/payouts`
  отсутствует.
* Права: `analytics.read` есть у `administrator`, нет у `doctor`; права уровня зарплаты в
  `PERMISSIONS` нет; `enforcePermissionWhenStaffKnown` пропускает неопознанного.
* Точка монтирования: `App.tsx:4202`, таблица «Врачи» `ManagerReportsPanel.tsx:329-397`,
  прочерк «Маржа» `:375-382`, заглушка `marginRub: null` `managerReports.ts:142-146`.

### НЕ ПРОВЕРЕНО

* Порядок удержания материалов (процент от выручки, затем минус доля себестоимости) выведен
  из смысла двух отдельных процентов в `diary.ts:374-375`. Договорённости клиники в коде нет.
  **Требуется решение ведущего.**
* Поведение расчёта при заполненном складе — воспроизвести невозможно: строк себестоимости в
  базе нет ни одной. Всё про материалы — статический разбор, а не наблюдение.
* Формула не выполнялась через drizzle. При реализации подзапросов обязательна печать
  `query.toSQL().sql` и запись `${table}."id"` вместо `${table.id}` внутри `sql``…``:
  без join-а `${table.id}` рендерится голым `"id"` и внутри коррелированного подзапроса
  связывается с ВНУТРЕННЕЙ таблицей — валидный SQL, всегда ложь, пустой экран.
* `npx tsc` в дереве красный из-за чужой правки контракта `PanelSubject`
  (`apps/web/src/lib/panelStateText.ts`, идёт `title → notLoadedTitle`). Своего кода я не
  добавлял, новых видов ошибок не вносил; чистый компилятор не наблюдал и не заявляю.
* Вторая организация («Стоматология, 1 кабинет»): 4 пользователя, 0 платежей, 0 приёмов,
  0 ставок. Поведение отчёта при межклиничной изоляции на данных не проверено — проверять
  нечем.
