-- Закрытие пробела миграции 0197: фиксированная расчётная база ЗП на позиции прайс-листа (nullable BIGINT)
ALTER TABLE "service_catalog_items"
	ADD COLUMN IF NOT EXISTS "salary_price_kopecks" bigint;
