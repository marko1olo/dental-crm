/**
 * visionCascadeClient.ts — Vision Multi-Provider Network Cascade & Key Rotation
 */

import {
	fetchWithProviderTimeout,
	keyRetryLimit,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
} from "../../speech/keyPool.js";
import {
	GEMINI_BASE_URL,
	GEMINI_PROVIDER_ID,
	GROQ_BASE_URL,
	GROQ_PROVIDER_ID,
	type ProviderSlot,
} from "./visionTypes.js";

/**
 * Call a single vision model attempt with provider timeout.
 */
export async function callVisionModel(
	slot: ProviderSlot,
	apiKey: string,
	prompt: string,
	imageBase64: string,
	extraUserText?: string,
	timeoutMs = 40_000,
): Promise<string> {
	const baseUrl = slot.provider === "groq" ? GROQ_BASE_URL : GEMINI_BASE_URL;

	// biome-ignore lint/suspicious/noExplicitAny: OpenAI-compat multi-modal payload
	const userContent: any[] = [{ type: "text", text: prompt }];
	if (extraUserText) {
		userContent.push({ type: "text", text: extraUserText });
	}
	userContent.push({ type: "image_url", image_url: { url: imageBase64 } });

	// biome-ignore lint/suspicious/noExplicitAny: provider options
	const body: any = {
		model: slot.model,
		temperature: 0.1,
		...(slot.provider === "groq"
			? { response_format: { type: "json_object" } }
			: {}),
		messages: [{ role: "user", content: userContent }],
	};

	const resp = await fetchWithProviderTimeout(
		`${baseUrl}/chat/completions`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
		},
		timeoutMs,
	);

	if (!resp.ok) {
		const errText = await resp.text().catch(() => resp.statusText);
		const err = new Error(
			`${slot.provider.toUpperCase()} ${resp.status}: ${errText}`,
		);
		// biome-ignore lint/suspicious/noExplicitAny: attach status
		(err as any).statusCode = resp.status;
		throw err;
	}

	// biome-ignore lint/suspicious/noExplicitAny: response parser
	const data = (await resp.json()) as any;
	const content: string = data?.choices?.[0]?.message?.content ?? "";
	if (!content || content.length < 20) {
		throw new Error(`${slot.provider.toUpperCase()} returned empty content`);
	}
	return content;
}

/**
 * Runs provider slots in cascade with key rotation.
 */
export async function runCascade(
	slots: ProviderSlot[],
	prompt: string,
	imageBase64: string,
	extraUserText?: string,
	minLength = 80,
): Promise<{ text: string; slotIdx: number } | null> {
	for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
		// biome-ignore lint/style/noNonNullAssertion: safe bounds
		const slot = slots[slotIdx]!;
		const providerId =
			slot.provider === "groq" ? GROQ_PROVIDER_ID : GEMINI_PROVIDER_ID;
		const triedFingerprints = new Set<string>();
		const maxAttempts = Math.max(1, keyRetryLimit(providerId));

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			// biome-ignore lint/suspicious/noExplicitAny: provider key
			const candidate = selectProviderKey(providerId as any, triedFingerprints);
			if (!candidate) break;

			// biome-ignore lint/suspicious/noExplicitAny: provider key value
			const apiKey = (candidate as any).value ?? (candidate as any).key ?? "";
			if (!apiKey) {
				triedFingerprints.add(candidate.fingerprint);
				continue;
			}

			try {
				console.info(
					`[visionAnalyzer] Pass slot=${slotIdx} provider=${slot.provider} model=${slot.model} key=${candidate.fingerprint}`,
				);
				const text = await callVisionModel(
					slot,
					apiKey,
					prompt,
					imageBase64,
					extraUserText,
				);

				if (text.length >= minLength) {
					// biome-ignore lint/suspicious/noExplicitAny: key tracking
					recordProviderKeySuccess(providerId as any, candidate);
					return { text, slotIdx };
				}
				console.warn(
					`[visionAnalyzer] Response too short (${text.length} chars), trying next`,
				);
				// biome-ignore lint/suspicious/noExplicitAny: key error handling
			} catch (err: any) {
				const statusCode: number = err?.statusCode ?? 0;
				// biome-ignore lint/suspicious/noExplicitAny: key failure
				recordProviderKeyFailure(providerId as any, candidate, err);
				triedFingerprints.add(candidate.fingerprint);

				console.warn(
					`[visionAnalyzer] ${slot.provider} key=${candidate.fingerprint} failed: ${err.message}`,
				);

				if (statusCode === 429 || statusCode === 401 || statusCode === 403) {
					continue;
				}
				if (!statusCode || statusCode >= 500) {
					continue;
				}
				break;
			}
		}
	}
	return null;
}

/**
 * Extracts JSON from model response text, stripping reasoning tags and markdown fences.
 */
// biome-ignore lint/suspicious/noExplicitAny: parsed JSON payload
export function extractJson(text: string): any {
	const cleaned = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();

	try {
		return JSON.parse(cleaned);
	} catch {
		/* continue */
	}

	const match = cleaned.match(/\{[\s\S]*\}/);
	if (match) {
		try {
			return JSON.parse(match[0]);
		} catch {
			/* continue */
		}
	}

	throw new Error("Не удалось извлечь JSON из ответа модели");
}
