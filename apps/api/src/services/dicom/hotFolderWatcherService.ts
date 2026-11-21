/**
 * hotFolderWatcherService.ts — Каноническая служба мониторинга горячих папок (Hot Folder / PACS / Visiograph).
 * 
 * Отслеживает появление снимков в горячих папках захвата и внешних программах:
 * (.dcm, .bmp, .raw, .tag, .jpg, .png).
 * 
 * Mandate 8x (Клинический нейтральный язык, отсутствие чужих брендов в ядре),
 * Mandate 8e (Автономия врача, <40мс регистрация в карточке).
 */

export * from "./vatechDirectBridgeService.js";
export { vatechDirectBridgeService as hotFolderWatcherService } from "./vatechDirectBridgeService.js";
export { VatechDirectBridgeService as HotFolderWatcherService } from "./vatechDirectBridgeService.js";
