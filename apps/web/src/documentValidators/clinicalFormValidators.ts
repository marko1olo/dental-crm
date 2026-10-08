import { requiredDocumentField as defaultRequiredDocumentField } from "./regexRules";
import type { DocumentState, ValidationResult } from "./types";

export function validateTreatmentPlan(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		clinicalToothRowsValue,
		treatmentPlanClinicalReasonValue,
		treatmentPlanDiagnosisSummaryValue,
		treatmentPlanTeethOrAreaValue,
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
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			treatmentPlanClinicalReasonValue(),
			"план лечения, повод обращения",
		) ??
		requiredDocumentField(
			treatmentPlanDiagnosisSummaryValue(),
			"план лечения, диагноз или клиническое основание",
		) ??
		requiredDocumentField(
			treatmentPlanTeethOrAreaValue(),
			"план лечения, зубы или область",
		) ??
		(clinicalToothRowsValue().length
			? null
			: "Добавьте клинические строки по зубам или сегментам.") ??
		(documentTextLines(treatmentPlanGoals).length
			? null
			: "Добавьте цели лечения.") ??
		(treatmentPlanStageRows().length
			? null
			: "Добавьте этапы плана лечения.") ??
		(treatmentPlanTotalRubValue() > 0
			? null
			: "Укажите ориентировочную стоимость плана лечения.") ??
		(documentTextLines(treatmentPlanAlternatives).length
			? null
			: "Добавьте альтернативы плана лечения.") ??
		(documentTextLines(treatmentPlanRisks).length
			? null
			: "Добавьте риски и ограничения плана лечения.") ??
		requiredDocumentField(
			treatmentPlanPrognosis,
			"план лечения, прогноз и ограничения",
		) ??
		requiredDocumentField(treatmentPlanControlPlan, "план лечения, контроль") ??
		requiredDocumentField(
			treatmentPlanDoctorFullNameValue(),
			"план лечения, врач",
		) ??
		requiredDocumentField(treatmentPlanPlannedAt, "план лечения, дата") ??
		(treatmentPlanQuestionsAnswered
			? null
			: "Подтвердите, что пациент получил ответы на вопросы.") ??
		(treatmentPlanSeparateConsentAcknowledged
			? null
			: "Подтвердите, что план не заменяет отдельное согласие.") ??
		(treatmentPlanNewApprovalAcknowledged
			? null
			: "Подтвердите, что изменение плана требует нового согласования.")
	);
}

export function validateTreatmentPlanAcceptance(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		inferredTreatmentArea,
		dashboard,
		activeDoctor,
		clinicalToothRowsValue,
		treatmentAcceptanceClinicalGoal,
		treatmentAcceptanceDiagnosisSummary,
		treatmentAcceptanceTeethOrArea,
		treatmentAcceptanceStageRows,
		treatmentAcceptanceTotalRubValue,
		treatmentAcceptanceEstimateValidUntil,
		treatmentAcceptancePaymentTerms,
		treatmentAcceptanceRejectedAlternatives,
		treatmentAcceptanceRisks,
		treatmentAcceptanceWarrantyTerms,
		treatmentAcceptanceDoctorFullName,
		treatmentAcceptanceAcceptedAt,
		treatmentAcceptanceQuestionsAnswered,
		treatmentAcceptanceAlternativesUnderstood,
		treatmentAcceptanceCostChangeUnderstood,
		treatmentAcceptanceRevisionAcknowledged,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			treatmentAcceptanceClinicalGoal,
			"согласование плана, клиническая цель",
		) ??
		requiredDocumentField(
			treatmentAcceptanceDiagnosisSummary.trim() ||
				dashboard?.activeVisit?.diagnosis ||
				dashboard?.activeVisit?.complaint ||
				"",
			"согласование плана, диагноз или основание",
		) ??
		requiredDocumentField(
			treatmentAcceptanceTeethOrArea.trim() || inferredTreatmentArea || "",
			"согласование плана, зубы или область",
		) ??
		(clinicalToothRowsValue().length
			? null
			: "Добавьте клинические строки по зубам или сегментам.") ??
		(treatmentAcceptanceStageRows().length
			? null
			: "Добавьте этапы согласованного плана лечения.") ??
		(treatmentAcceptanceTotalRubValue() > 0
			? null
			: "Укажите ориентировочную стоимость согласованного плана.") ??
		requiredDocumentField(
			treatmentAcceptanceEstimateValidUntil,
			"согласование плана, срок действия сметы",
		) ??
		requiredDocumentField(
			treatmentAcceptancePaymentTerms,
			"согласование плана, условия оплаты",
		) ??
		(documentTextLines(treatmentAcceptanceRejectedAlternatives).length
			? null
			: "Добавьте отклоненные или отложенные альтернативы.") ??
		(documentTextLines(treatmentAcceptanceRisks).length
			? null
			: "Добавьте риски и ограничения плана.") ??
		requiredDocumentField(
			treatmentAcceptanceWarrantyTerms,
			"согласование плана, гарантия и контроль",
		) ??
		requiredDocumentField(
			treatmentAcceptanceDoctorFullName.trim() || activeDoctor?.fullName || "",
			"согласование плана, врач",
		) ??
		requiredDocumentField(
			treatmentAcceptanceAcceptedAt,
			"согласование плана, дата",
		) ??
		(treatmentAcceptanceQuestionsAnswered
			? null
			: "Подтвердите, что пациент получил ответы на вопросы.") ??
		(treatmentAcceptanceAlternativesUnderstood
			? null
			: "Подтвердите, что пациент понимает альтернативы.") ??
		(treatmentAcceptanceCostChangeUnderstood
			? null
			: "Подтвердите, что пациент понимает возможность изменения стоимости.") ??
		(treatmentAcceptanceRevisionAcknowledged
			? null
			: "Подтвердите, что существенное изменение плана требует нового согласования.")
	);
}

export function validatePostVisitRecommendations(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
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
		postVisitClinicContactInstruction,
		postVisitTelegramSummary,
		postVisitPrintedCopyReceived,
		postVisitUrgentSignsUnderstood,
		postVisitTelegramSafe,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			postVisitProcedureNameValue(),
			"рекомендации после приема, процедура",
		) ??
		requiredDocumentField(
			postVisitToothOrAreaValue(),
			"рекомендации после приема, область",
		) ??
		requiredDocumentField(
			postVisitPerformedAt,
			"рекомендации после приема, дата приема",
		) ??
		requiredDocumentField(
			postVisitDoctorFullNameValue(),
			"рекомендации после приема, врач",
		) ??
		(documentTextLines(postVisitAllowedAfter).length
			? null
			: "Добавьте, когда пациенту можно пить, есть и возвращаться к нагрузке.") ??
		(documentTextLines(postVisitRestrictions).length
			? null
			: "Добавьте временные ограничения после приема.") ??
		(documentTextLines(postVisitMedicationAndRinsePlan).length
			? null
			: "Добавьте назначения, полоскания или явно укажите, что назначений нет.") ??
		(documentTextLines(postVisitHygieneInstructions).length
			? null
			: "Добавьте правила гигиены после приема.") ??
		(documentTextLines(postVisitNutritionInstructions).length
			? null
			: "Добавьте рекомендации по питанию.") ??
		(documentTextLines(postVisitUrgentWarningSigns).length
			? null
			: "Добавьте тревожные признаки для срочной связи с клиникой.") ??
		requiredDocumentField(
			postVisitClinicContactInstruction,
			"рекомендации после приема, контакт клиники",
		) ??
		requiredDocumentField(
			postVisitTelegramSummary,
			"рекомендации после приема, краткий текст для Telegram",
		) ??
		(postVisitPrintedCopyReceived
			? null
			: "Подтвердите, что пациент получил рекомендации.") ??
		(postVisitUrgentSignsUnderstood
			? null
			: "Подтвердите, что пациент понимает тревожные признаки.") ??
		(postVisitTelegramSafe
			? null
			: "Подтвердите, что текст безопасен для Telegram и не содержит лишних медицинских подробностей.")
	);
}

export function validatePrescriptionMedicationOrder(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		clinicalToothRowsValue,
		prescriptionMedication,
		prescriptionDosage,
		prescriptionInstructions,
		prescriptionDuration,
		prescriptionSafetyNotes,
		prescriptionUrgentContactReason,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		(clinicalToothRowsValue().length
			? null
			: "Добавьте клинические строки по зубам или сегментам.") ??
		requiredDocumentField(prescriptionMedication, "назначение, препарат") ??
		requiredDocumentField(prescriptionDosage, "назначение, дозировка") ??
		requiredDocumentField(
			prescriptionInstructions,
			"назначение, режим приема",
		) ??
		requiredDocumentField(prescriptionDuration, "назначение, длительность") ??
		(documentTextLines(prescriptionSafetyNotes).length
			? null
			: "Добавьте хотя бы одну памятку пациенту для назначения.") ??
		requiredDocumentField(
			prescriptionUrgentContactReason,
			"назначение, когда срочно связаться",
		)
	);
}

export function validateLabWorkOrder(
	state: DocumentState,
): ValidationResult {
	const {
		clinicalToothRowsValue,
		labWorkType,
		labTeethOrArea,
		labMaterial,
		labShade,
		labSource,
		labDeadline,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		(clinicalToothRowsValue().length
			? null
			: "Добавьте клинические строки по зубам или сегментам.") ??
		requiredDocumentField(labWorkType, "лаборатория, вид работы") ??
		requiredDocumentField(labTeethOrArea, "лаборатория, зубы или зона") ??
		requiredDocumentField(labMaterial, "лаборатория, материал") ??
		requiredDocumentField(labShade, "лаборатория, цвет") ??
		requiredDocumentField(labSource, "лаборатория, источник данных") ??
		requiredDocumentField(labDeadline, "лаборатория, срок")
	);
}

export function validateXrayCbctReferral(
	state: DocumentState,
): ValidationResult {
	const {
		activeDoctor,
		clinicalToothRowsValue,
		xrayArea,
		xrayClinicalQuestion,
		xrayIndication,
		xraySafetyNotes,
		xrayRequestedBy,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		(clinicalToothRowsValue().length
			? null
			: "Добавьте клинические строки по зубам или сегментам.") ??
		requiredDocumentField(xrayArea, "снимок, область") ??
		requiredDocumentField(xrayClinicalQuestion, "снимок, клинический вопрос") ??
		requiredDocumentField(xrayIndication, "снимок, показание") ??
		requiredDocumentField(xraySafetyNotes, "снимок, ограничения и защита") ??
		requiredDocumentField(
			xrayRequestedBy.trim() || activeDoctor?.fullName || "",
			"снимок, назначивший врач",
		)
	);
}

export function validateDentalMedicalCard043U(
	state: DocumentState,
): ValidationResult {
	const allowBlankForPrint = Boolean(state.allowBlankForPrint);
	if (allowBlankForPrint) {
		return null;
	}
	const {
		activeDoctor,
		recordExtractPeriodEnd,
		recordExtractComplaintAndAnamnesisValue,
		recordExtractObjectiveStatusValue,
		recordExtractDiagnosisValue,
		recordExtractTreatmentProvidedValue,
		recordExtractDoctorFullName,
		documentPatient,
		clinicProfileDraft,
		requiredDocumentField = defaultRequiredDocumentField,
		dentalMedicalCard043uPayloadValue,
	} = state as DocumentState & {
		dentalMedicalCard043uPayloadValue?: () => {
			visitDate?: string | null;
			organization?: { fullName?: string | null; shortName?: string | null };
			patient?: {
				fullName?: string | null;
				medicalCardNumber?: string | null;
			};
			complaint?: string | null;
			anamnesis?: string | null;
			objectiveStatus?: string | null;
			diagnosisText?: string | null;
			treatmentDescription?: string | null;
			treatmentPlan?: string | null;
			doctor?: { fullName?: string | null };
			clinicalToothRows?: unknown[];
		};
	};

	const payload = dentalMedicalCard043uPayloadValue?.();
	const orgName =
		payload?.organization?.fullName?.trim() ||
		payload?.organization?.shortName?.trim() ||
		clinicProfileDraft?.legalName?.trim() ||
		clinicProfileDraft?.clinicName?.trim() ||
		"";
	const patientToken =
		documentPatient?.id?.slice(0, 8).toUpperCase() ?? "PATIENT";
	const cardNumber =
		payload?.patient?.medicalCardNumber?.trim() ||
		(documentPatient as { medicalCardNumber?: string; cardNumber?: string; id?: string } | undefined)?.medicalCardNumber?.trim() ||
		(documentPatient as { medicalCardNumber?: string; cardNumber?: string; id?: string } | undefined)?.cardNumber?.trim() ||
		(documentPatient?.id ? `043/у-${new Date().getFullYear()}-${patientToken}` : "");
	const visitDate = payload?.visitDate?.trim() || recordExtractPeriodEnd;
	const complaint =
		payload?.complaint?.trim() ||
		recordExtractComplaintAndAnamnesisValue()
			.split(/\n{2,}/)[0]
			?.trim() ||
		"";
	const anamnesis =
		payload?.anamnesis?.trim() || recordExtractComplaintAndAnamnesisValue();
	const objective =
		payload?.objectiveStatus?.trim() || recordExtractObjectiveStatusValue();
	const diagnosis =
		payload?.diagnosisText?.trim() || recordExtractDiagnosisValue();
	const treatment =
		payload?.treatmentDescription?.trim() ||
		payload?.treatmentPlan?.trim() ||
		recordExtractTreatmentProvidedValue() ||
		(complaint || diagnosis || objective
			? "Консультация и осмотр (лечение не проводилось / согласован план обследования и лечения)"
			: "");
	const doctorName =
		payload?.doctor?.fullName?.trim() ||
		recordExtractDoctorFullName?.trim() ||
		activeDoctor?.fullName ||
		"";
	const patientName =
		payload?.patient?.fullName?.trim() || documentPatient?.fullName || "";

	return (
		requiredDocumentField(orgName, "карта 043/у, медорганизация") ??
		requiredDocumentField(cardNumber, "карта 043/у, номер медицинской карты") ??
		requiredDocumentField(visitDate, "карта 043/у, дата приема") ??
		requiredDocumentField(patientName, "карта 043/у, пациент") ??
		requiredDocumentField(complaint, "карта 043/у, жалобы") ??
		requiredDocumentField(anamnesis, "карта 043/у, анамнез") ??
		requiredDocumentField(objective, "карта 043/у, объективный статус") ??
		requiredDocumentField(diagnosis, "карта 043/у, диагноз") ??
		requiredDocumentField(treatment, "карта 043/у, проведенное лечение") ??
		requiredDocumentField(doctorName, "карта 043/у, врач")
	);
}

export function validateMedicalRecordExtract(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		dashboard,
		activeDoctor,
		clinicalToothRowsValue,
		recordExtractSourceVisitIds,
		recordExtractPeriodStart,
		recordExtractPeriodEnd,
		recordExtractComplaintAndAnamnesisValue,
		recordExtractObjectiveStatusValue,
		recordExtractDiagnosisValue,
		recordExtractTreatmentProvidedValue,
		recordExtractRecommendations,
		recordExtractDoctorFullName,
		recordExtractRecipientFullName,
		documentPatient,
		recordExtractRecipientAuthority,
		recordExtractIssuedAt,
		recordExtractPreparedFromSignedRecords,
		recordExtractThirdPartyDataChecked,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
	return (
		requiredDocumentField(recordExtractPeriodStart, "выписка, период с") ??
		requiredDocumentField(recordExtractPeriodEnd, "выписка, период по") ??
		(sourceVisitIds.length || dashboard?.activeVisit?.id
			? null
			: "Добавьте источник медицинской записи для выписки.") ??
		requiredDocumentField(
			recordExtractComplaintAndAnamnesisValue(),
			"выписка, жалобы и анамнез",
		) ??
		requiredDocumentField(
			recordExtractObjectiveStatusValue(),
			"выписка, объективный статус",
		) ??
		requiredDocumentField(recordExtractDiagnosisValue(), "выписка, диагноз") ??
		(clinicalToothRowsValue().length
			? null
			: "Добавьте клинические строки по зубам или сегментам.") ??
		requiredDocumentField(
			recordExtractTreatmentProvidedValue(),
			"выписка, проведенное лечение",
		) ??
		requiredDocumentField(
			recordExtractRecommendations,
			"выписка, рекомендации",
		) ??
		requiredDocumentField(
			recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
			"выписка, врач",
		) ??
		requiredDocumentField(
			recordExtractRecipientFullName.trim() || documentPatient?.fullName || "",
			"выписка, получатель",
		) ??
		requiredDocumentField(
			recordExtractRecipientAuthority,
			"выписка, основание выдачи",
		) ??
		requiredDocumentField(recordExtractIssuedAt, "выписка, дата") ??
		(recordExtractPreparedFromSignedRecords
			? null
			: "Подтвердите, что выписка собрана из подписанных медицинских записей.") ??
		(recordExtractThirdPartyDataChecked
			? null
			: "Подтвердите, что лишние данные третьих лиц исключены.")
	);
}

export function validateVisitAttendanceCertificate(
	state: DocumentState,
): ValidationResult {
	const {
		attendanceStartedAtValue,
		attendanceEndedAtValue,
		attendancePurpose,
		attendanceIssuedAt,
		attendanceSignedByValue,
		attendanceSignedByRole,
		attendanceDiagnosisDisclosureExcluded,
		attendanceNotSickLeaveAcknowledged,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			attendanceStartedAtValue(),
			"справка о посещении, начало приема",
		) ??
		requiredDocumentField(
			attendanceEndedAtValue(),
			"справка о посещении, окончание приема",
		) ??
		requiredDocumentField(
			attendancePurpose,
			"справка о посещении, цель выдачи",
		) ??
		requiredDocumentField(
			attendanceIssuedAt,
			"справка о посещении, дата выдачи",
		) ??
		requiredDocumentField(
			attendanceSignedByValue(),
			"справка о посещении, подписант",
		) ??
		requiredDocumentField(
			attendanceSignedByRole,
			"справка о посещении, должность подписанта",
		) ??
		(attendanceDiagnosisDisclosureExcluded
			? null
			: "Подтвердите, что диагноз и план лечения не раскрываются в справке.") ??
		(attendanceNotSickLeaveAcknowledged
			? null
			: "Подтвердите, что справка не заменяет листок нетрудоспособности.")
	);
}

export function validateOrthodonticMedicalCard043_1U(
	state: DocumentState,
): ValidationResult {
	const {
		documentPatient,
		clinicProfileDraft,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			documentPatient?.fullName,
			"ортодонтическая карта, пациент",
		) ??
		requiredDocumentField(
			clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName,
			"ортодонтическая карта, организация",
		)
	);
}

export function validateDailyDentistDiary037U(
	state: DocumentState,
): ValidationResult {
	const {
		clinicProfileDraft,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return requiredDocumentField(
		clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName,
		"листок 037/у, организация",
	);
}

export function validateSummaryDentistStatement039U(
	state: DocumentState,
): ValidationResult {
	const {
		clinicProfileDraft,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return requiredDocumentField(
		clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName,
		"сводная ведомость 039/у, организация",
	);
}

export function validateRadiationDoseSheet(
	state: DocumentState,
): ValidationResult {
	const {
		documentPatient,
		clinicProfileDraft,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			documentPatient?.fullName,
			"лист лучевых нагрузок, пациент",
		) ??
		requiredDocumentField(
			clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName,
			"лист лучевых нагрузок, организация",
		)
	);
}
