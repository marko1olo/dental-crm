import type {
	EndoCanalData,
	EndoPatientMemoParams,
	EndoProtocolPreset,
	EndoToothClinicalData,
	IsoEndoColorInfo,
	IsoEndoSize,
	EndoTreatmentBillingEstimateResult,
	Endo804nServiceEstimate,
	EndoMaterialConsumableEstimate,
} from "@dental/shared";

/** Клинический штамп этапа эндодонтического лечения (Мандат 8e) */
export type EndoStageStamp = "COMPLETED" | "TEMP_CAOH2" | "DRAFT";

/**
 * Расширенная практическая линейка MAF файлов ISO (ISO 3630-1),
 * включающая малые ручные патфайндинг-номера (06, 08, 10) и основные мастер-файлы (15..60).
 */
export const CURATED_ISO_MAF_OPTIONS = [
	"ISO 06 (#06 розовый)",
	"ISO 08 (#08 серый)",
	"ISO 10 (#10 фиолетовый)",
	"ISO 15 (#15 белый)",
	"ISO 20 (#20 жёлтый)",
	"ISO 25 (#25 красный)",
	"ISO 30 (#30 синий)",
	"ISO 35 (#35 зелёный)",
	"ISO 40 (#40 чёрный)",
	"ISO 45 (#45 белый)",
	"ISO 50 (#50 жёлтый)",
	"ISO 55 (#55 красный)",
	"ISO 60 (#60 синий)",
] as const;

/**
 * Безопасное форматирование рабочей длины корневого канала:
 * Гарантирует точность до 0.5 мм (Мандат 8b) и 100% исключает утечки NaN/undefined.
 */
export function formatWorkingLengthDisplay(wl: unknown): string {
	if (wl === null || wl === undefined || wl === "" || wl === 0) return "—";
	const num = typeof wl === "number" ? wl : Number.parseFloat(String(wl));
	if (Number.isNaN(num) || !Number.isFinite(num) || num <= 0) return "—";
	const rounded = Math.round(num * 2) / 2;
	return `${rounded.toFixed(1)} мм`;
}

export type {
	EndoCanalData,
	EndoPatientMemoParams,
	EndoProtocolPreset,
	EndoToothClinicalData,
	IsoEndoColorInfo,
	IsoEndoSize,
	EndoTreatmentBillingEstimateResult,
	Endo804nServiceEstimate,
	EndoMaterialConsumableEstimate,
};
