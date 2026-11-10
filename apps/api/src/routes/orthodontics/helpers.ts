import type { OrthodonticProgressRecord } from "./types.js";

/**
 * Парсит ортодонтические данные из профиля пациента.
 * DEF-ORTHO-09: Запрещена автоматическая подстановка 36 элайнеров брекет-пациентам и здоровым людям.
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

	const currentAlignerNum = Number(parsed.currentAligner ?? parsed.current);
	const totalAlignersNum = Number(parsed.totalAligners ?? parsed.total);
	const currentStage = Number(parsed.currentStage ?? parsed.stage);

	const hasAlignerSignals =
		(Number.isFinite(currentAlignerNum) && currentAlignerNum > 0) ||
		(Number.isFinite(totalAlignersNum) && totalAlignersNum > 0) ||
		String(parsed.applianceCategory || "").includes("aligner") ||
		String(parsed.lastActionSummary || "").includes("элайнер") ||
		String(parsed.lastActionSummary || "").includes("кап");

	const hasOrthoSignals =
		hasAlignerSignals ||
		(Number.isFinite(currentStage) && currentStage > 0) ||
		Boolean(parsed.archwire) ||
		Boolean(parsed.elastics) ||
		Boolean(parsed.stageTitle) ||
		Boolean(parsed.lastActionSummary);

	if (!hasOrthoSignals) {
		return null;
	}

	return {
		currentAligner: hasAlignerSignals
			? (Number.isFinite(currentAlignerNum) && currentAlignerNum > 0 ? currentAlignerNum : 1)
			: undefined,
		totalAligners: hasAlignerSignals
			? (Number.isFinite(totalAlignersNum) && totalAlignersNum > 0 ? totalAlignersNum : 24)
			: undefined,
		startDate: String(parsed.startDate ?? parsed.start ?? (new Date().toISOString().split("T")[0] ?? "")),
		currentStage: Number.isFinite(currentStage) && currentStage > 0 ? currentStage : 1,
		stageTitle: parsed.stageTitle ? String(parsed.stageTitle) : "Диагностика и начало нивелирования",
		archwire: parsed.archwire ? String(parsed.archwire) : undefined,
		elastics: parsed.elastics ? String(parsed.elastics) : undefined,
		lastActionDate: parsed.lastActionDate ? String(parsed.lastActionDate) : undefined,
		lastActionSummary: parsed.lastActionSummary ? String(parsed.lastActionSummary) : undefined,
		wearDaysPerAligner: hasAlignerSignals ? (Number(parsed.wearDaysPerAligner) || 14) : undefined,
		nextVisitRecommendedDate: parsed.nextVisitRecommendedDate ? String(parsed.nextVisitRecommendedDate) : undefined,
	};
}

export function createInitialOrthoRecord(params?: {
	applianceCategory?: "brackets" | "aligners" | "plate" | undefined;
	totalAligners?: number | undefined;
	wearDaysPerAligner?: number | undefined;
}): OrthodonticProgressRecord {
	const isAligners = params?.applianceCategory === "aligners" || Boolean(params?.totalAligners);
	return {
		currentAligner: isAligners ? 1 : undefined,
		totalAligners: isAligners ? (params?.totalAligners || 24) : undefined,
		startDate: new Date().toISOString().split("T")[0] || "",
		currentStage: 1,
		stageTitle: "Диагностика и начало нивелирования",
		wearDaysPerAligner: isAligners ? (params?.wearDaysPerAligner || 14) : undefined,
	};
}

export function calculateNextDate(daysToAdd: number): string {
	const d = new Date();
	d.setDate(d.getDate() + daysToAdd);
	return d.toISOString().split("T")[0] || "";
}
