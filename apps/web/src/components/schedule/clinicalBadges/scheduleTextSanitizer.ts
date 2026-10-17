/**
 * Strips bureaucratic stamps, demo prefixes, and cleans whitespace in schedule card text:
 * - "[Сведения защищены 152-ФЗ]"
 * - "демо-запись: "
 */
export function sanitizeScheduleCardText(rawText?: string | null): string {
	if (!rawText) return "";
	return rawText
		.replace(/\[Сведения защищены[^\]]*\]/gi, "")
		.replace(/^демо-запись:\s*/i, "")
		.replace(/\s{2,}/g, " ")
		.trim();
}

/**
 * Checks if a clinical comment is redundant/tautological relative to the procedure or status:
 * Returns true if comment repeats the procedure name or status description.
 */
export function isRedundantScheduleComment(
	comment?: string | null,
	procedure?: string | null,
	statusLabel?: string | null,
): boolean {
	if (!comment || !comment.trim()) return true;
	const cleanComment = sanitizeScheduleCardText(comment).toLowerCase().trim();
	if (!cleanComment) return true;

	const cleanProc = sanitizeScheduleCardText(procedure).toLowerCase().trim();
	const cleanStatus = (statusLabel || "").toLowerCase().trim();

	if (cleanComment === cleanProc) return true;
	if (cleanProc && (cleanProc.includes(cleanComment) || cleanComment.includes(cleanProc))) return true;

	if (cleanStatus && cleanComment.includes(cleanStatus)) return true;
	if (cleanComment.includes("приём завершен") || cleanComment.includes("прием завершен")) return true;

	return false;
}

/**
 * Formats age with proper Russian grammatical declension:
 * 1 год, 2-4 года, 5-20 лет, 21 год, 22-24 года, 25-30 лет, 31 год, 32-34 года, 35-40 лет...
 */
export function formatRussianAge(age: number): string {
	const lastTwo = age % 100;
	const lastOne = age % 10;
	if (lastTwo >= 11 && lastTwo <= 19) return `${age} лет`;
	if (lastOne === 1) return `${age} год`;
	if (lastOne >= 2 && lastOne <= 4) return `${age} года`;
	return `${age} лет`;
}
