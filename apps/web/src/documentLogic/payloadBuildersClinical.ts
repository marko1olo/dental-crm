import type { DocumentPayload, GeneratedDocument } from "@dental/shared";
import type { DocumentState } from "./types";

export function buildClinicalPayload(
	kind: GeneratedDocument["kind"],
	state: DocumentState,
): DocumentPayload | null {
	if (kind === "treatment_plan") {
		const {
			treatmentPlanClinicalReasonValue,
			treatmentPlanDiagnosisSummaryValue,
			treatmentPlanTeethOrAreaValue,
			clinicalToothRowsValue,
			treatmentPlanGoals,
			treatmentPlanStageRows,
			treatmentPlanTotalRubValue,
			treatmentPlanAlternatives,
			treatmentPlanRisks,
			treatmentPlanPrognosis,
			treatmentPlanControlPlan,
			treatmentPlanDoctorFullNameValue,
			treatmentPlanPlannedAt,
			treatmentPlanQuestionsAnswered,
			treatmentPlanSeparateConsentAcknowledged,
			treatmentPlanNewApprovalAcknowledged,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			treatmentPlan: {
				clinicalReason: treatmentPlanClinicalReasonValue(),
				diagnosisSummary: treatmentPlanDiagnosisSummaryValue(),
				teethOrArea: treatmentPlanTeethOrAreaValue(),
				clinicalToothRows: clinicalToothRowsValue(),
				treatmentGoals: documentTextLines(treatmentPlanGoals),
				plannedStages: treatmentPlanStageRows(),
				estimatedTotalRub: treatmentPlanTotalRubValue(),
				alternatives: documentTextLines(treatmentPlanAlternatives),
				risksAndLimitations: documentTextLines(treatmentPlanRisks),
				prognosisAndLimits: treatmentPlanPrognosis.trim(),
				controlPlan: treatmentPlanControlPlan.trim(),
				doctorFullName: treatmentPlanDoctorFullNameValue(),
				plannedAt: treatmentPlanPlannedAt.trim(),
				patientQuestionsAnswered: confirmedDocumentLiteral(
					treatmentPlanQuestionsAnswered,
					"вопросы пациента по плану лечения закрыты",
				),
				planRequiresSeparateConsent: confirmedDocumentLiteral(
					treatmentPlanSeparateConsentAcknowledged,
					"план не заменяет отдельное согласие",
				),
				planRequiresNewApprovalOnChange: confirmedDocumentLiteral(
					treatmentPlanNewApprovalAcknowledged,
					"изменение плана требует нового согласования",
				),
			},
		};
	}

	if (kind === "treatment_plan_acceptance") {
		const {
			treatmentAcceptanceVariant,
			treatmentAcceptanceClinicalGoal,
			treatmentAcceptanceDiagnosisSummary,
			dashboard,
			treatmentAcceptanceTeethOrArea,
			inferredTreatmentArea,
			clinicalToothRowsValue,
			treatmentAcceptanceStageRows,
			treatmentAcceptanceTotalRubValue,
			treatmentAcceptanceEstimateValidUntil,
			treatmentAcceptancePaymentTerms,
			treatmentAcceptanceRejectedAlternatives,
			treatmentAcceptanceRisks,
			treatmentAcceptanceWarrantyTerms,
			treatmentAcceptanceDoctorFullName,
			activeDoctor,
			treatmentAcceptanceAcceptedAt,
			treatmentAcceptanceQuestionsAnswered,
			treatmentAcceptanceAlternativesUnderstood,
			treatmentAcceptanceCostChangeUnderstood,
			treatmentAcceptanceRevisionAcknowledged,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			treatmentPlanAcceptance: {
				selectedVariant: treatmentAcceptanceVariant,
				clinicalGoal: treatmentAcceptanceClinicalGoal.trim(),
				diagnosisSummary:
					treatmentAcceptanceDiagnosisSummary.trim() ||
					dashboard?.activeVisit?.diagnosis ||
					dashboard?.activeVisit?.complaint ||
					"",
				teethOrArea:
					treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "",
				clinicalToothRows: clinicalToothRowsValue(),
				acceptedStages: treatmentAcceptanceStageRows(),
				estimatedTotalRub: treatmentAcceptanceTotalRubValue(),
				estimateValidUntil: treatmentAcceptanceEstimateValidUntil.trim(),
				paymentTerms: treatmentAcceptancePaymentTerms.trim(),
				rejectedAlternatives: documentTextLines(
					treatmentAcceptanceRejectedAlternatives,
				),
				risksAndLimitations: documentTextLines(treatmentAcceptanceRisks),
				warrantyAndControlTerms: treatmentAcceptanceWarrantyTerms.trim(),
				doctorFullName:
					treatmentAcceptanceDoctorFullName.trim() ||
					activeDoctor?.fullName ||
					"",
				acceptedAt: treatmentAcceptanceAcceptedAt.trim(),
				patientQuestionsAnswered: confirmedDocumentLiteral(
					treatmentAcceptanceQuestionsAnswered,
					"вопросы пациента по согласованию плана закрыты",
				),
				patientUnderstandsAlternatives: confirmedDocumentLiteral(
					treatmentAcceptanceAlternativesUnderstood,
					"альтернативы плана понятны",
				),
				patientUnderstandsCostMayChange: confirmedDocumentLiteral(
					treatmentAcceptanceCostChangeUnderstood,
					"изменение стоимости понятно",
				),
				revisionRequiresNewApproval: confirmedDocumentLiteral(
					treatmentAcceptanceRevisionAcknowledged,
					"пересмотр плана требует нового согласования",
				),
			},
		};
	}

	if (kind === "post_visit_recommendations") {
		const {
			postVisitCareTopic,
			postVisitProcedureNameValue,
			postVisitToothOrAreaValue,
			postVisitPerformedAt,
			postVisitDoctorFullNameValue,
			postVisitAllowedAfter,
			postVisitRestrictions,
			postVisitMedicationAndRinsePlan,
			postVisitHygieneInstructions,
			postVisitNutritionInstructions,
			postVisitUrgentWarningSigns,
			postVisitFollowUpAt,
			postVisitClinicContactInstruction,
			postVisitTelegramSummary,
			postVisitPrintedCopyReceived,
			postVisitUrgentSignsUnderstood,
			postVisitTelegramSafe,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			postVisitRecommendations: {
				careTopic: postVisitCareTopic,
				procedureName: postVisitProcedureNameValue(),
				toothOrArea: postVisitToothOrAreaValue(),
				performedAt: postVisitPerformedAt.trim(),
				doctorFullName: postVisitDoctorFullNameValue(),
				allowedAfter: documentTextLines(postVisitAllowedAfter),
				temporaryRestrictions: documentTextLines(postVisitRestrictions),
				medicationAndRinsePlan: documentTextLines(
					postVisitMedicationAndRinsePlan,
				),
				hygieneInstructions: documentTextLines(postVisitHygieneInstructions),
				nutritionInstructions: documentTextLines(
					postVisitNutritionInstructions,
				),
				urgentWarningSigns: documentTextLines(postVisitUrgentWarningSigns),
				plannedFollowUpAt: postVisitFollowUpAt.trim() || null,
				clinicContactInstruction: postVisitClinicContactInstruction.trim(),
				telegramSummary: postVisitTelegramSummary.trim(),
				patientReceivedPrintedCopy: confirmedDocumentLiteral(
					postVisitPrintedCopyReceived,
					"пациент получил памятку",
				),
				patientUnderstandsUrgentSigns: confirmedDocumentLiteral(
					postVisitUrgentSignsUnderstood,
					"тревожные признаки понятны",
				),
				safeForTelegramSending: confirmedDocumentLiteral(
					postVisitTelegramSafe,
					"Telegram-текст проверен",
				),
			},
		};
	}

	if (kind === "prescription_medication_order") {
		const {
			clinicalToothRowsValue,
			prescriptionMedication,
			prescriptionDosage,
			prescriptionInstructions,
			prescriptionDuration,
			prescriptionSafetyNotes,
			prescriptionUrgentContactReason,
			documentTextLines,
		} = state;
		return {
			prescriptionMedicationOrder: {
				clinicalToothRows: clinicalToothRowsValue(),
				medications: [
					{
						medication: prescriptionMedication.trim(),
						dosage: prescriptionDosage.trim(),
						instructions: prescriptionInstructions.trim(),
						duration: prescriptionDuration.trim(),
					},
				],
				safetyNotes: documentTextLines(prescriptionSafetyNotes),
				urgentContactReason: prescriptionUrgentContactReason.trim(),
			},
		};
	}

	if (kind === "lab_work_order") {
		const {
			clinicalToothRowsValue,
			labWorkType,
			labTeethOrArea,
			labMaterial,
			labShade,
			labSource,
			labDeadline,
			labTechnicianNotes,
		} = state;
		return {
			labWorkOrder: {
				clinicalToothRows: clinicalToothRowsValue(),
				workType: labWorkType.trim(),
				teethOrArea: labTeethOrArea.trim(),
				material: labMaterial.trim(),
				shade: labShade.trim(),
				source: labSource.trim(),
				deadline: labDeadline.trim(),
				technicianNotes: labTechnicianNotes.trim() || null,
			},
		};
	}

	if (kind === "xray_cbct_referral") {
		const {
			xrayStudyType,
			clinicalToothRowsValue,
			xrayArea,
			xrayClinicalQuestion,
			xrayIndication,
			xrayPregnancyStatus,
			xraySafetyNotes,
			xrayPriority,
			xrayIncludeDicomExport,
			xrayIncludeRadiologistReport,
			xrayRequestedBy,
			activeDoctor,
			xrayRecipientClinic,
			xrayDueDate,
		} = state;
		return {
			xrayCbctReferral: {
				studyType: xrayStudyType,
				clinicalToothRows: clinicalToothRowsValue(),
				area: xrayArea.trim(),
				clinicalQuestion: xrayClinicalQuestion.trim(),
				indication: xrayIndication.trim(),
				pregnancyStatus: xrayPregnancyStatus,
				safetyNotes: xraySafetyNotes.trim(),
				priority: xrayPriority,
				includeDicomExport: xrayIncludeDicomExport,
				includeRadiologistReport: xrayIncludeRadiologistReport,
				requestedBy:
					xrayRequestedBy.trim() || activeDoctor?.fullName || "лечащий врач",
				recipientClinic: xrayRecipientClinic.trim() || null,
				dueDate: xrayDueDate.trim() || null,
			},
		};
	}

	if (kind === "dental_medical_card_043u") {
		const { dentalMedicalCard043uPayloadValue } = state;
		return {
			dentalMedicalCard043u: dentalMedicalCard043uPayloadValue(),
		};
	}

	if (kind === "medical_record_extract") {
		const {
			recordExtractSourceVisitIds,
			dashboard,
			recordExtractPeriodStart,
			recordExtractPeriodEnd,
			recordExtractComplaintAndAnamnesisValue,
			recordExtractObjectiveStatusValue,
			recordExtractDiagnosisValue,
			clinicalToothRowsValue,
			recordExtractTreatmentProvidedValue,
			recordExtractRecommendations,
			recordExtractDoctorFullName,
			activeDoctor,
			recordExtractRecipientFullName,
			documentPatient,
			recordExtractRecipientAuthority,
			recordExtractIssuedAt,
			recordExtractPreparedFromSignedRecords,
			recordExtractThirdPartyDataChecked,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
		return {
			medicalRecordExtract: {
				periodStart: recordExtractPeriodStart.trim(),
				periodEnd: recordExtractPeriodEnd.trim(),
				sourceVisitIds: sourceVisitIds.length
					? sourceVisitIds
					: [dashboard?.activeVisit?.id ?? "текущий визит"],
				complaintAndAnamnesis: recordExtractComplaintAndAnamnesisValue(),
				objectiveStatus: recordExtractObjectiveStatusValue(),
				diagnosis: recordExtractDiagnosisValue(),
				clinicalToothRows: clinicalToothRowsValue(),
				treatmentProvided: recordExtractTreatmentProvidedValue(),
				recommendations: recordExtractRecommendations.trim(),
				doctorFullName:
					recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
				recipientFullName:
					recordExtractRecipientFullName.trim() ||
					documentPatient?.fullName ||
					"",
				recipientAuthority: recordExtractRecipientAuthority.trim(),
				issuedAt: recordExtractIssuedAt.trim(),
				preparedFromSignedMedicalRecords: confirmedDocumentLiteral(
					recordExtractPreparedFromSignedRecords,
					"выписка подготовлена из подписанных записей",
				),
				thirdPartyDataChecked: confirmedDocumentLiteral(
					recordExtractThirdPartyDataChecked,
					"данные третьих лиц проверены",
				),
			},
		};
	}

	if (kind === "medical_record_copy_request") {
		const {
			copyRequestDocumentTypes,
			copyRequestPeriodStart,
			copyRequestPeriodEnd,
			copyRequestFormat,
			copyRequestRecipientFullName,
			documentPatient,
			copyRequestRecipientIdentityDocument,
			copyRequestRecipientAuthority,
			copyRequestRepresentativeAuthorityDocument,
			copyRequestRequestedAt,
			copyRequestContactForDelivery,
			copyRequestSpecialInstructions,
			copyRequestIncludeDicomSourceData,
			copyRequestIdentityVerified,
			copyRequestThirdPartyDataChecked,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			medicalRecordCopyRequest: {
				requestedDocumentTypes: documentTextLines(copyRequestDocumentTypes),
				periodStart: copyRequestPeriodStart.trim() || null,
				periodEnd: copyRequestPeriodEnd.trim() || null,
				requestedFormat: copyRequestFormat,
				recipientFullName:
					copyRequestRecipientFullName.trim() ||
					documentPatient?.fullName ||
					"",
				recipientIdentityDocument: copyRequestRecipientIdentityDocument.trim(),
				recipientAuthority: copyRequestRecipientAuthority.trim(),
				representativeAuthorityDocument:
					copyRequestRepresentativeAuthorityDocument.trim() || null,
				requestedAt: copyRequestRequestedAt.trim(),
				contactForDelivery: copyRequestContactForDelivery.trim(),
				specialInstructions: copyRequestSpecialInstructions.trim() || null,
				includeDicomSourceData: copyRequestIncludeDicomSourceData,
				identityVerified: confirmedDocumentLiteral(
					copyRequestIdentityVerified,
					"личность получателя запроса проверена",
				),
				thirdPartyDataExclusionAcknowledged: confirmedDocumentLiteral(
					copyRequestThirdPartyDataChecked,
					"исключение данных третьих лиц подтверждено",
				),
			},
		};
	}

	if (kind === "visit_attendance_certificate") {
		const {
			attendanceStartedAtValue,
			attendanceEndedAtValue,
			attendancePurpose,
			attendanceRecipientOrganization,
			attendanceIssuedAt,
			attendanceSignedByValue,
			attendanceSignedByRole,
			attendanceDiagnosisDisclosureExcluded,
			attendanceNotSickLeaveAcknowledged,
			confirmedDocumentLiteral,
		} = state;
		return {
			visitAttendanceCertificate: {
				attendedAtStart: attendanceStartedAtValue(),
				attendedAtEnd: attendanceEndedAtValue(),
				purpose: attendancePurpose.trim(),
				recipientOrganization: attendanceRecipientOrganization.trim() || null,
				issuedAt: attendanceIssuedAt.trim(),
				signedByFullName: attendanceSignedByValue(),
				signedByRole: attendanceSignedByRole.trim(),
				diagnosisDisclosureExcluded: confirmedDocumentLiteral(
					attendanceDiagnosisDisclosureExcluded,
					"диагноз не раскрывается в справке посещения",
				),
				notSickLeaveAcknowledged: confirmedDocumentLiteral(
					attendanceNotSickLeaveAcknowledged,
					"справка не заменяет больничный",
				),
			},
		};
	}

	if (kind === "medical_document_release_receipt") {
		const {
			selectedReleaseSourceRequestDocumentId,
			releaseRecipientFullName,
			releaseRecipientIdentityDocument,
			releaseRecipientAuthority,
			releaseDocumentTypes,
			releasePeriodStart,
			releasePeriodEnd,
			releaseDeliveredAt,
			releaseAccessExpiresAt,
			releaseProtectionNote,
			releaseThirdPartyDataChecked,
			documentTextLines,
			confirmedDocumentLiteral,
		} = state;
		return {
			medicalDocumentReleaseReceipt: {
				sourceRequestDocumentId: selectedReleaseSourceRequestDocumentId,
				recipientFullName: releaseRecipientFullName.trim(),
				recipientIdentityDocument: releaseRecipientIdentityDocument.trim(),
				recipientAuthority: releaseRecipientAuthority.trim(),
				releaseChannel: state.releaseChannel,
				documentTypes: documentTextLines(releaseDocumentTypes),
				periodStart: releasePeriodStart.trim() || null,
				periodEnd: releasePeriodEnd.trim() || null,
				deliveredAt: releaseDeliveredAt.trim(),
				accessExpiresAt: releaseAccessExpiresAt.trim() || null,
				deliveryProtectionNote: releaseProtectionNote.trim(),
				thirdPartyDataChecked: confirmedDocumentLiteral(
					releaseThirdPartyDataChecked,
					"лишние данные третьих лиц исключены",
				),
			},
		};
	}

	return null;
}
