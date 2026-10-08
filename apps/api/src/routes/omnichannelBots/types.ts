import type { BotChannel } from "../../services/bots/types.js";

export interface InboxConversation {
	key: string;
	channel: BotChannel;
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
	interceptedBy: string | null;
	leadId: string | null;
	leadStatus: string | null;
	sourceBadge: string;
	sourceType: string;
}

export interface ChatMessageItem {
	id: string;
	channel: string;
	senderId: string;
	direction: "inbound" | "outbound";
	sender: "patient" | "bot" | "operator";
	senderName: string;
	text: string;
	createdAt: string;
}

export interface TelegramWebhookBody {
	message?: {
		message_id: number;
		from?: { id: number; first_name?: string; last_name?: string };
		text?: string;
	};
	callback_query?: {
		id: string;
		from?: { id: number; first_name?: string };
		message?: { message_id: number };
		data?: string;
	};
}

export interface MessengerChannelOverviewItem {
	id: string;
	title: string;
	shortBadge: string;
	channel: BotChannel;
	type: "bot" | "account" | "group" | "phone" | "waba";
	status: "connected" | "pending_qr" | "unconfigured";
	statusText: string;
	statusColor: "green" | "yellow" | "gray";
	details: string;
	tokenMasked: string;
	configTab: string;
	updatedAt: string | null;
}
