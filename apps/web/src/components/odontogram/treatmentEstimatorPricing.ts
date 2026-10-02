/*
 * treatmentEstimatorPricing.ts — Single Source of Truth (SSOT) сметы плана лечения.
 * Декомпозирован на компактные специализированные модули <= 800 строк по Мандату 8b.
 *
 * Архитектура модулей:
 * - treatmentEstimatorRules.ts: FDI коды, правила находок, сменный прикус.
 * - treatmentEstimatorCatalogMatching.ts: Сопоставление с прайсом клиники, диагностика, нормализация.
 * - treatmentEstimatorMoney.ts: Точные копейки (Kopecks), ДМС расчеты, со-оплата, итоги.
 * - treatmentEstimatorValidation.ts: Человеческие подсказки, блокировка сохранения, API сериализация.
 * - treatmentEstimatorStagesAndConflicts.ts: 5 этапов, гарантии СтАР, касса 54-ФЗ, конфликты зубов-призраков, коллизии.
 * - treatmentEstimatorBundles.ts: Бесшовный перенос диагнозов (кариес 16 -> анестезия + препарирование + пломба в 1 клик).
 */

export * from "./treatmentEstimatorRules";
export * from "./treatmentEstimatorCatalogMatching";
export * from "./treatmentEstimatorMoney";
export * from "./treatmentEstimatorValidation";
export * from "./treatmentEstimatorStagesAndConflicts";
export * from "./treatmentEstimatorBundles";
