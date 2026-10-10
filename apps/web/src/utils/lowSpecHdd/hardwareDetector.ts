/**
 * lowSpecHdd/hardwareDetector.ts — детектор характеристик оборудования и окружения клиентской машины.
 * Layer 2: Hardware sensing domain logic.
 */

import type { DeviceCapabilities } from "./types.js";
import {
	getDiskBenchmarkResult,
	getForcedLowSpecMode,
	setForcedLowSpecMode,
} from "./benchmarkStore.js";

export { setForcedLowSpecMode };

/**
 * Определяет, относится ли текущее устройство к категории слабых (Low-Spec / Slow HDD).
 */
export function isLowSpecDevice(): boolean {
	const forced = getForcedLowSpecMode();
	if (forced !== null) {
		return forced;
	}

	const benchmark = getDiskBenchmarkResult();
	if (benchmark?.isSlowDisk) {
		return true;
	}

	if (typeof document !== "undefined" && document.documentElement) {
		const root = document.documentElement;
		if (
			root.getAttribute?.("data-low-spec") === "true" ||
			root.getAttribute?.("data-hardware-tier") === "low" ||
			root.getAttribute?.("data-perf") === "low" ||
			root.classList?.contains?.("low-spec-mode") ||
			root.classList?.contains?.("low-spec-perf")
		) {
			return true;
		}
	}

	if (typeof navigator === "undefined") {
		return false;
	}

	// 1. Проверка количества ядер процессора (<= 4 ядра — типичный офисный ноутбук/нетбук)
	const cores = navigator.hardwareConcurrency;
	if (typeof cores === "number" && cores > 0 && cores <= 4) {
		return true;
	}

	// 2. Проверка объема RAM (Device Memory API, если доступно в Chromium)
	const navWithMemory = navigator as unknown as { deviceMemory?: number };
	if (typeof navWithMemory.deviceMemory === "number" && navWithMemory.deviceMemory <= 4) {
		return true;
	}

	// 3. Проверка режима экономии трафика (часто включен на слабых каналах)
	const navWithConn = navigator as unknown as {
		connection?: { saveData?: boolean; effectiveType?: string };
	};
	if (navWithConn.connection?.saveData === true) {
		return true;
	}
	const effType = navWithConn.connection?.effectiveType;
	if (effType === "slow-2g" || effType === "2g" || effType === "3g") {
		return true;
	}

	return false;
}

/**
 * Возвращает полные аппаратные характеристики устройства.
 */
export function getDeviceCapabilities(): DeviceCapabilities {
	const isLow = isLowSpecDevice();

	let cores = 4;
	let memoryGb: number | null = null;
	let saveData = false;
	let effectiveType: string | null = null;

	if (typeof navigator !== "undefined") {
		if (typeof navigator.hardwareConcurrency === "number") {
			cores = navigator.hardwareConcurrency;
		}

		const navWithMemory = navigator as unknown as { deviceMemory?: number };
		if (typeof navWithMemory.deviceMemory === "number") {
			memoryGb = navWithMemory.deviceMemory;
		}

		const navWithConn = navigator as unknown as {
			connection?: { saveData?: boolean; effectiveType?: string };
		};
		if (navWithConn.connection) {
			saveData = Boolean(navWithConn.connection.saveData);
			effectiveType = navWithConn.connection.effectiveType || null;
		}
	}

	const benchmark = getDiskBenchmarkResult();

	return {
		isLowSpec: isLow,
		hardwareConcurrency: cores,
		deviceMemoryGb: memoryGb,
		isSaveData: saveData,
		effectiveConnectionType: effectiveType,
		forcedMode: getForcedLowSpecMode(),
		isSlowHdd: benchmark?.isSlowDisk ?? false,
		diskWriteTimeMs: benchmark?.writeTimeMs ?? null,
	};
}
