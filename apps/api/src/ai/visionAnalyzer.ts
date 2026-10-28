/**
 * visionAnalyzer.ts — Dental Radiograph Vision Analysis Suite (Facade)
 *
 * Decomposed into modular architecture under apps/api/src/ai/vision/ per Mandate 8b:
 * - visionTypes.ts: Type contracts, models and provider constants
 * - visionPrompts.ts: Specialized 2-pass radiograph clinical analysis & critic prompts
 * - imagePreprocessor.ts: Contrast enhancement with CLAHE and unsharp mask
 * - visionCascadeClient.ts: Network cascade, model invocation and key pool rotation
 * - visionAnalyzerCore.ts: Pass 1 and Pass 2 orchestration with result normalization
 */

export {
	GROQ_VISION_MODEL,
	GEMINI_VISION_MODEL,
	GROQ_BASE_URL,
	GEMINI_BASE_URL,
	GROQ_PROVIDER_ID,
	GEMINI_PROVIDER_ID,
	type ProviderSlot,
	type RadiographAnalysisOptions,
	type ToothFindingUpdate,
	type RadiographAnalysisResult,
} from "./vision/visionTypes.js";

export {
	PASS1_PROMPT,
	PASS2_PROMPT,
} from "./vision/visionPrompts.js";

export {
	enhanceVisioGraphImage,
	bufferToDataUrl,
} from "./vision/imagePreprocessor.js";

export {
	callVisionModel,
	runCascade,
	extractJson,
} from "./vision/visionCascadeClient.js";

export {
	analyzeImagingStudy,
	analyzeRadiographBuffer,
} from "./vision/visionAnalyzerCore.js";
