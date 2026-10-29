/**
 * DENTE Dental CRM — Endodontic SSOT Canal Data & Clinical Standards
 * apps/web/src/components/endo/endoCanalData.ts
 *
 * Канонический источник анатомических норм FDI (11..48, 51..85),
 * машинных NiTi-систем, ирригантов, силеров и протоколов обтурации (Мандаты 8e, 8n, 8wy).
 */

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

export {
	ALL_ISO_ENDO_OPTIONS,
	applyAnatomicalWorkingLengths,
	applyCaOh2EndoProtocol,
	applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPeriodontitisTempProtocol,
	applyPrimaryEndoProtocol,
	applyPulpitisObturationProtocol,
	applyPulpitisProtocol,
	applyPulpitisVisit1Protocol,
	applyRetreatmentEndoProtocol,
	applyStandardEndoProtocol,
	CANAL_NAME_OPTIONS,
	CAOH2_ENDO_PRESET,
	ENDO_SEALER_OPTIONS,
	EXPRESS_APICAL_OBTURATION_PRESET,
	EXTENDED_MAF_ISO_OPTIONS,
	formatEndoCanalsTable043,
	formatEndoPatientMemo,
	generateEndoCanalsTable043,
	generateEndoProtocol043,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	getIsoEndoColorInfo,
	ISO_ENDO_COLORS,
	ISO_ENDO_COLORS_MAP,
	MAF_ISO_OPTIONS,
	OBTURATION_PERMANENT_PRESET,
	OBTURATION_TECHNIQUE_OPTIONS,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	PRIMARY_ENDO_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PULPITIS_VISIT1_PRESET,
	QUICK_LENGTH_PRESETS,
	REFERENCE_POINT_OPTIONS,
	RETREATMENT_ENDO_PRESET,
	STANDARD_ENDO_PRESET,
	TAPER_OPTIONS,
	calculateEndoBillingAndMaterialsEstimate,
	safeCanalWorkingLengthRatio,
	isRvgBlockingEndoStage,
} from "@dental/shared";

export type EndoStageStamp = "COMPLETED" | "TEMP_CAOH2" | "DRAFT";

export interface QuickCanalState {
	id: string;
	name: string;
	workingLengthMm: number;
	masterApicalFile: string;
	taper: string;
	obturationType: "gutta_sealer" | "temp_caoh2" | "bioceramic";
	sealer: string;
	isObliterated?: boolean;
}

export interface ChairsideEndoQuickBarProps {
	readonly activeTooth?: number | undefined;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly isLocked?: boolean | undefined;
	readonly onInsertToDiary?: ((soapText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onOpenFullModal?: (() => void) | undefined;
	readonly className?: string | undefined;
}

/** Машинные NiTi-системы, используемые в доказательной эндодонтии (ESE / СтАР) */
export const NITI_SYSTEM_OPTIONS = [
	"WaveOne Gold (Dentsply Sirona)",
	"ProTaper Gold / Next (Dentsply)",
	"ProTaper Ultimate (Dentsply)",
	"Mtwo (VDW)",
	"Reciproc Blue (VDW)",
	"SOCO SC / SC PRO",
	"Ручные K-Flex / K-Files (Maillefer)",
] as const;

/** Растворы для протокола химической очистки и дезинфекции */
export const IRRIGATION_SOLUTIONS = [
	"NaOCl 3% + EDTA 17% (УЗ-активация)",
	"NaOCl 5.25% + EDTA 17%",
	"Хлоргексидин 2% (при перелечивании)",
	"Дистиллированная вода / Физраствор",
] as const;

/** Силеры и герметики для постоянной обтурации */
export const CURATED_SEALERS = [
	"AH Plus (эпоксидный герметик)",
	"TotalFill BC Sealer (биокерамика)",
	"BioRoot RCS (Septodont)",
	"CeraSeal (биокерамика)",
	"Sealapex (полимерный)",
] as const;

/** Временные внутриканальные вложения */
export const TEMP_MEDICATIONS = [
	"Каласепт (Ca(OH)2 водорастворимый)",
	"Metapex (гидроксид кальция с йодоформом)",
	"Пульпосептин",
	"Cresophene",
] as const;

export const QUICK_LENGTH_CHIPS = [19, 20, 21, 21.5, 22] as const;

export const QUICK_MAF_OPTIONS = [
	{ label: "25/.04", maf: "#25", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "30/.04", maf: "#30", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "25/.06", maf: "#25", taper: ".06", system: "ProTaper / NiTi" },
	{ label: "20/.04", maf: "#20", taper: ".04", system: "ProTaper / NiTi" },
] as const;

export const CURATED_ISO_MAF_OPTIONS = [
	"ISO 06 (#06 розовый)", "ISO 08 (#08 серый)", "ISO 10 (#10 фиолетовый)",
	"ISO 15 (#15 белый)", "ISO 20 (#20 жёлтый)", "ISO 25 (#25 красный)",
	"ISO 30 (#30 синий)", "ISO 35 (#35 зелёный)", "ISO 40 (#40 чёрный)",
	"ISO 45 (#45 белый)", "ISO 50 (#50 жёлтый)", "ISO 55 (#55 красный)", "ISO 60 (#60 синий)",
] as const;

export function formatWorkingLengthDisplay(wl: unknown): string {
	if (wl === null || wl === undefined || wl === "" || wl === 0) return "—";
	const num = typeof wl === "number" ? wl : Number.parseFloat(String(wl));
	if (Number.isNaN(num) || !Number.isFinite(num) || num <= 0) return "—";
	return `${(Math.round(num * 2) / 2).toFixed(1)} мм`;
}

/** Анатомические каналы по умолчанию для бара у кресла (First Principles) */
export function getChairsideDefaultCanals(toothNumber: number): QuickCanalState[] {
	const isUpperMolar = (toothNumber >= 16 && toothNumber <= 18) || (toothNumber >= 26 && toothNumber <= 28);
	const isLowerMolar = (toothNumber >= 36 && toothNumber <= 38) || (toothNumber >= 46 && toothNumber <= 48);
	const isUpperPremolar = toothNumber === 14 || toothNumber === 24;

	if (isUpperMolar) {
		return [
			{ id: `c-mb-${Date.now()}-1`, name: "MB", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-db-${Date.now()}-2`, name: "DB", workingLengthMm: 20.0, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-p-${Date.now()}-3`, name: "P", workingLengthMm: 22.0, masterApicalFile: "#30", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
		];
	}
	if (isLowerMolar) {
		return [
			{ id: `c-m-${Date.now()}-1`, name: "M", workingLengthMm: 21.0, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-d-${Date.now()}-2`, name: "D", workingLengthMm: 21.5, masterApicalFile: "#30", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
		];
	}
	if (isUpperPremolar) {
		return [
			{ id: `c-b-${Date.now()}-1`, name: "B", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-p-${Date.now()}-2`, name: "P", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
		];
	}
	return [
		{ id: `c-main-${Date.now()}-1`, name: "Основной", workingLengthMm: 22.0, masterApicalFile: "#30", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
	];
}

export function sanitizeCanalsForSubmission(
	inputCanals: EndoCanalData[],
	activeTooth: number,
	stageStamp: EndoStageStamp,
	getAnatomicalWl: (tooth: number, canal?: string) => number,
): EndoCanalData[] {
	return inputCanals.map((c) => {
		let safeWl: number | string = c.workingLengthMm;
		if (c.isObliterated) {
			safeWl = 0;
		} else if (typeof safeWl === "number") {
			safeWl = Number.isNaN(safeWl) || !Number.isFinite(safeWl) || safeWl <= 0 ? getAnatomicalWl(activeTooth, c.canalName) : Math.round(safeWl * 2) / 2;
		} else if (typeof safeWl === "string" && safeWl.trim()) {
			const parsed = Number.parseFloat(safeWl);
			safeWl = !Number.isNaN(parsed) && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 2) / 2 : getAnatomicalWl(activeTooth, c.canalName);
		} else {
			safeWl = getAnatomicalWl(activeTooth, c.canalName);
		}

		return {
			...c,
			isObliterated: Boolean(c.isObliterated),
			workingLengthMm: safeWl,
			masterApicalFile: c.masterApicalFile || "ProTaper F2 (#25)",
			taper: c.taper || ".06 (Конусность 6%)",
			referencePoint: c.referencePoint || "Бугор зуба",
			obturationTechnique: c.obturationTechnique || (stageStamp === "TEMP_CAOH2" ? "Временная обтурация Ca(OH)2 (Каласепт)" : "Гуттаперча + Силер (AH Plus) латерально"),
		};
	});
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
