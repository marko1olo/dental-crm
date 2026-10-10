/**
 * careTemplates.ts
 *
 * Шаблоны экранов, клинические памятки и классификатор сложных операций
 * для пайплайна послеоперационного теле-мониторинга DENTE.
 */

import type {
	TelegramInlineKeyboard,
	TriageScreenResult,
} from "../TelegramInteractiveTriageService.js";

/**
 * Ключевые слова и паттерны сложных хирургических манипуляций в амбулаторной стоматологии.
 */
export const COMPLEX_SURGERY_PATTERNS: ReadonlyArray<RegExp> = [
	/имплант/i, /implant/i, /синус[- ]?лифтинг/i, /sinus[- ]?lift/i,
	/костн[а-яё]*\s+пластик/i, /аугментац/i, /расщеплен[а-яё]*\s+гребн/i,
	/удален[а-яё]*.*(?:восьмер|8|зуб\s+мудрост)/i, /сложн[а-яё]*\s+удален/i,
	/ретинирован/i, /дистопирован/i, /резекци[а-яё]*\s+верхушк/i,
	/all[- ]on[- ][46]/i, /цистэктоми/i, /вестибулопластик/i,
];

/**
 * Проверяет, относится ли процедура/услуга к сложным операциям, требующим теле-ухода.
 */
export function isComplexSurgery(servicesOrTitle: string | string[]): boolean {
	const titles = Array.isArray(servicesOrTitle) ? servicesOrTitle : [servicesOrTitle];
	return titles.some((title) => {
		if (!title || typeof title !== "string") return false;
		return COMPLEX_SURGERY_PATTERNS.some((pattern) => pattern.test(title));
	});
}

/**
 * Экран: Через 3 часа после операции.
 */
export function get3HoursScreen(surgeryTitle?: string): TriageScreenResult {
	const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
	const text = [
		`👨‍⚕️ <b>Контроль самочувствия через 3 часа после операции${titleStr}</b>`,
		"",
		"Прошло 3 часа после вмешательства. Врач и клиника DENTE на связи с вами:",
		"• Отошла ли анестезия («заморозка») или начинает плавно отходить?",
		"• Начали ли действовать назначенные обезболивающие препараты?",
		"• Нет ли стойкого онемения губы или обильного кровотечения?",
		"",
		"Пожалуйста, выберите ваше состояние кнопкой ниже:",
	].join("\n");

	const replyMarkup: TelegramInlineKeyboard = {
		inline_keyboard: [
			[
				{
					text: "✅ Всё спокойно, анестезия отходит, отдыхаю",
					callback_data: "postop:3h:ok",
				},
			],
			[
				{
					text: "💊 Болит, принял(а) назначенное обезболивающее",
					callback_data: "postop:3h:pain_mild",
				},
			],
			[
				{
					text: "⚠️ Губа/подбородок онемели и не чувствую совсем",
					callback_data: "postop:3h:numbness",
				},
			],
			[
				{
					text: "🩸 Кровоточит / сильная боль (SOS)",
					callback_data: "postop:3h:sos",
				},
			],
			[
				{
					text: "📞 Связаться с клиникой",
					callback_data: "triage:human_request",
				},
			],
		],
	};

	return { text, replyMarkup };
}

/**
 * Экран: День 1 (контроль отёка, температуры, шкала боли 1-5).
 */
export function getDay1Screen(surgeryTitle?: string): TriageScreenResult {
	const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
	const text = [
		`☀️ <b>День 1 после операции${titleStr}: контроль восстановления</b>`,
		"",
		"Как прошла первая ночь? Напоминаем ключевые правила первого дня:",
		"• Умеренная ноющая боль и нарастание отёка к вечеру — естественная реакция.",
		"• Прикладывайте сухой холод через салфетку по 15 минут с перерывами.",
		"• <b>Категорически не греть щёку!</b>",
		"",
		"Оцените ваш уровень боли прямо сейчас (по шкале от 1 до 5):",
	].join("\n");

	const replyMarkup: TelegramInlineKeyboard = {
		inline_keyboard: [
			[
				{ text: "1: Совсем не болит", callback_data: "postop:day1:score:1" },
				{ text: "2: Слабая боль", callback_data: "postop:day1:score:2" },
				{ text: "3: Умеренная", callback_data: "postop:day1:score:3" },
			],
			[
				{ text: "4: Сильная боль (тяжело)", callback_data: "postop:day1:score:4" },
				{ text: "5: Нестерпимая боль! (SOS)", callback_data: "postop:day1:score:5" },
			],
			[
				{ text: "🌡️ Температура поднялась > 38.2°C", callback_data: "postop:day1:fever" },
				{ text: "🩸 Кровь не останавливается", callback_data: "postop:day1:bleeding" },
			],
			[
				{ text: "📞 Позвонить дежурному врачу", callback_data: "triage:human_request" },
				{ text: "🏠 Главное меню", callback_data: "dente:start" },
			],
		],
	};

	return { text, replyMarkup };
}

/**
 * Экран: День 3 (пик отёка, тревожная кнопка).
 */
export function getDay3Screen(surgeryTitle?: string): TriageScreenResult {
	const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
	const text = [
		`🧊 <b>День 3 после операции${titleStr}: пик естественного отёка</b>`,
		"",
		"<b>Важная клиническая памятка:</b>",
		"Сегодня 3-и сутки — физиологический пик послеоперационного отёка. Начиная с завтрашнего дня он начнет плавно спадать.",
		"",
		"🛑 <b>ГРЕТЬ ЩЁКУ КАТЕГОРИЧЕСКИ НЕЛЬЗЯ!</b> Согревающие компрессы могут вызвать нагноение.",
		"Отёк должен быть мягким и безболезненным при поверхностном касании.",
		"",
		"Как вы себя чувствуете сегодня?",
	].join("\n");

	const replyMarkup: TelegramInlineKeyboard = {
		inline_keyboard: [
			[
				{
					text: "✅ Отёк есть, но мягкий, температура в норме",
					callback_data: "postop:day3:ok",
				},
			],
			[
				{
					text: "⚠️ Отёк плотный, горячий или переходит на шею (SOS)",
					callback_data: "postop:day3:neck_swelling",
				},
			],
			[
				{
					text: "🌡️ Поднялась температура выше 38.2°C (SOS)",
					callback_data: "postop:day3:fever",
				},
			],
			[
				{
					text: "💊 Беспокоит нарастающая боль",
					callback_data: "postop:day3:pain",
				},
			],
			[
				{
					text: "📞 Позвонить в клинику",
					callback_data: "triage:human_request",
				},
			],
		],
	};

	return { text, replyMarkup };
}

/**
 * Экран: День 7 (снятие швов и контрольный осмотр).
 */
export function getDay7Screen(surgeryTitle?: string): TriageScreenResult {
	const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
	const text = [
		`🧵 <b>День 7 после вмешательства${titleStr}: снятие швов</b>`,
		"",
		"Прошла неделя со дня операции. Основная фаза первичного заживления завершена!",
		"",
		"Наступило время контрольного осмотра хирургом и бережного снятия швов (процедура занимает 5 минут и совершенно безболезненна).",
		"",
		"Запишитесь на визит к вашему оперировавшему хирургу:",
	].join("\n");

	const replyMarkup: TelegramInlineKeyboard = {
		inline_keyboard: [
			[
				{
					text: "📅 Записаться на снятие швов к врачу",
					callback_data: "dente:schedule",
				},
			],
			[
				{
					text: "✅ Швы уже сняты / самочувствие отличное",
					callback_data: "postop:day7:ok",
				},
			],
			[
				{
					text: "💬 Задать вопрос администратору",
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
 * Памятка экстренных действий: чего категорически нельзя делать.
 */
export function getEmergencyMemoScreen(): TriageScreenResult {
	const text = [
		"🛑 <b>ПАМЯТКА: ЧТО КАТЕГОРИЧЕСКИ НЕЛЬЗЯ ДЕЛАТЬ ПОСЛЕ ОПЕРАЦИИ</b>",
		"",
		"1. 🚫 <b>НЕ ГРЕТЬ!</b> Никаких шарфов, грелок, горячих ванн и бань. Тепло провоцирует расширение сосудов, возобновление кровотечения и бурное нагноение тканей.",
		"2. 🚫 <b>НЕ ПОЛОСКАТЬ АКТИВНО РТ!</b> Булькающие полоскания вымывают защитный кровяной сгусток из лунки (риск альвеолита «сухой лунки»). Разрешены только пассивные ротовые ванночки.",
		"3. 🚫 <b>НЕ КОВЫРЯТЬ ЛУНКУ!</b> Не трогать языком, зубочистками или пальцами белесоватый налёт на швах — это фибрин (молодая заживающая ткань), а не гной.",
		"4. 🚫 <b>НЕ СПЛЕВЫВАТЬ ЧАСТО!</b> Сплевывание создает отрицательное давление в полости рта и срывает тромб.",
		"5. 🚫 <b>НЕ ПРИНИМАТЬ АСПИРИН</b> для снятия боли — ацетилсалициловая кислота разжижает кровь и усиливает кровотечение.",
		"",
		"При любых сомнениях нажмите кнопку связи с дежурным врачом:",
	].join("\n");

	const replyMarkup: TelegramInlineKeyboard = {
		inline_keyboard: [
			[
				{ text: "📞 Позвонить дежурному врачу", callback_data: "triage:human_request" },
			],
			[
				{ text: "« Назад к контролю состояния", callback_data: "postop:day1:screen" },
				{ text: "🏠 Главное меню", callback_data: "dente:start" },
			],
		],
	};

	return { text, replyMarkup };
}

/**
 * Экран: Опрос самочувствия через 24 часа после терапевтического приёма.
 */
export function getTherapeuticCheckupScreen(): TriageScreenResult {
	const text = [
		"☀️ <b>Как ваше самочувствие после визита в клинику DENTE?</b>",
		"",
		"Прошли сутки после лечения. Нам важно убедиться, что восстановление проходит комфортно:",
		"• Беспокоит ли чувствительность зуба или реакция на температурные раздражители?",
		"• Удобно ли смыкаются зубы (не мешает ли пломба по прикусу)?",
		"• Отошла ли анестезия без неприятных ощущений?",
		"",
		"Пожалуйста, выберите ваше состояние:",
	].join("\n");

	const replyMarkup: TelegramInlineKeyboard = {
		inline_keyboard: [
			[
				{
					text: "⭐️ Всё отлично, ничего не беспокоит",
					callback_data: "postop:therapy:ok",
				},
			],
			[
				{
					text: "⚠️ Пломба слегка мешает при накусывании",
					callback_data: "postop:therapy:high_bite",
				},
			],
			[
				{
					text: "💊 Беспокоит ноющая боль / чувствительность",
					callback_data: "postop:therapy:pain",
				},
			],
			[
				{
					text: "📞 Связаться с клиникой",
					callback_data: "triage:human_request",
				},
			],
		],
	};

	return { text, replyMarkup };
}

/**
 * Ответный экран: терапевтический опрос - всё отлично.
 */
export function getTherapyOkScreen(): TriageScreenResult {
	return {
		text: [
			"⭐️ <b>Отлично! Рады, что всё прошло комфортно.</b>",
			"",
			"Спасибо за обратную связь. Если у вас будет минутка — оцените, пожалуйста, приём:",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[
					{ text: "⭐️ 5/5 Отлично", callback_data: "nps:score:5:visit" },
					{ text: "4/5 Хорошо", callback_data: "nps:score:4:visit" },
				],
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: терапевтический опрос - завышение пломбы по прикусу.
 */
export function getTherapyHighBiteScreen(): TriageScreenResult {
	return {
		text: [
			"⚠️ <b>Коррекция пломбы по прикусу</b>",
			"",
			"Небольшое завышение пломбы легко и безболезненно устраняется бережной пришлифовкой за 3 минуты.",
			"Не терпите дискомфорт — администратор свяжется с вами для подбора удобного времени визита.",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "📞 Позвонить в клинику", callback_data: "triage:human_request" }],
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: терапевтический опрос - боль/чувствительность.
 */
export function getTherapyPainScreen(): TriageScreenResult {
	return {
		text: [
			"💊 <b>Рекомендации при чувствительности после лечения</b>",
			"",
			"При лечении глубокого кариеса умеренная чувствительность зуба на холодное/горячее может сохраняться до 2-3 дней.",
			"Примите назначенное нестероидное противовоспалительное средство (НПВС).",
			"Если боль острая, самопроизвольная или пульсирует ночью — врач клиники на связи:",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "📞 Связаться с дежурным врачом", callback_data: "triage:human_request" }],
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: 3 часа - всё спокойно.
 */
export function get3HoursOkScreen(): TriageScreenResult {
	return {
		text: [
			"✅ <b>Отлично! Восстановление идёт строго по плану.</b>",
			"",
			"Продолжайте соблюдать покой: не употребляйте горячую, острую и твёрдую пищу сегодня, жуйте на противоположной стороне.",
			"Завтра утром бот пришлет короткий чекап для контроля самочувствия.",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: 3 часа - умеренная боль/обезболивающее.
 */
export function get3HoursPainMildScreen(): TriageScreenResult {
	return {
		text: [
			"💊 <b>Приём обезболивающего зафиксирован</b>",
			"",
			"Препарат начнет действовать в течение 20-30 минут.",
			"Приложите сухой холод через полотенце снаружи к щеке на 15 минут — это снизит чувствительность нервных окончаний.",
			"Если через час боль не утихнет — нажмите кнопку связи с дежурным врачом.",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "📞 Позвонить врачу", callback_data: "triage:human_request" }],
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: День 1 - оценка боли 1-3 (норма).
 */
export function getDay1NormalScoreScreen(score: number): TriageScreenResult {
	return {
		text: [
			`✅ <b>Оценка боли (${score}/5) сохранена. Восстановление в пределах нормы!</b>`,
			"",
			"В первые 24 часа тянущие ощущения нормальны. Продолжайте прикладывать холод по 15 минут.",
			"Напоминаем: пища должна быть мягкой и комнатной температуры.",
			"",
			"Следующий чекап будет на 3-й день — в момент пика естественного отёка.",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: День 3 - отёк мягкий, температура в норме.
 */
export function getDay3OkScreen(): TriageScreenResult {
	return {
		text: [
			"✅ <b>Отлично! Отёк достиг максимума и с завтрашнего дня пойдёт на спад.</b>",
			"",
			"Вы успешно преодолеваете самый сложный период после операции.",
			"Продолжайте бережный уход. На 7-й день мы напомним о контрольном осмотре для снятия швов.",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: День 3 - нарастающая боль.
 */
export function getDay3PainScreen(): TriageScreenResult {
	return {
		text: [
			"⚠️ <b>Боль на 3-й день после операции</b>",
			"",
			"В норме острая боль к 3-му дню должна постепенно стихать.",
			"Если боль имеет пульсирующий или дергающий характер — это повод для осмотра хирургом.",
			"Примите обезболивающее. Мы передали сигнал врачу клиники.",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "📞 Связаться с дежурным врачом", callback_data: "triage:human_request" }],
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}

/**
 * Ответный экран: День 7 - завершение периода.
 */
export function getDay7OkScreen(): TriageScreenResult {
	return {
		text: [
			"🎉 <b>Поздравляем с успешным завершением послеоперационного периода!</b>",
			"",
			"Ткани восстановились. Продолжайте бережную гигиену.",
			"Клиника DENTE всегда на связи для плановых чекапов и профилактики.",
		].join("\n"),
		replyMarkup: {
			inline_keyboard: [
				[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
			],
		},
	};
}
