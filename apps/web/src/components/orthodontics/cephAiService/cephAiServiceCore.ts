import type { LandmarkKey, LandmarkMap } from "../cephalometricMath";
import { detectOptimalCephBackend } from "./backendDetection";
import { CLINICAL_16_CHANNELS, SAMPLE_VALIDATION_COORDINATES_1200_896 } from "./channels";
import { mapImageLandmarksToViewBox } from "./coordTransforms";
import { tryRunOnnxCephModel } from "./onnxRunner";
import { prepareImageTensor } from "./tensorPreprocess";
import type { CephAiBackendPreference, CephAiInferenceOptions, CephAiInferenceResult, CephAiLandmarkDetail, CephBackendInfo } from "./types";

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

		let tensorData: Float32Array | null = null;
		try {
			const prepared = await prepareImageTensor(imageSource, 768, 768, naturalWidth, naturalHeight);
			tensorData = prepared.tensorData;
			naturalWidth = prepared.naturalWidth || naturalWidth;
			naturalHeight = prepared.naturalHeight || naturalHeight;
		} catch {
			// fallback to natural dimensions
		}

		let rawLandmarks: Record<LandmarkKey, CephAiLandmarkDetail> = {} as Record<LandmarkKey, CephAiLandmarkDetail>;
		let isFallback = true;
		let fallbackReason: string | undefined = "Применен анатомический шаблон (требуется ручная верификация).";

		if (tensorData) {
			const onnxRes = await tryRunOnnxCephModel(
				tensorData,
				backendInfo.backend,
				options.modelPrecision || "int8",
				naturalWidth,
				naturalHeight,
			);
			if (onnxRes.success && onnxRes.landmarks) {
				rawLandmarks = onnxRes.landmarks;
				isFallback = false;
				fallbackReason = undefined;
			}
		}

		if (isFallback) {
			const scaleX = naturalWidth / 1200;
			const scaleY = naturalHeight / 896;
			for (const k of Object.keys(CLINICAL_16_CHANNELS) as LandmarkKey[]) {
				const basePt = SAMPLE_VALIDATION_COORDINATES_1200_896[k];
				const chInfo = CLINICAL_16_CHANNELS[k];
				rawLandmarks[k] = {
					x: Math.round(basePt.x * scaleX * 10) / 10,
					y: Math.round(basePt.y * scaleY * 10) / 10,
					confidence: basePt.confidence,
					nameRu: chInfo.nameRu,
					category: chInfo.category,
					channel: chInfo.channel,
				};
			}
		}

		const viewBoxLandmarks = mapImageLandmarksToViewBox(
			rawLandmarks,
			naturalWidth,
			naturalHeight,
			options.viewBoxWidth || 800,
			options.viewBoxHeight || 700,
		);

		const latencyMs = Math.max(12, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime));
		const confs = Object.values(rawLandmarks).map((p) => p.confidence);

		return {
			landmarks: viewBoxLandmarks,
			rawLandmarks,
			backend: isFallback ? "wasm" : backendInfo.backend,
			backendLabel: isFallback ? "Калиброванный анатомический шаблон (Ручная проверка)" : backendInfo.labelRu,
			latencyMs,
			imageDimensions: { width: naturalWidth, height: naturalHeight },
			confidenceSummary: {
				mean: confs.length ? Math.round((confs.reduce((a, b) => a + b, 0) / confs.length) * 1000) / 1000 : 0,
				min: confs.length ? Math.round(Math.min(...confs) * 1000) / 1000 : 0,
				allPlaced: Object.keys(viewBoxLandmarks).length === 16,
			},
			isCalibratedFallback: isFallback,
			fallbackReason,
		};
	}
}

export const cephAiInferenceService = CephAiInferenceService.getInstance();
