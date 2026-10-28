import type { DenteTelegramBotSettings } from "@dental/shared";
import { createDenteTelegramContactRequest } from "../../../services/telegram/telegramLegacyMemoryStore.js";
import { TelegramInteractiveTriageService } from "../../../services/telegram/TelegramInteractiveTriageService.js";
import type { TelegramRequestScope, TelegramWebhookReplyPackage } from "../types.js";
import {
	portalButton,
	mainMenuTelegramRow,
	safeCommandKeyboard,
} from "../telegramKeyboards.js";
import { patientMenuCardPhoto } from "./postOpEmergencyWizard.js";

/**
 * Визард триажа, неотложной помощи и связи с администратором клиники.
 */
export class TriageWizard {
	public static contactRequestReplyFor(
		settings: DenteTelegramBotSettings,
		chatFingerprintValue: string | null,
		scope: TelegramRequestScope = {},
	): TelegramWebhookReplyPackage {
		const result = createDenteTelegramContactRequest(chatFingerprintValue, scope);
		const portal = portalButton(settings);
		const rows = [
			portal,
			result.linked
				? [
						{ text: "Расписание", callback_data: "dente:schedule" },
						{ text: "Документы", callback_data: "dente:documents" },
					]
				: [{ text: "Как получить код", callback_data: "dente:clinic" }],
			[{ text: "Помощь", callback_data: "dente:help" }],
			mainMenuTelegramRow(),
		].filter((row) => row.length);
		return {
			text: result.text,
			replyMarkup: rows.length
				? { inline_keyboard: rows }
				: safeCommandKeyboard(settings, result.linked ? "linked" : "rejected"),
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}

	public static getRootTriageReply(
		settings: DenteTelegramBotSettings,
	): TelegramWebhookReplyPackage {
		const screen = TelegramInteractiveTriageService.getRootTriageScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}

	public static getCalculatorReply(
		settings: DenteTelegramBotSettings,
	): TelegramWebhookReplyPackage {
		const screen = TelegramInteractiveTriageService.getCalculatorRootScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}

	public static getEmergencyReply(
		settings: DenteTelegramBotSettings,
	): TelegramWebhookReplyPackage {
		const screen = TelegramInteractiveTriageService.getEmergencyScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}

	public static getBrokenToothReply(
		settings: DenteTelegramBotSettings,
	): TelegramWebhookReplyPackage {
		const screen = TelegramInteractiveTriageService.getBrokenToothScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}

	public static getAestheticReply(
		settings: DenteTelegramBotSettings,
	): TelegramWebhookReplyPackage {
		const screen = TelegramInteractiveTriageService.getAestheticScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}

	public static getKidsReply(
		settings: DenteTelegramBotSettings,
	): TelegramWebhookReplyPackage {
		const screen = TelegramInteractiveTriageService.getKidsScreen();
		return {
			text: screen.text,
			replyMarkup: screen.replyMarkup,
			photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
		};
	}
}

export const contactRequestReplyFor = TriageWizard.contactRequestReplyFor;
