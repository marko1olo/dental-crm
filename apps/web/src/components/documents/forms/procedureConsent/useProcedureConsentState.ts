/**
 * forms/procedureConsent/useProcedureConsentState.ts
 * Store state and preset application for procedure specific consent (Mandate 8b <= 120 lines)
 */

import { CLINICAL_CONSENT_PRESETS, type ProcedureSpecificConsentProcedure } from "@dental/shared";
import { useDocumentStore } from "../../../../store/documentStore";

export function useProcedureConsentState() {
	const procedureConsentAftercare = useDocumentStore((state) => state.procedureConsentAftercare);
	const setProcedureConsentAftercare = useDocumentStore((state) => state.setProcedureConsentAftercare);
	const procedureConsentAlternatives = useDocumentStore((state) => state.procedureConsentAlternatives);
	const setProcedureConsentAlternatives = useDocumentStore((state) => state.setProcedureConsentAlternatives);
	const procedureConsentAnesthesia = useDocumentStore((state) => state.procedureConsentAnesthesia);
	const setProcedureConsentAnesthesia = useDocumentStore((state) => state.setProcedureConsentAnesthesia);
	const procedureConsentConfirmedAt = useDocumentStore((state) => state.procedureConsentConfirmedAt);
	const setProcedureConsentConfirmedAt = useDocumentStore((state) => state.setProcedureConsentConfirmedAt);
	const procedureConsentDiagnosisOrIndication = useDocumentStore((state) => state.procedureConsentDiagnosisOrIndication);
	const setProcedureConsentDiagnosisOrIndication = useDocumentStore((state) => state.setProcedureConsentDiagnosisOrIndication);
	const procedureConsentDoctorFullName = useDocumentStore((state) => state.procedureConsentDoctorFullName);
	const setProcedureConsentDoctorFullName = useDocumentStore((state) => state.setProcedureConsentDoctorFullName);
	const procedureConsentExactProcedureConfirmed = useDocumentStore((state) => state.procedureConsentExactProcedureConfirmed);
	const setProcedureConsentExactProcedureConfirmed = useDocumentStore((state) => state.setProcedureConsentExactProcedureConfirmed);
	const procedureConsentLocalFormAttached = useDocumentStore((state) => state.procedureConsentLocalFormAttached);
	const setProcedureConsentLocalFormAttached = useDocumentStore((state) => state.setProcedureConsentLocalFormAttached);
	const procedureConsentMaterials = useDocumentStore((state) => state.procedureConsentMaterials);
	const setProcedureConsentMaterials = useDocumentStore((state) => state.setProcedureConsentMaterials);
	const procedureConsentPatientRiskFactors = useDocumentStore((state) => state.procedureConsentPatientRiskFactors);
	const setProcedureConsentPatientRiskFactors = useDocumentStore((state) => state.setProcedureConsentPatientRiskFactors);
	const procedureConsentProcedureName = useDocumentStore((state) => state.procedureConsentProcedureName);
	const setProcedureConsentProcedureName = useDocumentStore((state) => state.setProcedureConsentProcedureName);
	const procedureConsentProcedureType = useDocumentStore((state) => state.procedureConsentProcedureType);
	const setProcedureConsentProcedureType = useDocumentStore((state) => state.setProcedureConsentProcedureType);
	const procedureConsentQuestionsAnswered = useDocumentStore((state) => state.procedureConsentQuestionsAnswered);
	const setProcedureConsentQuestionsAnswered = useDocumentStore((state) => state.setProcedureConsentQuestionsAnswered);
	const procedureConsentRisksUnderstood = useDocumentStore((state) => state.procedureConsentRisksUnderstood);
	const setProcedureConsentRisksUnderstood = useDocumentStore((state) => state.setProcedureConsentRisksUnderstood);
	const procedureConsentSpecificRisks = useDocumentStore((state) => state.procedureConsentSpecificRisks);
	const setProcedureConsentSpecificRisks = useDocumentStore((state) => state.setProcedureConsentSpecificRisks);
	const procedureConsentToothOrArea = useDocumentStore((state) => state.procedureConsentToothOrArea);
	const setProcedureConsentToothOrArea = useDocumentStore((state) => state.setProcedureConsentToothOrArea);

	const applyClinicalPreset = (procType: ProcedureSpecificConsentProcedure) => {
		const preset = CLINICAL_CONSENT_PRESETS[procType];
		if (!preset) return;
		setProcedureConsentProcedureType(procType);
		setProcedureConsentProcedureName(preset.procedureName);
		setProcedureConsentDiagnosisOrIndication(preset.diagnosisOrIndication);
		setProcedureConsentAnesthesia(preset.plannedAnesthesia ?? "");
		setProcedureConsentMaterials(preset.materialsAndSystems ?? "");
		setProcedureConsentPatientRiskFactors(preset.patientSpecificRiskFactors.join("\n"));
		setProcedureConsentSpecificRisks(preset.procedureSpecificRisks.join("\n"));
		setProcedureConsentAlternatives(preset.alternatives.join("\n"));
		setProcedureConsentAftercare(preset.aftercareAndLimits.join("\n"));
	};

	return {
		procedureConsentAftercare, setProcedureConsentAftercare,
		procedureConsentAlternatives, setProcedureConsentAlternatives,
		procedureConsentAnesthesia, setProcedureConsentAnesthesia,
		procedureConsentConfirmedAt, setProcedureConsentConfirmedAt,
		procedureConsentDiagnosisOrIndication, setProcedureConsentDiagnosisOrIndication,
		procedureConsentDoctorFullName, setProcedureConsentDoctorFullName,
		procedureConsentExactProcedureConfirmed, setProcedureConsentExactProcedureConfirmed,
		procedureConsentLocalFormAttached, setProcedureConsentLocalFormAttached,
		procedureConsentMaterials, setProcedureConsentMaterials,
		procedureConsentPatientRiskFactors, setProcedureConsentPatientRiskFactors,
		procedureConsentProcedureName, setProcedureConsentProcedureName,
		procedureConsentProcedureType, setProcedureConsentProcedureType,
		procedureConsentQuestionsAnswered, setProcedureConsentQuestionsAnswered,
		procedureConsentRisksUnderstood, setProcedureConsentRisksUnderstood,
		procedureConsentSpecificRisks, setProcedureConsentSpecificRisks,
		procedureConsentToothOrArea, setProcedureConsentToothOrArea,
		applyClinicalPreset,
	};
}
