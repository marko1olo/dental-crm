/**
 * backendDetection.ts — Информационный резолвер калибровки зубных дуг ОПТГ.
 */

import type { OpgAiBackend, OpgBackendInfo } from "./types";

export function detectOptimalOpgBackend(
	preference: "auto" | "webgpu" | "webgl" | "wasm" = "auto",
): OpgBackendInfo {
	const backend: OpgAiBackend = preference === "webgpu"
		? "webgpu"
		: preference === "webgl"
			? "webgl"
			: "wasm";

	const badges: Record<OpgAiBackend, string> = {
		webgpu: "WebGPU",
		webgl: "WebGL",
		wasm: "CPU",
	};

	const labels: Record<OpgAiBackend, string> = {
		webgpu: "WebGPU (Калибровка)",
		webgl: "WebGL 2.0 (Калибровка)",
		wasm: "WASM (Калибровка)",
	};

	return {
		backend,
		labelRu: labels[backend],
		badge: badges[backend],
		isDiscreteGpu: backend === "webgpu",
		descriptionRu: "2D Вьюер ОПТГ с топологической калибровкой зубной формулы FDI (11..48)",
	};
}
