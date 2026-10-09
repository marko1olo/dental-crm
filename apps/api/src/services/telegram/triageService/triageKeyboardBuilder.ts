/**
 * triageKeyboardBuilder.ts
 *
 * Layer 1: Inline keyboard layout generators for Telegram triage flows.
 * Pure functions with zero side effects.
 */

import {
	CARIES_PRESETS,
	CROWN_PRESETS,
	IMPLANT_PRESETS,
	WHITENING_PRESETS,
} from "./presets.js";
import type { TelegramInlineButton, TelegramInlineKeyboard } from "./types.js";

export function buildRootTriageKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "⚡ Острая пульсирующая боль / отек (CITO!)",
					callback_data: "triage:emergency",
				},
			],
			[
				{
					text: "🦷 Откололся зуб / выпала пломба",
					callback_data: "triage:broken_tooth",
				},
			],
			[
				{
					text: "🩸 Кровоточат десны / неприятный запах",
					callback_data: "triage:gums",
				},
			],
			[
				{
					text: "✨ Хочу красивую улыбку (виниры / элайнеры)",
					callback_data: "triage:aesthetic",
				},
			],
			[
				{
					text: "👶 Ребёнок боится врача (подготовка)",
					callback_data: "triage:kids",
				},
			],
			[
				{
					text: "🧮 Калькулятор стоимости лечения",
					callback_data: "triage:calc:root",
				},
			],
			[
				{
					text: "👨‍💼 Позвать администратора",
					callback_data: "triage:human_request",
				},
			],
			[
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildEmergencyKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "🚨 Записаться на экстренный приём сегодня",
					callback_data: "triage:cito_book",
				},
			],
			[
				{
					text: "📞 Срочный звонок в клинику",
					callback_data: "triage:human_request",
				},
			],
			[
				{
					text: "« Назад к выбору симптома",
					callback_data: "triage:root",
				},
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildCitoBookKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[{ text: "📅 Подтвердить экстренный слот", callback_data: "dente:schedule" }],
			[{ text: "📞 Позвонить администратору", callback_data: "triage:human_request" }],
			[{ text: "« Назад к памятке", callback_data: "triage:emergency" }],
		],
	};
}

export function buildBrokenToothKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "💥 Болит при накусывании / от холодного",
					callback_data: "triage:tooth_pain",
				},
			],
			[
				{
					text: "👅 Не болит, но острый край царапает",
					callback_data: "triage:tooth_sharp",
				},
			],
			[
				{
					text: "📸 Хочу прикрепить фото скола",
					callback_data: "triage:photo_hint",
				},
			],
			[
				{
					text: "« Назад",
					callback_data: "triage:root",
				},
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildBrokenToothSharpKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📅 Записаться на реставрацию",
					callback_data: "dente:schedule",
				},
			],
			[
				{
					text: "« Назад к оценке скола",
					callback_data: "triage:broken_tooth",
				},
				{
					text: "🏠 В начало",
					callback_data: "triage:root",
				},
			],
		],
	};
}

export function buildBrokenToothPainKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📅 Записаться на осмотр с визиографом",
					callback_data: "dente:schedule",
				},
			],
			[
				{
					text: "« Назад к оценке скола",
					callback_data: "triage:broken_tooth",
				},
				{
					text: "🏠 В начало",
					callback_data: "triage:root",
				},
			],
		],
	};
}

export function buildBrokenToothPhotoHintKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[{ text: "« Назад к оценке скола", callback_data: "triage:broken_tooth" }],
			[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
		],
	};
}

export function buildGumsKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "✨ Записаться на комплексную профгигиену",
					callback_data: "dente:schedule",
				},
			],
			[
				{
					text: "👨‍⚕️ Консультация пародонтолога",
					callback_data: "triage:human_request",
				},
			],
			[
				{
					text: "« Назад",
					callback_data: "triage:root",
				},
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildAestheticKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "⚪ Хочу белее (отбеливание)",
					callback_data: "triage:aest_color",
				},
			],
			[
				{
					text: "💎 Изменить форму / убрать сколы (виниры)",
					callback_data: "triage:aest_veneers",
				},
			],
			[
				{
					text: "📐 Выровнять зубы (элайнеры / брекеты)",
					callback_data: "triage:aest_ortho",
				},
			],
			[
				{
					text: "« Назад",
					callback_data: "triage:root",
				},
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildAestheticColorKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "🧮 Рассчитать стоимость отбеливания",
					callback_data: "triage:calc:cat:whitening",
				},
			],
			[
				{
					text: "« Назад к эстетике",
					callback_data: "triage:aesthetic",
				},
				{
					text: "🏠 В начало",
					callback_data: "triage:root",
				},
			],
		],
	};
}

export function buildAestheticVeneersKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "🧮 Рассчитать стоимость виниров",
					callback_data: "triage:calc:cat:crown",
				},
			],
			[
				{
					text: "« Назад к эстетике",
					callback_data: "triage:aesthetic",
				},
				{
					text: "🏠 В начало",
					callback_data: "triage:root",
				},
			],
		],
	};
}

export function buildAestheticOrthoKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📅 Записаться на консультацию ортодонта",
					callback_data: "dente:schedule",
				},
			],
			[
				{
					text: "« Назад к эстетике",
					callback_data: "triage:aesthetic",
				},
				{
					text: "🏠 В начало",
					callback_data: "triage:root",
				},
			],
		],
	};
}

export function buildKidsKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "🧸 Записаться на адаптационный визит для ребенка",
					callback_data: "dente:schedule",
				},
			],
			[
				{
					text: "« Назад к симптомам",
					callback_data: "triage:root",
				},
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildCalculatorRootKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "🔩 Имплантация зуба «под ключ»",
					callback_data: "triage:calc:cat:implant",
				},
			],
			[
				{
					text: "👑 Коронка на зуб (керамика / цирконий)",
					callback_data: "triage:calc:cat:crown",
				},
			],
			[
				{
					text: "🦷 Лечение кариеса и пломба",
					callback_data: "triage:calc:cat:caries",
				},
			],
			[
				{
					text: "✨ Профессиональное отбеливание зубов",
					callback_data: "triage:calc:cat:whitening",
				},
			],
			[
				{
					text: "« Назад в опросник",
					callback_data: "triage:root",
				},
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildImplantSelectionKeyboard(): TelegramInlineKeyboard {
	const buttons: TelegramInlineButton[][] = IMPLANT_PRESETS.map((imp) => [
		{
			text: `${imp.brand} (${imp.country}) — ${imp.priceRub.toLocaleString("ru-RU")} ₽`,
			callback_data: `triage:calc:imp:${imp.code}`,
		},
	]);

	buttons.push([
		{
			text: "« Назад к услугам",
			callback_data: "triage:calc:root",
		},
		{
			text: "🏠 Главное меню",
			callback_data: "dente:start",
		},
	]);

	return { inline_keyboard: buttons };
}

export function buildImplantCrownSelectionKeyboard(implantCode: string): TelegramInlineKeyboard {
	const buttons: TelegramInlineButton[][] = CROWN_PRESETS.map((crw) => [
		{
			text: `${crw.name} — ${crw.priceRub.toLocaleString("ru-RU")} ₽`,
			callback_data: `triage:calc:res:imp:${implantCode}:${crw.code}`,
		},
	]);

	buttons.push([
		{
			text: "« Назад к выбору импланта",
			callback_data: "triage:calc:cat:implant",
		},
		{
			text: "🏠 Главное меню",
			callback_data: "dente:start",
		},
	]);

	return { inline_keyboard: buttons };
}

export function buildImplantResultKeyboard(
	implantCode: string,
	crownCode: string,
): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "🔒 Зафиксировать цену и записаться",
					callback_data: `triage:calc:lock:imp:${implantCode}:${crownCode}`,
				},
			],
			[
				{
					text: "🔄 Пересчитать заново",
					callback_data: "triage:calc:cat:implant",
				},
			],
			[
				{
					text: "« К калькулятору",
					callback_data: "triage:calc:root",
				},
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildImplantLockSuccessKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[{ text: "📅 Выбрать дату и время приёма", callback_data: "dente:schedule" }],
			[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
		],
	};
}

export function buildCrownCalculatorKeyboard(): TelegramInlineKeyboard {
	const buttons: TelegramInlineButton[][] = CROWN_PRESETS.map((crw) => [
		{
			text: `${crw.name}: ${crw.priceRub.toLocaleString("ru-RU")} ₽`,
			callback_data: `triage:calc:lock:crown:${crw.code}`,
		},
	]);

	buttons.push([
		{
			text: "« Назад в калькулятор",
			callback_data: "triage:calc:root",
		},
		{
			text: "🏠 Главное меню",
			callback_data: "dente:start",
		},
	]);

	return { inline_keyboard: buttons };
}

export function buildCariesCalculatorKeyboard(): TelegramInlineKeyboard {
	const buttons: TelegramInlineButton[][] = CARIES_PRESETS.map((item) => [
		{
			text: `${item.label} — ${item.priceRub.toLocaleString("ru-RU")} ₽`,
			callback_data: `triage:calc:lock:caries:${item.code}`,
		},
	]);

	buttons.push([
		{
			text: "« Назад в калькулятор",
			callback_data: "triage:calc:root",
		},
		{
			text: "🏠 Главное меню",
			callback_data: "dente:start",
		},
	]);

	return { inline_keyboard: buttons };
}

export function buildWhiteningCalculatorKeyboard(): TelegramInlineKeyboard {
	const buttons: TelegramInlineButton[][] = WHITENING_PRESETS.map((item) => [
		{
			text: `${item.label} — ${item.priceRub.toLocaleString("ru-RU")} ₽`,
			callback_data: `triage:calc:lock:white:${item.code}`,
		},
	]);

	buttons.push([
		{
			text: "« Назад в калькулятор",
			callback_data: "triage:calc:root",
		},
		{
			text: "🏠 Главное меню",
			callback_data: "dente:start",
		},
	]);

	return { inline_keyboard: buttons };
}

export function buildGeneralLockSuccessKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[{ text: "📅 Записаться на приём", callback_data: "dente:schedule" }],
			[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
		],
	};
}

export function buildHumanTakeoverKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "🤖 Вернуться к меню бота",
					callback_data: "triage:return_to_bot",
				},
			],
		],
	};
}

export function buildPhotoIntakeSuccessKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📅 Выбрать удобное время приёма",
					callback_data: "dente:schedule",
				},
			],
			[
				{
					text: "🧮 Рассчитать ориентировочную стоимость",
					callback_data: "triage:calc:root",
				},
			],
			[
				{
					text: "👨‍💼 Позвать администратора",
					callback_data: "triage:human_request",
				},
			],
			[
				{
					text: "🏠 Главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

export function buildPhotoIntakeFailedKeyboard(): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[{ text: "🩺 Открыть меню опросника", callback_data: "triage:root" }],
		],
	};
}
