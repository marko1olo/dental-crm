import type {
	CommunicationTaskOutcome,
	Dashboard,
	GeneratedDocument,
	StaffRole,
} from "@dental/shared";

export type CommunicationTask = Dashboard["communicationTasks"][number];
export type CommunicationEvent = Dashboard["communicationEvents"][number];

export interface MobilePatientDialogSummary {
	patientId: string;
	patientName: string;
	patientPhone: string;
	lastMessage: string;
	lastMessageAt: string;
	channel: "whatsapp" | "telegram" | "sms" | "max";
	direction: "inbound" | "outbound";
	unreadCount: number;
}

export interface MobileChatMessageItem {
	id: string;
	patientId: string;
	text: string;
	direction: "inbound" | "outbound";
	channel: "whatsapp" | "telegram" | "sms" | "max";
	timestamp: string;
	status?: "sent" | "delivered" | "read" | "failed" | undefined;
}

export interface MobileCommunicationsMessengerProps {
	dashboard?: Dashboard | null | undefined;
	onGoToSchedule?: (() => void) | undefined;
	completeCommunicationTask?: ((
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>) | undefined;
	communicationNote?: string | undefined;
	onCommunicationNoteChange?: ((val: string) => void) | undefined;
	communicationSavingTaskId?: string | null | undefined;
	openCommunicationTaskDocumentWorkflow?: ((
		task: CommunicationTask,
		kind: GeneratedDocument["kind"],
	) => void) | undefined;
	communicationChannelLabels?: Record<CommunicationTask["channel"], string> | undefined;
	communicationPriorityLabels?: Record<CommunicationTask["priority"], string> | undefined;
	communicationIntentLabels?: Record<CommunicationTask["intent"], string> | undefined;
	communicationStatusLabels?: Record<CommunicationTask["status"], string> | undefined;
	documentKindsForCommunicationTask?: ((
		task: CommunicationTask,
	) => readonly GeneratedDocument["kind"][]) | undefined;
	documentLabels?: Record<GeneratedDocument["kind"], string> | undefined;
	staffRoleLabels?: Record<StaffRole, string> | undefined;
	formatDateTime?: ((val: string) => string) | undefined;
	initialPatientId?: string | null | undefined;
}

export type ActiveSection = "dialogs" | "tasks" | "journal" | "bots";
export type ChannelFilter = "all" | "whatsapp" | "telegram" | "sms" | "max";
export type ChatChannel = "whatsapp" | "telegram" | "sms" | "max";

export interface ActivePatient {
	id: string;
	fullName: string;
	phone: string;
}

