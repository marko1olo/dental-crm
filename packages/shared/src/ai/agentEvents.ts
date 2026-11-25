/**
 * @file packages/shared/src/ai/agentEvents.ts
 * @description Master SSOT for Agent Server-Sent Events (SSE) & Streaming Protocol.
 * 
 * Standardized across Web Browser and Desktop Native runtimes.
 * Supports:
 * - Real-time tokens and reasoning (CoT) streaming
 * - Tool execution lifecycle (tool_start, tool_end, confirmation_required)
 * - Auto-compaction notification (compact_triggered)
 * - Autonomous multi-step plan updates (plan_updated, done with TaskPlan)
 * - Error isolation and AbortSignal cancellation (code: 'ABORTED')
 * - Safe parsing with graceful fallback for unknown/future event types
 */

import { z } from "zod";
import { taskPlanSchema, type TaskPlan } from "./taskPlanTracker.js";

// ==============================================================================
// 1. ZOD SCHEMAS FOR RUNTIME VALIDATION
// ==============================================================================

export const agentHarnessEventTokenSchema = z
	.object({
		type: z.literal("token"),
		text: z.string(),
	})
	.strict();

export const agentHarnessEventReasoningSchema = z
	.object({
		type: z.literal("reasoning"),
		text: z.string(),
	})
	.strict();

export const agentHarnessEventToolStartSchema = z
	.object({
		type: z.literal("tool_start"),
		tool: z.string(),
		args: z.record(z.unknown()),
		callId: z.string(),
	})
	.strict();

export const agentHarnessEventToolEndSchema = z
	.object({
		type: z.literal("tool_end"),
		tool: z.string(),
		result: z.unknown().optional(),
		callId: z.string(),
	})
	.strict();

export const agentHarnessEventConfirmationRequiredSchema = z
	.object({
		type: z.literal("confirmation_required"),
		tool: z.string(),
		args: z.record(z.unknown()),
		callId: z.string(),
		descriptionRu: z.string().optional(),
		sessionId: z.string().optional(),
	})
	.strict();

export const agentHarnessEventCompactTriggeredSchema = z
	.object({
		type: z.literal("compact_triggered"),
		tokensBefore: z.number().nonnegative().optional(),
		tokensAfter: z.number().nonnegative().optional(),
		compactedTurnsCount: z.number().int().nonnegative().optional(),
		strategy: z.string().optional(),
		beforeTokens: z.number().nonnegative().optional(),
		afterTokens: z.number().nonnegative().optional(),
		tokensSaved: z.number().nonnegative().optional(),
		prunedToolOutputsCount: z.number().int().nonnegative().optional(),
		compressedMessagesCount: z.number().int().nonnegative().optional(),
		summary: z.string().optional(),
	})
	.strict();

export const agentHarnessEventPlanUpdatedSchema = z
	.object({
		type: z.literal("plan_updated"),
		plan: taskPlanSchema,
	})
	.strict();

export const agentHarnessEventErrorSchema = z
	.object({
		type: z.literal("error"),
		error: z.string(),
		code: z.string().optional(),
	})
	.strict();

export const agentHarnessEventDoneTokenUsageSchema = z
	.object({
		promptTokens: z.number().int().nonnegative(),
		completionTokens: z.number().int().nonnegative(),
		totalTokens: z.number().int().nonnegative(),
		estimatedPromptTokens: z.number().int().nonnegative().optional(),
	})
	.strict();

export const agentHarnessEventDoneSchema = z
	.object({
		type: z.literal("done"),
		text: z.string(),
		toolCallsCount: z.number().int().nonnegative(),
		iterations: z.number().int().nonnegative(),
		plan: taskPlanSchema.optional(),
		totalTokensEstimated: z.number().int().nonnegative().optional(),
		compacted: z.boolean().optional(),
		tokenUsage: agentHarnessEventDoneTokenUsageSchema.optional(),
		sessionId: z.string().optional(),
	})
	.strict();

export const agentHarnessEventSchema = z.discriminatedUnion("type", [
	agentHarnessEventTokenSchema,
	agentHarnessEventReasoningSchema,
	agentHarnessEventToolStartSchema,
	agentHarnessEventToolEndSchema,
	agentHarnessEventConfirmationRequiredSchema,
	agentHarnessEventCompactTriggeredSchema,
	agentHarnessEventPlanUpdatedSchema,
	agentHarnessEventErrorSchema,
	agentHarnessEventDoneSchema,
]);

// ==============================================================================
// 2. INFERRED EVENT TYPES
// ==============================================================================

export type AgentHarnessEventToken = z.infer<typeof agentHarnessEventTokenSchema>;
export type AgentHarnessEventReasoning = z.infer<typeof agentHarnessEventReasoningSchema>;
export type AgentHarnessEventToolStart = z.infer<typeof agentHarnessEventToolStartSchema>;
export type AgentHarnessEventToolEnd = z.infer<typeof agentHarnessEventToolEndSchema>;
export type AgentHarnessEventConfirmationRequired = z.infer<typeof agentHarnessEventConfirmationRequiredSchema>;
export type AgentHarnessEventCompactTriggered = z.infer<typeof agentHarnessEventCompactTriggeredSchema>;
export type AgentHarnessEventPlanUpdated = z.infer<typeof agentHarnessEventPlanUpdatedSchema>;
export type AgentHarnessEventError = z.infer<typeof agentHarnessEventErrorSchema>;
export type AgentHarnessEventDone = z.infer<typeof agentHarnessEventDoneSchema>;

export type AgentHarnessEvent = z.infer<typeof agentHarnessEventSchema>;
export type AgentHarnessEventType = AgentHarnessEvent["type"];

// ==============================================================================
// 3. SSE STREAMING PROTOCOL UTILITIES (FORMAT & PARSE)
// ==============================================================================

/**
 * Formats a typed AgentHarnessEvent into an SSE wire chunk according to W3C EventSource spec:
 * `event: <type>\ndata: <json>\n\n`
 */
export function formatAgentSseEvent(event: AgentHarnessEvent): string {
	return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Safely parses an SSE chunk string into a typed AgentHarnessEvent.
 * If the event type is unknown or the payload is invalid, returns null
 * instead of throwing, ensuring client and server resilience against schema drift.
 */
export function parseAgentSseEvent(chunk: string): AgentHarnessEvent | null {
	if (!chunk || typeof chunk !== "string") return null;

	const trimmed = chunk.trim();
	if (!trimmed) return null;

	let eventType: string | undefined;
	let dataLine: string | undefined;

	const lines = trimmed.split("\n");
	for (const line of lines) {
		const clean = line.trim();
		if (clean.startsWith("event:")) {
			eventType = clean.slice(6).trim();
		} else if (clean.startsWith("data:")) {
			dataLine = clean.slice(5).trim();
		}
	}

	if (!dataLine) {
		// Try parsing direct JSON chunk if not framed as SSE
		try {
			const parsed = JSON.parse(trimmed);
			const validation = agentHarnessEventSchema.safeParse(parsed);
			return validation.success ? validation.data : null;
		} catch {
			return null;
		}
	}

	try {
		const parsedJson: unknown = JSON.parse(dataLine);
		if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
			return null;
		}
		const record = parsedJson as Record<string, unknown>;
		// If payload didn't include type but event header did, backfill
		if (!record.type && eventType) {
			record.type = eventType;
		}
		const validation = agentHarnessEventSchema.safeParse(record);
		return validation.success ? validation.data : null;
	} catch {
		return null;
	}
}

/**
 * Type guard for AgentHarnessEvent
 */
export function isAgentHarnessEvent(obj: unknown): obj is AgentHarnessEvent {
	return agentHarnessEventSchema.safeParse(obj).success;
}
