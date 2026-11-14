import type { CreateDocumentInput } from "@dental/shared";
import { documentKindMetadata } from "@dental/shared";
import type {
	DocumentCheckInput,
	DocumentCreationFacts,
	DocumentCreationGuardResult,
} from "./types.js";

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
 * Гард проверки запрета выдачи налоговых справок анонимным пациентам без паспортных данных и ИНН по ст. 219 НК РФ.
 */
export function checkTaxDeductionIdentificationRestriction(
	input: DocumentCheckInput,
	facts: DocumentCreationFacts,
): DocumentCreationGuardResult | null {
	const metadata = documentKindMetadata[input.kind];
	const patient = facts.patient;

	const isAnonPatient =
		Boolean(patient?.isAnonymous) ||
		Boolean((patient?.fullName ?? patient?.name)?.startsWith("UUID_ANON")) ||
		Boolean((patient?.fullName ?? patient?.name)?.toLowerCase().includes("аноним")) ||
		Boolean(patient?.administrativeProfile?.["isAnonymous"]);

	if (
		isAnonPatient &&
		(metadata.group === "tax" ||
			input.kind === "tax_deduction_certificate" ||
			input.kind === "tax_deduction_application" ||
			input.kind === "tax_deduction_registry" ||
			input.requestedForm === "knd_1151156")
	) {
		return {
			ok: false,
			statusCode: 422,
			code: "TaxPayerRequisitesRequiredError",
			error:
				"Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
		};
	}

	return null;
}
export { checkTaxDeductionIdentificationRestriction as checkTaxPayerRequisitesRestriction };
