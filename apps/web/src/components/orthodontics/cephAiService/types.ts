import type { LandmarkKey, LandmarkMap, Point2D } from "../cephalometricMath";

export type CephAiBackendPreference = "auto" | "webgpu" | "webgl" | "wasm";
export type CephAiActiveBackend = "webgpu" | "webgl" | "wasm";

export interface CephBackendInfo {
	backend: CephAiActiveBackend;
	preference: CephAiBackendPreference;
	labelRu: string;
	badge: string;
	isDiscreteGpu: boolean;
	descriptionRu: string;
}

export interface CephAiLandmarkDetail extends Point2D {
	confidence: number;
	nameRu: string;
	category: string;
	channel: number;
}

export interface CephAiInferenceResult {
	landmarks: LandmarkMap;
	rawLandmarks: Record<LandmarkKey, CephAiLandmarkDetail>;
	backend: CephAiActiveBackend;
	backendLabel: string;
	latencyMs: number;
	imageDimensions: { width: number; height: number };
	confidenceSummary: {
		mean: number;
		min: number;
		allPlaced: boolean;
	};
	isCalibratedFallback: boolean;
	fallbackReason?: string | undefined;
}

export interface CephAiInferenceOptions {
	backend?: CephAiBackendPreference;
	modelPrecision?: "int8" | "fp32";
	viewBoxWidth?: number;
	viewBoxHeight?: number;
	targetImageWidth?: number;
	targetImageHeight?: number;
	allowFallback?: boolean;
}
