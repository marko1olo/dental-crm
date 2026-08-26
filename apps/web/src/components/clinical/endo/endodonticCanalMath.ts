/**
 * DENTE Dental CRM — Endodontic Canal Morphology & Clinical Protocol Engine
 *
 * Implements:
 * - Full FDI 11..48 (and 51..85 deciduous) anatomical root canal morphology database
 * - Standard canal parameters (Reference cusp, WL mm, IAF/MAF ISO 15..80, Taper, Obturation methods, Sealers)
 * - ISO 3630 Color standard for endodontic instruments
 * - 1-Click irrigation protocol presets (NaOCl 3.0%/5.25%, EDTA 17%, PUI ultrasonic activation, CHX 2%)
 * - Automated Form 043/u clinical diary generator compliant with Russian Ministry of Health and StAR standards
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. ISO 3630 COLOR & INSTRUMENT CODING
// ─────────────────────────────────────────────────────────────────────────────

export interface IsoFileColor {
	readonly iso: number;
	readonly colorNameRu: string;
	readonly hexColor: string;
	readonly textColor: string;
	readonly d0DiameterMm: number;
}

export const ISO_FILE_COLORS: Record<number, IsoFileColor> = {
	6: { iso: 6, colorNameRu: "Розовый", hexColor: "#f472b6", textColor: "#ffffff", d0DiameterMm: 0.06 },
	8: { iso: 8, colorNameRu: "Серый", hexColor: "#9ca3af", textColor: "#111827", d0DiameterMm: 0.08 },
	10: { iso: 10, colorNameRu: "Фиолетовый", hexColor: "#a855f7", textColor: "#ffffff", d0DiameterMm: 0.10 },
	15: { iso: 15, colorNameRu: "Белый", hexColor: "#ffffff", textColor: "#111827", d0DiameterMm: 0.15 },
	20: { iso: 20, colorNameRu: "Желтый", hexColor: "#facc15", textColor: "#111827", d0DiameterMm: 0.20 },
	25: { iso: 25, colorNameRu: "Красный", hexColor: "#ef4444", textColor: "#ffffff", d0DiameterMm: 0.25 },
	30: { iso: 30, colorNameRu: "Синий", hexColor: "#3b82f6", textColor: "#ffffff", d0DiameterMm: 0.30 },
	35: { iso: 35, colorNameRu: "Зеленый", hexColor: "#22c55e", textColor: "#ffffff", d0DiameterMm: 0.35 },
	40: { iso: 40, colorNameRu: "Черный", hexColor: "#1e293b", textColor: "#ffffff", d0DiameterMm: 0.40 },
	45: { iso: 45, colorNameRu: "Белый", hexColor: "#ffffff", textColor: "#111827", d0DiameterMm: 0.45 },
	50: { iso: 50, colorNameRu: "Желтый", hexColor: "#facc15", textColor: "#111827", d0DiameterMm: 0.50 },
	55: { iso: 55, colorNameRu: "Красный", hexColor: "#ef4444", textColor: "#ffffff", d0DiameterMm: 0.55 },
	60: { iso: 60, colorNameRu: "Синий", hexColor: "#3b82f6", textColor: "#ffffff", d0DiameterMm: 0.60 },
	70: { iso: 70, colorNameRu: "Зеленый", hexColor: "#22c55e", textColor: "#ffffff", d0DiameterMm: 0.70 },
	80: { iso: 80, colorNameRu: "Черный", hexColor: "#1e293b", textColor: "#ffffff", d0DiameterMm: 0.80 },
};

export function getIsoColorInfo(iso: number): IsoFileColor {
	if (ISO_FILE_COLORS[iso]) {
		return ISO_FILE_COLORS[iso];
	}
	// Fallback for custom sizes
	return {
		iso,
		colorNameRu: "Пользовательский",
		hexColor: "#64748b",
		textColor: "#ffffff",
		d0DiameterMm: iso / 100,
	};
}

export function getAllIsoFiles(): IsoFileColor[] {
	return Object.values(ISO_FILE_COLORS);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TYPES & REGISTRIES
// ─────────────────────────────────────────────────────────────────────────────

export type EndoTaper = ".02" | ".04" | ".06" | ".07" | ".08" | ".10";

export type ObturationMethod =
	| "lateral_condensation"
	| "vertical_warm_gutta"
	| "continuous_wave"
	| "single_cone_bioceramic"
	| "carrier_based"
	| "temporary_caoh2";

export const OBTURATION_METHOD_LABELS: Record<ObturationMethod, { titleRu: string; descriptionRu: string }> = {
	lateral_condensation: {
		titleRu: "Латеральная компакция холодной гуттаперчи",
		descriptionRu: "Холодная латеральная конденсация мастер-штифта и дополнительных штифтов со спредером",
	},
	vertical_warm_gutta: {
		titleRu: "Вертикальная конденсация горячей гуттаперчи (BeeFill/Calamus)",
		descriptionRu: "Трехмерная обтурация разогретой термопластифицированной гуттаперчей с плаггерами (Backfill)",
	},
	continuous_wave: {
		titleRu: "Метод непрерывной волны (System B / Elements)",
		descriptionRu: "Апикальная пробка методом непрерывной волны тепла с последующим инжекционным заполнением",
	},
	single_cone_bioceramic: {
		titleRu: "Метод одного конуса с биокерамикой (TotalFill / Bio-C)",
		descriptionRu: "Гидравлическая обтурация биокерамическим силером и калиброванным гуттаперчевым штифтом",
	},
	carrier_based: {
		titleRu: "Обтураторы на носителе (Thermafil / GuttaCore)",
		descriptionRu: "Введение разогретого обтуратора на пластиковом/гуттаперчевом носителе на рабочую длину",
	},
	temporary_caoh2: {
		titleRu: "Временная обтурация гидроксидом кальция Ca(OH)2",
		descriptionRu: "Лечебная повязка пастой Ca(OH)2 (Каласепт, Метапекс) на 7–14 дней",
	},
};

export type SealerType =
	| "bioceramic"
	| "epoxy_resin"
	| "zinc_oxide_eugenol"
	| "calcium_silicate"
	| "iodoform_paste";

export const SEALER_TYPE_LABELS: Record<SealerType, { titleRu: string; brandExamples: string }> = {
	bioceramic: {
		titleRu: "Биокерамический силер",
		brandExamples: "TotalFill BC Sealer, Bio-C Sealer, AH Plus Bioceramic",
	},
	epoxy_resin: {
		titleRu: "Эпоксидный полимерный силер",
		brandExamples: "AH Plus, 2Seal, Adseal",
	},
	zinc_oxide_eugenol: {
		titleRu: "Цинкоксидэвгенольный силер",
		brandExamples: "Эндометазон, Canason, Tubli-Seal",
	},
	calcium_silicate: {
		titleRu: "Силикат кальция (MTA)",
		brandExamples: "MTA Fillapex, ProRoot MTA, Триоксидент",
	},
	iodoform_paste: {
		titleRu: "Йодоформная паста с Ca(OH)2",
		brandExamples: "Метапекс, Апексдент с йодоформом",
	},
};

export type InstrumentationSystem =
	| "rotary_niti"
	| "reciprocating"
	| "manual_k_files"
	| "ultrasonic";

export const INSTRUMENTATION_LABELS: Record<InstrumentationSystem, string> = {
	rotary_niti: "Вращающиеся Ni-Ti файлы (ProTaper / TruNatomy / SOCO / MTwo)",
	reciprocating: "Реципрокные Ni-Ti файлы (WaveOne Gold / Reciproc Blue)",
	manual_k_files: "Ручные K-файлы / K-Flex / Hedstroem (ISO 10-40)",
	ultrasonic: "Ультразвуковые эндочаки и алмазные насадки",
};

export type WorkingLengthMethod =
	| "apex_locator"
	| "radiography"
	| "tactile"
	| "combined";

export const WORKING_LENGTH_METHOD_LABELS: Record<WorkingLengthMethod, string> = {
	apex_locator: "Электронная апекслокация (EAL 0.0)",
	radiography: "Диагностическая радиовизиография (РВГ с файлом)",
	tactile: "Тактильный контроль апикального сужения",
	combined: "Комбинированный (Апекслокатор + Контрольная РВГ)",
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. CANAL RECORD SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export interface EndoCanalRecord {
	readonly id: string;
	readonly name: string; // e.g. "MB1", "MB2", "DB", "P", "ML", "D", "RE"
	readonly referencePoint: string; // e.g. "Медиально-щечный бугор", "Режущий край"
	readonly initialApicalFileIso: number; // IAF (e.g. 10 or 15)
	readonly masterApicalFileIso: number; // MAF (e.g. 25, 30, 35)
	readonly workingLengthMm: number; // WL in mm (e.g. 21.5)
	readonly workingLengthMethod: WorkingLengthMethod;
	readonly taper: EndoTaper;
	readonly instrumentation: InstrumentationSystem;
	readonly obturationMethod: ObturationMethod;
	readonly sealer: SealerType;
	readonly isObturated: boolean;
	readonly curvatureDegree?: number | undefined; // 0..60 degrees
	readonly notes?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. IRRIGATION PROTOCOLS
// ─────────────────────────────────────────────────────────────────────────────

export type IrrigationSolution =
	| "naocl_3"
	| "naocl_5"
	| "edta_17"
	| "chx_2"
	| "citric_10"
	| "saline"
	| "distilled_water";

export const IRRIGATION_SOLUTION_LABELS: Record<IrrigationSolution, string> = {
	naocl_3: "Гипохлорит натрия NaOCl 3.0%",
	naocl_5: "Гипохлорит натрия NaOCl 5.25%",
	edta_17: "ЭДТА 17% (Раствор/Гель)",
	chx_2: "Хлоргексидин биглюконат 2.0%",
	citric_10: "Лимонная кислота 10%",
	saline: "Стерильный физиологический раствор 0.9%",
	distilled_water: "Дистиллированная вода",
};

export type IrrigationActivation =
	| "pui_ultrasonic"
	| "sonic_eddy"
	| "manual_dynamic"
	| "negative_pressure"
	| "syringe_only";

export const IRRIGATION_ACTIVATION_LABELS: Record<IrrigationActivation, string> = {
	pui_ultrasonic: "Пассивная ультразвуковая активация (PUI / IrriSafe)",
	sonic_eddy: "Звуковая активация (EDDY / EndoActivator)",
	manual_dynamic: "Мануальная динамическая активация мастер-штифтом",
	negative_pressure: "Апикальное отрицательное давление (EndoVac)",
	syringe_only: "Ирригация эндодонтической иглой с боковой перфорацией (Side-vented)",
};

export interface EndoIrrigationStep {
	readonly solution: IrrigationSolution;
	readonly volumeMl: number;
	readonly exposureSeconds: number;
}

export interface EndoIrrigationProtocol {
	readonly protocolKey: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly steps: readonly EndoIrrigationStep[];
	readonly activation: IrrigationActivation;
	readonly activationDurationSeconds: number;
	readonly intermediateRinse: boolean;
}

export const IRRIGATION_PRESETS: Record<string, EndoIrrigationProtocol> = {
	standard_star: {
		protocolKey: "standard_star",
		titleRu: "Стандартный эндодонтический протокол СтАР",
		descriptionRu: "Базовая антисептическая обработка: NaOCl 3.0% + ЭДТА 17% для удаления смазанного слоя + УЗ-активация PUI",
		steps: [
			{ solution: "naocl_3", volumeMl: 10, exposureSeconds: 120 },
			{ solution: "edta_17", volumeMl: 5, exposureSeconds: 60 },
			{ solution: "naocl_3", volumeMl: 5, exposureSeconds: 60 },
			{ solution: "distilled_water", volumeMl: 5, exposureSeconds: 30 },
		],
		activation: "pui_ultrasonic",
		activationDurationSeconds: 60,
		intermediateRinse: true,
	},
	destructive_periodontitis: {
		protocolKey: "destructive_periodontitis",
		titleRu: "Протокол при деструктивном периодонтите",
		descriptionRu: "Усиленная антисептика: подогретый NaOCl 5.25% + ЭДТА 17% + финальная экспозиция CHX 2.0% с промежуточным промыванием",
		steps: [
			{ solution: "naocl_5", volumeMl: 15, exposureSeconds: 180 },
			{ solution: "edta_17", volumeMl: 5, exposureSeconds: 60 },
			{ solution: "saline", volumeMl: 5, exposureSeconds: 30 },
			{ solution: "chx_2", volumeMl: 5, exposureSeconds: 60 },
			{ solution: "distilled_water", volumeMl: 5, exposureSeconds: 30 },
		],
		activation: "pui_ultrasonic",
		activationDurationSeconds: 90,
		intermediateRinse: true,
	},
	bioceramic_ready: {
		protocolKey: "bioceramic_ready",
		titleRu: "Подготовка под биокерамический силер (TotalFill)",
		descriptionRu: "NaOCl + ЭДТА 17% без хлоргексидина; каналы оставляются слегка влажными (moist) для инициации гидратации биокерамики",
		steps: [
			{ solution: "naocl_3", volumeMl: 10, exposureSeconds: 120 },
			{ solution: "edta_17", volumeMl: 5, exposureSeconds: 60 },
			{ solution: "distilled_water", volumeMl: 10, exposureSeconds: 45 },
		],
		activation: "pui_ultrasonic",
		activationDurationSeconds: 60,
		intermediateRinse: true,
	},
	retreatment: {
		protocolKey: "retreatment",
		titleRu: "Протокол перелечивания / распломбирования",
		descriptionRu: "Удаление старого силера, сольвент, агрессивный подогретый NaOCl 5.25% + ЭДТА 17% + УЗ-активация",
		steps: [
			{ solution: "naocl_5", volumeMl: 20, exposureSeconds: 240 },
			{ solution: "edta_17", volumeMl: 10, exposureSeconds: 90 },
			{ solution: "naocl_5", volumeMl: 10, exposureSeconds: 60 },
			{ solution: "distilled_water", volumeMl: 5, exposureSeconds: 30 },
		],
		activation: "pui_ultrasonic",
		activationDurationSeconds: 120,
		intermediateRinse: true,
	},
};

export function getIrrigationPreset(presetKey: string): EndoIrrigationProtocol {
	const preset = IRRIGATION_PRESETS[presetKey] || IRRIGATION_PRESETS.standard_star;
	if (preset) return preset;
	return IRRIGATION_PRESETS["standard_star"]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TOOTH MORPHOLOGY REPOSITORY (FDI 11..48 & 51..85)
// ─────────────────────────────────────────────────────────────────────────────

export interface ToothEndoMorphology {
	readonly toothNumber: number;
	readonly toothNameRu: string;
	readonly typicalCanalCount: number;
	readonly possibleCanalCountRange: readonly [number, number];
	readonly averageRootLengthMm: number;
	readonly defaultReferencePoints: readonly string[];
	readonly defaultCanals: readonly EndoCanalRecord[];
	readonly commonAnatomicalVariations: readonly string[];
}

function createDefaultCanal(
	id: string,
	name: string,
	referencePoint: string,
	lengthMm: number,
	mafIso = 25,
	taper: EndoTaper = ".04",
): EndoCanalRecord {
	return {
		id,
		name,
		referencePoint,
		initialApicalFileIso: 10,
		masterApicalFileIso: mafIso,
		workingLengthMm: lengthMm,
		workingLengthMethod: "apex_locator",
		taper,
		instrumentation: "rotary_niti",
		obturationMethod: "single_cone_bioceramic",
		sealer: "bioceramic",
		isObturated: true,
		curvatureDegree: 10,
	};
}

export function getEndoMorphologyForTooth(fdiNumber: number): ToothEndoMorphology {
	const quadrant = Math.floor(fdiNumber / 10);
	const pos = fdiNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;

	// Primary teeth
	if (isPrimary) {
		if (pos <= 3) {
			return {
				toothNumber: fdiNumber,
				toothNameRu: `Временный резец/клык (${fdiNumber})`,
				typicalCanalCount: 1,
				possibleCanalCountRange: [1, 1],
				averageRootLengthMm: 16.0,
				defaultReferencePoints: ["Режущий край"],
				defaultCanals: [createDefaultCanal("c1", "Основной", "Режущий край", 15.0, 30, ".02")],
				commonAnatomicalVariations: ["Широкая апикальная дельта, физиологическая резорбция корня"],
			};
		}
		if (quadrant === 5 || quadrant === 6) {
			// Upper primary molars (54, 55, 64, 65) -> 3 canals
			return {
				toothNumber: fdiNumber,
				toothNameRu: `Временный верхний моляр (${fdiNumber})`,
				typicalCanalCount: 3,
				possibleCanalCountRange: [3, 4],
				averageRootLengthMm: 16.5,
				defaultReferencePoints: ["Медиально-щечный бугор", "Дистально-щечный бугор", "Небный бугор"],
				defaultCanals: [
					createDefaultCanal("c1", "MB", "Медиально-щечный бугор", 15.5, 25, ".02"),
					createDefaultCanal("c2", "DB", "Дистально-щечный бугор", 15.0, 25, ".02"),
					createDefaultCanal("c3", "P", "Небный бугор", 16.0, 30, ".02"),
				],
				commonAnatomicalVariations: ["Тонкие изогнутые корни, резорбция в области бифуркации"],
			};
		}
		// Lower primary molars (74, 75, 84, 85) -> 2 canals
		return {
			toothNumber: fdiNumber,
			toothNameRu: `Временный нижний моляр (${fdiNumber})`,
			typicalCanalCount: 2,
			possibleCanalCountRange: [2, 3],
			averageRootLengthMm: 16.0,
			defaultReferencePoints: ["Медиальный бугор", "Дистальный бугор"],
			defaultCanals: [
				createDefaultCanal("c1", "M", "Медиально-щечный бугор", 15.0, 25, ".02"),
				createDefaultCanal("c2", "D", "Дистально-щечный бугор", 15.5, 30, ".02"),
			],
			commonAnatomicalVariations: ["Широкие лентовидные каналы, резорбция"],
		};
	}

	// Permanent Teeth 11..48
	// 1. Upper Central & Lateral Incisors (11, 12, 21, 22)
	if ((quadrant === 1 || quadrant === 2) && (pos === 1 || pos === 2)) {
		const isCentral = pos === 1;
		const avgLen = isCentral ? 22.5 : 22.0;
		return {
			toothNumber: fdiNumber,
			toothNameRu: isCentral ? `Верхний центральный резец (${fdiNumber})` : `Верхний боковой резец (${fdiNumber})`,
			typicalCanalCount: 1,
			possibleCanalCountRange: [1, 1],
			averageRootLengthMm: avgLen,
			defaultReferencePoints: ["Режущий край (середина)"],
			defaultCanals: [
				createDefaultCanal("c1", "Основной", "Режущий край (середина)", avgLen - 0.5, isCentral ? 35 : 30, ".04"),
			],
			commonAnatomicalVariations: [
				isCentral ? "Прямой широкий канал овальной формы" : "Дистальный апикальный изгиб в 53% случаев",
			],
		};
	}

	// 2. Upper Canines (13, 23)
	if ((quadrant === 1 || quadrant === 2) && pos === 3) {
		return {
			toothNumber: fdiNumber,
			toothNameRu: `Верхний клык (${fdiNumber})`,
			typicalCanalCount: 1,
			possibleCanalCountRange: [1, 1],
			averageRootLengthMm: 26.5,
			defaultReferencePoints: ["Верхушка рвущего бугра"],
			defaultCanals: [
				createDefaultCanal("c1", "Основной", "Верхушка рвущего бугра", 25.5, 35, ".04"),
			],
			commonAnatomicalVariations: ["Самый длинный зуб зубного ряда (до 30+ мм), массивный прямой канал"],
		};
	}

	// 3. Upper 1st Premolars (14, 24) -> 2 canals (B, P)
	if ((quadrant === 1 || quadrant === 2) && pos === 4) {
		return {
			toothNumber: fdiNumber,
			toothNameRu: `Верхний первый премоляр (${fdiNumber})`,
			typicalCanalCount: 2,
			possibleCanalCountRange: [1, 3],
			averageRootLengthMm: 21.5,
			defaultReferencePoints: ["Щечный бугор", "Небный бугор"],
			defaultCanals: [
				createDefaultCanal("c1", "B (Щечный)", "Щечный бугор", 21.0, 25, ".04"),
				createDefaultCanal("c2", "P (Небный)", "Небный бугор", 21.0, 25, ".04"),
			],
			commonAnatomicalVariations: [
				"2 корня и 2 канала в 85-90% случаев",
				"3 канала (MB, DB, P) в 1.5% случаев (форма моляра в миниатюре)",
				"Выраженная мезиальная борозда корня (риск перфорации при препарировании)",
			],
		};
	}

	// 4. Upper 2nd Premolars (15, 25) -> 1 canal (variant 2)
	if ((quadrant === 1 || quadrant === 2) && pos === 5) {
		return {
			toothNumber: fdiNumber,
			toothNameRu: `Верхний второй премоляр (${fdiNumber})`,
			typicalCanalCount: 1,
			possibleCanalCountRange: [1, 2],
			averageRootLengthMm: 21.5,
			defaultReferencePoints: ["Щечный бугор"],
			defaultCanals: [
				createDefaultCanal("c1", "Основной", "Щечный бугор", 21.0, 30, ".04"),
			],
			commonAnatomicalVariations: [
				"1 корень и 1 широкий лентовидный канал в 75% случаев",
				"2 раздельных канала (B и P) в 24% случаев",
			],
		};
	}

	// 5. Upper 1st & 2nd Molars (16, 17, 26, 27) -> 4 canals (MB1, MB2, DB, P)
	if ((quadrant === 1 || quadrant === 2) && (pos === 6 || pos === 7)) {
		const isFirstMolar = pos === 6;
		return {
			toothNumber: fdiNumber,
			toothNameRu: isFirstMolar ? `Верхний первый моляр (${fdiNumber})` : `Верхний второй моляр (${fdiNumber})`,
			typicalCanalCount: isFirstMolar ? 4 : 3,
			possibleCanalCountRange: [3, 5],
			averageRootLengthMm: 21.0,
			defaultReferencePoints: [
				"Медиально-щечный бугор",
				"Дистально-щечный бугор",
				"Небный бугор (наиболее массивный)",
			],
			defaultCanals: [
				createDefaultCanal("c1", "MB1 (Медиально-щечный 1)", "Медиально-щечный бугор", 20.5, 25, ".04"),
				createDefaultCanal("c2", "MB2 (Медиально-щечный 2)", "Медиально-щечный бугор", 19.5, 20, ".04"),
				createDefaultCanal("c3", "DB (Дистально-щечный)", "Дистально-щечный бугор", 20.0, 25, ".04"),
				createDefaultCanal("c4", "P (Небный)", "Небный бугор", 21.5, 35, ".06"),
			],
			commonAnatomicalVariations: [
				"MB2 канал выявляется под дентальным микроскопом в 70–90% случаев (16/26)",
				"Небный канал часто имеет вестибулярный апикальный изгиб (скрытый на 2D снимке)",
				"MB1 и MB2 могут соединяться в общее апикальное отверстие (тип II по Vertucci)",
			],
		};
	}

	// 6. Upper 3rd Molars (18, 28)
	if ((quadrant === 1 || quadrant === 2) && pos === 8) {
		return {
			toothNumber: fdiNumber,
			toothNameRu: `Верхний третий моляр / зуб мудрости (${fdiNumber})`,
			typicalCanalCount: 3,
			possibleCanalCountRange: [1, 4],
			averageRootLengthMm: 17.5,
			defaultReferencePoints: ["Щечный бугор", "Небный бугор"],
			defaultCanals: [
				createDefaultCanal("c1", "MB", "Медиально-щечный бугор", 17.0, 25, ".04"),
				createDefaultCanal("c2", "DB", "Дистально-щечный бугор", 16.5, 25, ".04"),
				createDefaultCanal("c3", "P", "Небный бугор", 17.5, 30, ".04"),
			],
			commonAnatomicalVariations: ["Высокая анатомическая вариабельность, сросшиеся корни, C-shape конфигурация"],
		};
	}

	// 7. Lower Incisors & Canines (31, 32, 33, 41, 42, 43)
	if ((quadrant === 3 || quadrant === 4) && pos <= 3) {
		const isCanine = pos === 3;
		const avgLen = isCanine ? 25.5 : 21.0;
		return {
			toothNumber: fdiNumber,
			toothNameRu: isCanine
				? `Нижний клык (${fdiNumber})`
				: `Нижний ${pos === 1 ? "центральный" : "боковой"} резец (${fdiNumber})`,
			typicalCanalCount: 1,
			possibleCanalCountRange: [1, 2],
			averageRootLengthMm: avgLen,
			defaultReferencePoints: [isCanine ? "Верхушка бугра" : "Режущий край"],
			defaultCanals: [
				createDefaultCanal("c1", "Основной", isCanine ? "Верхушка бугра" : "Режущий край", avgLen - 0.5, isCanine ? 30 : 25, ".04"),
			],
			commonAnatomicalVariations: [
				"2 канала (Вестибулярный и Язычный) в 20–40% резцов нижней челюсти!",
				"Очень узкий мезио-дистальный диаметр корня, риск латеральной перфорации",
			],
		};
	}

	// 8. Lower Premolars (34, 35, 44, 45) -> 1 canal (variant 2)
	if ((quadrant === 3 || quadrant === 4) && (pos === 4 || pos === 5)) {
		return {
			toothNumber: fdiNumber,
			toothNameRu: `Нижний ${pos === 4 ? "первый" : "второй"} премоляр (${fdiNumber})`,
			typicalCanalCount: 1,
			possibleCanalCountRange: [1, 3],
			averageRootLengthMm: 22.0,
			defaultReferencePoints: ["Щечный бугор"],
			defaultCanals: [
				createDefaultCanal("c1", "Основной", "Щечный бугор", 21.5, 30, ".04"),
			],
			commonAnatomicalVariations: [
				"Деление канала в средней или апикальной трети (бифуркация) в 25-30% нижних первых премоляров",
				"C-shaped каналы",
			],
		};
	}

	// 9. Lower 1st & 2nd Molars (36, 37, 46, 47) -> 3 or 4 canals (MB, ML, D or MB, ML, DB, DL + Radix)
	if ((quadrant === 3 || quadrant === 4) && (pos === 6 || pos === 7)) {
		const isFirstMolar = pos === 6;
		return {
			toothNumber: fdiNumber,
			toothNameRu: isFirstMolar ? `Нижний первый моляр (${fdiNumber})` : `Нижний второй моляр (${fdiNumber})`,
			typicalCanalCount: 3,
			possibleCanalCountRange: [2, 5],
			averageRootLengthMm: 21.0,
			defaultReferencePoints: [
				"Медиально-щечный бугор",
				"Медиально-язычный бугор",
				"Дистальный бугор",
			],
			defaultCanals: [
				createDefaultCanal("c1", "MB (Медиально-щечный)", "Медиально-щечный бугор", 20.5, 25, ".04"),
				createDefaultCanal("c2", "ML (Медиально-язычный)", "Медиально-язычный бугор", 20.5, 25, ".04"),
				createDefaultCanal("c3", "D (Дистальный)", "Дистальный бугор", 21.0, 35, ".06"),
			],
			commonAnatomicalVariations: [
				"2 дистальных канала (DB и DL) в 30–35% случаев",
				"Radix Entomolaris (дополнительный дисто-лингвальный корень) в 5–15% случаев у монголоидной и европейской расы",
				"Middle Mesial (средний медиальный канал) в 10–15% нижних первых моляров",
				"C-shape анатомия в 37/47 (до 10–30% в популяции)",
			],
		};
	}

	// 10. Lower 3rd Molars (38, 48)
	return {
		toothNumber: fdiNumber,
		toothNameRu: `Нижний третий моляр / зуб мудрости (${fdiNumber})`,
		typicalCanalCount: 2,
		possibleCanalCountRange: [1, 4],
		averageRootLengthMm: 18.0,
		defaultReferencePoints: ["Медиальный бугор", "Дистальный бугор"],
		defaultCanals: [
			createDefaultCanal("c1", "M (Медиальный)", "Медиально-щечный бугор", 17.5, 25, ".04"),
			createDefaultCanal("c2", "D (Дистальный)", "Дистальный бугор", 17.5, 30, ".04"),
		],
		commonAnatomicalVariations: ["Сросшиеся корни, C-shape, сильный дистальный изгиб"],
	};
}

export function getDefaultCanalsForTooth(fdiNumber: number): EndoCanalRecord[] {
	return getEndoMorphologyForTooth(fdiNumber).defaultCanals.map((c) => ({ ...c }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CLINICAL SESSION DATA & FORM 043/U GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface EndodonticToothSession {
	readonly toothNumber: number;
	readonly diagnosisCode: string; // e.g. "K04.0" | "K04.5"
	readonly diagnosisTitle: string;
	readonly canals: readonly EndoCanalRecord[];
	readonly irrigationProtocol: EndoIrrigationProtocol;
	readonly isolationType: "kofferdam" | "optidam" | "cotton_rolls";
	readonly kofferdamClamp?: string | undefined; // e.g. "W8A", "B4", "2", "14A"
	readonly accessCavityNotes?: string | undefined;
	readonly coronalRestoration: "temporary_cavit" | "temporary_gic" | "composite_buildup" | "post_core";
	readonly visitType?: "primary_endo" | "retreatment" | "interim_dressing" | undefined;
	readonly doctorName?: string | undefined;
}

export const ISOLATION_LABELS: Record<string, string> = {
	kofferdam: "Коффердам (рабердам)",
	optidam: "Оптидам (OptiDam 3D)",
	cotton_rolls: "Ватные валики и слюноотсос (относительная изоляция)",
};

export const CORONAL_RESTORATION_LABELS: Record<string, string> = {
	temporary_cavit: "Временная герметичная повязка Cavit / Септо-пак",
	temporary_gic: "Временная пломба из стеклоиономерного цемента (СИЦ Fuji IX)",
	composite_buildup: "Прямой адгезивный композитный билдап (Estelite / Ceram.x)",
	post_core: "Стекловолоконный штифт (СВШ) с культевой вкладкой из композита",
};

/**
 * Formats structured tabular summary of canal measurements for text insertion
 */
export function formatCanalsSummaryTable(canals: readonly EndoCanalRecord[]): string {
	if (!canals || canals.length === 0) {
		return "Каналы не измерены.";
	}

	const header = "Канал | Ориентир | WL (мм) | IAF (ISO) | MAF (ISO/конусность) | Обтурация | Силер";
	const divider = "---|---|---|---|---|---|---";
	const rows = canals.map((c) => {
		const mafColor = getIsoColorInfo(c.masterApicalFileIso).colorNameRu;
		const methodTitle = OBTURATION_METHOD_LABELS[c.obturationMethod]?.titleRu ?? "";
		const methodShort = (methodTitle.split("(")[0] ?? "").trim() || c.obturationMethod;
		const sealerShort = SEALER_TYPE_LABELS[c.sealer]?.titleRu || c.sealer;
		return `${c.name} | ${c.referencePoint} | ${c.workingLengthMm.toFixed(1)} мм | ISO ${c.initialApicalFileIso} | ISO ${c.masterApicalFileIso} (${mafColor}, taper ${c.taper}) | ${methodShort} | ${sealerShort}`;
	});

	return [header, divider, ...rows].join("\n");
}

/**
 * Generates official Russian Ministry of Health Form 043/u clinical diary entry
 * strictly conforming to StAR (Стоматологическая Ассоциация России) endodontic protocols.
 */
export function generateEndo043uDiaryEntry(session: EndodonticToothSession): string {
	const morph = getEndoMorphologyForTooth(session.toothNumber);
	const isolationText = session.isolationType === "kofferdam" || session.isolationType === "optidam"
		? `${ISOLATION_LABELS[session.isolationType] || "Коффердам"}${session.kofferdamClamp ? ` (кламп № ${session.kofferdamClamp})` : ""}`
		: "Относительная изоляция (ватные валики, слюноотсос)";

	const activeCanals = session.canals.filter((c) => c.workingLengthMm > 0);
	const canalCount = activeCanals.length;

	const allObturated = activeCanals.every((c) => c.isObturated);
	const isInterim = session.visitType === "interim_dressing" || activeCanals.some((c) => c.obturationMethod === "temporary_caoh2");

	const lines: string[] = [];

	lines.push(`ДНЕВНИК КЛИНИЧЕСКОГО ПРИЕМА (ЭНДОДОНТИЯ) — ЗУБ ${session.toothNumber}`);
	lines.push(`Диагноз: ${session.diagnosisCode} ${session.diagnosisTitle}`);
	lines.push(`Анатомическая область: ${morph.toothNameRu}.`);
	lines.push("");
	lines.push("1. ИЗОЛЯЦИЯ И ДОСТУП:");
	lines.push(`- Изоляция операционного поля: ${isolationText}. Стерильность соблюдена.`);
	lines.push(`- Препарирование кариозной полости, создание прямого эндодонтического доступа к устьям корневых каналов.`);
	if (session.accessCavityNotes) {
		lines.push(`- Особенности доступа: ${session.accessCavityNotes}.`);
	}
	lines.push(`- Локализовано корневых каналов: ${canalCount} (${activeCanals.map((c) => c.name).join(", ")}).`);
	lines.push("");
	lines.push("2. ЭНДОДОНТИЧЕСКИЙ ЖУРНАЛ КАНАЛОВ (WL / MAF):");

	for (const canal of activeCanals) {
		const mafInfo = getIsoColorInfo(canal.masterApicalFileIso);
		const instSystem = INSTRUMENTATION_LABELS[canal.instrumentation] || canal.instrumentation;
		const wlMethod = WORKING_LENGTH_METHOD_LABELS[canal.workingLengthMethod] || canal.workingLengthMethod;
		lines.push(`• Канал «${canal.name}»:`);
		lines.push(`  - Анатомический ориентир: ${canal.referencePoint}`);
		lines.push(`  - Рабочая длина (WL): ${canal.workingLengthMm.toFixed(1)} мм [Метод: ${wlMethod}]`);
		lines.push(`  - Начальный апикальный файл (IAF): ISO ${canal.initialApicalFileIso}`);
		lines.push(`  - Мастер-апикальный упор (MAF): ISO ${canal.masterApicalFileIso} (${mafInfo.colorNameRu}), конусность ${canal.taper}`);
		lines.push(`  - Система инструментации: ${instSystem}`);
	}

	lines.push("");
	lines.push("3. МЕДИКАМЕНТОЗНАЯ ОБРАБОТКА И ИРРИГАЦИЯ:");
	lines.push(`- Протокол: ${session.irrigationProtocol.titleRu}.`);
	for (const step of session.irrigationProtocol.steps) {
		const solLabel = IRRIGATION_SOLUTION_LABELS[step.solution] || step.solution;
		lines.push(`  * ${solLabel} — объем ${step.volumeMl} мл, экспозиция ${step.exposureSeconds} сек.`);
	}
	lines.push(`- Активация ирригантов: ${IRRIGATION_ACTIVATION_LABELS[session.irrigationProtocol.activation] || session.irrigationProtocol.activation} в течение ${session.irrigationProtocol.activationDurationSeconds} сек.`);
	lines.push("- Высушивание корневых каналов стерильными бумажными пинами (Paper points) соответствующего размера и конусности.");

	lines.push("");
	if (isInterim) {
		lines.push("4. ВРЕМЕННАЯ ЛЕЧЕБНАЯ ОБТУРАЦИЯ:");
		lines.push("- Корневые каналы плотно заполнены пастой гидроксида кальция Ca(OH)2 с помощью каналонаполнителя Lentulo на рабочую длину.");
		lines.push("- Устья изолированы, наложена временная герметичная повязка.");
	} else if (allObturated) {
		lines.push("4. ПОСТОЯННАЯ ОБТУРАЦИЯ КОРНЕВЫХ КАНАЛОВ:");
		for (const canal of activeCanals) {
			const methodLabel = OBTURATION_METHOD_LABELS[canal.obturationMethod]?.titleRu || canal.obturationMethod;
			const sealerLabel = SEALER_TYPE_LABELS[canal.sealer]?.titleRu || canal.sealer;
			lines.push(`• Канал «${canal.name}»: обтурирован методом «${methodLabel}» с использованием силера (${sealerLabel}) до апикального сужения (WL ${canal.workingLengthMm.toFixed(1)} мм).`);
		}
		lines.push("- Рентгенологический контроль обтурации: корневые каналы запломбированы плотно, гомогенно, до физиологической верхушки, без выведения материала за апикальное отверстие.");
	} else {
		lines.push("4. ЭТАП ОБРАБОТКИ КАНАЛОВ:");
		lines.push("- Инструментальная и медикаментозная обработка завершена, каналы подготовлены к постоянной обтурации.");
	}

	lines.push("");
	lines.push("5. ВОССТАНОВЛЕНИЕ КОРОНКОВОЙ ЧАСТИ:");
	lines.push(`- Наложение: ${CORONAL_RESTORATION_LABELS[session.coronalRestoration] || session.coronalRestoration}.`);
	lines.push("- Окклюзионные контакты выверены по копировальной бумаге 40 мкм, пришлифованы.");
	lines.push("");
	lines.push("6. РЕКОМЕНДАЦИИ ПАЦИЕНТУ:");
	lines.push("- Назначена контрольная радиовизиография.");
	lines.push("- Предупрежден(а) о возможной постпломбировочной чувствительности при накусывании в течение 2–5 дней.");
	lines.push("- Рекомендован прием НПВП при болевом синдроме (Нимесулид 100 мг / Ибупрофен 400 мг).");
	lines.push("- Рекомендовано постоянное ортопедическое восстановление (коронка/вкладка) для предотвращения фрактуры коронки зуба.");

	return lines.join("\n");
}

/**
 * Validates session parameters for clinical sanity
 */
export function validateEndoSession(session: EndodonticToothSession): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!session.toothNumber || session.toothNumber < 11 || session.toothNumber > 85) {
		errors.push("Некорректный номер зуба (допустимо FDI 11..48 или 51..85).");
	}

	if (!session.canals || session.canals.length === 0) {
		errors.push("В протоколе должен присутствовать хотя бы один корневой канал.");
	} else {
		session.canals.forEach((canal, idx) => {
			if (!canal.name || canal.name.trim() === "") {
				errors.push(`Канал #${idx + 1}: не указано наименование канала.`);
			}
			if (canal.workingLengthMm <= 0) {
				errors.push(`Канал «${canal.name || idx + 1}»: рабочая длина должна быть больше 0 мм.`);
			} else if (canal.workingLengthMm > 35) {
				warnings.push(`Канал «${canal.name}»: рабочая длина ${canal.workingLengthMm} мм превышает стандартную норму (35 мм). Проверьте ориентир.`);
			} else if (canal.workingLengthMm < 10) {
				warnings.push(`Канал «${canal.name}»: рабочая длина ${canal.workingLengthMm} мм аномально мала (<10 мм).`);
			}

			if (canal.masterApicalFileIso < 15) {
				warnings.push(`Канал «${canal.name}»: MAF ISO ${canal.masterApicalFileIso} слишком мал для надежного апикального упора (рекомендуется >= ISO 20/25).`);
			}

			if (canal.masterApicalFileIso < canal.initialApicalFileIso) {
				errors.push(`Канал «${canal.name}»: Мастер-файл (MAF ISO ${canal.masterApicalFileIso}) не может быть меньше начального файла (IAF ISO ${canal.initialApicalFileIso}).`);
			}
		});
	}

	if (!session.diagnosisCode || session.diagnosisCode.trim() === "") {
		warnings.push("Не указан код диагноза по МКБ-10 (например, K04.0 Пульпит или K04.5 Периодонтит).");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}
