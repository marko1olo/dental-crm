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
		Boolean(parsed.upperArchwire) ||
		Boolean(parsed.lowerArchwire) ||
		Boolean(parsed.elastics) ||
		Boolean(parsed.stageTitle) ||
		Boolean(parsed.lastActionSummary) ||
		Boolean(parsed.angleClass) ||
		Boolean(parsed.verticalBite) ||
		Boolean(parsed.skeletalClass);

	if (!hasOrthoSignals) {
		return null;
	}

	return {
		applianceId: parsed.applianceId ? String(parsed.applianceId) : undefined,
		applianceName: parsed.applianceName ? String(parsed.applianceName) : undefined,
		applianceCategory: (parsed.applianceCategory === "brackets" || parsed.applianceCategory === "aligners" || parsed.applianceCategory === "plate")
			? parsed.applianceCategory
			: undefined,
		selectedElasticId: parsed.selectedElasticId !== undefined && parsed.selectedElasticId !== null
			? String(parsed.selectedElasticId)
			: (parsed.selectedElasticId === null ? null : undefined),
		selectedActionIds: Array.isArray(parsed.selectedActionIds)
			? parsed.selectedActionIds.map(String)
			: undefined,
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
		upperArchwire: parsed.upperArchwire ? String(parsed.upperArchwire) : undefined,
		lowerArchwire: parsed.lowerArchwire ? String(parsed.lowerArchwire) : undefined,
		elastics: parsed.elastics ? String(parsed.elastics) : undefined,
		lastActionDate: parsed.lastActionDate ? String(parsed.lastActionDate) : undefined,
		lastActionSummary: parsed.lastActionSummary ? String(parsed.lastActionSummary) : undefined,
		lastSoapSummary: parsed.lastSoapSummary ? String(parsed.lastSoapSummary) : undefined,
		wearDaysPerAligner: hasAlignerSignals ? (Number(parsed.wearDaysPerAligner) || 14) : undefined,
		nextVisitRecommendedDate: parsed.nextVisitRecommendedDate ? String(parsed.nextVisitRecommendedDate) : undefined,
		angleClass: parsed.angleClass ? String(parsed.angleClass) : undefined,
		verticalBite: parsed.verticalBite ? String(parsed.verticalBite) : undefined,
		overjetMm: typeof parsed.overjetMm === "number" && Number.isFinite(parsed.overjetMm) ? parsed.overjetMm : undefined,
		overbitePercent: typeof parsed.overbitePercent === "number" && Number.isFinite(parsed.overbitePercent) ? parsed.overbitePercent : undefined,
		anbAngle: typeof parsed.anbAngle === "number" && Number.isFinite(parsed.anbAngle) ? parsed.anbAngle : undefined,
		skeletalClass: parsed.skeletalClass ? String(parsed.skeletalClass) : undefined,
		treatmentPlanId: parsed.treatmentPlanId ? String(parsed.treatmentPlanId) : undefined,
	};
}

export const extractOrthoRecord = parseOrthoData;

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
