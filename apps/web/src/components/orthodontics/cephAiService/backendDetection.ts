/**
 * backendDetection.ts — Информационный резолвер режима разметки ТРГ.
 * 
 * Выкос процедурного симулятора WebGPU/WebGL: вместо имитации нейросетевых ядер
 * и зависания браузера возвращается безопасный профиль клинической калибровки.
 */

import type { CephAiActiveBackend, CephAiBackendPreference, CephBackendInfo } from "./types";

export function detectOptimalCephBackend(
	preference: CephAiBackendPreference = "auto",
): CephBackendInfo {
	const backend: CephAiActiveBackend = preference === "webgpu"
		? "webgpu"
		: preference === "webgl"
			? "webgl"
			: "wasm";

	const badges: Record<CephAiActiveBackend, string> = {
		webgpu: "GPU",
		webgl: "WebGL",
		wasm: "CPU",
	};

	const labels: Record<CephAiActiveBackend, string> = {
		webgpu: "GPU (Калибровка)",
		webgl: "WebGL (Калибровка)",
		wasm: "Процессор (Калибровка)",
	};

	return {
		backend,
		preference,
		labelRu: labels[backend],
		badge: badges[backend],
		isDiscreteGpu: backend === "webgpu",
		descriptionRu: "2D Вьюер ТРГ с калиброванной линейкой и анатомическими ориентирами",
	};
}
