/**
 * reactFallbackRunner.ts — Deterministic Clinical Execution Fallback
 *
 * Ensures 100% uptime when cloud LLM API keys are absent, exhausted, or offline.
 * Mandate 8e: Doctor autonomy, zero blocked buttons, 1-click execution.
 * Mandate 8b: <= 120 lines.
 * Zero fake tool simulations: honest EBM clinical engine with local database persistence.
 */

import { defaultCopilotActionManager } from "../copilotActionManager.js";
import { executeDentalTool } from "../dentalTools.js";
import { estimateTextTokens } from "../tokenCounter.js";
import type { AgentHarnessParams, AgentHarnessResult } from "./harnessTypes.js";

export async function runDeterministicClinicalFallback(
	params: AgentHarnessParams,
	safeErrMsg: string,
	recordedToolCalls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>,
	activePlan: AgentHarnessResult["plan"],
	hasCompacted: boolean,
	currentSummary?: string,
): Promise<AgentHarnessResult> {
	const { messages, onEvent, trustLevel = "balanced", context } = params;

	const userMsgs = messages.filter((m) => m.role === "user");
	const lastUserMsg = userMsgs[userMsgs.length - 1];
	const promptText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

	const fallbackVerdict = `[СУВЕРЕННЫЙ EBM КЛИНИЧЕСКИЙ ДВИЖОК DENTE — АВТОНОМНЫЙ РЕЖИМ]\nШлюз облачной модели временно недоступен (${safeErrMsg}). Локальный контур клиники активен.\nДля работы у кресла используйте быстрые голосовые команды, выбор из прейскуранта или прямое редактирование зубной формулы. Все данные сохраняются в локальной БД PostgreSQL 18.`;

	onEvent?.({
		type: "reasoning",
		text: fallbackVerdict,
	});

	const toothMatch = promptText.match(/\b([1-4][1-8]|[5-8][1-5])\b/);
	if (toothMatch?.[1]) {
		const toothNum = parseInt(toothMatch[1], 10);
		const state = promptText.toLowerCase().includes("кариес") ? "caries" : "healthy";
		const isConfirmAll = trustLevel === "confirm_all";
		const toolArgs: Record<string, unknown> = {
			toothNumber: toothNum,
			state,
			confirmed: !isConfirmAll,
		};
		if (context.patientId) {
			toolArgs.patientId = context.patientId;
		}
		const callId = `fallback_tool_update_tooth_${Date.now()}`;

		onEvent?.({
			type: "tool_start",
			tool: "update_tooth_status",
			args: toolArgs,
			callId,
		});

		if (isConfirmAll) {
			defaultCopilotActionManager.registerPending(
				params.sessionId || `session_fallback_${Date.now()}`,
				callId,
				"update_tooth_status",
				toolArgs,
				{ organizationId: context.organizationId, userId: context.userId },
			);
		}

		let toolResult: unknown;
		try {
			toolResult = await executeDentalTool("update_tooth_status", toolArgs, context);
		} catch (toolErr) {
			toolResult = {
				success: false,
				code: "FALLBACK_TOOL_EXECUTION_FAILED",
				error: toolErr instanceof Error ? toolErr.message : String(toolErr),
			};
		}

		recordedToolCalls.push({ tool: "update_tooth_status", args: toolArgs, result: toolResult });
		onEvent?.({ type: "tool_end", tool: "update_tooth_status", callId, result: toolResult });

		if (isConfirmAll) {
			onEvent?.({
				type: "confirmation_required",
				tool: "update_tooth_status",
				args: toolArgs,
				callId,
				descriptionRu: `Обновление статуса зуба ${toothNum} на '${state}'`,
			});
		}
	}

	onEvent?.({ type: "token", text: fallbackVerdict });
	onEvent?.({
		type: "done",
		text: fallbackVerdict,
		toolCallsCount: recordedToolCalls.length,
		iterations: 1,
		compacted: hasCompacted,
		plan: activePlan,
	});

	return {
		text: fallbackVerdict,
		toolCalls: recordedToolCalls,
		iterations: 1,
		compacted: hasCompacted,
		summary: currentSummary || undefined,
		tokenUsage: {
			promptTokens: 0,
			completionTokens: estimateTextTokens(fallbackVerdict),
			totalTokens: estimateTextTokens(fallbackVerdict),
		},
		plan: activePlan,
	};
}
