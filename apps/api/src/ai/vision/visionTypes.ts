/**
 * visionTypes.ts — Type definitions, models and provider constants for Vision Analyzer
 */

export const GROQ_VISION_MODEL =
	process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

export const GEMINI_VISION_MODEL =
	process.env.GEMINI_VISION_MODEL ?? "gemini-3.1-flash-lite";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GEMINI_BASE_URL =
	"https://generativelanguage.googleapis.com/v1beta/openai";

export const GROQ_PROVIDER_ID = "groq_whisper" as const;
export const GEMINI_PROVIDER_ID = "google_speech" as const;

export type ProviderSlot = { provider: "groq" | "gemini"; model: string };

export interface RadiographAnalysisOptions {
	toothCode?: string | null | undefined;
	clinicalQuestion?: string | null | undefined;
}

export interface ToothFindingUpdate {
	code: string;
	state: string;
	diagnosisOrFinding: string;
	notes?: string;
}

export interface RadiographAnalysisResult {
	summary: string;
	toothUpdates: ToothFindingUpdate[];
	_meta?: {
		pass1Model: string;
		pass2Model: string | null;
	};
}
