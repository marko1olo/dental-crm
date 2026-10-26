import { formatCurrencyRu } from "../../../utils/formatters.js";
import type { PatientOmnichannelContact } from "../omnichannelTypes.js";

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

export function generateVisitReminderText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
	clinicAddress = "Адрес клиники",
): string {
	const appt = contact.nextAppointment;
	const dateStr = appt ? `${appt.date} в ${appt.time}` : "завтра в 14:00";
	const docStr = appt?.doctorName || "Лечащий врач";
	const cabStr = appt?.cabinet ? ` (кабинет ${appt.cabinet})` : "";
	const reasonStr = appt?.reason ? `\nПовод: ${appt.reason}` : "";

	return `Здравствуйте, ${contact.fullName}!\nНапоминаем о вашем приеме в клинике ${clinicName}:\nДата и время: ${dateStr}${cabStr}\nВрач: ${docStr}${reasonStr}\nАдрес: ${clinicAddress}\n\nПожалуйста, подтвердите ваш визит или свяжитесь с нами, если планы изменились.`;
}

export function generateAppointmentConfirmationText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
): string {
	const appt = contact.nextAppointment;
	const dateStr = appt ? `${appt.date} в ${appt.time}` : "на запланированное время";
	const docStr = appt?.doctorName || "вашему лечащему врачу";

	return `Здравствуйте, ${contact.fullName}!\nВы успешно записаны на прием в ${clinicName}.\nДата и время: ${dateStr}\nВрач: ${docStr}\n\nЖдем вас! Для отмены или переноса просто напишите ответное сообщение в этот чат.`;
}

export function generateTreatmentPlanText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
): string {
	const plan = contact.activeTreatmentPlan;
	const planTitle = plan?.title || "Комплексный план лечения";
	const teeth = plan?.teethFdi && plan.teethFdi.length > 0 ? ` (зубы ${plan.teethFdi.join(", ")})` : "";
	const sum = plan ? formatCurrencyRu(plan.totalRub) : "по смете";

	return `Здравствуйте, ${contact.fullName}!\nВаш лечащий врач подготовил электронный план лечения:\nПлан: ${planTitle}${teeth}\nИтоговая сумма этапов: ${sum}\n\nС планом и этапами можно ознакомиться в приложенном файле. Если у вас возникнут вопросы, наш координатор лечения на связи!`;
}

export function generateNpsSurveyText(
	contact: PatientOmnichannelContact,
	clinicName = "DENTE Dental Clinic",
): string {
	const docStr = contact.nextAppointment?.doctorName || "в нашей клинике";
	return `Здравствуйте, ${contact.fullName}!\nБлагодарим за визит в ${clinicName}.\n\nОцените, пожалуйста, качество приема у доктора (${docStr}) по шкале от 1 до 10, где 10 — «все прошло великолепно», а 1 — «крайне недоволен».\n\nПросто отправьте цифру в ответном сообщении! Ваше мнение помогает нам становиться лучше.`;
}
