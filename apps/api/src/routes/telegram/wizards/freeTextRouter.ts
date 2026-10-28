import type { DenteTelegramBotSettings } from "@dental/shared";
import {
	createDenteTelegramCareRequest,
	createDenteTelegramDocumentRequest,
} from "../../../services/telegram/telegramLegacyMemoryStore.js";
import type { TelegramRequestScope, TelegramWebhookReplyPackage } from "../types.js";
import {
	careTopicFromFreeText,
	safeCommandKeyboard,
} from "../telegramKeyboards.js";
import {
	patientMenuCardPhoto,
	reviewReplyFor,
	mapReplyFor,
	documentsReplyFor,
	careReplyFor,
	documentSubmenuReplyFor,
	careTopicReplyFor,
} from "./postOpEmergencyWizard.js";
import {
	TriageWizard,
	contactRequestReplyFor,
} from "./triageWizard.js";
import {
	telegramFeatureEnabled,
	featureDisabledReplyFor,
	scheduleReplyFor,
} from "./appointmentBookingWizard.js";

export function normalizedFreeText(value: string | null): string {
	return value?.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? "";
}

export function freeTextIncludes(value: string, fragments: string[]): boolean {
	return fragments.some((fragment) => value.includes(fragment));
}

export function freeTextReplyFor(
	settings: DenteTelegramBotSettings,
	chatFingerprintValue: string | null,
	messageText: string | null,
	scope: TelegramRequestScope = {},
): TelegramWebhookReplyPackage {
	const text = normalizedFreeText(messageText);

	if (
		freeTextIncludes(text, ["налог", "ндфл", "вычет", "кнд", "1151156"]) ||
		(freeTextIncludes(text, ["справк"]) &&
			freeTextIncludes(text, ["оплат", "чек", "фиск"]))
	) {
		return telegramFeatureEnabled(settings, "tax_document_request")
			? documentSubmenuReplyFor(
					settings,
					"tax",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"tax",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Налоговые запросы");
	}

	if (
		freeTextIncludes(text, [
			"оплат",
			"счет",
			"счёт",
			"чек",
			"квитанц",
			"возврат",
			"рассроч",
			"акт",
		])
	) {
		return telegramFeatureEnabled(settings, "secure_portal_links")
			? documentSubmenuReplyFor(
					settings,
					"billing",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"billing",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Финансовые документы");
	}

	if (
		freeTextIncludes(text, [
			"медкарт",
			"выписк",
			"копи",
			"dicom",
			"клкт",
			"кт",
			"снимк",
		])
	) {
		return telegramFeatureEnabled(settings, "secure_portal_links")
			? documentSubmenuReplyFor(
					settings,
					"medical",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"medical",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Медицинские документы");
	}

	if (freeTextIncludes(text, ["соглас", "анкета", "форма", "пдн", "персонал"])) {
		return telegramFeatureEnabled(settings, "secure_portal_links")
			? documentSubmenuReplyFor(
					settings,
					"patientForms",
					createDenteTelegramDocumentRequest(
						chatFingerprintValue,
						"patientForms",
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Формы пациента");
	}

	if (freeTextIncludes(text, ["документ", "договор", "акт"])) {
		return documentsReplyFor(settings);
	}

	const careTopic = careTopicFromFreeText(text);
	if (careTopic) {
		return telegramFeatureEnabled(settings, "post_visit_instructions")
			? careTopicReplyFor(
					settings,
					careTopic,
					createDenteTelegramCareRequest(
						chatFingerprintValue,
						careTopic,
						scope,
					),
				)
			: featureDisabledReplyFor(settings, "Памятки после приема");
	}

	if (
		freeTextIncludes(text, [
			"памят",
			"рекоменд",
			"удален",
			"имплан",
			"пломб",
			"гигиен",
			"после",
		])
	) {
		return telegramFeatureEnabled(settings, "post_visit_instructions")
			? careReplyFor(settings)
			: featureDisabledReplyFor(settings, "Памятки после приема");
	}

	if (freeTextIncludes(text, ["распис", "запис", "прием", "визит", "время"])) {
		return scheduleReplyFor(settings, chatFingerprintValue, scope);
	}

	if (
		freeTextIncludes(text, [
			"звон",
			"перезвон",
			"админ",
			"оператор",
			"связ",
			"боль",
			"отек",
			"кров",
			"температур",
		])
	) {
		return contactRequestReplyFor(settings, chatFingerprintValue, scope);
	}

	if (freeTextIncludes(text, ["опросник", "триаж", "беспокоит", "симптом"])) {
		return TriageWizard.getRootTriageReply(settings);
	}

	if (
		freeTextIncludes(text, [
			"калькулятор",
			"стоимост",
			"сколько стоит",
			"прайс",
			"цена",
			"цены",
			"расчет",
		])
	) {
		return TriageWizard.getCalculatorReply(settings);
	}

	if (
		freeTextIncludes(text, [
			"пульсир",
			"острая боль",
			"отек",
			"флегмон",
			"раздуло",
			"cito",
		])
	) {
		return TriageWizard.getEmergencyReply(settings);
	}

	if (
		freeTextIncludes(text, [
			"откололся",
			"скол",
			"выпала пломба",
			"пломба выпала",
		])
	) {
		return TriageWizard.getBrokenToothReply(settings);
	}

	if (freeTextIncludes(text, ["винир", "элайнер", "отбеливан", "улыбк"])) {
		return TriageWizard.getAestheticReply(settings);
	}

	if (
		freeTextIncludes(text, [
			"ребенок",
			"ребёнок",
			"боится врача",
			"детей",
			"детск",
		])
	) {
		return TriageWizard.getKidsReply(settings);
	}

	if (freeTextIncludes(text, ["отзыв", "оцен", "рейтинг"])) {
		return reviewReplyFor(settings);
	}

	if (freeTextIncludes(text, ["адрес", "карта", "как добраться", "где вы"])) {
		return mapReplyFor(settings);
	}

	return {
		text: "DENTE принял сообщение. Чтобы клиника быстро поняла запрос, выберите действие кнопками ниже. Команды писать не нужно.",
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}
