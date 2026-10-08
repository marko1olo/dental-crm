import type { CreateDocumentInput } from "@dental/shared";
import { documentKindMetadata } from "@dental/shared";
import type { DocumentCreationFacts, DocumentCreationGuardResult } from "./types.js";

/**
 * Гард проверки существования пациента и визита, а также их взаимной привязки.
 */
export function checkPatientAndVisitAccess(
	input: CreateDocumentInput,
	facts: DocumentCreationFacts,
): DocumentCreationGuardResult | null {
	if (!facts.patient) {
		return { ok: false, statusCode: 404, error: "Пациент не найден" };
	}

	if (input.visitId && !facts.visit) {
		return { ok: false, statusCode: 404, error: "Визит не найден" };
	}

	if (facts.visit && facts.visit.patientId !== input.patientId) {
		return {
			ok: false,
			statusCode: 409,
			error: "Визит не принадлежит выбранному пациенту",
		};
	}

	const metadata = documentKindMetadata[input.kind];
	if (metadata.requiresVisit && !input.visitId) {
		return {
			ok: false,
			statusCode: 409,
			error: "Документ должен быть связан с конкретным визитом.",
		};
	}
	if (
		metadata.requiresPaidRecord &&
		metadata.group !== "tax" &&
		!input.visitId
	) {
		return {
			ok: false,
			statusCode: 409,
			error: "Платежному документу нужен явный визит или платежный контекст.",
		};
	}

	return null;
}

/**
 * Гард проверки запрета выдачи налоговых справок анонимным пациентам по Постановлению Правительства РФ №659.
 */
export function checkDecree659TaxDeductionRestriction(
	input: CreateDocumentInput,
	facts: DocumentCreationFacts,
): DocumentCreationGuardResult | null {
	const metadata = documentKindMetadata[input.kind];
	const patientAny = facts.patient as unknown as {
		fullName?: string;
		name?: string;
		isAnonymous?: boolean;
		administrativeProfile?: Record<string, unknown>;
	};
	const inputAny = input as unknown as { requestedForm?: string };

	const isAnonPatient =
		Boolean(patientAny?.isAnonymous) ||
		Boolean((patientAny?.fullName ?? patientAny?.name)?.startsWith("UUID_ANON")) ||
		Boolean((patientAny?.fullName ?? patientAny?.name)?.toLowerCase().includes("аноним")) ||
		Boolean(patientAny?.administrativeProfile?.["isAnonymous"]);

	if (
		isAnonPatient &&
		(metadata.group === "tax" ||
			input.kind === "tax_deduction_certificate" ||
			input.kind === "tax_deduction_application" ||
			input.kind === "tax_deduction_registry" ||
			inputAny.requestedForm === "knd_1151156")
	) {
		return {
			ok: false,
			statusCode: 422,
			code: "Decree659TaxDeductionForbiddenError",
			error:
				"Отказ по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 219 НК РФ: формирование справки для налогового вычета (КНД 1151156 / 3-НДФЛ) для анонимных карт (UUID_ANON / isAnonymous) категорически запрещено.",
		};
	}

	return null;
}
