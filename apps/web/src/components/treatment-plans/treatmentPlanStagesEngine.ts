/**
 * treatmentPlanStagesEngine.ts — единая точка входа и фасад клинико-финансового движка планов лечения DENTE CRM.
 *
 * Декомпозирован строго по Мандату 8b (лимит строк <= 800 строк на файл):
 * 1. treatmentPlanNomenclature804n.ts — Номенклатура медицинских услуг Приказа Минздрава РФ № 804н и анатомические предикаты
 * 2. treatmentPlanPricingEngine.ts — Каталожный матчинг, расчет скидок, бонусы, 13% НДФЛ и рассрочка 0%
 * 3. treatmentPlanItemFactory.ts — Фабрика процедур и пустых клинических этапов
 * 4. treatmentPlanAutoGenerator.ts — 1-Click генерация этапов плана лечения по одонтограмме (3 этапа)
 * 5. treatmentPlanTierStagesGenerator.ts — Генератор этапов по тарифам («Эконом», «Стандарт», «Оптимальный»)
 * 6. treatmentPlanTierComparisonEngine.ts — Сравнение 3 сценариев плана лечения для презентации пациенту
 * 7. treatmentPlanReorderEngine.ts — Движок drag-and-drop упорядочивания этапов/процедур и валидации клинической последовательности
 * 8. treatmentPlanPersistenceEngine.ts — Гидратация структурированных этапов из БД PostgreSQL 18
 */

export * from "./treatmentPlanNomenclature804n";
export * from "./treatmentPlanPricingEngine";
export * from "./treatmentPlanItemFactory";
export * from "./treatmentPlanAutoGenerator";
export * from "./treatmentPlanTierStagesGenerator";
export * from "./treatmentPlanTierComparisonEngine";
export * from "./treatmentPlanReorderEngine";
export * from "./treatmentPlanPersistenceEngine";
