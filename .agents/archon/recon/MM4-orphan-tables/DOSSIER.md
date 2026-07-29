# Досье: брошенные таблицы живой базы — строки, организации, причины

Замер пакета MM4, 2026-07-29. Инструменты: `scripts/count-orphan-table-rows.mjs` (только `select`),
`scripts/smoke-schema-missing-declarations.mjs` (перепись KK5), `rg` по `apps/api/src` и `apps/web/src`.

## Первое, что опровергнуто: таблиц с нулём ссылок не 13, а 16

Бриф и `LEAD-undeclared-tables-census.md` называют тринадцать таблиц, которых не упомянул ни один файл
сервера. Пересчитано тем же методом (любое упоминание имени в `apps/api/src` без `dist`) — и получилось
шестнадцать. Три таблицы попали в «упомянутые» ошибочно:

| таблица | ссылок по переписи | ссылок с левой границей слова | чем оказались «ссылки» |
|---|---|---|---|
| `analytics_snapshots` | 4 | **0** | подстрока объявленной `bi_analytics_snapshots` |
| `doctor_payrolls` | 3 | **0** | подстрока объявленной `pricelist_doctor_payrolls` |
| `treatment_plan_stages_auto_archive` | не в таблице переписи | **0** | таблица в переписи просто пропущена |

Механизм ошибки — поиск подстрокой: `rg analytics_snapshots` ловит `bi_analytics_snapshots`, а
`rg doctor_payrolls` ловит `pricelist_doctor_payrolls`, и обе брошенные таблицы выглядят используемыми,
не будучи названными ни разу. Проверка: `rg -P '(?<![a-z_0-9])analytics_snapshots'` по `apps/api/src`
даёт ноль совпадений, а без границы — четыре, все четыре про `bi_analytics_snapshots`
(`services/biAnalyticsWorker.ts`, `scripts/cronAnalyticsWorker.ts`, объявление в `schema.ts`).
Восемнадцатая таблица реестра, `treatment_plan_stages_auto_archive`, в таблице переписи отсутствует
вообще — в ней 17 строк вместо 18.

Итог: из 18 недекларированных таблиц серверный код называет **две** — `clinical_tasks` (18 упоминаний,
живой путь сырым SQL) и `patient_anamnesis` (1, список слияния карт). Остальные шестнадцать не названы
нигде.

## Второе: строк нет ни в одной из восемнадцати

Замер снят с контролем «база рабочая и непустая» — иначе нули означали бы «подключились не туда»:
`organizations` 2, `patients` 17, `appointments` 27, `payments` 8, `visits` 10, `generated_documents` 4.

| таблица | всего строк | вне фикстур | по организациям | вердикт | чем подтверждён |
|---|---|---|---|---|---|
| `cash_shifts` | 0 | 0 | нечего разбивать | функция не дописана | `cash_ledger` — журнал операций, не смена; виджет смены брошен по ложной причине (ниже) |
| `clinic_workflows` | 0 | 0 | нечего разбивать | функция не дописана | имени нет ни в `apps/api/src`, ни в `apps/web/src`; таблицы правил-триггеров в Drizzle нет |
| `dental_lab_orders` | 0 | 0 | нечего разбивать | принят двойник | `lab_orders` объявлена и подключена: `db/labQuery.ts`, `routes/lab.ts`, экран `LabOrdersPanel.tsx` → `/api/clinical/lab-orders` |
| `doctor_assistants` | 0 | нет `organization_id` | — | принят двойник | ассистент назначается на приёме: `appointments.assistant_user_id`, пишет `db/appointmentsQuery.ts` |
| `document_templates` | 0 | 0 | нечего разбивать | принят двойник | шаблоны живут кодом `documents/renderDocument.ts`, результат — в `generated_documents` (4 строки); таблицы с html-шаблонами в Drizzle нет вообще |
| `drill_protocols` | 0 | 0 | нечего разбивать | принят двойник | `patient_ct_plannings` объявлена и подключена `routes/imaging_planning.ts`: тот же КТ-снимок, те же импланты |
| `ingested_patients_mapping` | 0 | нет `organization_id` | — | принят двойник | `migration_entity_links` (`source_system` + `source_entity_id` + `natural_key`), пишет подсистема `apps/api/src/migration` |
| `ingestion_sources` | 0 | 0 | нечего разбивать | принят двойник | `migration_runs` (`source_name`/`source_kind`/`status`), 11 файлов подсистемы, 4 строки в живой базе |
| `migration_templates` | 0 | 0 | нечего разбивать | принят двойник | сопоставление колонок считает `migration/mapping.ts`, профиль вендора хранится на прогоне (`migration_runs.vendor_profile`, 4 непустых) |
| `payment_installments` | 0 | нет `organization_id` | — | принят двойник (печать), учёта нет | график рассрочки — печатный документ `generated_documents.kind='installment_payment_schedule'`: проверки `documents/guards.ts`, поля `apps/web/src/documentLogic.ts`. Таких документов пока 0 из 4 |
| `scheduler_reservations` | 0 | 0 | нечего разбивать | функция не дописана | объявленная `schedule_time_reservations` мертва так же: её маршрут удалён за отсутствием писателя (`routes/clinical.ts`, блок «Два маршрута расписания удалены») |
| `signed_outpatient_cards` | 0 | нет `organization_id` | — | принят двойник | подпись лежит в объявленных колонках `visit_diaries.crypto_signature_pkcs7` и `generated_documents.signature_svg`; ставят `routes/diary.ts` и `routes/documents/signUkep.ts` |
| `ztl_lab_orders` | 0 | нет `organization_id` | — | принят двойник | тот же `lab_orders`: экран ЗТЛ (`LabOrdersPanel.tsx`, «Form state for new ZTL order») пишет в `/api/clinical/lab-orders` |
| `analytics_snapshots` | 0 | 0 | нечего разбивать | принят двойник | `bi_analytics_snapshots` пишет `services/biAnalyticsWorker.ts` и cron `scripts/cronAnalyticsWorker.ts` |
| `doctor_payrolls` | 0 | 0 | нечего разбивать | функция не дописана | одноимённого двойника нет; объявленная `pricelist_doctor_payrolls` упомянута только в комментариях (`routes/clinical.ts`, `scripts/cronAnalyticsWorker.ts`) — писателя нет |
| `treatment_plan_stages_auto_archive` | 0 | 0 | нечего разбивать | функция не дописана | объявленная `treatment_plan_stages` тоже без писателя, маршрут `/api/documents/treatment-plan-stages` удалён |
| `clinical_tasks` | 0 | 0 | нечего разбивать | **используется сырым SQL без объявления — удалять нельзя** | `db/clinicalTasksQuery.ts` делает `INSERT`/`SELECT` строкой, маршрут `/api/clinical/tasks` через `services/clinical/ClinicalRouter.ts` |
| `patient_anamnesis` | 0 | нет `organization_id` | — | **используется без объявления — удалять нельзя** | `services/patients/patientMerge.ts` переносит её строки при слиянии карт пациентов |

Разбивки по организациям в досье нет не потому, что её не снимали: скрипт снимает `group by
organization_id` для каждой таблицы, где такая колонка есть (13 из 18), и во всех случаях группа
оказалась пустой. Разбивать ноль строк не по чему.

## «Пустая» не равно «можно удалять»

Шестнадцать таблиц пусты И не названы ни одним файлом сервера — они готовы к удалению миграцией.
Две пусты, но подключены к живому пути: `clinical_tasks` пишется сырым SQL из
`db/clinicalTasksQuery.ts`, `patient_anamnesis` перечислена в списке слияния карт. Их удаление (и
`drizzle-kit push` по текущим объявлениям тоже) снесёт работающий код. Им нужно объявление, а не
миграция удаления. Саму миграцию удаления этот пакет не пишет — решение за ведущим.

## Третье: одна из этих таблиц уже стоила продукту функции

`cash_shifts` — не забытый мусор. В `apps/web/src/components/finance/` лежит `CashShiftWidget.css`,
156 строк готовой разметки виджета смены (`.cash-shift-status-open`, `.cash-shift-btn-open`,
`.cash-shift-status-closed`), а сам компонент не написан. Причина названа в двух файлах прямым текстом:

- `CashDayTally.tsx`: «Открытия и закрытия смены нет: для этого нужна **таблица смен, которой в базе
  не существует** (осиротевший CashShiftWidget.css в этой папке — след незаписанного виджета)».
- `cashDaySummary.ts`: «открытие и закрытие смены требуют **таблицы смен, которой в базе нет**».

Таблица в базе есть. `cash_shifts`, 10 колонок, ровно та форма, которая нужна для открытия и закрытия:
`opened_by_user_id`, `opened_at`, `closed_at`, `starting_balance`, `expected_closing_balance`,
`actual_closing_balance`, `status`, `discrepancy_reason`. Автор посмотрел в `schema.ts`, не нашёл
таблицы и записал в комментарий «в базе не существует» — а расхождение между DDL миграций и
объявлениями Drizzle сделало это утверждение похожим на правду. Это и есть цена дрейфа, измеренная:
не абстрактное «аудиты дают разные ответы», а сверка кассы в конце дня, которой у администратора нет.

Тот же класс, но слабее: `dental_lab_orders` (16 колонок) и `ztl_lab_orders` (13 колонок) полнее
объявленной `lab_orders` — в первой есть `clinic_id`, `treatment_plan_item_id`, `planned_fitting_date`,
`lab_cost_amount`, во второй `lab_name`, `impression`, `teeth`. Работающий путь один и он беднее обоих
брошенных вариантов.

## Что опровергнуто в гипотезах ведущего

1. «Тринадцать не упомянуты ни разу» — их шестнадцать (см. выше).
2. «`cash_ledger` объявлена, `cash_shifts` брошена — принят двойник». Двойника нет: `cash_ledger` это
   `invoice_id`, `payment_method`, `amount_rub`, `operator_id`, `timestamp` — журнал отдельных операций,
   в котором нет ни открытия, ни закрытия, ни ожидаемого остатка. И сам `cash_ledger` в приложении не
   используется: два упоминания на весь `apps/api/src` — объявление в `schema.ts` и `select count(*)` в
   `tests/routes/chainReconProof.ts`. Писателя нет ни у одной из двух таблиц.
3. «Три таблицы заказов в лабораторию, работает одна» — «работает» здесь означает «объявлена и
   подключена к маршруту». Строк в `lab_orders` ноль. Подключена одна, пользуются ни одной.
4. «`migration_templates` — возможно, инструмент разработчика». Нет: таблица привязана к организации
   (`organization_id uuid NOT NULL` с внешним ключом на `organizations`) и несёт флаг `is_approved`.
   Это продуктовые данные клиники, а не инструмент разработчика. Среди 18 таблиц реестра инструментов
   разработчика нет вообще; единственная служебная — `_dente_migrations`, и у неё своя причина
   (`permanent: true`).
5. Мелкое: в переписи `cash_ledger` указана как `schema.ts:2335`, фактически объявление на 2408 (и
   номер продолжает ехать, пока пакет MM6 правит `schema.ts`). Поэтому в реестре причин ссылки даны на
   файл и имя таблицы, без номеров строк: номер в долгоживущем файле гниёт за час.

## Разведённые причины в реестре исключений

`scripts/smoke-schema-missing-declarations.mjs` до этого пакета оправдывал все 18 таблиц одной причиной
`MIGRATED_NEVER_DECLARED` — «таблицу создала миграция, объявления нет». Факт верный, причина не
различает случаи, а именно причина решает, что делать. Теперь причины четыре, и каждая запись называет
свой двойник или своё доказательство:

- `twinAccepted(двойник, чем подтверждён)` — 11 записей. Понятие живёт в объявленной таблице или
  колонке; брошенная пуста, удаление миграцией безопасно.
- `featureNeverFinished(чем подтверждён)` — 5 записей. Двойника нет, писателя нет нигде; удаление
  безопасно, но продуктовую дыру не закрывает.
- `usedByRawSql(чем подтверждён)` — 2 записи (`clinical_tasks`, `patient_anamnesis`). Удалять нельзя,
  снимается только объявлением. Этой причины в трёх, названных в брифе, не было — а без неё две живые
  таблицы оправданы тем же текстом, что мёртвые.
- `SERVICE_LEDGER` — 1 запись (`_dente_migrations`), без изменений.

Категория «инструмент разработчика» осталась пустой по замеру, а не по недосмотру: единственный
кандидат ведущего (`migration_templates`) оказался продуктовыми данными.

## Вывод счёта строк, дословно

Команда: `node scripts/count-orphan-table-rows.mjs` (истинный код возврата 0).

```
КОНТРОЛЬ: база, к которой подключились, обязана быть рабочей и непустой.
  organizations          2
  patients               17
  appointments           27
  payments               8
  visits                 10
  generated_documents    4

Фикстурные префиксы organization_id исключены: d0000000, dce70000

таблица                              колонок  org_id  всего  вне фикстур  ссылок в api
------------------------------------------------------------------------------------------------
analytics_snapshots                  5        да      0      0            0
cash_shifts                          10       да      0      0            0
clinic_workflows                     7        да      0      0            0
clinical_tasks                       11       да      0      0            18
dental_lab_orders                    16       да      0      0            0
doctor_assistants                    2        НЕТ     0      0            0
doctor_payrolls                      7        да      0      0            0
document_templates                   7        да      0      0            0
drill_protocols                      19       да      0      0            0
ingested_patients_mapping            6        НЕТ     0      0            0
ingestion_sources                    8        да      0      0            0
migration_templates                  6        да      0      0            0
patient_anamnesis                    8        НЕТ     0      0            1
payment_installments                 9        НЕТ     0      0            0
scheduler_reservations               17       да      0      0            0
signed_outpatient_cards              8        НЕТ     0      0            0
treatment_plan_stages_auto_archive   10       да      0      0            0
ztl_lab_orders                       13       НЕТ     0      0            0

ОБЪЯВЛЕННЫЙ ДВОЙНИК: непустой двойник = функция работает через него; пустой = функции нет нигде.
брошенная                            двойник                            строк   условие
------------------------------------------------------------------------------------------------
analytics_snapshots                  bi_analytics_snapshots             0       вся таблица
cash_shifts                          двойника нет                       —       понятие не реализовано нигде
clinic_workflows                     двойника нет                       —       понятие не реализовано нигде
clinical_tasks                       двойника нет                       —       понятие не реализовано нигде
dental_lab_orders                    lab_orders                         0       вся таблица
doctor_assistants                    appointments                       0       assistant_user_id is not null (всего в таблице 27)
doctor_payrolls                      pricelist_doctor_payrolls          0       вся таблица
document_templates                   generated_documents                4       вся таблица
drill_protocols                      patient_ct_plannings               0       вся таблица
ingested_patients_mapping            migration_entity_links             0       вся таблица
ingestion_sources                    migration_runs                     4       вся таблица
migration_templates                  migration_runs                     4       vendor_profile is not null
patient_anamnesis                    двойника нет                       —       понятие не реализовано нигде
payment_installments                 generated_documents                0       kind = 'installment_payment_schedule' (всего в таблице 4)
scheduler_reservations               schedule_time_reservations         0       вся таблица
signed_outpatient_cards              visit_diaries                      0       crypto_signature_pkcs7 is not null
treatment_plan_stages_auto_archive   treatment_plan_stages              0       вся таблица
ztl_lab_orders                       lab_orders                         0       вся таблица

Ни одной строки ни в одной брошенной таблице: разбивать по организациям нечего.

Итого брошенных таблиц 18, непустых 0, строк вне фикстур 0; двойников с данными 3.
```

## Чего этот замер НЕ доказывает

- Ноль строк снят с ЭТОЙ базы (`127.0.0.1:5432`, 148 таблиц, 2 организации, 17 пациентов). Это рабочая
  база разработки, а не боевая установка у клиента. Для боевой базы счёт нужно повторить там же — скрипт
  берёт адрес из `DATABASE_URL` и работает только на чтение, поэтому это безопасно.
- «Двойник принят» доказывает подключение двойника к серверному коду, а не то, что им пользуются: у 15
  из 18 двойников тоже ноль строк. Пустая объявленная таблица и пустая брошенная — одинаково мёртвая
  функция; разница только в том, что первую видят аудиты.
- Что нужно удалять, здесь не решается. Досье даёт основание: 16 таблиц пусты и не названы, 2 пусты и
  подключены.
