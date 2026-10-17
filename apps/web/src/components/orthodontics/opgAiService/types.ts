import type { OpgAnalysisResult } from "../opgTopologicalEngine";

export type OpgAiBackend = "webgpu" | "webgl" | "wasm";

export interface OpgBackendInfo {
	backend: OpgAiBackend;
	labelRu: string;
	badge: string;
	isDiscreteGpu: boolean;
	descriptionRu: string;
}

export interface OpgAiInferenceOptions {
	backendPreference?: "auto" | "webgpu" | "webgl" | "wasm";
	confidenceThreshold?: number;
	iouThreshold?: number;
	allowFallback?: boolean;
}

export interface OpgAiInferenceResponse {
	analysis: OpgAnalysisResult;
	backend: OpgAiBackend;
	backendLabel: string;
	latencyMs: number;
	imageDimensions: { width: number; height: number };
	isCalibratedFallback: boolean;
	rawDetectionsCount?: number;
}

export const LIODON_CLASSES: Record<number, "caries" | "periapical_lesion" | "impacted_tooth"> = {
	0: "caries",
	1: "periapical_lesion",
	2: "impacted_tooth",
};
