import type { OmnichannelTemplate } from "../omnichannelTypes.js";

export const PRIMARY_TEMPLATES: readonly OmnichannelTemplate[] = [
	{
		id: "tpl-reminder",
		name: "Напоминание о предстоящем визите",
		category: "visit_reminder",
		channel: "all",
		title: "Напоминание о приеме (за 24ч)",
		description: "Отправка пациенту точной даты, времени, кабинета, врача и рекомендаций по подготовке",
		templateText:
			"Здравствуйте, {patientName}!\nНапоминаем о вашем визите в клинику {clinicName}:\nДата и время: {appointmentDate} в {appointmentTime} (кабинет {cabinet})\nВрач: {doctorName}\nАдрес: {clinicAddress}\n\nПодтвердите, пожалуйста, визит нажатием кнопки ниже.",
		interactiveButtons: [
			{ id: "btn-confirm", title: "Подтверждаю", action: "confirm_visit", variant: "primary" },
			{ id: "btn-reschedule", title: "Перенести", action: "request_reschedule", variant: "secondary" },
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
			"Здравствуйте, {patientName}!\nВы успешно записаны на прием в {clinicName}.\nДата и время: {appointmentDate} в {appointmentTime}\nВрач: {doctorName}\nАдрес: {clinicAddress}\n\nЖдем вас! Для отмены или переноса просто напишите в этот чат.",
		interactiveButtons: [
			{ id: "btn-map", title: "Маршрут на карте", action: "open_map", variant: "secondary" },
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
			"Здравствуйте, {patientName}!\nВаш лечащий врач подготовил электронный план лечения:\nСмета: {treatmentPlanTitle}\nСумма к оплате: {treatmentSum}\n\nОзнакомьтесь с этапами в прикрепленном документе. Координатор лечения на связи для согласования времени визитов.",
		interactiveButtons: [
			{ id: "btn-pay-deposit", title: "Внести аванс СБП", action: "pay_sbp", variant: "primary" },
		],
		variables: ["{patientName}", "{treatmentPlanTitle}", "{treatmentSum}"],
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
			{ id: "btn-nps-10", title: "10 из 10", action: "score_10", variant: "primary" },
			{ id: "btn-nps-8", title: "8 из 10", action: "score_8", variant: "secondary" },
		],
		variables: ["{patientName}", "{clinicName}", "{doctorName}"],
	},
];
