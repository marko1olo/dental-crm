import { PEDIATRIC_MINOR_CONSENT_PRESET } from "@dental/shared";
import { useDocumentStore } from "../../../../store/documentStore";
import { usePatientStore } from "../../../../store/patientStore";
import type { MinorLegalRepresentativeConsentFormProps } from "./types";
import { resolveValue } from "./types";
import { printCompletedMinorConsent, printBlankMinorConsent } from "./minorConsentPrintHelpers";

export function useMinorConsentState(props: MinorLegalRepresentativeConsentFormProps) {
	const minorRepresentativeName = useDocumentStore((s) => s.minorRepresentativeFullName);
	const setMinorRepresentativeName = useDocumentStore((s) => s.setMinorRepresentativeFullName);
	const minorRepresentativeRelation = useDocumentStore((s) => s.minorRepresentativeRelationship);
	const setMinorRepresentativeRelation = useDocumentStore((s) => s.setMinorRepresentativeRelationship);
	const minorRepresentativeDocument = useDocumentStore((s) => s.minorRepresentativeIdentityDocument);
	const setMinorRepresentativeDocument = useDocumentStore((s) => s.setMinorRepresentativeIdentityDocument);
	const minorRepresentativeAuthority = useDocumentStore((s) => s.minorRepresentativeAuthorityDocument);
	const setMinorRepresentativeAuthority = useDocumentStore((s) => s.setMinorRepresentativeAuthorityDocument);
	const minorRepresentativePhone = useDocumentStore((s) => s.minorRepresentativePhone);
	const setMinorRepresentativePhone = useDocumentStore((s) => s.setMinorRepresentativePhone);
	const minorConsentPatientFullName = useDocumentStore((s) => s.minorConsentPatientFullName);
	const setMinorConsentPatientFullName = useDocumentStore((s) => s.setMinorConsentPatientFullName);
	const minorConsentPatientBirthDate = useDocumentStore((s) => s.minorConsentPatientBirthDate);
	const setMinorConsentPatientBirthDate = useDocumentStore((s) => s.setMinorConsentPatientBirthDate);
	const minorConsentInterventionScope = useDocumentStore((s) => s.minorConsentInterventionScope);
	const setMinorConsentInterventionScope = useDocumentStore((s) => s.setMinorConsentInterventionScope);
	const minorConsentDiagnosisOrIndication = useDocumentStore((s) => s.minorConsentDiagnosisOrIndication);
	const setMinorConsentDiagnosisOrIndication = useDocumentStore((s) => s.setMinorConsentDiagnosisOrIndication);
	const minorConsentRisks = useDocumentStore((s) => s.minorConsentRisks);
	const setMinorConsentRisks = useDocumentStore((s) => s.setMinorConsentRisks);
	const minorConsentAlternatives = useDocumentStore((s) => s.minorConsentAlternatives);
	const setMinorConsentAlternatives = useDocumentStore((s) => s.setMinorConsentAlternatives);
	const minorConsentDoctorFullName = useDocumentStore((s) => s.minorConsentDoctorFullName);
	const setMinorConsentDoctorFullName = useDocumentStore((s) => s.setMinorConsentDoctorFullName);
	const minorConsentSignedAt = useDocumentStore((s) => s.minorConsentSignedAt);
	const setMinorConsentSignedAt = useDocumentStore((s) => s.setMinorConsentSignedAt);
	const minorConsentIdentityVerified = useDocumentStore((s) => s.minorConsentIdentityVerified);
	const setMinorConsentIdentityVerified = useDocumentStore((s) => s.setMinorConsentIdentityVerified);
	const minorConsentAuthorityVerified = useDocumentStore((s) => s.minorConsentAuthorityVerified);
	const setMinorConsentAuthorityVerified = useDocumentStore((s) => s.setMinorConsentAuthorityVerified);
	const minorConsentExplained = useDocumentStore((s) => s.minorConsentExplained);
	const setMinorConsentExplained = useDocumentStore((s) => s.setMinorConsentExplained);
	const minorConsentStored = useDocumentStore((s) => s.minorConsentStored);
	const setMinorConsentStored = useDocumentStore((s) => s.setMinorConsentStored);
	const minorConsentAgeExplanation = useDocumentStore((s) => s.minorConsentAgeExplanation);
	const setMinorConsentAgeExplanation = useDocumentStore((s) => s.setMinorConsentAgeExplanation);

	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const patientAdministrativeProfileDraft = usePatientStore((s) => s.patientAdministrativeProfileDraft);

	const applyPediatricPreset = () => {
		setMinorConsentInterventionScope(PEDIATRIC_MINOR_CONSENT_PRESET.interventionScope);
		setMinorConsentDiagnosisOrIndication(PEDIATRIC_MINOR_CONSENT_PRESET.diagnosisOrIndication);
		setMinorConsentRisks(PEDIATRIC_MINOR_CONSENT_PRESET.explainedRisks.join("\n"));
		setMinorConsentAlternatives(PEDIATRIC_MINOR_CONSENT_PRESET.alternativesExplained.join("\n"));
	};

	const handlePrintMinorConsent = () => {
		printCompletedMinorConsent({
			repName: minorRepresentativeName || resolveValue(props.minorRepresentativeNameValue) || patientAdministrativeProfileDraft.legalRepresentativeFullName || "________________________________________",
			repRel: minorRepresentativeRelation || patientAdministrativeProfileDraft.legalRepresentativeRelationship || "мать / отец / опекун / законный представитель",
			repDoc: minorRepresentativeDocument || patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument || "паспорт серия ______ № ________ выдан ____________________",
			repPhone: minorRepresentativePhone || resolveValue(props.minorRepresentativePhoneValue) || patientAdministrativeProfileDraft.legalRepresentativePhone || patientCoreDraft.phone || "+7 (___) ___-__-__",
			childName: minorConsentPatientFullName || resolveValue(props.minorConsentPatientFullNameValue) || patientCoreDraft.fullName || "________________________________________",
			childBirth: minorConsentPatientBirthDate || resolveValue(props.minorConsentPatientBirthDateValue) || patientCoreDraft.birthDate || "«___» _________ _____ г.",
			childDoc: patientAdministrativeProfileDraft.identityDocument || (patientCoreDraft as { passport?: string }).passport || "свидетельство о рождении ребенка / паспорт",
			repBasis: minorRepresentativeAuthority || patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument || "ст. 64 СК РФ (родитель) / свидетельство о рождении ребенка",
			doctorName: minorConsentDoctorFullName || props.activeDoctorFullName || "Детский врач-стоматолог клиники",
			interventionScope: minorConsentInterventionScope || resolveValue(props.minorConsentInterventionScopeValue) || "Детский стоматологический осмотр, диагностика, адаптационный протокол, лечение",
			diagnosisOrIndication: minorConsentDiagnosisOrIndication || resolveValue(props.minorConsentDiagnosisOrIndicationValue) || "Санация полости рта ребенка, профилактика и лечение кариеса",
			risks: minorConsentRisks,
			alternatives: minorConsentAlternatives,
			date: minorConsentSignedAt || new Date().toLocaleDateString("ru-RU"),
		});
	};

	return {
		minorRepresentativeName, setMinorRepresentativeName, minorRepresentativeRelation, setMinorRepresentativeRelation,
		minorRepresentativeDocument, setMinorRepresentativeDocument, minorRepresentativeAuthority, setMinorRepresentativeAuthority,
		minorRepresentativePhone, setMinorRepresentativePhone, minorConsentPatientFullName, setMinorConsentPatientFullName,
		minorConsentPatientBirthDate, setMinorConsentPatientBirthDate, minorConsentInterventionScope, setMinorConsentInterventionScope,
		minorConsentDiagnosisOrIndication, setMinorConsentDiagnosisOrIndication, minorConsentRisks, setMinorConsentRisks,
		minorConsentAlternatives, setMinorConsentAlternatives, minorConsentDoctorFullName, setMinorConsentDoctorFullName,
		minorConsentSignedAt, setMinorConsentSignedAt, minorConsentIdentityVerified, setMinorConsentIdentityVerified,
		minorConsentAuthorityVerified, setMinorConsentAuthorityVerified, minorConsentExplained, setMinorConsentExplained,
		minorConsentStored, setMinorConsentStored, minorConsentAgeExplanation, setMinorConsentAgeExplanation,
		applyPediatricPreset, handlePrintMinorConsent, handlePrintBlankMinorConsent: printBlankMinorConsent,
	};
}
