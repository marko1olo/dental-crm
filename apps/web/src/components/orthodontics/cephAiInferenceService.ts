/**
 * @dental/web/components/orthodontics/cephAiInferenceService.ts
 * Сервис калиброванных анатомических шаблонов ТРГ (Мандаты 8b, 8e, 8x).
 * Честная доменная логика: калиброванный анатомический шаблон I класса (норма)
 * без фиктивных GPU/WebGL нейросетей и искусственных задержек.
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

export function detectOptimalCephBackend(_pref?: CephAiBackendPreference): CephBackendInfo {
	return {
		backend: "template_norm",
		isGpuAccelerated: false,
		label: "Анатомический шаблон (норма)",
		labelRu: "Калиброванный анатомический шаблон (норма)",
		badge: "Шаблон (норма)",
	};
}

export const cephAiInferenceService = {
	async detectLandmarks() {
		return { ...DEFAULT_CEPH_LANDMARKS_PRESET };
	},
	async inferLandmarks() {
		return { ...DEFAULT_CEPH_LANDMARKS_PRESET };
	},
	async runInference(
		_imageUrl: string,
		_options?: { backend?: CephAiBackendPreference; allowFallback?: boolean },
	): Promise<CephAiInferenceResult> {
		return {
			landmarks: { ...DEFAULT_CEPH_LANDMARKS_PRESET },
			latencyMs: 0,
			isCalibratedFallback: true,
			backend: "template_norm",
		};
	},
};

export default cephAiInferenceService;
