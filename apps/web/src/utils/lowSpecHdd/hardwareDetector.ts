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

function getNavigatorProperty(key: string): unknown {
	if (typeof navigator === "undefined") {
		return undefined;
	}
	return Reflect.get(navigator, key);
}

interface NetworkInformationSnapshot {
	saveData: boolean;
	effectiveType: string | null;
}

function getNetworkInformationSnapshot(): NetworkInformationSnapshot | null {
	const rawConnection = getNavigatorProperty("connection");
	if (typeof rawConnection !== "object" || rawConnection === null) {
		return null;
	}
	const saveData = Reflect.get(rawConnection, "saveData") === true;
	const rawEffectiveType = Reflect.get(rawConnection, "effectiveType");
	const effectiveType =
		typeof rawEffectiveType === "string" && rawEffectiveType.length > 0
			? rawEffectiveType
			: null;
	return { saveData, effectiveType };
}

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
		const tier = root.getAttribute?.("data-hardware-tier");
		const perfTier = root.getAttribute?.("data-perf-tier");
		if (
			root.getAttribute?.("data-low-spec") === "true" ||
			tier === "low" ||
			tier === "potato" ||
			perfTier === "low" ||
			perfTier === "potato" ||
			root.getAttribute?.("data-perf") === "low" ||
			root.getAttribute?.("data-perf-state") === "degraded" ||
			root.getAttribute?.("data-ct-active") === "true" ||
			root.classList?.contains?.("low-spec-mode") ||
			root.classList?.contains?.("low-spec-perf") ||
			root.classList?.contains?.("low-end-hardware-mode")
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
	const deviceMemory = getNavigatorProperty("deviceMemory");
	if (typeof deviceMemory === "number" && deviceMemory <= 4) {
		return true;
	}

	// 3. Проверка режима экономии трафика (часто включен на слабых каналах)
	const connection = getNetworkInformationSnapshot();
	if (connection?.saveData === true) {
		return true;
	}
	const effType = connection?.effectiveType;
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

		const deviceMemory = getNavigatorProperty("deviceMemory");
		if (typeof deviceMemory === "number") {
			memoryGb = deviceMemory;
		}

		const connection = getNetworkInformationSnapshot();
		if (connection) {
			saveData = connection.saveData;
			effectiveType = connection.effectiveType;
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
