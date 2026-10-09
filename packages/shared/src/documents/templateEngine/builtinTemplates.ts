import type { TemplateDefinition } from "./types.js";

export const BUILT_IN_TEMPLATES: Record<string, TemplateDefinition> = {
	appointment_confirmation: {
		templateKey: "appointment_confirmation",
		description: "Подтверждение записи на приём",
		locales: {
			ru: {
				subject: "Запись на приём в {{clinic_name}} подтверждена",
				bodyText:
					"Здравствуйте, {{patient_name}}! Ваша запись в клинику {{clinic_name}} подтверждена на {{appointment_date}} в {{appointment_time}} (врач: {{doctor_name}}). Адрес: {{clinic_address}}. Телефон: {{clinic_phone}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: "Подтверждаю" },
					{ id: "APPT_RESCHEDULE", title: "Перенести" },
				],
			},
		},
	},

	appointment_reminder: {
		templateKey: "appointment_reminder",
		description: "Напоминание о предстоящем приёме (за 24ч / 2ч)",
		locales: {
			ru: {
				subject: "Напоминание о приёме: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! Напоминаем о вашем визите в клинику {{clinic_name}} завтра, {{appointment_date}} в {{appointment_time}} (врач: {{doctor_name}}). Ждём вас по адресу: {{clinic_address}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: "Буду на приёме" },
					{ id: "APPT_CANCEL", title: "Не смогу прийти" },
				],
			},
		},
	},

	appointment_cancelled: {
		templateKey: "appointment_cancelled",
		description: "Уведомление об отмене приёма",
		locales: {
			ru: {
				subject: "Отмена записи на приём: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}. Ваша запись на {{appointment_date}} в {{appointment_time}} в клинику {{clinic_name}} была отменена (причина: {{cancellation_reason}}). Для выбора нового времени позвоните нам: {{clinic_phone}}.",
				buttons: [{ id: "BOOK_NEW", title: "Записаться снова" }],
			},
		},
	},

	post_op_instructions: {
		templateKey: "post_op_instructions",
		description: "Памятка пациенту после лечения / операции",
		locales: {
			ru: {
				subject: "Рекомендации после приёма: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! После процедуры ({{treatment_name}}) рекомендуем: 1. Не принимать пищу 2 часа. 2. Избегать горячего и физических нагрузок 24ч. 3. При возникновении острой боли или отёка срочно свяжитесь с нами: {{clinic_phone}}.",
				buttons: [
					{ id: "FEELING_OK", title: "Всё хорошо" },
					{ id: "DOCTOR_CALL", title: "Нужна помощь" },
				],
			},
		},
	},

	invoice_payment_link: {
		templateKey: "invoice_payment_link",
		description: "Счёт на оплату и ссылка на онлайн-эквайринг",
		locales: {
			ru: {
				subject: "Счёт на оплату №{{invoice_number}}: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! Выставлен счёт №{{invoice_number}} на сумму {{total_amount}}. Ссылка для быстрой и безопасной оплаты картой или СБП: {{payment_url}}.",
				buttons: [{ id: "PAY_INVOICE", title: "Оплатить онлайн" }],
			},
		},
	},

	recall_reminder: {
		templateKey: "recall_reminder",
		description: "Напоминание о регулярном профилактическом осмотре (Recall)",
		locales: {
			ru: {
				subject: "Приглашение на плановый осмотр: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! Подошло время вашего регулярного профилактического осмотра ({{reason}}, запланирован на {{due_month}}). Сохраните здоровье зубов — запишитесь на удобное время: {{booking_url}} или по телефону {{clinic_phone}}.",
				buttons: [
					{ id: "BOOK_RECALL", title: "Записаться на осмотр" },
					{ id: "RECALL_SNOOZE", title: "Напомнить позже" },
				],
			},
		},
	},

	welcome: {
		templateKey: "welcome",
		description: "Приветственное сообщение новому пациенту",
		locales: {
			ru: {
				subject: "Добро пожаловать в клинику {{clinic_name}}!",
				bodyText:
					"Здравствуйте, {{patient_name}}! Рады приветствовать вас в клинике {{clinic_name}}. Мы всегда на связи: {{clinic_phone}}, адрес: {{clinic_address}}. В этом чате вы можете подтверждать приёмы и задавать вопросы.",
			},
		},
	},
};
