/**
 * @dental/web/components/orthodontics/cephAiInferenceService.ts
 *
 * Сервис калиброванных анатомических шаблонов ТРГ (Мандаты 8b, 8e, 8x, 8ap).
 * Честная доменная логика: калиброванный анатомический шаблон I класса (норма)
 * без фиктивных нейросетей, симуляций WebGPU/WebGL и искусственных задержек.
 */

import type { LandmarkMap } from "./cephalometric";
import { DEFAULT_CEPH_LANDMARKS_PRESET } from "./cephalometric/landmarkPresets";

export type CephAiBackendPreference = "auto" | "template_norm" | "class_1" | "manual";

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
		label: "Анатомический шаблон (Норма I класса)",
		labelRu: "Анатомический шаблон (Норма I класса)",
		badge: "Норма I класса",
	};
}

export const cephAiInferenceService = {
	async detectLandmarks(): Promise<LandmarkMap> {
		return { ...DEFAULT_CEPH_LANDMARKS_PRESET };
	},
	async inferLandmarks(): Promise<LandmarkMap> {
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
