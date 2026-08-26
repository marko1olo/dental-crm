/**
 * types.ts — Core types for the Agentic Core & PHI Redaction Ingestor.
 */

export type Role = "system" | "user" | "assistant" | "tool";

export interface TextBlock {
	readonly type: "text";
	readonly text: string;
}

export interface ToolUseBlock {
	readonly type: "tool_use";
	readonly id: string;
	readonly name: string;
	readonly input: Record<string, unknown>;
}

export interface ToolResultBlock {
	readonly type: "tool_result";
	readonly toolCallId: string;
	readonly content: unknown;
	readonly isError?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface ProviderMessage {
	readonly role: Role;
	readonly content: ContentBlock[] | string;
}

export interface TextDelta {
	readonly type: "text_delta";
	readonly text: string;
}

export interface ToolUse {
	readonly type: "tool_use";
	readonly id: string;
	readonly name: string;
	readonly input: Record<string, unknown>;
}

export interface Usage {
	readonly type: "usage";
	readonly inputTokens: number;
	readonly outputTokens: number;
}

export interface Done {
	readonly type: "done";
	readonly stopReason: string;
}

export type LLMStreamEvent = TextDelta | ToolUse | Usage | Done;

export interface TokenEvent {
	readonly type: "token";
	readonly text: string;
}

export interface ToolCallStartedEvent {
	readonly type: "tool_call_started";
	readonly callId: string;
	readonly name: string;
	readonly arguments: Record<string, unknown>;
}

export interface ToolCallFinishedEvent {
	readonly type: "tool_call_finished";
	readonly callId: string;
	readonly name: string;
	readonly ok: boolean;
	readonly result: unknown;
}

export interface ConfirmationRequiredEvent {
	readonly type: "confirmation_required";
	readonly callId: string;
	readonly name: string;
	readonly arguments: Record<string, unknown>;
}

export interface TurnUsageEvent {
	readonly type: "usage";
	readonly inputTokens: number;
	readonly outputTokens: number;
}

export interface FinalEvent {
	readonly type: "final";
	readonly stopReason: string;
}

export interface BudgetExceededEvent {
	readonly type: "budget_exceeded";
}

export type TurnEvent =
	| TokenEvent
	| ToolCallStartedEvent
	| ToolCallFinishedEvent
	| ConfirmationRequiredEvent
	| TurnUsageEvent
	| FinalEvent
	| BudgetExceededEvent;

export interface BudgetGuard {
	check(): boolean;
	record(inputTokens: number, outputTokens: number): void;
}

export interface LLMProvider {
	complete(params: {
		system: string;
		messages: ProviderMessage[];
		tools?: Record<string, unknown>[];
		model?: string;
		maxTokens?: number;
		temperature?: number;
	}): AsyncIterable<LLMStreamEvent>;
}
