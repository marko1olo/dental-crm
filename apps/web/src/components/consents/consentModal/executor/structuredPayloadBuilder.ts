import type { ConsentTemplate, ConsentSubstitutionContext } from "../types";
import { buildStatutoryConsentPayload } from "./payloads/statutoryPayloads";
import { buildServiceConsentPayload } from "./payloads/servicePayloads";

export function buildStructuredPayloadForConsent(
	kind: string,
	template: ConsentTemplate,
	effectiveContext: ConsentSubstitutionContext,
): Record<string, unknown> | null {
	const todayIsoDate = new Date().toISOString().slice(0, 10);
	const doctorFullName = effectiveContext.doctorName || "Лечащий врач";
	const toothOrArea = effectiveContext.toothNumbers || "По клиническому плану";
	const diagnosisOrIndication =
		effectiveContext.diagnosisIcd || "Z01.2 Стоматологическое обследование";

	const statutory = buildStatutoryConsentPayload(
		kind,
		template,
		effectiveContext,
		todayIsoDate,
		doctorFullName,
		toothOrArea,
		diagnosisOrIndication,
	);
	if (statutory) return statutory;

	return buildServiceConsentPayload(
		kind,
		template,
		effectiveContext,
		todayIsoDate,
		doctorFullName,
		toothOrArea,
		diagnosisOrIndication,
	);
}
