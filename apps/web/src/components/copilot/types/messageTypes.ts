export interface TextUiMessage {
	id?: string | undefined;
	kind: "text";
	role: "user" | "assistant";
	text: string;
	timestamp?: string | undefined;
	streaming?: boolean | undefined;
	toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }> | undefined;
}

export interface ToolUiMessage {
	kind: "tool";
	callId: string;
	name: string;
	status: "running" | "done" | "failed" | "error" | "confirmation_required";
	args?: Record<string, unknown> | undefined;
	result?: unknown;
	durationMs?: number | undefined;
	error?: string | undefined;
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
	toolName?: string | undefined;
	args: Record<string, unknown>;
}

export type CopilotPhase = "thinking" | "working" | "writing" | null;

export type ConfirmHandler = (
	callId: string,
	action: "confirm" | "reject",
	modifiedArgs?: Record<string, unknown> | undefined,
	reason?: string | undefined,
) => void;

export interface CopilotActionProposal {
	id: string;
	toolName: string;
	description: string;
	payload: Record<string, unknown>;
}

export interface DesktopHostWindow extends Window {
	electron?: unknown;
	__TAURI__?: unknown;
}

export function parseActionProposal(val: unknown): CopilotActionProposal | undefined {
	if (typeof val === "object" && val !== null && "id" in val && "toolName" in val) {
		const rec = val as { id: unknown; toolName: unknown; description?: unknown; payload?: unknown };
		return {
			id: String(rec.id),
			toolName: String(rec.toolName),
			description: typeof rec.description === "string" ? rec.description : "",
			payload: typeof rec.payload === "object" && rec.payload !== null ? (rec.payload as Record<string, unknown>) : {},
		};
	}
	return undefined;
}

export function parseJsonResponse(raw: unknown): { ok?: boolean | undefined; error?: string | undefined } {
	if (typeof raw === "object" && raw !== null) {
		const r = raw as Record<string, unknown>;
		const res: { ok?: boolean | undefined; error?: string | undefined } = {};
		if (typeof r.ok === "boolean") res.ok = r.ok;
		if (typeof r.error === "string") res.error = r.error;
		return res;
	}
	return {};
}

