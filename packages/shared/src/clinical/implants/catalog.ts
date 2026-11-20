/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL IMPLANT & SURGERY CATALOG SSOT
 *
 * Канонический реестр имплантационных систем, хирургических сценариев,
 * типоразмеров, торка, стабильности ISQ и протоколов операции (Мандаты 8e, 8n, 8x).
 * Чистый клинический язык без канцелярита и дев-сленга.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type {
	FastImplantPassportData,
	MischBoneDensity,
	ImplantCapKind,
} from "../../types/surgery.js";

export {
	type FastImplantPassportData,
	type MischBoneDensity,
	type ImplantCapKind,
	DENTAL_IMPLANTATION_NORM_TEXT,
	SIMPLE_EXTRACTION_NORM_TEXT,
	ATYPICAL_EXTRACTION_NORM_TEXT,
	SINUS_LIFT_GBR_NORM_TEXT,
} from "../../types/surgery.js";

export const PERIO_SURGERY_NORM_TEXT =
	"Под местной анестезией Артикаин 1:200 000 — 1.7 мл. Внутрибороздковые разрезы, отслоен слизистый лоскут. " +
	"Ультразвуковым и ручным кюретажем Gracey удалены поддесневые зубные отложения, грануляционная ткань. " +
	"Медикаментозная обработка 0.05% хлоргексидином. Лоскут репозиционирован, наложены межзубные швы.";

export const EMERGENCY_LAST_NORM_TEXT =
	"Экстренная помощь: прекращение введения анестетика. Оксигенотерапия 100% O2. " +
	"Внутривенный доступ. Инфузия липидной эмульсии 20% (Липофундин / Интралипид) болюсно 1.5 мл/кг, затем инфузия 0.25 мл/кг/мин. " +
	"Мониторинг АД, ЧСС, SpO2, ЭКГ. Бригада СМП вызвана по номеру 112.";

export type ImplantBrand =
	| "straumann"
	| "osstem"
	| "nobel"
	| "dentium"
	| "astra"
	| "ankylos";

export type CanonicalImplantSystemId =
	| "osstem"
	| "straumann"
	| "nobel_biocare"
	| "dentium"
	| "astra_tech"
	| "anyridge"
	| "ankylos"
	| "mis";

export interface ImplantSystemSpec {
	id: ImplantBrand;
	name: string;
	manufacturer: string;
	country: string;
	warrantyYears: number;
	defaultDiameterMm: number;
	defaultLengthMm: number;
	minInsertionTorqueNcm: number;
	defaultTorqueNcm: number;
	maxSafeTorqueNcm: number;
	minSafeIsq: number;
	recommendedIsq: number;
	hexSizeMm: number;
	driverTool: string;
	diametersMm: readonly number[];
	lengthsMm: readonly number[];
	popularSizes: readonly { diameterMm: number; lengthMm: number }[];
	platformTypes: readonly string[];
}

export const NORMALIZED_IMPLANT_SYSTEMS: Record<ImplantBrand, ImplantSystemSpec> = {
	straumann: {
		id: "straumann",
		name: "Straumann (SLA / SLActive)",
		manufacturer: "Institut Straumann AG",
		country: "Швейцария",
		warrantyYears: 10,
		defaultDiameterMm: 4.1,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 15,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 50,
		minSafeIsq: 65,
		recommendedIsq: 72,
		hexSizeMm: 2.45,
		driverTool: "SCS Screwdriver",
		diametersMm: [3.3, 4.1, 4.8],
		lengthsMm: [8.0, 10.0, 12.0, 14.0],
		popularSizes: [
			{ diameterMm: 4.1, lengthMm: 10.0 },
			{ diameterMm: 4.1, lengthMm: 12.0 },
			{ diameterMm: 4.8, lengthMm: 10.0 },
		],
		platformTypes: ["Tissue Level (RN)", "Bone Level (NC/RC)"],
	},
	osstem: {
		id: "osstem",
		name: "Osstem (TS III SA / CA)",
		manufacturer: "Osstem Implant Co., Ltd.",
		country: "Южная Корея",
		warrantyYears: 10,
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		minSafeIsq: 65,
		recommendedIsq: 70,
		hexSizeMm: 2.5,
		driverTool: "1.2 Hex Driver",
		diametersMm: [3.5, 4.0, 4.5, 5.0],
		lengthsMm: [8.5, 10.0, 11.5, 13.0],
		popularSizes: [
			{ diameterMm: 4.0, lengthMm: 10.0 },
			{ diameterMm: 4.5, lengthMm: 10.0 },
			{ diameterMm: 4.0, lengthMm: 11.5 },
		],
		platformTypes: ["Mini (Ø3.5)", "Regular (Ø4.0-5.0)"],
	},
	nobel: {
		id: "nobel",
		name: "Nobel Biocare (Active / Replace)",
		manufacturer: "Nobel Biocare Services AG",
		country: "Швейцария / США",
		warrantyYears: 10,
		defaultDiameterMm: 4.3,
		defaultLengthMm: 11.5,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		minSafeIsq: 65,
		recommendedIsq: 70,
		hexSizeMm: 2.25,
		driverTool: "Unigrip Driver",
		diametersMm: [3.5, 4.3, 5.0],
		lengthsMm: [8.5, 10.0, 11.5, 13.0, 15.0],
		popularSizes: [
			{ diameterMm: 4.3, lengthMm: 10.0 },
			{ diameterMm: 4.3, lengthMm: 11.5 },
			{ diameterMm: 5.0, lengthMm: 10.0 },
		],
		platformTypes: ["NP (3.5)", "RP (4.3/5.0)", "WP (5.5)"],
	},
	dentium: {
		id: "dentium",
		name: "Dentium (SuperLine / Implantium)",
		manufacturer: "Dentium Co., Ltd.",
		country: "Южная Корея",
		warrantyYears: 10,
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		minSafeIsq: 65,
		recommendedIsq: 70,
		hexSizeMm: 2.5,
		driverTool: "1.27 Hex Driver",
		diametersMm: [3.6, 4.0, 4.5, 5.0],
		lengthsMm: [8.0, 10.0, 12.0, 14.0],
		popularSizes: [
			{ diameterMm: 4.0, lengthMm: 10.0 },
			{ diameterMm: 4.5, lengthMm: 10.0 },
			{ diameterMm: 4.0, lengthMm: 12.0 },
		],
		platformTypes: ["Hex Connection 2.5", "Internal Conical 11°"],
	},
	astra: {
		id: "astra",
		name: "Astra Tech (OsseoSpeed EV)",
		manufacturer: "Dentsply Sirona Implants",
		country: "Швеция",
		warrantyYears: 10,
		defaultDiameterMm: 4.2,
		defaultLengthMm: 11.0,
		minInsertionTorqueNcm: 15,
		defaultTorqueNcm: 30,
		maxSafeTorqueNcm: 45,
		minSafeIsq: 65,
		recommendedIsq: 70,
		hexSizeMm: 2.0,
		driverTool: "Astra Torque Driver",
		diametersMm: [3.6, 4.2, 4.8],
		lengthsMm: [8.0, 9.0, 11.0, 13.0, 15.0],
		popularSizes: [
			{ diameterMm: 4.2, lengthMm: 11.0 },
			{ diameterMm: 4.2, lengthMm: 9.0 },
			{ diameterMm: 4.8, lengthMm: 11.0 },
		],
		platformTypes: ["Conical Seal Design (EV 3.6/4.2/4.8)"],
	},
	ankylos: {
		id: "ankylos",
		name: "Ankylos (C/X TissueCare)",
		manufacturer: "Dentsply Sirona Implants",
		country: "Германия",
		warrantyYears: 10,
		defaultDiameterMm: 3.5,
		defaultLengthMm: 11.0,
		minInsertionTorqueNcm: 15,
		defaultTorqueNcm: 25,
		maxSafeTorqueNcm: 40,
		minSafeIsq: 65,
		recommendedIsq: 70,
		hexSizeMm: 1.0,
		driverTool: "Ankylos Hex 1.0",
		diametersMm: [3.5, 4.5, 5.5],
		lengthsMm: [8.0, 9.5, 11.0, 14.0],
		popularSizes: [
			{ diameterMm: 3.5, lengthMm: 11.0 },
			{ diameterMm: 4.5, lengthMm: 11.0 },
			{ diameterMm: 3.5, lengthMm: 9.5 },
		],
		platformTypes: ["TissueCare Cone 5.7° (A, B, C)"],
	},
};

export const CLINICAL_IMPLANT_BRANDS: readonly ImplantSystemSpec[] = [
	NORMALIZED_IMPLANT_SYSTEMS.straumann,
	NORMALIZED_IMPLANT_SYSTEMS.osstem,
	NORMALIZED_IMPLANT_SYSTEMS.nobel,
	NORMALIZED_IMPLANT_SYSTEMS.dentium,
	NORMALIZED_IMPLANT_SYSTEMS.astra,
	NORMALIZED_IMPLANT_SYSTEMS.ankylos,
];

export function getImplantSystemSpec(brandOrName: string): ImplantSystemSpec {
	const key = brandOrName.toLowerCase().trim();
	for (const brand of CLINICAL_IMPLANT_BRANDS) {
		if (brand.id === key || brand.name.toLowerCase().includes(key) || key.includes(brand.id)) {
			return brand;
		}
	}
	return NORMALIZED_IMPLANT_SYSTEMS.dentium;
}

export type ImplantCapType =
	| "cover_screw"
	| "healing_abutment"
	| "immediate_temp"
	| "plug"
	| "fdm"
	| "temporary_crown";

export const CAP_TYPE_LABELS: Record<ImplantCapType, string> = {
	cover_screw: "Винт-заглушка",
	healing_abutment: "Формирователь десны (ФДМ)",
	immediate_temp: "Временный абатмент",
	plug: "Винт-заглушка",
	fdm: "Формирователь десны (ФДМ)",
	temporary_crown: "Временная коронка",
};

export const MISCH_BONE_LABELS: Record<MischBoneDensity, string> = {
	D1: "D1 — Плотная кортикальная кость (передний отдел нижней челюсти)",
	D2: "D2 — Толстая кортикальная + плотная губчатая (нижняя челюсть)",
	D3: "D3 — Тонкая кортикальная + пористая губчатая (верхняя челюсть)",
	D4: "D4 — Тонкая губчатая кость низкого качества (бугор верхней челюсти)",
	D5: "D5 — Незрелая кость / костный регенерат",
};

/**
 * Преобразование типа колпачка к каноническому ImplantCapKind ("fdm" | "plug")
 */
export function normalizeCapTypeToKind(capType?: string | null): ImplantCapKind {
	if (!capType) return "fdm";
	if (capType === "cover_screw" || capType === "plug") return "plug";
	return "fdm";
}

/**
 * Создание канонической записи гарантийного паспорта имплантата.
 * Без хардкода тестовых персонажей (Мандат 8z).
 */
export function generateWarrantyPassportRecord(
	data: Partial<FastImplantPassportData> & {
		implantBrand?: string;
		implantModel?: string;
		insertionTorqueNcm?: number;
		isqScore?: number;
		installationDateIso?: string;
		warrantyYears?: number;
		clinicName?: string;
	} = {},
): FastImplantPassportData {
	const brandStr = data.brand || data.implantBrand || "Dentium";
	const spec = getImplantSystemSpec(brandStr);
	const modelStr = data.model || data.implantModel || "SuperLine";

	return {
		toothFdi: data.toothFdi ?? 46,
		brand: spec.name.split(" ")[0] || brandStr,
		model: modelStr,
		diameterMm: data.diameterMm ?? spec.defaultDiameterMm,
		lengthMm: data.lengthMm ?? spec.defaultLengthMm,
		torqueNcm: data.torqueNcm ?? data.insertionTorqueNcm ?? spec.defaultTorqueNcm,
		isqDay0: data.isqDay0 ?? data.isqScore ?? spec.recommendedIsq,
		boneDensity: data.boneDensity || "D2",
		capType: normalizeCapTypeToKind(data.capType),
		lotNumber: data.lotNumber?.trim() || "",
		serialNumber: data.serialNumber?.trim() || undefined,
		catalogArticle: data.catalogArticle || `${spec.id.toUpperCase()}-${data.diameterMm ?? spec.defaultDiameterMm}-${data.lengthMm ?? spec.defaultLengthMm}`,
		dateIso: data.dateIso || data.installationDateIso || new Date().toISOString().split("T")[0] || "2026-01-01",
		patientName: data.patientName?.trim() || "Пациент не выбран",
		patientId: data.patientId,
		doctorName: data.doctorName?.trim() || "Врач-хирург",
		doctorId: data.doctorId,
		notes: data.notes || undefined,
		passportId: data.passportId,
		isWarehouseOverdraft: data.isWarehouseOverdraft,
	};
}

export const createDefaultPassportRecord = generateWarrantyPassportRecord;

/**
 * Формирование клинического текста дневника приёма для медицинской карты.
 */
export function buildImplantProtocolText(data: FastImplantPassportData): string {
	const capType: ImplantCapType = data.capType ?? "fdm";
	const capLabel = CAP_TYPE_LABELS[capType] || "Формирователь десны (ФДМ)";
	const boneLabel = MISCH_BONE_LABELS[data.boneDensity] || data.boneDensity;
	const isqText = data.isqDay0 ? `. RFA стабильность ISQ: ${data.isqDay0}` : "";

	return (
		`Операция дентальной имплантации в области зуба FDI #${data.toothFdi}. ` +
		`Под местной анестезией отслоен слизисто-надкостничный лоскут. Скелетирована кость (${boneLabel}). ` +
		`Сформировано костное ложе ступенчатыми фрезами с обильным физиологическим охлаждением. ` +
		`Установлен имплантат ${data.brand} ${data.model} Ø${data.diameterMm} × ${data.lengthMm} мм (партия: ${data.lotNumber || "б/н"}). ` +
		`Первичная торк-стабильность: ${data.torqueNcm} Н·см${isqText}. ` +
		`Установлен элемент: ${capLabel}. Лоскут мобилизован, наложены узловые швы. Гемостаз полный. ` +
		`Послеоперационные рекомендации выданы, контрольный осмотр через 48 часов.`
	);
}

// ══════════════════════════════════════════════════════════════════════════════
// ХИРУРГИЧЕСКИЕ СЦЕНАРИИ И НОРМЫ
// ══════════════════════════════════════════════════════════════════════════════

export const SURGERY_SCENARIOS = [
	"extraction",
	"implant",
	"sinus_gbr",
	"perio",
	"emergency",
] as const;

export type SurgeryScenario = (typeof SURGERY_SCENARIOS)[number];

export interface ClinicalScenarioConfig {
	id: SurgeryScenario;
	label: string;
	description: string;
	defaultTooth: number;
	badgeColor: string;
}

export const CLINICAL_SCENARIO_CONFIGS: Record<SurgeryScenario, ClinicalScenarioConfig> = {
	extraction: {
		id: "extraction",
		label: "Удаление зуба",
		description: "Простое, сложное, дистопированные и ретинированные зубы",
		defaultTooth: 48,
		badgeColor: "amber",
	},
	implant: {
		id: "implant",
		label: "Имплантация",
		description: "Установка дентального имплантата с протоколированием торка и ISQ",
		defaultTooth: 46,
		badgeColor: "teal",
	},
	sinus_gbr: {
		id: "sinus_gbr",
		label: "Синус-лифтинг и НКР",
		description: "Субантральная аугментация и направленная костная регенерация",
		defaultTooth: 16,
		badgeColor: "indigo",
	},
	perio: {
		id: "perio",
		label: "Пародонтология",
		description: "Кюретаж, пластика рецессий, гингивэктомия и лоскутные операции",
		defaultTooth: 31,
		badgeColor: "emerald",
	},
	emergency: {
		id: "emergency",
		label: "Неотложная помощь",
		description: "Анафилаксия, LAST-токсичность, коллапс и вызов СМП (112)",
		defaultTooth: 0,
		badgeColor: "rose",
	},
};

export const SURGERY_ANESTHETICS = [
	{ id: "art_100", name: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)", defaultDose: "1.7 мл" },
	{ id: "art_200", name: "Артикаин 4% с эпинефрином 1:200 000 (1.7 мл)", defaultDose: "1.7 мл" },
	{ id: "mepi_plain", name: "Мепивакаин 3% без вазоконстриктора (1.7 мл)", defaultDose: "1.7 мл" },
	{ id: "lidocaine", name: "Лидокаин 2% (2.0 мл)", defaultDose: "2.0 мл" },
] as const;

export const SURGICAL_SERVICES_CATALOG = [
	{ code: "A16.07.001", name: "Удаление зуба простое", priceKopecks: 350000 },
	{ code: "A16.07.001.001", name: "Удаление зуба сложное с разъединением корней", priceKopecks: 650000 },
	{ code: "A16.07.001.002", name: "Удаление зуба ретинированного / дистопированного", priceKopecks: 950000 },
	{ code: "A16.07.054", name: "Внутрикостная дентальная имплантация", priceKopecks: 3500000 },
	{ code: "A16.07.055", name: "Синус-лифтинг открытый (костная пластика)", priceKopecks: 4500000 },
	{ code: "A16.07.041", name: "Костная пластика челюсти (НКР)", priceKopecks: 3000000 },
	{ code: "A16.07.019", name: "Ушивание раны в полости рта", priceKopecks: 120000 },
] as const;

/** @deprecated Use SURGICAL_SERVICES_CATALOG instead (Mandate 8x) */
export const SURGICAL_SERVICES_804N = SURGICAL_SERVICES_CATALOG;

export const SURGERY_CONSUMABLES = [
	{ id: "suture_vicryl_40", name: "Шовный материал Vicryl 4-0 (колющая игла)", category: "suture" },
	{ id: "suture_prolene_50", name: "Шовный материал Prolene 5-0 (обратно-режущая игла)", category: "suture" },
	{ id: "suture_pga_40", name: "Шовный материал ПГА 4-0", category: "suture" },
	{ id: "membrane_collagen", name: "Резорбируемая коллагеновая мембрана 20×30 мм", category: "membrane" },
	{ id: "bone_graft_05", name: "Остеопластический материал ксенографт 0.5 см³", category: "bone_graft" },
	{ id: "hemostatic_sponge", name: "Гемостатическая губка с антисептиком", category: "hemostatic" },
	{ id: "blade_15c", name: "Хирургическое лезвие №15C", category: "blade" },
] as const;
