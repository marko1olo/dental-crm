import type { NormalizedToothStatus } from "./formulaTypes.js";

/**
 * Нормализует клинический статус зуба к канонической палитре FDI/ISO 3950.
 */
export function normalizeToothStatus(rawStatus?: string, rawStatusCode?: string): NormalizedToothStatus {
	const s = (rawStatus || "").toLowerCase();
	const c = (rawStatusCode || rawStatus || "").toUpperCase();

	// 1. Кариес (Caries)
	if (s.includes("caries") || s.includes("кариес") || c === "C" || c === "С") {
		return { category: "caries", code: "C", label: "Кариес", color: "#dc2626", badgeBg: "#fee2e2", badgeFg: "#991b1b", svgFill: "#f87171", svgStroke: "#b91c1c" };
	}
	// 2. Пульпит (Pulpitis)
	if (s.includes("pulp") || s.includes("пульпит") || c === "P") {
		return { category: "pulpitis", code: "P", label: "Пульпит", color: "#991b1b", badgeBg: "#ffe4e6", badgeFg: "#881337", svgFill: "#ef4444", svgStroke: "#7f1d1d" };
	}
	// 3. Периодонтит (Periodontitis)
	if (s.includes("periodont") || s.includes("периодонтит") || c === "PERIO") {
		return { category: "periodontitis", code: "Pt", label: "Периодонтит", color: "#7c3aed", badgeBg: "#f3e8ff", badgeFg: "#581c87", svgFill: "#a855f7", svgStroke: "#6b21a8" };
	}
	// 4. Пломба / Реставрация (Filled / Restoration)
	if (s.includes("fill") || s.includes("пломб") || s.includes("completed") || s.includes("реставрация") || c === "F" || c === "П" || c === "PT" || c === "PL") {
		return { category: "filled", code: c === "PT" ? "Pt" : c === "PL" ? "Pl" : "П", label: "Пломбирован", color: "#059669", badgeBg: "#d1fae5", badgeFg: "#065f46", svgFill: "#34d399", svgStroke: "#047857" };
	}
	// 5. Коронка / Ортопедия (Crown / Prosthetic)
	if (s.includes("crown") || s.includes("коронк") || s.includes("prosthetic") || s.includes("ортопед") || c === "K" || c === "К") {
		return { category: "crown", code: "К", label: "Коронка", color: "#2563eb", badgeBg: "#dbeafe", badgeFg: "#1e40af", svgFill: "#60a5fa", svgStroke: "#1d4ed8" };
	}
	// 6. Имплантат (Implant)
	if (s.includes("implant") || s.includes("имплант") || c === "I" || c === "И") {
		return { category: "implant", code: "И", label: "Имплантат", color: "#4f46e5", badgeBg: "#e0e7ff", badgeFg: "#3730a3", svgFill: "#818cf8", svgStroke: "#4338ca" };
	}
	// 7. Отсутствует / Удален (Missing / Extracted)
	if (s.includes("miss") || s.includes("удален") || s.includes("отсутств") || c === "0" || c === "X" || c === "О" || c === "A" || s === "a") {
		return { category: "missing", code: c === "A" ? "A" : "0", label: "Отсутствует", color: "#94a3b8", badgeBg: "#f1f5f9", badgeFg: "#475569", svgFill: "#e2e8f0", svgStroke: "#94a3b8" };
	}
	// 8. Корень / Штифт (Root / Post)
	if (s.includes("root") || s.includes("корен") || c === "R" || c === "Ш") {
		return { category: "root", code: "R", label: "Корень", color: "#d97706", badgeBg: "#fef3c7", badgeFg: "#92400e", svgFill: "#fbbf24", svgStroke: "#b45309" };
	}
	// 9. Наблюдение (Watch / Suspicious)
	if (s.includes("watch") || s.includes("наблюден") || c === "N") {
		return { category: "watch", code: "N", label: "Наблюдение", color: "#ea580c", badgeBg: "#ffedd5", badgeFg: "#9a3412", svgFill: "#fdba74", svgStroke: "#c2410c" };
	}
	// По умолчанию: Здоровый (Sound / Intact)
	return { category: "sound", code: "H", label: "Здоровый", color: "#475569", badgeBg: "#f8fafc", badgeFg: "#334155", svgFill: "#ffffff", svgStroke: "#94a3b8" };
}
