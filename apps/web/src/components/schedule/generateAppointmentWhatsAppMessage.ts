/**
 * Генератор напоминаний и шаблонов сообщений для отправки пациентам в WhatsApp / SMS.
 * 
 * Включает:
 * - Имя пациента
 * - Название и адрес клиники
 * - Дату, время и имя лечащего врача
 * - Адаптивные клинические инструкции по подготовке к визиту на основе повода обращения
 *   (хирургия/удаление -> запрет аспирина/кроворазжижающих, гигиена -> запрет красящих напитков,
 *    терапия/лечение -> перекус до анестезии, ортодонтия -> кейсы/каппы).
 */

export interface AppointmentWhatsAppMessageParams {
	patientName: string;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	appointmentStartsAt: string;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	treatmentReason?: string | null | undefined;
}

/**
 * Определяет клиническую рекомендацию по подготовке на основе повода приёма / диагноза.
 */
export function getPreparationInstructionForReason(
	reason?: string | null | undefined,
): string | null {
	if (!reason) return null;
	const lower = reason.toLowerCase();

	// 1. Детский прием (приоритет над общей терапией)
	if (
		lower.includes("детск") ||
		lower.includes("ребен") ||
		lower.includes("малыш") ||
		lower.includes("детя") ||
		lower.includes("педиатри")
	) {
		return "Пожалуйста, убедитесь, что ребенок отдохнул и поел за 1 час до приема. Можно взять с собой любимую игрушку.";
	}

	// 2. Первичная консультация, осмотр, диагностика, КТ, ОПТГ, рентген (приоритет над специализацией)
	if (
		lower.includes("консульт") ||
		lower.includes("осмотр") ||
		lower.includes("диагност") ||
		lower.includes("первичн") ||
		lower.includes("снимок") ||
		/(?:^|[^\p{L}\p{N}])(?:кт|оптг|клдкт)(?:[^\p{L}\p{N}]|$)/iu.test(lower) ||
		lower.includes("рентген") ||
		lower.includes("томограф")
	) {
		return "Если у вас есть результаты предыдущих исследований или рентгеновские снимки (КТ / ОПТГ), пожалуйста, возьмите их с собой.";
	}

	// 3. Хирургия, удаления, имплантация, синус-лифтинг, резекция, пластика, швы
	if (
		lower.includes("удал") ||
		lower.includes("имплант") ||
		lower.includes("хирург") ||
		lower.includes("синус") ||
		lower.includes("резекц") ||
		lower.includes("пластик") ||
		lower.includes("швы") ||
		lower.includes("костн")
	) {
		return "Пожалуйста, плотно перекусите перед приемом и воздержитесь от приема аспирина и кроворазжижающих препаратов за 24 часа до операции.";
	}

	// 4. Профессиональная гигиена, чистка, отбеливание, Air Flow
	if (
		lower.includes("гигиен") ||
		lower.includes("чистк") ||
		lower.includes("отбеливан") ||
		lower.includes("air flow") ||
		lower.includes("airflow") ||
		lower.includes("ультразвук") ||
		lower.includes("налет") ||
		lower.includes("камн")
	) {
		return "Пожалуйста, воздержитесь от курения и употребления красящих продуктов и напитков (кофе, чай, ягоды) за 2 часа до и после процедуры.";
	}

	// 5. Терапия, пломбирование, лечение каналов (эндодонтия), кариес, пульпит
	if (
		lower.includes("лечен") ||
		lower.includes("пломб") ||
		lower.includes("кариес") ||
		lower.includes("пульпит") ||
		lower.includes("периодонтит") ||
		lower.includes("канал") ||
		lower.includes("реставрац") ||
		lower.includes("эндодонт")
	) {
		return "Рекомендуем перекусить за 1–1.5 часа до визита, так как после местной анестезии прием пищи будет ограничен на 2 часа.";
	}

	// 6. Пародонтология, десны, вектор-терапия, кюретаж
	if (
		lower.includes("десн") ||
		lower.includes("пародонт") ||
		lower.includes("вектор") ||
		lower.includes("кюретаж") ||
		lower.includes("гингивит")
	) {
		return "Рекомендуем провести мягкую гигиену полости рта и легко перекусить за 1 час до визита.";
	}

	// 7. Ортодонтия, брекеты, элайнеры, каппы, активация
	if (
		lower.includes("брекет") ||
		lower.includes("элайнер") ||
		(lower.includes("ортодонт") && !lower.includes("пародонт")) ||
		lower.includes("активац") ||
		lower.includes("капп") ||
		lower.includes("ретейнер")
	) {
		return "Пожалуйста, тщательно почистите зубы перед визитом и обязательно возьмите с собой текущие каппы/элайнеры и защитный кейс.";
	}

	// 8. Ортопедия, протезирование, коронки, виниры, мосты, слепки, сканирование
	if (
		lower.includes("коронк") ||
		lower.includes("протез") ||
		lower.includes("винир") ||
		lower.includes("ортопед") ||
		lower.includes("мост") ||
		lower.includes("слепок") ||
		lower.includes("слепк") ||
		lower.includes("сканирован")
	) {
		return "Пожалуйста, плотно перекусите перед визитом. Если вы пользуетесь съемными конструкциями или протезами, обязательно возьмите их с собой.";
	}

	return null;
}

export type AppointmentMessageType =
	| "reminder_24h"
	| "confirmation"
	| "time_shift"
	| "sms_concise";

export interface AppointmentWhatsAppMessageParams {
	patientName: string;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	appointmentStartsAt: string;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	treatmentReason?: string | null | undefined;
	cabinetName?: string | null | undefined;
	messageType?: AppointmentMessageType | undefined;
	customTemplate?: string | undefined;
	shiftedMinutes?: number | undefined;
	newStartsAt?: string | undefined;
}

export interface AppointmentMessageTokens {
	clinicName: string;
	patientName: string;
	dateTime: string;
	date: string;
	time: string;
	doctorName: string;
	doctorTitle: string;
	doctorSpecialty: string;
	address: string;
	addressTitle: string;
	cabinetName: string;
	cabinetTitle: string;
	clinicPhone: string;
	phoneTitle: string;
	prepInstruction: string;
	newTime: string;
	shiftedMinutes: string;
	shiftedMinutesLabel: string;
}

export const DEFAULT_APPOINTMENT_TEMPLATES: Record<AppointmentMessageType, string> = {
	reminder_24h:
		"Здравствуйте, {patientName}! Напоминаем о вашей записи в {clinicName}{addressTitle}: {dateTime}{doctorTitle}{cabinetTitle}.{prepInstruction}\n\nПожалуйста, подтвердите визит ответным сообщением ДА{phoneTitle}. До встречи!",
	confirmation:
		"Здравствуйте, {patientName}! Ваша запись в {clinicName} успешно подтверждена: {dateTime}{doctorTitle}{cabinetTitle}. Ждем вас по адресу: {address}{phoneTitle}. До встречи!",
	time_shift:
		"Здравствуйте, {patientName}! Сообщаем, что время вашего приема в {clinicName} скорректировано на {newTime}{doctorTitle}. Приносим извинения за возможное ожидание. Ждем вас!",
	sms_concise:
		"{patientName}, запись в {clinicName}: {date} в {time}. {doctorTitle}{cabinetTitle}. Ждем вас! {clinicPhone}",
};

/**
 * Подставляет динамические токены в шаблон сообщения.
 */
export function renderAppointmentMessageTemplate(
	template: string,
	tokens: Partial<AppointmentMessageTokens>,
): string {
	return template.replace(/\{(\w+)\}/g, (_match, tokenKey: string) => {
		const val = tokens[tokenKey as keyof AppointmentMessageTokens];
		return val !== undefined && val !== null ? val : "";
	});
}

/**
 * Формирует словарь динамических токенов для записи.
 */
export function getAppointmentMessageTokens(
	params: AppointmentWhatsAppMessageParams,
): AppointmentMessageTokens {
	const {
		patientName,
		doctorName,
		doctorSpecialty,
		appointmentStartsAt,
		clinicName,
		clinicAddress,
		clinicPhone,
		treatmentReason,
		cabinetName,
		shiftedMinutes,
		newStartsAt,
	} = params;

	const dateObj = new Date(appointmentStartsAt);
	const formattedDate = Number.isNaN(dateObj.getTime())
		? appointmentStartsAt
		: dateObj.toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "long",
				weekday: "short",
			});
	const formattedTime = Number.isNaN(dateObj.getTime())
		? ""
		: dateObj.toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});

	let newTimeFormatted = "";
	if (newStartsAt) {
		const newDateObj = new Date(newStartsAt);
		newTimeFormatted = Number.isNaN(newDateObj.getTime())
			? newStartsAt
			: newDateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
	} else if (shiftedMinutes && !Number.isNaN(dateObj.getTime())) {
		const shiftedMs = dateObj.getTime() + shiftedMinutes * 60000;
		const shiftedDateObj = new Date(shiftedMs);
		newTimeFormatted = shiftedDateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
	}

	const clinic = clinicName?.trim() || "стоматологическую клинику DENTE";
	const rawAddress = clinicAddress?.trim() || "";
	const addressPart = rawAddress ? ` по адресу: ${rawAddress}` : "";

	let doctorPart = "";
	if (doctorName?.trim()) {
		doctorPart = doctorSpecialty?.trim()
			? ` к врачу (${doctorSpecialty.trim()}) ${doctorName.trim()}`
			: ` к доктору ${doctorName.trim()}`;
	}

	const rawCabinet = cabinetName?.trim() || "";
	const cabinetPart = rawCabinet ? ` (${rawCabinet})` : "";
	const prepInstruction = getPreparationInstructionForReason(treatmentReason);
	const prepPart = prepInstruction ? `\n\n📌 Памятка к приему: ${prepInstruction}` : "";
	const rawPhone = clinicPhone?.trim() || "";
	const phonePart = rawPhone ? ` или по телефону ${rawPhone}` : "";

	return {
		clinicName: clinic,
		patientName: patientName?.trim() || "Пациент",
		dateTime: `${formattedDate} в ${formattedTime}`,
		date: formattedDate,
		time: formattedTime,
		doctorName: doctorName?.trim() || "",
		doctorTitle: doctorPart,
		doctorSpecialty: doctorSpecialty?.trim() || "",
		address: rawAddress,
		addressTitle: addressPart,
		cabinetName: rawCabinet,
		cabinetTitle: cabinetPart,
		clinicPhone: rawPhone,
		phoneTitle: phonePart,
		prepInstruction: prepPart,
		newTime: newTimeFormatted,
		shiftedMinutes: shiftedMinutes !== undefined && shiftedMinutes !== null ? String(shiftedMinutes) : "",
		shiftedMinutesLabel: shiftedMinutes !== undefined && shiftedMinutes !== null ? `(+${shiftedMinutes} мин)` : "",
	};
}

/**
 * Генерирует русскоязычный текст сообщения для WhatsApp.
 */
export function generateAppointmentWhatsAppMessage(
	params: AppointmentWhatsAppMessageParams,
): string {
	const { messageType = "reminder_24h", customTemplate } = params;
	const tokens = getAppointmentMessageTokens(params);

	if (customTemplate && customTemplate.trim().length > 0) {
		return renderAppointmentMessageTemplate(customTemplate, tokens);
	}

	const template = DEFAULT_APPOINTMENT_TEMPLATES[messageType] || DEFAULT_APPOINTMENT_TEMPLATES.reminder_24h;
	return renderAppointmentMessageTemplate(template, tokens);
}

/**
 * Генерирует лаконичный текст SMS-напоминания (для SMS-шлюзов).
 */
export function generateAppointmentSmsMessage(
	params: AppointmentWhatsAppMessageParams,
): string {
	const {
		patientName,
		doctorName,
		appointmentStartsAt,
		clinicName,
		clinicPhone,
		cabinetName,
	} = params;

	const dateObj = new Date(appointmentStartsAt);
	const formattedDate = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "numeric",
	});
	const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});

	const clinic = clinicName?.trim() || "DENTE";
	const docPart = doctorName?.trim() ? ` Врач: ${doctorName.trim()}.` : "";
	const cabPart = cabinetName?.trim() ? ` ${cabinetName.trim()}.` : "";
	const phonePart = clinicPhone?.trim() ? ` Тел: ${clinicPhone.trim()}` : "";

	return `${patientName}, запись в ${clinic}: ${formattedDate} в ${formattedTime}.${docPart}${cabPart} Ждем вас!${phonePart}`;
}

/**
 * Формирует прямую web/app ссылку для открытия чата WhatsApp с предзаполненным текстом.
 */
export function buildWhatsAppUrl(phone: string, text: string): string {
	const clean = phone.replace(/\D/g, "");
	let e164 = clean;
	if (clean.startsWith("8") && clean.length === 11) {
		e164 = `7${clean.slice(1)}`;
	} else if (clean.length === 10) {
		e164 = `7${clean}`;
	}
	return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

/**
 * Формирует SMS URI схему для отправки сообщения через мобильный клиент или SMS-приложение.
 */
export function buildSmsUrl(phone: string, text: string): string {
	const clean = phone.replace(/[^\d+]/g, "");
	return `sms:${clean}?body=${encodeURIComponent(text)}`;
}

/**
 * Формирует ссылку для построения маршрута до клиники на Яндекс Картах.
 */
export function buildYandexMapsUrl(address: string): string {
	return `https://yandex.ru/maps/?text=${encodeURIComponent(address.trim())}`;
}

/**
 * Формирует ссылку для поиска и навигации до клиники в 2ГИС.
 */
export function build2GisUrl(address: string): string {
	return `https://2gis.ru/search/${encodeURIComponent(address.trim())}`;
}
