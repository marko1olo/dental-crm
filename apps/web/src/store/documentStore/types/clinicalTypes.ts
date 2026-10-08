import type {
	PostVisitCareTopic,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";

export interface ClinicalSliceState {
	completedActNumber: string;
	setCompletedActNumber: (val: string | ((prev: string) => string)) => void;
	completedActDate: string;
	setCompletedActDate: (val: string | ((prev: string) => string)) => void;
	completedActContractNumber: string;
	setCompletedActContractNumber: (
		val: string | ((prev: string) => string),
	) => void;
	completedActLinkedContractDocumentId: string;
	setCompletedActLinkedContractDocumentId: (
		val: string | ((prev: string) => string),
	) => void;
	completedActServicePeriodStart: string;
	setCompletedActServicePeriodStart: (
		val: string | ((prev: string) => string),
	) => void;
	completedActServicePeriodEnd: string;
	setCompletedActServicePeriodEnd: (
		val: string | ((prev: string) => string),
	) => void;
	completedActDoctorFullName: string;
	setCompletedActDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	completedActServicesSummary: string;
	setCompletedActServicesSummary: (
		val: string | ((prev: string) => string),
	) => void;
	completedActTotalRub: string;
	setCompletedActTotalRub: (val: string | ((prev: string) => string)) => void;
	completedActPaidRub: string;
	setCompletedActPaidRub: (val: string | ((prev: string) => string)) => void;
	completedActFiscalReceipts: string;
	setCompletedActFiscalReceipts: (
		val: string | ((prev: string) => string),
	) => void;
	completedActPatientClaims: string;
	setCompletedActPatientClaims: (
		val: string | ((prev: string) => string),
	) => void;
	completedActLinkedContract: boolean;
	setCompletedActLinkedContract: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	completedActFinalScopeConfirmed: boolean;
	setCompletedActFinalScopeConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	completedActFiscalReceiptsVerified: boolean;
	setCompletedActFiscalReceiptsVerified: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	completedActAccepted: boolean;
	setCompletedActAccepted: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentEstimateNumber: string;
	setTreatmentEstimateNumber: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateDate: string;
	setTreatmentEstimateDate: (val: string | ((prev: string) => string)) => void;
	treatmentEstimatePatientOrPayerFullName: string;
	setTreatmentEstimatePatientOrPayerFullName: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateTreatmentBasis: string;
	setTreatmentEstimateTreatmentBasis: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateTotalRub: string;
	setTreatmentEstimateTotalRub: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateValidUntil: string;
	setTreatmentEstimateValidUntil: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimatePriceChangeRules: string;
	setTreatmentEstimatePriceChangeRules: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateExcludedItems: string;
	setTreatmentEstimateExcludedItems: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimatePaymentMilestoneNotes: string;
	setTreatmentEstimatePaymentMilestoneNotes: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateDoctorFullName: string;
	setTreatmentEstimateDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateAdminFullName: string;
	setTreatmentEstimateAdminFullName: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimateSignedAt: string;
	setTreatmentEstimateSignedAt: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentEstimatePreliminaryConfirmed: boolean;
	setTreatmentEstimatePreliminaryConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentEstimateScopeConfirmed: boolean;
	setTreatmentEstimateScopeConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentEstimateFiscalNoticeConfirmed: boolean;
	setTreatmentEstimateFiscalNoticeConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentEstimateChangeRulesConfirmed: boolean;
	setTreatmentEstimateChangeRulesConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicalToothRowsText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setClinicalToothRowsText: (val: any | ((prev: any) => any)) => void;
	treatmentPlanClinicalReason: string;
	setTreatmentPlanClinicalReason: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanDiagnosisSummary: string;
	setTreatmentPlanDiagnosisSummary: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanTeethOrArea: string;
	setTreatmentPlanTeethOrArea: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanGoals: string;
	setTreatmentPlanGoals: (val: string | ((prev: string) => string)) => void;
	treatmentPlanStages: string;
	setTreatmentPlanStages: (val: string | ((prev: string) => string)) => void;
	treatmentPlanEstimatedTotalRub: string;
	setTreatmentPlanEstimatedTotalRub: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanAlternatives: string;
	setTreatmentPlanAlternatives: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanRisks: string;
	setTreatmentPlanRisks: (val: string | ((prev: string) => string)) => void;
	treatmentPlanPrognosis: string;
	setTreatmentPlanPrognosis: (val: string | ((prev: string) => string)) => void;
	treatmentPlanControlPlan: string;
	setTreatmentPlanControlPlan: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanDoctorFullName: string;
	setTreatmentPlanDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanPlannedAt: string;
	setTreatmentPlanPlannedAt: (val: string | ((prev: string) => string)) => void;
	treatmentPlanQuestionsAnswered: boolean;
	setTreatmentPlanQuestionsAnswered: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentPlanSeparateConsentAcknowledged: boolean;
	setTreatmentPlanSeparateConsentAcknowledged: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentPlanNewApprovalAcknowledged: boolean;
	setTreatmentPlanNewApprovalAcknowledged: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentPlanPatientFriendlyExplanation: string;
	setTreatmentPlanPatientFriendlyExplanation: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanPatientHygieneAdvice: string;
	setTreatmentPlanPatientHygieneAdvice: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentPlanCustomHygieneTextOverride: string;
	setTreatmentPlanCustomHygieneTextOverride: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceVariant: TreatmentPlanAcceptanceVariant;
	setTreatmentAcceptanceVariant: (
		val:
			| TreatmentPlanAcceptanceVariant
			| ((
					prev: TreatmentPlanAcceptanceVariant,
			  ) => TreatmentPlanAcceptanceVariant),
	) => void;
	treatmentAcceptanceClinicalGoal: string;
	setTreatmentAcceptanceClinicalGoal: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceDiagnosisSummary: string;
	setTreatmentAcceptanceDiagnosisSummary: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceTeethOrArea: string;
	setTreatmentAcceptanceTeethOrArea: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceStages: string;
	setTreatmentAcceptanceStages: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceEstimatedTotalRub: string;
	setTreatmentAcceptanceEstimatedTotalRub: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceEstimateValidUntil: string;
	setTreatmentAcceptanceEstimateValidUntil: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptancePaymentTerms: string;
	setTreatmentAcceptancePaymentTerms: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceRejectedAlternatives: string;
	setTreatmentAcceptanceRejectedAlternatives: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceRisks: string;
	setTreatmentAcceptanceRisks: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceWarrantyTerms: string;
	setTreatmentAcceptanceWarrantyTerms: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceDoctorFullName: string;
	setTreatmentAcceptanceDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceAcceptedAt: string;
	setTreatmentAcceptanceAcceptedAt: (
		val: string | ((prev: string) => string),
	) => void;
	treatmentAcceptanceQuestionsAnswered: boolean;
	setTreatmentAcceptanceQuestionsAnswered: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentAcceptanceAlternativesUnderstood: boolean;
	setTreatmentAcceptanceAlternativesUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentAcceptanceCostChangeUnderstood: boolean;
	setTreatmentAcceptanceCostChangeUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	treatmentAcceptanceRevisionAcknowledged: boolean;
	setTreatmentAcceptanceRevisionAcknowledged: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	postVisitCareTopic: PostVisitCareTopic;
	setPostVisitCareTopic: (
		val:
			| PostVisitCareTopic
			| ((prev: PostVisitCareTopic) => PostVisitCareTopic),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitProcedureName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitProcedureName: (val: any | ((prev: any) => any)) => void;
	postVisitToothOrArea: string;
	setPostVisitToothOrArea: (val: string | ((prev: string) => string)) => void;
	postVisitPerformedAt: string;
	setPostVisitPerformedAt: (val: string | ((prev: string) => string)) => void;
	postVisitDoctorFullName: string;
	setPostVisitDoctorFullName: (
		val: string | ((prev: string) => string),
	) => void;
	postVisitManualEdited: boolean;
	setPostVisitManualEdited: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	postVisitPresetFeedback: string;
	setPostVisitPresetFeedback: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitAllowedAfter: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitAllowedAfter: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitRestrictions: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitRestrictions: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitMedicationAndRinsePlan: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitMedicationAndRinsePlan: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitHygieneInstructions: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitHygieneInstructions: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitNutritionInstructions: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitNutritionInstructions: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitUrgentWarningSigns: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitUrgentWarningSigns: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitFollowUpAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitFollowUpAt: (val: any | ((prev: any) => any)) => void;
	postVisitClinicContactInstruction: string;
	setPostVisitClinicContactInstruction: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitTelegramSummary: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitTelegramSummary: (val: any | ((prev: any) => any)) => void;
	postVisitPrintedCopyReceived: boolean;
	setPostVisitPrintedCopyReceived: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	postVisitUrgentSignsUnderstood: boolean;
	setPostVisitUrgentSignsUnderstood: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	postVisitTelegramSafe: boolean;
	setPostVisitTelegramSafe: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	anesthesiaMethod: string;
	setAnesthesiaMethod: (val: string | ((prev: string) => string)) => void;
	anesthesiaAnesthetic: string;
	setAnesthesiaAnesthetic: (val: string | ((prev: string) => string)) => void;
	anesthesiaVasoconstrictor: string;
	setAnesthesiaVasoconstrictor: (
		val: string | ((prev: string) => string),
	) => void;
	anesthesiaZone: string;
	setAnesthesiaZone: (val: string | ((prev: string) => string)) => void;
	anesthesiaAllergyStatus: string;
	setAnesthesiaAllergyStatus: (
		val: string | ((prev: string) => string),
	) => void;
	anesthesiaRestrictionNotes: string;
	setAnesthesiaRestrictionNotes: (
		val: string | ((prev: string) => string),
	) => void;
	anesthesiaDoseTime: string;
	setAnesthesiaDoseTime: (val: string | ((prev: string) => string)) => void;
	anesthesiaDoseMl: string;
	setAnesthesiaDoseMl: (val: string | ((prev: string) => string)) => void;
	anesthesiaReaction: string;
	setAnesthesiaReaction: (val: string | ((prev: string) => string)) => void;
	anesthesiaRisksExplained: boolean;
	setAnesthesiaRisksExplained: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	anesthesiaAllergyRestrictionsChecked: boolean;
	setAnesthesiaAllergyRestrictionsChecked: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	anesthesiaConsentConfirmed: boolean;
	setAnesthesiaConsentConfirmed: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	prescriptionMedication: string;
	setPrescriptionMedication: (val: string | ((prev: string) => string)) => void;
	prescriptionDosage: string;
	setPrescriptionDosage: (val: string | ((prev: string) => string)) => void;
	prescriptionInstructions: string;
	setPrescriptionInstructions: (
		val: string | ((prev: string) => string),
	) => void;
	prescriptionDuration: string;
	setPrescriptionDuration: (val: string | ((prev: string) => string)) => void;
	prescriptionSafetyNotes: string;
	setPrescriptionSafetyNotes: (
		val: string | ((prev: string) => string),
	) => void;
	prescriptionUrgentContactReason: string;
	setPrescriptionUrgentContactReason: (
		val: string | ((prev: string) => string),
	) => void;
	labWorkType: string;
	setLabWorkType: (val: string | ((prev: string) => string)) => void;
	labTeethOrArea: string;
	setLabTeethOrArea: (val: string | ((prev: string) => string)) => void;
	labMaterial: string;
	setLabMaterial: (val: string | ((prev: string) => string)) => void;
	labShade: string;
	setLabShade: (val: string | ((prev: string) => string)) => void;
	labSource: string;
	setLabSource: (val: string | ((prev: string) => string)) => void;
	labDeadline: string;
	setLabDeadline: (val: string | ((prev: string) => string)) => void;
	labTechnicianNotes: string;
	setLabTechnicianNotes: (val: string | ((prev: string) => string)) => void;
	xrayStudyType: XrayCbctReferralStudyType;
	setXrayStudyType: (
		val:
			| XrayCbctReferralStudyType
			| ((prev: XrayCbctReferralStudyType) => XrayCbctReferralStudyType),
	) => void;
	xrayArea: string;
	setXrayArea: (val: string | ((prev: string) => string)) => void;
	xrayClinicalQuestion: string;
	setXrayClinicalQuestion: (val: string | ((prev: string) => string)) => void;
	xrayIndication: string;
	setXrayIndication: (val: string | ((prev: string) => string)) => void;
	xrayPregnancyStatus: XrayCbctReferralPregnancyStatus;
	setXrayPregnancyStatus: (
		val:
			| XrayCbctReferralPregnancyStatus
			| ((
					prev: XrayCbctReferralPregnancyStatus,
			  ) => XrayCbctReferralPregnancyStatus),
	) => void;
	xraySafetyNotes: string;
	setXraySafetyNotes: (val: string | ((prev: string) => string)) => void;
	xrayPriority: XrayCbctReferralPriority;
	setXrayPriority: (
		val:
			| XrayCbctReferralPriority
			| ((prev: XrayCbctReferralPriority) => XrayCbctReferralPriority),
	) => void;
	xrayIncludeDicomExport: boolean;
	setXrayIncludeDicomExport: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	xrayIncludeRadiologistReport: boolean;
	setXrayIncludeRadiologistReport: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	xrayRequestedBy: string;
	setXrayRequestedBy: (val: string | ((prev: string) => string)) => void;
	xrayRecipientClinic: string;
	setXrayRecipientClinic: (val: string | ((prev: string) => string)) => void;
	xrayDueDate: string;
	setXrayDueDate: (val: string | ((prev: string) => string)) => void;
	legacyDraftFields?: Record<string, unknown> | undefined;
	setLegacyDraftFields?: (
		val:
			| Record<string, unknown>
			| undefined
			| ((
					prev: Record<string, unknown> | undefined,
			  ) => Record<string, unknown> | undefined),
	) => void;
}
