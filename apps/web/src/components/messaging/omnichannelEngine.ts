/**
 * omnichannelEngine.ts — Чистая бизнес-логика омниканального центра сообщений,
 * расчет метрик NPS, подстановка шаблонных токенов и эталонные клинические датасеты.
 */

import type {
	NpsCategory,
	NpsMetrics,
	NpsReview,
	NpsUrgency,
	OmnichannelMessage,
	OmnichannelTemplate,
	PatientOmnichannelContact,
} from "./omnichannelTypes.js";

/**
 * Определяет категорию NPS (Promoter 9..10, Neutral 7..8, Detractor 0..6).
 */
export function getNpsCategory(score: number): NpsCategory {
	if (score >= 9) return "promoter";
	if (score >= 7) return "neutral";
	return "detractor";
}

/**
 * Определяет уровень срочности отзыва и бейдж для регистратуры / главврача.
 */
export function getNpsUrgency(score: number): {
	urgency: NpsUrgency;
	badgeText: string;
	colorClass: string;
} {
	if (score <= 4) {
		return {
			urgency: "critical",
			badgeText: "Критический — звонок главврача",
			colorClass: "urgency-critical",
		};
	}
	if (score <= 6) {
		return {
			urgency: "high",
			badgeText: "Детрактор — требует звонка",
			colorClass: "urgency-high",
		};
	}
	if (score <= 8) {
		return {
			urgency: "medium",
			badgeText: "Нейтральный отзыв",
			colorClass: "urgency-medium",
		};
	}
	return {
		urgency: "low",
		badgeText: "Лояльный промоутер",
		colorClass: "urgency-low",
	};
}

/**
 * Вычисляет агрегированные метрики NPS (Net Promoter Score) по правилам международной методологии.
 * NPS = % Promoters (9-10) - % Detractors (0-6), диапазон от -100 до +100.
 */
export function calculateNpsMetrics(reviews: readonly NpsReview[]): NpsMetrics {
	const totalReviews = reviews.length;
	if (totalReviews === 0) {
		return {
			totalReviews: 0,
			npsScore: 0,
			promotersCount: 0,
			promotersPct: 0,
			neutralsCount: 0,
			neutralsPct: 0,
			detractorsCount: 0,
			detractorsPct: 0,
			averageScore: 0,
			criticalPendingCount: 0,
		};
	}

	let promotersCount = 0;
	let neutralsCount = 0;
	let detractorsCount = 0;
	let scoreSum = 0;
	let criticalPendingCount = 0;

	for (const rev of reviews) {
		scoreSum += rev.score;
		if (rev.score >= 9) {
			promotersCount++;
		} else if (rev.score >= 7) {
			neutralsCount++;
		} else {
			detractorsCount++;
			if (rev.score <= 4 && (rev.status === "pending" || rev.status === "in_progress")) {
				criticalPendingCount++;
			}
		}
	}

	const promotersPct = Math.round((promotersCount / totalReviews) * 100);
	const neutralsPct = Math.round((neutralsCount / totalReviews) * 100);
	const detractorsPct = Math.round((detractorsCount / totalReviews) * 100);
	const npsScore = promotersPct - detractorsPct;
	const averageScore = Number((scoreSum / totalReviews).toFixed(1));

	return {
		totalReviews,
		npsScore,
		promotersCount,
		promotersPct,
		neutralsCount,
		neutralsPct,
		detractorsCount,
		detractorsPct,
		averageScore,
		criticalPendingCount,
	};
}

/**
 * Подставляет динамические переменные в текст шаблона.
 */
export function replaceTemplateVariables(
	templateText: string,
	context: Record<string, string | number | undefined | null>,
): string {
	return templateText.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
		const val = context[key];
		if (val !== undefined && val !== null && String(val).trim().length > 0) {
			return String(val);
		}
		return match;
	});
}

/**
 * Форматирует телефон в стандарте РФ: +7 (999) 000-00-00.
 */
export function formatRussianPhone(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
	}
	if (digits.length === 10) {
		return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
	}
	return phone;
}

/**
 * Форматирует сумму в рублях с копейками.
 */
export function formatCurrencyRu(sumRub: number): string {
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(sumRub);
}

/**
 * Форматирует сумму из целочисленных копеек.
 */
export function formatKopecksRu(kopecks: number): string {
	return formatCurrencyRu(kopecks / 100);
}

/**
 * Генераторы стандартных сообщений для каналов:
 */

export function generateVisitReminderText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
	clinicAddress = "г. Москва, ул. Арбат, д. 24",
): string {
	const appt = contact.nextAppointment;
	const dateStr = appt ? `${appt.date} в ${appt.time}` : "завтра в 14:00";
	const docStr = appt?.doctorName || "Кузнецова Е.В.";
	const cabStr = appt?.cabinet ? ` (кабинет ${appt.cabinet})` : "";
	const reasonStr = appt?.reason ? `\nПовод: ${appt.reason}` : "";

	return `Здравствуйте, ${contact.fullName}!\nНапоминаем о вашем приеме в клинике ${clinicName}:\n📅 ${dateStr}${cabStr}\n👨‍⚕️ Врач: ${docStr}${reasonStr}\n📍 Адрес: ${clinicAddress}\n\nПожалуйста, подтвердите ваш визит или свяжитесь с нами, если планы изменились.`;
}

export function generateAppointmentConfirmationText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
): string {
	const appt = contact.nextAppointment;
	const dateStr = appt ? `${appt.date} в ${appt.time}` : "на запланированное время";
	const docStr = appt?.doctorName || "вашему лечащему врачу";

	return `Здравствуйте, ${contact.fullName}!\nВы успешно записаны на прием в ${clinicName}.\n🗓 Дата и время: ${dateStr}\n👨‍⚕️ Доктор: ${docStr}\n\nЖдем вас! Для отмены или переноса просто напишите ответное сообщение в этот чат.`;
}

export function generateTreatmentPlanText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
): string {
	const plan = contact.activeTreatmentPlan;
	const planTitle = plan?.title || "Комплексный план лечения";
	const teeth = plan?.teethFdi && plan.teethFdi.length > 0 ? ` (зубы ${plan.teethFdi.join(", ")})` : "";
	const sum = plan ? formatCurrencyRu(plan.totalRub) : "по смете";

	return `Здравствуйте, ${contact.fullName}!\nВаш лечащий врач подготовил электронный план лечения:\n🦷 ${planTitle}${teeth}\n💰 Итоговая сумма этапов: ${sum}\n\nС планом и этапами можно ознакомиться в приложенном файле. Если у вас возникнут вопросы, наш координатор лечения на связи!`;
}

export function generateNpsSurveyText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
): string {
	const docStr = contact.nextAppointment?.doctorName || "в нашей клинике";
	return `Здравствуйте, ${contact.fullName}!\nБлагодарим за визит в ${clinicName}.\n\nОцените, пожалуйста, качество приема у доктора (${docStr}) по шкале от 1 до 10, где 10 — «все прошло великолепно», а 1 — «крайне недоволен».\n\nПросто отправьте цифру в ответном сообщении! Ваше мнение помогает нам становиться лучше.`;
}

export function generateSbpPaymentShareText(params: {
	patientName: string;
	sumRub: number;
	orderId: string;
	nspkUrl: string;
	clinicName: string;
}): string {
	return `Здравствуйте, ${params.patientName}!\nСчет на оплату медицинских услуг в клинике ${params.clinicName}:\n📋 Заказ №${params.orderId}\n💵 Сумма к оплате: ${formatCurrencyRu(params.sumRub)}\n⚡ Оплата через СБП без комиссии по ссылке:\n${params.nspkUrl}\n\nПосле оплаты чек будет автоматически отправлен вам в этот чат.`;
}

/**
 * -------------------------------------------------------------
 * ЭТАЛОННЫЕ КЛИНИЧЕСКИЕ ДАННЫЕ (ZERO-MOCK REALISTIC SEED DATA)
 * -------------------------------------------------------------
 */

export const DEFAULT_TEMPLATES: readonly OmnichannelTemplate[] = [
	{
		id: "tpl-reminder",
		name: "Напоминание о предстоящем визите",
		category: "visit_reminder",
		channel: "all",
		title: "Напоминание о приеме (за 24ч)",
		description: "Отправка пациенту точной даты, времени, кабинета, врача и рекомендаций по подготовке",
		templateText:
			"Здравствуйте, {patientName}!\nНапоминаем о вашем визите в клинику {clinicName}:\n📅 {appointmentDate} в {appointmentTime} (кабинет {cabinet})\n👨‍⚕️ Врач: {doctorName}\n📍 Адрес: {clinicAddress}\n\nПодтвердите, пожалуйста, визит нажатием кнопки ниже.",
		interactiveButtons: [
			{ id: "btn-confirm", title: "✅ Подтверждаю", action: "confirm_visit", variant: "primary" },
			{ id: "btn-reschedule", title: "🔄 Перенести", action: "request_reschedule", variant: "secondary" },
		],
		variables: [
			"{patientName}",
			"{clinicName}",
			"{appointmentDate}",
			"{appointmentTime}",
			"{cabinet}",
			"{doctorName}",
			"{clinicAddress}",
		],
	},
	{
		id: "tpl-confirmation",
		name: "Подтверждение записи на прием",
		category: "appointment_confirmation",
		channel: "all",
		title: "Подтверждение успешной брони",
		description: "Сообщение сразу после создания визита в расписании или онлайн-записи",
		templateText:
			"Здравствуйте, {patientName}!\nВы успешно записаны на прием в {clinicName}.\n🗓 Дата и время: {appointmentDate} в {appointmentTime}\n👨‍⚕️ Доктор: {doctorName}\n📍 Адрес: {clinicAddress}\n\nЖдем вас! Для отмены или переноса просто напишите в этот чат.",
		interactiveButtons: [
			{ id: "btn-map", title: "📍 Маршрут на карте", action: "open_map", variant: "secondary" },
		],
		variables: [
			"{patientName}",
			"{clinicName}",
			"{appointmentDate}",
			"{appointmentTime}",
			"{doctorName}",
			"{clinicAddress}",
		],
	},
	{
		id: "tpl-treatment-plan",
		name: "Отправка плана лечения и сметы",
		category: "treatment_plan",
		channel: "all",
		title: "Электронный план лечения",
		description: "Отправка согласованной сметы, формулы зубов FDI и ссылки на PDF",
		templateText:
			"Здравствуйте, {patientName}!\nВаш лечащий врач подготовил электронный план лечения:\n🦷 Смета: {treatmentPlanTitle}\n💰 Сумма к оплате: {treatmentSum}\n\nОзнакомьтесь с этапами в прикрепленном документе. Координатор лечения на связи для согласования времени визитов.",
		interactiveButtons: [
			{ id: "btn-pay-deposit", title: "💳 Внести аванс СБП", action: "pay_sbp", variant: "primary" },
		],
		variables: [
			"{patientName}",
			"{treatmentPlanTitle}",
			"{treatmentSum}",
		],
	},
	{
		id: "tpl-nps",
		name: "Опрос качества и NPS (после приема)",
		category: "nps_survey",
		channel: "all",
		title: "Оценка качества обслуживания",
		description: "Автоматический запрос отзыва через 2 часа после закрытия дневника приема",
		templateText:
			"Здравствуйте, {patientName}!\nБлагодарим за визит в {clinicName}.\n\nОцените, пожалуйста, качество приема у доктора ({doctorName}) по шкале от 1 до 10, где 10 — отлично, а 1 — крайне плохо.\n\nПросто отправьте цифру в ответном сообщении!",
		interactiveButtons: [
			{ id: "btn-nps-10", title: "⭐⭐⭐⭐⭐ 10/10", action: "score_10", variant: "primary" },
			{ id: "btn-nps-8", title: "⭐⭐⭐⭐ 8/10", action: "score_8", variant: "secondary" },
		],
		variables: [
			"{patientName}",
			"{clinicName}",
			"{doctorName}",
		],
	},
	{
		id: "tpl-sbp",
		name: "Счет на оплату через СБП",
		category: "sbp_payment",
		channel: "all",
		title: "QR-код и ссылка СБП",
		description: "Быстрая оплата услуг без комиссии через Систему Быстрых Платежей НСПК",
		templateText:
			"Здравствуйте, {patientName}!\nСчет на оплату медицинских услуг в {clinicName}:\n📋 Заказ №{orderId}\n💵 Сумма: {treatmentSum}\n⚡ Ссылка для оплаты через СБП:\n{paymentLink}\n\nЭлектронный кассовый чек 54-ФЗ поступит сразу после оплаты.",
		interactiveButtons: [
			{ id: "btn-open-sbp", title: "⚡ Оплатить в приложении банка", action: "open_bank", variant: "primary" },
		],
		variables: [
			"{patientName}",
			"{clinicName}",
			"{orderId}",
			"{treatmentSum}",
			"{paymentLink}",
		],
	},
];

export const DEFAULT_CONTACTS: readonly PatientOmnichannelContact[] = [
	{
		id: "pat-101",
		fullName: "Смирнов Алексей Викторович",
		phone: "+7 (916) 450-12-34",
		email: "smirnov.av@example.com",
		preferredChannel: "whatsapp",
		whatsappNumber: "+79164501234",
		telegramUsername: "smirnov_av",
		telegramChatId: "tg_982341",
		avatarColor: "#0d9488",
		unreadCount: 1,
		lastActivity: "2026-08-28T14:32:00.000Z",
		lastMessageSnippet: "Здравствуйте! Да, подтверждаю визит на завтра в 15:00.",
		nextAppointment: {
			date: "2026-08-29",
			time: "15:00",
			doctorName: "Д-р Кузнецова Е.В.",
			doctorSpecialty: "Стоматолог-терапевт",
			cabinet: "302",
			reason: "Лечение кариеса зуба 4.6, реставрация",
			address: "г. Москва, ул. Арбат, д. 24",
		},
		activeTreatmentPlan: {
			id: "tp-881",
			title: "Терапевтическая санация и коронка E-max",
			teethFdi: [46, 47],
			totalKopecks: 3850000,
			totalRub: 38500,
			pdfUrl: "/documents/treatment-plan-881.pdf",
			stagesCount: 2,
		},
	},
	{
		id: "pat-102",
		fullName: "Волкова Мария Сергеевна",
		phone: "+7 (925) 780-99-11",
		email: "volkova.m@example.com",
		preferredChannel: "telegram",
		whatsappNumber: "+79257809911",
		telegramUsername: "volkova_mary",
		telegramChatId: "tg_445120",
		avatarColor: "#0284c7",
		unreadCount: 0,
		lastActivity: "2026-08-28T11:15:00.000Z",
		lastMessageSnippet: "Спасибо большое, оплату по СБП провела!",
		nextAppointment: {
			date: "2026-09-02",
			time: "11:30",
			doctorName: "Д-р Морозов А.И.",
			doctorSpecialty: "Стоматолог-хирург-имплантолог",
			cabinet: "401",
			reason: "Установка дентального имплантата Dentium SuperLine (зуб 3.6)",
			address: "г. Москва, ул. Арбат, д. 24",
		},
		activeTreatmentPlan: {
			id: "tp-882",
			title: "Двухэтапная имплантация и циркониевая коронка",
			teethFdi: [36],
			totalKopecks: 6500000,
			totalRub: 65000,
			pdfUrl: "/documents/treatment-plan-882.pdf",
			stagesCount: 3,
		},
	},
	{
		id: "pat-103",
		fullName: "Барабаш Сергей Владимирович",
		phone: "+7 (903) 111-22-33",
		email: "barabash.sv@example.com",
		preferredChannel: "whatsapp",
		whatsappNumber: "+79031112233",
		telegramUsername: "barabash_sv",
		avatarColor: "#e11d48",
		unreadCount: 2,
		lastActivity: "2026-08-28T09:40:00.000Z",
		lastMessageSnippet: "Немного ноет зуб после пломбировки, это нормально?",
		nextAppointment: {
			date: "2026-08-30",
			time: "17:00",
			doctorName: "Д-р Соколова Н.П.",
			doctorSpecialty: "Стоматолог-терапевт",
			cabinet: "305",
			reason: "Контрольный осмотр и полировка реставрации 1.5",
			address: "г. Москва, ул. Арбат, д. 24",
		},
		activeTreatmentPlan: {
			id: "tp-883",
			title: "Эндодонтическое лечение и штифтование 1.5",
			teethFdi: [15],
			totalKopecks: 1950000,
			totalRub: 19500,
			stagesCount: 1,
		},
	},
	{
		id: "pat-104",
		fullName: "Ковалева Анна Дмитриевна",
		phone: "+7 (985) 654-32-10",
		email: "kovaleva.a@example.com",
		preferredChannel: "sms",
		whatsappNumber: "+79856543210",
		avatarColor: "#8b5cf6",
		unreadCount: 0,
		lastActivity: "2026-08-27T16:20:00.000Z",
		lastMessageSnippet: "Оценка качества: 10. Спасибо доктору за безболезненный прием!",
		nextAppointment: {
			date: "2026-09-10",
			time: "10:00",
			doctorName: "Д-р Васильев Д.А.",
			doctorSpecialty: "Стоматолог-ортопед",
			cabinet: "308",
			reason: "Фиксация керамических виниров E-max (1.3-2.3)",
			address: "г. Москва, ул. Арбат, д. 24",
		},
		activeTreatmentPlan: {
			id: "tp-884",
			title: "Эстетическая реабилитация: 6 виниров фронтальной группы",
			teethFdi: [13, 12, 11, 21, 22, 23],
			totalKopecks: 21000000,
			totalRub: 210000,
			stagesCount: 2,
		},
	},
];

export const DEFAULT_MESSAGES_BY_PATIENT: Record<string, OmnichannelMessage[]> = {
	"pat-101": [
		{
			id: "msg-101-1",
			patientId: "pat-101",
			channel: "whatsapp",
			direction: "outbound",
			senderName: "DENTE Bot",
			senderType: "automated_bot",
			timestamp: "2026-08-28T14:10:00.000Z",
			body: "Здравствуйте, Алексей Викторович!\nНапоминаем о вашем визите в клинику DENTE Dental Clinic:\n📅 29.08.2026 в 15:00 (кабинет 302)\n👨‍⚕️ Врач: Д-р Кузнецова Е.В.\n📍 Адрес: г. Москва, ул. Арбат, д. 24\n\nПодтвердите, пожалуйста, визит нажатием кнопки ниже.",
			status: "read",
			templateCategory: "visit_reminder",
			interactivePayload: {
				buttons: [
					{ id: "btn-confirm", title: "✅ Подтверждаю", action: "confirm_visit", variant: "primary" },
					{ id: "btn-reschedule", title: "🔄 Перенести", action: "request_reschedule", variant: "secondary" },
				],
			},
		},
		{
			id: "msg-101-2",
			patientId: "pat-101",
			channel: "whatsapp",
			direction: "inbound",
			senderName: "Алексей Викторович",
			senderType: "patient",
			timestamp: "2026-08-28T14:32:00.000Z",
			body: "Здравствуйте! Да, подтверждаю визит на завтра в 15:00. Буду вовремя.",
			status: "read",
		},
	],
	"pat-102": [
		{
			id: "msg-102-1",
			patientId: "pat-102",
			channel: "telegram",
			direction: "outbound",
			senderName: "Администратор Ольга",
			senderType: "clinic_staff",
			timestamp: "2026-08-28T10:45:00.000Z",
			body: "Мария Сергеевна, добрый день! Направляем согласованный план имплантации и счет на аванс для фиксации времени операции.",
			status: "read",
			templateCategory: "treatment_plan",
			attachments: [
				{
					id: "att-1",
					name: "План_лечения_имплантация_3.6.pdf",
					type: "pdf",
					url: "/documents/plan-36.pdf",
					sizeFormatted: "420 КБ",
				},
			],
		},
		{
			id: "msg-102-2",
			patientId: "pat-102",
			channel: "telegram",
			direction: "outbound",
			senderName: "DENTE Bot",
			senderType: "automated_bot",
			timestamp: "2026-08-28T10:46:00.000Z",
			body: "Счет на предоплату по заказу №ORD-882-01 на сумму 25 000,00 ₽ через СБП:\nhttps://qr.nspk.ru/SBP-ORD-882-01?type=02&bank=100000000111&sum=2500000&cur=RUB",
			status: "read",
			templateCategory: "sbp_payment",
			interactivePayload: {
				paymentUrl: "https://qr.nspk.ru/SBP-ORD-882-01",
				paymentAmountRub: 25000,
			},
		},
		{
			id: "msg-102-3",
			patientId: "pat-102",
			channel: "telegram",
			direction: "inbound",
			senderName: "Мария Сергеевна",
			senderType: "patient",
			timestamp: "2026-08-28T11:15:00.000Z",
			body: "Спасибо большое, оплату по СБП провела! Чек пришел.",
			status: "read",
		},
	],
	"pat-103": [
		{
			id: "msg-103-1",
			patientId: "pat-103",
			channel: "whatsapp",
			direction: "outbound",
			senderName: "DENTE Bot",
			senderType: "automated_bot",
			timestamp: "2026-08-27T18:00:00.000Z",
			body: "Сергей Владимирович, благодарим за визит к доктору Соколовой Н.П. Пожалуйста, оцените качество приема от 1 до 10.",
			status: "delivered",
			templateCategory: "nps_survey",
		},
		{
			id: "msg-103-2",
			patientId: "pat-103",
			channel: "whatsapp",
			direction: "inbound",
			senderName: "Сергей Владимирович",
			senderType: "patient",
			timestamp: "2026-08-28T09:40:00.000Z",
			body: "Немного ноет зуб после пломбировки, это нормально? Оценка 6 пока что.",
			status: "delivered",
		},
	],
	"pat-104": [
		{
			id: "msg-104-1",
			patientId: "pat-104",
			channel: "sms",
			direction: "outbound",
			senderName: "DENTE",
			senderType: "automated_bot",
			timestamp: "2026-08-27T15:00:00.000Z",
			body: "Анна Дмитриевна! Запись на прием 10.09 в 10:00 к д-ру Васильеву Д.А. подтверждена. Клиника DENTE: +74951234567",
			status: "delivered",
		},
		{
			id: "msg-104-2",
			patientId: "pat-104",
			channel: "sms",
			direction: "inbound",
			senderName: "Анна Дмитриевна",
			senderType: "patient",
			timestamp: "2026-08-27T16:20:00.000Z",
			body: "Оценка качества: 10. Спасибо доктору за безболезненный прием!",
			status: "delivered",
		},
	],
};

export const DEFAULT_NPS_REVIEWS: readonly NpsReview[] = [
	{
		id: "nps-1",
		patientId: "pat-101",
		patientName: "Смирнов Алексей Викторович",
		phone: "+7 (916) 450-12-34",
		score: 10,
		category: "promoter",
		urgency: "low",
		comment: "Прекрасный врач Кузнецова Е.В., все сделала без малейшей боли! Очень внимательный персонал.",
		doctorName: "Д-р Кузнецова Е.В.",
		serviceName: "Терапевтическое лечение кариеса",
		createdAt: "2026-08-28T12:00:00.000Z",
		status: "thanked",
		resolutionNote: "Отправлено персональное спасибо в WhatsApp.",
		resolvedBy: "Администратор Ольга",
	},
	{
		id: "nps-2",
		patientId: "pat-102",
		patientName: "Волкова Мария Сергеевна",
		phone: "+7 (925) 780-99-11",
		score: 10,
		category: "promoter",
		urgency: "low",
		comment: "Имплантация прошла за 20 минут! Морозов А.И. — хирург от бога. Удобно платить по СБП.",
		doctorName: "Д-р Морозов А.И.",
		serviceName: "Дентальная имплантация Dentium",
		createdAt: "2026-08-28T10:30:00.000Z",
		status: "thanked",
		resolvedBy: "Администратор Ольга",
	},
	{
		id: "nps-3",
		patientId: "pat-103",
		patientName: "Барабаш Сергей Владимирович",
		phone: "+7 (903) 111-22-33",
		score: 4,
		category: "detractor",
		urgency: "critical",
		comment: "После лечения каналов 1.5 сохраняется болезненность при накусывании уже 2-й день. Волнуюсь.",
		doctorName: "Д-р Соколова Н.П.",
		serviceName: "Эндодонтия 1.5",
		createdAt: "2026-08-28T09:40:00.000Z",
		status: "in_progress",
		resolutionNote: "Связались с пациентом, назначен внеочередной осмотр на 30.08 в 17:00.",
		resolvedBy: "Главврач Кузнецова Е.В.",
	},
	{
		id: "nps-4",
		patientId: "pat-105",
		patientName: "Егоров Павел Николаевич",
		phone: "+7 (915) 333-44-55",
		score: 2,
		category: "detractor",
		urgency: "critical",
		comment: "Пришлось ждать приема 25 минут, хотя пришел вовремя. Администратор не предупредила о задержке.",
		doctorName: "Д-р Морозов А.И.",
		serviceName: "Консультация хирурга",
		createdAt: "2026-08-27T17:15:00.000Z",
		status: "pending",
	},
	{
		id: "nps-5",
		patientId: "pat-104",
		patientName: "Ковалева Анна Дмитриевна",
		phone: "+7 (985) 654-32-10",
		score: 10,
		category: "promoter",
		urgency: "low",
		comment: "Идеальные виниры! Улыбка мечты. Спасибо доктору Васильеву за ювелирную работу.",
		doctorName: "Д-р Васильев Д.А.",
		serviceName: "Керамические виниры E-max",
		createdAt: "2026-08-27T16:20:00.000Z",
		status: "thanked",
	},
	{
		id: "nps-6",
		patientId: "pat-106",
		patientName: "Дмитриева Елена Олеговна",
		phone: "+7 (926) 999-88-77",
		score: 8,
		category: "neutral",
		urgency: "medium",
		comment: "Лечение качественное, но цены выше среднего по району. Было бы здорово иметь семейную скидку.",
		doctorName: "Д-р Кузнецова Е.В.",
		serviceName: "Профгигиена Air-Flow",
		createdAt: "2026-08-26T14:10:00.000Z",
		status: "resolved",
		resolutionNote: "Подключили программу Семейный депозит (скидка 7%).",
	},
];
