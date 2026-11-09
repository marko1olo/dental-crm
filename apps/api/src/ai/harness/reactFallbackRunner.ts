/**
 * reactFallbackRunner.ts — Deterministic Clinical Execution Fallback
 *
 * Ensures 100% uptime when cloud LLM API keys are absent, exhausted, or offline.
 * Mandate 8e: Doctor autonomy, zero blocked buttons, 1-click execution.
 * Mandate 8b: <= 120 lines.
 */

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
	const { messages, onEvent } = params;

	const userMsgs = messages.filter((m) => m.role === "user");
	const lastUserMsg = userMsgs[userMsgs.length - 1];
	const promptText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

	const fallbackVerdict = `[АВТОНОМНЫЙ КЛИНИЧЕСКИЙ РЕЖИМ DENTE]\nШлюз облачной модели временно недоступен (${safeErrMsg}). Локальный контур клиники активен.\nДля работы у кресла используйте быстрые голосовые команды, выбор из прейскуранта или прямое редактирование зубной формулы. Все данные сохраняются в локальной БД PostgreSQL 18.`;

	onEvent?.({
		type: "reasoning",
		text: fallbackVerdict,
	});

	onEvent?.({
		type: "token",
		text: fallbackVerdict,
	});

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
