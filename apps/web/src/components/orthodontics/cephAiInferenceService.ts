/**
 * @dental/web/components/orthodontics/cephAiInferenceService.ts
 *
 * Сервис калиброванных анатомических шаблонов ТРГ (Мандаты 8b, 8e, 8x, 8ap).
 * Честная доменная логика: детерминированный анатомический шаблон нормы I класса
 * без фиктивных нейросетей, симуляций WebGPU/WebGL и скрытого обмана пользователя.
 */

import type { LandmarkMap } from "./cephalometric";
import { DEFAULT_CEPH_LANDMARKS_PRESET } from "./cephalometric";

export type CephAiBackendPreference = "auto" | "template_norm" | "class_1" | "manual";

export interface CephBackendInfo {
	backend: string;
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
		label: "Калиброванный анатомический шаблон нормы (требует ручной подгонки)",
		labelRu: "Калиброванный анатомический шаблон нормы (требует ручной подгонки)",
		badge: "Калиброванный анатомический шаблон нормы (требует ручной подгонки)",
	};
}

/**
 * Честный сервис применения калиброванного анатомического шаблона ТРГ нормы I класса.
 */
export const cephTemplateService = {
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

/** Обратная совместимость для существующих вызовов */
export const cephAiInferenceService = cephTemplateService;
export default cephAiInferenceService;
