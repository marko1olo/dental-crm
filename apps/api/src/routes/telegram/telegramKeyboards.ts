import type { DenteTelegramBotSettings } from "@dental/shared";
import { safeDenteTelegramPublicHttpsUrl } from "../../services/telegram/telegramLegacyMemoryStore.js";
import type {
	TelegramInlineKeyboardButton,
	TelegramInlineKeyboardRow,
	TelegramPortalSection,
	DenteTelegramCareRequestTopic,
} from "./types.js";
import {
	isRecord,
	stringFromUnknown,
} from "./telegramUtils.js";

export function portalButton(
	settings: DenteTelegramBotSettings,
	section: TelegramPortalSection = "home",
): TelegramInlineKeyboardRow {
	const raw = settings.patientPortalBaseUrl?.trim();
	if (!raw) return [];
	try {
		const portal = new URL(raw);
		if (portal.protocol !== "https:") return [];
		portal.search = "";
		portal.searchParams.set("dente_source", "telegram");
		portal.searchParams.set("dente_section", section);
		portal.hash = "";
		return [{ text: "Открыть DENTE", url: portal.toString() }];
	} catch (err) {
		console.error("[Dente] patientPortalButtons failed to construct URL:", err);
		return [];
	}
}

export function safeHttpsTelegramButton(
	raw: string | null | undefined,
	text: string,
): TelegramInlineKeyboardRow {
	const value = raw?.trim();
	if (!value) return [];
	try {
		const url = new URL(value);
		return url.protocol === "https:" ? [{ text, url: url.toString() }] : [];
	} catch (err) {
		console.error(
			"[Dente] safeHttpsTelegramButton failed to construct URL:",
			err,
		);
		return [];
	}
}

export function reviewButtons(
	settings: DenteTelegramBotSettings,
): TelegramInlineKeyboardRow {
	return [
		...safeHttpsTelegramButton(settings.clinicReviewUrl, "Оценить клинику"),
		...safeHttpsTelegramButton(settings.clinicMapsUrl, "Открыть карту"),
	];
}

export function mapButtons(
	settings: DenteTelegramBotSettings,
): TelegramInlineKeyboardRow {
	return safeHttpsTelegramButton(settings.clinicMapsUrl, "Открыть карту");
}

export function telegramInlineKeyboardRows(
	markup: Record<string, unknown> | null,
): TelegramInlineKeyboardRow[] {
	const rows = markup?.inline_keyboard;
	if (!Array.isArray(rows)) return [];
	return rows.filter(
		(row): row is TelegramInlineKeyboardRow =>
			Array.isArray(row) &&
			row.every(
				(button) => isRecord(button) && typeof button.text === "string",
			),
	);
}

export function mainMenuTelegramRow(): TelegramInlineKeyboardRow {
	return [{ text: "Главное меню", callback_data: "dente:start" }];
}

export const telegramCareCallbackTopicByAction: Partial<
	Record<TelegramSafeCallbackAction, DenteTelegramCareRequestTopic>
> = {
	"dente:care-extraction": "extraction",
	"dente:care-implant": "implant",
	"dente:care-filling": "filling",
	"dente:care-endo": "endo",
	"dente:care-surgery": "surgery",
	"dente:care-anesthesia": "anesthesia",
	"dente:care-hygiene": "hygiene",
	"dente:care-prosthetics": "prosthetics",
	"dente:care-orthodontics": "orthodontics",
	"dente:care-periodontology": "periodontology",
};

export function careTopicFromFreeText(
	text: string,
): DenteTelegramCareRequestTopic | null {
	if (freeTextIncludes(text, ["удален", "лунка", "лунку"])) return "extraction";
	if (freeTextIncludes(text, ["имплан"])) return "implant";
	if (freeTextIncludes(text, ["пломб", "реставрац"])) return "filling";
	if (freeTextIncludes(text, ["эндо", "канал", "нерв"])) return "endo";
	if (freeTextIncludes(text, ["хирург", "операц", "шов", "швы"]))
		return "surgery";
	if (freeTextIncludes(text, ["анестез", "онемен", "онемел"]))
		return "anesthesia";
	if (freeTextIncludes(text, ["гигиен", "чистк", "профгигиен"]))
		return "hygiene";
	if (freeTextIncludes(text, ["протез", "коронк", "винир", "мост"]))
		return "prosthetics";
	if (freeTextIncludes(text, ["ортодонт", "брекет", "элайнер", "капп"]))
		return "orthodontics";
	if (freeTextIncludes(text, ["пародонт", "десн", "кюретаж"]))
		return "periodontology";
	return null;
}

export function replyMarkupWithNextActions(
	primaryRows: TelegramInlineKeyboardRow[],
	settings: DenteTelegramBotSettings,
): Record<string, unknown> | null {
	const rows = [
		...primaryRows.filter((row) => row.length),
		...telegramInlineKeyboardRows(
			safeCommandKeyboard(settings, "appointment_callback"),
		),
	];
	return rows.length ? { inline_keyboard: rows } : null;
}

export function safeCommandKeyboard(
	settings: DenteTelegramBotSettings,
	mode:
		| "start"
		| "help"
		| "clinic"
		| "privacy"
		| "linked"
		| "rejected"
		| "appointment_callback",
): Record<string, unknown> | null {
	const portal = portalButton(
		settings,
		mode === "appointment_callback" || mode === "linked" ? "schedule" : "home",
	);
	const review = reviewButtons(settings);
	const maps = mapButtons(settings);
	const schedule = [{ text: "Расписание", callback_data: "dente:schedule" }];
	const documents = [{ text: "Документы", callback_data: "dente:documents" }];
	const care = [{ text: "Памятки", callback_data: "dente:care" }];
	const contact = [
		{ text: "Позвать администратора", callback_data: "dente:contact" },
	];
	const triage = [
		{ text: "🩺 Что вас беспокоит? (Опросник)", callback_data: "triage:root" },
		{ text: "🧮 Калькулятор цен", callback_data: "triage:calc:root" },
	];
	const privacy = [
		{ text: "Конфиденциальность", callback_data: "dente:privacy" },
	];
	const home = mainMenuTelegramRow();
	if (mode === "appointment_callback") {
		const rows = [
			triage,
			[...schedule, ...documents],
			[...contact, ...privacy],
			home,
			portal,
		].filter((row) => row.length);
		return rows.length ? { inline_keyboard: rows } : null;
	}
	if (mode === "linked") {
		const rows = [
			triage,
			[...schedule, ...documents],
			[...care, ...contact],
			home,
			portal,
			review,
		].filter((row) => row.length);
		return rows.length ? { inline_keyboard: rows } : null;
	}
	if (mode === "rejected") {
		return {
			inline_keyboard: [
				triage,
				[{ text: "Получить QR в клинике", callback_data: "dente:clinic" }],
				[...documents, ...care],
				contact,
				home,
				portal,
			].filter((row) => row.length),
		};
	}
	if (mode === "clinic") {
		return {
			inline_keyboard: [
				portal,
				maps,
				triage,
				[...schedule, ...contact],
				[
					{ text: "Помощь", callback_data: "dente:help" },
					{ text: "Конфиденциальность", callback_data: "dente:privacy" },
				],
				home,
			].filter((row) => row.length),
		};
	}
	if (mode === "privacy") {
		return {
			inline_keyboard: [
				[
					{ text: "Что умеет бот", callback_data: "dente:help" },
					{ text: "Подключение", callback_data: "dente:clinic" },
				],
				triage,
				[...schedule, ...documents],
				care,
				home,
				portal,
			].filter((row) => row.length),
		};
	}

	return {
		inline_keyboard: [
			triage,
			[
				{ text: "Подключить клинику", callback_data: "dente:clinic" },
				{ text: "Конфиденциальность", callback_data: "dente:privacy" },
			],
			[
				{ text: "Документы", callback_data: "dente:documents" },
				{ text: "Памятки", callback_data: "dente:care" },
			],
			review.length
				? review
				: [
						{ text: "Отзывы", callback_data: "dente:review" },
						{ text: "Карта", callback_data: "dente:map" },
					],
			[
				{ text: "Расписание", callback_data: "dente:schedule" },
				{ text: "Позвать администратора", callback_data: "dente:contact" },
			],
			portal,
		].filter((row) => row.length),
	};
}