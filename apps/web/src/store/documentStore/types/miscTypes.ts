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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	copyRequestDocumentTypes: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCopyRequestDocumentTypes: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	copyRequestRecipientAuthority: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCopyRequestRecipientAuthority: (val: any | ((prev: any) => any)) => void;
	copyRequestRepresentativeAuthorityDocument: string;
	setCopyRequestRepresentativeAuthorityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	copyRequestRequestedAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCopyRequestRequestedAt: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	attendancePurpose: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setAttendancePurpose: (val: any | ((prev: any) => any)) => void;
	attendanceRecipientOrganization: string;
	setAttendanceRecipientOrganization: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	attendanceIssuedAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setAttendanceIssuedAt: (val: any | ((prev: any) => any)) => void;
	attendanceSignedByFullName: string;
	setAttendanceSignedByFullName: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	attendanceSignedByRole: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setAttendanceSignedByRole: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	releaseRecipientAuthority: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setReleaseRecipientAuthority: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	releaseDocumentTypes: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setReleaseDocumentTypes: (val: any | ((prev: any) => any)) => void;
	releasePeriodStart: string;
	setReleasePeriodStart: (val: string | ((prev: string) => string)) => void;
	releasePeriodEnd: string;
	setReleasePeriodEnd: (val: string | ((prev: string) => string)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	releaseDeliveredAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setReleaseDeliveredAt: (val: any | ((prev: any) => any)) => void;
	releaseAccessExpiresAt: string;
	setReleaseAccessExpiresAt: (val: string | ((prev: string) => string)) => void;
	releaseThirdPartyDataChecked: boolean;
	setReleaseThirdPartyDataChecked: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
}
