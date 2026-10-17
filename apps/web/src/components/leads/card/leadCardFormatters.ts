/**
 * DENTE Dental CRM — Lead Card Date & Formatting Helpers
 * Mandate 8b (<= 120 lines)
 */

export function formatLeadTimestamp(val?: string | Date | null): string {
	if (!val) return "";
	try {
		const d = typeof val === "string" ? new Date(val) : val;
		if (Number.isNaN(d.getTime())) return "";
		const isToday = d.toDateString() === new Date().toDateString();
		const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
		return isToday ? `Сегодня, ${timeStr}` : `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}, ${timeStr}`;
	} catch {
		return "";
	}
}
