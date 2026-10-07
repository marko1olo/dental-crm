/**
 * apps/web/src/components/warehouse/index.ts
 *
 * Центральный шлюз модульного склада стоматологических материалов DENTE (Мандаты 8e, 8n, 8s).
 * - WarehouseOverviewTab: обзор остатков, критические запасы, быстрое списание и мягкий овердрафт.
 * - WarehouseWaybillsTab: приходные накладные ТОРГ-12, поставщики и автоматическое закрытие дефицита.
 * - WarehouseInventoryTab: инвентаризационные описи ИНВ-3, ведомости ИНВ-19 и акты списания ТОРГ-16.
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
