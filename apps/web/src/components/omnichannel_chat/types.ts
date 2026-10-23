/**
 * Omnichannel Chat Domain Types & Invariants
 *
 * Supports WhatsApp, Telegram, SMS, VK and MAX unified communication streams.
 */

export type OmnichannelChannel = "whatsapp" | "telegram" | "sms" | "vk" | "max";

export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type MessageSenderRole = "patient" | "operator" | "bot" | "doctor";

export interface OmnichannelAttachment {
	id: string;
	name: string;
	url: string;
	sizeBytes?: number | undefined;
	mimeType?: string | undefined;
}

export interface OmnichannelMessage {
	id: string;
	channel: OmnichannelChannel;
	senderId: string;
	senderName: string;
	senderRole: MessageSenderRole;
	text: string;
	timestamp: string;
	status: MessageDeliveryStatus;
	patientId?: string | undefined;
	patientPhone?: string | undefined;
	attachments?: OmnichannelAttachment[] | undefined;
}

export interface OmnichannelConversation {
	id: string;
	patientId?: string | undefined;
	patientName: string;
	patientPhone: string;
	channel: OmnichannelChannel;
	unreadCount: number;
	lastMessageText: string;
	lastMessageTime: string;
	isHumanIntercepted?: boolean | undefined;
	balanceRub?: number | undefined;
	lastVisit?: string | undefined;
}

export interface OmnichannelTemplate {
	id: string;
	title: string;
	category: "reminder" | "post_op" | "payment" | "general";
	text: string;
	channel?: OmnichannelChannel | "all" | undefined;
}
