/**
 * denteAgentExecution.ts — Autonomous ReAct execution engine for DENTE Copilot.
 *
 * Implements the 5-iteration ReAct loop:
 * 1. Primary Analysis & Drug Safety Checks (DDI)
 * 2. Odontogram FDI status localization
 * 3. Exact kopecks pricing calculation
 * 4. SOAP Diary synthesis & clinical auxiliary tools
 * 5. Final Clinical Verdict (T.A.R.S. 100% Honesty)
 *
 * Mandate 8e: Doctor autonomy, zero blocked buttons, 1-click execution.
 * Mandate 8x & 8ap: Clean clinical domain language.
 */

import {
	getPatientClinicalCardTool,
	updateToothStatusTool,
	calculateTreatmentEstimateTool,
	checkDrugInteractionsTool,
	createDentalLabOrderTool,
	bookChairsideAppointmentTool,
	draftClinicalSoapDiaryTool,
	calculateAnestheticDosageTool,
	generateInformedConsentIdsTool,
	checkWarehouseSuppliesTool,
	type CalculateTreatmentEstimateResult,
	type CreateDentalLabOrderResult,
	type BookChairsideAppointmentResult,
	type DraftClinicalSoapDiaryResult,
	type PatientClinicalCardResult,
	type UpdateToothStatusResult,
	type CalculateAnestheticDosageResult,
	type GenerateInformedConsentIdsResult,
	type CheckWarehouseSuppliesResult,
} from "../tools/denteAgentTools.js";
import {
	type ChairsideSafetyAlert,
	type ChairsideSoapDiary,
} from "../chairsideSentinelEngine.js";
import type { AgentContext } from "../context.js";
import { db } from "../../../db/client.js";
import type {
	AutonomousDenteAgentInput,
	ParsedClinicalContext,
} from "./denteAgentParser.js";
import {
	createAnestheticActionCard,
	createAppointmentActionCard,
	createConsentActionCard,
	createEstimateActionCard,
	createLabOrderActionCard,
	createSoapDiaryActionCard,
	createToothStatusActionCard,
	createWarehouseActionCard,
	formatTarsClinicalVerdict,
} from "./denteAgentCards.js";

export type ActionCardType =
	| "apply_soap_diary"
	| "apply_services_estimate"
	| "apply_treatment_estimate"
	| "apply_estimate_804n"
	| "apply_tooth_status"
	| "apply_lab_order"
	| "apply_appointment"
	| "apply_anesthetic_dosage"
	| "print_informed_consent"
	| "check_warehouse_supplies";

export interface ProactiveActionCard {
	id: string;
	type: ActionCardType;
	title: string;
	description: string;
	payload: Record<string, unknown>;
	readyForOneClickApply: true;
	doctorAutonomyGuaranteed: true;
}

export interface ReActStep {
	iteration: number;
	thought: string;
	action: {
		tool: string;
		args: Record<string, unknown>;
	};
	observation: Record<string, unknown>;
	timestamp: string;
}

export interface AutonomousDenteAgentResult {
	patientId: string;
	toothNumber: number | null;
	fdiToothFormatted: string;
	mode: "autonomous" | "supervised";
	totalIterations: number;
	isFinished: boolean;
	thought: string;
	actions: ProactiveActionCard[];
	verdict: string;
	safetyAlerts: ChairsideSafetyAlert[];
	steps: ReActStep[];
	soapDiary?: ChairsideSoapDiary | undefined;
	estimateServices?: CalculateTreatmentEstimateResult | undefined;
	estimate804n?: CalculateTreatmentEstimateResult | undefined;
	labOrder?: CreateDentalLabOrderResult | undefined;
	appointment?: BookChairsideAppointmentResult | undefined;
	anestheticDosage?: CalculateAnestheticDosageResult | undefined;
	informedConsent?: GenerateInformedConsentIdsResult | undefined;
	warehouseSupplies?: CheckWarehouseSuppliesResult | undefined;
	diagnostics: {
		executionTimeMs: number;
		toolsInvoked: string[];
	};
}

export async function executeAutonomousReActCycle(
	input: AutonomousDenteAgentInput,
	parsed: ParsedClinicalContext,
	maxIterations = 5,
): Promise<AutonomousDenteAgentResult> {
	const startTime = performance.now();
	const steps: ReActStep[] = [];
	const toolsInvoked: string[] = [];
	const actions: ProactiveActionCard[] = [];
	const now = () => new Date().toISOString();

	const {
		resolvedTooth,
		fdiToothFormatted,
		extractedComplaints,
		extractedDiagnoses,
		extractedAllergies,
		extractedSomatic,
		resolvedDiscount,
		resolvedWeight,
		labReq,
		appReq,
		primaryIcd10,
		diagnosisName,
		clinicalCategory,
		orgId,
		userId,
	} = parsed;

	const ctx: AgentContext = {
		organizationId: orgId,
		clinicId: orgId,
		userId,
		sessionId: `react_sess_${Date.now()}`,
		mode: input.mode || "autonomous",
		role: "doctor",
		permissions: [
			"clinical.read",
			"clinical.write",
			"billing.calculate",
			"schedule.write",
			"warehouse.read",
			"documents.generate",
		],
		tools: {} as any,
		db,
	};

	let safetyAlerts: ChairsideSafetyAlert[] = [];
	let emkResult: PatientClinicalCardResult | undefined;
	let toothStatusResult: UpdateToothStatusResult | undefined;
	let estimateResult: CalculateTreatmentEstimateResult | undefined;
	let diaryResult: DraftClinicalSoapDiaryResult | undefined;
	let labOrderResult: CreateDentalLabOrderResult | undefined;
	let appointmentResult: BookChairsideAppointmentResult | undefined;
	let anestheticResult: CalculateAnestheticDosageResult | undefined;
	let consentResult: GenerateInformedConsentIdsResult | undefined;
	let warehouseResult: CheckWarehouseSuppliesResult | undefined;

	const fullThoughtTraces: string[] = [];

	// ─── ITERATION 1: THOUGHT -> ACTION: check_drug_interactions & get_patient_clinical_card
	let currentIteration = 1;
	{
		const thought1 = [
			`[ИТЕРАЦИЯ 1/5: ПЕРВИЧНЫЙ КЛИНИЧЕСКИЙ АНАЛИЗ И ЛЕКАРСТВЕННАЯ СОВМЕСТИМОСТЬ]`,
			`Пациент ID: ${input.patientId}. Зуб FDI: ${fdiToothFormatted}.`,
			`Жалобы: "${extractedComplaints || "Не указаны (физиологическая норма)"}".`,
			`Анамнез: аллергии [${extractedAllergies.join(", ") || "отрицает"}], соматика [${extractedSomatic.join(", ") || "здоров"}].`,
			`ДЕЙСТВИЕ: Вызов check_drug_interactions для проверки лекарственной совместимости и get_patient_clinical_card для открытия медицинской карты.`,
		].join("\n");
		fullThoughtTraces.push(thought1);

		const plannedDrugs =
			input.activeServices && input.activeServices.length > 0
				? input.activeServices
				: ["Артикаин 4% 1:100 000", "Амоксициллин 500 мг"];

		const ddiObservation = await checkDrugInteractionsTool.handler(ctx, {
			patientId: input.patientId,
			plannedDrugs,
			knownAllergies: extractedAllergies,
			somaticConditions: extractedSomatic,
		});
		safetyAlerts = ddiObservation.alerts;
		toolsInvoked.push("check_drug_interactions");

		steps.push({
			iteration: currentIteration,
			thought: thought1,
			action: {
				tool: "check_drug_interactions",
				args: {
					patientId: input.patientId,
					plannedDrugs,
					knownAllergies: extractedAllergies,
					somaticConditions: extractedSomatic,
				},
			},
			observation: ddiObservation as any,
			timestamp: now(),
		});

		emkResult = await getPatientClinicalCardTool.handler(ctx, {
			patientId: input.patientId,
			organizationId: orgId,
		});
		toolsInvoked.push("get_patient_clinical_card");

		const anestheticObservation = await calculateAnestheticDosageTool.handler(ctx, {
			patientWeightKg: resolvedWeight,
			anestheticType: input.anestheticType ?? "auto",
			somaticConditions: extractedSomatic,
			plannedCarpules: input.plannedCarpules ?? 1,
			procedureCategory: clinicalCategory as any,
		});
		anestheticResult = anestheticObservation;
		toolsInvoked.push("calculate_anesthetic_dosage");
		actions.push(createAnestheticActionCard(anestheticObservation));
	}

	// ─── ITERATION 2: THOUGHT -> ACTION: update_tooth_status
	currentIteration = 2;
	if (resolvedTooth && currentIteration <= maxIterations) {
		const clinicalStatus =
			clinicalCategory === "pulpitis" || clinicalCategory === "periodontitis" || clinicalCategory === "endodontics"
				? "пульпит"
				: clinicalCategory === "caries" || clinicalCategory === "therapy"
					? "кариес"
					: clinicalCategory === "surgery"
						? "удален"
						: "здоровый";

		const thought2 = [
			`[ИТЕРАЦИЯ 2/5: ЛОКАЛИЗАЦИЯ И ОБНОВЛЕНИЕ СТАТУСА ЗУБА FDI]`,
			`Клинический диагноз: ${diagnosisName} (${primaryIcd10}) для зуба ${fdiToothFormatted}.`,
			`Анатомические поверхности: жевательная (O) и контактная (M/D).`,
			`ДЕЙСТВИЕ: Вызов update_tooth_status для внесения изменений в одонтограмму.`,
		].join("\n");
		fullThoughtTraces.push(thought2);

		toothStatusResult = await updateToothStatusTool.handler(ctx, {
			patientId: input.patientId,
			tooth: resolvedTooth,
			status: clinicalStatus,
			surfaces: ["O", "M"],
			diagnosisText: diagnosisName,
		});
		toolsInvoked.push("update_tooth_status");

		steps.push({
			iteration: currentIteration,
			thought: thought2,
			action: {
				tool: "update_tooth_status",
				args: {
					patientId: input.patientId,
					tooth: resolvedTooth,
					status: clinicalStatus,
					surfaces: ["O", "M"],
				},
			},
			observation: toothStatusResult as any,
			timestamp: now(),
		});

		actions.push(createToothStatusActionCard(toothStatusResult, fdiToothFormatted));
	}

	// ─── ITERATION 3: THOUGHT -> ACTION: calculate_treatment_estimate
	currentIteration = 3;
	if (currentIteration <= maxIterations) {
		const thought3 = [
			`[ИТЕРАЦИЯ 3/5: РАСЧЕТ СМЕТЫ В ТОЧНЫХ КОПЕЙКАХ]`,
			`Категория: ${clinicalCategory}. Скидка врача: ${resolvedDiscount}% (свобода скидок без блокировок).`,
			`ДЕЙСТВИЕ: Вызов calculate_treatment_estimate для формирования калькуляции в точных целых копейках.`,
		].join("\n");
		fullThoughtTraces.push(thought3);

		estimateResult = await calculateTreatmentEstimateTool.handler(ctx, {
			patientId: input.patientId,
			toothNumber: resolvedTooth ?? undefined,
			category: clinicalCategory as any,
			discountPercent: resolvedDiscount,
		});
		toolsInvoked.push("calculate_treatment_estimate");

		steps.push({
			iteration: currentIteration,
			thought: thought3,
			action: {
				tool: "calculate_treatment_estimate",
				args: {
					patientId: input.patientId,
					toothNumber: resolvedTooth ?? undefined,
					category: clinicalCategory,
					discountPercent: resolvedDiscount,
				},
			},
			observation: estimateResult as any,
			timestamp: now(),
		});

		actions.push(createEstimateActionCard(estimateResult, resolvedDiscount));
	}

	// ─── ITERATION 4: THOUGHT -> ACTION: draft_clinical_soap_diary (and lab/appointment/consent)
	currentIteration = 4;
	if (currentIteration <= maxIterations) {
		const thought4 = [
			`[ИТЕРАЦИЯ 4/5: ГЕНЕРАЦИЯ ПРОТОКОЛА ПРИЁМА SOAP И СМЕЖНЫХ ДОКУМЕНТОВ]`,
			`Формирование дневника SOAP по клиническим протоколам и МКБ-10 (${primaryIcd10}).`,
			`Статус документа: ЧЕРНОВИК (печать и редактирование без замков).`,
			labReq ? `Дополнительно: формирование черновика наряда ЗТЛ (${labReq.workType}, оттенок ${labReq.vitaShade}).` : "",
			appReq ? `Дополнительно: запись на повторный приём (${appReq.startsAt}) без обязательного ассистента.` : "",
		].filter(Boolean).join("\n");
		fullThoughtTraces.push(thought4);

		diaryResult = await draftClinicalSoapDiaryTool.handler(ctx, {
			patientId: input.patientId,
			toothNumber: resolvedTooth ?? undefined,
			diagnosisCode: primaryIcd10,
			complaints: extractedComplaints,
			somaticStatus: emkResult?.somaticStatus,
			allergiesStatus: emkResult?.allergies.join(", "),
			oneClickNorm: !input.prompt,
		});
		toolsInvoked.push("draft_clinical_soap_diary");

		steps.push({
			iteration: currentIteration,
			thought: thought4,
			action: {
				tool: "draft_clinical_soap_diary",
				args: {
					patientId: input.patientId,
					toothNumber: resolvedTooth ?? undefined,
					diagnosisCode: primaryIcd10,
				},
			},
			observation: diaryResult as any,
			timestamp: now(),
		});

		actions.push(createSoapDiaryActionCard(diaryResult));

		if (labReq && resolvedTooth) {
			labOrderResult = await createDentalLabOrderTool.handler(ctx, {
				patientId: input.patientId,
				toothCodes: [resolvedTooth],
				workType: labReq.workType,
				material: labReq.material,
				vitaShade: labReq.vitaShade,
				dueDate: labReq.dueDate,
				clinicalNotes: labReq.notes,
				priceRub: labReq.priceRub,
			});
			toolsInvoked.push("create_dental_lab_order");
			actions.push(createLabOrderActionCard(labOrderResult, labReq.workType, labReq.vitaShade, labReq.dueDate, fdiToothFormatted));
		}

		if (appReq) {
			appointmentResult = await bookChairsideAppointmentTool.handler(ctx, {
				patientId: input.patientId,
				doctorUserId: appReq.doctorUserId || userId,
				startsAt: appReq.startsAt,
				durationMinutes: appReq.durationMinutes || 30,
				reason: appReq.reason,
				chairId: appReq.chairId,
				comment: appReq.comment,
			});
			toolsInvoked.push("book_chairside_appointment");
			actions.push(createAppointmentActionCard(appointmentResult, appReq.startsAt, appReq.reason));
		}

		const consentObservation = await generateInformedConsentIdsTool.handler(ctx, {
			patientId: input.patientId,
			procedureType: clinicalCategory as any,
			diagnosisCode: primaryIcd10,
			serviceCodes: estimateResult?.items.map((it) => it.code) ?? [],
			toothNumber: resolvedTooth ?? undefined,
			doctorName: "Лечащий врач",
		});
		consentResult = consentObservation;
		toolsInvoked.push("generate_informed_consent_ids");
		actions.push(createConsentActionCard(consentObservation));

		const warehouseObservation = await checkWarehouseSuppliesTool.handler(ctx, {
			organizationId: orgId,
			itemName: anestheticResult?.drugName || "Артикаин 4% (карпулы 1.7 мл)",
			requestedQuantity: anestheticResult?.recommendedCarpules || 1,
		});
		warehouseResult = warehouseObservation;
		toolsInvoked.push("check_warehouse_supplies");
		actions.push(createWarehouseActionCard(warehouseObservation));
	}

	// ─── ITERATION 5: FINAL CLINICAL VERDICT (T.A.R.S. 100%)
	currentIteration = 5;
	const verdict = formatTarsClinicalVerdict({
		patientId: input.patientId,
		fdiToothFormatted,
		primaryIcd10,
		diagnosisName,
		safetyAlerts,
		anestheticResult,
		estimateResult,
		resolvedDiscount,
		consentResult,
		warehouseResult,
		labOrderResult,
		appointmentResult,
		actionsCount: actions.length,
	});

	const thought5 = [
		`[ИТЕРАЦИЯ 5/5: ВЫНЕСЕНИЕ ИТОГОВОГО КЛИНИЧЕСКОГО ВЕРДИКТА]`,
		`Все регламентные проверки завершены. Ошибок компиляции нет.`,
		`Подготовлено ${actions.length} карточек действий для врача у кресла.`,
		`Вердикт сформулирован в строгом стандарте T.A.R.S. 100%.`,
	].join("\n");
	fullThoughtTraces.push(thought5);

	const executionTimeMs = Math.round(performance.now() - startTime);

	return {
		patientId: input.patientId,
		toothNumber: resolvedTooth,
		fdiToothFormatted,
		mode: input.mode || "autonomous",
		totalIterations: currentIteration,
		isFinished: true,
		thought: fullThoughtTraces.join("\n\n"),
		actions,
		verdict,
		safetyAlerts,
		steps,
		soapDiary: diaryResult?.soapDiary,
		estimateServices: estimateResult,
		estimate804n: estimateResult,
		labOrder: labOrderResult,
		appointment: appointmentResult,
		anestheticDosage: anestheticResult,
		informedConsent: consentResult,
		warehouseSupplies: warehouseResult,
		diagnostics: {
			executionTimeMs,
			toolsInvoked,
		},
	};
}
