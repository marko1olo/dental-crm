/**
 * Messaging Template Engine
 *
 * Provides localized variable interpolation, template catalogs,
 * kopeck-exact currency formatting, post-op instructions, and interactive action buttons.
 */

import {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	rublesToKopecks,
} from "@dental/shared";
import type { InteractiveButton, SupportedLocale } from "./types.js";

export {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	rublesToKopecks,
};

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

export function formatMoney(amountKopecksOrUnits: number | string, _currency = "RUB"): string {
	try {
		const raw =
			typeof amountKopecksOrUnits === "string"
				? amountKopecksOrUnits.trim().replace(",", ".")
				: amountKopecksOrUnits;
		const kopecks = parseKopecks(raw);
		return formatKopecksRu(kopecks);
	} catch {
		return formatKopecksRu(0);
	}
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
				buttons: [{ id: "FEELING_OK", title: "Всё хорошо" }, { id: "DOCTOR_CALL", title: "Нужна помощь" }],
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
				buttons: [{ id: "BOOK_RECALL", title: "Записаться на осмотр" }, { id: "RECALL_SNOOZE", title: "Напомнить позже" }],
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

		// Resolve locale with fallback to 'ru' then first available
		const localeData =
			def.locales[locale] ||
			def.locales.ru ||
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

