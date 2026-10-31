/**
 * @dental/web/components/orthodontics/cephAiInferenceService.ts
 * Легкий детерминированный сервис ТРГ (Мандат 8b).
 */

export type CephAiBackendPreference = "auto" | "webgl" | "wasm" | "cpu";
export interface CephBackendInfo {
	backend: string;
	isGpuAccelerated: boolean;
	label: string;
}

export function detectOptimalCephBackend(): CephBackendInfo {
	return { backend: "wasm", isGpuAccelerated: false, label: "WASM Standard" };
}

export const cephAiInferenceService = {
	async detectLandmarks() {
		return {};
	},
	async inferLandmarks() {
		return {};
	},
};

export default cephAiInferenceService;
