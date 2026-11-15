/**
 * @deprecated Use scansLocalStorageHandlers.ts instead (Мандат 8z/8wy).
 * Фасад для обратной совместимости. Все вызовы делегируются в канонический scansLocalStorageHandlers.ts.
 */
export {
	validateAndResolveStoragePath,
	handleLocalStorageUpload,
	handleLocalStorageDownload,
	handleDirectStorageUpload,
	handleDirectStorageDownload,
	handleMockStorageUpload,
	handleMockStorageDownload,
} from "./scansLocalStorageHandlers.js";
