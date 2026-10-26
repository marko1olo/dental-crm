/**
 * index.ts — Единая точка экспорта модуля автономной синхронизации КЛКТ в IndexedDB (Мандат 8b <= 120 строк).
 */

export * from "./types";
export * from "./headerParser";
export * from "./dbConnection";
export * from "./studySaver";
export * from "./syncStatusUpdater";
export * from "./studyReader";
export * from "./pendingStore";
export * from "./syncWatcher";
