import { buildPatientConsentSummary } from "../consentSummaryHelper.js";
import { showToast } from "../../GlobalToast.js";
import type { ConsentPackageKey, ConsentTemplateKey, ConsentSubstitutionContext, InformedConsentPatientInfo } from "./types.js";

export function copyPatientSummaryToClipboard(params: {
	activeMode: "packages" | "single";
	patient?: InformedConsentPatientInfo | null | undefined;
	substitutionContext: ConsentSubstitutionContext;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	effectiveDoctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	customTeeth?: string;
	toothNumbers?: string | null | undefined;
	customDiagnosis?: string;
	diagnosisIcd?: string | null | undefined;
	activePackageKey: ConsentPackageKey;
	activeDocKey: ConsentTemplateKey;
	integrityHash: string;
}): string {
	const summaryText = buildPatientConsentSummary({
		activeMode: params.activeMode,
		patientName: params.patient?.fullName || params.substitutionContext.patientName,
		doctorName:
			params.doctorName ||
			(params.doctorSpecialty ? `Врач-стоматолог (${params.doctorSpecialty})` : null) ||
			params.effectiveDoctorName,
		doctorSpecialty: params.doctorSpecialty,
		clinicName: params.clinicName,
		clinicLegalName: params.clinicLegalName,
		clinicPhone: params.clinicPhone,
		toothNumbers: params.customTeeth || params.toothNumbers,
		customDiagnosis: params.customDiagnosis,
		diagnosisIcd: params.diagnosisIcd,
		packageKey: params.activePackageKey,
		templateKey: params.activeDocKey,
		integrityHash: params.integrityHash,
	});

	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(summaryText).catch(() => {});
	}
	showToast("Выжимка согласия и памятка скопированы в буфер обмена для отправки пациенту", "success");
	return summaryText;
}
