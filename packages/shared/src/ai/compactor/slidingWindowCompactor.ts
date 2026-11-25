/**
 * @file packages/shared/src/ai/compactor/slidingWindowCompactor.ts
 * @description Levels 1-3 Auto-Compaction Pipeline: Tool Output Pruning, Executive Summary, Sliding Window, and Snapshots.
 */

import {
	estimateConversationTokens,
	getModelContextSpec,
	type ChatMessageLike,
} from "../tokenCounter.js";
import {
	type CompactedHistoryResult,
	type CompactMemorySnapshot,
	DEFAULT_MAX_SUMMARY_CHARS,
	DEFAULT_MAX_TOOL_OUTPUT_CHARS,
	DEFAULT_RETAINED_RECENT_TURNS,
	extractEntitiesFromDialogue,
	shouldCompactContext,
	type TokenCompactorOptions,
} from "./compactorTypesAndEntities.js";

/**
 * Level 1: Tool Output Pruning.
 * Scans older messages and replaces multi-line bulky tool results with concise, structured stubs.
 * Invariant: Never modifies messages inside the recent hot turns; preserves tool_call_id pairs.
 */
export function pruneOldToolOutputs<TMessage extends ChatMessageLike>(
	messages: TMessage[],
	retainedRecentTurns: number = DEFAULT_RETAINED_RECENT_TURNS,
	maxToolOutputChars: number = DEFAULT_MAX_TOOL_OUTPUT_CHARS,
): { prunedMessages: TMessage[]; prunedCount: number; bytesSaved: number } {
	if (!messages || messages.length <= retainedRecentTurns) {
		return { prunedMessages: messages, prunedCount: 0, bytesSaved: 0 };
	}

	const cutIndex = Math.max(1, messages.length - retainedRecentTurns);
	let prunedCount = 0;
	let bytesSaved = 0;

	const prunedMessages: TMessage[] = messages.map((msg, idx) => {
		// Only prune tool messages that are older than the hot context
		if (idx >= cutIndex || msg.role !== "tool") {
			return msg;
		}

		const rawContent = msg.content || "";
		if (rawContent.length <= maxToolOutputChars) {
			return msg;
		}

		const originalLength = rawContent.length;
		const lineCount = rawContent.split(/\r?\n/).length;

		// Extract clinical indicators or JSON status
		let statusIndicator = "выполнено успешно";
		let keyExtract = "";

		try {
			const parsed = JSON.parse(rawContent);
			if (typeof parsed === "object" && parsed !== null) {
				if (parsed.success === false || parsed.error) {
					statusIndicator = `ошибка: ${parsed.error || parsed.message || "сбой"}`;
				} else if (parsed.status) {
					statusIndicator = `статус: ${parsed.status}`;
				}

				const keys = Object.keys(parsed).filter((k) => k !== "success" && k !== "error");
				if (keys.length > 0) {
					keyExtract = `содержит поля [${keys.slice(0, 5).join(", ")}]`;
				}
			}
		} catch {
			// Plain text or log output
			const firstLine = rawContent.split(/\r?\n/)[0]?.slice(0, 80) || "";
			keyExtract = firstLine ? `фрагмент: "${firstLine}..."` : "";
		}

		const summaryStub = `[Результат инструмента сокращен: ${lineCount} строк (${originalLength} симв.). Статус: ${statusIndicator}. ${keyExtract}]`.trim();

		prunedCount++;
		bytesSaved += originalLength - summaryStub.length;

		return {
			...msg,
			content: summaryStub,
		};
	});

	return { prunedMessages, prunedCount, bytesSaved };
}

/**
 * Formats a clean, high-density executive summary line for a compressed turn.
 */
function formatTurnForExecutiveSummary(msg: ChatMessageLike): string | null {
	const role = msg.role;
	const content = (msg.content || "").trim().replace(/\s+/g, " ");

	if (!content && (!msg.tool_calls || msg.tool_calls.length === 0)) {
		return null;
	}

	const roleLabel =
		role === "user"
			? "Врач"
			: role === "assistant"
				? "Ассистент"
				: role === "tool"
					? "Инструмент"
					: "Система";

	const lines: string[] = [];

	if (content) {
		const truncated = content.length > 200 ? `${content.slice(0, 197)}...` : content;
		lines.push(`• [${roleLabel}]: ${truncated}`);
	}

	if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
		const toolNames = msg.tool_calls
			.map((tc: unknown) => {
				if (typeof tc === "object" && tc !== null) {
					const item = tc as { name?: string; function?: { name?: string } };
					return item.function?.name || item.name || "tool";
				}
				return "tool";
			})
			.join(", ");
		lines.push(`  ↳ Вызовы инструментов: ${toolNames}`);
	}

	return lines.join("\n");
}

/**
 * Synthesizes an executive structured summary block from compressed messages.
 */
export function buildExecutiveSummaryBlock(
	olderMessages: ChatMessageLike[],
	previousSummary?: string | null,
	maxSummaryChars: number = DEFAULT_MAX_SUMMARY_CHARS,
): string {
	const allText = olderMessages.map((m) => m.content || "").join("\n");
	const entities = extractEntitiesFromDialogue(allText);

	const summaryParts: string[] = [];

	if (previousSummary && previousSummary.trim()) {
		summaryParts.push(`[Ранее сохраненный контекст]:\n${previousSummary.trim()}`);
	}

	// Clinical entities header
	const clinicalLines: string[] = [];
	if (entities.allergies && entities.allergies.length > 0) {
		clinicalLines.push(`- ⚠️ Аллергоанамнез: ${entities.allergies.join(", ")}`);
	}
	if (entities.somaticRisks && entities.somaticRisks.length > 0) {
		clinicalLines.push(`- ⚠️ Соматические факторы: ${entities.somaticRisks.join(", ")}`);
	}
	if (entities.teeth.length > 0) {
		clinicalLines.push(`- Зубная формула (FDI): ${entities.teeth.map((t) => `#${t}`).join(", ")}`);
	}
	if (entities.icdCodes.length > 0) {
		clinicalLines.push(`- Диагнозы (МКБ): ${entities.icdCodes.join(", ")}`);
	}
	if (entities.financials.length > 0) {
		clinicalLines.push(`- Финансовые операции: ${entities.financials.join("; ")}`);
	}
	if (entities.workstationFiles.length > 0) {
		clinicalLines.push(`- Файлы на рабочей станции: ${entities.workstationFiles.join(", ")}`);
	}
	if (entities.workstationApps.length > 0) {
		clinicalLines.push(`- Стоматологический софт: ${entities.workstationApps.join(", ")}`);
	}

	if (clinicalLines.length > 0) {
		summaryParts.push(`[Клинические и системные данные сессии]:\n${clinicalLines.join("\n")}`);
	}

	// Turn-by-turn synopsis
	const turnLines: string[] = [];
	for (const msg of olderMessages) {
		const line = formatTurnForExecutiveSummary(msg);
		if (line) {
			turnLines.push(line);
		}
	}

	if (turnLines.length > 0) {
		summaryParts.push(`[Сжатая хронология визита]:\n${turnLines.join("\n")}`);
	}

	let consolidated = summaryParts.join("\n\n").trim();

	// Guard against summary overflow
	if (consolidated.length > maxSummaryChars) {
		const overflow = consolidated.length - maxSummaryChars + 60;
		consolidated = `[...контекст оптимизирован...]\n${consolidated.slice(overflow)}`;
	}

	return consolidated;
}

/**
 * Finds clean turn boundary for sliding window.
 * Invariant: Never cuts between an assistant message with tool_calls and its corresponding tool responses.
 */
export function findCleanTurnCutIndex(
	messages: ChatMessageLike[],
	targetCutIndex: number,
): number {
	const total = messages.length;
	let cutIndex = Math.max(1, targetCutIndex);

	// Prefer cutting right before a user message
	for (let i = targetCutIndex; i < total; i++) {
		if (messages[i]?.role === "user") {
			cutIndex = i;
			break;
		}
	}

	// If no forward user message, look backwards
	if (cutIndex === targetCutIndex && messages[cutIndex]?.role !== "user") {
		for (let i = targetCutIndex - 1; i >= 1; i--) {
			if (messages[i]?.role === "user") {
				cutIndex = i;
				break;
			}
		}
	}

	// If cutIndex lands on a tool response, advance until all tool responses for the previous turn are included
	while (cutIndex < total && messages[cutIndex]?.role === "tool") {
		cutIndex++;
	}

	// If cutIndex lands right after an assistant tool_calls message, we must advance past all tool results
	const prevMsg = messages[cutIndex - 1];
	if (prevMsg?.role === "assistant" && Array.isArray(prevMsg.tool_calls) && prevMsg.tool_calls.length > 0) {
		while (cutIndex < total && messages[cutIndex]?.role === "tool") {
			cutIndex++;
		}
	}

	if (cutIndex <= 0 || cutIndex >= total) {
		cutIndex = Math.max(1, total - DEFAULT_RETAINED_RECENT_TURNS);
	}

	return cutIndex;
}

/**
 * Master Auto-Compaction Pipeline:
 * Level 1: Tool Output Pruning
 * Level 2: Sliding Window & Executive Summarization (Pinned Anchor: system prompt at index 0)
 */
export function compactConversationHistory<TMessage extends ChatMessageLike>(
	messages: TMessage[],
	options?: TokenCompactorOptions,
): CompactedHistoryResult<TMessage> {
	const totalMessagesCount = messages.length;
	const retainedTurns = options?.retainedRecentTurns ?? DEFAULT_RETAINED_RECENT_TURNS;
	const beforeTokens = estimateConversationTokens(messages);

	// If message count is minimal or below threshold, return uncompacted
	if (totalMessagesCount <= 2 || !shouldCompactContext(messages, options)) {
		return {
			compacted: false,
			beforeTokens,
			afterTokens: beforeTokens,
			tokensSaved: 0,
			prunedToolOutputsCount: 0,
			compressedMessagesCount: 0,
			summary: options?.previousSummary || "",
			compactedMessages: messages,
			hotMessages: messages,
		};
	}

	// Step 1: Run Level 1 Tool Output Pruning on older tool results
	const { prunedMessages, prunedCount } = pruneOldToolOutputs(
		messages,
		retainedTurns,
		options?.maxToolOutputChars ?? DEFAULT_MAX_TOOL_OUTPUT_CHARS,
	);

	const tokensAfterPruning = estimateConversationTokens(prunedMessages);
	const spec = getModelContextSpec(options?.model);
	const targetTokens = options?.targetTokens ?? Math.floor(spec.contextLimit * 0.5);

	// Step 2: Check if Level 1 alone brought context comfortably below threshold
	if (tokensAfterPruning < targetTokens && totalMessagesCount <= retainedTurns + 2) {
		return {
			compacted: true,
			beforeTokens,
			afterTokens: tokensAfterPruning,
			tokensSaved: beforeTokens - tokensAfterPruning,
			prunedToolOutputsCount: prunedCount,
			compressedMessagesCount: 0,
			summary: options?.previousSummary || "",
			compactedMessages: prunedMessages,
			hotMessages: prunedMessages,
		};
	}

	// Step 3: Run Level 2 Sliding Window & Executive Summarization
	// Extract Pinned System Prompt at index 0
	let pinnedSystemPromptMsg: TMessage | null = null;
	let dialogueMessages: TMessage[] = prunedMessages;

	if (prunedMessages[0]?.role === "system") {
		pinnedSystemPromptMsg = prunedMessages[0];
		dialogueMessages = prunedMessages.slice(1);
	}

	const targetCutIndex = Math.max(1, dialogueMessages.length - retainedTurns);
	const cutIndex = findCleanTurnCutIndex(dialogueMessages, targetCutIndex);

	const olderSlice = dialogueMessages.slice(0, cutIndex);
	const hotSlice = dialogueMessages.slice(cutIndex);

	const executiveSummaryText = buildExecutiveSummaryBlock(
		olderSlice,
		options?.previousSummary,
		options?.maxSummaryChars ?? DEFAULT_MAX_SUMMARY_CHARS,
	);

	// Construct structured summary message
	const summaryMessageContent = `<conversation_summary>\n${executiveSummaryText}\n</conversation_summary>`;
	const baseMsg = pinnedSystemPromptMsg ?? messages[0];
	const summaryMessage: TMessage = {
		...(baseMsg as TMessage),
		role: "system",
		content: `[РЕЗЮМЕ ПРЕДЫДУЩЕГО ЭТАПА ВИЗИТА И ДИАЛОГА]:\n${summaryMessageContent}`,
	};

	// Assemble final compacted history:
	// [Pinned System Prompt] -> [Context Summary] -> [...Hot Context]
	const finalMessages: TMessage[] = [];
	if (pinnedSystemPromptMsg) {
		finalMessages.push(pinnedSystemPromptMsg);
	}
	finalMessages.push(summaryMessage);
	finalMessages.push(...hotSlice);

	const afterTokens = estimateConversationTokens(finalMessages);
	const tokensSaved = Math.max(0, beforeTokens - afterTokens);

	return {
		compacted: true,
		beforeTokens,
		afterTokens,
		tokensSaved,
		prunedToolOutputsCount: prunedCount,
		compressedMessagesCount: olderSlice.length,
		summary: executiveSummaryText,
		compactedMessages: finalMessages,
		hotMessages: hotSlice,
	};
}

/**
 * Level 3: Creates a structured persistent memory snapshot for local storage or DB persistence.
 */
export function createMemorySnapshot(params: {
	sessionId: string;
	organizationId?: string;
	patientId?: string;
	messages: ChatMessageLike[];
	compactResult: CompactedHistoryResult;
	compactionCount?: number;
}): CompactMemorySnapshot {
	const allText = params.messages.map((m) => m.content || "").join("\n");
	const entities = extractEntitiesFromDialogue(allText);

	return {
		sessionId: params.sessionId,
		organizationId: params.organizationId,
		patientId: params.patientId,
		timestamp: Date.now(),
		summary: params.compactResult.summary,
		clinicalEntities: entities,
		tokenMetrics: {
			beforeTokens: params.compactResult.beforeTokens,
			afterTokens: params.compactResult.afterTokens,
			tokensSaved: params.compactResult.tokensSaved,
			compactionCount: params.compactionCount ?? 1,
		},
	};
}
