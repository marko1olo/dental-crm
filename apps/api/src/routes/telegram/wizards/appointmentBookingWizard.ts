import type {
	DenteTelegramBotSettings,
	DenteTelegramFeature,
} from "@dental/shared";
import { buildDenteTelegramLinkedScheduleReply } from "../../../services/telegram/telegramLegacyMemoryStore.js";
import type { TelegramRequestScope, TelegramWebhookReplyPackage } from "../types.js";
import { safeCommandKeyboard } from "../telegramKeyboards.js";
import { patientMenuCardPhoto } from "./postOpEmergencyWizard.js";

export function telegramFeatureEnabled(
	settings: DenteTelegramBotSettings,
	feature: DenteTelegramFeature,
): boolean {
	return settings.enabledFeatures.includes(feature);
}

export function featureDisabledReplyFor(
	settings: DenteTelegramBotSettings,
	title: string,
): TelegramWebhookReplyPackage {
	return {
		text: `${title} сейчас отключены в настройках клиники DENTE. Выберите доступное действие кнопками ниже или позовите администратора.`,
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}

export function scheduleReplyFor(
	settings: DenteTelegramBotSettings,
	chatFingerprintValue: string | null,
	scope: TelegramRequestScope = {},
): TelegramWebhookReplyPackage {
	const scheduleReply = buildDenteTelegramLinkedScheduleReply(
		chatFingerprintValue,
		scope,
		settings,
	);
	return {
		text: scheduleReply.text,
		replyMarkup:
			scheduleReply.replyMarkup ??
			safeCommandKeyboard(
				settings,
				scheduleReply.linked ? "linked" : "rejected",
			),
		photoUrl: patientMenuCardPhoto(settings, "appointment"),
	};
}

export function startCommandReplyFor(
	settings: DenteTelegramBotSettings,
	chatFingerprintValue: string | null,
	scope: TelegramRequestScope = {},
): TelegramWebhookReplyPackage {
	const linkedStartReply = buildDenteTelegramLinkedScheduleReply(
		chatFingerprintValue,
		scope,
		settings,
	);
	if (linkedStartReply.linked) {
		return {
			text:
				linkedStartReply.subjectType === "staff"
					? "DENTE: рабочий Telegram подключен. Выберите расписание, связь или откройте защищенный DENTE-портал. ФИО пациентов и медицинские детали в Telegram не отправляются."
					: "DENTE: Telegram подключен к клинике. Выберите расписание, документы, памятки или связь с администратором кнопками ниже. Медицинские документы открываются только в защищенном портале.",
			replyMarkup:
				linkedStartReply.subjectType === "staff"
					? (linkedStartReply.replyMarkup ??
						safeCommandKeyboard(settings, "linked"))
					: safeCommandKeyboard(settings, "linked"),
			photoUrl: patientMenuCardPhoto(
				settings,
				linkedStartReply.subjectType === "staff" ? "staff" : "mainMenu",
			),
		};
	}
	return {
		text: "Бот DENTE подключен. Отсканируйте QR из приложения клиники или отправьте одноразовый код вручную, чтобы безопасно привязать чат. Дальше выбирайте действия кнопками ниже; команды нужны только как запасной вариант. Медицинские документы открываются только в защищенном портале.",
		replyMarkup: safeCommandKeyboard(settings, "start"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}

export function helpCommandReplyFor(
	settings: DenteTelegramBotSettings,
): TelegramWebhookReplyPackage {
	return {
		text: "DENTE работает кнопками: расписание, документы, памятки, связь с администратором, отзыв и карта клиники. Команды остаются запасным вариантом. Медицинские данные в Telegram не отправляются.",
		replyMarkup: safeCommandKeyboard(settings, "help"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}

export function privacyCommandReplyFor(
	settings: DenteTelegramBotSettings,
): TelegramWebhookReplyPackage {
	return {
		text: "DENTE по умолчанию не отправляет диагнозы, КТ, рентген, планы лечения и налоговые PDF через Telegram. В Telegram уходят только безопасные уведомления и ссылки.",
		replyMarkup: safeCommandKeyboard(settings, "privacy"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}

export function clinicCommandReplyFor(
	settings: DenteTelegramBotSettings,
): TelegramWebhookReplyPackage {
	const portal = settings.patientPortalBaseUrl || "защищенный портал DENTE";
	return {
		text: `Попросите администратора открыть DENTE и показать QR-код подключения. QR сам откроет бот с одноразовым кодом; если камера недоступна, код можно отправить сюда вручную. Портал клиники: ${portal}.`,
		replyMarkup: safeCommandKeyboard(settings, "clinic"),
		photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
	};
}
