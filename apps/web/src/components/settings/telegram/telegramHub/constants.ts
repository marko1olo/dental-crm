import type { TelegramDeliveryQueueItem, TelegramNotificationTemplate } from "./types";

export const BOT_TOKEN_REGEX = /^\d{6,12}:[A-Za-z0-9_-]{35,}$/;

export const TG_CODE_TIMER_DEFAULT_SECONDS = 120;
export const TG_CODE_LENGTH = 5;

export const TELEGRAM_TEMPLATE_VARIABLES = [
	{ key: "{patientName}", label: "ФИО пациента", example: "Иван Иванов" },
	{ key: "{doctorName}", label: "Врач", example: "Смирнова Е.А." },
	{ key: "{appointmentDate}", label: "Дата приема", example: "12 октября" },
	{ key: "{appointmentTime}", label: "Время приема", example: "14:30" },
	{ key: "{clinicName}", label: "Название клиники", example: "Стоматология DENTE" },
	{ key: "{clinicPhone}", label: "Телефон клиники", example: "+7 (495) 123-45-67" },
	{ key: "{serviceName}", label: "Услуга", example: "Первичный осмотр" },
] as const;

export const DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES: TelegramNotificationTemplate[] = [
	{
		id: "tpl_appt_reminder",
		code: "appointment_reminder",
		name: "Напоминание о визите",
		description: "Отправляется за 24 часа и за 2 часа до назначенного приема",
		category: "appointment",
		templateText:
			"Здравствуйте, {patientName}! Напоминаем о вашей записи в клинику {clinicName} на {appointmentDate} в {appointmentTime}. Врач: {doctorName}. Ждем вас! При необходимости перенести запись ответьте на это сообщение.",
		variables: ["{patientName}", "{clinicName}", "{appointmentDate}", "{appointmentTime}", "{doctorName}"],
		isActive: true,
		channel: "both",
	},
	{
		id: "tpl_appt_confirm",
		code: "appointment_confirmation",
		name: "Подтверждение записи",
		description: "Отправляется сразу после внесения пациента в расписание",
		category: "appointment",
		templateText:
			"Уважаемый(-ая) {patientName}, вы успешно записаны на прием в {clinicName} на {appointmentDate} в {appointmentTime} к доктору {doctorName}. Телефон клиники для справок: {clinicPhone}.",
		variables: ["{patientName}", "{clinicName}", "{appointmentDate}", "{appointmentTime}", "{doctorName}", "{clinicPhone}"],
		isActive: true,
		channel: "bot",
	},
	{
		id: "tpl_birthday",
		code: "birthday_greeting",
		name: "Поздравление с днем рождения",
		description: "Персональное поздравление и предложение планового осмотра",
		category: "birthday",
		templateText:
			"Дорогой(-ая) {patientName}! Коллектив {clinicName} от всей души поздравляет вас с днем рождения! Желаем крепкого здоровья, сияющей улыбки и благополучия. Дарим вам сертификат на профгигиену полости рта!",
		variables: ["{patientName}", "{clinicName}"],
		isActive: true,
		channel: "both",
	},
	{
		id: "tpl_recall",
		code: "recall_checkup",
		name: "Плановый осмотр (Recall)",
		description: "Приглашение на диспансерный осмотр через 6 месяцев",
		category: "recall",
		templateText:
			"Здравствуйте, {patientName}! Прошло 6 месяцев с момента вашего последнего визита к доктору {doctorName}. Для сохранения здоровья зубов рекомендуем пройти плановый осмотр в {clinicName}. Записаться: {clinicPhone}.",
		variables: ["{patientName}", "{doctorName}", "{clinicName}", "{clinicPhone}"],
		isActive: true,
		channel: "both",
	},
	{
		id: "tpl_review",
		code: "review_feedback",
		name: "Запрос отзыва после приема",
		description: "Опрос удовлетворенности качеством лечения через 2 часа после визита",
		category: "review",
		templateText:
			"{patientName}, спасибо за доверие к {clinicName}! Пожалуйста, оцените ваш сегодняшний прием у доктора {doctorName} от 1 до 5. Ваше мнение помогает нам становиться лучше!",
		variables: ["{patientName}", "{clinicName}", "{doctorName}"],
		isActive: true,
		channel: "bot",
	},
];

export const INITIAL_TELEGRAM_QUEUE_ITEMS: TelegramDeliveryQueueItem[] = [
	{
		id: "msg_q_001",
		recipientName: "Алексей Смирнов",
		recipientPhone: "+7 (916) 123-45-67",
		recipientChatId: 198421039,
		templateCode: "appointment_reminder",
		messageText:
			"Здравствуйте, Алексей! Напоминаем о вашей записи в клинику Стоматология DENTE на завтра в 15:00. Врач: Смирнова Е.А.",
		status: "sent",
		attempts: 1,
		maxAttempts: 3,
		lastAttemptAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
	},
	{
		id: "msg_q_002",
		recipientName: "Елена Васильева",
		recipientPhone: "+7 (926) 987-65-43",
		recipientChatId: 541092812,
		templateCode: "appointment_confirmation",
		messageText:
			"Уважаемая Елена, вы успешно записаны на прием в Стоматология DENTE на 14 октября в 11:30 к доктору Смирнова Е.А.",
		status: "sent",
		attempts: 1,
		maxAttempts: 3,
		lastAttemptAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
	},
	{
		id: "msg_q_003",
		recipientName: "Дмитрий Кузнецов",
		recipientPhone: "+7 (903) 555-12-34",
		recipientChatId: 772109441,
		templateCode: "recall_checkup",
		messageText:
			"Здравствуйте, Дмитрий! Прошло 6 месяцев с момента вашего последнего визита. Рекомендуем пройти плановый осмотр.",
		status: "queued",
		attempts: 0,
		maxAttempts: 3,
		createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
	},
];
