/**
 * types.ts — Типы состояний, сообщений, тулов и событий клинического ИИ-ассистента DENTE
 */

export type AssistantPhase = "idle" | "thinking" | "working" | "responding" | "error";

export interface AssistantMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	thinkingContent?: string;
	streaming?: boolean;
	timestamp: number;
	toolCalls?: AssistantToolCall[];
	error?: boolean;
}

export interface AssistantToolCall {
	callId: string;
	name: string;
	arguments: Record<string, unknown>;
	status: "pending" | "running" | "done" | "failed" | "confirmation_required";
	result?: unknown;
	destructive?: boolean;
	titleRu: string;
}

export interface CompactionTriggeredData {
	beforeTokens: number;
	afterTokens: number;
	tokensSaved: number;
	summary: string;
}

export interface AssistantEventCallbacks {
	onMessageUpdated?: (message: AssistantMessage) => void;
	onPhaseChanged?: (phase: AssistantPhase) => void;
	onError?: (errorText: string) => void;
	onConfirmationRequired?: (toolCall: AssistantToolCall) => void;
	onCompactTriggered?: (data: CompactionTriggeredData) => void;
}
