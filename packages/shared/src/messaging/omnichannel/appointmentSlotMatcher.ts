/**
 * appointmentSlotMatcher.ts — Layer 1: Slot Matcher & Appointment Reminder Dispatch Builders.
 *
 * Implements:
 * 1. Pure helper utilities: extractFirstNameRu, buildClinicMapLinks, formatAppointmentDateTimeRu.
 * 2. Transactional appointment triggers:
 *    - T-24h Reminder ($T-24$) with interactive confirmation / reschedule buttons.
 *    - T-2h Reminder ($T-2$) with clinic geolocation, Yandex/2GIS map links, parking directions.
 *    - Birthday greetings and 6-Month hygiene recall dispatch builders.
 * 3. Doctor available slot filtering and button generator for interactive bot booking.
 */

import {
	omnichannelAppointmentContextSchema,
	type BirthdayGreetingOptions,
	type BotKeyboardButton,
	type ClinicCoordinates,
	type DoctorAvailableSlot,
	type HygieneRecall6mOptions,
	type OmnichannelAppointmentContext,
	type OmnichannelChannel,
	type OmnichannelDispatchPackage,
	type OmnichannelProvider,
	type SlotMatchCriteria,
	type SlotMatchResult,
	type SmsDispatchPayload,
	type TelegramSendMessagePayload,
	type WhatsappWabaButtonPayload,
} from "./types.js";

// ─── Pure Helper Functions ───

/**
 * Extracts patient's first name from full Russian name or returns fallback.
 */
export function extractFirstNameRu(fullName: string): string {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length >= 2) {
		// e.g. "Смирнова Елена Александровна" -> parts[1] = "Елена"
		return parts[1] ?? fullName;
	}
	return parts[0] || fullName;
}

/**
 * Builds standard maps URL links for clinic coordinates if not explicitly provided.
 */
export function buildClinicMapLinks(coordinates?: ClinicCoordinates): {
	yandexMapsUrl: string;
	twoGisUrl: string;
} {
	if (!coordinates) {
		return {
			yandexMapsUrl: "https://yandex.ru/maps",
			twoGisUrl: "https://2gis.ru",
		};
	}
	const { latitude, longitude } = coordinates;
	return {
		yandexMapsUrl: `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=17&l=map`,
		twoGisUrl: `https://2gis.ru/geo/${longitude},${latitude}`,
	};
}

/**
 * Formats a Date into Russian date string (e.g. "29 августа 2026 г.") and time ("14:30").
 */
export function formatAppointmentDateTimeRu(dateInput: Date | string): {
	dateFormatted: string;
	timeFormatted: string;
} {
	const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
	if (Number.isNaN(date.getTime())) {
		return { dateFormatted: "указанную дату", timeFormatted: "указанное время" };
	}

	const months = [
		"января",
		"февраля",
		"марта",
		"апреля",
		"мая",
		"июня",
		"июля",
		"августа",
		"сентября",
		"октября",
		"ноября",
		"декабря",
	];

	const day = date.getDate();
	const month = months[date.getMonth()];
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");

	return {
		dateFormatted: `${day} ${month} ${year} г.`,
		timeFormatted: `${hours}:${minutes}`,
	};
}

// ─── T-24 Reminder Engine ───

/**
 * Builds T-24h Reminder Dispatch Package for WhatsApp, Telegram, or SMS.
 */
export function buildAppointmentReminder24h(
	contextInput: OmnichannelAppointmentContext,
	channel: OmnichannelChannel = "whatsapp",
): OmnichannelDispatchPackage {
	const context = omnichannelAppointmentContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || extractFirstNameRu(context.patientFullName);
	const { dateFormatted, timeFormatted } =
		context.appointmentDateFormatted && context.appointmentTimeFormatted
			? { dateFormatted: context.appointmentDateFormatted, timeFormatted: context.appointmentTimeFormatted }
			: formatAppointmentDateTimeRu(context.appointmentDateTime);

	const bodyText =
		`Здравствуйте, ${firstName}!\n` +
		`Напоминаем о вашей записи в клинику ${context.clinicName} на завтра, ${dateFormatted} в ${timeFormatted} ` +
		`к доктору ${context.doctorFullName} (${context.doctorSpecialty}).\n\n` +
		`Пожалуйста, подтвердите визит или выберите удобное действие:`;

	const appointmentId = context.appointmentId;

	// WhatsApp WABA / 360dialog interactive payload (Buttons)
	const whatsappPayload: WhatsappWabaButtonPayload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: context.patientPhone,
		type: "interactive",
		interactive: {
			type: "button",
			header: {
				type: "text",
				text: `Стоматология ${context.clinicName}`,
			},
			body: {
				text: bodyText,
			},
			footer: {
				text: "Нажмите кнопку для ответа",
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: {
							id: `btn_confirm_${appointmentId}`,
							title: "Подтверждаю визит",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_reschedule_${appointmentId}`,
							title: "Перенести прием",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_cancel_${appointmentId}`,
							title: "Отменить запись",
						},
					},
				],
			},
		},
	};

	// Telegram Bot API Inline Keyboard Payload
	const telegramPayload: TelegramSendMessagePayload = {
		chat_id: context.telegramChatId || context.patientPhone,
		text:
			`🦷 <b>Напоминание о визите к стоматологу</b>\n\n` +
			`Здравствуйте, <b>${firstName}</b>!\n` +
			`Ждем вас завтра, <b>${dateFormatted} в ${timeFormatted}</b>\n` +
			`👨‍⚕️ <b>Врач:</b> ${context.doctorFullName} (${context.doctorSpecialty})\n` +
			`🏥 <b>Клиника:</b> ${context.clinicName}\n` +
			`📍 <b>Адрес:</b> ${context.clinicAddress}\n\n` +
			`Пожалуйста, подтвердите ваш визит:`,
		parse_mode: "HTML",
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "✅ Подтверждаю визит",
						callback_data: `appt:confirm:${appointmentId}`,
					},
					{
						text: "🔄 Перенести прием",
						callback_data: `appt:reschedule:${appointmentId}`,
					},
				],
				[
					{
						text: "❌ Отменить запись",
						callback_data: `appt:cancel:${appointmentId}`,
					},
				],
			],
		},
	};

	// SMS Fallback
	const smsText = `${context.clinicName}: Напоминаем о визите завтра в ${timeFormatted} к врачу ${context.doctorFullName}. Подтвердить: ответ 1, Перенести: ответ 2, Тел: ${context.clinicPhone}`;
	const smsPayload: SmsDispatchPayload = {
		to: context.patientPhone,
		text: smsText,
	};

	const provider: OmnichannelProvider =
		channel === "telegram"
			? "telegram_bot"
			: channel === "sms"
			? "sms_gateway"
			: "waba_360dialog";

	return {
		triggerType: "reminder_24h",
		channel,
		provider,
		recipientId:
			channel === "telegram" && context.telegramChatId
				? String(context.telegramChatId)
				: context.patientPhone,
		appointmentId,
		plainText: bodyText,
		whatsappPayload: channel === "whatsapp" ? whatsappPayload : undefined,
		telegramPayload: channel === "telegram" ? telegramPayload : undefined,
		smsPayload: channel === "sms" ? smsPayload : undefined,
	};
}

// ─── T-2h Reminder Engine ───

/**
 * Builds T-2h Reminder Dispatch Package with clinic location, maps, and parking notes.
 */
export function buildAppointmentReminder2h(
	contextInput: OmnichannelAppointmentContext,
	channel: OmnichannelChannel = "whatsapp",
): OmnichannelDispatchPackage {
	const context = omnichannelAppointmentContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || extractFirstNameRu(context.patientFullName);
	const { timeFormatted } = context.appointmentTimeFormatted
		? { timeFormatted: context.appointmentTimeFormatted }
		: formatAppointmentDateTimeRu(context.appointmentDateTime);

	const defaultMaps = buildClinicMapLinks(context.clinicCoordinates);
	const yandexUrl = context.yandexMapsUrl || defaultMaps.yandexMapsUrl;
	const twoGisUrl = context.twoGisUrl || defaultMaps.twoGisUrl;
	const floorInfo = context.clinicFloorOffice ? `, ${context.clinicFloorOffice}` : "";
	const parkingInfo = context.parkingDirections || "У клиники доступна парковка для пациентов.";

	const bodyText =
		`Здравствуйте, ${firstName}!\n` +
		`Ждем вас сегодня в ${timeFormatted} в клинике ${context.clinicName}.\n\n` +
		`📍 Адрес: ${context.clinicAddress}${floorInfo}\n` +
		`🚗 Схема проезда и парковка: ${parkingInfo}\n` +
		`🗺️ Яндекс.Карты: ${yandexUrl}\n` +
		`🗺️ 2ГИС: ${twoGisUrl}\n` +
		`📞 Телефон для связи: ${context.clinicPhone}\n\n` +
		`Если вы опаздываете или не можете найти вход, пожалуйста, позвоните нам. До скорой встречи!`;

	const appointmentId = context.appointmentId;

	// WhatsApp Payload
	const whatsappPayload: WhatsappWabaButtonPayload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: context.patientPhone,
		type: "interactive",
		interactive: {
			type: "button",
			header: {
				type: "text",
				text: `📍 Как добраться в ${context.clinicName}`,
			},
			body: {
				text: bodyText,
			},
			footer: {
				text: "Ждем вас на приеме",
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: {
							id: `btn_navigate_${appointmentId}`,
							title: "Я уже в пути",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_late_${appointmentId}`,
							title: "Опаздываю на 10 мин",
						},
					},
				],
			},
		},
	};

	// Telegram Payload with Map Buttons
	const telegramPayload: TelegramSendMessagePayload = {
		chat_id: context.telegramChatId || context.patientPhone,
		text:
			`📍 <b>Скоро прием в клинике ${context.clinicName}</b>\n\n` +
			`Здравствуйте, <b>${firstName}</b>! Ждем вас сегодня в <b>${timeFormatted}</b>.\n\n` +
			`🏥 <b>Адрес:</b> ${context.clinicAddress}${floorInfo}\n` +
			`🚗 <b>Парковка:</b> ${parkingInfo}\n` +
			`📞 <b>Телефон клиники:</b> ${context.clinicPhone}\n\n` +
			`<i>Если вы задерживаетесь, пожалуйста, предупредите нас кнопкой ниже.</i>`,
		parse_mode: "HTML",
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "🗺️ Открыть Яндекс.Карты", url: yandexUrl },
					{ text: "🗺️ Открыть 2ГИС", url: twoGisUrl },
				],
				[
					{ text: "🚗 Я уже в пути", callback_data: `appt:on_the_way:${appointmentId}` },
					{ text: "⏳ Опаздываю на 10 минут", callback_data: `appt:late_10m:${appointmentId}` },
				],
			],
		},
	};

	const smsPayload: SmsDispatchPayload = {
		to: context.patientPhone,
		text: `${context.clinicName}: Ждем вас сегодня в ${timeFormatted}. Адрес: ${context.clinicAddress}. Карты: ${yandexUrl}. Тел: ${context.clinicPhone}`,
	};

	const provider: OmnichannelProvider =
		channel === "telegram"
			? "telegram_bot"
			: channel === "sms"
			? "sms_gateway"
			: "waba_360dialog";

	return {
		triggerType: "reminder_2h",
		channel,
		provider,
		recipientId:
			channel === "telegram" && context.telegramChatId
				? String(context.telegramChatId)
				: context.patientPhone,
		appointmentId,
		plainText: bodyText,
		whatsappPayload: channel === "whatsapp" ? whatsappPayload : undefined,
		telegramPayload: channel === "telegram" ? telegramPayload : undefined,
		smsPayload: channel === "sms" ? smsPayload : undefined,
	};
}

// ─── Birthday Greeting & Hygiene Recall Engine ───

/**
 * Builds Birthday Greeting Dispatch Package with custom bonuses or discount vouchers.
 */
export function buildBirthdayGreeting(
	contextInput: OmnichannelAppointmentContext,
	options: BirthdayGreetingOptions = {},
	channel: OmnichannelChannel = "whatsapp",
): OmnichannelDispatchPackage {
	const context = omnichannelAppointmentContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || extractFirstNameRu(context.patientFullName);
	const bonus = options.bonusAmountRubles ?? 1000;
	const promoCode = options.promoCode || "BIRTHDAY";
	const validDays = options.validDays ?? 30;

	const bodyText =
		`Здравствуйте, ${firstName}!\n` +
		`Команда клиники ${context.clinicName} от всей души поздравляет вас с днем рождения! 🎂🎉\n\n` +
		`Желаем вам крепкого здоровья, сияющей улыбки и отличного настроения! ` +
		`В честь праздника дарим вам бонус ${bonus} ₽ (промокод: ${promoCode}) на любые стоматологические процедуры или комплексную профгигиену.\n\n` +
		`Подарок действует в течение ${validDays} дней. Будем рады видеть вас на приеме!`;

	const appointmentId = context.appointmentId;

	const whatsappPayload: WhatsappWabaButtonPayload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: context.patientPhone,
		type: "interactive",
		interactive: {
			type: "button",
			header: {
				type: "text",
				text: `С днем рождения от ${context.clinicName}! 🎉`,
			},
			body: {
				text: bodyText,
			},
			footer: {
				text: `Промокод: ${promoCode} (активен ${validDays} дн.)`,
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: {
							id: `btn_bday_book_${appointmentId}`,
							title: "Записаться на прием",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_bday_bonus_${appointmentId}`,
							title: "Узнать баланс бонусов",
						},
					},
				],
			},
		},
	};

	const telegramPayload: TelegramSendMessagePayload = {
		chat_id: context.telegramChatId || context.patientPhone,
		text:
			`🎂 <b>Поздравляем с днем рождения!</b>\n\n` +
			`Здравствуйте, <b>${firstName}</b>!\n` +
			`Команда стоматологической клиники <b>${context.clinicName}</b> желает вам крепкого здоровья, радости и прекрасной улыбки!\n\n` +
			`🎁 <b>Ваш праздничный подарок:</b> сертификат на <b>${bonus} ₽</b> (промокод: <code>${promoCode}</code>).\n` +
			`⏳ Сертификат действителен ${validDays} дней.\n\n` +
			`Ждем вас в гости!`,
		parse_mode: "HTML",
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "🎁 Записаться на прием",
						callback_data: `appt:bday_book:${appointmentId}`,
					},
					{
						text: "📞 Связаться с клиникой",
						callback_data: `appt:bday_call:${appointmentId}`,
					},
				],
			],
		},
	};

	const smsPayload: SmsDispatchPayload = {
		to: context.patientPhone,
		text: `${context.clinicName}: Поздравляем с днем рождения! Ваш подарок: ${bonus} руб. Промокод ${promoCode}. Действует ${validDays} дн. Тел: ${context.clinicPhone}`,
	};

	const provider: OmnichannelProvider =
		channel === "telegram"
			? "telegram_bot"
			: channel === "sms"
			? "sms_gateway"
			: "waba_360dialog";

	return {
		triggerType: "birthday_greeting",
		channel,
		provider,
		recipientId:
			channel === "telegram" && context.telegramChatId
				? String(context.telegramChatId)
				: context.patientPhone,
		appointmentId,
		plainText: bodyText,
		whatsappPayload: channel === "whatsapp" ? whatsappPayload : undefined,
		telegramPayload: channel === "telegram" ? telegramPayload : undefined,
		smsPayload: channel === "sms" ? smsPayload : undefined,
	};
}

/**
 * Builds 6-Month Routine Hygiene Recall Dispatch Package (Strict Mandate 8z - Zero Soviet bureaucratic slang).
 */
export function buildHygieneRecall6m(
	contextInput: OmnichannelAppointmentContext,
	options: HygieneRecall6mOptions = {},
	channel: OmnichannelChannel = "whatsapp",
): OmnichannelDispatchPackage {
	const context = omnichannelAppointmentContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || extractFirstNameRu(context.patientFullName);
	const months = options.lastVisitMonthsAgo ?? 6;
	const doctor = options.recommendedDoctorFullName || context.doctorFullName;

	const bodyText =
		`Здравствуйте, ${firstName}!\n` +
		`Прошло уже ${months} месяцев с вашего последнего визита к доктору ${doctor}.\n\n` +
		`Стоматологи рекомендуют проходить плановый профилактический осмотр и профессиональную гигиену полости рта каждые полгода. ` +
		`Это позволяет сохранить здоровье зубов, предотвратить образование налета и камня, а также выявить любые скрытые процессы на начальном этапе.\n\n` +
		`Будем рады подобрать для вас удобное время в клинике ${context.clinicName}!`;

	const appointmentId = context.appointmentId;

	const whatsappPayload: WhatsappWabaButtonPayload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: context.patientPhone,
		type: "interactive",
		interactive: {
			type: "button",
			header: {
				type: "text",
				text: `Плановая профгигиена в ${context.clinicName}`,
			},
			body: {
				text: bodyText,
			},
			footer: {
				text: "Забота о здоровье вашей улыбки",
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: {
							id: `btn_hygiene_book_${appointmentId}`,
							title: "Записаться на гигиену",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_hygiene_snooze_${appointmentId}`,
							title: "Напомнить через 2 нед.",
						},
					},
				],
			},
		},
	};

	const telegramPayload: TelegramSendMessagePayload = {
		chat_id: context.telegramChatId || context.patientPhone,
		text:
			`🦷 <b>Плановый профилактический осмотр и профгигиена</b>\n\n` +
			`Здравствуйте, <b>${firstName}</b>!\n` +
			`Прошло ${months} месяцев с вашего предыдущего приема у доктора ${doctor}.\n\n` +
			`✨ <i>Регулярная гигиена раз в полгода — лучший способ сохранить улыбку здоровой и избежать сложного лечения.</i>\n\n` +
			`Подберем удобное время?`,
		parse_mode: "HTML",
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "✨ Записаться на гигиену",
						callback_data: `appt:hygiene_book:${appointmentId}`,
					},
					{
						text: "⏳ Напомнить через 2 недели",
						callback_data: `appt:hygiene_snooze:${appointmentId}`,
					},
				],
			],
		},
	};

	const smsPayload: SmsDispatchPayload = {
		to: context.patientPhone,
		text: `${context.clinicName}: Здравствуйте, ${firstName}! Подошел срок плановой профгигиены (прошло ${months} мес.). Записаться: ответ 1 или тел: ${context.clinicPhone}`,
	};

	const provider: OmnichannelProvider =
		channel === "telegram"
			? "telegram_bot"
			: channel === "sms"
			? "sms_gateway"
			: "waba_360dialog";

	return {
		triggerType: "hygiene_recall_6m",
		channel,
		provider,
		recipientId:
			channel === "telegram" && context.telegramChatId
				? String(context.telegramChatId)
				: context.patientPhone,
		appointmentId,
		plainText: bodyText,
		whatsappPayload: channel === "whatsapp" ? whatsappPayload : undefined,
		telegramPayload: channel === "telegram" ? telegramPayload : undefined,
		smsPayload: channel === "sms" ? smsPayload : undefined,
	};
}

// ─── Slot Matcher Algorithm ───

/**
 * Filters available doctor slots by criteria (specialty, doctor, date, time of day).
 */
export function findAvailableSlots(
	slots: DoctorAvailableSlot[],
	criteria: SlotMatchCriteria = {},
): SlotMatchResult {
	const limit = criteria.limit ?? 4;
	let filtered = slots.filter((s) => s.isFree);

	if (criteria.specialty) {
		const specLower = criteria.specialty.toLowerCase();
		filtered = filtered.filter((s) => s.specialty.toLowerCase().includes(specLower));
	}

	if (criteria.doctorId) {
		filtered = filtered.filter((s) => s.doctorId === criteria.doctorId);
	}

	if (criteria.preferredDate) {
		filtered = filtered.filter((s) => s.startDateTime.startsWith(criteria.preferredDate!));
	}

	if (criteria.timeOfDay && criteria.timeOfDay !== "any") {
		filtered = filtered.filter((s) => {
			const hour = new Date(s.startDateTime).getHours();
			if (criteria.timeOfDay === "morning") return hour < 12;
			if (criteria.timeOfDay === "afternoon") return hour >= 12 && hour < 17;
			if (criteria.timeOfDay === "evening") return hour >= 17;
			return true;
		});
	}

	const matches = filtered.slice(0, limit);
	const found = matches.length > 0;

	if (!found) {
		return {
			matches: [],
			found: false,
			messageText: "К сожалению, на выбранное время нет свободных окон. Хотите посмотреть другие дни или связаться с администратором?",
			suggestedButtons: [
				[
					{ text: "📅 Ближайшие свободные окна", callbackData: "slot:nearest" },
					{ text: "📞 Позвать администратора", callbackData: "handover:request" },
				],
			],
		};
	}

	const buttonRows: BotKeyboardButton[][] = matches.map((slot) => [
		{
			text: `🕒 ${slot.dateFormatted} в ${slot.timeFormatted} (${slot.doctorName})`,
			callbackData: `book:slot:${slot.slotId}`,
		},
	]);

	buttonRows.push([
		{ text: "🔄 Другое время", callbackData: "slot:more" },
		{ text: "📞 Позвать администратора", callbackData: "handover:request" },
	]);

	const lines = [
		"Подобрали для вас свободные окна на прием:",
		...matches.map((s, idx) => `${idx + 1}. ${s.dateFormatted} в ${s.timeFormatted} — ${s.doctorName} (${s.specialty})`),
		"\nВыберите удобное время, нажав на кнопку ниже:",
	];

	return {
		matches,
		found: true,
		messageText: lines.join("\n"),
		suggestedButtons: buttonRows,
	};
}
