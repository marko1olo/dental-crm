/**
 * @file packages/shared/src/ai/compactor/compactorTypesAndEntities.ts
 * @description Types, constants, threshold triggers, and clinical entity extraction for Context Compactor.
 */

import {
	estimateConversationTokens,
	getModelContextSpec,
	type ChatMessageLike,
} from "../tokenCounter.js";

export type { ChatMessageLike } from "../tokenCounter.js";

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
	readonly allergies?: string[] | undefined;
	readonly somaticRisks?: string[] | undefined;
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

export interface CompactorOptions {
	/**
	 * Maximum message count before compaction is triggered.
	 * Default: 15 messages.
	 */
	readonly threshold?: number | undefined;

	/**
	 * Number of recent messages to keep uncompressed in the active context window.
	 * Default: 6 messages.
	 */
	readonly retainedRecentCount?: number | undefined;

	/**
	 * Maximum character length of the rolling context summary.
	 * Default: 2500 characters.
	 */
	readonly maxSummaryLength?: number | undefined;
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
	readonly id?: string | undefined;
	readonly role: string;
	readonly content: string;
	readonly toolCalls?: unknown;
	readonly createdAt?: Date | string | number | undefined;
}

export const DEFAULT_RETAINED_RECENT_TURNS = 6;
export const DEFAULT_MAX_TOOL_OUTPUT_CHARS = 400;
export const DEFAULT_MAX_SUMMARY_CHARS = 3500;

export const DEFAULT_COMPACTION_THRESHOLD = 15;
export const DEFAULT_COMPACTOR_RETAINED_RECENT_MESSAGES = 6;
export const DEFAULT_MAX_SUMMARY_LENGTH = 2500;

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
 * Checks if the given dialogue history length requires context compaction.
 */
export function shouldCompact(
	messageCount: number,
	threshold: number = DEFAULT_COMPACTION_THRESHOLD,
): boolean {
	return messageCount > threshold;
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

	// Allergies & Somatic Factors (Mandate 8y & AI Assistant Invariants: zero amnesia for safety factors)
	const allergies: string[] = [];
	const somaticRisks: string[] = [];

	const allergyRegex = /(?:аллерги[а-я]*|непереносимост[а-я]*)\s*(?:на|к|:)?\s*([а-яa-z0-9\s,-]+?)(?=[.;\n]|$)/gi;
	while ((match = allergyRegex.exec(text)) !== null) {
		const raw = match[0]?.trim();
		if (raw && raw.length > 5 && raw.length < 80) {
			allergies.push(raw);
		}
	}

	const somaticRegex = /(?:гипертони[а-я]*|инфаркт[а-я]*|инсульт[а-я]*|сахарн[а-я]*\s+диабет[а-я]*|кардиостимулятор[а-я]*|антикоагулянт[а-я]*)/gi;
	while ((match = somaticRegex.exec(text)) !== null) {
		const raw = match[0]?.trim();
		if (raw) {
			somaticRisks.push(raw);
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
		allergies: Array.from(new Set(allergies)),
		somaticRisks: Array.from(new Set(somaticRisks)),
	};
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

	// Clinical record keywords (complaints, anesthesia, treatment status)
	if (/анамнез|жалоб|осмотр|диагноз|пульпит|кариес|периодонтит|пломб/i.test(text)) {
		highlights.push("Медицинская карта приёма");
	}

	// Allergies and somatics
	if (/аллерги|непереносимост/i.test(text)) {
		highlights.push("⚠️ Аллергоанамнез");
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
