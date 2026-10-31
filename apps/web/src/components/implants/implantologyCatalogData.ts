/**
 * implantologyCatalogData.ts — Единый нормализованный канонический SSOT имплантологии (DENTE CRM).
 * Содержит 6 ключевых хирургических систем в РФ, типоразмеры (3.0–5.0 мм, 7–13 мм),
 * диапазоны торка (35–45 Н·см норма), ISQ (65–85), финансы в копейках и 1-клик шаблоны (Мандаты 8e, 8n, 8am, 8b).
 */

export type CanonicalImplantSystemId =
	| "osstem"
	| "straumann"
	| "dentium"
	| "nobel_biocare"
	| "astra_tech"
	| "anyridge";

export type PlatformConnectionType = "conical" | "internal_hex";
export type ImplantStageType = "two_stage_plug" | "one_stage_healing_abutment";
export type MischBoneDensity = "D1" | "D2" | "D3" | "D4";

export interface CanonicalImplantSystem {
	readonly id: CanonicalImplantSystemId;
	readonly brandName: string;
	readonly lineName: string;
	readonly countryRu: string;
	readonly manufacturer: string;
	readonly connectionType: PlatformConnectionType;
	readonly connectionDescription: string;
	readonly screwdriverType: string;
	readonly screwdriverAliasRu: string;
	readonly diametersMm: readonly number[];
	readonly lengthsMm: readonly number[];
	readonly defaultDiameterMm: number;
	readonly defaultLengthMm: number;
	readonly minInsertionTorqueNcm: number;
	readonly defaultTorqueNcm: number;
	readonly maxSafeTorqueNcm: number;
	readonly recommendedIsqRange: readonly [min: number, max: number];
	readonly implantCostKopecks: bigint;
	readonly patientPriceKopecks: bigint;
	readonly defaultArticlePrefix: string;
}

export interface ImplantSurgeryQuickTemplate {
	readonly id: string;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly stage: ImplantStageType;
	readonly defaultTorqueNcm: number;
	readonly defaultIsq: number;
	readonly isImmediateLoading: boolean;
	readonly boneGraftRequired: boolean;
	readonly membraneRequired: boolean;
}

export interface ImplantWarrantyPassportData {
	readonly passportId: string;
	readonly toothFdi: number;
	readonly systemId: CanonicalImplantSystemId;
	readonly brandName: string;
	readonly lineName: string;
	readonly catalogArticle: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly insertionTorqueNcm: number;
	readonly isqValue: number;
	readonly boneDensity: MischBoneDensity;
	readonly stage: ImplantStageType;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly doctorName: string;
	readonly doctorId: string;
	readonly surgeryDateIso: string;
	readonly expectedOsteointegrationDateIso: string;
	readonly implantCostKopecks: bigint;
	readonly patientPriceKopecks: bigint;
	readonly verificationQrPayload: string;
}

export const CANONICAL_IMPLANT_SYSTEMS: Record<CanonicalImplantSystemId, CanonicalImplantSystem> = {
	osstem: {
		id: "osstem",
		brandName: "Osstem",
		lineName: "TS III SA",
		countryRu: "Южная Корея",
		manufacturer: "Osstem Implant Co., Ltd.",
		connectionType: "conical",
		connectionDescription: "Внутренний конус Морзе 11° с шестигранником",
		screwdriverType: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (Osstem)",
		diametersMm: [3.0, 3.5, 4.0, 4.5, 5.0],
		lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [65, 80],
		implantCostKopecks: 1250000n,
		patientPriceKopecks: 3500000n,
		defaultArticlePrefix: "TS3S4010S",
	},
	straumann: {
		id: "straumann",
		brandName: "Straumann",
		lineName: "BLX / Bone Level SLA",
		countryRu: "Швейцария",
		manufacturer: "Institut Straumann AG",
		connectionType: "conical",
		connectionDescription: "Коническое самоблокирующееся CrossFit / TorcFit",
		screwdriverType: "SCS (Screw Carrying System)",
		screwdriverAliasRu: "Отвертка Straumann SCS (звездочка)",
		diametersMm: [3.5, 3.75, 4.0, 4.5, 5.0],
		lengthsMm: [8.0, 10.0, 12.0, 14.0],
		defaultDiameterMm: 3.75,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 50,
		recommendedIsqRange: [70, 85],
		implantCostKopecks: 3200000n,
		patientPriceKopecks: 6500000n,
		defaultArticlePrefix: "021.2310",
	},
	dentium: {
		id: "dentium",
		brandName: "Dentium",
		lineName: "SuperLine SLA",
		countryRu: "Южная Корея",
		manufacturer: "Dentium Co., Ltd.",
		connectionType: "conical",
		connectionDescription: "Внутренний конус 11° с шестигранником",
		screwdriverType: "Hex 1.27 mm",
		screwdriverAliasRu: "Шестигранник 1.27 мм (Dentium / Zimmer)",
		diametersMm: [3.6, 4.0, 4.5, 5.0],
		lengthsMm: [7.0, 8.5, 10.0, 12.0, 14.0],
		defaultDiameterMm: 4.5,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [68, 82],
		implantCostKopecks: 1450000n,
		patientPriceKopecks: 3800000n,
		defaultArticlePrefix: "FX4510",
	},
	nobel_biocare: {
		id: "nobel_biocare",
		brandName: "Nobel Biocare",
		lineName: "Conical Connection (CC)",
		countryRu: "Швеция / США",
		manufacturer: "Nobel Biocare Services AG",
		connectionType: "conical",
		connectionDescription: "Коническое Conical Connection с антиротационным замком",
		screwdriverType: "Unigrip",
		screwdriverAliasRu: "Отвертка Nobel Unigrip (лепестковая)",
		diametersMm: [3.5, 4.3, 5.0],
		lengthsMm: [8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.3,
		defaultLengthMm: 11.5,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [70, 85],
		implantCostKopecks: 3500000n,
		patientPriceKopecks: 7200000n,
		defaultArticlePrefix: "NP-35115",
	},
	astra_tech: {
		id: "astra_tech",
		brandName: "Astra Tech",
		lineName: "OsseoSpeed EV",
		countryRu: "Швеция",
		manufacturer: "Dentsply Sirona Implants",
		connectionType: "conical",
		connectionDescription: "Коническое самонаправляющееся соединение Conical Seal Design",
		screwdriverType: "Hex 1.25 mm (EV)",
		screwdriverAliasRu: "Шестигранник Astra Tech EV (1.25 мм)",
		diametersMm: [3.0, 3.6, 4.2, 4.8, 5.4],
		lengthsMm: [8.0, 9.0, 11.0, 13.0],
		defaultDiameterMm: 4.2,
		defaultLengthMm: 11.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 40,
		recommendedIsqRange: [68, 82],
		implantCostKopecks: 3100000n,
		patientPriceKopecks: 6800000n,
		defaultArticlePrefix: "EV-42110",
	},
	anyridge: {
		id: "anyridge",
		brandName: "AnyRidge",
		lineName: "MegaGen Knife Thread",
		countryRu: "Южная Корея",
		manufacturer: "MegaGen Implant Co., Ltd.",
		connectionType: "conical",
		connectionDescription: "Внутренний конус Морзе 5° с шестигранником",
		screwdriverType: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (MegaGen AnyRidge)",
		diametersMm: [3.5, 4.0, 4.5, 5.0, 5.5],
		lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [68, 84],
		implantCostKopecks: 1650000n,
		patientPriceKopecks: 4200000n,
		defaultArticlePrefix: "AR4010",
	},
};

export const SURGICAL_QUICK_TEMPLATES: readonly ImplantSurgeryQuickTemplate[] = [
	{
		id: "immediate_extraction",
		labelRu: "1. Немедленная имплантация (в лунку удаленного)",
		descriptionRu: "Одномоментная установка в лунку удаленного зуба с формирователем десны или временной коронкой.",
		stage: "one_stage_healing_abutment",
		defaultTorqueNcm: 40,
		defaultIsq: 75,
		isImmediateLoading: true,
		boneGraftRequired: true,
		membraneRequired: true,
	},
	{
		id: "classic_two_stage",
		labelRu: "2. Классическая двухэтапная",
		descriptionRu: "Погружная установка имплантата с винтом-заглушкой и ушиванием слизистой наглухо.",
		stage: "two_stage_plug",
		defaultTorqueNcm: 35,
		defaultIsq: 70,
		isImmediateLoading: false,
		boneGraftRequired: false,
		membraneRequired: false,
	},
	{
		id: "closed_sinus_lift",
		labelRu: "3. Имплантация с закрытым синус-лифтингом",
		descriptionRu: "Мягкое транскрестальное поднятие дна гайморовой пазухи остеотомами с подсадкой костного графта.",
		stage: "two_stage_plug",
		defaultTorqueNcm: 35,
		defaultIsq: 68,
		isImmediateLoading: false,
		boneGraftRequired: true,
		membraneRequired: true,
	},
	{
		id: "healing_abutment_placement",
		labelRu: "4. Установка формирователя десны",
		descriptionRu: "Второй хирургический этап: раскрытие имплантата, удаление винта-заглушки и фиксация ФДМ.",
		stage: "one_stage_healing_abutment",
		defaultTorqueNcm: 15,
		defaultIsq: 76,
		isImmediateLoading: false,
		boneGraftRequired: false,
		membraneRequired: false,
	},
];

export const FDI_SURGICAL_PRESETS: readonly number[] = [16, 15, 14, 11, 21, 24, 25, 26, 36, 46];

export function resolveImplantSystem(key: string): CanonicalImplantSystem {
	const normalized = (key || "").toLowerCase().trim();
	if (normalized.includes("straumann")) return CANONICAL_IMPLANT_SYSTEMS.straumann;
	if (normalized.includes("nobel")) return CANONICAL_IMPLANT_SYSTEMS.nobel_biocare;
	if (normalized.includes("dentium")) return CANONICAL_IMPLANT_SYSTEMS.dentium;
	if (normalized.includes("astra")) return CANONICAL_IMPLANT_SYSTEMS.astra_tech;
	if (normalized.includes("anyridge") || normalized.includes("megagen")) return CANONICAL_IMPLANT_SYSTEMS.anyridge;
	return CANONICAL_IMPLANT_SYSTEMS.osstem;
}

export function getMischBoneDensityByToothFdi(toothFdi: number): MischBoneDensity {
	if (toothFdi >= 11 && toothFdi <= 28) {
		if ([17, 18, 27, 28].includes(toothFdi)) return "D4";
		return "D3";
	}
	if (toothFdi >= 31 && toothFdi <= 48) {
		if ([31, 32, 33, 41, 42, 43].includes(toothFdi)) return "D1";
		if ([37, 38, 47, 48].includes(toothFdi)) return "D3";
		return "D2";
	}
	return "D2";
}

export function getRecommendedTorqueZone(torqueNcm: number): {
	readonly status: "under_torque" | "optimal_green" | "over_torque";
	readonly labelRu: string;
	readonly colorClass: string;
} {
	if (torqueNcm < 35) {
		return { status: "under_torque", labelRu: "Низкий торк (<35 Н·см) — риск микродвижений", colorClass: "text-amber-500" };
	}
	if (torqueNcm <= 45) {
		return { status: "optimal_green", labelRu: "Оптимальная первичная стабильность (35–45 Н·см)", colorClass: "text-emerald-500" };
	}
	return { status: "over_torque", labelRu: "Повышенный торк (>45 Н·см) — риск ишемии кортикала", colorClass: "text-rose-500" };
}

export function formatKopecksToRubles(kopecks: bigint | number): string {
	const rub = typeof kopecks === "bigint" ? Number(kopecks) / 100 : kopecks / 100;
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(rub);
}

export function generateWarrantyPassportRecord(params: {
	toothFdi: number;
	systemId: CanonicalImplantSystemId;
	diameterMm?: number | undefined;
	lengthMm?: number | undefined;
	torqueNcm?: number | undefined;
	isq?: number | undefined;
	stage?: ImplantStageType | undefined;
	patientName?: string | undefined;
	patientId?: string | undefined;
	doctorName?: string | undefined;
	doctorId?: string | undefined;
	lotNumber?: string | undefined;
	serialNumber?: string | undefined;
	surgeryDateIso?: string | undefined;
}): ImplantWarrantyPassportData {
	const sys = CANONICAL_IMPLANT_SYSTEMS[params.systemId] || CANONICAL_IMPLANT_SYSTEMS.osstem;
	const diameterMm = params.diameterMm ?? sys.defaultDiameterMm;
	const lengthMm = params.lengthMm ?? sys.defaultLengthMm;
	const torqueNcm = params.torqueNcm ?? sys.defaultTorqueNcm;
	const isqValue = params.isq ?? 72;
	const stage = params.stage ?? "one_stage_healing_abutment";
	const toothFdi = params.toothFdi || 46;
	const boneDensity = getMischBoneDensityByToothFdi(toothFdi);
	const now = new Date();
	const surgeryDateIso = params.surgeryDateIso ?? now.toISOString().slice(0, 10);
	
	// Остеоинтеграция: 3 мес для нижней челюсти, 4-6 мес для верхней
	const isUpper = toothFdi >= 11 && toothFdi <= 28;
	const osteoMonths = isUpper ? 5 : 3;
	const expectedDate = new Date(now.getTime() + osteoMonths * 30 * 24 * 60 * 60 * 1000);
	const expectedDateIso = expectedDate.toISOString().slice(0, 10);

	const lotNumber = params.lotNumber || `LOT-${sys.id.toUpperCase().slice(0, 3)}-${now.getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
	const serialNumber = params.serialNumber || `SN-${Math.floor(100000 + Math.random() * 900000)}`;
	const passportId = `PASS-IMP-${toothFdi}-${Date.now().toString(36).toUpperCase()}`;
	const article = `${sys.defaultArticlePrefix}-${Math.round(diameterMm * 10)}${Math.round(lengthMm * 10)}`;

	const verificationQrPayload = JSON.stringify({
		passportId,
		toothFdi,
		brand: sys.brandName,
		lot: lotNumber,
		sn: serialNumber,
		date: surgeryDateIso,
		osteoDate: expectedDateIso,
		warranty: "Lifetime Manufacturer Osseointegration Guarantee",
	});

	return {
		passportId,
		toothFdi,
		systemId: sys.id,
		brandName: sys.brandName,
		lineName: sys.lineName,
		catalogArticle: article,
		diameterMm,
		lengthMm,
		insertionTorqueNcm: torqueNcm,
		isqValue,
		boneDensity,
		stage,
		lotNumber,
		serialNumber,
		patientName: params.patientName || "Иванов Иван Иванович",
		patientId: params.patientId || "PAT-01",
		doctorName: params.doctorName || "Д-р Воронов А. В.",
		doctorId: params.doctorId || "DOC-01",
		surgeryDateIso,
		expectedOsteointegrationDateIso: expectedDateIso,
		implantCostKopecks: sys.implantCostKopecks,
		patientPriceKopecks: sys.patientPriceKopecks,
		verificationQrPayload,
	};
}

export function buildSoapSurgeryDiaryText(params: {
	toothFdi: number;
	boneDensity: MischBoneDensity;
	brandName: string;
	lineName: string;
	diameterMm: number;
	lengthMm: number;
	torqueNcm: number;
	isqValue: number;
	screwdriverAliasRu: string;
	stage: ImplantStageType;
	isGbrPerformed: boolean;
}): string {
	const stageText = params.stage === "one_stage_healing_abutment" ? "установка формирователя десны (ФДМ)" : "винт-заглушка с ушиванием наглухо";
	const gbrText = params.isGbrPerformed ? "Проведена костная пластика (GBR) с фиксацией коллагеновой мембраны." : "Без аугментации.";
	return `ДНЕВНИК ХИРУРГИЧЕСКОГО ПРИЁМА: ОПЕРАЦИЯ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ
Локализация: зуб ${params.toothFdi} (Плотность костной ткани по Misch: ${params.boneDensity}).
Протокол вмешательства: инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.
Разрез по гребню, отслаивание слизисто-надкостничного лоскута.
Формирование костного ложа под обильным стерильным охлаждением 0.9% NaCl.
Установлен имплантат: ${params.brandName} ${params.lineName} Ø ${params.diameterMm} мм × ${params.lengthMm} мм.
Первичная торсионная стабильность: ${params.torqueNcm} Н·см. Коэффициент ISQ: ${params.isqValue}.
Отвертка: ${params.screwdriverAliasRu}.
Этап: ${stageText}. ${gbrText}
Ушивание раны узловыми швами. Гемостаз полный. Пациенту выдан гарантийный паспорт имплантата.`;
}

