import type { OrthodonticProgressRecord } from "./types.js";

export function parseOrthoData(raw: unknown): OrthodonticProgressRecord {
	const defaultRecord: OrthodonticProgressRecord = {
		currentAligner: 1,
		totalAligners: 36,
		startDate: new Date().toISOString().split("T")[0] || "",
		currentStage: 1,
		stageTitle: "Диагностика и начало нивелирования",
		wearDaysPerAligner: 14,
	};

	if (!raw) return defaultRecord;

	let parsed: Record<string, unknown> = {};
	if (typeof raw === "string") {
		try {
			parsed = JSON.parse(raw);
		} catch {
			return defaultRecord;
		}
	} else if (typeof raw === "object" && raw !== null) {
		parsed = raw as Record<string, unknown>;
	}

	return {
		currentAligner: Number(parsed.currentAligner ?? parsed.current) || defaultRecord.currentAligner,
		totalAligners: Number(parsed.totalAligners ?? parsed.total) || defaultRecord.totalAligners,
		startDate: String(parsed.startDate ?? parsed.start ?? defaultRecord.startDate),
		currentStage: Number(parsed.currentStage ?? parsed.stage) || defaultRecord.currentStage,
		stageTitle: parsed.stageTitle ? String(parsed.stageTitle) : defaultRecord.stageTitle,
		archwire: parsed.archwire ? String(parsed.archwire) : undefined,
		elastics: parsed.elastics ? String(parsed.elastics) : undefined,
		lastActionDate: parsed.lastActionDate ? String(parsed.lastActionDate) : undefined,
		lastActionSummary: parsed.lastActionSummary ? String(parsed.lastActionSummary) : undefined,
		wearDaysPerAligner: Number(parsed.wearDaysPerAligner) || defaultRecord.wearDaysPerAligner,
		nextVisitRecommendedDate: parsed.nextVisitRecommendedDate ? String(parsed.nextVisitRecommendedDate) : undefined,
	};
}

export function calculateNextDate(daysToAdd: number): string {
	const d = new Date();
	d.setDate(d.getDate() + daysToAdd);
	return d.toISOString().split("T")[0] || "";
}
