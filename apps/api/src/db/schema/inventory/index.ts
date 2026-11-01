/**
 * Inventory Database Schema (Layer 5)
 * Модульная схема складского учета DENTE CRM (Мандат 8b, 8zi).
 * Sweet spot декомпозиция: карточки ТМЦ, проводки и партии FEFO, техкарты BOM, стерилизация.
 */

export * from "./inventoryItemsTable.js";
export * from "./inventoryTransactionsTable.js";
export * from "./inventoryTechCardsTable.js";
export * from "./inventorySterilizationTable.js";
