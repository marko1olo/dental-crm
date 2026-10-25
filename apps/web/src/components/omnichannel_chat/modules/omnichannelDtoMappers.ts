/**
 * omnichannelDtoMappers.ts — Преобразователи данных и DTO омниканального чата.
 * Мандат 8b: строго <= 120 строк.
 */

import type { OmnichannelChannel, OmnichannelConversation, OmnichannelMessage } from "../types";

export interface BotsInboxConversationDto {
	key: string;
	channel: string;
	senderId: string;
	senderName: string;
	patientId: string | null;
	patientName: string;
	phone: string | null;
	lastMessage: string;
	lastMessageAt: string;
	lastMessageDirection: "inbound" | "outbound";
	unreadCount: number;
	isIntercepted: boolean;
}

export interface BotsInboxMessageDto {
	id: string;
	channel: string;
	senderId: string;
	direction: "inbound" | "outbound";
	sender: "patient" | "bot" | "operator";
	senderName: string;
	text: string;
	createdAt: string;
}

export function parseConversationKey(key: string): { channel: OmnichannelChannel; senderId: string } {
	const sep = key.indexOf(":");
	if (sep <= 0) return { channel: "telegram", senderId: key };
	return {
		channel: key.slice(0, sep) as OmnichannelChannel,
		senderId: key.slice(sep + 1),
	};
}

export function mapConversation(dto: BotsInboxConversationDto): OmnichannelConversation {
	return {
		id: dto.key,
		patientId: dto.patientId ?? undefined,
		patientName: dto.patientName || dto.senderName || "Пациент",
		patientPhone: dto.phone || "",
		channel: dto.channel as OmnichannelChannel,
		unreadCount: dto.unreadCount || 0,
		lastMessageText: dto.lastMessage || "",
		lastMessageTime: dto.lastMessageAt || new Date().toISOString(),
		isHumanIntercepted: dto.isIntercepted,
	};
}

export function mapMessage(dto: BotsInboxMessageDto): OmnichannelMessage {
	return {
		id: dto.id,
		channel: dto.channel as OmnichannelChannel,
		senderId: dto.senderId,
		senderName: dto.senderName,
		senderRole: dto.sender,
		text: dto.text,
		timestamp: dto.createdAt,
		status: "sent",
	};
}

export const CANONICAL_DEMO_CONVERSATIONS: OmnichannelConversation[] = [
	{
		id: "whatsapp:79991234567",
		patientId: "pat-101",
		patientName: "Алексей Смирнов",
		patientPhone: "+7 (999) 123-45-67",
		channel: "whatsapp",
		unreadCount: 1,
		lastMessageText: "Здравствуйте, подскажите стоимость чистки зубов?",
		lastMessageTime: new Date(Date.now() - 5 * 60000).toISOString(),
		isHumanIntercepted: false,
	},
	{
		id: "telegram:tg_user_88",
		patientId: "pat-102",
		patientName: "Мария Иванова",
		patientPhone: "+7 (916) 987-65-43",
		channel: "telegram",
		unreadCount: 0,
		lastMessageText: "Спасибо! Буду в четверг в 14:00.",
		lastMessageTime: new Date(Date.now() - 35 * 60000).toISOString(),
		isHumanIntercepted: true,
	},
	{
		id: "vk:vk_user_33",
		patientId: "pat-103",
		patientName: "Дмитрий Кузнецов",
		patientPhone: "+7 (903) 555-44-33",
		channel: "vk",
		unreadCount: 0,
		lastMessageText: "Снимок отправил, посмотрите пожалуйста.",
		lastMessageTime: new Date(Date.now() - 120 * 60000).toISOString(),
		isHumanIntercepted: false,
	},
];

export const CANONICAL_DEMO_MESSAGES: OmnichannelMessage[] = [
	{ id: "msg-1", channel: "whatsapp", senderId: "79991234567", senderName: "Алексей Смирнов", senderRole: "patient", text: "Добрый день! Хочу записаться на консультацию.", timestamp: new Date(Date.now() - 15 * 60000).toISOString(), status: "delivered" },
	{ id: "msg-2", channel: "whatsapp", senderId: "operator", senderName: "Администратор Клиники", senderRole: "operator", text: "Добрый день, Алексей! Есть свободное окно завтра в 15:30.", timestamp: new Date(Date.now() - 10 * 60000).toISOString(), status: "read" },
	{ id: "msg-3", channel: "whatsapp", senderId: "79991234567", senderName: "Алексей Смирнов", senderRole: "patient", text: "Здравствуйте, подскажите стоимость чистки зубов?", timestamp: new Date(Date.now() - 5 * 60000).toISOString(), status: "delivered" },
];
