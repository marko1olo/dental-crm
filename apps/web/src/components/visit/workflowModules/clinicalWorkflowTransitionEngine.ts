/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Workflow Transition & Estimate Engine
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	ClinicalVisitCompletionInput,
	ClinicalVisitCompletionResult,
	AbortOrRescheduleVisitInput,
	ClinicalWorkflowStep,
} from "./clinicalWorkflowTypes";
import { assembleClinicalVisitEstimate } from "./workflowEstimateAssembler";
import { clientLogger } from "../../../services/logging/clientLogger";

export {
	extractProceduresFromDiary,
	CLINICAL_STANDARD_PRICE_CATALOG,
} from "./clinicalDiaryProcedureExtractor";
export { buildChairsideSmartProtocol } from "./chairsideSmartProtocolBuilder";

/**
 * Выполнение завершения визита и сборка сметы/чека.
 */
export function completeClinicalVisitAndAssembleEstimate(
	input: ClinicalVisitCompletionInput,
): ClinicalVisitCompletionResult {
	return assembleClinicalVisitEstimate(input);
}

/**
 * Прерывание или перенос визита (Мандат 8e: без обязательных полей ЭМК).
 */
export function abortOrRescheduleVisit(
	input: AbortOrRescheduleVisitInput,
): ClinicalVisitCompletionResult {
	return assembleClinicalVisitEstimate({
		visitId: input.visitId,
		patientId: input.patientId,
		patientName: input.patientName,
		doctorName: input.doctorName,
		doctorSpecialty: input.doctorSpecialty,
		clinicName: input.clinicName,
		diary: input.diary || {},
		additionalServices: input.performedItems || [],
		completionMode: input.mode,
		interruptionReason: input.reason,
		rescheduledDateIso: input.rescheduledDateIso,
		form043uSaved: true,
		emkSaved: true,
		medicalCardSaved: true,
	});
}

/**
 * Выполняет чистый переход между этапами клинического приёма с автосохранением черновика.
 */
export async function executeWorkflowStepTransition(
	fromStep: ClinicalWorkflowStep,
	toStep: ClinicalWorkflowStep,
	context: {
		visitId?: string;
		patientId?: string;
		formData: Record<string, unknown>;
		onAutosave?: ((data: Record<string, unknown>) => Promise<void> | void) | undefined;
	},
): Promise<{ success: boolean; nextStep: ClinicalWorkflowStep }> {
	if (context.onAutosave) {
		try {
			await context.onAutosave(context.formData);
		} catch (err) {
			clientLogger.warn("Фоновое сохранение при переходе шага", err, { module: "clinicalWorkflowTransitionEngine" });
		}
	}
	return { success: true, nextStep: toStep };
}
