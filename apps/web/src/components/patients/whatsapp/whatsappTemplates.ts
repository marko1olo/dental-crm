import { generateAppointmentConfirmationMessage } from "../../../store/telephonyStore";
import type { WhatsappTemplateType } from "./types";

export interface WhatsappTemplateContext {
	nameHint: string;
	clinicName: string;
	upcomingAppointment: any;
}

export function getWhatsappTemplateText(
	type: WhatsappTemplateType,
	{ nameHint, clinicName, upcomingAppointment }: WhatsappTemplateContext,
): string {
	const doctor = upcomingAppointment?.doctorName || "лечащему врачу";
	const dateStr = upcomingAppointment
		? `${upcomingAppointment.isToday ? "сегодня" : upcomingAppointment.isTomorrow ? "завтра" : upcomingAppointment.formattedDate} в ${upcomingAppointment.formattedTime}`
		: "";

	switch (type) {
		case "reminder":
			return upcomingAppointment
				? generateAppointmentConfirmationMessage({
						patientName: nameHint,
						doctorName: upcomingAppointment.doctorName,
						appointmentStartsAt: upcomingAppointment.startsAt,
						clinicName,
						templateType: "reminder",
					})
				: `Здравствуйте, ${nameHint}! Напоминаем о вашем визите в ${clinicName}. Пожалуйста, приходите за 5–10 минут до начала приёма.`;
		case "confirmation":
			return upcomingAppointment
				? `Здравствуйте, ${nameHint}! Напоминаем: вы записаны в ${clinicName} на ${dateStr} к доктору ${doctor}. Пожалуйста, подтвердите визит ответным сообщением ДА или позвоните нам.`
				: `Здравствуйте, ${nameHint}! Подтверждаем вашу запись в ${clinicName}. Ждём вас на приём!`;
		case "hygiene":
			return `Здравствуйте, ${nameHint}! Стоматология ${clinicName} напоминает: прошло 6 месяцев с вашего последнего визита. Рекомендуем пройти комплексную профессиональную гигиену полости рта (AirFlow + ультразвук). Подобрать для вас удобное время?`;
		case "checkup":
			return `Здравствуйте, ${nameHint}! Как ваше самочувствие после недавнего лечения в ${clinicName}? Напоминаем о возможности пройти контрольный осмотр. Если вас что-то беспокоит, напишите нам.`;
		case "xray":
			return `Здравствуйте, ${nameHint}! Вам назначен диагностический 3D-снимок (КТ / ОПТГ). Исследование занимает 2 минуты, подготовка не требуется. Ждём вас в рентген-кабинете ${clinicName}!`;
		case "treatment_plan":
			return `Здравствуйте, ${nameHint}! Ваш индивидуальный план лечения и сметы подготовлены доктором. Вы можете ознакомиться с ними в клинике ${clinicName} или личном кабинете.`;
		case "route":
			return `Здравствуйте, ${nameHint}! Маршрут до клиники ${clinicName}: ул. Ленина, д. 10. Вход со двора, бесплатная парковка перед шлагбаумом. Схема проезда: https://dente.clinic/contacts`;
	}
}
