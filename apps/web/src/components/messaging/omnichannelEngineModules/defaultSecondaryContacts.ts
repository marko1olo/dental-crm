import type { PatientOmnichannelContact } from "../omnichannelTypes.js";
import { PRIMARY_CONTACTS } from "./defaultContacts.js";

export const SECONDARY_CONTACTS: readonly PatientOmnichannelContact[] = [
	{
		id: "pat-103",
		fullName: "Пациент клиники (С.В.)",
		phone: "+7 (903) 111-22-33",
		email: "patient.103@example.com",
		preferredChannel: "whatsapp",
		whatsappNumber: "+79031112233",
		telegramUsername: "patient_103",
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
			address: "Адрес клиники",
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
			address: "Адрес клиники",
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

export const DEFAULT_CONTACTS: readonly PatientOmnichannelContact[] = [
	...PRIMARY_CONTACTS,
	...SECONDARY_CONTACTS,
];
