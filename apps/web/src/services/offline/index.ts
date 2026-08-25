/**
 * DENTE CRM — Offline-First Service Module
 *
 * Централизованный экспорт:
 * - Модели типов и контракты очереди мутаций и черновиков
 * - Хранилище IndexedDB / LocalStorage
 * - Движок синхронизации с бэкендом (Sync Gateway)
 */

export * from "./types";
export * from "./offlineStorage";
export * from "./offlineSyncService";
export * from "./lanMeshReplicationService";
export * from "./offlineBackupService";
export * from "./offlineIntegrityService";

export * from "./lanP2PDispatcher";

