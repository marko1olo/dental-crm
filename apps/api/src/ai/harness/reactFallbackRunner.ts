/**
 * reactFallbackRunner.ts — Deterministic ReAct Clinical Execution Fallback
 *
 * Ensures 100% uptime when cloud LLM API keys are absent, exhausted, or offline.
 * Mandate 8e: Doctor autonomy, zero blocked buttons, 1-click execution.
 * Mandate 8b: <= 120 lines.
 */

import { estimateTextTokens } from "../tokenCounter.js";
import type { AgentHarnessParams, AgentHarnessResult } from "./harnessTypes.js";
import { executeAutonomousReActCycle } from "../../services/agent/autonomousDenteAgentModules/denteAgentExecution.js";
import {
	parseClinicalPromptAndContext,
	type AutonomousDenteAgentInput,
} from "../../services/agent/autonomousDenteAgentModules/denteAgentParser.js";

export async function runDeterministicClinicalFallback(
	params: AgentHarnessParams,
	safeErrMsg: string,
	recordedToolCalls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>,
	activePlan: AgentHarnessResult["plan"],
	hasCompacted: boolean,
	currentSummary?: string,
): Promise<AgentHarnessResult> {
	const { messages, context, onEvent, maxIterations = 5, trustLevel = "balanced" } = params;

	const userMsgs = messages.filter((m) => m.role === "user");
	const lastUserMsg = userMsgs[userMsgs.length - 1];
	const promptText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

	onEvent?.({
		type: "reasoning",
		text: `[СУВЕРЕННЫЙ EBM КЛИНИЧЕСКИЙ ДВИЖОК DENTE]\nШлюз облачной модели недоступен (${safeErrMsg}). Активирован локальный ReAct цикл клинического приёма.`,
	});

	const autoInput: AutonomousDenteAgentInput = {
		patientId: context.patientId,
		prompt: promptText,
		toothNumber: params.activeTooth ?? undefined,
		organizationId: context.organizationId,
		userId: context.doctorId,
		mode: trustLevel === "autonomous" ? "autonomous" : "supervised",
	};
	const parsed = parseClinicalPromptAndContext(autoInput);
	const reactResult = await executeAutonomousReActCycle(autoInput, parsed, maxIterations);

	for (const step of reactResult.steps) {
		onEvent?.({
			type: "reasoning",
			text: step.thought,
		});
		const stepCallId = `fallback_step_${step.iteration}_${step.action.tool}`;
		onEvent?.({
			type: "tool_start",
			tool: step.action.tool,
			args: (step.action.args as Record<string, unknown>) ?? {},
			callId: stepCallId,
		});
		recordedToolCalls.push({
			tool: step.action.tool,
			args: step.action.args,
			result: step.observation,
		});
		onEvent?.({
			type: "tool_end",
			tool: step.action.tool,
			callId: stepCallId,
			result: step.observation,
		});
	}

	for (const action of reactResult.actions) {
		const needsConfirm = trustLevel === "confirm_all" ? true : trustLevel === "autonomous" ? false : true;
		if (needsConfirm) {
			onEvent?.({
				type: "confirmation_required",
				tool: action.type,
				args: (action.payload as Record<string, unknown>) ?? {},
				descriptionRu: action.description,
				callId: action.id,
			});
		}
	}

	const finalResponseText = reactResult.verdict;
	onEvent?.({
		type: "token",
		text: finalResponseText,
	});
	onEvent?.({
		type: "done",
		text: finalResponseText,
		toolCallsCount: recordedToolCalls.length,
		iterations: reactResult.steps.length,
		compacted: hasCompacted,
		plan: activePlan,
	});

	return {
		text: finalResponseText,
		toolCalls: recordedToolCalls,
		iterations: reactResult.steps.length,
		compacted: hasCompacted,
		summary: currentSummary || undefined,
		tokenUsage: {
			promptTokens: 0,
			completionTokens: estimateTextTokens(finalResponseText),
			totalTokens: estimateTextTokens(finalResponseText),
		},
		plan: activePlan,
	};
}
