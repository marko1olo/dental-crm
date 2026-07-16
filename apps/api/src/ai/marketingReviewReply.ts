import {
	AIPlanNeuralConfig,
	SpeechPolishProvider,
	baseUrlForProvider,
	createAIPlanNeuralConfig,
	keyProviderForPolishProvider,
} from "./treatmentPlanPersonalize.js";
import {
	fetchWithProviderTimeout,
	keyRetryLimit,
	numberFromEnv,
	providerHttpError,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	shouldTryNextProviderKey,
} from "../speech/keyPool.js";


interface OpenAiErrorResponse {
	error?: { message?: string };
}
interface OpenAiCompletionResponse {
	choices?: Array<{ message?: { content?: string } }>;
}

export interface MarketingReviewPayload {
	reviewText: string;
	tone: string;
	clinicName: string;
	seoKeys: string[];
}

export interface MarketingReviewResult {
	reply: string;
}



function buildSystemPrompt(payload: MarketingReviewPayload): string {
	return `Вы — опытный PR-менеджер и администратор стоматологической клиники "${payload.clinicName}".
Ваша задача: написать профессиональный, вежливый и эмпатичный ответ на отзыв пациента.
Тональность ответа: ${payload.tone} (positive, negative, neutral).

Ключевые слова (SEO), которые желательно органично вписать в ответ (хотя бы 1-2):
${payload.seoKeys.map((k) => `- ${k}`).join("\n")}

ПРАВИЛА:
1. Если отзыв негативный, проявите сочувствие, извинитесь (если уместно), предложите связаться с главным врачом или отделом качества.
2. Если позитивный — поблагодарите, отметьте важность обратной связи, впишите SEO-ключ про услугу.
3. Соблюдайте медицинскую этику.
4. Ответ должен быть сразу готов к публикации. Не пишите вводных фраз вроде "Вот ваш ответ:".
5. Верните результат строго в формате JSON:
{
  "reply": "готовый текст ответа"
}
`;
}

async function callOpenAiCompatibleMarketingReply(input: {
	config: AIPlanNeuralConfig;
	payload: MarketingReviewPayload;
	apiKey: string;
}): Promise<MarketingReviewResult> {
	if (!input.config.baseUrl || !input.config.modelName) {
		throw new Error("ИИ-сервер не настроен.");
	}

	const requestBody = {
		model: input.config.modelName,
		temperature: 0.7,
		response_format: { type: "json_object" },
		messages: [
			{
				role: "system",
				content: buildSystemPrompt(input.payload),
			},
			{
				role: "user",
				content: `Отзыв пациента: "${input.payload.reviewText}"`,
			},
		],
	};

	const response = await fetchWithProviderTimeout(
		`${input.config.baseUrl}/chat/completions`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${input.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
		numberFromEnv("DENTAL_SPEECH_POLISH_TIMEOUT_MS", 45_000),
	);

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw providerHttpError(
			response.status,
			response.statusText,
			(data as OpenAiErrorResponse).error?.message,
		);
	}

	const content = (data as OpenAiCompletionResponse).choices?.[0]?.message
		?.content;
	if (typeof content !== "string") {
		throw new Error("ИИ-модель вернула неожиданный ответ.");
	}

	let parsed: any;
	try {
		parsed = JSON.parse(content.trim());
	} catch {
		const match = content.match(/\{[\s\S]*\}/);
		if (!match?.[0]) {
			throw new Error("ИИ-модель вернула ответ не в формате JSON.");
		}
		parsed = JSON.parse(match[0]);
	}

	return {
		reply: String(parsed.reply ?? "").trim(),
	};
}

const DENTAL_AI_CASCADING_MODELS: Array<{
	provider: SpeechPolishProvider;
	model: string;
}> = [
	{ provider: "gemini", model: "gemini-2.5-flash" },
	{ provider: "gemini", model: "gemini-3-flash" },
	{ provider: "gemini", model: "gemini-3.1-flash-lite" },
	{ provider: "groq", model: "llama-3.3-70b-versatile" },
	{ provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct" },
];

export async function generateMarketingReviewReply(
	payload: MarketingReviewPayload,
): Promise<MarketingReviewResult> {
	const config = createAIPlanNeuralConfig();
	
	const generateFallback = () => {
		const keyword = payload.seoKeys[0] || "услуги нашей клиники";
		if (payload.tone === "negative") {
			return `Здравствуйте! Нам очень жаль, что у вас сложилось такое впечатление. Мы внимательно следим за качеством, включая ${keyword}. Пожалуйста, свяжитесь с главным врачом по телефону клиники "${payload.clinicName}", чтобы мы разобрались в ситуации.`;
		}
		return `Здравствуйте! Благодарим вас за обратную связь. Мы рады, что вы выбрали нашу клинику "${payload.clinicName}" для ${keyword}. Ваше доверие — это наша главная награда! Будем рады видеть вас снова.`;
	};

	if (!config.neuralEnabled) {
		return { reply: generateFallback() };
	}

	// Primary provider attempt with key pool
	try {
		if (config.explicitApiKey) {
			return await callOpenAiCompatibleMarketingReply({
				config,
				payload,
				apiKey: config.explicitApiKey,
			});
		}
		const keyProviderId = config.keyProviderId;
		if (keyProviderId) {
			const triedFingerprints = new Set<string>();
			const maxAttempts = keyRetryLimit(keyProviderId);
			for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
				const keyCandidate = selectProviderKey(
					keyProviderId,
					triedFingerprints,
				);
				if (!keyCandidate) break;
				triedFingerprints.add(keyCandidate.fingerprint);
				try {
					const result = await callOpenAiCompatibleMarketingReply({
						config,
						payload,
						apiKey: keyCandidate.value,
					});
					recordProviderKeySuccess(keyProviderId, keyCandidate);
					return result;
				} catch (error) {
					recordProviderKeyFailure(keyProviderId, keyCandidate, error);
					if (!shouldTryNextProviderKey(error)) break;
				}
			}
		}
	} catch (error) {
		console.warn(
			`[AI Marketing Reply Primary Failed]: ${error instanceof Error ? error.message : error}`,
		);
	}

	// Cascade fallback across providers
	for (const fallback of DENTAL_AI_CASCADING_MODELS) {
		if (
			fallback.provider === config.provider &&
			fallback.model === config.modelName
		)
			continue;
		try {
			const fallbackBaseUrl = baseUrlForProvider(fallback.provider);
			const fallbackKeyProviderId = keyProviderForPolishProvider(
				fallback.provider,
			);
			if (!fallbackBaseUrl || !fallbackKeyProviderId) continue;

			const triedFingerprints = new Set<string>();
			const keyCandidate = selectProviderKey(
				fallbackKeyProviderId,
				triedFingerprints,
			);
			if (!keyCandidate) continue;

			const fallbackConfig: AIPlanNeuralConfig = {
				neuralEnabled: true,
				provider: fallback.provider,
				baseUrl: fallbackBaseUrl,
				explicitApiKey: null,
				keyProviderId: fallbackKeyProviderId,
				modelName: fallback.model,
			};

			const result = await callOpenAiCompatibleMarketingReply({
				config: fallbackConfig,
				payload,
				apiKey: keyCandidate.value,
			});
			recordProviderKeySuccess(fallbackKeyProviderId, keyCandidate);
			return result;
		} catch (fallbackError) {
			console.warn(
				`[AI Marketing Reply Cascade ${fallback.provider}/${fallback.model} Failed]: ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`,
			);
		}
	}

	console.error(
		"[AI Marketing Reply]: All providers failed, returning rule-based fallback.",
	);
	return { reply: generateFallback() };
}
