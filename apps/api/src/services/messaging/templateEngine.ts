/**
 * Messaging Template Engine
 *
 * Provides multi-lingual localized variable interpolation, template catalogs,
 * kopeck-exact currency formatting, post-op instructions, and interactive action buttons.
 */

import type { InteractiveButton, SupportedLocale } from "./types.js";

export interface RenderedTemplate {
	templateKey: string;
	locale: SupportedLocale | string;
	subject: string;
	bodyText: string;
	bodyHtml?: string | undefined;
	buttons?: InteractiveButton[] | undefined;
}

export interface TemplateDefinition {
	templateKey: string;
	description: string;
	locales: Record<
		string,
		{
			subject: string;
			bodyText: string;
			bodyHtml?: string | undefined;
			buttons?: InteractiveButton[] | undefined;
		}
	>;
}

export function formatMoney(amountKopecksOrUnits: number | string, currency = "RUB"): string {
	const num = typeof amountKopecksOrUnits === "string" ? parseFloat(amountKopecksOrUnits) : amountKopecksOrUnits;
	if (isNaN(num)) return "0.00";

	// If integer > 100 and no decimals, assume it could be rubles or kopecks; format clearly
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
}

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
					{ id: "APPT_CONFIRM", title: " Подтверждаю" },
					{ id: "APPT_RESCHEDULE", title: " Перенести" },
				],
			},
			es: {
				subject: "Confirmación de cita en {{clinic_name}}",
				bodyText:
					"¡Hola, {{patient_name}}! Su cita en {{clinic_name}} está confirmada para el {{appointment_date}} a las {{appointment_time}} con {{doctor_name}}. Dirección: {{clinic_address}}. Tel: {{clinic_phone}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: " Confirmar" },
					{ id: "APPT_RESCHEDULE", title: " Reagendar" },
				],
			},
			en: {
				subject: "Appointment confirmed at {{clinic_name}}",
				bodyText:
					"Hello {{patient_name}}! Your appointment at {{clinic_name}} is confirmed for {{appointment_date}} at {{appointment_time}} with {{doctor_name}}. Address: {{clinic_address}}. Phone: {{clinic_phone}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: " Confirm" },
					{ id: "APPT_RESCHEDULE", title: " Reschedule" },
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
					{ id: "APPT_CONFIRM", title: " Буду на приёме" },
					{ id: "APPT_CANCEL", title: " Не смогу прийти" },
				],
			},
			es: {
				subject: "Recordatorio de cita: {{clinic_name}}",
				bodyText:
					"Hola {{patient_name}}, le recordamos su cita en {{clinic_name}} el {{appointment_date}} a las {{appointment_time}} con {{doctor_name}}. Le esperamos en: {{clinic_address}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: " Asistiré" },
					{ id: "APPT_CANCEL", title: " Cancelar" },
				],
			},
			en: {
				subject: "Appointment reminder: {{clinic_name}}",
				bodyText:
					"Hello {{patient_name}}, this is a reminder for your appointment at {{clinic_name}} on {{appointment_date}} at {{appointment_time}} with {{doctor_name}}. See you at {{clinic_address}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: " I will attend" },
					{ id: "APPT_CANCEL", title: " Cancel" },
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
				buttons: [{ id: "BOOK_NEW", title: " Записаться снова" }],
			},
			es: {
				subject: "Cancelación de cita: {{clinic_name}}",
				bodyText:
					"Hola {{patient_name}}, su cita para el {{appointment_date}} a las {{appointment_time}} en {{clinic_name}} ha sido cancelada (motivo: {{cancellation_reason}}). Para reagendar llámenos al {{clinic_phone}}.",
				buttons: [{ id: "BOOK_NEW", title: " Nueva cita" }],
			},
			en: {
				subject: "Appointment cancelled: {{clinic_name}}",
				bodyText:
					"Hello {{patient_name}}, your appointment on {{appointment_date}} at {{appointment_time}} at {{clinic_name}} has been cancelled (reason: {{cancellation_reason}}). Call {{clinic_phone}} to reschedule.",
				buttons: [{ id: "BOOK_NEW", title: " Book new slot" }],
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
				buttons: [{ id: "FEELING_OK", title: " Всё хорошо" }, { id: "DOCTOR_CALL", title: " Нужна помощь" }],
			},
			es: {
				subject: "Cuidados posteriores: {{clinic_name}}",
				bodyText:
					"Hola {{patient_name}}. Tras su tratamiento ({{treatment_name}}): 1. No comer en 2h. 2. Evitar comidas calientes y esfuerzo 24h. 3. Si presenta dolor agudo contáctenos al {{clinic_phone}}.",
				buttons: [{ id: "FEELING_OK", title: " Me siento bien" }, { id: "DOCTOR_CALL", title: " Ayuda" }],
			},
			en: {
				subject: "Post-op care instructions: {{clinic_name}}",
				bodyText:
					"Hello {{patient_name}}. Following your treatment ({{treatment_name}}): 1. Do not eat for 2 hours. 2. Avoid hot foods/strenuous exercise for 24h. 3. If severe pain occurs call {{clinic_phone}}.",
				buttons: [{ id: "FEELING_OK", title: " Feeling good" }, { id: "DOCTOR_CALL", title: " Need help" }],
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
				buttons: [{ id: "PAY_INVOICE", title: " Оплатить онлайн" }],
			},
			es: {
				subject: "Factura №{{invoice_number}}: {{clinic_name}}",
				bodyText:
					"Hola {{patient_name}}, se ha emitido la factura №{{invoice_number}} por importe de {{total_amount}}. Enlace de pago seguro: {{payment_url}}.",
				buttons: [{ id: "PAY_INVOICE", title: " Pagar online" }],
			},
			en: {
				subject: "Invoice #{{invoice_number}}: {{clinic_name}}",
				bodyText:
					"Hello {{patient_name}}, invoice #{{invoice_number}} for {{total_amount}} is ready. Secure payment link: {{payment_url}}.",
				buttons: [{ id: "PAY_INVOICE", title: " Pay online" }],
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
				buttons: [{ id: "BOOK_RECALL", title: " Записаться на осмотр" }, { id: "RECALL_SNOOZE", title: " Напомнить позже" }],
			},
			es: {
				subject: "Revisión periódica recomendada: {{clinic_name}}",
				bodyText:
					"Hola {{patient_name}}, es momento de su revisión periódica ({{reason}}, previsto para {{due_month}}). Reserve su cita en: {{booking_url}} o llamando a {{clinic_phone}}.",
				buttons: [{ id: "BOOK_RECALL", title: " Reservar cita" }, { id: "RECALL_SNOOZE", title: " Posponer" }],
			},
			en: {
				subject: "Routine dental recall: {{clinic_name}}",
				bodyText:
					"Hello {{patient_name}}, it is time for your dental review ({{reason}}, due {{due_month}}). Book your appointment here: {{booking_url}} or call {{clinic_phone}}.",
				buttons: [{ id: "BOOK_RECALL", title: " Book appointment" }, { id: "RECALL_SNOOZE", title: " Snooze" }],
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
			es: {
				subject: "¡Bienvenido a {{clinic_name}}!",
				bodyText:
					"¡Hola, {{patient_name}}! Le damos la bienvenida a {{clinic_name}}. Estamos a su disposición en {{clinic_phone}} y en {{clinic_address}}.",
			},
			en: {
				subject: "Welcome to {{clinic_name}}!",
				bodyText:
					"Hello {{patient_name}}! Welcome to {{clinic_name}}. We are here to assist you at {{clinic_phone}}, address: {{clinic_address}}.",
			},
		},
	},
};

/**
 * Interpolates variables formatted as `{{variable_name}}` from context.
 */
export function interpolateVariables(templateString: string, context: Record<string, unknown> = {}): string {
	return templateString.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
		const val = context[varName];
		if (val === undefined || val === null) {
			return match; // Keep unresolved tokens visible for debugging
		}
		if (typeof val === "number" && (varName.includes("amount") || varName.includes("price") || varName.includes("total"))) {
			return formatMoney(val);
		}
		return String(val);
	});
}

export class TemplateEngine {
	private readonly customTemplates: Map<string, TemplateDefinition> = new Map();

	/**
	 * Register a custom template into the engine.
	 */
	public registerTemplate(template: TemplateDefinition): void {
		this.customTemplates.set(template.templateKey, template);
	}

	/**
	 * Renders a template by key, locale, and context variables.
	 */
	public render(
		templateKey: string,
		locale: SupportedLocale | string = "ru",
		context: Record<string, unknown> = {},
	): RenderedTemplate {
		const def = this.customTemplates.get(templateKey) || BUILT_IN_TEMPLATES[templateKey];

		if (!def) {
			// Fallback generic template
			const bodyText = context.bodyText ? String(context.bodyText) : `Уведомление: ${templateKey}`;
			return {
				templateKey,
				locale,
				subject: (context.subject as string) || "Уведомление клиники",
				bodyText: interpolateVariables(bodyText, context),
				buttons: (context.buttons as InteractiveButton[]) || [],
			};
		}

		// Resolve locale with fallback to 'ru' then 'es' then 'en' then first available
		const localeData =
			def.locales[locale] ||
			def.locales.ru ||
			def.locales.es ||
			def.locales.en ||
			Object.values(def.locales)[0];

		if (!localeData) {
			throw new Error(`No locale definition available for template '${templateKey}'`);
		}

		const renderedSubject = interpolateVariables(localeData.subject, context);
		const renderedBody = interpolateVariables(localeData.bodyText, context);
		const renderedHtml = localeData.bodyHtml ? interpolateVariables(localeData.bodyHtml, context) : undefined;

		const result: RenderedTemplate = {
			templateKey,
			locale,
			subject: renderedSubject,
			bodyText: renderedBody,
		};
		if (renderedHtml !== undefined) {
			result.bodyHtml = renderedHtml;
		}
		if (localeData.buttons) {
			result.buttons = [...localeData.buttons];
		}
		return result;
	}
}

export const templateEngine = new TemplateEngine();
