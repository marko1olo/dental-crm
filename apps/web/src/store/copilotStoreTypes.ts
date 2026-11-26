/**
 * @file copilotStoreTypes.ts
 * @description Type definitions for DENTE AI Copilot Store (Mandate 8b <= 150 lines).
 */

import type { ContextTelemetryData } from "../components/copilot/telemetry/telemetryTypes";

export type AiTrustLevel = "confirm_all" | "balanced" | "autonomous";
export type AiProvider = "gemini" | "openai" | "anthropic" | "deepseek" | "custom" | "groq";
export type AiSpeedMode = "turbo" | "deep_reasoning";
export type ModelRoutingMode = "server_managed" | "custom_byok";
export type ClinicalSpecialization = "therapy" | "orthopedics" | "surgery" | "orthodontics" | "perio" | "pediatric";
export type DiaryTemplate = "soap" | "treatment_diary" | "clinical_protocol" | "express";
export type CopilotRuntimeEnvironment = "web_browser" | "desktop_native" | "chairside_tablet" | "mobile_tablet";
export type WebSpeechSensitivity = "high" | "normal" | "low";
export type SpeechEngine = "gemini_live" | "whisper" | "web_speech";

export interface GranularAgentPermissions {
	autoApproveFileReads: boolean;
	autoApproveFileWrites: boolean;
	autoApproveClinicalMutations: boolean;
	autoApproveFinancialDrafts: boolean;
	autoApproveExternalSoftware: boolean;
}

export interface AiMemoryFact {
	id: string;
	category: "materials" | "anesthesia" | "protocols" | "equipment" | "diagnosis" | "custom";
	fact: string;
	createdAt: string;
}

export interface CopilotThread {
	id: string; title: string; updatedAt: string; messageCount: number;
	createdAt?: string | undefined; pinned?: boolean | undefined;
	patientName?: string | undefined; patientId?: string | undefined; previewText?: string | undefined;
}

export interface ToolExecutionLog {
	id: string; toolName: string; category: "clinical" | "workstation" | "financial";
	status: "success" | "pending" | "running" | "rejected"; durationMs?: number | undefined;
	args: Record<string, unknown>; resultSummary: string; timestamp: string;
}

export type CopilotToolExecutionLog = ToolExecutionLog;

export interface CopilotMessage {
	id?: string | undefined; role: "user" | "assistant" | "system"; text?: string | undefined; content?: string | undefined;
	timestamp?: string | undefined; createdAt?: string | undefined; toolCalls?: unknown; actionProposal?: unknown;
}

export interface ActiveDiff {
	id: string; callId?: string | undefined; title: string; targetEntity: string; beforeText: string; afterText: string; applied?: boolean | undefined;
}

export type CopilotActiveDiff = ActiveDiff;

export interface CopilotUnconfirmedDraft {
	patientId?: string | undefined;
	toothUpdates?: Array<{ toothNumber: number; status: string; surfaces?: string[] | undefined }> | undefined;
	soapPatch?: Record<string, string> | undefined;
	billingServices?: Array<{
		code: string;
		code804n?: string | undefined;
		name: string;
		title: string;
		price: number;
		priceRub: number;
		priceKopecks?: number | undefined;
		toothNumber?: number | undefined;
		toothCode?: string | undefined;
	}> | undefined;
	timestamp: string;
}

export interface CopilotSettings {
	trustLevel: AiTrustLevel; provider: AiProvider; model: string;
	modelRoutingMode: ModelRoutingMode; byokProvider: AiProvider; byokApiKey: string;
	byokModel: string; byokBaseUrl?: string | undefined; speedMode: AiSpeedMode;
	showThinkingProcess: boolean; showTypingAnimation?: boolean | undefined;
	clinicalSpecialization: ClinicalSpecialization; diaryTemplate: DiaryTemplate;
	customDoctorInstructions: string; granularPermissions: GranularAgentPermissions;
	temperature: number; contextLimitTokens?: number | undefined; runtimeMode: CopilotRuntimeEnvironment;
	speechEngine?: SpeechEngine | undefined; autoSaveDrafts: boolean; webSpeechSensitivity: WebSpeechSensitivity;
	maskPhiData: boolean; apiKeyMasked?: string | undefined; globalDictationHotkey: string;
	autoMicOnAppointmentOpen: boolean; localDropzonePath: string; gloveModeTouchTarget: boolean;
	screenWakeLock: boolean; hapticFeedbackEnabled: boolean;
	pinnedThreadIds?: string[] | undefined;
}

export interface CopilotStoreState {
	settings: CopilotSettings; memoryFacts: AiMemoryFact[]; threads: CopilotThread[];
	activeThreadId: string; threadSearchQuery: string; toolExecutionLogs: ToolExecutionLog[];
	activeDiff: ActiveDiff | null; threadMessages: Record<string, CopilotMessage[]>;
	isSettingsOpen: boolean; isHistoryOpen: boolean; isStudioOpen: boolean;
	isHudOpen: boolean;
	telemetry: ContextTelemetryData;

	// Actions
	updateSettings: (patch: Partial<CopilotSettings>) => void;
	setTrustLevel: (level: AiTrustLevel) => void;
	setRuntimeMode: (mode: CopilotRuntimeEnvironment) => void;
	refreshRuntimeEnvironment: () => CopilotRuntimeEnvironment;
	updateTelemetry: (patch: Partial<ContextTelemetryData>) => void;
	addMemoryFact: (category: AiMemoryFact["category"], fact: string) => void;
	updateMemoryFact: (id: string, fact: string, category?: AiMemoryFact["category"]) => void;
	removeMemoryFact: (id: string) => void;
	clearMemory: () => void;
	createThread: (patientName?: string, title?: string, patientId?: string) => string;
	selectThread: (id: string) => void;
	deleteThread: (id: string) => void;
	clearThreads: () => void;
	togglePinThread: (id: string) => void;
	renameThread: (id: string, title: string) => void;
	setThreadSearchQuery: (query: string) => void;
	saveThreadMessages: (threadId: string, messages: CopilotMessage[]) => void;
	hydrateSessionsFromBackend: () => Promise<void>;
	loadRemoteSettings: () => Promise<void>;
	loadThreadMessages: (threadId: string) => Promise<CopilotMessage[]>;
	addToolLog: (log: Omit<ToolExecutionLog, "id" | "timestamp">) => void;
	setActiveDiff: (diff: ActiveDiff | null) => void;
	applyActiveDiff: () => Promise<boolean>;
	rejectActiveDiff: () => void;
	setSettingsOpen: (open: boolean) => void;
	setHistoryOpen: (open: boolean) => void;
	setIsStudioOpen: (open: boolean) => void;
	setStudioOpen: (open: boolean) => void;
	setIsHudOpen: (open: boolean) => void;
	setHudOpen: (open: boolean) => void;
	expandToStudio: () => void;
	collapseToHud: () => void;
	unconfirmedDraft: CopilotUnconfirmedDraft | null;
	setUnconfirmedDraft: (draft: CopilotUnconfirmedDraft | null) => void;
	savePendingDictationDraft: (patch: Partial<CopilotUnconfirmedDraft>) => void;
	clearUnconfirmedDraft: () => void;
}
