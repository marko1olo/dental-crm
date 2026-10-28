/**
 * visionAnalyzerCore.ts — Two-Pass Radiograph Vision Analysis Orchestrator
 */

import { getProviderKeyCandidates } from "../../speech/keyPool.js";
import {
	enhanceVisioGraphImage,
	bufferToDataUrl,
} from "./imagePreprocessor.js";
import { PASS1_PROMPT, PASS2_PROMPT } from "./visionPrompts.js";
import {
	callVisionModel,
	extractJson,
	runCascade,
} from "./visionCascadeClient.js";
import {
	GEMINI_PROVIDER_ID,
	GEMINI_VISION_MODEL,
	GROQ_PROVIDER_ID,
	GROQ_VISION_MODEL,
	type ProviderSlot,
	type RadiographAnalysisOptions,
	type RadiographAnalysisResult,
	type ToothFindingUpdate,
} from "./visionTypes.js";

/**
 * Analyzes dental radiograph/study from base64 data URL using 2-pass vision cascade.
 */
export async function analyzeImagingStudy(
	imageBase64: string,
	options?: RadiographAnalysisOptions,
): Promise<RadiographAnalysisResult> {
	// biome-ignore lint/suspicious/noExplicitAny: provider check
	const groqKeys = getProviderKeyCandidates(GROQ_PROVIDER_ID as any);
	// biome-ignore lint/suspicious/noExplicitAny: provider check
	const geminiKeys = getProviderKeyCandidates(GEMINI_PROVIDER_ID as any);

	if (!groqKeys.length && !geminiKeys.length) {
		throw new Error("Нет доступных ключей для AI-анализа (ни Groq, ни Gemini)");
	}

	// 1. PRE-PROCESSING: CLAHE & Unsharp Mask
	const processedBase64 = await enhanceVisioGraphImage(imageBase64);

	// Clinical context lines for prompt injection
	const contextLines: string[] = [];
	if (options?.toothCode) {
		contextLines.push(`Зуб / область интереса (FDI): ${options.toothCode}`);
	}
	if (options?.clinicalQuestion) {
		contextLines.push(`Клинический вопрос врача: ${options.clinicalQuestion}`);
	}
	const pass1ExtraText =
		contextLines.length > 0
			? `Контекст клинического запроса:\n${contextLines.join("\n")}`
			: undefined;

	// 2. PASS 1: Primary analysis
	const pass1Slots: ProviderSlot[] = [
		{ provider: "groq", model: GROQ_VISION_MODEL },
		{ provider: "gemini", model: GEMINI_VISION_MODEL },
	];

	const pass1 = await runCascade(
		pass1Slots,
		PASS1_PROMPT,
		processedBase64,
		pass1ExtraText,
		80,
	);
	if (!pass1) {
		throw new Error(
			"Анализ не выполнен: все AI-провайдеры недоступны или вернули пустой ответ",
		);
	}

	// biome-ignore lint/suspicious/noExplicitAny: raw json
	let pass1Parsed: any;
	try {
		pass1Parsed = extractJson(pass1.text);
	} catch {
		return {
			summary: pass1.text.slice(0, 2000),
			toothUpdates: [],
			_meta: {
				pass1Model: pass1Slots[pass1.slotIdx]?.model ?? "unknown",
				pass2Model: null,
			},
		};
	}

	const pass1ModelName = pass1Slots[pass1.slotIdx]?.model;

	// 3. PASS 2: Critic pass
	const pass2Slots: ProviderSlot[] = [
		...pass1Slots.slice(pass1.slotIdx + 1),
		...pass1Slots.slice(0, pass1.slotIdx + 1),
	];

	const pass1Summary =
		typeof pass1Parsed.summary === "string"
			? pass1Parsed.summary
			: JSON.stringify(pass1Parsed);
	const pass2ExtraText = [
		`Вот первичный анализ, который нужно критически проверить и улучшить:\n\n${pass1Summary}`,
		contextLines.length > 0
			? `\n\nКонтекст клинического запроса:\n${contextLines.join("\n")}`
			: "",
	].join("");

	const pass2 = await runCascade(
		pass2Slots,
		PASS2_PROMPT,
		processedBase64,
		pass2ExtraText,
		100,
	);

	// biome-ignore lint/suspicious/noExplicitAny: response result
	let finalResult: any = pass1Parsed;
	let pass2ModelName: string | null = null;

	if (pass2) {
		try {
			const pass2Parsed = extractJson(pass2.text);
			if (
				pass2Parsed.toothUpdates?.length >=
					(pass1Parsed.toothUpdates?.length ?? 0) &&
				(pass2Parsed.summary?.length ?? 0) >=
					(pass1Parsed.summary?.length ?? 0) * 0.7
			) {
				finalResult = pass2Parsed;
			}
			pass2ModelName = pass2Slots[pass2.slotIdx]?.model ?? null;
		} catch {
			console.warn(
				"[visionAnalyzer] Pass 2 JSON parse failed, using Pass 1 result",
			);
		}
	}

	// 4. Normalise output
	// biome-ignore lint/suspicious/noExplicitAny: normalizer
	const toothUpdates: ToothFindingUpdate[] = Array.isArray(finalResult.toothUpdates)
		? // biome-ignore lint/suspicious/noExplicitAny: mapper
			finalResult.toothUpdates.map((u: any) => ({
				code: String(u.code ?? "unknown"),
				state: String(u.state ?? "watch"),
				diagnosisOrFinding: String(u.diagnosisOrFinding ?? ""),
				notes: u.notes ? String(u.notes) : undefined,
			}))
		: [];

	return {
		summary:
			typeof finalResult.summary === "string"
				? finalResult.summary
				: JSON.stringify(finalResult),
		toothUpdates,
		_meta: {
			pass1Model: pass1ModelName ?? "unknown",
			pass2Model: pass2ModelName,
		},
	};
}

/**
 * Analyzes dental radiograph from binary Buffer.
 */
export async function analyzeRadiographBuffer(
	buffer: Buffer,
	mimeType = "image/png",
	options?: RadiographAnalysisOptions,
): Promise<RadiographAnalysisResult> {
	const dataUrl = bufferToDataUrl(buffer, mimeType);
	return analyzeImagingStudy(dataUrl, options);
}
