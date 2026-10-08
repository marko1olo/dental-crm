import type {
	PatientIntakePregnancyStatus,
	PhotoVideoConsentMaterial,
	ProcedureSpecificConsentProcedure,
} from "@dental/shared";

export interface IntakeConsentSliceState {
	intakeChiefComplaint: string;
	setIntakeChiefComplaint: (val: string | ((prev: string) => string)) => void;
	intakeAllergyStatus: string;
	setIntakeAllergyStatus: (val: string | ((prev: string) => string)) => void;
	intakeCurrentMedications: string;
	setIntakeCurrentMedications: (
		val: string | ((prev: string) => string),
	) => void;
	intakeChronicConditions: string;
	setIntakeChronicConditions: (
		val: string | ((prev: string) => string),
	) => void;
	intakePregnancyStatus: PatientIntakePregnancyStatus;
	setIntakePregnancyStatus: (
		val:
			| PatientIntakePregnancyStatus
			| ((prev: PatientIntakePregnancyStatus) => PatientIntakePregnancyStatus),
	) => void;
	intakeAnticoagulants: string;
	setIntakeAnticoagulants: (val: string | ((prev: string) => string)) => void;
	intakeInfectiousRiskNotes: string;
	setIntakeInfectiousRiskNotes: (
		val: string | ((prev: string) => string),
	) => void;
	intakeCardioEndocrineNotes: string;
	setIntakeCardioEndocrineNotes: (
		val: string | ((prev: string) => string),
	) => void;
	intakeEmergencyContact: string;
	setIntakeEmergencyContact: (val: string | ((prev: string) => string)) => void;
	intakeAdditionalNotes: string;
	setIntakeAdditionalNotes: (val: string | ((prev: string) => string)) => void;
	intakeAccuracyConfirmed: boolean;
	setIntakeAccuracyConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	informedConsentIntervention: string;
	setInformedConsentIntervention: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentToothOrArea: string;
	setInformedConsentToothOrArea: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentDiagnosisOrIndication: string;
	setInformedConsentDiagnosisOrIndication: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentExpectedBenefit: string;
	setInformedConsentExpectedBenefit: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentAnesthesia: string;
	setInformedConsentAnesthesia: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentMaterialNotes: string;
	setInformedConsentMaterialNotes: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentTrustedContact: string;
	setInformedConsentTrustedContact: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentRisks: string;
	setInformedConsentRisks: (val: string | ((prev: string) => string)) => void;
	informedConsentAlternatives: string;
	setInformedConsentAlternatives: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentAftercare: string;
	setInformedConsentAftercare: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentDoctorFullName: string;
	setInformedConsentDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentConfirmedAt: string;
	setInformedConsentConfirmedAt: (
		val: string | ((prev: string) => string),
	) => void;
	informedConsentQuestionsAnswered: boolean;
	setInformedConsentQuestionsAnswered: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	informedConsentRisksUnderstood: boolean;
	setInformedConsentRisksUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	informedConsentWithdrawUnderstood: boolean;
	setInformedConsentWithdrawUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	procedureConsentProcedureType: ProcedureSpecificConsentProcedure;
	setProcedureConsentProcedureType: (
		val:
			| ProcedureSpecificConsentProcedure
			| ((
					prev: ProcedureSpecificConsentProcedure,
			  ) => ProcedureSpecificConsentProcedure),
	) => void;
	procedureConsentProcedureName: string;
	setProcedureConsentProcedureName: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentToothOrArea: string;
	setProcedureConsentToothOrArea: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentDiagnosisOrIndication: string;
	setProcedureConsentDiagnosisOrIndication: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentAnesthesia: string;
	setProcedureConsentAnesthesia: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentMaterials: string;
	setProcedureConsentMaterials: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentPatientRiskFactors: string;
	setProcedureConsentPatientRiskFactors: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentSpecificRisks: string;
	setProcedureConsentSpecificRisks: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentAlternatives: string;
	setProcedureConsentAlternatives: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentAftercare: string;
	setProcedureConsentAftercare: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentDoctorFullName: string;
	setProcedureConsentDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentConfirmedAt: string;
	setProcedureConsentConfirmedAt: (
		val: string | ((prev: string) => string),
	) => void;
	procedureConsentLocalFormAttached: boolean;
	setProcedureConsentLocalFormAttached: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	procedureConsentQuestionsAnswered: boolean;
	setProcedureConsentQuestionsAnswered: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	procedureConsentExactProcedureConfirmed: boolean;
	setProcedureConsentExactProcedureConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	procedureConsentRisksUnderstood: boolean;
	setProcedureConsentRisksUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoLabTransferAllowed: boolean;
	setPhotoVideoLabTransferAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoColleagueConsultationAllowed: boolean;
	setPhotoVideoColleagueConsultationAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoEducationUseAllowed: boolean;
	setPhotoVideoEducationUseAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoMarketingUseAllowed: boolean;
	setPhotoVideoMarketingUseAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoRecognizablePublicationAllowed: boolean;
	setPhotoVideoRecognizablePublicationAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoClinicalRecordUseConfirmed: boolean;
	setPhotoVideoClinicalRecordUseConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoAnonymizationConfirmed: boolean;
	setPhotoVideoAnonymizationConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	photoVideoMaterials: PhotoVideoConsentMaterial[];
	setPhotoVideoMaterials: (
		val:
			| PhotoVideoConsentMaterial[]
			| ((prev: PhotoVideoConsentMaterial[]) => PhotoVideoConsentMaterial[]),
	) => void;
	photoVideoRevocationChannel: string;
	setPhotoVideoRevocationChannel: (
		val: string | ((prev: string) => string),
	) => void;
	photoVideoScopeNotes: string;
	setPhotoVideoScopeNotes: (val: string | ((prev: string) => string)) => void;
	personalDataCrossBorderAllowed: boolean;
	setPersonalDataCrossBorderAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	personalDataAutomatedDecisionAllowed: boolean;
	setPersonalDataAutomatedDecisionAllowed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	personalDataConsentGivenAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPersonalDataConsentGivenAt: (val: any | ((prev: any) => any)) => void;
	personalDataVoluntaryConsentConfirmed: boolean;
	setPersonalDataVoluntaryConsentConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	personalDataMedicalProcessingAcknowledged: boolean;
	setPersonalDataMedicalProcessingAcknowledged: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	personalDataPurposes: string;
	setPersonalDataPurposes: (val: string | ((prev: string) => string)) => void;
	personalDataCategories: string;
	setPersonalDataCategories: (val: string | ((prev: string) => string)) => void;
	personalDataActions: string;
	setPersonalDataActions: (val: string | ((prev: string) => string)) => void;
	personalDataTransferRules: string;
	setPersonalDataTransferRules: (
		val: string | ((prev: string) => string),
	) => void;
	personalDataRetentionPeriod: string;
	setPersonalDataRetentionPeriod: (
		val: string | ((prev: string) => string),
	) => void;
	personalDataRevocationChannel: string;
	setPersonalDataRevocationChannel: (
		val: string | ((prev: string) => string),
	) => void;
	refusalIntervention: string;
	setRefusalIntervention: (val: string | ((prev: string) => string)) => void;
	refusalClinicalIndication: string;
	setRefusalClinicalIndication: (
		val: string | ((prev: string) => string),
	) => void;
	refusalPatientReason: string;
	setRefusalPatientReason: (val: string | ((prev: string) => string)) => void;
	refusalDoctorFullName: string;
	setRefusalDoctorFullName: (val: string | ((prev: string) => string)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	refusalConfirmedAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setRefusalConfirmedAt: (val: any | ((prev: any) => any)) => void;
	refusalConsequencesUnderstood: boolean;
	setRefusalConsequencesUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	refusalSecondOpinionOffered: boolean;
	setRefusalSecondOpinionOffered: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	refusalEmergencyCareExplained: boolean;
	setRefusalEmergencyCareExplained: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	refusalExplainedRisks: string;
	setRefusalExplainedRisks: (val: string | ((prev: string) => string)) => void;
	refusalAlternatives: string;
	setRefusalAlternatives: (val: string | ((prev: string) => string)) => void;
	refusalUrgentWarningSigns: string;
	setRefusalUrgentWarningSigns: (
		val: string | ((prev: string) => string),
	) => void;
}
