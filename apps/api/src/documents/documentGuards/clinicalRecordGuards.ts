import type { CreateDocumentInput } from "@dental/shared";

/**
 * Проверка наличия структурированных данных для медицинских карт (043/у), выписок, справок и направлений.
 */
export function checkClinicalRecordPayloadMissingReason(
	input: CreateDocumentInput,
): string | null {
	if (
		input.kind === "patient_intake_questionnaire" &&
		!input.payload?.patientIntakeQuestionnaire
	) {
		return "Для анкеты пациента нужны структурированные данные: жалоба, аллергии, препараты, хронические заболевания, беременность/лактация, антикоагулянты и подтверждение пациента.";
	}
	if (
		input.kind === "warranty_service_memo" &&
		!input.payload?.warrantyServiceMemo
	) {
		return "Для гарантийной памятки нужны структурированные данные: работа, дата завершения, зубы или область, материалы, срок гарантии, контрольные визиты, обязанности пациента, исключения, срочные признаки, связанный акт или договор и подтверждения выдачи.";
	}
	if (input.kind === "xray_cbct_referral" && !input.payload?.xrayCbctReferral) {
		return "Для направления на рентген или КЛКТ нужны структурированные данные: вид исследования, область, клинический вопрос, показание, ограничения и ответственный врач.";
	}
	if (
		input.kind === "medical_record_extract" &&
		!input.payload?.medicalRecordExtract
	) {
		return "Для выписки из медицинской карты нужны структурированные данные: период, источники записей, жалобы и анамнез, объективный статус, диагноз, лечение, рекомендации, врач, получатель и проверка данных третьих лиц.";
	}
	if (
		input.kind === "dental_medical_card_043u" &&
		!input.payload?.dentalMedicalCard043u
	) {
		return "Для медицинской карты 043/у нужны структурированные данные: организация, пациент, номер карты, дата приема, жалобы, анамнез, объективный статус, диагноз, стоматологические строки, лечение и врач.";
	}
	if (
		input.kind === "medical_record_copy_request" &&
		!input.payload?.medicalRecordCopyRequest
	) {
		return "Для запроса копий медицинской документации нужны структурированные данные: состав документов, период, формат, получатель, документ получателя, полномочия, контакт выдачи и проверка лишних данных третьих лиц.";
	}
	if (
		input.kind === "post_visit_recommendations" &&
		!input.payload?.postVisitRecommendations
	) {
		return "Для рекомендаций после приема нужны структурированные данные: процедура, зона, дата, врач, разрешенные действия, ограничения, назначения, питание, гигиена, тревожные признаки, контакт клиники и краткий текст для Telegram.";
	}
	if (input.kind === "treatment_plan" && !input.payload?.treatmentPlan) {
		return "Для плана лечения нужны структурированные данные: причина обращения, осмотр, диагнозы, этапы лечения, сроки, риски, прогноз, альтернативы, сумма, врач и подтверждения пациента.";
	}
	if (
		input.kind === "treatment_plan_acceptance" &&
		!input.payload?.treatmentPlanAcceptance
	) {
		return "Для акцепта плана лечения нужны структурированные данные: выбранный план, дата акцепта, сумма, этапы, права пациента при изменении плана, плательщик, врач и подтверждения пациента.";
	}
	if (
		input.kind === "visit_attendance_certificate" &&
		!input.payload?.visitAttendanceCertificate
	) {
		return "Для справки о посещении нужны структурированные данные: время начала и окончания приема, цель выдачи, получатель, дата, подписант и подтверждение, что диагноз не раскрывается.";
	}
	if (
		input.kind === "medical_document_release_receipt" &&
		!input.payload?.medicalDocumentReleaseReceipt
	) {
		return "Для расписки о выдаче медицинских документов нужны структурированные данные: получатель, основание, канал, состав выдачи, дата и защита передачи.";
	}
	return null;
}

/**
 * Валидация специфических клинических ограничений (лучевая нагрузка, беременность, КЛКТ).
 */
export function validateClinicalRecordSpecificRules(
	input: CreateDocumentInput,
): { ok: false; statusCode: 409; error: string } | null {
	if (
		input.kind === "xray_cbct_referral" &&
		input.payload?.xrayCbctReferral?.studyType === "cbct" &&
		input.payload.xrayCbctReferral.pregnancyStatus !== "not_applicable" &&
		!input.payload.xrayCbctReferral.safetyNotes.trim()
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для КЛКТ при возможной беременности или неясном статусе нужен явный комментарий по ограничениям и защите.",
		};
	}
	return null;
}
