import type {
	DenteTelegramBotSettings,
	DenteTelegramUpdateKind,
} from "@dental/shared";
import {
	createDenteTelegramCareRequest,
	createDenteTelegramDocumentRequest,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import type {
	TelegramWebhookReplyPackage,
	TelegramRequestScope,
	TelegramSafeCallbackAction,
} from "./types.js";
import {
	safeCommandKeyboard,
	telegramCareCallbackTopicByAction,
} from "./telegramKeyboards.js";

import {
	patientMenuCardPhoto,
	reviewReplyFor,
	mapReplyFor,
	unsafeTelegramAttachmentReplyFor,
	documentsReplyFor,
	careReplyFor,
	documentSubmenuReplyFor,
	careTopicReplyFor,
} from "./wizards/postOpEmergencyWizard.js";
import {
	TriageWizard,
	contactRequestReplyFor,
} from "./wizards/triageWizard.js";
import {
	telegramFeatureEnabled,
	featureDisabledReplyFor,
	scheduleReplyFor,
	startCommandReplyFor,
	helpCommandReplyFor,
	privacyCommandReplyFor,
	clinicCommandReplyFor,
} from "./wizards/appointmentBookingWizard.js";
import {
	normalizedFreeText,
	freeTextIncludes,
	freeTextReplyFor,
} from "./wizards/freeTextRouter.js";

// Re-export full public API for 100% backward compatibility
export {
	patientMenuCardPhoto,
	reviewReplyFor,
	mapReplyFor,
	unsafeTelegramAttachmentReplyFor,
	documentsReplyFor,
	careReplyFor,
	documentSubmenuReplyFor,
	careTopicReplyFor,
} from "./wizards/postOpEmergencyWizard.js";
export {
	TriageWizard,
	contactRequestReplyFor,
} from "./wizards/triageWizard.js";
export {
	telegramFeatureEnabled,
	featureDisabledReplyFor,
	scheduleReplyFor,
	startCommandReplyFor,
	helpCommandReplyFor,
	privacyCommandReplyFor,
	clinicCommandReplyFor,
} from "./wizards/appointmentBookingWizard.js";
export {
	normalizedFreeText,
	freeTextIncludes,
	freeTextReplyFor,
} from "./wizards/freeTextRouter.js";

/**
 * Маршрутизация команд, callback-действий и свободного текста для ботов Telegram.
 */
export function suggestedReplyFor(
	command: string | null,
	callbackAction: TelegramSafeCallbackAction | null,
	settings: DenteTelegramBotSettings,
	chatFingerprintValue: string | null,
	updateKind: DenteTelegramUpdateKind,
	messageText: string | null,
	scope: TelegramRequestScope = {},
): TelegramWebhookReplyPackage {
	const normalizedCommand = command?.split("@")[0] ?? null;

	if (
		updateKind === "photo" ||
		updateKind === "document" ||
		(updateKind === "voice" && !settings.allowVoiceIntake)
	) {
		return unsafeTelegramAttachmentReplyFor(settings, updateKind);
	}

	if (normalizedCommand === "/start" || callbackAction === "dente:start") {
		return startCommandReplyFor(settings, chatFingerprintValue, scope);
	}

	if (normalizedCommand === "/help" || callbackAction === "dente:help") {
		return helpCommandReplyFor(settings);
	}

	if (normalizedCommand === "/privacy" || callbackAction === "dente:privacy") {
		return privacyCommandReplyFor(settings);
	}

	if (normalizedCommand === "/clinic" || callbackAction === "dente:clinic") {
		return clinicCommandReplyFor(settings);
	}

	if (
		normalizedCommand === "/schedule" ||
		normalizedCommand === "/appointments" ||
		callbackAction === "dente:schedule"
	) {
		return scheduleReplyFor(settings, chatFingerprintValue, scope);
	}

	if (
		normalizedCommand === "/documents" ||
		normalizedCommand === "/docs" ||
		callbackAction === "dente:documents"
	) {
		return documentsReplyFor(settings);
	}

	if (callbackAction === "dente:tax") {
		if (!telegramFeatureEnabled(settings, "tax_document_request"))
			return featureDisabledReplyFor(settings, "Налоговые запросы");
		return documentSubmenuReplyFor(
			settings,
			"tax",
			createDenteTelegramDocumentRequest(chatFingerprintValue, "tax", scope),
		);
	}

	if (callbackAction === "dente:billing") {
		if (!telegramFeatureEnabled(settings, "secure_portal_links"))
			return featureDisabledReplyFor(settings, "Финансовые документы");
		return documentSubmenuReplyFor(
			settings,
			"billing",
			createDenteTelegramDocumentRequest(
				chatFingerprintValue,
				"billing",
				scope,
			),
		);
	}

	if (callbackAction === "dente:medical-docs") {
		if (!telegramFeatureEnabled(settings, "secure_portal_links"))
			return featureDisabledReplyFor(settings, "Медицинские документы");
		return documentSubmenuReplyFor(
			settings,
			"medical",
			createDenteTelegramDocumentRequest(
				chatFingerprintValue,
				"medical",
				scope,
			),
		);
	}

	if (callbackAction === "dente:patient-forms") {
		if (!telegramFeatureEnabled(settings, "secure_portal_links"))
			return featureDisabledReplyFor(settings, "Формы пациента");
		return documentSubmenuReplyFor(
			settings,
			"patientForms",
			createDenteTelegramDocumentRequest(
				chatFingerprintValue,
				"patientForms",
				scope,
			),
		);
	}

	if (
		normalizedCommand === "/care" ||
		normalizedCommand === "/instructions" ||
		normalizedCommand === "/recommendations" ||
		callbackAction === "dente:care"
	) {
		if (!telegramFeatureEnabled(settings, "post_visit_instructions"))
			return featureDisabledReplyFor(settings, "Памятки после приема");
		return careReplyFor(settings);
	}

	const callbackCareTopic = callbackAction
		? telegramCareCallbackTopicByAction[callbackAction]
		: null;
	if (callbackCareTopic) {
		if (!telegramFeatureEnabled(settings, "post_visit_instructions"))
			return featureDisabledReplyFor(settings, "Памятки после приема");
		return careTopicReplyFor(
			settings,
			callbackCareTopic,
			createDenteTelegramCareRequest(
				chatFingerprintValue,
				callbackCareTopic,
				scope,
			),
		);
	}

	if (
		normalizedCommand === "/contact" ||
		normalizedCommand === "/call" ||
		callbackAction === "dente:contact"
	) {
		return contactRequestReplyFor(settings, chatFingerprintValue, scope);
	}

	if (normalizedCommand === "/review" || callbackAction === "dente:review") {
		return reviewReplyFor(settings);
	}

	if (
		normalizedCommand === "/map" ||
		normalizedCommand === "/maps" ||
		callbackAction === "dente:map"
	) {
		return mapReplyFor(settings);
	}

	if (!command && !callbackAction) {
		return freeTextReplyFor(settings, chatFingerprintValue, messageText, scope);
	}

	return {
		text: "DENTE принял сообщение. Выберите безопасное действие кнопками ниже.",
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}
