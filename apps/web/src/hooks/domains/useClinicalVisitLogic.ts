import type { PostVisitCareTopic } from "@dental/shared";
import { postVisitCarePresets } from "../../postVisitCareData";
import { useAppStore } from "../../store/appStore";
import { useDocumentStore } from "../../store/documentStore";

export function useClinicalVisitLogic() {
	// 1. Odontogram Surface option (from useAppStore)
	const { odontogramUseSurfaces, setOdontogramUseSurfaces } = useAppStore();

	// 2. Treatment Plan, Acceptance, Record Extract, Post Visit Care Plan (from useDocumentStore)
	const {
		// Treatment Plan & Clinical Tooth Rows
		clinicalToothRowsText,
		setClinicalToothRowsText,
		treatmentPlanClinicalReason,
		setTreatmentPlanClinicalReason,
		treatmentPlanDiagnosisSummary,
		setTreatmentPlanDiagnosisSummary,
		treatmentPlanTeethOrArea,
		setTreatmentPlanTeethOrArea,
		treatmentPlanGoals,
		setTreatmentPlanGoals,
		treatmentPlanStages,
		setTreatmentPlanStages,
		treatmentPlanEstimatedTotalRub,
		setTreatmentPlanEstimatedTotalRub,
		treatmentPlanAlternatives,
		setTreatmentPlanAlternatives,
		treatmentPlanRisks,
		setTreatmentPlanRisks,
		treatmentPlanPrognosis,
		setTreatmentPlanPrognosis,
		treatmentPlanControlPlan,
		setTreatmentPlanControlPlan,
		treatmentPlanDoctorFullName,
		setTreatmentPlanDoctorFullName,
		treatmentPlanPlannedAt,
		setTreatmentPlanPlannedAt,
		treatmentPlanQuestionsAnswered,
		setTreatmentPlanQuestionsAnswered,
		treatmentPlanSeparateConsentAcknowledged,
		setTreatmentPlanSeparateConsentAcknowledged,
		treatmentPlanNewApprovalAcknowledged,
		setTreatmentPlanNewApprovalAcknowledged,

		// Treatment Acceptance
		treatmentAcceptanceVariant,
		setTreatmentAcceptanceVariant,
		treatmentAcceptanceClinicalGoal,
		setTreatmentAcceptanceClinicalGoal,
		treatmentAcceptanceDiagnosisSummary,
		setTreatmentAcceptanceDiagnosisSummary,
		treatmentAcceptanceTeethOrArea,
		setTreatmentAcceptanceTeethOrArea,
		treatmentAcceptanceStages,
		setTreatmentAcceptanceStages,
		treatmentAcceptanceEstimatedTotalRub,
		setTreatmentAcceptanceEstimatedTotalRub,
		treatmentAcceptanceEstimateValidUntil,
		setTreatmentAcceptanceEstimateValidUntil,
		treatmentAcceptancePaymentTerms,
		setTreatmentAcceptancePaymentTerms,
		treatmentAcceptanceRejectedAlternatives,
		setTreatmentAcceptanceRejectedAlternatives,
		treatmentAcceptanceRisks,
		setTreatmentAcceptanceRisks,
		treatmentAcceptanceWarrantyTerms,
		setTreatmentAcceptanceWarrantyTerms,
		treatmentAcceptanceDoctorFullName,
		setTreatmentAcceptanceDoctorFullName,
		treatmentAcceptanceAcceptedAt,
		setTreatmentAcceptanceAcceptedAt,
		treatmentAcceptanceQuestionsAnswered,
		setTreatmentAcceptanceQuestionsAnswered,
		treatmentAcceptanceAlternativesUnderstood,
		setTreatmentAcceptanceAlternativesUnderstood,
		treatmentAcceptanceCostChangeUnderstood,
		setTreatmentAcceptanceCostChangeUnderstood,
		treatmentAcceptanceRevisionAcknowledged,
		setTreatmentAcceptanceRevisionAcknowledged,

		// Clinical Record Extract / Anamnesis / Objective Status
		recordExtractPeriodStart,
		setRecordExtractPeriodStart,
		recordExtractPeriodEnd,
		setRecordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		setRecordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		setRecordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		setRecordExtractObjectiveStatus,
		recordExtractDiagnosis,
		setRecordExtractDiagnosis,
		recordExtractTreatmentProvided,
		setRecordExtractTreatmentProvided,
		recordExtractRecommendations,
		setRecordExtractRecommendations,
		recordExtractDoctorFullName,
		setRecordExtractDoctorFullName,
		recordExtractRecipientFullName,
		setRecordExtractRecipientFullName,
		recordExtractRecipientAuthority,
		setRecordExtractRecipientAuthority,
		recordExtractIssuedAt,
		setRecordExtractIssuedAt,
		recordExtractPreparedFromSignedRecords,
		setRecordExtractPreparedFromSignedRecords,
		recordExtractThirdPartyDataChecked,
		setRecordExtractThirdPartyDataChecked,

		// Post Visit Care Plan
		postVisitCareTopic,
		setPostVisitCareTopic,
		postVisitProcedureName,
		setPostVisitProcedureName,
		postVisitToothOrArea,
		setPostVisitToothOrArea,
		postVisitPerformedAt,
		setPostVisitPerformedAt,
		postVisitDoctorFullName,
		setPostVisitDoctorFullName,
		postVisitManualEdited,
		setPostVisitManualEdited,
		postVisitPresetFeedback,
		setPostVisitPresetFeedback,
		postVisitAllowedAfter,
		setPostVisitAllowedAfter,
		postVisitRestrictions,
		setPostVisitRestrictions,
		postVisitMedicationAndRinsePlan,
		setPostVisitMedicationAndRinsePlan,
		postVisitHygieneInstructions,
		setPostVisitHygieneInstructions,
		postVisitNutritionInstructions,
		setPostVisitNutritionInstructions,
		postVisitUrgentWarningSigns,
		setPostVisitUrgentWarningSigns,
		postVisitFollowUpAt,
		setPostVisitFollowUpAt,
		postVisitClinicContactInstruction,
		setPostVisitClinicContactInstruction,
		postVisitTelegramSummary,
		setPostVisitTelegramSummary,
		postVisitPrintedCopyReceived,
		setPostVisitPrintedCopyReceived,
		postVisitUrgentSignsUnderstood,
		setPostVisitUrgentSignsUnderstood,
		postVisitTelegramSafe,
		setPostVisitTelegramSafe,
	} = useDocumentStore();

	const applyPostVisitCarePreset = (topic: PostVisitCareTopic) => {
		const preset = postVisitCarePresets[topic];
		if (!preset) return;
		setPostVisitCareTopic(topic);
		setPostVisitProcedureName(preset.procedureName);
		setPostVisitAllowedAfter(preset.allowedAfter);
		setPostVisitRestrictions(preset.temporaryRestrictions);
		setPostVisitMedicationAndRinsePlan(preset.medicationAndRinsePlan);
		setPostVisitHygieneInstructions(preset.hygieneInstructions);
		setPostVisitNutritionInstructions(preset.nutritionInstructions);
		setPostVisitUrgentWarningSigns(preset.urgentWarningSigns);
		setPostVisitFollowUpAt(preset.plannedFollowUpAt);
		setPostVisitTelegramSummary(preset.telegramSummary);
		setPostVisitManualEdited(false);
	};

	const resetClinicalVisitForm = () => {
		setClinicalToothRowsText("");
		setTreatmentPlanClinicalReason("");
		setTreatmentPlanDiagnosisSummary("");
		setTreatmentPlanTeethOrArea("");
		setTreatmentPlanGoals("");
		setTreatmentPlanStages("");
		setTreatmentPlanEstimatedTotalRub("");
		setTreatmentPlanAlternatives("");
		setTreatmentPlanRisks("");
		setTreatmentPlanPrognosis("");
		setTreatmentPlanControlPlan("");
		setTreatmentPlanDoctorFullName("");
		setTreatmentPlanPlannedAt("");
		setTreatmentPlanQuestionsAnswered(false);
		setTreatmentPlanSeparateConsentAcknowledged(false);
		setTreatmentPlanNewApprovalAcknowledged(false);
	};

	return {
		// Odontogram Surface Option
		odontogramUseSurfaces,
		setOdontogramUseSurfaces,

		// Treatment Plan & Clinical Tooth Rows
		clinicalToothRowsText,
		setClinicalToothRowsText,
		treatmentPlanClinicalReason,
		setTreatmentPlanClinicalReason,
		treatmentPlanDiagnosisSummary,
		setTreatmentPlanDiagnosisSummary,
		treatmentPlanTeethOrArea,
		setTreatmentPlanTeethOrArea,
		treatmentPlanGoals,
		setTreatmentPlanGoals,
		treatmentPlanStages,
		setTreatmentPlanStages,
		treatmentPlanEstimatedTotalRub,
		setTreatmentPlanEstimatedTotalRub,
		treatmentPlanAlternatives,
		setTreatmentPlanAlternatives,
		treatmentPlanRisks,
		setTreatmentPlanRisks,
		treatmentPlanPrognosis,
		setTreatmentPlanPrognosis,
		treatmentPlanControlPlan,
		setTreatmentPlanControlPlan,
		treatmentPlanDoctorFullName,
		setTreatmentPlanDoctorFullName,
		treatmentPlanPlannedAt,
		setTreatmentPlanPlannedAt,
		treatmentPlanQuestionsAnswered,
		setTreatmentPlanQuestionsAnswered,
		treatmentPlanSeparateConsentAcknowledged,
		setTreatmentPlanSeparateConsentAcknowledged,
		treatmentPlanNewApprovalAcknowledged,
		setTreatmentPlanNewApprovalAcknowledged,

		// Treatment Acceptance
		treatmentAcceptanceVariant,
		setTreatmentAcceptanceVariant,
		treatmentAcceptanceClinicalGoal,
		setTreatmentAcceptanceClinicalGoal,
		treatmentAcceptanceDiagnosisSummary,
		setTreatmentAcceptanceDiagnosisSummary,
		treatmentAcceptanceTeethOrArea,
		setTreatmentAcceptanceTeethOrArea,
		treatmentAcceptanceStages,
		setTreatmentAcceptanceStages,
		treatmentAcceptanceEstimatedTotalRub,
		setTreatmentAcceptanceEstimatedTotalRub,
		treatmentAcceptanceEstimateValidUntil,
		setTreatmentAcceptanceEstimateValidUntil,
		treatmentAcceptancePaymentTerms,
		setTreatmentAcceptancePaymentTerms,
		treatmentAcceptanceRejectedAlternatives,
		setTreatmentAcceptanceRejectedAlternatives,
		treatmentAcceptanceRisks,
		setTreatmentAcceptanceRisks,
		treatmentAcceptanceWarrantyTerms,
		setTreatmentAcceptanceWarrantyTerms,
		treatmentAcceptanceDoctorFullName,
		setTreatmentAcceptanceDoctorFullName,
		treatmentAcceptanceAcceptedAt,
		setTreatmentAcceptanceAcceptedAt,
		treatmentAcceptanceQuestionsAnswered,
		setTreatmentAcceptanceQuestionsAnswered,
		treatmentAcceptanceAlternativesUnderstood,
		setTreatmentAcceptanceAlternativesUnderstood,
		treatmentAcceptanceCostChangeUnderstood,
		setTreatmentAcceptanceCostChangeUnderstood,
		treatmentAcceptanceRevisionAcknowledged,
		setTreatmentAcceptanceRevisionAcknowledged,

		// Clinical Record Extract / Anamnesis / Objective Status
		recordExtractPeriodStart,
		setRecordExtractPeriodStart,
		recordExtractPeriodEnd,
		setRecordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		setRecordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		setRecordExtractComplaintAndAnamnesis,
		recordExtractComplaintAndAnamnesisValue: recordExtractComplaintAndAnamnesis,
		setRecordExtractComplaintAndAnamnesisValue:
			setRecordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		setRecordExtractObjectiveStatus,
		recordExtractObjectiveStatusValue: recordExtractObjectiveStatus,
		setRecordExtractObjectiveStatusValue: setRecordExtractObjectiveStatus,
		recordExtractDiagnosis,
		setRecordExtractDiagnosis,
		recordExtractDiagnosisValue: recordExtractDiagnosis,
		setRecordExtractDiagnosisValue: setRecordExtractDiagnosis,
		recordExtractTreatmentProvided,
		setRecordExtractTreatmentProvided,
		recordExtractTreatmentProvidedValue: recordExtractTreatmentProvided,
		setRecordExtractTreatmentProvidedValue: setRecordExtractTreatmentProvided,
		recordExtractRecommendations,
		setRecordExtractRecommendations,
		recordExtractDoctorFullName,
		setRecordExtractDoctorFullName,
		recordExtractRecipientFullName,
		setRecordExtractRecipientFullName,
		recordExtractRecipientAuthority,
		setRecordExtractRecipientAuthority,
		recordExtractIssuedAt,
		setRecordExtractIssuedAt,
		recordExtractPreparedFromSignedRecords,
		setRecordExtractPreparedFromSignedRecords,
		recordExtractThirdPartyDataChecked,
		setRecordExtractThirdPartyDataChecked,

		// Post Visit Care Plan
		postVisitCareTopic,
		setPostVisitCareTopic,
		postVisitProcedureName,
		setPostVisitProcedureName,
		postVisitToothOrArea,
		setPostVisitToothOrArea,
		postVisitPerformedAt,
		setPostVisitPerformedAt,
		postVisitDoctorFullName,
		setPostVisitDoctorFullName,
		postVisitManualEdited,
		setPostVisitManualEdited,
		postVisitPresetFeedback,
		setPostVisitPresetFeedback,
		postVisitAllowedAfter,
		setPostVisitAllowedAfter,
		postVisitRestrictions,
		setPostVisitRestrictions,
		postVisitMedicationAndRinsePlan,
		setPostVisitMedicationAndRinsePlan,
		postVisitHygieneInstructions,
		setPostVisitHygieneInstructions,
		postVisitNutritionInstructions,
		setPostVisitNutritionInstructions,
		postVisitUrgentWarningSigns,
		setPostVisitUrgentWarningSigns,
		postVisitFollowUpAt,
		setPostVisitFollowUpAt,
		postVisitClinicContactInstruction,
		setPostVisitClinicContactInstruction,
		postVisitTelegramSummary,
		setPostVisitTelegramSummary,
		postVisitPrintedCopyReceived,
		setPostVisitPrintedCopyReceived,
		postVisitUrgentSignsUnderstood,
		setPostVisitUrgentSignsUnderstood,
		postVisitTelegramSafe,
		setPostVisitTelegramSafe,

		// Helper Functions
		applyPostVisitCarePreset,
		resetClinicalVisitForm,
	};
}

export type UseClinicalVisitLogicReturn = ReturnType<
	typeof useClinicalVisitLogic
>;
