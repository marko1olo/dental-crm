export interface TextUiMessage {
	kind: "text";
	role: "user" | "assistant";
	text: string;
	streaming?: boolean | undefined;
}

export interface ToolUiMessage {
	kind: "tool";
	callId: string;
	name: string;
	status: "running" | "done" | "failed";
	args?: Record<string, unknown> | undefined;
	result?: unknown;
}

export interface ConfirmUiMessage {
	kind: "confirmation";
	callId: string;
	name: string;
	args: Record<string, unknown>;
	resolved?: ("confirm" | "reject") | undefined;
}

export interface ThinkingUiMessage {
	kind: "thinking";
	text: string;
	streaming?: boolean | undefined;
	durationMs?: number | undefined;
}

export interface ReactStepItem {
	id: string;
	stepNumber: number;
	title: string;
	status: "pending" | "running" | "done" | "failed";
	detail?: string | undefined;
	icon?: string | undefined;
}

export interface ReactStepsUiMessage {
	kind: "react_steps";
	title?: string | undefined;
	steps: ReactStepItem[];
	currentStepIndex?: number | undefined;
	isComplete?: boolean | undefined;
	totalDurationMs?: number | undefined;
}

export type CopilotUiMessage =
	| TextUiMessage
	| ToolUiMessage
	| ConfirmUiMessage
	| ThinkingUiMessage
	| ReactStepsUiMessage;

export interface PendingConfirmation {
	callId: string;
	name: string;
	args: Record<string, unknown>;
}

export type CopilotPhase = "thinking" | "working" | "writing" | null;

export type ConfirmHandler = (
	callId: string,
	action: "confirm" | "reject",
	modifiedArgs?: Record<string, unknown> | undefined,
	reason?: string | undefined,
) => void;
