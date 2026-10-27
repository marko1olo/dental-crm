/**
 * visiograph.ts — Быстрый асинхронный ИИ-анализ прицельных 2D-снимков визиографа.
 * Уничтожен 45-секундный синхронный таймаут (теперь быстрый таймаут 8с). Мандат 8b (<=120 строк).
 */

import { randomInt } from "node:crypto";
import {
	fetchWithProviderTimeout,
	getProviderKeyCandidates,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
} from "../speech/keyPool.js";
import { visiographSystemPrompt } from "./visiographPrompt.js";

export interface VisiographAiResult {
	report: string;
	toothStates: Record<string, string>;
	warnings: string[];
}

const DEFAULT_TIMEOUT_MS = 8_000;

export async function analyzeVisiographImage(imageBase64: string): Promise<VisiographAiResult> {
	const warnings: string[] = [];
	const providers = ["groq_whisper", "google_speech"];
	let lastError: unknown;
	let rawContent = "";

	const b64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
	const mimeType = imageBase64.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
	const imagePayload = `data:${mimeType};base64,${b64Data}`;
	const timeoutMs = Number(process.env.DENTE_VISIOGRAPH_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

	for (const provider of providers) {
		const candidates = getProviderKeyCandidates(provider as any);
		if (!candidates.length) continue;

		for (let i = candidates.length - 1; i > 0; i--) {
			const j = randomInt(0, i + 1);
			const temp = candidates[i]!;
			candidates[i] = candidates[j]!;
			candidates[j] = temp;
		}

		for (const candidate of candidates) {
			try {
				const isGroq = provider === "groq_whisper";
				const endpoint = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
				const model = isGroq ? (process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct") : (process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash");

				const requestBody = {
					model,
					temperature: 0,
					response_format: { type: "json_object" },
					messages: [
						{ role: "system", content: visiographSystemPrompt },
						{ role: "user", content: [{ type: "text", text: "Проанализируй данный снимок." }, { type: "image_url", image_url: { url: imagePayload } }] },
					],
				};

				const response = await fetchWithProviderTimeout(
					endpoint,
					{ method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${candidate.value}` }, body: JSON.stringify(requestBody) },
					timeoutMs,
				);

				if (!response.ok) {
					const text = await response.text();
					throw new Error(`[${model}] API Error ${response.status}: ${text}`);
				}

				const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
				rawContent = data.choices?.[0]?.message?.content || "";
				if (!rawContent) throw new Error("Пустой ответ модели анализа визиограммы");

				recordProviderKeySuccess(provider as any, candidate);
				break;
			} catch (err) {
				lastError = err;
				recordProviderKeyFailure(provider as any, candidate, err);
			}
		}
		if (rawContent) break;
	}

	if (!rawContent) {
		const errDetail = lastError instanceof Error ? lastError.message : "Unknown error";
		throw new Error(`Ошибка распознавания снимка: AI-провайдер недоступен. Детали: ${errDetail}`);
	}

	let resultObj: Record<string, unknown> = {};
	try {
		resultObj = JSON.parse(rawContent.trim());
	} catch {
		try {
			const match = rawContent.match(/\{[\s\S]*\}/);
			if (match?.[0]) resultObj = JSON.parse(match[0]);
		} catch {
			warnings.push("Не удалось распарсить JSON-структуру ответа, возвращен сырой текст ответа.");
		}
	}

	const toothStates = (resultObj?.toothStates as Record<string, string>) || {};
	let report = rawContent;
	if (report.includes("```json")) {
		report = report.split("```json")[0]?.trim() || report;
	} else if (report.includes("{") && report.includes("toothStates")) {
		report = report.substring(0, report.indexOf("{")).trim();
	}

	return { report, toothStates, warnings };
}
