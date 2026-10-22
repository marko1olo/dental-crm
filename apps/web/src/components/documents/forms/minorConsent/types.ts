import type { DocumentVisitHints } from "../documentFormTypes";

export interface MinorLegalRepresentativeConsentFormProps extends DocumentVisitHints {
	minorRepresentativeNameValue?: (() => string) | string | undefined;
	minorRepresentativePhoneValue?: (() => string) | string | undefined;
	minorConsentPatientFullNameValue?: (() => string) | string | undefined;
	minorConsentPatientBirthDateValue?: (() => string) | string | undefined;
	minorConsentInterventionScopeValue?: (() => string) | string | undefined;
	minorConsentDiagnosisOrIndicationValue?: (() => string) | string | undefined;
}

export const MINOR_RELATION_CHIPS = [
	{ label: "Мама", value: "Мать" },
	{ label: "Папа", value: "Отец" },
	{ label: "Опекун", value: "Опекун" },
] as const;

export function resolveValue(v: (() => string) | string | undefined): string {
	if (typeof v === "function") return v();
	return v ?? "";
}
