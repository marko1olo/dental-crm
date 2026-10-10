/**
 * Публичный оркестратор безопасного хранилища (safeStorageModules/index.ts).
 * Объединяет L1 RAM-кэш, IndexedDB fallback, контроль квоты и сериализацию,
 * а также выполняет автоматическую гидратацию кэша при старте приложения.
 */

import { hydrateLocalStorageFromIdbFallback } from "./memoryFallbackStore.js";

export * from "./types.js";
export * from "./memoryFallbackStore.js";
export * from "./quotaEvictionEngine.js";
export * from "./storageEncryptionAndSanitizer.js";

// Автоматическая гидратация L1 RAM кэша из аварийного IndexedDB хранилища при старте приложения
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
	if (typeof document !== "undefined" && (document.readyState === "complete" || document.readyState === "interactive")) {
		void hydrateLocalStorageFromIdbFallback();
	} else {
		window.addEventListener("DOMContentLoaded", () => {
			void hydrateLocalStorageFromIdbFallback();
		});
	}
}
