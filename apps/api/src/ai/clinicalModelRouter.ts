/**
 * @file clinicalModelRouter.ts
 * @description Intelligent dynamic task-based model router for DENTE Chairside AI Copilot.
 * Mandate 8b: <= 180 lines, zero hallucination, strict clinical tier classification.
 */

import {
	type AgentRouterChatMessage,
	DEFAULT_AGENTROUTER_MODEL,
	DEFAULT_GEMINI_MODEL,
} from "./router/routerTypes.js";
import {
	isGeminiModel,
} from "./router/modelAdapters.js";

export type ClinicalTaskTier =
	| "chairside_fast"
	| "clinical_reasoning"
	| "clinical_vision"
	| "custom_byok";

export interface ClinicalRoutingDecision {
	model: string;
	tier: ClinicalTaskTier;
	rationale: string;
	provider: string;
	apiKey?: string | undefined;
	baseUrl?: string | undefined;
}

export interface ClinicalRoutingParams {
	messages: AgentRouterChatMessage[];
	speedMode?: "turbo" | "deep_reasoning" | undefined;
	doctorSpecialization?: string | undefined;
	modelRoutingMode?: "server_managed" | "custom_byok" | undefined;
	byokProvider?: string | undefined;
	byokApiKey?: string | undefined;
	byokModel?: string | undefined;
	byokBaseUrl?: string | undefined;
}

const VISION_KEYWORDS = [
	"рентген", "кнкт", "клкт", "снимок", "визиограф",
	"ортопантомограмма", "прицельный", "оптг", "панорамный",
	"radiograph", "cbct", "xray", "dicom", "image",
];

const REASONING_KEYWORDS = [
	"протокол операции", "синус-лифтинг", "остеоинтеграция",
	"имплантация", "план лечения", "дифференциальн", "осложнени",
	"взаимодействи", "аллерги", "смета", "касса", "54-фз",
	"surgery", "osteointegration", "differential", "treatment plan",
];

/**
 * Classifies clinical dialogue and returns optimal model, tier and endpoint config.
 */
export function routeClinicalTask(params: ClinicalRoutingParams): ClinicalRoutingDecision {
	const {
		messages,
		speedMode,
		modelRoutingMode = "server_managed",
		byokProvider,
		byokApiKey,
		byokModel,
		byokBaseUrl,
	} = params;

	// 1. Custom BYOK Routing (Advanced doctor mode)
	if (modelRoutingMode === "custom_byok" && byokApiKey && byokApiKey.trim().length > 0) {
		const provider = (byokProvider || "gemini").toLowerCase();
		let effectiveModel = byokModel || "gemini-2.5-flash";
		let effectiveBaseUrl = byokBaseUrl;

		if (provider === "anthropic") {
			effectiveModel = byokModel || "claude-3-7-sonnet";
		} else if (provider === "openai") {
			effectiveModel = byokModel || "gpt-4o";
			effectiveBaseUrl = byokBaseUrl || "https://api.openai.com/v1";
		} else if (provider === "deepseek") {
			effectiveModel = byokModel || "deepseek-r1";
			effectiveBaseUrl = byokBaseUrl || "https://api.deepseek.com/v1";
		} else if (provider === "gemini") {
			effectiveModel = byokModel || "gemini-2.5-flash";
		}

		return {
			model: effectiveModel,
			tier: "custom_byok",
			provider,
			apiKey: byokApiKey.trim(),
			baseUrl: effectiveBaseUrl,
			rationale: `Пользовательский API-ключ (${provider}: ${effectiveModel})`,
		};
	}

	// 2. Server-Managed Routing: Task classification
	const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
	const text = (lastUserMessage?.content || "").toLowerCase();

	// Tier A: Multimodal Vision
	const isVisionTask = VISION_KEYWORDS.some((kw) => text.includes(kw));
	if (isVisionTask) {
		return {
			model: "gemini-2.5-flash",
			tier: "clinical_vision",
			provider: "google",
			rationale: "Мультимодальный анализ рентгенологических данных и фотопротокола",
		};
	}

	// Tier B: Clinical Deep Reasoning
	const isReasoningTask =
		speedMode === "deep_reasoning" ||
		REASONING_KEYWORDS.some((kw) => text.includes(kw)) ||
		text.length > 300;

	if (isReasoningTask) {
		return {
			model: "gemini-2.5-pro",
			tier: "clinical_reasoning",
			provider: "google",
			rationale: "Глубокое клиническое мышление, хирургические протоколы и фискальные расчеты",
		};
	}

	// Tier C: Ultra-Fast Chairside (<400ms)
	return {
		model: "gemini-2.5-flash",
		tier: "chairside_fast",
		provider: "google",
		rationale: "Сверхбыстрый chairside-отклик (<400 мс) у кресла врача",
	};
}
