import type { CreateDocumentInput } from "@dental/shared";

/**
 * Проверка наличия структурированных данных для согласий и отказов (323-ФЗ, 152-ФЗ).
 */
export function checkConsentPayloadMissingReason(
	input: CreateDocumentInput,
): string | null {
	if (
		input.kind === "minor_legal_representative_consent" &&
		!input.payload?.minorLegalRepresentativeConsent
	) {
		return "Для согласия законного представителя нужны структурированные данные: представитель, родство, документ личности, основание полномочий, данные несовершеннолетнего, вмешательство, риски, альтернативы, врач и подтверждения проверки.";
	}
	if (
		input.kind === "photo_video_consent" &&
		!input.payload?.photoVideoConsent
	) {
		return "Для согласия на фото, видео и снимки нужны структурированные данные: типы материалов, разрешенные цели, запрет/разрешение публикации и порядок отзыва.";
	}
	if (input.kind === "informed_consent" && !input.payload?.informedConsent) {
		return "Для информированного согласия нужны структурированные данные: вмешательство, область, показание, ожидаемая польза, риски, альтернативы, рекомендации после вмешательства, врач и подтверждения пациента.";
	}
	if (
		input.kind === "procedure_specific_consent_packet" &&
		!input.payload?.procedureSpecificConsent
	) {
		return "Для процедурного согласия нужны структурированные данные: вид процедуры, область, показание, анестезия, материалы, персональные риски пациента, процедурные риски, альтернативы, ограничения после процедуры, врач и подтверждения пациента.";
	}
	if (
		input.kind === "personal_data_processing_consent" &&
		!input.payload?.personalDataProcessingConsent
	) {
		return "Для согласия на обработку персональных данных нужны структурированные данные: оператор, ИНН, адрес, цели, категории данных, действия обработки, правила передачи третьим лицам, срок хранения, отзыв согласия и подтверждение обработки медицинских данных.";
	}
	if (
		input.kind === "medical_intervention_refusal" &&
		!input.payload?.medicalInterventionRefusal
	) {
		return "Для отказа от медицинского вмешательства нужны структурированные данные: вмешательство, показание, причина отказа, разъясненные риски, альтернативы, тревожные признаки и подтверждения пациента.";
	}
	return null;
}

/**
 * Валидация специфических условий согласий.
 */
export function validateConsentSpecificRules(
	input: CreateDocumentInput,
): { ok: false; statusCode: 409; error: string } | null {
	if (
		input.kind === "photo_video_consent" &&
		input.payload?.photoVideoConsent?.recognizablePublicationAllowed &&
		!input.payload.photoVideoConsent.educationUseAllowed &&
		!input.payload.photoVideoConsent.marketingUseAllowed
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Публикация узнаваемых фото или видео требует отдельного разрешения на обучение или маркетинг.",
		};
	}
	return null;
}
