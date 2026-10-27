/**
 * splitIntoClinicalClauses.ts — Разбивка клинического текста на логические фразы.
 */

export function splitIntoClinicalClauses(text: string): string[] {
	if (!text) return [];
	return text
		.split(/(?:[.;\n]+|\b(?:затем|далее|после этого)\b)/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 2);
}
