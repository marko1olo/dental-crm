/**
 * cephAiServiceCore.ts — Ядро сервиса анализа ТРГ и анатомической калибровки (Мандат 8b <= 120 строк).
 */

import type { LandmarkKey } from "../cephalometricMath";
import { detectOptimalCephBackend } from "./backendDetection";
import { mapImageLandmarksToViewBox } from "./coordTransforms";
import { tryRunOnnxCephModel } from "./onnxRunner";
import { prepareImageTensor } from "./tensorPreprocess";
import type {
	CephAiBackendPreference,
	CephAiInferenceOptions,
	CephAiInferenceResult,
	CephAiLandmarkDetail,
	CephBackendInfo,
} from "./types";

export class CephAiInferenceService {
	private static instance: CephAiInferenceService | null = null;
	private activePreference: CephAiBackendPreference = "auto";

	public static getInstance(): CephAiInferenceService {
		if (!CephAiInferenceService.instance) {
			CephAiInferenceService.instance = new CephAiInferenceService();
		}
		return CephAiInferenceService.instance;
	}

	public getBackendPreference(): CephAiBackendPreference {
		return this.activePreference;
	}

	public setBackendPreference(pref: CephAiBackendPreference): void {
		this.activePreference = pref;
	}

	public getActiveBackendInfo(): CephBackendInfo {
		return detectOptimalCephBackend(this.activePreference);
	}

	public async runInference(
		imageSource: CanvasImageSource | string,
		options: CephAiInferenceOptions = {},
	): Promise<CephAiInferenceResult> {
		const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
		const pref = options.backend || this.activePreference;
		const backendInfo = detectOptimalCephBackend(pref);
		let naturalWidth = options.targetImageWidth || 1200;
		let naturalHeight = options.targetImageHeight || 896;

		let tensorData: Float32Array = new Float32Array(0);
		try {
			const prepared = await prepareImageTensor(imageSource, 768, 768, naturalWidth, naturalHeight);
			tensorData = prepared.tensorData;
			naturalWidth = prepared.naturalWidth || naturalWidth;
			naturalHeight = prepared.naturalHeight || naturalHeight;
		} catch {
			// fallback to natural dimensions
		}

		const onnxRes = await tryRunOnnxCephModel(
			tensorData,
			backendInfo.backend,
			options.modelPrecision || "int8",
			naturalWidth,
			naturalHeight,
		);

		const rawLandmarks: Record<LandmarkKey, CephAiLandmarkDetail> = onnxRes.landmarks || ({} as any);

		const viewBoxLandmarks = mapImageLandmarksToViewBox(
			rawLandmarks,
			naturalWidth,
			naturalHeight,
			options.viewBoxWidth || 800,
			options.viewBoxHeight || 700,
		);

		const latencyMs = Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime));
		const confs = Object.values(rawLandmarks).map((p) => p.confidence);

		return {
			landmarks: viewBoxLandmarks,
			rawLandmarks,
			backend: backendInfo.backend,
			backendLabel: backendInfo.labelRu,
			latencyMs,
			imageDimensions: { width: naturalWidth, height: naturalHeight },
			confidenceSummary: {
				mean: confs.length ? Math.round((confs.reduce((a, b) => a + b, 0) / confs.length) * 1000) / 1000 : 0,
				min: confs.length ? Math.round(Math.min(...confs) * 1000) / 1000 : 0,
				allPlaced: Object.keys(viewBoxLandmarks).length === 16,
			},
			isCalibratedFallback: false,
		};
	}
}

export const cephAiInferenceService = CephAiInferenceService.getInstance();
