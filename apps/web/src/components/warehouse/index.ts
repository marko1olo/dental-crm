/**
 * apps/web/src/components/warehouse/index.ts
 *
 * Центральный шлюз модульного склада стоматологических материалов DENTE (Мандаты 8e, 8n, 8s).
 * - WarehouseCatalogView: канонический каталог материалов с 32px тулбаром и списанием по протоколу.
 * - ConsumablesDeductionModal: клиническое модальное окно списания расходников приёма (BOM).
 * - AutoBomDeductionBanner: оперативная плашка автосписания комплекта материалов у кресла врача.
 * - WarehouseOverviewTab: обзор остатков, критические запасы, быстрое списание и мягкий овердрафт.
 * - WarehouseWaybillsTab: поступление партий, поставщики и автоматическое закрытие дефицита.
 * - WarehouseInventoryTab: сверка фактических остатков и оформление результатов инвентаризации.
 * - WarehouseStockAlertsBar: оперативные предупреждения о дефиците и сроках годности FEFO.
 * - WarehouseBatchTrackingModal: партионный учёт и приоритетный отпуск серий по срокам (FEFO).
 * - WarehouseItemsTable: канонический фасад таблицы складских остатков.
 */

export * from "./WarehouseStockAlertsBar.js";
export * from "./WarehouseOverviewTab.js";
export * from "./WarehouseWaybillsTab.js";
export * from "./WarehouseInventoryTab.js";
export * from "./WarehouseBatchTrackingModal.js";
export * from "./WarehouseItemsTable.js";
export * from "./ConsumablesDeductionModal.js";
export * from "./AutoBomDeductionBanner.js";
export * from "./WarehouseCatalogView.js";
