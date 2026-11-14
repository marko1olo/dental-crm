import type { MedicalDocumentReleaseChannel } from "./coreTypes";

export interface MiscSliceState {
	minorRepresentativeFullName: string;
	setMinorRepresentativeFullName: (
		val: string | ((prev: string) => string),
	) => void;
	minorRepresentativeRelationship: string;
	setMinorRepresentativeRelationship: (
		val: string | ((prev: string) => string),
	) => void;
	minorRepresentativeIdentityDocument: string;
	setMinorRepresentativeIdentityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	minorRepresentativeAuthorityDocument: string;
	setMinorRepresentativeAuthorityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	minorRepresentativePhone: string;
	setMinorRepresentativePhone: (
		val: string | ((prev: string) => string),
	) => void;
	minorConsentPatientFullName: string;
	setMinorConsentPatientFullName: (
		val: string | ((prev: string) => string),
	) => void;
	minorConsentPatientBirthDate: string;
	setMinorConsentPatientBirthDate: (
		val: string | ((prev: string) => string),
	) => void;
	minorConsentInterventionScope: string;
	setMinorConsentInterventionScope: (
		val: string | ((prev: string) => string),
	) => void;
	minorConsentDiagnosisOrIndication: string;
	setMinorConsentDiagnosisOrIndication: (
		val: string | ((prev: string) => string),
	) => void;
	minorConsentRisks: string;
	setMinorConsentRisks: (val: string | ((prev: string) => string)) => void;
	minorConsentAlternatives: string;
	setMinorConsentAlternatives: (
		val: string | ((prev: string) => string),
	) => void;
	minorConsentDoctorFullName: string;
	setMinorConsentDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	minorConsentSignedAt: string;
	setMinorConsentSignedAt: (val: string | ((prev: string) => string)) => void;
	minorConsentIdentityVerified: boolean;
	setMinorConsentIdentityVerified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	minorConsentAuthorityVerified: boolean;
	setMinorConsentAuthorityVerified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	minorConsentExplained: boolean;
	setMinorConsentExplained: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	minorConsentStored: boolean;
	setMinorConsentStored: (val: boolean | ((prev: boolean) => boolean)) => void;
	minorConsentAgeExplanation: boolean;
	setMinorConsentAgeExplanation: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	recordExtractPeriodStart: string;
	setRecordExtractPeriodStart: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractPeriodEnd: string;
	setRecordExtractPeriodEnd: (val: string | ((prev: string) => string)) => void;
	recordExtractSourceVisitIds: string;
	setRecordExtractSourceVisitIds: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractComplaintAndAnamnesis: string;
	setRecordExtractComplaintAndAnamnesis: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractObjectiveStatus: string;
	setRecordExtractObjectiveStatus: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractDiagnosis: string;
	setRecordExtractDiagnosis: (val: string | ((prev: string) => string)) => void;
	recordExtractTreatmentProvided: string;
	setRecordExtractTreatmentProvided: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractRecommendations: string;
	setRecordExtractRecommendations: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractDoctorFullName: string;
	setRecordExtractDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractRecipientFullName: string;
	setRecordExtractRecipientFullName: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractRecipientAuthority: string;
	setRecordExtractRecipientAuthority: (
		val: string | ((prev: string) => string),
	) => void;
	recordExtractIssuedAt: string;
	setRecordExtractIssuedAt: (val: string | ((prev: string) => string)) => void;
	recordExtractPreparedFromSignedRecords: boolean;
	setRecordExtractPreparedFromSignedRecords: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	recordExtractThirdPartyDataChecked: boolean;
	setRecordExtractThirdPartyDataChecked: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	copyRequestDocumentTypes: string;
	setCopyRequestDocumentTypes: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestPeriodStart: string;
	setCopyRequestPeriodStart: (val: string | ((prev: string) => string)) => void;
	copyRequestPeriodEnd: string;
	setCopyRequestPeriodEnd: (val: string | ((prev: string) => string)) => void;
	copyRequestFormat: MedicalDocumentReleaseChannel;
	setCopyRequestFormat: (
		val:
			| MedicalDocumentReleaseChannel
			| ((
					prev: MedicalDocumentReleaseChannel,
			  ) => MedicalDocumentReleaseChannel),
	) => void;
	copyRequestRecipientFullName: string;
	setCopyRequestRecipientFullName: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestRecipientIdentityDocument: string;
	setCopyRequestRecipientIdentityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestRecipientAuthority: string;
	setCopyRequestRecipientAuthority: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestRepresentativeAuthorityDocument: string;
	setCopyRequestRepresentativeAuthorityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestRequestedAt: string;
	setCopyRequestRequestedAt: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestContactForDelivery: string;
	setCopyRequestContactForDelivery: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestSpecialInstructions: string;
	setCopyRequestSpecialInstructions: (
		val: string | ((prev: string) => string),
	) => void;
	copyRequestIncludeDicomSourceData: boolean;
	setCopyRequestIncludeDicomSourceData: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	copyRequestIdentityVerified: boolean;
	setCopyRequestIdentityVerified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	copyRequestThirdPartyDataChecked: boolean;
	setCopyRequestThirdPartyDataChecked: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	attendanceStartedAt: string;
	setAttendanceStartedAt: (val: string | ((prev: string) => string)) => void;
	attendanceEndedAt: string;
	setAttendanceEndedAt: (val: string | ((prev: string) => string)) => void;
	attendancePurpose: string;
	setAttendancePurpose: (val: string | ((prev: string) => string)) => void;
	attendanceRecipientOrganization: string;
	setAttendanceRecipientOrganization: (
		val: string | ((prev: string) => string),
	) => void;
	attendanceIssuedAt: string;
	setAttendanceIssuedAt: (val: string | ((prev: string) => string)) => void;
	attendanceSignedByFullName: string;
	setAttendanceSignedByFullName: (
		val: string | ((prev: string) => string),
	) => void;
	attendanceSignedByRole: string;
	setAttendanceSignedByRole: (val: string | ((prev: string) => string)) => void;
	attendanceDiagnosisDisclosureExcluded: boolean;
	setAttendanceDiagnosisDisclosureExcluded: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	attendanceNotSickLeaveAcknowledged: boolean;
	setAttendanceNotSickLeaveAcknowledged: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	releaseRecipientFullName: string;
	setReleaseRecipientFullName: (
		val: string | ((prev: string) => string),
	) => void;
	releaseRecipientIdentityDocument: string;
	setReleaseRecipientIdentityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	releaseRecipientAuthority: string;
	setReleaseRecipientAuthority: (
		val: string | ((prev: string) => string),
	) => void;
	releaseSourceRequestDocumentId: string;
	setReleaseSourceRequestDocumentId: (
		val: string | ((prev: string) => string),
	) => void;
	releaseChannel: MedicalDocumentReleaseChannel;
	setReleaseChannel: (
		val:
			| MedicalDocumentReleaseChannel
			| ((
					prev: MedicalDocumentReleaseChannel,
			  ) => MedicalDocumentReleaseChannel),
	) => void;
	releaseDocumentTypes: string;
	setReleaseDocumentTypes: (
		val: string | ((prev: string) => string),
	) => void;
	releasePeriodStart: string;
	setReleasePeriodStart: (val: string | ((prev: string) => string)) => void;
	releasePeriodEnd: string;
	setReleasePeriodEnd: (val: string | ((prev: string) => string)) => void;
	releaseDeliveredAt: string;
	setReleaseDeliveredAt: (val: string | ((prev: string) => string)) => void;
	releaseAccessExpiresAt: string;
	setReleaseAccessExpiresAt: (val: string | ((prev: string) => string)) => void;
	releaseThirdPartyDataChecked: boolean;
	setReleaseThirdPartyDataChecked: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
}
