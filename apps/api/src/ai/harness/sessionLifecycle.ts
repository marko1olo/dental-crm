/**
 * sessionLifecycle.ts — ReAct Loop Runner and Agent Session Lifecycle
 */

import { type TaskPlan, sanitizeClinicalAiOutput, stripReasoning } from "@dental/shared";
import {
	type AgentRouterChatMessage,
	type AgentRouterChatResponse,
	agentRouterClient,
	maskApiKey,
	maskKeysInText,
	AgentRouterAllKeysExhaustedError,
	AgentRouterModelOverloadedError,
	DEFAULT_CHAIRSIDE_TIMEOUT_MS,
	DEFAULT_TIMEOUT_MS,
} from "../agentRouterClient.js";
import {
	type DentalToolContext,
	getDentalTools,
	isDestructiveDentalTool,
} from "../dentalTools.js";
import {
	compactConversationHistory,
	shouldCompactContext,
	type TokenCompactorOptions,
} from "../contextCompactor.js";
import {
	estimateConversationTokens,
	estimateTextTokens,
} from "../tokenCounter.js";
import {
	type AgentHarnessParams,
	type AgentHarnessResult,
	MAX_REACT_ITERATIONS,
} from "./harnessTypes.js";
import { buildAgentSystemPrompt } from "./systemPromptBuilder.js";
import { ToolDispatcher } from "./toolDispatcher.js";
import { runDeterministicClinicalFallback } from "./reactFallbackRunner.js";
import { routeClinicalTask } from "../clinicalModelRouter.js";

/**
 * Robustly matches all model overload, key exhaustion, rate limit, quota,
 * or network errors to trigger seamless deterministic clinical fallback (<100ms).
 */
export function isCloudLlmFailoverError(turnErr: unknown): boolean {
	if (!turnErr) return false;
	if (
		turnErr instanceof AgentRouterAllKeysExhaustedError ||
		turnErr instanceof AgentRouterModelOverloadedError
	) {
		return true;
	}
	const errName = (turnErr as { name?: string })?.name || "";
	if (
		errName === "AgentRouterAllKeysExhaustedError" ||
		errName === "AgentRouterModelOverloadedError"
	) {
		return true;
	}
	const msg = (turnErr instanceof Error ? turnErr.message : String(turnErr)).toLowerCase();
	return (
		msg.includes("agentrouterallkeysexhaustederror") ||
		msg.includes("agentroutermodeloverloadederror") ||
		msg.includes("exhausted all keys") ||
		msg.includes("all agentrouter api keys are currently cooling down") ||
		msg.includes("failed to select agentrouter api key") ||
		msg.includes("model is currently in 402") ||
		msg.includes("budget pool") ||
		msg.includes("quota") ||
		msg.includes("rate limit") ||
		msg.includes("ratelimit") ||
		/429|402|503|502|504|server error|auth error|401|403|unauthorized|forbidden|invalid api key|enotfound|econnrefused|etimedout|fetch failed|network|timed out|timeout|исчерпали лимиты|все 0 ключей/i.test(msg)
	);
}

/**
 * Runs the autonomous ReAct execution loop for the clinical dental assistant.
 */
export async function runAgentHarness(
	params: AgentHarnessParams,
): Promise<AgentHarnessResult> {
	const {
		messages,
		context,
		runtimeMode = context.runtimeMode || "web_browser",
		client = agentRouterClient,
		maxIterations = MAX_REACT_ITERATIONS,
		onEvent,
		signal,
		initialPlan,
		swarmRole,
	} = params;

	let activePlan: TaskPlan | undefined = initialPlan;

	const effectiveActiveTooth =
		params.activeTooth !== undefined
			? (params.activeTooth ?? undefined)
			: context.activeTooth !== undefined
				? (context.activeTooth ?? undefined)
				: undefined;

	const effectiveToolContext: DentalToolContext = {
		...context,
		runtimeMode,
		activeTooth: effectiveActiveTooth,
	};

	const tools = getDentalTools(runtimeMode);
	const normalizedTrustLevel: "confirm_all" | "balanced" | "autonomous" | undefined =
		params.trustLevel === "autonomous"
			? "autonomous"
			: params.trustLevel === "confirm_all" || params.trustLevel === "supervised" || params.trustLevel === "cautious"
				? "confirm_all"
				: params.trustLevel === "balanced"
					? "balanced"
					: undefined;

	const systemPrompt = buildAgentSystemPrompt(
		runtimeMode,
		effectiveToolContext,
		activePlan,
		swarmRole,
		params.customInstructions,
		params.memoryFacts,
		params.doctorSpecialization,
		effectiveActiveTooth,
		effectiveToolContext.activeVisitId,
		messages,
		normalizedTrustLevel,
	);

	// Working history for this ReAct execution turn
	let history: AgentRouterChatMessage[] = [
		{ role: "system", content: systemPrompt },
		...messages,
	];

	let hasCompacted = false;
	let currentSummary = params.initialSummary || "";
	let lastRecordedUsage: AgentHarnessResult["tokenUsage"] | undefined;

	const compactorOptions: TokenCompactorOptions = {
		...(params.contextLimitTokens !== undefined || params.compactThresholdTokens !== undefined
			? { thresholdTokens: params.contextLimitTokens ?? params.compactThresholdTokens }
			: {}),
		...(params.slidingWindowRetainedTurns !== undefined
			? { retainedRecentTurns: params.slidingWindowRetainedTurns }
			: {}),
		previousSummary: currentSummary,
	};

	// Level 1 + Level 2 initial check: compact before the first inference turn if dialogue exceeds threshold
	if (
		params.enableAutoCompaction !== false &&
		shouldCompactContext(history, compactorOptions)
	) {
		const compactResult = compactConversationHistory(history, compactorOptions);
		if (compactResult.compacted) {
			hasCompacted = true;
			currentSummary = compactResult.summary;
			history = compactResult.compactedMessages as AgentRouterChatMessage[];

			onEvent?.({
				type: "compact_triggered",
				beforeTokens: compactResult.beforeTokens,
				afterTokens: compactResult.afterTokens,
				tokensSaved: compactResult.tokensSaved,
				prunedToolOutputsCount: compactResult.prunedToolOutputsCount,
				compressedMessagesCount: compactResult.compressedMessagesCount,
				summary: compactResult.summary,
			});
		}
	}

	const toolDispatcher = new ToolDispatcher(
		effectiveToolContext,
		Boolean(params.requireConfirmationForDestructive),
		onEvent,
		params.trustLevel || "balanced",
		params.granularPermissions,
	);

	const recordedToolCalls: Array<{
		tool: string;
		args: Record<string, unknown>;
		result: unknown;
	}> = [];

	let iteration = 0;
	let finalResponseText = "";

	while (iteration < maxIterations) {
		if (signal?.aborted) {
			onEvent?.({
				type: "error",
				error: "Запрос был прерван клиентом (Connection aborted)",
				code: "ABORTED",
			});
			return {
				text: finalResponseText,
				toolCalls: recordedToolCalls,
				iterations: iteration,
				aborted: true,
				compacted: hasCompacted,
				summary: currentSummary || undefined,
				tokenUsage: lastRecordedUsage,
			};
		}

		iteration++;

		// Mid-execution compaction check if tool outputs swelled context during multi-step ReAct
		if (params.enableAutoCompaction !== false && iteration > 1) {
			const midCompactorOpts: TokenCompactorOptions = {
				...(params.contextLimitTokens !== undefined || params.compactThresholdTokens !== undefined
					? { thresholdTokens: params.contextLimitTokens ?? params.compactThresholdTokens }
					: {}),
				...(params.slidingWindowRetainedTurns !== undefined
					? { retainedRecentTurns: params.slidingWindowRetainedTurns }
					: {}),
				previousSummary: currentSummary,
			};

			if (shouldCompactContext(history, midCompactorOpts)) {
				const compactResult = compactConversationHistory(
					history,
					midCompactorOpts,
				);
				if (compactResult.compacted) {
					hasCompacted = true;
					currentSummary = compactResult.summary;
					history = compactResult.compactedMessages as AgentRouterChatMessage[];

					onEvent?.({
						type: "compact_triggered",
						beforeTokens: compactResult.beforeTokens,
						afterTokens: compactResult.afterTokens,
						tokensSaved: compactResult.tokensSaved,
						prunedToolOutputsCount: compactResult.prunedToolOutputsCount,
						compressedMessagesCount: compactResult.compressedMessagesCount,
						summary: compactResult.summary,
					});
				}
			}
		}

		try {
			const routing = routeClinicalTask({
				messages,
				speedMode: params.speedMode,
				doctorSpecialization: params.doctorSpecialization,
				modelRoutingMode: params.modelRoutingMode,
				byokProvider: params.byokProvider,
				byokApiKey: params.byokApiKey,
				byokModel: params.byokModel,
			});

			const isStreamingRequested =
				params.stream !== false &&
				typeof client.createStreamingChatCompletion === "function";

			const effectiveTimeoutMs =
				params.timeoutMs ??
				(routing.tier === "chairside_fast"
					? DEFAULT_CHAIRSIDE_TIMEOUT_MS
					: DEFAULT_TIMEOUT_MS);

			let completion: AgentRouterChatResponse;
			let streamEmittedTokens = false;

			if (isStreamingRequested) {
				completion = await client.createStreamingChatCompletion(
					{
						messages: history,
						model: routing.model,
						apiKey: routing.apiKey,
						baseUrl: routing.baseUrl,
						tools,
						tool_choice: "auto",
						temperature: params.temperature ?? 0.2,
						signal,
						timeoutMs: effectiveTimeoutMs,
					},
					{
						onChunk: (chunk) => {
							streamEmittedTokens = true;
							onEvent?.({ type: "token", text: chunk });
						},
						onReasoningChunk: (reasoningChunk) => {
							onEvent?.({ type: "reasoning", text: reasoningChunk });
						},
					},
				);
			} else {
				completion = await client.createChatCompletion({
					messages: history,
					model: routing.model,
					apiKey: routing.apiKey,
					baseUrl: routing.baseUrl,
					tools,
					tool_choice: "auto",
					temperature: params.temperature ?? 0.2,
					signal,
					timeoutMs: effectiveTimeoutMs,
				});

				const reasoning = completion.choices[0]?.message?.reasoning_content;
				if (reasoning) {
					onEvent?.({ type: "reasoning", text: reasoning });
				}
			}

			const choice = completion.choices[0];
			if (!choice?.message) {
				throw new Error("AgentRouter returned an empty choices array.");
			}

			if (completion.usage) {
				lastRecordedUsage = {
					promptTokens: completion.usage.prompt_tokens,
					completionTokens: completion.usage.completion_tokens,
					totalTokens: completion.usage.total_tokens,
					estimatedPromptTokens: estimateConversationTokens(history),
				};
			} else {
				const est = estimateConversationTokens(history);
				const compEst = estimateTextTokens(choice.message.content || "");
				lastRecordedUsage = {
					promptTokens: est,
					completionTokens: compEst,
					totalTokens: est + compEst,
					estimatedPromptTokens: est,
				};
			}

			const message = choice.message;
			const toolCalls = message.tool_calls;
			const content = message.content;

			// CASE 1: Model returned text without tool calls -> Final Answer reached
			if (!toolCalls || toolCalls.length === 0) {
				const rawContent = content || "";
				finalResponseText = sanitizeClinicalAiOutput(stripReasoning(rawContent));
				if (finalResponseText && !streamEmittedTokens) {
					onEvent?.({ type: "token", text: finalResponseText });
				}
				onEvent?.({
					type: "done",
					text: finalResponseText,
					toolCallsCount: recordedToolCalls.length,
					iterations: iteration,
					tokenUsage: lastRecordedUsage,
					compacted: hasCompacted,
					plan: activePlan,
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
					compacted: hasCompacted,
					summary: currentSummary || undefined,
					tokenUsage: lastRecordedUsage,
					plan: activePlan,
				};
			}

			// CASE 2: Model returned tool_calls -> Execute tools in ReAct loop
			history.push({
				role: "assistant",
				content: content || null,
				tool_calls: toolCalls,
			});

			if (content && !streamEmittedTokens) {
				onEvent?.({ type: "token", text: content });
			}

			for (const call of toolCalls) {
				const dispatch = await toolDispatcher.dispatchToolCall(call, activePlan);
				activePlan = dispatch.activePlan;

				recordedToolCalls.push({
					tool: dispatch.toolName,
					args: dispatch.parsedArgs,
					result: dispatch.result,
				});

				// Append tool execution result message for model's next turn
				history.push({
					role: "tool",
					tool_call_id: call.id,
					content: JSON.stringify(dispatch.result),
				});

				if (signal?.aborted) {
					onEvent?.({
						type: "error",
						error: "Запрос был прерван клиентом (Connection aborted)",
						code: "ABORTED",
					});
					return {
						text: finalResponseText,
						toolCalls: recordedToolCalls,
						iterations: iteration,
						aborted: true,
						compacted: hasCompacted,
						summary: currentSummary || undefined,
						tokenUsage: lastRecordedUsage,
						plan: activePlan,
					};
				}
			}

			// Check if iteration limit is reached after tool executions
			if (iteration >= maxIterations) {
				const fallbackNotice =
					"\n\n[Достигнут предел клинических итераций (maxIterations = 6). Все промежуточные вызовы инструментов сохранены.]";
				finalResponseText += fallbackNotice;
				onEvent?.({ type: "token", text: fallbackNotice });
				onEvent?.({
					type: "done",
					text: finalResponseText,
					toolCallsCount: recordedToolCalls.length,
					iterations: iteration,
					tokenUsage: lastRecordedUsage,
					compacted: hasCompacted,
					plan: activePlan,
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
					compacted: hasCompacted,
					summary: currentSummary || undefined,
					tokenUsage: lastRecordedUsage,
					plan: activePlan,
				};
			}
		} catch (turnErr: unknown) {
			if (signal?.aborted) {
				onEvent?.({
					type: "error",
					error: "Запрос был прерван клиентом (Connection aborted)",
					code: "ABORTED",
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
					aborted: true,
					compacted: hasCompacted,
					summary: currentSummary || undefined,
					tokenUsage: lastRecordedUsage,
					plan: activePlan,
				};
			}

			const safeErrMsg =
				turnErr instanceof Error
					? maskKeysInText(turnErr.message)
					: "Внутренняя ошибка выполнения модели";

			// Fallback to high-IQ deterministic clinical ReAct engine when cloud LLM is unreachable or keys are exhausted
			const isKeyOrAuthError = isCloudLlmFailoverError(turnErr);

			if (isKeyOrAuthError && params.fallbackToDeterministicAgent !== false) {
				return await runDeterministicClinicalFallback(
					params,
					safeErrMsg,
					recordedToolCalls,
					activePlan,
					hasCompacted,
					currentSummary,
				);
			}

			onEvent?.({
				type: "error",
				error: safeErrMsg,
			});

			throw new Error(safeErrMsg);
		}
	}

	finalResponseText = sanitizeClinicalAiOutput(stripReasoning(finalResponseText));

	onEvent?.({
		type: "done",
		text: finalResponseText,
		toolCallsCount: recordedToolCalls.length,
		iterations: iteration,
		tokenUsage: lastRecordedUsage,
		compacted: hasCompacted,
		plan: activePlan,
	});

	return {
		text: finalResponseText,
		toolCalls: recordedToolCalls,
		iterations: iteration,
		compacted: hasCompacted,
		summary: currentSummary || undefined,
		tokenUsage: lastRecordedUsage,
		plan: activePlan,
	};
}
