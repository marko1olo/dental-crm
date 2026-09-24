/**
 * DENTE CRM — Web Workers Module Exports & Factory Helpers
 */

export * from "../utils/math/mprMath";

export interface MprWorkerClientOptions {
	readonly workerUrl?: string | URL;
}

/**
 * Безопасная фабрика для создания экземпляра MPR Web Worker.
 * Проверяет доступность окружения Worker и автоматически конфигурирует модуль.
 */
export function createMprWorker(options?: MprWorkerClientOptions): Worker | null {
	if (typeof window === "undefined" || typeof Worker === "undefined") {
		return null;
	}

	try {
		const targetUrl = options?.workerUrl ?? new URL("./mprWorker.ts", import.meta.url);
		return new Worker(targetUrl, {
			type: "module",
		});
	} catch {
		return null;
	}
}
