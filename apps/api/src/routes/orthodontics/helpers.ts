import type { OrthodonticProgressRecord } from "./types.js";

/**
 * Парсит ортодонтические данные из профиля пациента.
 * DEF-ORTHO-02: Запрещена автоматическая подстановка 36 элайнеров здоровым людям.
 * Если у пациента нет активного ортодонтического лечения, возвращает null.
 */
export function parseOrthoData(raw: unknown): OrthodonticProgressRecord | null {
	if (!raw) return null;

	let parsed: Record<string, unknown> = {};
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed || trimmed === "null" || trimmed === "{}" || trimmed === '""') {
			return null;
		}
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			return null;
		}
	} else if (typeof raw === "object" && raw !== null) {
		parsed = raw as Record<string, unknown>;
	} else {
		return null;
	}

	const currentAligner = Number(parsed.currentAligner ?? parsed.current);
	const totalAligners = Number(parsed.totalAligners ?? parsed.total);
	const currentStage = Number(parsed.currentStage ?? parsed.stage);

	const hasOrthoSignals =
		(Number.isFinite(currentAligner) && currentAligner > 0) ||
		(Number.isFinite(totalAligners) && totalAligners > 0) ||
		(Number.isFinite(currentStage) && currentStage > 0) ||
		Boolean(parsed.archwire) ||
		Boolean(parsed.elastics) ||
		Boolean(parsed.stageTitle) ||
		Boolean(parsed.lastActionSummary);

	if (!hasOrthoSignals) {
		return null;
	}

	return {
		currentAligner: Number.isFinite(currentAligner) && currentAligner > 0 ? currentAligner : 1,
		totalAligners: Number.isFinite(totalAligners) && totalAligners > 0 ? totalAligners : 36,
		startDate: String(parsed.startDate ?? parsed.start ?? (new Date().toISOString().split("T")[0] ?? "")),
		currentStage: Number.isFinite(currentStage) && currentStage > 0 ? currentStage : 1,
		stageTitle: parsed.stageTitle ? String(parsed.stageTitle) : "Диагностика и начало нивелирования",
		archwire: parsed.archwire ? String(parsed.archwire) : undefined,
		elastics: parsed.elastics ? String(parsed.elastics) : undefined,
		lastActionDate: parsed.lastActionDate ? String(parsed.lastActionDate) : undefined,
		lastActionSummary: parsed.lastActionSummary ? String(parsed.lastActionSummary) : undefined,
		wearDaysPerAligner: Number(parsed.wearDaysPerAligner) || 14,
		nextVisitRecommendedDate: parsed.nextVisitRecommendedDate ? String(parsed.nextVisitRecommendedDate) : undefined,
	};
}

export function createInitialOrthoRecord(params?: {
	totalAligners?: number | undefined;
	wearDaysPerAligner?: number | undefined;
}): OrthodonticProgressRecord {
	return {
		currentAligner: 1,
		totalAligners: params?.totalAligners || 36,
		startDate: new Date().toISOString().split("T")[0] || "",
		currentStage: 1,
		stageTitle: "Диагностика и начало нивелирования",
		wearDaysPerAligner: params?.wearDaysPerAligner || 14,
	};
}

export function calculateNextDate(daysToAdd: number): string {
	const d = new Date();
	d.setDate(d.getDate() + daysToAdd);
	return d.toISOString().split("T")[0] || "";
}
