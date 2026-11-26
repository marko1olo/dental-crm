/**
 * sessionLifecycle.ts — ReAct Loop Runner and Agent Session Lifecycle
 */

import {
	type TaskPlan,
	sanitizeClinicalAiOutput,
	stripReasoning,
	maskRussianPhone,
	maskRussianPassport,
	maskRussianSnils,
} from "@dental/shared";
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
		errName === "AgentRouterModelOverloadedError" ||
		errName === "AllKeysExhaustedError"
	) {
		return true;
	}
	const statusCode =
		(turnErr as { status?: number; statusCode?: number })?.status ||
		(turnErr as { status?: number; statusCode?: number })?.statusCode;
	if (statusCode === 429 || statusCode === 402 || statusCode === 503) {
		return true;
	}
	const msg = (turnErr instanceof Error ? turnErr.message : String(turnErr)).toLowerCase();
	return (
		msg.includes("agentrouterallkeysexhaustederror") ||
		msg.includes("agentroutermodeloverloadederror") ||
		msg.includes("allkeysexhaustederror") ||
		msg.includes("exhausted all keys") ||
		msg.includes("all agentrouter api keys are currently cooling down") ||
		msg.includes("failed to select agentrouter api key") ||
		msg.includes("all keys in pool are currently cooling down") ||
		msg.includes("model is currently in 402") ||
		msg.includes("budget pool") ||
		msg.includes("quota") ||
		msg.includes("rate limit") ||
		msg.includes("ratelimit") ||
		msg.includes("too many requests") ||
		/429|402|503|502|504|server error|auth error|401|403|unauthorized|forbidden|invalid api key|enotfound|econnrefused|etimedout|fetch failed|network|timed out|timeout|исчерпали лимиты|все 0 ключей/i.test(msg)
	);
}

/**
 * Маскирует персональные данные пациента (152-ФЗ) в тексте сообщения перед отправкой в LLM.
 */
function maskPhiInText(text: string): string {
	if (!text || typeof text !== "string") return "";
	let masked = text;
	masked = masked.replace(/(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g, (m) => maskRussianPhone(m));
	masked = masked.replace(/\b\d{3}-\d{3}-\d{3}[\s-]*\d{2}\b/g, (m) => maskRussianSnils(m));
	masked = masked.replace(/\b\d{2}[\s-]*\d{2}[\s-]*\d{6}\b/g, (m) => maskRussianPassport(m));
	return masked;
}

/**
 * Маскирует ПДн во всех текстовых полях и аргументах вызовов инструментов сообщения перед передачей в LLM.
 */
function maskChatMessagePhi(message: AgentRouterChatMessage): AgentRouterChatMessage {
	return {
		...message,
		...(typeof message.content === "string"
			? { content: maskPhiInText(message.content) }
			: {}),
		...(typeof message.reasoning_content === "string"
			? { reasoning_content: maskPhiInText(message.reasoning_content) }
			: {}),
		...(Array.isArray(message.tool_calls)
			? {
					tool_calls: message.tool_calls.map((tc) => ({
						...tc,
						function: {
							...tc.function,
							arguments: maskPhiInText(tc.function.arguments),
						},
					})),
				}
			: {}),
	};
}

function runContextCompactionPass(
	history: AgentRouterChatMessage[],
	currentSummary: string,
	params: Pick<
		AgentHarnessParams,
		| "contextLimitTokens"
		| "compactThresholdTokens"
		| "slidingWindowRetainedTurns"
		| "maskPhiData"
		| "onEvent"
	>,
): { compacted: boolean; history: AgentRouterChatMessage[]; summary: string } {
	const compactorOpts: TokenCompactorOptions = {
		...(params.contextLimitTokens !== undefined ||
		params.compactThresholdTokens !== undefined
			? { thresholdTokens: params.contextLimitTokens ?? params.compactThresholdTokens }
			: {}),
		...(params.slidingWindowRetainedTurns !== undefined
			? { retainedRecentTurns: params.slidingWindowRetainedTurns }
			: {}),
		previousSummary: currentSummary,
	};

	if (!shouldCompactContext(history, compactorOpts)) {
		return { compacted: false, history, summary: currentSummary };
	}

	const compactResult = compactConversationHistory(history, compactorOpts);
	if (!compactResult.compacted) {
		return { compacted: false, history, summary: currentSummary };
	}

	const nextSummary = params.maskPhiData
		? maskPhiInText(compactResult.summary)
		: compactResult.summary;
	const compactedMessages = compactResult.compactedMessages as AgentRouterChatMessage[];
	const nextHistory = params.maskPhiData
		? compactedMessages.map(maskChatMessagePhi)
		: compactedMessages;

	params.onEvent?.({
		type: "compact_triggered",
		beforeTokens: compactResult.beforeTokens,
		afterTokens: compactResult.afterTokens,
		tokensSaved: compactResult.tokensSaved,
		prunedToolOutputsCount: compactResult.prunedToolOutputsCount,
		compressedMessagesCount: compactResult.compressedMessagesCount,
		summary: nextSummary,
	});

	return { compacted: true, history: nextHistory, summary: nextSummary };
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
		!params.trustLevel
			? undefined
			: params.trustLevel === "autonomous"
				? "autonomous"
				: params.trustLevel === "confirm_all" || params.trustLevel === "cautious"
					? "confirm_all"
					: "balanced";

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

	// 152-ФЗ: маскирование ПДн во всех сообщениях и системном промпте перед отправкой в LLM
	const effectiveSystemPrompt = params.maskPhiData
		? maskPhiInText(systemPrompt)
		: systemPrompt;

	const effectiveMessages = params.maskPhiData
		? messages.map(maskChatMessagePhi)
		: messages;

	// Working history for this ReAct execution turn
	let history: AgentRouterChatMessage[] = [
		{ role: "system", content: effectiveSystemPrompt },
		...effectiveMessages,
	];

	let hasCompacted = false;
	let currentSummary =
		params.maskPhiData && params.initialSummary
			? maskPhiInText(params.initialSummary)
			: params.initialSummary || "";
	let lastRecordedUsage: AgentHarnessResult["tokenUsage"] | undefined;

	// Level 1 + Level 2 initial check: compact before the first inference turn if dialogue exceeds threshold
	if (params.enableAutoCompaction !== false) {
		const initialCompact = runContextCompactionPass(history, currentSummary, params);
		if (initialCompact.compacted) {
			hasCompacted = true;
			history = initialCompact.history;
			currentSummary = initialCompact.summary;
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
	const seenConfirmationCalls = new Set<string>();

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
			const midCompact = runContextCompactionPass(history, currentSummary, params);
			if (midCompact.compacted) {
				hasCompacted = true;
				history = midCompact.history;
				currentSummary = midCompact.summary;
			}
		}

		try {
			const routing = routeClinicalTask({
				messages: effectiveMessages,
				speedMode: params.speedMode,
				doctorSpecialization: params.doctorSpecialization,
				modelRoutingMode: params.modelRoutingMode,
				byokProvider: params.byokProvider,
				byokApiKey: params.byokApiKey,
				byokModel: params.byokModel,
				byokBaseUrl: params.byokBaseUrl,
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
			const assistantToolMessage: AgentRouterChatMessage = {
				role: "assistant",
				content: content
					? params.maskPhiData
						? maskPhiInText(content)
						: content
					: null,
				tool_calls: params.maskPhiData
					? toolCalls.map((tc) => ({
							...tc,
							function: {
								...tc.function,
								arguments: maskPhiInText(tc.function.arguments),
							},
						}))
					: toolCalls,
			};
			history.push(assistantToolMessage);

			if (content && !streamEmittedTokens) {
				onEvent?.({ type: "token", text: content });
			}

			let shouldAbortRepeatedConfirmationLoop = false;
			let repeatedConfirmationMessage = "";

			for (const call of toolCalls) {
				const dispatch = await toolDispatcher.dispatchToolCall(call, activePlan);
				activePlan = dispatch.activePlan;

				recordedToolCalls.push({
					tool: dispatch.toolName,
					args: dispatch.parsedArgs,
					result: dispatch.result,
				});

				const serializedResult = JSON.stringify(dispatch.result) ?? "null";
				const toolMessageContent = params.maskPhiData
					? maskPhiInText(serializedResult)
					: serializedResult;

				// Append tool execution result message for model's next turn
				history.push({
					role: "tool",
					tool_call_id: call.id,
					content: toolMessageContent,
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

				const isConfirmationRequiredResult =
					dispatch.isConfirmationRequired === true ||
					(dispatch.result !== null &&
						typeof dispatch.result === "object" &&
						"status" in dispatch.result &&
						(dispatch.result as { status?: unknown }).status ===
							"confirmation_required");

				if (isConfirmationRequiredResult) {
					const signature = `${call.function.name}::${call.function.arguments ?? ""}`;
					if (seenConfirmationCalls.has(signature)) {
						shouldAbortRepeatedConfirmationLoop = true;
						repeatedConfirmationMessage =
							dispatch.result !== null &&
							typeof dispatch.result === "object" &&
							"message" in dispatch.result &&
							typeof (dispatch.result as { message?: unknown }).message ===
								"string"
								? (dispatch.result as { message: string }).message
								: "Действие требует подтверждения врача.";
						break;
					}
					seenConfirmationCalls.add(signature);
				}
			}

			if (shouldAbortRepeatedConfirmationLoop) {
				if (!finalResponseText.trim()) {
					finalResponseText = repeatedConfirmationMessage;
					onEvent?.({ type: "token", text: finalResponseText });
				}
				break;
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
