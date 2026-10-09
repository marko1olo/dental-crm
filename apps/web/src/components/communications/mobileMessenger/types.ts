import type { CommunicationTaskOutcome, Dashboard } from "@dental/shared";

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
	status?: "sent" | "delivered" | "read" | "failed";
}

export interface MobileCommunicationsMessengerProps {
	dashboard: Dashboard;
	onGoToSchedule?: () => void;
	completeCommunicationTask?: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>;
	communicationNote?: string;
	onCommunicationNoteChange?: (val: string) => void;
	communicationSavingTaskId?: string | null;
	openCommunicationTaskDocumentWorkflow?: (task: any, kind: any) => void;
	communicationChannelLabels?: Record<string, string>;
	communicationPriorityLabels?: Record<string, string>;
	communicationIntentLabels?: Record<string, string>;
	communicationStatusLabels?: Record<string, string>;
	documentKindsForCommunicationTask?: (task: any) => readonly any[];
	documentLabels?: Record<string, string>;
	staffRoleLabels?: Record<string, string>;
	formatDateTime?: (val: string) => string;
	initialPatientId?: string | null;
}

export type ActiveSection = "dialogs" | "tasks" | "journal" | "bots";
export type ChannelFilter = "all" | "whatsapp" | "telegram" | "sms";
export type ChatChannel = "whatsapp" | "telegram" | "sms";

export interface ActivePatient {
	id: string;
	fullName: string;
	phone: string;
}
