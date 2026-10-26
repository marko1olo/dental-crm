import type { OmnichannelMessage } from "../omnichannelTypes.js";
import { MESSAGES_PAT_101_AND_102 } from "./defaultMessages.js";

export const MESSAGES_PAT_103_AND_104: Record<string, OmnichannelMessage[]> = {
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
			body: "Анна Дмитриевна! Запись на прием 10.09 в 10:00 к д-ру Васильеву Д.А. подтверждена. Клиника DENTE",
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

export const DEFAULT_MESSAGES_BY_PATIENT: Record<string, OmnichannelMessage[]> = {
	...MESSAGES_PAT_101_AND_102,
	...MESSAGES_PAT_103_AND_104,
};
