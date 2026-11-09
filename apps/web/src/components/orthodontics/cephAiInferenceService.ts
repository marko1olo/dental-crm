/**
 * @dental/web/components/orthodontics/cephAiInferenceService.ts
 * Легкий детерминированный сервис ТРГ (Мандат 8b).
 */

import type { LandmarkMap } from "./cephalometric";
import { DEFAULT_CEPH_LANDMARKS_PRESET } from "./cephalometric/landmarkPresets";

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
		options?: { backend?: CephAiBackendPreference; allowFallback?: boolean },
	): Promise<CephAiInferenceResult> {
		const backend = options?.backend && options.backend !== "auto" ? options.backend : "wasm";
		return {
			landmarks: { ...DEFAULT_CEPH_LANDMARKS_PRESET },
			latencyMs: 15,
			isCalibratedFallback: true,
			backend,
		};
	},
};

export default cephAiInferenceService;
