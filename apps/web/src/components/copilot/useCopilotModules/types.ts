import type React from "react";
import type {
	ConfirmUiMessage,
	CopilotNudge,
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	ReactStepItem,
	ReactStepsUiMessage,
	TextUiMessage,
	ToolUiMessage,
	WhatsAppApprovalCard,
} from "../copilotTypes";

export interface UseCopilotOptions {
	apiBaseUrl?: string | undefined;
	initialOpen?: boolean | undefined;
}

export interface CopilotMessage {
	id?: string;
	role: "user" | "assistant" | "system";
	content: string;
	createdAt?: string;
}

export interface CopilotSuggestion {
	id: string;
	title: string;
	prompt: string;
	category?: string;
}

export interface CopilotContext {
	activeTooth?: number | string | null | undefined;
	diagnosis?: string | undefined;
	allergies?: string[] | undefined;
	complaint?: string | undefined;
	icd10?: string | undefined;
}

export interface Form043Note {
	tooth?: number | string | undefined;
	diagnosis?: string | undefined;
	complaint?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	treatmentPlan?: string | undefined;
}

export interface UseCopilotReturn {
	isOpen: boolean;
	conversationId: string | null;
	messages: CopilotUiMessage[];
	busy: boolean;
	pending: PendingConfirmation | null;
	phase: CopilotPhase;
	nameCache: Record<string, string>;
	nudges: CopilotNudge[];
	proactiveAlerts: ProactiveAlertCardData[];
	whatsappHitLCards: WhatsAppApprovalCard[];
	activeTab: "chat" | "pending";
	setActiveTab: (tab: "chat" | "pending") => void;
	toggle: () => void;
	toggleOpen: () => void;
	setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	openDrawer: () => void;
	closeDrawer: () => void;
	send: (text: string) => Promise<void>;
	sendMessage: (text: string) => Promise<void>;
	confirm: (
		callId: string,
		decision: "confirm" | "reject",
		modifiedArgs?: Record<string, unknown> | undefined,
		reason?: string | undefined,
	) => Promise<void>;
	confirmAction: (
		callId: string,
		decision: "confirm" | "reject",
		modifiedArgs?: Record<string, unknown> | undefined,
		reason?: string | undefined,
	) => Promise<void>;
	reset: () => void;
	resetSession: () => void;
	loadNudges: () => Promise<void>;
	dismissNudge: (id: string) => Promise<void>;
	applyNudgeProtocol: (nudge: CopilotNudge) => void;
	loadProactivePending: () => Promise<void>;
	approveWhatsAppCard: (
		approvalId: string,
		modifiedReply?: string,
	) => Promise<void>;
	rejectWhatsAppCard: (
		approvalId: string,
		reason?: string,
	) => Promise<void>;
	dismissProactiveAlert: (alertId: string) => Promise<void>;
}

export type {
	ConfirmUiMessage,
	CopilotNudge,
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	ReactStepItem,
	ReactStepsUiMessage,
	TextUiMessage,
	ToolUiMessage,
	WhatsAppApprovalCard,
};
