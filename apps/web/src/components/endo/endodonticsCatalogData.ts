/**
 * DENTE Dental CRM — Canonical Endodontics Catalog Data & SSOT Protocols
 * apps/web/src/components/endo/endodonticsCatalogData.ts
 *
 * Канонический справочник эндодонтии, анатомии FDI (11..48), рабочих длин (WL 16–26 мм, Apex 0.0),
 * MAF (#20.04..#35.04), ирригации (NaOCl 3% + EDTA 17% УЗ) и расчета в копейках BigInt (Мандаты 8e, 8n, 8wy).
 */

import type { EndoCanalData, EndoPatientMemoParams, EndoToothClinicalData } from "@dental/shared";

export {
	ALL_ISO_ENDO_OPTIONS, applyAnatomicalWorkingLengths, applyCaOh2EndoProtocol, applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol, applyPeriodontitisDestructiveProtocol, applyPeriodontitisTempProtocol,
	applyPrimaryEndoProtocol, applyPulpitisObturationProtocol, applyPulpitisProtocol, applyPulpitisVisit1Protocol,
	applyRetreatmentEndoProtocol, applyStandardEndoProtocol, CANAL_NAME_OPTIONS, CAOH2_ENDO_PRESET, ENDO_SEALER_OPTIONS,
	EXPRESS_APICAL_OBTURATION_PRESET, EXTENDED_MAF_ISO_OPTIONS, formatEndoCanalsTable043, formatEndoPatientMemo,
	generateEndoCanalsTable043, generateEndoProtocol043, getAnatomicalWorkingLength, getDefaultCanalsForTooth,
	getIsoEndoColorInfo, ISO_ENDO_COLORS, ISO_ENDO_COLORS_MAP, MAF_ISO_OPTIONS, OBTURATION_PERMANENT_PRESET,
	OBTURATION_TECHNIQUE_OPTIONS, PERIODONTITIS_DESTRUCTIVE_PRESET, PERIODONTITIS_TEMP_PRESET, PRIMARY_ENDO_PRESET,
	PULPITIS_COMPLETE_PRESET, PULPITIS_OBTURATION_PRESET, PULPITIS_VISIT1_PRESET, QUICK_LENGTH_PRESETS,
	REFERENCE_POINT_OPTIONS, RETREATMENT_ENDO_PRESET, STANDARD_ENDO_PRESET, TAPER_OPTIONS,
	calculateEndoBillingAndMaterialsEstimate, safeCanalWorkingLengthRatio, isRvgBlockingEndoStage,
} from "@dental/shared";

export type EndoStageStamp = "COMPLETED" | "TEMP_CAOH2" | "DRAFT";
export type EndoProtocolPresetId = "pulpitis_1visit" | "periodontitis_temp" | "retreatment_unsealing";

export interface QuickCanalState {
	id: string; name: string; workingLengthMm: number; masterApicalFile: string;
	taper: string; obturationType: "gutta_sealer" | "temp_caoh2" | "bioceramic";
	sealer: string; isObliterated?: boolean;
}

/** Канонические размеры мастер-файла (Sweet Spot MAF) */
export const CANONICAL_MAF_SIZES = [
	{ label: "#20.04", maf: "#20", taper: ".04", system: "NiTi Rotary" },
	{ label: "#25.04", maf: "#25", taper: ".04", system: "NiTi Rotary" },
	{ label: "#25.06", maf: "#25", taper: ".06", system: "NiTi Rotary" },
	{ label: "#30.04", maf: "#30", taper: ".04", system: "NiTi Rotary" },
	{ label: "#35.04", maf: "#35", taper: ".04", system: "NiTi Rotary" },
] as const;

/** Канонические длины для быстрого клика (WL 19–23 мм) */
export const CANONICAL_WL_CHIPS = [19.0, 20.0, 21.0, 21.5, 22.0, 23.0] as const;

/** Протокол ирригации: гипохлорит натрия NaOCl 3% + ЭДТА 17% + УЗ-активация */
export const CANONICAL_IRRIGATION_SOLUTIONS = [
	"NaOCl 3% + EDTA 17% (УЗ-активация)",
	"NaOCl 5.25% + EDTA 17% (УЗ-активация)",
	"Хлоргексидин 2% (при перелечивании)",
	"Стерильный физраствор / вода",
] as const;

/** Машинные NiTi-системы */
export const NITI_SYSTEM_OPTIONS = [
	"WaveOne Gold / ProTaper Next (Dentsply)",
	"ProTaper Ultimate (Dentsply Sirona)",
	"Mtwo / Reciproc Blue (VDW)",
	"SOCO SC / SC PRO",
	"Ручные K-Files (Maillefer)",
] as const;

/** Силеры и герметики */
export const CURATED_SEALERS = [
	"AH Plus (эпоксидный герметик)",
	"TotalFill BC Sealer (биокерамика)",
	"BioRoot RCS (биокерамика)",
	"CeraSeal (биокерамика)",
	"Каласепт (Ca(OH)2 водорастворимый)",
] as const;

export const CURATED_ISO_MAF_OPTIONS = [
	"ISO 15 (#15 белый)", "ISO 20 (#20 жёлтый)", "ISO 25 (#25 красный)",
	"ISO 30 (#30 синий)", "ISO 35 (#35 зелёный)", "ISO 40 (#40 чёрный)", "ISO 50 (#50 жёлтый)",
] as const;

/** Классификация анатомической конфигурации каналов по Vertucci (I..VIII) */
export const VERTUCCI_CANAL_TYPES = [
	{ type: "Type I", formula: "1-1", description: "Один канал от пульпарной камеры до верхушки апекса" },
	{ type: "Type II", formula: "2-1", description: "Два устья сливаются в один общий канал у верхушки" },
	{ type: "Type III", formula: "1-2-1", description: "Одно устье раздваивается в теле и сливается у апекса" },
	{ type: "Type IV", formula: "2-2", description: "Два полностью независимых канала с двумя апикальными отверстиями" },
	{ type: "Type V", formula: "1-2", description: "Один канал делится перед апексом на два независимых отверстия" },
	{ type: "Type VI", formula: "2-1-2", description: "Два канала сливаются в средней трети и вновь делятся у верхушки" },
	{ type: "Type VII", formula: "1-2-1-2", description: "Сложная вариация с промежуточными анастомозами" },
	{ type: "Type VIII", formula: "3-3", description: "Три независимых канала с тремя апикальными отверстиями" },
] as const;

export interface ToothCanalAnatomySpec {
	minWlMm: number;
	maxWlMm: number;
	avgWlMm: number;
	typicalCanalsCount: number;
	vertucciType: string;
}

/** Анатомические границы и статистика длин корней зубов человека по FDI (11..48) */
export function getToothCanalAnatomySpec(toothNumber: number): ToothCanalAnatomySpec {
	const t = Number(toothNumber);
	// Резцы и клыки верхней челюсти
	if (t === 11 || t === 21) return { minWlMm: 20.0, maxWlMm: 25.0, avgWlMm: 22.5, typicalCanalsCount: 1, vertucciType: "Type I" };
	if (t === 12 || t === 22) return { minWlMm: 19.0, maxWlMm: 24.5, avgWlMm: 22.0, typicalCanalsCount: 1, vertucciType: "Type I" };
	if (t === 13 || t === 23) return { minWlMm: 23.0, maxWlMm: 30.0, avgWlMm: 26.5, typicalCanalsCount: 1, vertucciType: "Type I" };
	// Премоляры верхней челюсти
	if (t === 14 || t === 24) return { minWlMm: 18.5, maxWlMm: 24.0, avgWlMm: 21.5, typicalCanalsCount: 2, vertucciType: "Type IV" };
	if (t === 15 || t === 25) return { minWlMm: 18.5, maxWlMm: 23.5, avgWlMm: 21.0, typicalCanalsCount: 1, vertucciType: "Type II" };
	// Моляры верхней челюсти
	if (t === 16 || t === 26) return { minWlMm: 18.0, maxWlMm: 23.5, avgWlMm: 20.8, typicalCanalsCount: 4, vertucciType: "Type II/IV (MB1, MB2)" };
	if (t === 17 || t === 27) return { minWlMm: 17.5, maxWlMm: 22.5, avgWlMm: 20.0, typicalCanalsCount: 3, vertucciType: "Type I/IV" };
	if (t === 18 || t === 28) return { minWlMm: 16.0, maxWlMm: 21.0, avgWlMm: 18.5, typicalCanalsCount: 3, vertucciType: "Type I (Вариабельно)" };
	// Резцы и клыки нижней челюсти
	if (t === 31 || t === 41 || t === 32 || t === 42) return { minWlMm: 18.5, maxWlMm: 23.5, avgWlMm: 20.8, typicalCanalsCount: 1, vertucciType: "Type I (до 30% Type II)" };
	if (t === 33 || t === 43) return { minWlMm: 22.0, maxWlMm: 28.5, avgWlMm: 25.0, typicalCanalsCount: 1, vertucciType: "Type I" };
	// Премоляры нижней челюсти
	if (t === 34 || t === 44) return { minWlMm: 19.0, maxWlMm: 24.5, avgWlMm: 21.5, typicalCanalsCount: 1, vertucciType: "Type I" };
	if (t === 35 || t === 45) return { minWlMm: 19.5, maxWlMm: 25.0, avgWlMm: 22.0, typicalCanalsCount: 1, vertucciType: "Type I" };
	// Моляры нижней челюсти
	if (t === 36 || t === 46) return { minWlMm: 19.0, maxWlMm: 24.0, avgWlMm: 21.0, typicalCanalsCount: 3, vertucciType: "Type II/IV (Mesial)" };
	if (t === 37 || t === 47) return { minWlMm: 18.5, maxWlMm: 23.0, avgWlMm: 20.5, typicalCanalsCount: 3, vertucciType: "Type I/IV" };
	if (t === 38 || t === 48) return { minWlMm: 16.5, maxWlMm: 21.5, avgWlMm: 19.0, typicalCanalsCount: 2, vertucciType: "Type I (C-Shape)" };
	// Дефолтная норма
	return { minWlMm: 18.0, maxWlMm: 24.0, avgWlMm: 21.0, typicalCanalsCount: 1, vertucciType: "Type I" };
}

export function formatWorkingLengthDisplay(wl: unknown): string {
	if (wl === null || wl === undefined || wl === "" || wl === 0) return "—";
	const num = typeof wl === "number" ? wl : Number.parseFloat(String(wl));
	if (Number.isNaN(num) || !Number.isFinite(num) || num <= 0) return "—";
	return `${(Math.round(num * 2) / 2).toFixed(1)} мм`;
}

export function getChairsideDefaultCanals(toothNumber: number): QuickCanalState[] {
	const isUpperMolar = (toothNumber >= 16 && toothNumber <= 18) || (toothNumber >= 26 && toothNumber <= 28);
	const isLowerMolar = (toothNumber >= 36 && toothNumber <= 38) || (toothNumber >= 46 && toothNumber <= 48);
	const isUpperPremolar = toothNumber === 14 || toothNumber === 24 || toothNumber === 15 || toothNumber === 25;

	if (isUpperMolar) {
		return [
			{ id: `c-mb1-${Date.now()}-1`, name: "MB", workingLengthMm: 21.0, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
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

export interface CanonicalEndoProtocolDefinition {
	id: EndoProtocolPresetId;
	title: string;
	description: string;
	stageStamp: EndoStageStamp;
	defaultSealer: string;
	obturationTechnique: string;
	irrigation: string;
	rotarySystem: string;
	generateSoapNote: (params: { activeTooth: number; toothAnatomicalName: string; canals: QuickCanalState[] }) => string;
}

export const CANONICAL_ENDO_PROTOCOLS: Record<EndoProtocolPresetId, CanonicalEndoProtocolDefinition> = {
	pulpitis_1visit: {
		id: "pulpitis_1visit",
		title: "Пульпит (1 визит)",
		description: "Витальная экстирпация, NiTi обработка, 3D обтурация гуттаперча + AH Plus",
		stageStamp: "COMPLETED",
		defaultSealer: "AH Plus (эпоксидный герметик)",
		obturationTechnique: "Гуттаперча + Силер (AH Plus) латерально",
		irrigation: "NaOCl 3% + EDTA 17% (УЗ-активация)",
		rotarySystem: "WaveOne Gold / ProTaper Next",
		generateSoapNote: ({ activeTooth, toothAnatomicalName, canals }) => {
			const canalsReport = canals.map((c) => c.isObliterated ? `• Канал ${c.name}: ОБЛИТЕРИРОВАН (0 мм)` : `• Канал ${c.name}: WL = ${c.workingLengthMm.toFixed(1)} мм (Apex 0.0), MAF = ${c.masterApicalFile}/${c.taper}, обтурация гуттаперча + AH Plus`).join("\n");
			return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName}) — ПУЛЬПИТ В 1 ВИЗИТ]\n` +
				`S: Жалобы на острые температурные и самопроизвольные приступообразные боли в зубе #${activeTooth}.\n` +
				`O: Проведена проводниковая/инфильтрационная анестезия. Изоляция коффердамом. Раскрытие полости зуба #${activeTooth}, витальная экстирпация пульпы.\n` +
				`Механическая обработка каналов машинной NiTi-системой (ProTaper / WaveOne Gold):\n${canalsReport}\n` +
				`Ирригация: медикаментозная обработка NaOCl 3% с УЗ-активацией и EDTA 17%, высушивание стерильными бумажными штифтами.\n` +
				`A: Острый очаговый/диффузный пульпит зуба #${activeTooth} (K04.0).\n` +
				`P: Постоянная трёхмерная обтурация каналов гуттаперчей с AH Plus методом латеральной компакции до физиологического апекса. Рентген-контроль: каналы гомогенно обтурированы до верхушки корня. Герметичная реставрация.`;
		},
	},
	periodontitis_temp: {
		id: "periodontitis_temp",
		title: "Периодонтит (Ca(OH)2)",
		description: "Дезинфекция, временная обтурация гидроксидом кальция Calcept на 10–14 дней",
		stageStamp: "TEMP_CAOH2",
		defaultSealer: "Каласепт (Ca(OH)2 водорастворимый)",
		obturationTechnique: "Временная обтурация Ca(OH)2 (Каласепт)",
		irrigation: "NaOCl 3% + EDTA 17% (УЗ-активация)",
		rotarySystem: "WaveOne Gold / ProTaper Next",
		generateSoapNote: ({ activeTooth, toothAnatomicalName, canals }) => {
			const canalsReport = canals.map((c) => c.isObliterated ? `• Канал ${c.name}: ОБЛИТЕРИРОВАН (0 мм)` : `• Канал ${c.name}: WL = ${c.workingLengthMm.toFixed(1)} мм (Apex 0.0), MAF = ${c.masterApicalFile}/${c.taper}, временная паста Ca(OH)2`).join("\n");
			return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName}) — ПЕРИОДОНТИТ 1-Й ВИЗИТ]\n` +
				`S: Жалобы на ноющие боли при накусывании и чувство распирания в зубе #${activeTooth}.\n` +
				`O: Проведена анестезия, изоляция коффердамом. Раскрытие полости зуба #${activeTooth}, эвакуация гангренозного распада.\n` +
				`Инструментальная обработка каналов машинной NiTi-системой:\n${canalsReport}\n` +
				`Ирригация: обильная обработка NaOCl 3% с УЗ-активацией и EDTA 17%, высушивание бумажными штифтами.\n` +
				`A: Хронический апикальный периодонтит зуба #${activeTooth} (K04.5).\n` +
				`P: Временная обтурация корневых каналов лечебной пастой гидроксида кальция Ca(OH)2 (Каласепт) на 10–14 дней. Герметичная временная пломба. Назначен 2-й визит.`;
		},
	},
	retreatment_unsealing: {
		id: "retreatment_unsealing",
		title: "Распломбировка каналов",
		description: "Удаление гуттаперчи / резорцина / извлечение штифта, антисептическая ревизия",
		stageStamp: "TEMP_CAOH2",
		defaultSealer: "Metapex (Ca(OH)2 с йодоформом)",
		obturationTechnique: "Временная паста Ca(OH)2 с йодоформом",
		irrigation: "Хлоргексидин 2% + EDTA 17% (УЗ-активация)",
		rotarySystem: "D-RaCe / ProTaper Retreatment",
		generateSoapNote: ({ activeTooth, toothAnatomicalName, canals }) => {
			const canalsReport = canals.map((c) => c.isObliterated ? `• Канал ${c.name}: ОБЛИТЕРИРОВАН (0 мм)` : `• Канал ${c.name}: распломбирован на всю глубину, WL = ${c.workingLengthMm.toFixed(1)} мм (Apex 0.0), MAF = ${c.masterApicalFile}/${c.taper}`).join("\n");
			return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName}) — РАСПЛОМБИРОВКА И РЕТРИТМЕНТ]\n` +
				`S: Направление на повторное эндодонтическое лечение зуба #${activeTooth} в связи с деструктивным процессом у верхушки корня.\n` +
				`O: Анестезия, коффердам. Снятие старой реставрации, распломбировка каналов эндосольвентом и ретритмент-файлами D-RaCe.\n` +
				`Ревизия корневых каналов:\n${canalsReport}\n` +
				`Ирригация: 2% раствор Хлоргексидина, 17% EDTA с ультразвуковой активацией.\n` +
				`A: Хронический гранулирующий периодонтит / несостоятельность ранее пломбированных каналов зуба #${activeTooth} (K04.5).\n` +
				`P: Внутриканальное введение антисептической пасты Ca(OH)2 с йодоформом (Metapex). Герметичная повязка. Контрольный осмотр через 14 дней.`;
		},
	},
};

export interface EndoBillingCostBreakdown {
	readonly totalKopecks: bigint;
	readonly totalRubles: number;
	readonly services: ReadonlyArray<{ readonly code: string; readonly title: string; readonly priceKopecks: bigint; readonly quantity: number }>;
}

export function calculateEndoTreatmentCostKopecks(params: {
	toothNumber: number; canalsCount: number; protocolId: EndoProtocolPresetId; withRvg?: boolean; withMicroscope?: boolean;
}): EndoBillingCostBreakdown {
	const count = Math.max(1, params.canalsCount);
	const services: Array<{ code: string; title: string; priceKopecks: bigint; quantity: number }> = [];

	if (params.protocolId === "retreatment_unsealing") {
		services.push({ code: "A16.07.082.001", title: `Распломбировка корневого канала зуба #${params.toothNumber} (х${count})`, priceKopecks: 220_000n * BigInt(count), quantity: count });
	}
	services.push({ code: "A16.07.030.001", title: `Инструментальная обработка корневого канала зуба #${params.toothNumber} машинным NiTi (х${count})`, priceKopecks: 250_000n * BigInt(count), quantity: count });
	services.push({ code: "A16.07.030.002", title: `Антисептическая ирригация NaOCl 3% + EDTA 17% с УЗ-активацией (зуб #${params.toothNumber})`, priceKopecks: 120_000n, quantity: 1 });

	if (params.protocolId === "periodontitis_temp" || params.protocolId === "retreatment_unsealing") {
		services.push({ code: "A16.07.082.002", title: `Временное пломбирование каналов лечебной пастой Ca(OH)2 (х${count})`, priceKopecks: 150_000n * BigInt(count), quantity: count });
	} else {
		services.push({ code: "A16.07.008.001", title: `Пломбирование корневого канала гуттаперчей и силером AH Plus (х${count})`, priceKopecks: 280_000n * BigInt(count), quantity: count });
	}

	if (params.withRvg !== false) {
		services.push({ code: "A06.07.003", title: "Прицельная радиовизиография контрольная (1 снимок)", priceKopecks: 60_000n, quantity: 1 });
	}
	if (params.withMicroscope) {
		services.push({ code: "A16.07.030.005", title: "Использование операционного микроскопа в эндодонтии", priceKopecks: 300_000n, quantity: 1 });
	}

	const totalKopecks = services.reduce((acc, s) => acc + s.priceKopecks, 0n);
	return { totalKopecks, totalRubles: Number(totalKopecks / 100n), services };
}

export function sanitizeCanalsForSubmission(
	inputCanals: EndoCanalData[], activeTooth: number, stageStamp: EndoStageStamp, getAnatomicalWl: (tooth: number, canal?: string) => number,
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
			masterApicalFile: c.masterApicalFile || "#25.04",
			taper: c.taper || ".04 (Конусность 4%)",
			referencePoint: c.referencePoint || "Бугор зуба",
			obturationTechnique: c.obturationTechnique || (stageStamp === "TEMP_CAOH2" ? "Временная обтурация Ca(OH)2 (Каласепт)" : "Гуттаперча + Силер (AH Plus) латерально"),
		};
	});
}
