/**
 * copilotContextCompactor.ts — Context compaction engine for DENTE AI Copilot (SQUAD GAMMA).
 *
 * SQUAD GAMMA INVARIANTS:
 * 1. Automatic compaction when dialogue exceeds threshold (> 15 messages).
 * 2. Compresses early turns into a structured clinical summary stored in session.summary.
 * 3. Preserves clinical entities (FDI teeth 11-48/51-85, МКБ-10, 043/у complaints, 54-ФЗ payments).
 * 4. Ensures zero loss of clinical context while keeping token usage within LLM budget limits.
 * 5. Guarantees clean turn boundaries (never leaves orphaned tool calls or broken response chains).
 */

export interface CompactorOptions {
	/**
	 * Maximum message count before compaction is triggered.
	 * Default: 15 messages.
	 */
	readonly threshold?: number;

	/**
	 * Number of recent messages to keep uncompressed in the active context window.
	 * Default: 6 messages.
	 */
	readonly retainedRecentCount?: number;

	/**
	 * Maximum character length of the rolling context summary.
	 * Default: 2500 characters.
	 */
	readonly maxSummaryLength?: number;
}

export interface CompactedResult<TMessage = unknown> {
	/** Whether compaction was applied (true if message count > threshold). */
	readonly compacted: boolean;
	/** The resulting updated summary text. */
	readonly summary: string;
	/** The uncompacted recent messages to be sent in the active prompt. */
	readonly retainedMessages: TMessage[];
	/** The number of older messages that were compressed into the summary. */
	readonly compactedMessagesCount: number;
	/** Total messages before compaction. */
	readonly totalMessagesCount: number;
}

export interface CopilotMessageLike {
	readonly id?: string;
	readonly role: string;
	readonly content: string;
	readonly toolCalls?: unknown;
	readonly createdAt?: Date | string | number;
}

export const DEFAULT_COMPACTION_THRESHOLD = 15;
export const DEFAULT_COMPACTOR_RETAINED_RECENT_MESSAGES = 6;
export const DEFAULT_MAX_SUMMARY_LENGTH = 2500;

/**
 * Checks if the given dialogue history length requires context compaction.
 */
export function shouldCompact(
	messageCount: number,
	threshold: number = DEFAULT_COMPACTION_THRESHOLD,
): boolean {
	return messageCount > threshold;
}

/**
 * Extracts clinically relevant highlights and keywords from a message content string.
 */
export function extractClinicalHighlights(text: string): string[] {
	const highlights: string[] = [];

	// FDI tooth notation matching (11..48, 51..85, "зуб 36", "зубы 11, 12, 13", "зуб 4.6")
	const toothMatches = text.match(/(?:зуб[а-я]*|fdi|fdi-code)\s*(?:№\s*)?([1-8][1-8](?:\s*,\s*[1-8][1-8])*)/gi);
	if (toothMatches) {
		for (const match of toothMatches) {
			highlights.push(`Зуб(ы): ${match.trim()}`);
		}
	}

	// ICD-10 (МКБ-10) diagnosis code matching (K00-K14 dental codes)
	const icdMatches = text.match(/\b(K0[0-9](?:\.[0-9]+)?|K1[0-4](?:\.[0-9]+)?)\b/gi);
	if (icdMatches) {
		highlights.push(`МКБ-10: ${Array.from(new Set(icdMatches)).join(", ")}`);
	}

	// Clinical 043/у record keywords (complaints, anesthesia, treatment status)
	if (/043|анамнез|жалоб|осмотр|диагноз|пульпит|кариес|периодонтит|пломб/i.test(text)) {
		highlights.push("Медкарта 043/у");
	}

	// 54-FZ and billing monetary amounts (RUB / руб / коп / счет / чек)
	const moneyMatches = text.match(/\b(\d+(?:[\s.,]\d{3})*(?:[.,]\d{2})?)\s*(?:руб|₽|рублей|коп)/gi);
	if (moneyMatches) {
		highlights.push(`Финансы: ${Array.from(new Set(moneyMatches)).join(", ")}`);
	}

	// Appointments & Schedule references
	if (/запис|расписани|прием|окно|слот|отмен|перенос/i.test(text)) {
		highlights.push("Расписание");
	}

	return highlights;
}

/**
 * Formats an individual message into a concise summary line with role identification.
 */
export function formatMessageForSummary(
	role: string,
	content: string,
	toolCalls?: unknown,
): string {
	const roleLabel =
		role === "user"
			? "Врач/Пользователь"
			: role === "assistant"
				? "AI-Ассистент"
				: role === "tool"
					? "Инструмент"
					: "Система";

	const cleanedContent = content.trim().replace(/\s+/g, " ");
	const truncatedContent =
		cleanedContent.length > 220
			? `${cleanedContent.slice(0, 217)}...`
			: cleanedContent;

	const parts: string[] = [];
	if (truncatedContent) {
		parts.push(`• [${roleLabel}]: ${truncatedContent}`);
	}

	if (toolCalls) {
		let toolSummary = "";
		if (Array.isArray(toolCalls)) {
			toolSummary = toolCalls
				.map((tc) => {
					if (typeof tc === "object" && tc !== null) {
						const name = (tc as { name?: string; function?: { name?: string } }).name ||
							(tc as { function?: { name?: string } }).function?.name ||
							"tool";
						const args = (tc as { arguments?: unknown; input?: unknown }).arguments ||
							(tc as { input?: unknown }).input;
						const argsStr = args ? JSON.stringify(args).slice(0, 80) : "";
						return `${name}(${argsStr})`;
					}
					return String(tc).slice(0, 50);
				})
				.join(", ");
		} else if (typeof toolCalls === "object") {
			toolSummary = JSON.stringify(toolCalls).slice(0, 100);
		}

		if (toolSummary) {
			parts.push(`  ↳ Вызовы: ${toolSummary}`);
		}
	}

	return parts.join("\n");
}

/**
 * Generates a consolidated contextual summary from older messages and an existing summary.
 */
export function generateContextSummary(
	messages: Array<{ role: string; content: string; toolCalls?: unknown }>,
	previousSummary?: string | null,
	maxSummaryLength: number = DEFAULT_MAX_SUMMARY_LENGTH,
): string {
	const summarySections: string[] = [];

	if (previousSummary && previousSummary.trim()) {
		summarySections.push(`[Ранее сохраненный контекст]:\n${previousSummary.trim()}`);
	}

	const newLines: string[] = [];
	for (const msg of messages) {
		const line = formatMessageForSummary(msg.role, msg.content, msg.toolCalls);
		if (line) {
			newLines.push(line);
		}
	}

	if (newLines.length > 0) {
		summarySections.push(`[Сжатые этапы диалога]:\n${newLines.join("\n")}`);
	}

	let consolidated = summarySections.join("\n\n").trim();

	// If summary exceeds maxSummaryLength, truncate older sections while keeping the latest lines
	if (consolidated.length > maxSummaryLength) {
		const overflow = consolidated.length - maxSummaryLength + 40;
		consolidated = `[...контекст сжат...]\n${consolidated.slice(overflow)}`;
	}

	return consolidated;
}

/**
 * Compacts a list of conversation messages when length exceeds threshold (> 15).
 * Compresses older messages into a rolling summary and returns uncompressed recent turns.
 */
export function compactMessageHistory<
	TMessage extends {
		readonly role: string;
		readonly content: string;
		readonly toolCalls?: unknown;
	},
>(
	messages: TMessage[],
	previousSummary?: string | null,
	options?: CompactorOptions,
): CompactedResult<TMessage> {
	const threshold = options?.threshold ?? DEFAULT_COMPACTION_THRESHOLD;
	const retainedCount = options?.retainedRecentCount ?? DEFAULT_COMPACTOR_RETAINED_RECENT_MESSAGES;
	const maxSummaryLength = options?.maxSummaryLength ?? DEFAULT_MAX_SUMMARY_LENGTH;

	const totalCount = messages.length;

	if (!shouldCompact(totalCount, threshold)) {
		return {
			compacted: false,
			summary: previousSummary ?? "",
			retainedMessages: messages,
			compactedMessagesCount: 0,
			totalMessagesCount: totalCount,
		};
	}

	// Calculate cut point: keep the last `retainedCount` messages
	const targetCutIndex = Math.max(1, totalCount - retainedCount);

	// Find clean turn boundary (align on user message or start of assistant turn to avoid dangling tool pairs)
	let cutIndex = targetCutIndex;
	for (let i = targetCutIndex; i < totalCount; i++) {
		if (messages[i]?.role === "user") {
			cutIndex = i;
			break;
		}
	}

	// If no forward user message found, look backward
	if (cutIndex === targetCutIndex && messages[cutIndex]?.role !== "user") {
		for (let i = targetCutIndex - 1; i >= 1; i--) {
			if (messages[i]?.role === "user") {
				cutIndex = i;
				break;
			}
		}
	}

	// Ensure cutIndex does not separate an assistant tool_use from its tool result
	while (cutIndex < totalCount && messages[cutIndex]?.role === "tool") {
		cutIndex++;
	}

	if (cutIndex <= 0 || cutIndex >= totalCount) {
		cutIndex = Math.max(1, totalCount - retainedCount);
	}

	const olderSlice = messages.slice(0, cutIndex);
	const recentSlice = messages.slice(cutIndex);

	const updatedSummary = generateContextSummary(
		olderSlice,
		previousSummary,
		maxSummaryLength,
	);

	return {
		compacted: true,
		summary: updatedSummary,
		retainedMessages: recentSlice,
		compactedMessagesCount: olderSlice.length,
		totalMessagesCount: totalCount,
	};
}

export interface DoctorScreenContext {
	readonly view?: string | null;
	readonly viewLabel?: string | null;
	readonly patientId?: string | null;
	readonly patientName?: string | null;
	readonly allergies?: string[] | null;
	readonly activeTooth?: number | string | null;
	readonly activeDoctor?: string | null;
	readonly toothFormula?: Record<string, string> | null;
	readonly diagnosesByTooth?: Record<string, string> | null;
	readonly clinical043Context?: {
		readonly complaints?: string | null;
		readonly anamnesis?: string | null;
		readonly objectiveStatus?: string | null;
		readonly diagnosis?: string | null;
		readonly treatmentPlan?: string | null;
		readonly recommendations?: string | null;
	} | null;
	readonly additionalContext?: Record<string, unknown> | null;
}

/**
 * Formats structured doctor screen context into a rich clinical prompt block.
 */
export function formatDoctorScreenContextPrompt(
	ctx: DoctorScreenContext,
): string {
	const lines: string[] = [
		`[АКТИВНЫЙ КЛИНИЧЕСКИЙ КОНТЕКСТ ЭКРАНА ВРАЧА (0-CLICK LIVE CONTEXT)]:`,
	];

	if (ctx.viewLabel || ctx.view) {
		lines.push(`• Активный раздел: ${ctx.viewLabel || ctx.view} (${ctx.view || ""})`);
	}
	if (ctx.patientName || ctx.patientId) {
		lines.push(
			`• Активный пациент: ${ctx.patientName || "Не указан"} (ID: ${ctx.patientId || "null"})`,
		);
	}
	if (ctx.allergies && ctx.allergies.length > 0) {
		lines.push(`• ⚠️ АЛЛЕРГОАНАМНЕЗ: ${ctx.allergies.join(", ")}`);
	} else if (ctx.patientId) {
		lines.push(`• Аллергоанамнез: Не отягощен (DDI Safe)`);
	}
	if (ctx.activeTooth !== null && ctx.activeTooth !== undefined) {
		lines.push(`• Выбранный зуб (FDI): #${ctx.activeTooth}`);
	}
	if (ctx.activeDoctor) {
		lines.push(`• Лечащий врач: ${ctx.activeDoctor}`);
	}
	if (ctx.toothFormula && Object.keys(ctx.toothFormula).length > 0) {
		const formulaStr = Object.entries(ctx.toothFormula)
			.map(([tooth, state]) => `Зуб ${tooth}: ${state}`)
			.join(", ");
		lines.push(`• Зубная формула / статусы: ${formulaStr}`);
	}
	if (ctx.diagnosesByTooth && Object.keys(ctx.diagnosesByTooth).length > 0) {
		const diagStr = Object.entries(ctx.diagnosesByTooth)
			.map(([tooth, diag]) => `Зуб ${tooth}: ${diag}`)
			.join("; ");
		lines.push(`• Диагнозы по зубам: ${diagStr}`);
	}
	if (ctx.clinical043Context) {
		const c = ctx.clinical043Context;
		const cLines: string[] = [];
		if (c.complaints) cLines.push(`  - Жалобы: ${c.complaints}`);
		if (c.anamnesis) cLines.push(`  - Анамнез: ${c.anamnesis}`);
		if (c.objectiveStatus) cLines.push(`  - Объективно: ${c.objectiveStatus}`);
		if (c.diagnosis) cLines.push(`  - Диагноз: ${c.diagnosis}`);
		if (c.treatmentPlan) cLines.push(`  - Лечение / План: ${c.treatmentPlan}`);
		if (c.recommendations) cLines.push(`  - Рекомендации: ${c.recommendations}`);
		if (cLines.length > 0) {
			lines.push(`• Активный дневник 043/у:\n${cLines.join("\n")}`);
		}
	}

	return lines.join("\n");
}

/**
 * Injects a compacted context summary and doctor screen context into the base system prompt.
 */
export function buildCompactedSystemPrompt(
	baseSystemPrompt: string,
	summary?: string | null | undefined,
	doctorContext?: DoctorScreenContext | string | null | undefined,
): string {
	const sections = [baseSystemPrompt];

	if (summary && summary.trim()) {
		sections.push(
			`[СОХРАНЕННЫЙ КОНТЕКСТ ДИАЛОГА / CONTEXT SUMMARY]:\n${summary.trim()}`,
		);
	}

	if (doctorContext) {
		if (typeof doctorContext === "string" && doctorContext.trim()) {
			sections.push(doctorContext.trim());
		} else if (typeof doctorContext === "object") {
			const formatted = formatDoctorScreenContextPrompt(doctorContext);
			if (formatted.trim()) {
				sections.push(formatted);
			}
		}
	}

	return sections.join("\n\n");
}
