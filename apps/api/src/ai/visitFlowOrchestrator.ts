import {
	type VisitFlowRequest,
	type VisitFlowResult,
	type VisitNoteDraft,
	type TreatmentPlanPayload,
	type PostVisitRecommendationsPayload,
} from "@dental/shared";
import { buildVisitDraftFromTranscript } from "./visitDraft.js";
import { personalizeTreatmentPlan } from "./treatmentPlanPersonalize.js";
import { personalizePostVisitRecommendations } from "./postVisitPersonalize.js";

function extractPlanPayload(
	draft: VisitNoteDraft,
	request: VisitFlowRequest,
): TreatmentPlanPayload | null {
	if (request.planPayload) return request.planPayload;

	// In the absence of an explicit payload, we check if the draft produced a plan or services
	const hasServices = request.completedServices && request.completedServices.length > 0;
	const hasPlanText = draft.treatmentPlan && draft.treatmentPlan.trim().length > 0;

	if (!hasPlanText && !hasServices) return null;

	// Build a minimal TreatmentPlanPayload based on available data
	const plannedStages: any[] = [];
	if (request.completedServices) {
		for (const service of request.completedServices) {
			plannedStages.push({
				stageName: service.title,
				plannedServices: service.title,
				plannedTiming: "Сегодня",
				estimatedAmountRub: service.priceRub,
				clinicalNotes: "Выполнено",
			});
		}
	}
	
	if (plannedStages.length === 0 && hasPlanText) {
		plannedStages.push({
			stageName: "План лечения",
			plannedServices: draft.treatmentPlan || "См. описание",
			plannedTiming: "В ближайшее время",
			estimatedAmountRub: 0,
			clinicalNotes: null,
		});
	}

	return {
		clinicalReason: draft.complaint || "Не указано",
		diagnosisSummary: draft.diagnosis || "Не указано",
		teethOrArea: "Не указано",
		clinicalToothRows: [],
		treatmentGoals: [],
		plannedStages,
		estimatedTotalRub: plannedStages.reduce((sum, stage) => sum + (stage.estimatedAmountRub || 0), 0),
		alternatives: [],
		risksAndLimitations: [],
		prognosisAndLimits: null,
		controlPlan: null,
		doctorFullName: request.doctorFullName || null, // No fallback to "Лечащий врач"
		plannedAt: new Date().toISOString(),
		patientQuestionsAnswered: true,
		planRequiresSeparateConsent: true,
		planRequiresNewApprovalOnChange: true,
	};
}

function extractRecommendationsPayload(
	draft: VisitNoteDraft,
	request: VisitFlowRequest,
): PostVisitRecommendationsPayload | null {
	if (request.recommendationsPayload) return request.recommendationsPayload;

	// Check if there are completed services to recommend for
	const hasServices = request.completedServices && request.completedServices.length > 0;
	const hasPlanText = draft.treatmentPlan && draft.treatmentPlan.trim().length > 0;
	if (!hasServices && !hasPlanText) return null;

	let careTopic: any = "other";
	let procedureName = "Прием стоматолога";

	if (hasServices && request.completedServices) {
		const titles = request.completedServices.map((s) => s.title.toLowerCase());
		if (titles.some((t) => t.includes("гигиен") || t.includes("чистк"))) {
			careTopic = "hygiene";
			procedureName = "Профессиональная гигиена";
		} else if (titles.some((t) => t.includes("удал"))) {
			careTopic = "extraction";
			procedureName = "Удаление зуба";
		} else if (titles.some((t) => t.includes("пломб") || t.includes("кариес"))) {
			careTopic = "filling_restoration";
			procedureName = "Лечение кариеса";
		}
	} else if (draft.diagnosis) {
		const diag = draft.diagnosis.toLowerCase();
		if (diag.includes("пульпит") || diag.includes("периодонтит")) {
			careTopic = "endo";
			procedureName = "Лечение каналов";
		}
	}

	return {
		careTopic,
		procedureName,
		toothOrArea: "Полость рта",
		performedAt: new Date().toISOString(),
		doctorFullName: request.doctorFullName || "Врач клиники",
		allowedAfter: ["Через 2 часа после окончания действия анестезии"],
		temporaryRestrictions: ["Ограничить физические нагрузки", "Не греть область вмешательства"],
		medicationAndRinsePlan: ["По назначению врача"],
		hygieneInstructions: ["Бережная чистка зубов мягкой щеткой"],
		nutritionInstructions: ["Исключить горячую, острую, грубую пищу"],
		urgentWarningSigns: ["Кровотечение более 20 минут", "Температура выше 38 градусов", "Сильный нарастающий отек"],
		plannedFollowUpAt: null,
		clinicContactInstruction: "При возникновении симптомов свяжитесь с клиникой",
		telegramSummary: "Рекомендации после приема.",
		patientReceivedPrintedCopy: true,
		patientUnderstandsUrgentSigns: true,
		safeForTelegramSending: true,
	};
}

export async function runVisitFlow(
	request: VisitFlowRequest,
): Promise<VisitFlowResult> {
	const result: VisitFlowResult = {
		draft: { status: "pending", message: null, data: null },
		plan: { status: "pending", message: null, data: null },
		recommendations: { status: "pending", message: null, data: null },
		documents: { status: "pending", message: null, data: null },
		overallStatus: "success",
	};

	// Step 1: Draft
	let draftData: VisitNoteDraft | null = null;
	try {
		result.draft.status = "running";
		draftData = await buildVisitDraftFromTranscript(request.transcript, request.specialty);
		
		result.draft.data = draftData;
		result.draft.status = "success";
	} catch (error) {
		result.draft.status = "error";
		result.draft.message = error instanceof Error ? error.message : "Ошибка генерации черновика";
		result.overallStatus = "error";
		return result; // Cannot proceed without draft
	}

	// Wait before steps 2 and 3 so they run concurrently
	const planPromise = (async () => {
		if (request.orchestratorConfig?.enablePlan === false) {
			result.plan.status = "skipped";
			result.plan.message = "Отключено в настройках клиники";
			return;
		}
		try {
			result.plan.status = "running";
			const payload = extractPlanPayload(draftData, request);
			if (!payload) {
				result.plan.status = "skipped";
				result.plan.message = "Нет данных для плана лечения";
				return;
			}
			const personalized = await personalizeTreatmentPlan(payload);
			result.plan.data = {
				...payload,
				alternatives: personalized.alternatives ?? payload.alternatives,
				risksAndLimitations: personalized.risksAndLimitations ?? payload.risksAndLimitations,
				prognosisAndLimits: personalized.prognosisAndLimits ?? payload.prognosisAndLimits,
				controlPlan: personalized.controlPlan ?? payload.controlPlan,
				patientFriendlyExplanation: personalized.patientFriendlyExplanation,
				patientHygieneAdvice: personalized.patientHygieneAdvice,
			};
			result.plan.status = "success";
		} catch (error) {
			result.plan.status = "error";
			result.plan.message = error instanceof Error ? error.message : "Ошибка персонализации плана";
			result.overallStatus = "partial";
		}
	})();

	const recommendationsPromise = (async () => {
		if (request.orchestratorConfig?.enableRecommendations === false) {
			result.recommendations.status = "skipped";
			result.recommendations.message = "Отключено в настройках клиники";
			return;
		}
		try {
			result.recommendations.status = "running";
			const payload = extractRecommendationsPayload(draftData, request);
			if (!payload) {
				result.recommendations.status = "skipped";
				result.recommendations.message = "Нет оснований для рекомендаций";
				return;
			}
			const personalized = await personalizePostVisitRecommendations(payload);
			result.recommendations.data = {
				...payload,
				...personalized,
			};
			result.recommendations.status = "success";
		} catch (error) {
			result.recommendations.status = "error";
			result.recommendations.message = error instanceof Error ? error.message : "Ошибка формирования рекомендаций";
			result.overallStatus = "partial";
		}
	})();

	// Step 4: Documents (Deterministic)
	const documentsPromise = (async () => {
		if (request.orchestratorConfig?.enableDocuments === false) {
			result.documents.status = "skipped";
			result.documents.message = "Отключено в настройках клиники";
			return;
		}
		try {
			result.documents.status = "running";
			const suggestedDocs: string[] = [];
			if (request.completedServices && request.completedServices.length > 0) {
				const titles = request.completedServices.map(s => s.title.toLowerCase());
				if (titles.some(t => t.includes("удал"))) {
					suggestedDocs.push("procedure_specific_consent");
					suggestedDocs.push("post_visit_recommendations");
				} else if (titles.some(t => t.includes("имплант"))) {
					suggestedDocs.push("procedure_specific_consent");
					suggestedDocs.push("post_visit_recommendations");
				} else if (titles.some(t => t.includes("кариес") || t.includes("пломб"))) {
					suggestedDocs.push("informed_consent");
				} else {
					suggestedDocs.push("informed_consent");
				}
			}
			result.documents.data = { suggestions: suggestedDocs };
			result.documents.status = "success";
		} catch (error) {
			result.documents.status = "error";
			result.documents.message = error instanceof Error ? error.message : "Ошибка подбора документов";
			result.overallStatus = "partial";
		}
	})();

	await Promise.all([planPromise, recommendationsPromise, documentsPromise]);

	return result;
}
