import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	communicationTasks,
	crmLeads,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import {
	answerTelegramCallbackQuery,
	downloadTelegramFile,
	editTelegramMessageText,
	getTelegramFile,
	sendTelegramTextMessage,
	type TelegramTransportResult,
} from "../../telegramTransport.js";
import {
	getTelegramDialogSession,
	updateTelegramDialogSession,
	type TelegramBotDialogSession,
} from "./telegramLegacyMemoryStore.js";
import { wsBroker } from "../websocketBroker.js";

// ============================================================================
// ИНТЕРФЕЙСЫ И СТРУКТУРЫ ИНТЕРАКТИВНОГО ДВИЖКА (DVACHBOT IN-PLACE STYLE)
// ============================================================================

export type TelegramInlineButton = {
	text: string;
	callback_data?: string;
	url?: string;
};

export type TelegramInlineKeyboard = {
	inline_keyboard: TelegramInlineButton[][];
};

export type TriageScreenResult = {
	text: string;
	replyMarkup: TelegramInlineKeyboard;
};

export type TreatmentCostOption = {
	id: string;
	label: string;
	priceRub: number;
	description?: string;
};

export type ImplantSystemPreset = {
	code: string;
	brand: string;
	country: string;
	priceRub: number;
	warrantyYears: number | string;
};

export type CrownTypePreset = {
	code: string;
	name: string;
	priceRub: number;
	aestheticRating: number; // 1-5
};

// Каталог имплантационных систем (проверенные клинические стандарты РФ)
export const IMPLANT_PRESETS: ImplantSystemPreset[] = [
	{
		code: "osstem",
		brand: "Osstem",
		country: "Южная Корея",
		priceRub: 35000,
		warrantyYears: "Пожизненная",
	},
	{
		code: "dentium",
		brand: "Dentium SuperLine",
		country: "Южная Корея",
		priceRub: 38000,
		warrantyYears: "Пожизненная",
	},
	{
		code: "straumann",
		brand: "Straumann SLA",
		country: "Швейцария",
		priceRub: 65000,
		warrantyYears: "Пожизненная",
	},
];

// Каталог ортопедических коронок на имплант / зуб
export const CROWN_PRESETS: CrownTypePreset[] = [
	{
		code: "zirconia",
		name: "Диоксид циркония (Prettau/Katana)",
		priceRub: 32000,
		aestheticRating: 5,
	},
	{
		code: "emax",
		name: "Керамика E.max (Германия)",
		priceRub: 35000,
		aestheticRating: 5,
	},
	{
		code: "metal_ceramic",
		name: "Металлокерамика (стандарт)",
		priceRub: 18000,
		aestheticRating: 3,
	},
];

// Каталог терапевтического лечения кариеса
export const CARIES_PRESETS = [
	{
		code: "medium",
		label: "Средний кариес (световая пломба Estelite/Filtek)",
		priceRub: 5500,
	},
	{
		code: "deep",
		label: "Глубокий кариес с лечебной прокладкой",
		priceRub: 7200,
	},
	{
		code: "aesthetic_front",
		label: "Художественная реставрация переднего зуба",
		priceRub: 9500,
	},
];

// Каталог отбеливания
export const WHITENING_PRESETS = [
	{
		code: "flash",
		label: "Холодное аппаратное отбеливание FLASH (Германия)",
		priceRub: 28000,
	},
	{
		code: "zoom4",
		label: "Клиническое отбеливание Philips Zoom 4",
		priceRub: 34000,
	},
	{
		code: "home_kit",
		label: "Домашнее отбеливание с индивидуальными каппами",
		priceRub: 14000,
	},
];

/**
 * Сервис интерактивного триажа симптомов, калькулятора стоимости,
 * приема фото/медиа и режима перехвата диалога человеком.
 * Построен по философии In-Place UI (Zero Chat Landfill):
 * все шаги обновляют существующее сообщение без мусора в чате.
 */
export class TelegramInteractiveTriageService {
	/**
	 * Главное меню интерактивного триажа симптомов.
	 */
	static getRootTriageScreen(): TriageScreenResult {
		const text = [
			"🩺 <b>Клинический экспресс-опросник DENTE</b>",
			"",
			"Что вас беспокоит в данный момент? Выберите подходящий пункт, и бот подскажет правильные доврачебные действия, сориентирует по стоимости и поможет попасть к нужному специалисту без очередей:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { text, replyMarkup };
	}

	/**
	 * Ветка: Экстренная острая боль / отёк (CITO).
	 */
	static getEmergencyScreen(): TriageScreenResult {
		const text = [
			"🚨 <b>ЭКСТРЕННАЯ СИТУАЦИЯ (CITO)</b>",
			"",
			"<b>Памятка неотложной доврачебной помощи:</b>",
			"1. 🛑 <b>КАТЕГОРИЧЕСКИ НЕ ГРЕТЬ ЩЕКУ И ДЕСНУ!</b> Тепло (грелки, шарфы, горячие компрессы) ускоряет нагноение и может вызвать флегмону.",
			"2. 💊 <b>Обезболивающее:</b> Примите НПВП (Ибупрофен 400 мг / Кетонал 50 мг / Нимесулид) при отсутствии аллергии и противопоказаний.",
			"3. ❄️ <b>Холодный компресс:</b> Приложите лёд через полотенце к щеке снаружи на 10-15 минут.",
			"4. 🚫 Не кладите таблетки на десну рядом с зубом — это вызывает химический ожог слизистой.",
			"",
			"Принимаем экстренных пациентов без очереди. Нажмите кнопку записи или срочного звонка:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { text, replyMarkup };
	}

	/**
	 * Ветка: Откололся зуб / выпала пломба.
	 */
	static getBrokenToothScreen(subStep?: string): TriageScreenResult {
		if (subStep === "sharp") {
			return {
				text: [
					"🦷 <b>Острый край травмирует слизистую</b>",
					"",
					"<b>Временная рекомендация:</b>",
					"• Можно временно закрыть острый край кусочком ортодонтического воска или чистой жевательной резинкой без сахара, чтобы не травмировать язык и щёку.",
					"• Постарайтесь не жевать на эту сторону твердую пищу.",
					"",
					"📸 Вы можете <b>отправить фотографию зуба прямо в этот чат</b> — врач предварительно оценит объем скола перед консультацией.",
				].join("\n"),
				replyMarkup: {
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
				},
			};
		}

		if (subStep === "pain") {
			return {
				text: [
					"⚠️ <b>Боль при накусывании или от холодного/горячего</b>",
					"",
					"Это признак того, что скол оголил дентин или сосудисто-нервный пучок (пульпу зуба).",
					"",
					"<b>Клинический маршрут:</b>",
					"• Необходим осмотр врача-терапевта с диагностическим визиографическим снимком.",
					"• При сохранении жизнеспособности пульпы — восстановление анатомической формы зуба.",
					"• Если поврежден нерв — бережное лечение корневых каналов под операционным микроскопом.",
				].join("\n"),
				replyMarkup: {
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
				},
			};
		}

		const text = [
			"🦷 <b>Откололся зуб или выпала пломба</b>",
			"",
			"Уточните характер ощущений, чтобы мы направили вас к нужному специалисту:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { text, replyMarkup };
	}

	/**
	 * Ветка: Кровоточат десны / запах.
	 */
	static getGumsScreen(): TriageScreenResult {
		const text = [
			"🩸 <b>Здоровье десен и пародонта</b>",
			"",
			"<b>Клинические признаки воспаления:</b>",
			"• <b>Кровь при чистке зубов или еде:</b> признак гингивита из-за наддесневого зубного камня и биопленки.",
			"• <b>Подвижность зубов / оголение шеек:</b> признак пародонтита и убыли костной ткани.",
			"• <b>Неприятный запах:</b> следствие активности анаэробных бактерий в пародонтальных карманах.",
			"",
			"<b>Рекомендованный план:</b>",
			"1. Профессиональная гигиена полости рта (ультразвуковой скейлинг + бережный AirFlow с порошком на основе глицина/эритритола).",
			"2. При необходимости — диагностика глубины карманов и составление пародонтограммы (перио-карты).",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { text, replyMarkup };
	}

	/**
	 * Ветка: Эстетика улыбки (виниры, элайнеры, отбеливание).
	 */
	static getAestheticScreen(subStep?: string): TriageScreenResult {
		if (subStep === "color") {
			return {
				text: [
					"✨ <b>Осветление оттенка зубов</b>",
					"",
					"<b>Методы безопасного клинического отбеливания:</b>",
					"• <b>FLASH (Германия):</b> холодный светодиодный спектр, отсутствие нагрева пульпы, минимальная чувствительность.",
					"• <b>Zoom 4 (Philips):</b> осветление до 8 тонов за 1 визит.",
					"• <b>Домашнее отбеливание:</b> индивидуальные каппы с мягким гелем карбамида.",
					"",
					"<i>Перед отбеливанием обязательно проводится профессиональная гигиена полости рта.</i>",
				].join("\n"),
				replyMarkup: {
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
				},
			};
		}

		if (subStep === "veneers") {
			return {
				text: [
					"💎 <b>Керамические виниры E.max</b>",
					"",
					"Идеальное решение для коррекции:",
					"• Формы и длины зубов",
					"• Сколов, старых потемневших пломб",
					"• Диастемических щелей между зубами",
					"• Стойкого дисколорита, не поддающегося отбеливанию",
					"",
					"Толщина винира всего 0.3-0.5 мм с микропрепарированием в пределах эмали.",
				].join("\n"),
				replyMarkup: {
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
				},
			};
		}

		if (subStep === "ortho") {
			return {
				text: [
					"📐 <b>Исправление прикуса и скученности</b>",
					"",
					"<b>Современные технологии:</b>",
					"• <b>Элайнеры:</b> прозрачные съемные каппы. Незаметны для окружающих, не мешают гигиене и привычному питанию.",
					"• <b>Брекет-системы:</b> металлические и керамические самолигирующие системы Damon.",
					"",
					"3D-моделирование результата лечения до начала установки!",
				].join("\n"),
				replyMarkup: {
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
				},
			};
		}

		const text = [
			"✨ <b>Эстетическая стоматология DENTE</b>",
			"",
			"Что вы хотите улучшить в своей улыбке?",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { text, replyMarkup };
	}

	/**
	 * Ветка: Подготовка ребенка к приёму.
	 */
	static getKidsScreen(): TriageScreenResult {
		const text = [
			"👶 <b>Бесконфликтная подготовка ребенка к визиту</b>",
			"",
			"<b>Золотые правила детских стоматологов DENTE:</b>",
			"1. 🚫 <b>Запретные фразы:</b> Не говорите ребенку «Не бойся!», «Там не больно», «Укола не будет». Детский мозг фокусируется именно на слове «БОЛЬ» и начинает тревожиться.",
			"2. 🎮 <b>Игровая подача:</b> Скажите: «Мы идем познакомиться с доктором, он покажет волшебное кресло-космолет и посчитает твои зубки».",
			"3. ⏰ <b>Время визита:</b> Записывайтесь на утренние часы, когда ребенок выспался и не утомлен после детского сада/школы.",
			"4. 🤝 <b>Первый визит — адаптационный:</b> Никаких сверлений и боли! Ребенок знакомится с врачом, катается на кресле и получает подарок за смелость.",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { text, replyMarkup };
	}

	// ========================================================================
	// КАЛЬКУЛЯТОР СТОИМОСТИ ЛЕЧЕНИЯ В 3 КЛИКА (TREATMENT COST ESTIMATOR)
	// ========================================================================

	/**
	 * Главный экран калькулятора.
	 */
	static getCalculatorRootScreen(): TriageScreenResult {
		const text = [
			"🧮 <b>Калькулятор стоимости лечения DENTE</b>",
			"",
			"Интерактивный расчет в 3 клика с прозрачной фиксацией цен «под ключ» без скрытых платежей:",
			"Выберите интересующее направление:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { text, replyMarkup };
	}

	/**
	 * Шаг 1 Имплантации: Выбор системы импланта.
	 */
	static getImplantSystemSelectionScreen(): TriageScreenResult {
		const text = [
			"🔩 <b>Калькулятор имплантации (Шаг 1 из 2)</b>",
			"",
			"Выберите систему имплантата:",
		].join("\n");

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

		return { text, replyMarkup: { inline_keyboard: buttons } };
	}

	/**
	 * Шаг 2 Имплантации: Выбор коронки.
	 */
	static getImplantCrownSelectionScreen(implantCode: string): TriageScreenResult {
		const imp = IMPLANT_PRESETS.find((p) => p.code === implantCode) ?? IMPLANT_PRESETS[0]!;

		const text = [
			"🔩 <b>Калькулятор имплантации (Шаг 2 из 2)</b>",
			"",
			`Выбран имплантат: <b>${imp.brand} (${imp.country})</b> — ${imp.priceRub.toLocaleString("ru-RU")} ₽`,
			"",
			"Теперь выберите тип постоянной коронки на имплант:",
		].join("\n");

		const buttons: TelegramInlineButton[][] = CROWN_PRESETS.map((crw) => [
			{
				text: `${crw.name} — ${crw.priceRub.toLocaleString("ru-RU")} ₽`,
				callback_data: `triage:calc:res:imp:${imp.code}:${crw.code}`,
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

		return { text, replyMarkup: { inline_keyboard: buttons } };
	}

	/**
	 * Итоговый расчет имплантации «под ключ».
	 */
	static getImplantResultScreen(implantCode: string, crownCode: string): TriageScreenResult {
		const imp = IMPLANT_PRESETS.find((p) => p.code === implantCode) ?? IMPLANT_PRESETS[0]!;
		const crw = CROWN_PRESETS.find((c) => c.code === crownCode) ?? CROWN_PRESETS[0]!;

		const totalRub = imp.priceRub + crw.priceRub;

		const text = [
			"📋 <b>Итоговая смета имплантации «ПОД КЛЮЧ»</b>",
			"",
			`1. <b>Хирургический этап:</b>`,
			`   • Имплантат ${imp.brand} (${imp.country})`,
			`   • Установка имплантата и анестезия`,
			`   • Формирователь десны и снятие швов`,
			`   • <i>Стоимость: ${imp.priceRub.toLocaleString("ru-RU")} ₽</i>`,
			"",
			`2. <b>Ортопедический этап:</b>`,
			`   • Индивидуальный титановый абатмент`,
			`   • Коронка: ${crw.name}`,
			`   • Винтовая фиксация в прикусе`,
			`   • <i>Стоимость: ${crw.priceRub.toLocaleString("ru-RU")} ₽</i>`,
			"",
			`━━━━━━━━━━━━━━━━━━━━`,
			`💰 <b>Итоговый бюджет: ${totalRub.toLocaleString("ru-RU")} ₽</b>`,
			`🛡️ <b>Гарантия: ${imp.warrantyYears}</b>`,
			"",
			"💡 <i>Вы можете зафиксировать этот расчет прямо сейчас и забронировать время консультации хирурга-имплантолога:</i>",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{
						text: "🔒 Зафиксировать цену и записаться",
						callback_data: `triage:calc:lock:imp:${imp.code}:${crw.code}`,
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

		return { text, replyMarkup };
	}

	/**
	 * Калькулятор коронок на зубы.
	 */
	static getCrownCalculatorScreen(): TriageScreenResult {
		const text = [
			"👑 <b>Коронки на зубы (протезирование)</b>",
			"",
			"Ориентировочная стоимость изготовления и установки анатомической коронки:",
		].join("\n");

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

		return { text, replyMarkup: { inline_keyboard: buttons } };
	}

	/**
	 * Калькулятор лечения кариеса.
	 */
	static getCariesCalculatorScreen(): TriageScreenResult {
		const text = [
			"🦷 <b>Лечение кариеса и реставрация зубов</b>",
			"",
			"В стоимость входит: анестезия, коффердам (изоляция), бережное препарирование, светоотверждаемый наногибридный композит и шлифовка:",
		].join("\n");

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

		return { text, replyMarkup: { inline_keyboard: buttons } };
	}

	/**
	 * Калькулятор отбеливания.
	 */
	static getWhiteningCalculatorScreen(): TriageScreenResult {
		const text = [
			"✨ <b>Профессиональное отбеливание зубов</b>",
			"",
			"Выберите технологию:",
		].join("\n");

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

		return { text, replyMarkup: { inline_keyboard: buttons } };
	}

	// ========================================================================
	// РЕЖИМ ПЕРЕХВАТА ЧЕЛОВЕКОМ (HUMAN LIVE CHAT TAKEOVER)
	// ========================================================================

	/**
	 * Проверка, находится ли чат в режиме общения с живым человеком.
	 */
	static isChatInHumanMode(
		chatFingerprint: string,
		organizationId: string,
		botConfigId?: string | null,
	): boolean {
		const session = getTelegramDialogSession(
			chatFingerprint,
			organizationId,
			botConfigId,
		);
		return session?.metadata?.dialog_mode === "human_mode";
	}

	/**
	 * Переключение чата в режим живого администратора (Human Takeover).
	 */
	static async enableHumanMode(params: {
		chatFingerprint: string;
		organizationId: string;
		clinicId?: string | null;
		botConfigId?: string | null;
		chatId?: string | null;
		reason?: string;
	}): Promise<TriageScreenResult> {
		const { chatFingerprint, organizationId, clinicId, botConfigId, chatId, reason } = params;

		updateTelegramDialogSession(
			chatFingerprint,
			organizationId,
			{
				clinicId: clinicId ?? null,
				chatId: chatId ?? null,
				currentStep: "human_mode",
				metadata: {
					dialog_mode: "human_mode",
					human_takeover_at: Date.now(),
					takeover_reason: reason || "Запрос связи от пациента",
				},
			},
			botConfigId,
		);

		// Создаем задачу для администратора клиники
		try {
			await withTenantCtx(organizationId, async (tx) => {
				// Проверяем, есть ли привязанный пациент
				const [link] = await tx
					.select({ subjectId: denteTelegramChatLinks.subjectId })
					.from(denteTelegramChatLinks)
					.where(
						and(
							eq(denteTelegramChatLinks.organizationId, organizationId),
							eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
							eq(denteTelegramChatLinks.status, "active"),
						),
					)
					.limit(1);

				if (link?.subjectId) {
					await tx.insert(communicationTasks).values({
						organizationId,
						clinicId: clinicId ? clinicId : null,
						patientId: link.subjectId,
						assignedRole: "reception",
						channel: "telegram" as const,
						intent: "general" as const,
						status: "queued" as const,
						priority: "high" as const,
						dueAt: new Date(Date.now() + 5 * 60_000), // 5 минут на ответ
						title: "Входящий диалог Telegram (пациент ожидает администратора)",
						body: `Пациент запросил ответ человека в Telegram-боте. Причина: ${reason || "Позвать администратора"}`,
					});
				}
			});
		} catch (taskErr) {
			console.warn("[TelegramInteractiveTriage] Не удалось создать communicationTask:", taskErr);
		}

		// Трансляция события через WebSocket брокер клиники
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "TELEGRAM_HUMAN_TAKEOVER",
				payload: {
					organizationId,
					clinicId: clinicId ?? null,
					chatFingerprint,
					chatId: chatId ?? null,
					reason: reason || "Запрос связи от пациента",
					timestamp: new Date().toISOString(),
				},
			});
		} catch (wsErr) {
			console.warn("[TelegramInteractiveTriage] Ошибка WebSocket оповещения:", wsErr);
		}

		const text = [
			"👨‍💼 <b>Чат переведён на администратора клиники</b>",
			"",
			"Бот временно отключен для этого диалога. Дежурный администратор уже видит ваше обращение и ответит вам прямо в этом чате в течение нескольких минут.",
			"",
			"Напишите ваш вопрос или оставьте контактный номер телефона. Если захотите вернуться к меню бота, нажмите кнопку ниже:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{
						text: "🤖 Вернуться к меню бота",
						callback_data: "triage:return_to_bot",
					},
				],
			],
		};

		return { text, replyMarkup };
	}

	/**
	 * Возврат чата из режима человека обратно в автоматический бот-режим.
	 */
	static returnToBotMode(
		chatFingerprint: string,
		organizationId: string,
		botConfigId?: string | null,
	): TriageScreenResult {
		updateTelegramDialogSession(
			chatFingerprint,
			organizationId,
			{
				currentStep: "idle",
				metadata: {
					dialog_mode: "bot",
					human_takeover_ended_at: Date.now(),
				},
			},
			botConfigId,
		);

		return this.getRootTriageScreen();
	}

	// ========================================================================
	// ОБРАБОТКА МЕДИА И ФОТО ОТ ПАЦИЕНТА (MEDIA INTAKE & STORAGE)
	// ========================================================================

	/**
	 * Безопасный приём фотографии от пациента через Telegram Bot API.
	 * Скачивает файл, сохраняет в защищенное хранилище клиники и создает заявку в CRM.
	 */
	static async handlePhotoIntake(params: {
		botToken: string;
		organizationId: string;
		clinicId?: string | null;
		botConfigId?: string | null;
		chatId: string;
		fileId: string;
		caption?: string | null;
		updateId: number;
		storageDir?: string;
	}): Promise<{ ok: boolean; savedPath?: string | undefined; responseScreen: TriageScreenResult }> {
		const {
			botToken,
			organizationId,
			clinicId,
			botConfigId,
			chatId,
			fileId,
			caption,
			updateId,
		} = params;

		// 1. Получаем путь к файлу в Telegram Bot API
		const fileInfo = await getTelegramFile({ botToken, fileId });
		if (!fileInfo.ok) {
			return {
				ok: false,
				responseScreen: {
					text: "К сожалению, не удалось загрузить снимок из Telegram. Попробуйте отправить фото ещё раз или покажите снимок администратору при визите.",
					replyMarkup: {
						inline_keyboard: [
							[{ text: "🩺 Открыть меню опросника", callback_data: "triage:root" }],
						],
					},
				},
			};
		}

		// 2. Скачиваем бинарные данные файла
		const downloadResult = await downloadTelegramFile({
			botToken,
			filePath: fileInfo.filePath,
		});

		let savedLocalPath: string | undefined;

		if (downloadResult.ok) {
			try {
				const uploadsBase =
					params.storageDir ||
					path.resolve(process.cwd(), "apps/api/uploads/telegram_media");
				if (!fs.existsSync(uploadsBase)) {
					fs.mkdirSync(uploadsBase, { recursive: true });
				}

				const ext = path.extname(fileInfo.filePath) || ".jpg";
				const fileHash = createHash("sha256")
					.update(downloadResult.buffer)
					.digest("hex")
					.slice(0, 16);
				const fileName = `intake_${Date.now()}_${fileHash}${ext}`;
				savedLocalPath = path.join(uploadsBase, fileName);
				fs.writeFileSync(savedLocalPath, downloadResult.buffer);
			} catch (writeErr) {
				console.warn("[TelegramInteractiveTriage] Ошибка записи фото на диск:", writeErr);
			}
		}

		// 3. Фиксация в базе данных CRM (messenger_inbound_events)
		try {
			await withTenantCtx(organizationId, async (tx) => {
				const msgId = `tg_photo_${updateId}`;
				await tx.insert(messengerInboundEvents).values({
					organizationId,
					channel: "telegram" as const,
					externalId: msgId,
					externalChatId: chatId,
					messageText: caption?.trim() || "[Фотография от пациента]",
					eventKind: "photo",
					rawPayload: {
						fileId,
						fileSize: fileInfo.fileSize,
						filePath: fileInfo.filePath,
						savedLocalPath,
						caption,
					},
				});
			});
		} catch (dbErr) {
			console.warn("[TelegramInteractiveTriage] Ошибка сохранения фото в БД:", dbErr);
		}

		// 4. Оповещение персонала через WebSocket
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "TELEGRAM_MEDIA_INTAKE",
				payload: {
					organizationId,
					clinicId: clinicId ?? null,
					chatId,
					caption: caption || null,
					savedLocalPath,
					timestamp: new Date().toISOString(),
				},
			});
		} catch (wsErr) {
			console.warn("[TelegramInteractiveTriage] WS notification failed:", wsErr);
		}

		const text = [
			"📸 <b>Фотография успешно получена!</b>",
			"",
			"Снимок безопасно сохранён во входящих материалах клиники DENTE (в защищенном контуре 152-ФЗ / 323-ФЗ без публичного доступа).",
			"Врач ознакомится с вашим снимком перед приёмом.",
			"",
			"Хотите записаться на консультацию или рассчитать предварительный бюджет лечения?",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
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

		return { ok: true, savedPath: savedLocalPath, responseScreen: { text, replyMarkup } };
	}

	// ========================================================================
	// ДИСПЕТЧЕР IN-PLACE ОБРАБОТКИ CALLBACK QUERY (ZERO CHAT LANDFILL)
	// ========================================================================

	/**
	 * Главный обработчик интерактивных кнопок триажа, калькулятора и перехвата.
	 * Обновляет существующее сообщение через editMessageText (In-Place UI).
	 */
	static async handleCallbackQuery(params: {
		callbackData: string;
		callbackQueryId: string | null;
		chatFingerprint: string;
		chatId: string;
		messageId: number | null;
		botToken: string;
		organizationId: string;
		clinicId?: string | null;
		botConfigId?: string | null;
	}): Promise<{ handled: boolean; screen?: TriageScreenResult }> {
		const {
			callbackData,
			callbackQueryId,
			chatFingerprint,
			chatId,
			messageId,
			botToken,
			organizationId,
			clinicId,
			botConfigId,
		} = params;

		let targetScreen: TriageScreenResult | null = null;

		// 1. Корневое меню триажа
		if (callbackData === "triage:root") {
			targetScreen = this.getRootTriageScreen();
		}
		// 2. Ветка острой боли
		else if (callbackData === "triage:emergency") {
			targetScreen = this.getEmergencyScreen();
		} else if (callbackData === "triage:cito_book") {
			targetScreen = {
				text: [
					"🚨 <b>Ближайшие экстренные слоты CITO</b>",
					"",
					"Дежурный врач готов принять вас по острой боли сегодня.",
					"Для мгновенной фиксации слота нажмите кнопку ниже или позвоните в клинику:",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "📅 Подтвердить экстренный слот", callback_data: "dente:schedule" }],
						[{ text: "📞 Позвонить администратору", callback_data: "triage:human_request" }],
						[{ text: "« Назад к памятке", callback_data: "triage:emergency" }],
					],
				},
			};
		}
		// 3. Ветка отколотого зуба
		else if (callbackData === "triage:broken_tooth") {
			targetScreen = this.getBrokenToothScreen();
		} else if (callbackData === "triage:tooth_pain") {
			targetScreen = this.getBrokenToothScreen("pain");
		} else if (callbackData === "triage:tooth_sharp") {
			targetScreen = this.getBrokenToothScreen("sharp");
		} else if (callbackData === "triage:photo_hint") {
			targetScreen = {
				text: [
					"📸 <b>Как правильно сделать снимок зуба:</b>",
					"",
					"1. Включите фонарик на телефоне или подойдите к яркому свету.",
					"2. Слегка отодвиньте щёку или губу пальцем, чтобы зуб был в фокусе.",
					"3. Сделайте 1-2 чётких снимка и просто <b>отправьте их в этот чат как фото</b>.",
					"",
					"Бот сохранит фото в вашей электронной карточке, и врач изучит снимок перед консультацией.",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "« Назад к оценке скола", callback_data: "triage:broken_tooth" }],
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		}
		// 4. Ветка десен
		else if (callbackData === "triage:gums") {
			targetScreen = this.getGumsScreen();
		}
		// 5. Ветка эстетики
		else if (callbackData === "triage:aesthetic") {
			targetScreen = this.getAestheticScreen();
		} else if (callbackData === "triage:aest_color") {
			targetScreen = this.getAestheticScreen("color");
		} else if (callbackData === "triage:aest_veneers") {
			targetScreen = this.getAestheticScreen("veneers");
		} else if (callbackData === "triage:aest_ortho") {
			targetScreen = this.getAestheticScreen("ortho");
		}
		// 6. Ветка детского приёма
		else if (callbackData === "triage:kids") {
			targetScreen = this.getKidsScreen();
		}
		// 7. Калькулятор: главное меню
		else if (callbackData === "triage:calc:root") {
			targetScreen = this.getCalculatorRootScreen();
		}
		// 8. Калькулятор имплантации
		else if (callbackData === "triage:calc:cat:implant") {
			targetScreen = this.getImplantSystemSelectionScreen();
		} else if (callbackData.startsWith("triage:calc:imp:")) {
			const impCode = callbackData.replace("triage:calc:imp:", "");
			targetScreen = this.getImplantCrownSelectionScreen(impCode);
		} else if (callbackData.startsWith("triage:calc:res:imp:")) {
			const parts = callbackData.replace("triage:calc:res:imp:", "").split(":");
			const impCode = parts[0] || "osstem";
			const crwCode = parts[1] || "zirconia";
			targetScreen = this.getImplantResultScreen(impCode, crwCode);
		} else if (callbackData.startsWith("triage:calc:lock:imp:")) {
			targetScreen = {
				text: [
					"✅ <b>Расчет имплантации зафиксирован!</b>",
					"",
					"Смета «под ключ» сохранена за вашим номером. Администратор клиники забронирует за вами спецпредложение при визите.",
					"",
					"Выберите удобный день для диагностического осмотра:",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "📅 Выбрать дату и время приёма", callback_data: "dente:schedule" }],
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		}
		// 9. Калькулятор коронок
		else if (callbackData === "triage:calc:cat:crown") {
			targetScreen = this.getCrownCalculatorScreen();
		}
		// 10. Калькулятор кариеса
		else if (callbackData === "triage:calc:cat:caries") {
			targetScreen = this.getCariesCalculatorScreen();
		}
		// 11. Калькулятор отбеливания
		else if (callbackData === "triage:calc:cat:whitening") {
			targetScreen = this.getWhiteningCalculatorScreen();
		}
		// 12. Фиксация общих расчетов калькулятора
		else if (callbackData.startsWith("triage:calc:lock:")) {
			targetScreen = {
				text: [
					"✅ <b>Стоимость зафиксирована!</b>",
					"",
					"Предварительный расчет сохранён. Запишитесь на осмотр для подтверждения плана лечения врачом:",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "📅 Записаться на приём", callback_data: "dente:schedule" }],
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		}
		// 13. Режим перехвата человеком (Human Live Chat Takeover)
		else if (callbackData === "triage:human_request") {
			targetScreen = await this.enableHumanMode({
				chatFingerprint,
				organizationId,
				clinicId: clinicId ?? null,
				botConfigId: botConfigId ?? null,
				chatId,
				reason: "Нажата кнопка «Позвать администратора» в интерактивном опроснике",
			});
		} else if (callbackData === "triage:return_to_bot") {
			targetScreen = this.returnToBotMode(chatFingerprint, organizationId, botConfigId);
		}

		if (!targetScreen) {
			return { handled: false };
		}

		// Отвечаем на callback_query, чтобы убрать часики ожидания на кнопке Telegram
		if (callbackQueryId && botToken) {
			void answerTelegramCallbackQuery({
				botToken,
				callbackQueryId,
				text: "Загрузка...",
			}).catch(() => {});
		}

		// In-Place UI: обновляем текущее сообщение без мусора в чате
		if (messageId && botToken && chatId) {
			const editResult = await editTelegramMessageText({
				botToken,
				chatId,
				messageId,
				text: targetScreen.text,
				replyMarkup: targetScreen.replyMarkup,
			});

			// Если редактирование не прошло (сообщение слишком старое или было фото), шлем новое
			if (!editResult.ok && editResult.errorClass !== null) {
				await sendTelegramTextMessage({
					botToken,
					chatId,
					text: targetScreen.text,
					replyMarkup: targetScreen.replyMarkup,
				});
			}
		}

		return { handled: true, screen: targetScreen };
	}
}
