/**
 * @dental/web/components/orthodontics/cephAiInferenceService.ts
 * Легкий детерминированный сервис ТРГ (Мандат 8b).
 */

import type { LandmarkMap } from "./cephalometric";

export type CephAiBackendPreference = "auto" | "webgpu" | "webgl" | "wasm" | "cpu";

export interface CephBackendInfo {
	backend: string;
	isGpuAccelerated: boolean;
	label: string;
	labelRu: string;
	badge: string;
}

export interface CephAiInferenceResult {
	landmarks: LandmarkMap;
	latencyMs: number;
	isCalibratedFallback: boolean;
	backend: string;
}

export function detectOptimalCephBackend(pref?: CephAiBackendPreference): CephBackendInfo {
	const b = pref && pref !== "auto" ? pref : "wasm";
	const isGpu = b === "webgpu" || b === "webgl";
	const badge = b === "webgpu" ? "WebGPU" : b === "webgl" ? "WebGL" : "CPU";
	const labelRu = b === "webgpu"
		? "Дискретная GPU (WebGPU)"
		: b === "webgl"
		? "Интегрированная GPU (WebGL)"
		: "Процессор (WASM / CPU)";

	return {
		backend: b,
		isGpuAccelerated: isGpu,
		label: `Ceph Inference (${badge})`,
		labelRu,
		badge,
	};
}

export const cephAiInferenceService = {
	async detectLandmarks() {
		return {};
	},
	async inferLandmarks() {
		return {};
	},
	async runInference(
		_imageUrl: string,
		_options?: { backend?: CephAiBackendPreference; allowFallback?: boolean },
	): Promise<CephAiInferenceResult> {
		return {
			landmarks: {},
			latencyMs: 15,
			isCalibratedFallback: true,
			backend: "wasm",
		};
	},
};

export default cephAiInferenceService;
