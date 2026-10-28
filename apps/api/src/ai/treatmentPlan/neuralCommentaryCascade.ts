/**
 * neuralCommentaryCascade.ts — Omni-Gateway Multi-Provider Neural Commentary Cascade
 */

import type {
	SpeechGatewayProvider,
	TreatmentPlanValidateAndCommentRequest,
} from "@dental/shared";
import {
	fetchWithProviderTimeout,
	numberFromEnv,
	providerHttpError,
} from "../../speech/keyPool.js";
import type { DeterministicClinicalValidationResult } from "./clinicalValidator.js";
import type { calculateDeterministicFinancialArgumentation } from "./financialArgumentation.js";

export const AI_MODEL_CASCADE: Array<{
	provider: "groq" | "gemini";
	model: string;
	keyProviderId: SpeechGatewayProvider;
	baseUrl: string;
}> = [
	// 1. Primary: Qwen 3.8 27B on Groq
	{
		provider: "groq",
		model: "qwen/qwen3.8-27b",
		keyProviderId: "groq_whisper",
		baseUrl: "https://api.groq.com/openai/v1",
	},
	// 2. High-speed Fallback 1: Gemini 3.5 Flash-Lite
	{
		provider: "gemini",
		model: "gemini-3.5-flash-lite",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 3. High-speed Fallback 2: Gemini 3.1 Flash-Lite
	{
		provider: "gemini",
		model: "gemini-3.1-flash-lite",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 4. Gemini 3.8 Flash
	{
		provider: "gemini",
		model: "gemini-3.8-flash",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 5. Gemini 3.7 Flash
	{
		provider: "gemini",
		model: "gemini-3.7-flash",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 6. Gemini 3.5 Flash
	{
		provider: "gemini",
		model: "gemini-3.5-flash",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 7. Gemini 2.5 Flash
	{
		provider: "gemini",
		model: "gemini-2.5-flash",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 8. Llama 3.3 70B Versatile on Groq
	{
		provider: "groq",
		model: "llama-3.3-70b-versatile",
		keyProviderId: "groq_whisper",
		baseUrl: "https://api.groq.com/openai/v1",
	},
];

export function buildTreatmentPlanPrompt(
	request: TreatmentPlanValidateAndCommentRequest,
	deterministicValidation: DeterministicClinicalValidationResult,
	deterministicFinance: ReturnType<
		typeof calculateDeterministicFinancialArgumentation
	>,
): { system: string; user: string } {
	const system = `Вы — главный клинический эксперт, челюстно-лицевой хирург и ведущий врач-стоматолог клиники DENTE.
Ваша цель — провести глубокий клинический аудит плана лечения по стандартам СтАР и составить понятный, заботливый, аргументированный комментарий для презентации пациенту у кресла.

СТРОГИЕ ПРАВИЛА:
1. КЛИНИЧЕСКАЯ ВАЛИДАЦИЯ:
   - Проверьте соответствие анатомии зубов по стандарту FDI (11..48): резцы/клыки (1 канал), премоляры (1-2 канала), моляры (3-4 канала).
   - Обязательно выделите депульпированные жевательные зубы без коронок (риск раскола корня).
   - Проверьте последовательность: Санация и Гигиена -> Хирургия и Имплантация -> Ортопедия и Протезирование.
2. ПРЕЗЕНТАЦИЯ ПАЦИЕНТУ («МАТЕМАТИКА ЗДОРОВЬЯ»):
   - Используйте яркие, понятные метафоры:
     * Кариес = "скрытая полость под прочной эмалью, как подгнившая балка внутри стены".
     * Пульпит = "воспаление нерва — пожар внутри зуба, требующий бережного тушения и пломбирования под микроскопом".
     * Имплантация = "создание нового титанового корня взамен утраченного — сохраняет кость и предотвращает смещение соседних зубов".
     * Коронка на депульпированный зуб = "защитный шлем для хрупкого зуба, предохраняющий от раскола".
   - Экономический аргумент: лечить кариес сейчас (~6 000 ₽) в 6 раз дешевле эндодонтии с коронкой (~35 000 ₽) и в 10 раз дешевле имплантации (~70 000+ ₽).
3. ФИНАНСОВАЯ АРГУМЕНТАЦИЯ:
   - Налоговый вычет 13% (Код 01 до 150к, Код 02 без ограничений).
   - Рассрочка 0% без переплат.
   - Поэтапная оплата 30/40/30.
4. ФОРМАТ ОТВЕТА:
   - СТРОГО валидный JSON в соответствии со структурой Response! Без markdown разметки вокруг JSON.`;

	const user = `Данные плана лечения:
Врач: ${request.doctorFullName || "Врач-стоматолог DENTE"} (${request.doctorSpecialty || "Стоматолог общей практики"})
Пациент: ${request.patientContext?.patientName || "Пациент"} (Диагноз: ${request.patientContext?.diagnosisSummary || "Санация полости рта"})
Общая стоимость: ${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽
Целевой бюджет: ${request.targetBudgetRub ? `${request.targetBudgetRub.toLocaleString("ru-RU")} ₽` : "Не ограничен"}
Пользовательский запрос: ${request.userPrompt || "Комплексный аудит и комментарий для пациента"}

Этапы лечения:
${request.stages.map((s) => `Этап ${s.stageNumber}: ${s.title} (${s.totalRub} ₽, ${s.estimatedWeeks || 2} нед.)
  Услуги:
${s.items.map((it) => `    * [Зуб ${it.toothNumber || "—"}] ${it.code804n ? `${it.code804n} ` : ""}${it.name} — ${it.priceRub} ₽ (${it.materials || "стандарт"})`).join("\n")}`).join("\n\n")}

Предварительные детерминированные проверки:
- Статус соответствия: ${deterministicValidation.overallStatus} (${deterministicValidation.complianceScorePercent}%)
- Критические предупреждения: ${deterministicValidation.criticalWarnings.join("; ") || "нет"}
- Рекомендации: ${deterministicValidation.clinicalRecommendations.join("; ") || "нет"}
- Налоговый вычет: ${deterministicFinance.ndflDeduction.totalRefundRub} ₽ (чистая цена: ${deterministicFinance.ndflDeduction.netPriceWithRefundRub} ₽)

Сформируйте полный JSON ответ.`;

	return { system, user };
}

export async function callLlmJson(
	systemPrompt: string,
	userPrompt: string,
	providerInfo: (typeof AI_MODEL_CASCADE)[0],
	apiKey: string,
): Promise<any> {
	const requestBody = {
		model: providerInfo.model,
		temperature: 0.2,
		response_format: { type: "json_object" },
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
	};

	const response = await fetchWithProviderTimeout(
		`${providerInfo.baseUrl}/chat/completions`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
		numberFromEnv("DENTAL_SPEECH_POLISH_TIMEOUT_MS", 45_000),
	);

	const data = (await response.json().catch(() => ({}))) as any;
	if (!response.ok) {
		throw providerHttpError(
			response.status,
			response.statusText,
			data?.error?.message,
		);
	}

	const content = data?.choices?.[0]?.message?.content;
	if (typeof content !== "string") {
		throw new Error("ИИ вернул пустой или некорректный ответ.");
	}

	try {
		return JSON.parse(content.trim());
	} catch {
		const match = content.match(/\{[\s\S]*\}/);
		if (match?.[0]) return JSON.parse(match[0]);
		throw new Error("Ответ модели не содержит валидного JSON.");
	}
}
