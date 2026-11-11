/**
 * reactFallbackRunner.ts — Deterministic Clinical Execution Fallback
 *
 * Ensures 100% uptime when cloud LLM API keys are absent, exhausted, or offline.
 * Mandate 8e: Doctor autonomy, zero blocked buttons, 1-click execution.
 * Mandate 8b: <= 120 lines.
 * Zero fake tool simulations: honest provider error reporting with BYOK prompt.
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
	const { onEvent } = params;

	const fallbackVerdict = `[ШЛЮЗ ИИ ВРЕМЕННО НЕДОСТУПЕН]\nОшибка провайдера модели: ${safeErrMsg}.\nОблачный шлюз модели исчерпал квоту либо ключ отсутствует. Для продолжения работы с расширенным интеллектом укажите локальный BYOK ключ (OpenAI, Google Gemini или Groq) в настройках копайлота либо используйте ручной ввод в зубную формулу и прейскурант. Локальный контур клиники и база PostgreSQL 18 работают в штатном режиме.`;

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
