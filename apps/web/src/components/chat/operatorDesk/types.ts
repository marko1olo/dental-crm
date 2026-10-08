export type BotChannel = "telegram" | "vk" | "whatsapp" | "max";

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
	sourceBadge?: string;
	sourceType?: string;
}

export interface ChatMessageItem {
	id: string;
	channel: string;
	senderId: string;
	direction: "inbound" | "outbound";
	sender: "patient" | "bot" | "operator";
	senderName: string;
	text: string;
	actionExecuted?: string;
	createdAt: string;
}

export interface SourceBadgeInfo {
	name: string;
	badge: string;
	color: string;
	bgColor: string;
	borderColor: string;
}

export interface OmnichannelOperatorDeskProps {
	className?: string;
	onOpenPatientCard?: (patientId: string) => void;
	onBookAppointment?: (patient: {
		patientId: string | null;
		patientName: string;
		phone: string | null;
	}) => void;
}

export interface DoctorOption {
	id: string;
	fullName: string;
}

export interface QuickReplyTemplate {
	label: string;
	text: string;
}
