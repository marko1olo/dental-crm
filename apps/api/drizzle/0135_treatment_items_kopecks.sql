-- 0135 — строки плана лечения научились в копейки.
--
-- ЧТО БЫЛО. treatment_items.price_rub, unit_price_rub и discount_rub объявлены
-- integer. План лечения — это то, из чего вырастает счёт пациенту: услуга с
-- ценой 6 805,50 ₽ в план не помещалась вовсе. Продолжение миграции 0131,
-- которая тем же приёмом перевела payments.amount_rub.
--
-- ПОЧЕМУ ВМЕСТЕ С ПРАВКОЙ ОТЧЁТОВ. Итог строк плана считается выражением
--   coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)), 0)::int
-- в apps/api/src/services/reports/managerReports.ts и
-- apps/api/src/services/communications/audience.ts. Колонка quantity уже
-- объявлена numeric(10,2), то есть количество дробное: половина услуги, треть
-- курса. Приведение ::int округляет произведение до целых рублей.
--
-- Проверено на живой базе (scratch/probe-report-rounding.mjs): на нынешних
-- данных все количества целые и потери нет, но половина услуги за 6 805,50 ₽
-- даёт 3 402,75, а отчёт показывает 3 403 — расхождение 25 копеек на строку.
-- Перевести колонки и оставить ::int означало бы разрешить копейки на входе и
-- молча срезать их в отчёте: хуже, чем было. Поэтому приведение в этих трёх
-- запросах меняется на numeric(12,2) тем же коммитом.
--
-- ДАННЫЕ. На момент миграции в таблице 10 строк, все значения целые: перевод
-- сохраняет каждое как есть (6800 становится 6800.00).

ALTER TABLE "treatment_items"
  ALTER COLUMN "price_rub" TYPE numeric(12, 2) USING "price_rub"::numeric(12, 2);

ALTER TABLE "treatment_items"
  ALTER COLUMN "unit_price_rub" TYPE numeric(12, 2) USING "unit_price_rub"::numeric(12, 2);

ALTER TABLE "treatment_items"
  ALTER COLUMN "discount_rub" TYPE numeric(12, 2) USING "discount_rub"::numeric(12, 2);

ALTER TABLE "treatment_items"
  ALTER COLUMN "discount_rub" SET DEFAULT 0;
