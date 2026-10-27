import type { Dashboard, GeneratedDocument, Patient } from "@dental/shared";

export interface UseDocumentRepresentativeWarrantyProps {
	dashboard: Dashboard | null;
	documentPatient: Patient | null;
	documentState: any;
	activeUsableDocuments: GeneratedDocument[];
	inferredTreatmentArea: string;
}

export function useDocumentRepresentativeWarrantyValues({
	dashboard,
	documentPatient,
	documentState,
	activeUsableDocuments,
	inferredTreatmentArea,
}: UseDocumentRepresentativeWarrantyProps) {
	function _minorRepresentativeFullNameValue(): string {
		return (
			documentState.minorRepresentativeFullName.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeFullName?.trim() ||
			""
		);
	}

	function _minorRepresentativeRelationshipValue(): string {
		return (
			documentState.minorRepresentativeRelationship.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() ||
			""
		);
	}

	function _minorRepresentativeIdentityDocumentValue(): string {
		return (
			documentState.minorRepresentativeIdentityDocument.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() ||
			""
		);
	}

	function _minorRepresentativePhoneValue(): string {
		return (
			documentState.minorRepresentativePhone.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativePhone?.trim() ||
			""
		);
	}

	function _minorConsentPatientFullNameValue(): string {
		return (
			documentState.minorConsentPatientFullName.trim() ||
			documentPatient?.fullName ||
			""
		);
	}

	function _minorConsentPatientBirthDateValue(): string {
		return (
			documentState.minorConsentPatientBirthDate.trim() ||
			documentPatient?.birthDate ||
			""
		);
	}

	function _minorConsentInterventionScopeValue(): string {
		return (
			documentState.minorConsentInterventionScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"стоматологическое вмешательство по согласованному плану"
		);
	}

	function _minorConsentDiagnosisOrIndicationValue(): string {
		return (
			documentState.minorConsentDiagnosisOrIndication.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

	function _warrantyServiceOrWorkNameValue(): string {
		return (
			documentState.warrantyServiceOrWorkName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}

	function _warrantyTeethOrAreaValue(): string {
		return (
			documentState.warrantyTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по визиту"
		);
	}

	function _warrantyLinkedActOrContractValue(): string {
		return (
			documentState.warrantyLinkedActOrContract.trim() ||
			activeUsableDocuments?.find(
				(document) =>
					document.kind === "completed_works_act" ||
					document.kind === "paid_medical_services_contract",
			)?.title ||
			"акт выполненных работ или договор клиники"
		);
	}

	return {
		_minorRepresentativeFullNameValue,
		_minorRepresentativeRelationshipValue,
		_minorRepresentativeIdentityDocumentValue,
		_minorRepresentativePhoneValue,
		_minorConsentPatientFullNameValue,
		_minorConsentPatientBirthDateValue,
		_minorConsentInterventionScopeValue,
		_minorConsentDiagnosisOrIndicationValue,
		_warrantyServiceOrWorkNameValue,
		_warrantyTeethOrAreaValue,
		_warrantyLinkedActOrContractValue,
	};
}
