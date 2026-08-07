export type CommunicationChannelCode =
	| "phone"
	| "sms"
	| "whatsapp"
	| "telegram"
	| "email"
	| "in_person"
	| "vk"
	| "max";

export type CommunicationConsentScope = "service" | "marketing";

export type DeliveryErrorClass =
	| "not_configured"
	| "rate_limited"
	| "auth"
	| "insufficient_funds"
	| "recipient_unavailable"
	| "recipient_rejected"
	| "sender_rejected"
	| "message_rejected"
	| "chat_blocked"
	| "bad_request"
	| "timeout"
	| "network"
	| "server"
	| "unknown";
