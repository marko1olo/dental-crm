/**
 * treatmentPlanSuite.ts — Main Clinical Validation & Chairside Commentary Suite
 */

import {
	classifyProcedure4StageCategory,
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
import { createApiLogger, safeLogError } from "../../observability/logger.js";

const logger = createApiLogger("aiTreatmentPlanSuite");

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

	// Dynamic, context-aware 3-tier scenario descriptions based on actual plan items
	const allItems = request.stages.flatMap((s) => s.items);
	let hasOrthoProsthetics = false;
	let hasSurgeryImplant = false;
	let hasEndoTherapy = false;
	let hasHygieneSanitation = false;

	for (const item of allItems) {
		const category = classifyProcedure4StageCategory(
			item.code804n,
			item.name,
			item.category,
		);
		if (category === "ortho_prosthetics") hasOrthoProsthetics = true;
		else if (category === "surgery_implant") hasSurgeryImplant = true;
		else if (category === "hygiene_sanitation") hasHygieneSanitation = true;
		else hasEndoTherapy = true;
	}

	let economyTitle = "Сценарий «Эконом»: базовая санация";
	let economyDescription =
		"Качественные светоотверждаемые композитные пломбы и стандартный протокол эндодонтического лечения.";
	let optimumTitle = "Сценарий «Оптимум»: золотой стандарт";
	let optimumDescription =
		"Высокоточная анатомическая реставрация наногибридным композитом и машинная обработка каналов.";
	let premiumTitle = "Сценарий «Премиум»: художественная микрореставрация";
	let premiumDescription =
		"Послойная эстетическая реставрация под дентальным микроскопом с зеркальной полировкой.";

	if (hasOrthoProsthetics && hasSurgeryImplant) {
		economyTitle = "Сценарий «Эконом»: базовая санация и протезирование";
		economyDescription =
			"Проверенная металлокерамика и классические дентальные имплантаты с сохранением 100% санации.";
		optimumTitle = "Сценарий «Оптимум»: золотой стандарт";
		optimumDescription =
			"Цельный диоксид циркония Katana STML CAD/CAM, эндодонтия под увеличением и гидрофильные имплантаты SLA.";
		premiumTitle = "Сценарий «Премиум»: VIP & цифровая навигация";
		premiumDescription =
			"Безметалловые реставрации E.max / Prettau, индивидуальные циркониевые абатменты и 3D навигационные шаблоны.";
	} else if (hasOrthoProsthetics) {
		economyTitle = "Сценарий «Эконом»: функциональное протезирование";
		economyDescription =
			"Металлокерамические коронки с точным краевым прилеганием и базовая подготовка зубов.";
		optimumTitle = "Сценарий «Оптимум»: безметалловое протезирование";
		optimumDescription =
			"Цельноциркониевые коронки Katana STML CAD/CAM с анатомической передачей формы и цвета.";
		premiumTitle = "Сценарий «Премиум»: высокоэстетичное протезирование";
		premiumDescription =
			"Премиальные коронки и виниры E.max Press с индивидуальной эстетической стратификацией.";
	} else if (hasSurgeryImplant) {
		economyTitle = "Сценарий «Эконом»: базовая хирургическая санация";
		economyDescription =
			"Атравматичное удаление несохранных зубов и проверенная классическая дентальная имплантация.";
		optimumTitle = "Сценарий «Оптимум»: современная имплантация";
		optimumDescription =
			"Малоинвазивная имплантация с гидрофильной биоактивной поверхностью SLA и костная пластика.";
		premiumTitle = "Сценарий «Премиум»: навигационная 3D хирургия";
		premiumDescription =
			"Цифровое планирование, 3D хирургический шаблон и ускоренная остеоинтеграция.";
	} else if (!hasEndoTherapy && hasHygieneSanitation) {
		economyTitle = "Сценарий «Эконом»: базовый гигиенический комплекс";
		economyDescription =
			"Ультразвуковое снятие наддесневых зубных отложений и полировка защитной пастой.";
		optimumTitle = "Сценарий «Оптимум»: комплексная профессиональная гигиена";
		optimumDescription =
			"Ультразвуковой скейлинг + бережный AirFlow с мягким порошком глицина и реминерализация.";
		premiumTitle = "Сценарий «Премиум»: швейцарский протокол GBT";
		premiumDescription =
			"Премиальный протокол Guided Biofilm Therapy (AirFlow Prophylaxis Master) с глубоким фторированием.";
	}

	let budgetOptimizationAdvice: string | undefined;
	if (
		request.targetBudgetRub &&
		deterministicFinance.totalRub > request.targetBudgetRub
	) {
		const diffRub = deterministicFinance.totalRub - request.targetBudgetRub;
		if (hasOrthoProsthetics || hasSurgeryImplant) {
			budgetOptimizationAdvice = `План (${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽) превышает целевой бюджет (${request.targetBudgetRub.toLocaleString("ru-RU")} ₽) на ${diffRub.toLocaleString("ru-RU")} ₽. Рекомендуется замена премиальных конструкций на проверенную металлокерамику или базовые имплантационные системы с сохранением обязательной терапии.`;
		} else if (hasEndoTherapy) {
			budgetOptimizationAdvice = `План (${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽) превышает целевой бюджет (${request.targetBudgetRub.toLocaleString("ru-RU")} ₽) на ${diffRub.toLocaleString("ru-RU")} ₽. Рекомендуется поэтапное лечение: устранить активные кариозные очаги в первую очередь, а эстетическую полировку и реставрации выполнить вторым этапом.`;
		} else {
			budgetOptimizationAdvice = `План (${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽) превышает целевой бюджет (${request.targetBudgetRub.toLocaleString("ru-RU")} ₽) на ${diffRub.toLocaleString("ru-RU")} ₽. Рекомендуется оптимизация объема процедур с сохранением ключевого клинического протокола.`;
		}
	}

	// Calculate deterministic tier deltas directly from catalog nomenclature differences
	let economyTierDeltaRub = 0;
	let premiumTierDeltaRub = 0;

	for (const item of allItems) {
		const qty = Math.max(1, item.quantity || 1);
		const category = classifyProcedure4StageCategory(
			item.code804n,
			item.name,
			item.category,
		);
		switch (category) {
			case "ortho_prosthetics":
				// Металлокерамика (-12 000 руб) vs Цирконий (База) vs E.max (+12 000 руб)
				economyTierDeltaRub -= 12000 * qty;
				premiumTierDeltaRub += 12000 * qty;
				break;
			case "surgery_implant":
				// Базовая система (-10 000 руб) vs SLA (База) vs 3D навигация (+26 000 руб)
				economyTierDeltaRub -= 10000 * qty;
				premiumTierDeltaRub += 26000 * qty;
				break;
			case "hygiene_sanitation":
				// УЗ гигиена (-2 000 руб) vs AirFlow (База) vs GBT протокол (+3 000 руб)
				economyTierDeltaRub -= 2000 * qty;
				premiumTierDeltaRub += 3000 * qty;
				break;
			default:
				// Стандартный композит (-1 300 руб) vs нанокомпозит (База) vs микрореставрация (+2 500 руб)
				economyTierDeltaRub -= 1300 * qty;
				premiumTierDeltaRub += 2500 * qty;
				break;
		}
	}

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
			budgetOptimizationAdvice,
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
					title: economyTitle,
					description: economyDescription,
					estimatedDeltaRub: economyTierDeltaRub,
				},
				{
					type: "scenario_optimum",
					title: optimumTitle,
					description: optimumDescription,
					estimatedDeltaRub: 0,
				},
				{
					type: "scenario_premium",
					title: premiumTitle,
					description: premiumDescription,
					estimatedDeltaRub: premiumTierDeltaRub,
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
			logger.warn(
				{ err: safeLogError(llmError), provider: cascadeItem.provider, model: cascadeItem.model },
				"TreatmentPlan AI Validator Cascade Error",
			);
		}
	}

	return treatmentPlanValidateAndCommentResponseSchema.parse(defaultResult);
}
