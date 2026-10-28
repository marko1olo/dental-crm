/**
 * harnessTypes.ts — Event and parameter definitions for Autonomous Clinical Dental Agent Harness
 */

import type { TaskPlan } from "@dental/shared";
import type {
	AgentRouterChatMessage,
	AgentRouterClient,
} from "../agentRouterClient.js";
import type {
	AgentRuntimeMode,
	DentalToolContext,
} from "../dentalTools.js";

export const MAX_REACT_ITERATIONS = 6;

export interface AgentHarnessEventToken {
	type: "token";
	text: string;
}

export interface AgentHarnessEventReasoning {
	type: "reasoning";
	text: string;
}

export interface AgentHarnessEventToolStart {
	type: "tool_start";
	tool: string;
	args: Record<string, unknown>;
	callId: string;
}

export interface AgentHarnessEventToolEnd {
	type: "tool_end";
	tool: string;
	result: unknown;
	callId: string;
}

export interface AgentHarnessEventConfirmationRequired {
	type: "confirmation_required";
	tool: string;
	args: Record<string, unknown>;
	callId: string;
	descriptionRu?: string;
}

export interface AgentHarnessEventCompactTriggered {
	type: "compact_triggered";
	beforeTokens: number;
	afterTokens: number;
	tokensSaved: number;
	prunedToolOutputsCount: number;
	compressedMessagesCount: number;
	summary: string;
}

export interface AgentHarnessEventPlanUpdated {
	type: "plan_updated";
	plan: TaskPlan;
}

export interface AgentHarnessEventDone {
	type: "done";
	text: string;
	toolCallsCount: number;
	iterations: number;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		estimatedPromptTokens?: number | undefined;
	} | undefined;
	compacted?: boolean | undefined;
	plan?: TaskPlan | undefined;
}

export interface AgentHarnessEventError {
	type: "error";
	error: string;
	code?: string;
}

export type AgentHarnessEvent =
	| AgentHarnessEventToken
	| AgentHarnessEventReasoning
	| AgentHarnessEventToolStart
	| AgentHarnessEventToolEnd
	| AgentHarnessEventConfirmationRequired
	| AgentHarnessEventCompactTriggered
	| AgentHarnessEventPlanUpdated
	| AgentHarnessEventDone
	| AgentHarnessEventError;

export interface AgentHarnessParams {
	messages: AgentRouterChatMessage[];
	context: DentalToolContext;
	runtimeMode?: AgentRuntimeMode | undefined;
	client?: AgentRouterClient | undefined;
	maxIterations?: number | undefined;
	stream?: boolean | undefined;
	requireConfirmationForDestructive?: boolean | undefined;
	onEvent?: ((event: AgentHarnessEvent) => void | Promise<void>) | undefined;
	signal?: AbortSignal | undefined;
	// Auto-compaction & Sliding window options
	enableAutoCompaction?: boolean | undefined;
	compactThresholdTokens?: number | undefined;
	slidingWindowRetainedTurns?: number | undefined;
	initialSummary?: string | undefined;
	initialPlan?: TaskPlan | undefined;
	// Multi-agent swarm role
	swarmRole?: "orchestrator" | "triage" | "odontogram_inquisitor" | "billing_sentinel" | "vision_specialist" | undefined;
}

export interface AgentHarnessResult {
	text: string;
	toolCalls: Array<{
		tool: string;
		args: Record<string, unknown>;
		result: unknown;
	}>;
	iterations: number;
	aborted?: boolean | undefined;
	compacted?: boolean | undefined;
	summary?: string | undefined;
	plan?: TaskPlan | undefined;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		estimatedPromptTokens?: number | undefined;
	} | undefined;
}
