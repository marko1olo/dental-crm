/**
 * treatmentPlanSuite.ts — Main Clinical Validation & Chairside Commentary Suite
 */

import {
	type TreatmentPlanValidateAndCommentRequest,
	type TreatmentPlanValidateAndCommentResponse,
	treatmentPlanValidateAndCommentResponseSchema,
} from "@dental/shared";
import { selectProviderKey } from "../../speech/keyPool.js";
import { runDeterministicClinicalValidation } from "./clinicalValidator.js";
import { calculateDeterministicFinancialArgumentation } from "./financialArgumentation.js";
import {
	AI_MODEL_CASCADE,
	buildTreatmentPlanPrompt,
	callLlmJson,
} from "./neuralCommentaryCascade.js";

export async function validateAndCommentTreatmentPlan(
	request: TreatmentPlanValidateAndCommentRequest,
): Promise<TreatmentPlanValidateAndCommentResponse> {
	const validatedAtIso = new Date().toISOString();

	// 1. Run deterministic engines first (guaranteed 100% exact math & clinical foundation)
	const deterministicValidation = runDeterministicClinicalValidation(
		request.stages,
	);
	const deterministicFinance = calculateDeterministicFinancialArgumentation(
		request.stages,
		typeof request.installmentMonths === "number"
			? request.installmentMonths
			: 12,
	);

	// Default structured fallback object
	const defaultResult: TreatmentPlanValidateAndCommentResponse = {
		clinicalValidation: deterministicValidation,
		chairsideCommentary: {
			patientFriendlySummary:
				`План комплексного лечения состоит из ${request.stages.length} этапов общей стоимостью ${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽. ` +
				`Лечение направлено на устранение очагов инфекции, восстановление функции жевания и долгосрочное сохранение здоровья зубов.`,
			urgencyArgument:
				`**Математика здоровья DENTE:** Лечение выявленных проблем на ранней стадии позволяет сохранить собственные зубы и предотвратить их разрушение. ` +
				`Кариес устраняется за один визит (~6 000 ₽), тогда как при откладывании воспаление переходит в пульпит (~35 000 ₽ за каналы и коронку) или потерю зуба с необходимостью имплантации (~70 000+ ₽).`,
			hygieneAndCareAdvice:
				`Обязательна чистка зубов 2 раза в день выметающими движениями от десны к краю зуба. ` +
				`При наличии коронок и имплантатов обязателен ирригатор и межзубные ершики для очищения границы коронка-десна. Исключите красящие продукты в первые 48 часов после процедур.`,
			stageByStageExplanation: request.stages.map((s) => ({
				stageNumber: s.stageNumber,
				stageTitle: s.title,
				plainRussianDescription:
					s.clinicalGoal || s.items.map((it) => it.name).join(", "),
				patientBenefit: `Обеспечивает надежный результат этапа «${s.title}» в комфортные сроки (${s.estimatedWeeks || 2} нед.).`,
			})),
		},
		financialArgumentation: deterministicFinance,
		copilotSuggestions: {
			budgetOptimizationAdvice:
				request.targetBudgetRub &&
				deterministicFinance.totalRub > request.targetBudgetRub
					? `План (${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽) превышает целевой бюджет (${request.targetBudgetRub.toLocaleString("ru-RU")} ₽) на ${(deterministicFinance.totalRub - request.targetBudgetRub).toLocaleString("ru-RU")} ₽. Рекомендуется замена премиальных конструкций на проверенную металлокерамику или стандартные имплантаты Osstem с сохранением обязательной терапии.`
					: undefined,
			suggestedModifications: [
				{
					type: "anesthesia_isolation",
					title: "Аудит безопасности: анестезия и коффердам",
					description:
						"Добавление карпульной анестезии Артикаин и изоляции коффердам для 100% безболезненности и сухости поля.",
					estimatedDeltaRub: 1800,
				},
				{
					type: "ndfl_refund",
					title: "Оформление справки для налогового вычета 13%",
					description: `Возврат ${deterministicFinance.ndflDeduction.totalRefundRub.toLocaleString("ru-RU")} ₽ от государства по итогам года.`,
					estimatedDeltaRub:
						-deterministicFinance.ndflDeduction.totalRefundRub,
				},
				{
					type: "scenario_economy",
					title: "Сценарий «Эконом»: базовая санация",
					description:
						"Замена премиальных конструкций на проверенную металлокерамику и базовые имплантаты Osstem с сохранением 100% санации.",
					estimatedDeltaRub: -Math.round(deterministicFinance.totalRub * 0.3),
				},
				{
					type: "scenario_optimum",
					title: "Сценарий «Оптимум»: золотой стандарт",
					description:
						"Цельный диоксид циркония Katana STML CAD/CAM, эндодонтия под микроскопом, гидрофильные имплантаты SLA.",
					estimatedDeltaRub: 0,
				},
				{
					type: "scenario_premium",
					title: "Сценарий «Премиум»: VIP & цифровая навигация",
					description:
						"Виниры E.max Press с индивидуальным нанесением, абатменты из циркония, 3D шаблоны и микроскоп Leica.",
					estimatedDeltaRub: Math.round(deterministicFinance.totalRub * 0.5),
				},
			],
		},
		modelUsed: "deterministic_rule_engine",
		providerUsed: "local_rules",
		validatedAtIso,
	};

	// Check if neural polish is requested/enabled
	const isNeuralDisabled = process.env.DENTAL_AI_NEURAL_DRAFT === "false";
	if (isNeuralDisabled) {
		return defaultResult;
	}

	const { system, user } = buildTreatmentPlanPrompt(
		request,
		deterministicValidation,
		deterministicFinance,
	);

	// Try Cascade across LLM providers
	for (const cascadeItem of AI_MODEL_CASCADE) {
		try {
			let candidateApiKey: string | null = null;
			if (cascadeItem.provider === "groq" && process.env.GROQ_API_KEY) {
				candidateApiKey = process.env.GROQ_API_KEY;
			} else if (
				cascadeItem.provider === "gemini" &&
				(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
			) {
				candidateApiKey =
					process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
			}

			if (!candidateApiKey) {
				const keyCandidate = selectProviderKey(
					cascadeItem.keyProviderId,
					new Set(),
				);
				if (keyCandidate) {
					candidateApiKey = keyCandidate.value;
				}
			}

			if (!candidateApiKey) continue;

			const parsedJson = await callLlmJson(
				system,
				user,
				cascadeItem,
				candidateApiKey,
			);
			if (parsedJson && typeof parsedJson === "object") {
				// Safely merge neural enrichment into deterministic math
				const responseObj: TreatmentPlanValidateAndCommentResponse = {
					clinicalValidation: {
						...deterministicValidation,
						criticalWarnings:
							Array.isArray(parsedJson.clinicalValidation?.criticalWarnings) &&
							parsedJson.clinicalValidation.criticalWarnings.length > 0
								? parsedJson.clinicalValidation.criticalWarnings
								: deterministicValidation.criticalWarnings,
						clinicalRecommendations:
							Array.isArray(
								parsedJson.clinicalValidation?.clinicalRecommendations,
							) &&
							parsedJson.clinicalValidation.clinicalRecommendations.length > 0
								? parsedJson.clinicalValidation.clinicalRecommendations
								: deterministicValidation.clinicalRecommendations,
					},
					chairsideCommentary: {
						patientFriendlySummary: String(
							parsedJson.chairsideCommentary?.patientFriendlySummary ||
								defaultResult.chairsideCommentary.patientFriendlySummary,
						).trim(),
						urgencyArgument: String(
							parsedJson.chairsideCommentary?.urgencyArgument ||
								defaultResult.chairsideCommentary.urgencyArgument,
						).trim(),
						hygieneAndCareAdvice: String(
							parsedJson.chairsideCommentary?.hygieneAndCareAdvice ||
								defaultResult.chairsideCommentary.hygieneAndCareAdvice,
						).trim(),
						stageByStageExplanation:
							Array.isArray(
								parsedJson.chairsideCommentary?.stageByStageExplanation,
							) &&
							parsedJson.chairsideCommentary.stageByStageExplanation.length > 0
								? parsedJson.chairsideCommentary.stageByStageExplanation
								: defaultResult.chairsideCommentary.stageByStageExplanation,
					},
					financialArgumentation: deterministicFinance, // Guaranteed exact kopecks & rubles
					copilotSuggestions: {
						budgetOptimizationAdvice:
							parsedJson.copilotSuggestions?.budgetOptimizationAdvice ||
							defaultResult.copilotSuggestions.budgetOptimizationAdvice,
						suggestedModifications:
							Array.isArray(
								parsedJson.copilotSuggestions?.suggestedModifications,
							) && parsedJson.copilotSuggestions.suggestedModifications.length > 0
								? parsedJson.copilotSuggestions.suggestedModifications
								: defaultResult.copilotSuggestions.suggestedModifications,
					},
					modelUsed: cascadeItem.model,
					providerUsed: cascadeItem.provider,
					validatedAtIso,
				};

				return treatmentPlanValidateAndCommentResponseSchema.parse(responseObj);
			}
		} catch (llmError) {
			console.warn(
				`[TreatmentPlan AI Validator Cascade ${cascadeItem.provider}/${cascadeItem.model} Error]: ${llmError instanceof Error ? llmError.message : llmError}`,
			);
		}
	}

	return treatmentPlanValidateAndCommentResponseSchema.parse(defaultResult);
}
