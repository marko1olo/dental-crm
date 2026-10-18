import { apply1ClickClinicalAutopilot } from "../presets/autopilotPresets";
import type {
	ChairsideSmartProtocolKey,
	ChairsideSmartProtocolResult,
} from "./clinicalWorkflowTypes";

/**
 * Генератор клинических протоколов у кресла (МКБ-10 + СтАР + МЗ РФ).
 */
export function buildChairsideSmartProtocol(
	key: ChairsideSmartProtocolKey,
	targetTooth?: number | null,
	options?: {
		surfaces?: string | undefined;
		isLocked?: boolean | undefined;
	},
): ChairsideSmartProtocolResult {
	const toothNum = targetTooth ? Number(targetTooth) : undefined;
	const toothLabel = toothNum ? `зуба ${toothNum}` : "зуба";
	const rawSurfaces = (options?.surfaces ?? "").trim();
	const hasSurfaces =
		rawSurfaces.length > 0 &&
		rawSurfaces.toLowerCase() !== "undefined" &&
		rawSurfaces.toLowerCase() !== "null";
	const surfStr = hasSurfaces ? ` (${rawSurfaces.toUpperCase()})` : "";
	const dateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	const auditStamp = options?.isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";

	const autopilotResult = apply1ClickClinicalAutopilot(key, {
		toothNumber: toothNum,
		surfaces: hasSurfaces ? rawSurfaces : undefined,
	});
	const preset = autopilotResult.preset;

	let diagnosis = "";
	switch (key) {
		case "caries":
			diagnosis = `K02.1 Кариес дентина ${toothLabel}${surfStr}`.trim();
			break;
		case "pulpitis":
			diagnosis = `K04.0 Острый пульпит ${toothLabel}`.trim();
			break;
		case "periodontitis":
			diagnosis = `K04.5 Хронический апикальный периодонтит ${toothLabel}`.trim();
			break;
		case "hygiene":
			diagnosis = toothNum
				? `K05.1 Хронический катаральный гингивит (${toothLabel}) / Профгигиена`
				: "K05.1 Хронический катаральный гингивит / Профгигиена";
			break;
		case "extraction":
			diagnosis = `K01.1 Простое удаление ${toothLabel}`.trim();
			break;
	}

	return {
		key,
		icd10: preset.icd10,
		code: preset.icd10,
		title: preset.shortBadge || preset.title,
		diagnosis,
		complaint: preset.complaint,
		anamnesis: preset.anamnesis,
		objectiveStatus: preset.statusLocalis,
		treatmentPlan: `${autopilotResult.diary.treatmentDescription}${auditStamp}`,
		recommendations: preset.recommendations ?? "",
		targetTooth: toothNum,
	};
}
