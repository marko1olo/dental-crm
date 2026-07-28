-- 0137 — оставшиеся денежные колонки научились в копейки.
--
-- ЧТО БЫЛО. Двенадцать колонок, хранящих рубли, объявлены integer. Копейки в
-- них не помещались вовсе: не округлялись при выводе, а отвергались базой на
-- записи. Продолжение миграций 0131 (payments.amount_rub) и 0135 (строки плана
-- лечения), которыми тем же приёмом переведены оплаты и план.
--
-- ЧТО ЭТО ЗА КОЛОНКИ И ПОЧЕМУ ВАЖНО.
--
--   service_catalog_items.base_price_rub, price_rub — прайс клиники. Самое
--   болезненное место списка: из прайса вырастает и план лечения, и счёт
--   пациенту. Услугу за 1 500,50 ₽ или 990,99 ₽ занести было нельзя, а такие
--   цены в стоматологии обычны. Таблицу заполняет мастер первого запуска
--   (routes/workspaceProfile.ts), читает getServiceCatalogForOrganization, и
--   попадает она в дашборд как serviceCatalog.
--
--   cash_shifts.starting_balance, expected_closing_balance,
--   actual_closing_balance — кассовая смена. Смысл сверки в том, чтобы касса
--   сошлась до копейки; при integer расхождение меньше рубля выразить нечем.
--
--   lab_orders.price_rub — заказ в зуботехническую лабораторию. Лаборатории
--   выставляют цены с копейками, и на них клиника считает себестоимость.
--
--   generated_documents.total_amount_rub — сумма в созданном документе. Обязана
--   совпадать с суммой оплаты до копейки, иначе документ и касса разойдутся.
--
--   insurance_contracts.annual_limit_rub — годовой лимит по договору ДМС.
--
--   treatment_scenarios.total_rub — итог сценария лечения.
--
--   migration_reconciliations.source_money_total_rub, loaded_money_total_rub,
--   quarantined_money_total_rub — сверка переноса из старой программы. Здесь
--   округление опаснее всего: сверка существует ровно для того, чтобы поймать
--   расхождение, а integer прячет разницу меньше рубля на каждой строке. Итог
--   «сошлось» при потерянных копейках — худший исход, чем честное расхождение.
--
-- ДАННЫЕ. Проверено на живой базе перед миграцией (scratch/probe-money-columns.
-- mjs): во всех двенадцати колонках ноль заполненных строк. Перевод не может
-- ничего потерять. Имеющиеся значения приводятся как есть, 6800 становится
-- 6800.00.
--
-- ЧТО НЕ ВОШЛО И ПОЧЕМУ. Проверка выделила ещё шесть колонок с integer, чьи
-- имена похожи на денежные: total_calls_made, total_rows, progress_total,
-- resume_count, total_ram_mb, total_appointments_count. Это счётчики, для них
-- целое число и есть правильный тип. Их перевод был бы порчей схемы ради
-- красивого отчёта проверки.

ALTER TABLE "service_catalog_items"
  ALTER COLUMN "base_price_rub" TYPE numeric(12, 2) USING "base_price_rub"::numeric(12, 2);

ALTER TABLE "service_catalog_items"
  ALTER COLUMN "price_rub" TYPE numeric(12, 2) USING "price_rub"::numeric(12, 2);

ALTER TABLE "cash_shifts"
  ALTER COLUMN "starting_balance" TYPE numeric(12, 2) USING "starting_balance"::numeric(12, 2);

ALTER TABLE "cash_shifts"
  ALTER COLUMN "expected_closing_balance" TYPE numeric(12, 2) USING "expected_closing_balance"::numeric(12, 2);

ALTER TABLE "cash_shifts"
  ALTER COLUMN "actual_closing_balance" TYPE numeric(12, 2) USING "actual_closing_balance"::numeric(12, 2);

ALTER TABLE "lab_orders"
  ALTER COLUMN "price_rub" TYPE numeric(12, 2) USING "price_rub"::numeric(12, 2);

ALTER TABLE "generated_documents"
  ALTER COLUMN "total_amount_rub" TYPE numeric(12, 2) USING "total_amount_rub"::numeric(12, 2);

ALTER TABLE "insurance_contracts"
  ALTER COLUMN "annual_limit_rub" TYPE numeric(12, 2) USING "annual_limit_rub"::numeric(12, 2);

ALTER TABLE "treatment_scenarios"
  ALTER COLUMN "total_rub" TYPE numeric(12, 2) USING "total_rub"::numeric(12, 2);

ALTER TABLE "migration_reconciliations"
  ALTER COLUMN "source_money_total_rub" TYPE numeric(12, 2) USING "source_money_total_rub"::numeric(12, 2);

ALTER TABLE "migration_reconciliations"
  ALTER COLUMN "loaded_money_total_rub" TYPE numeric(12, 2) USING "loaded_money_total_rub"::numeric(12, 2);

ALTER TABLE "migration_reconciliations"
  ALTER COLUMN "quarantined_money_total_rub" TYPE numeric(12, 2) USING "quarantined_money_total_rub"::numeric(12, 2);
