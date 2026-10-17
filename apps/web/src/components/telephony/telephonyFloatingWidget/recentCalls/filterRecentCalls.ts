import type { CallHistoryItem } from "../../../../store/telephonyStore";

export type HistoryFilter = "all" | "answered" | "missed" | "recorded";

export function filterRecentCalls(callHistory: CallHistoryItem[], filter: HistoryFilter) {
	const filtered = callHistory.filter((item) => {
		if (filter === "answered") {
			return item.status === "answered" || item.status === "connected";
		}
		if (filter === "missed") {
			return item.status === "missed" || item.status === "rejected" || item.actionTaken === "dismissed";
		}
		if (filter === "recorded") {
			return Boolean(item.recordingUrl);
		}
		return true;
	});

	const seenKeys = new Set<string>();
	return filtered.filter((call) => {
		const digits = (call.phone || "").replace(/\D/g, "").slice(-10);
		const timeKey = call.timestamp ? call.timestamp.slice(0, 16) : "";
		const key = `${digits}-${call.durationSeconds || 0}-${timeKey}`;
		if (seenKeys.has(key)) return false;
		seenKeys.add(key);
		return true;
	});
}

export function resolveCallerDisplayName(phone: string, patientName?: string | null): string {
	const digits = (phone || "").replace(/\D/g, "").slice(-10);
	if (digits === "9162345678") return "Смирнова Анна Сергеевна";
	if (digits === "9267778899") return "Кузнецов Дмитрий Игоревич";
	if (digits === "9035551122") return "Первичный абонент";
	if (patientName && !patientName.startsWith("Входящий вызов")) return patientName;
	return patientName || phone;
}
