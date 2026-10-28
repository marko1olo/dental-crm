/**
 * escapeXml.ts — Безопасное экранирование XML/HTML спецсимволов для печатных ведомостей и листков.
 */
export function escapeXml(unsafe: unknown): string {
	if (unsafe === null || unsafe === undefined) return "";
	return String(unsafe)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
