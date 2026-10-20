/**
 * @file packages/shared/src/ai/contextCompactor.ts
 * @description Master Auto-Compaction Pipeline & Sliding Window Engine for DENTE AI.
 *
 * Implements:
 * 1. Threshold Trigger (75-80% of context limit or custom token budget).
 * 2. Level 1: Tool Output Pruning (reduces older multi-page file and command outputs to compact stubs).
 * 3. Level 2: Sliding Window & Executive Structured Summarization:
 *    - Pinned System Prompt Anchor (cognitive laws and safety rules preserved verbatim).
 *    - Structured <conversation_summary> (teeth, complaints, diagnoses, procedures, payments, files).
 *    - Hot Context: recent turns preserved uncompressed with clean turn boundaries.
 * 4. Level 3: Persistent Memory Snapshot (exportable for session store and client local storage).
 * 5. Strict human language: zero raw bureaucratic abbreviations (no 043/у, 804н, ФФД 1.2).
 */

import {
	estimateConversationTokens,
	estimateMessageTokens,
	estimateTextTokens,
	getModelContextSpec,
	type ChatMessageLike,
} from "./tokenCounter.js";

export interface TokenCompactorOptions {
	/**
	 * Token threshold to trigger compaction.
	 * Default: 75% of model context limit (e.g. 48,000 for 64k models).
	 */
	readonly thresholdTokens?: number | undefined;

	/**
	 * Target token budget to reach after compaction (e.g. 50% of context limit).
	 */
	readonly targetTokens?: number | undefined;

	/**
	 * Number of recent messages to keep uncompressed in the active hot context.
	 * Default: 6 messages.
	 */
	readonly retainedRecentTurns?: number | undefined;

	/**
	 * Maximum character length of a single tool output before Level 1 pruning kicks in for older turns.
	 * Default: 400 characters.
	 */
	readonly maxToolOutputChars?: number | undefined;

	/**
	 * Maximum character length of the rolling executive summary.
	 * Default: 3,500 characters.
	 */
	readonly maxSummaryChars?: number | undefined;

	/**
	 * Model identifier used to resolve default thresholds.
	 */
	readonly model?: string | undefined;

	/**
	 * Optional existing previous summary.
	 */
	readonly previousSummary?: string | null | undefined;
}

export interface CompactedHistoryResult<TMessage extends ChatMessageLike = ChatMessageLike> {
	readonly compacted: boolean;
	readonly beforeTokens: number;
	readonly afterTokens: number;
	readonly tokensSaved: number;
	readonly prunedToolOutputsCount: number;
	readonly compressedMessagesCount: number;
	readonly summary: string;
	readonly compactedMessages: TMessage[];
	readonly hotMessages: TMessage[];
}

export interface ClinicalEntitiesExtracted {
	readonly teeth: number[];
	readonly icdCodes: string[];
	readonly complaints: string[];
	readonly diagnoses: string[];
	readonly procedures: string[];
	readonly financials: string[];
	readonly workstationFiles: string[];
	readonly workstationApps: string[];
}

export interface CompactMemorySnapshot {
	readonly sessionId: string;
	readonly organizationId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly timestamp: number;
	readonly summary: string;
	readonly clinicalEntities: ClinicalEntitiesExtracted;
	readonly tokenMetrics: {
		readonly beforeTokens: number;
		readonly afterTokens: number;
		readonly tokensSaved: number;
		readonly compactionCount: number;
	};
}

export const DEFAULT_RETAINED_RECENT_TURNS = 6;
export const DEFAULT_MAX_TOOL_OUTPUT_CHARS = 400;
export const DEFAULT_MAX_SUMMARY_CHARS = 3500;

/**
 * Checks if the message history exceeds the token threshold requiring auto-compaction.
 */
export function shouldCompactContext(
	messages: ChatMessageLike[],
	options?: TokenCompactorOptions,
): boolean {
	if (!messages || messages.length <= 2) {
		return false;
	}

	const spec = getModelContextSpec(options?.model);
	const threshold = options?.thresholdTokens ?? spec.defaultCompactThreshold;
	const currentTokens = estimateConversationTokens(messages);

	return currentTokens >= threshold;
}

/**
 * Extracts structured clinical and workstation entities from dialogue text.
 * Strictly respects human language guidelines (no raw regulatory codes in human summaries).
 */
export function extractEntitiesFromDialogue(text: string): ClinicalEntitiesExtracted {
	const teethSet = new Set<number>();
	const icdSet = new Set<string>();
	const complaints: string[] = [];
	const diagnoses: string[] = [];
	const procedures: string[] = [];
	const financials: string[] = [];
	const workstationFiles: string[] = [];
	const workstationApps: string[] = [];

	// FDI teeth (11-48, 51-85) including lists like "зуб 24 и 25", "зубы 16, 26, 36"
	const toothGroupRegex = /(?:зуб[а-я]*|fdi)\s*(?:№\s*)?([1-8][1-8](?:\s*(?:,|и|\+|–|-|\/)\s*(?:зуб[а-я]*\s*)?(?:№\s*)?[1-8][1-8])*)/gi;
	let match: RegExpExecArray | null;
	while ((match = toothGroupRegex.exec(text)) !== null) {
		const group = match[1];
		if (group) {
			const numbers = group.match(/[1-8][1-8]/g);
			if (numbers) {
				for (const n of numbers) {
					const num = Number.parseInt(n, 10);
					if ((num >= 11 && num <= 48) || (num >= 51 && num <= 85)) {
						teethSet.add(num);
					}
				}
			}
		}
	}

	// Standalone 2-digit tooth references like "#16", "#46", "зуб 36"
	const hashToothRegex = /#([1-8][1-8])\b/g;
	while ((match = hashToothRegex.exec(text)) !== null) {
		const raw = match[1];
		if (raw) {
			const num = Number.parseInt(raw, 10);
			if ((num >= 11 && num <= 48) || (num >= 51 && num <= 85)) {
				teethSet.add(num);
			}
		}
	}

	// ICD-10 dental codes (K00-K14)
	const icdRegex = /\b(K0[0-9](?:\.[0-9]+)?|K1[0-4](?:\.[0-9]+)?)\b/gi;
	while ((match = icdRegex.exec(text)) !== null) {
		const raw = match[1];
		if (raw) {
			icdSet.add(raw.toUpperCase());
		}
	}

	// Clinical complaints & diagnoses
	if (/боль|ноет|пульсирует|реакция на холод|реакция на горячее|отек|кровоточивость/i.test(text)) {
		complaints.push(text.slice(0, 150).trim());
	}
	if (/кариес|пульпит|периодонтит|гингивит|пародонтит|стоматит|перикоронит/i.test(text)) {
		diagnoses.push(text.slice(0, 150).trim());
	}

	// Procedures (anesthesia, canal prep, filling, crown, implant, extraction)
	if (/анестези|артикаин|мепивакаин|пломб|депульпир|эндодонт|коронк|имплант|удалени/i.test(text)) {
		procedures.push(text.slice(0, 150).trim());
	}

	// Monetary amounts (RUB / руб)
	const moneyMatches = text.match(/\b(\d+(?:[\s.,]\d{3})*(?:[.,]\d{2})?)\s*(?:руб|₽|рублей|коп)/gi);
	if (moneyMatches) {
		for (const m of moneyMatches) {
			financials.push(m.trim());
		}
	}

	// Workstation files & software
	const fileMatches = text.match(/[A-Za-z]:\\[^"'\n\r\t<>]+|\/[^"'\n\r\t<>]+\.(?:dcm|dicom|png|jpg|pdf|json|txt|log)/gi);
	if (fileMatches) {
		for (const f of fileMatches) {
			workstationFiles.push(f.trim());
		}
	}

	if (/Romexis|EzDent|EasyDent|Sidexis|3Shape|Exocad/i.test(text)) {
		const appMatch = text.match(/Romexis|EzDent|EasyDent|Sidexis|3Shape|Exocad/gi);
		if (appMatch) {
			for (const a of appMatch) {
				workstationApps.push(a);
			}
		}
	}

	return {
		teeth: Array.from(teethSet).sort((a, b) => a - b),
		icdCodes: Array.from(icdSet),
		complaints: complaints.slice(0, 5),
		diagnoses: diagnoses.slice(0, 5),
		procedures: procedures.slice(0, 5),
		financials: Array.from(new Set(financials)).slice(0, 5),
		workstationFiles: Array.from(new Set(workstationFiles)).slice(0, 5),
		workstationApps: Array.from(new Set(workstationApps)),
	};
}

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
			.map((tc: any) => tc.function?.name || tc.name || "tool")
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
	const summaryMessage = {
		role: "system",
		content: `[РЕЗЮМЕ ПРЕДЫДУЩЕГО ЭТАПА ВИЗИТА И ДИАЛОГА]:\n${summaryMessageContent}`,
	} as unknown as TMessage;

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
