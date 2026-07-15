import { fetch as undiciFetch } from "undici";
import {
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

export async function analyzeVisiographImage(
	imageBase64: string,
): Promise<VisiographAiResult> {
	const warnings: string[] = [];
	const providers = ["groq_whisper", "google_speech"]; // groq_whisper maps to GROQ keys, google_speech to Gemini keys
	let lastError: any;
	let rawContent = "";

	// Clean up prefix if needed (e.g., data:image/jpeg;base64,)
	const b64Data = imageBase64.includes(",")
		? imageBase64.split(",")[1]
		: imageBase64;
	const mimeType = imageBase64.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
	const imagePayload = `data:${mimeType};base64,${b64Data}`;

	for (const provider of providers) {
		const candidates = getProviderKeyCandidates(provider as any);
		if (!candidates.length) continue;

		// Shuffle candidates for load balancing securely
		candidates.sort(
			() =>
				(crypto.getRandomValues(new Uint32Array(1))[0] || 0) / 4294967295 - 0.5,
		);

		for (const candidate of candidates) {
			try {
				let endpoint = "";
				let model = "";

				if (provider === "groq_whisper") {
					endpoint = "https://api.groq.com/openai/v1/chat/completions";
					model =
						process.env.GROQ_VISION_MODEL ||
						"meta-llama/llama-4-scout-17b-16e-instruct";
				} else {
					endpoint =
						"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
					model = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash";
				}

				const requestBody = {
					model,
					temperature: 0,
					response_format: { type: "json_object" },
					messages: [
						{
							role: "system",
							content: visiographSystemPrompt,
						},
						{
							role: "user",
							content: [
								{ type: "text", text: "Проанализируй этот снимок." },
								{ type: "image_url", image_url: { url: imagePayload } },
							],
						},
					],
				};

				const response = await undiciFetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${candidate.value}`,
					},
					body: JSON.stringify(requestBody),
					dispatcher: (globalThis as any)._dentalProxyAgent || undefined,
				});

				if (!response.ok) {
					const text = await response.text();
					throw new Error(`[${model}] API Error ${response.status}: ${text}`);
				}

				const data = (await response.json()) as any;
				rawContent = data.choices?.[0]?.message?.content || "";
				if (!rawContent) throw new Error("Empty response from model");

				recordProviderKeySuccess(provider as any, candidate);
				break; // Break candidates loop
			} catch (err) {
				lastError = err;
				recordProviderKeyFailure(provider as any, candidate, err);
			}
		}
		if (rawContent) break; // Break providers loop if we got a result
	}

	if (!rawContent) {
		throw new Error(
			`Сбой ИИ-анализа: все ключи исчерпаны. Ошибка: ${lastError?.message || "Unknown error"}`,
		);
	}

	// Parse JSON response
	let resultObj: any = {};
	try {
		const trimmed = rawContent.trim();
		resultObj = JSON.parse(trimmed);
	} catch (e) {
		try {
			const match = rawContent.match(/\{[\s\S]*\}/);
			if (match?.[0]) resultObj = JSON.parse(match[0]);
		} catch {
			warnings.push(
				"Не удалось распарсить JSON блок со статусами зубов из ответа ИИ.",
			);
		}
	}

	const toothStates = resultObj?.toothStates || {};
	let report = rawContent;

	// Clean up JSON block from the report text if it's there
	if (report.includes("```json")) {
		report = report.split("```json")[0]?.trim() || report;
	} else if (report.includes("{") && report.includes("toothStates")) {
		report = report.substring(0, report.indexOf("{")).trim();
	}

	return {
		report,
		toothStates,
		warnings,
	};
}
