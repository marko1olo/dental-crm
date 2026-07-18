export interface ChatMessage {
	id: string;
	patientId: string;
	message: string;
	channel: string;
	direction: "inbound" | "outbound";
	createdAt: string;
	attachments?: { name: string; url: string; type: string }[];
	readAt?: string | null;
	patientName?: string;
}

export interface ChatSummary extends ChatMessage {
	unreadCount: number;
	patientPhone?: string;
}
