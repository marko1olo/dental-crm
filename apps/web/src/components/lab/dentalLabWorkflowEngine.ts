/**
 * dentalLabWorkflowEngine.ts — Движок зуботехнической лаборатории (ЗТЛ).
 * Канонический доменный слой ЗТЛ по Мандатам 8b, 8e, 8am.
 */

import { DENTAL_LAB_CONSTRUCTIONS, type DentalLabConstructionType, type DentalLabConstructionDef } from "@dental/shared";
import { addWorkingDaysRu } from "./dentalLabCatalogData";

// ─── 1. ORTHOPEDIC WORK TYPES ──────────────────────────────────────────────────
export type OrthopedicWorkTypeId =
	| "crown_zirconia"
	| "crown_emax"
	| "metal_ceramic"
	| "temporary_pmma"
	| "clasp_prosthesis"
	| "custom_abutment"
	| "removable_acrylic"
	| "aligners";

export interface OrthopedicWorkTypeDefinition {
	readonly id: OrthopedicWorkTypeId;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly categoryRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly defaultMaterialRu: string;
	readonly standardTurnaroundWorkingDays: number;
	readonly requiresFittingStage: boolean;
	readonly requiresStumpShade: boolean;
	readonly requiresImplantSystem: boolean;
	readonly defaultPriceKopecks: number;
	readonly defaultCostKopecks: number;
	readonly canonicalConstructionId?: DentalLabConstructionType | undefined;
	readonly canonicalDef?: DentalLabConstructionDef | undefined;
}

export const FIXED_ORTHOPEDIC_WORK_TYPES: Record<"crown_emax" | "crown_zirconia" | "metal_ceramic" | "temporary_pmma", OrthopedicWorkTypeDefinition> = {
	crown_emax: {
		id: "crown_emax",
		nameRu: "Коронка IPS e.max Press / CAD (дисиликат лития)",
		shortNameRu: "Коронка e.max Press",
		categoryRu: "Несъемное протезирование",
		descriptionRu: "Высокоэстетичная цельнокерамическая реставрация из дисиликата лития с естественной опалесценцией и флюоресценцией.",
		icon: "diamond",
		defaultMaterialRu: "IPS e.max Press (Ivoclar Vivadent)",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.crown_emax.standardTurnaroundDays,
		requiresFittingStage: true,
		requiresStumpShade: DENTAL_LAB_CONSTRUCTIONS.crown_emax.requiresStumpShade,
		requiresImplantSystem: false,
		defaultPriceKopecks: 2400000,
		defaultCostKopecks: 800000,
		canonicalConstructionId: "crown_emax",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.crown_emax,
	},
	crown_zirconia: {
		id: "crown_zirconia",
		nameRu: "Коронка из диоксида циркония (Katana ML / Prettau)",
		shortNameRu: "Коронка ZrO₂ (Katana ML)",
		categoryRu: "Несъемное протезирование",
		descriptionRu: "Анатомическая монолитная коронка из многослойного диоксида циркония с плавным градиентом прозрачности и прочностью > 1100 МПа.",
		icon: "crown",
		defaultMaterialRu: "Katana Zirconia HTML (Kuraray Noritake)",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.standardTurnaroundDays,
		requiresFittingStage: false,
		requiresStumpShade: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.requiresStumpShade,
		requiresImplantSystem: false,
		defaultPriceKopecks: 2200000,
		defaultCostKopecks: 700000,
		canonicalConstructionId: "crown_zirconia",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia,
	},
	metal_ceramic: {
		id: "metal_ceramic",
		nameRu: "Металлокерамическая коронка (Co-Cr фрезерованный / литой)",
		shortNameRu: "Металлокерамика Co-Cr",
		categoryRu: "Несъемное протезирование",
		descriptionRu: "Классическая металлокерамическая коронка на фрезерованном или литом кобальт-хромовом каркасе с послойной керамической облицовкой.",
		icon: "shield",
		defaultMaterialRu: "Co-Cr сплав Bego Wiron light + Noritake EX-3",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.standardTurnaroundDays,
		requiresFittingStage: true,
		requiresStumpShade: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.requiresStumpShade,
		requiresImplantSystem: false,
		defaultPriceKopecks: 1400000,
		defaultCostKopecks: 450000,
		canonicalConstructionId: "metal_ceramic",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic,
	},
	temporary_pmma: {
		id: "temporary_pmma",
		nameRu: "Временная пластмассовая коронка PMMA (фрезерованная / 3D печать)",
		shortNameRu: "Временная PMMA",
		categoryRu: "Временное протезирование",
		descriptionRu: "Высокоточная провизорная коронка из фрезерованного PMMA CAD/CAM или биосовместимого 3D-фотополимера для защиты препарированного зуба.",
		icon: "clock",
		defaultMaterialRu: "PMMA CAD/CAM фрезерованная / NextDent C&B",
		standardTurnaroundWorkingDays: 2,
		requiresFittingStage: false,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 250000,
		defaultCostKopecks: 80000,
	},
};

export const REMOVABLE_ORTHOPEDIC_WORK_TYPES: Record<"clasp_prosthesis" | "removable_acrylic" | "custom_abutment" | "aligners", OrthopedicWorkTypeDefinition> = {
	clasp_prosthesis: {
		id: "clasp_prosthesis",
		nameRu: "Бюгельный протез с замковой фиксацией Bredent / кламмерами",
		shortNameRu: "Бюгельный протез Bredent",
		categoryRu: "Съемное протезирование",
		descriptionRu: "Дуговой цельнолитой протез на Co-Cr каркасе с микрозамками Bredent VKS-SG или опорно-удерживающими кламмерами и гарнитурными зубами.",
		icon: "tooth",
		defaultMaterialRu: "Co-Cr дуга BEGO + замки Bredent VKS + Ivoclar Vivodent",
		standardTurnaroundWorkingDays: 10,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 4800000,
		defaultCostKopecks: 1650000,
		canonicalConstructionId: "clasp_denture",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.clasp_denture,
	},
	removable_acrylic: {
		id: "removable_acrylic",
		nameRu: "Съемный пластиночный протез (Acry-Free / Ивокрил)",
		shortNameRu: "Съемный акриловый протез",
		categoryRu: "Съемное протезирование",
		descriptionRu: "Полный или частичный съемный протез из безаллергенного термопласта Acry-Free или горячеполимеризуемой акриловой пластмассы.",
		icon: "clamp",
		defaultMaterialRu: "Термопласт Acry-Free / Акрил Vertex Rapid Simplified",
		standardTurnaroundWorkingDays: 8,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 3200000,
		defaultCostKopecks: 1100000,
	},
	custom_abutment: {
		id: "custom_abutment",
		nameRu: "Индивидуальный абатмент (Ti-Base / ZrO₂) + коронка",
		shortNameRu: "Индивидуальный абатмент + коронка",
		categoryRu: "Протезирование на имплантатах",
		descriptionRu: "Фрезерованный индивидуальный титановый или циркониевый абатмент с винтовой фиксацией на дентальный имплантат и циркониевой коронкой.",
		icon: "bolt",
		defaultMaterialRu: "Титан Grade 5 ELI + ZrO₂ Katana ML (Medentika / Straumann)",
		standardTurnaroundWorkingDays: 7,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		defaultPriceKopecks: 3800000,
		defaultCostKopecks: 1300000,
	},
	aligners: {
		id: "aligners",
		nameRu: "Элайнеры / Ортодонтические каппы / Сплинты",
		shortNameRu: "Элайнеры / Сплинт-каппа",
		categoryRu: "Ортодонтия и сплинты",
		descriptionRu: "Серия прозрачных биосовместимых капп толщиной 0.75 мм из многослойного полиэтилентерефталата (PET-G) для перемещения зубов или окклюзионной терапии.",
		icon: "Target",
		defaultMaterialRu: "Биосовместимый полимер Duran / Zendura FLX (3D-печать моделей)",
		standardTurnaroundWorkingDays: 6,
		requiresFittingStage: false,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 1800000,
		defaultCostKopecks: 550000,
		canonicalConstructionId: "aligner_splint",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.aligner_splint,
	},
};

export const ORTHOPEDIC_WORK_TYPES: Record<OrthopedicWorkTypeId, OrthopedicWorkTypeDefinition> = {
	...FIXED_ORTHOPEDIC_WORK_TYPES,
	...REMOVABLE_ORTHOPEDIC_WORK_TYPES,
};

export const ORDERED_MARKET_ORTHOPEDIC_TYPES: readonly OrthopedicWorkTypeId[] = [
	"crown_zirconia",
	"crown_emax",
	"metal_ceramic",
	"temporary_pmma",
	"clasp_prosthesis",
	"custom_abutment",
	"removable_acrylic",
	"aligners",
] as const;

export function getCanonicalLabConstruction(typeId: OrthopedicWorkTypeId) {
	const item = ORTHOPEDIC_WORK_TYPES[typeId];
	if (!item?.canonicalConstructionId) return null;
	return DENTAL_LAB_CONSTRUCTIONS[item.canonicalConstructionId] ?? null;
}

export { DENTAL_LAB_CONSTRUCTIONS };

// ─── 2. WORKFLOW STATUSES & STAGES ─────────────────────────────────────────────
export type LabWorkflowStatus =
	| "draft"
	| "sent_to_lab"
	| "fitting_scheduled"
	| "installed_completed"
	| "warranty_rework";

export type LabProductionStageId = LabWorkflowStatus;

export interface LabWorkflowStatusDefinition {
	readonly id: LabWorkflowStatus;
	readonly stepIndex: number;
	readonly nameRu: string;
	readonly shortTitleRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly badgeClass: string;
	readonly colorHex: string;
}

export const LAB_WORKFLOW_STATUSES: Record<LabWorkflowStatus, LabWorkflowStatusDefinition> = {
	draft: {
		id: "draft",
		stepIndex: 1,
		nameRu: "Черновик",
		shortTitleRu: "Черновик",
		descriptionRu: "Наряд-заказ первично оформлен ортопедом, уточняются параметры слепка и оттенок.",
		icon: "FileText",
		badgeClass: "badge-slate",
		colorHex: "#64748b",
	},
	sent_to_lab: {
		id: "sent_to_lab",
		stepIndex: 2,
		nameRu: "Отправлено в ЗТЛ",
		shortTitleRu: "В лаборатории",
		descriptionRu: "Слепки / цифровые сканы переданы курьеру и поступили в зуботехническую лабораторию.",
		icon: "Truck",
		badgeClass: "badge-blue",
		colorHex: "#3b82f6",
	},
	fitting_scheduled: {
		id: "fitting_scheduled",
		stepIndex: 3,
		nameRu: "Примерка назначена",
		shortTitleRu: "Примерка",
		descriptionRu: "Работа изготовлена ЗТЛ, назначена дата клинической примерки или сдачи в расписании приема.",
		icon: "Calendar",
		badgeClass: "badge-amber",
		colorHex: "#f59e0b",
	},
	installed_completed: {
		id: "installed_completed",
		stepIndex: 4,
		nameRu: "Сдано пациенту",
		shortTitleRu: "Сдано",
		descriptionRu: "Ортопедическая конструкция окончательно зафиксирована в полости рта пациента, наряд закрыт.",
		icon: "CheckCircle2",
		badgeClass: "badge-emerald",
		colorHex: "#10b981",
	},
	warranty_rework: {
		id: "warranty_rework",
		stepIndex: 5,
		nameRu: "Гарантийная переделка / рекламация",
		shortTitleRu: "Переделка / Рекламация",
		descriptionRu: "Работа направлена в ЗТЛ на гарантийную переделку или доработку.",
		icon: "RotateCcw",
		badgeClass: "badge-rose",
		colorHex: "#f43f5e",
	},
};

export const LAB_WORKFLOW_STATUS_ORDER: readonly LabWorkflowStatus[] = [
	"draft",
	"sent_to_lab",
	"fitting_scheduled",
	"installed_completed",
];

export const ALL_LAB_WORKFLOW_STATUSES: readonly LabWorkflowStatus[] = [
	...LAB_WORKFLOW_STATUS_ORDER,
	"warranty_rework",
];

export const LAB_PRODUCTION_STAGES = LAB_WORKFLOW_STATUSES;
export const LAB_PRODUCTION_STAGE_ORDER = LAB_WORKFLOW_STATUS_ORDER;

export function canAdvanceLabStage(
	currentStage: LabWorkflowStatus,
	targetStage: LabWorkflowStatus,
): boolean {
	if (currentStage === targetStage) return true;
	if (targetStage === "warranty_rework") {
		return currentStage === "installed_completed" || currentStage === "fitting_scheduled";
	}
	if (currentStage === "warranty_rework") {
		return targetStage === "sent_to_lab" || targetStage === "fitting_scheduled" || targetStage === "installed_completed";
	}
	const currentIndex = LAB_WORKFLOW_STATUSES[currentStage]?.stepIndex ?? 1;
	const targetIndex = LAB_WORKFLOW_STATUSES[targetStage]?.stepIndex ?? 1;
	return targetIndex >= 1 && targetIndex <= 5 && currentIndex >= 1;
}

export function getNextLabProductionStage(
	currentStage: LabWorkflowStatus,
): LabWorkflowStatus | null {
	if (currentStage === "warranty_rework") {
		return "sent_to_lab";
	}
	const currentIndex = LAB_WORKFLOW_STATUS_ORDER.indexOf(currentStage);
	if (currentIndex === -1 || currentIndex >= LAB_WORKFLOW_STATUS_ORDER.length - 1) {
		return null;
	}
	return LAB_WORKFLOW_STATUS_ORDER[currentIndex + 1] ?? null;
}

// ─── 3. TECHNOLOGICAL STAGES ───────────────────────────────────────────────────
export type CanonicalLabTechnologicalStageId =
	| "impression_scan"
	| "in_lab"
	| "ready_in_clinic"
	| "fitting_fixation";

export type LegacyLabTechnologicalStageId =
	| "waxup_cad"
	| "milling_framework"
	| "clinical_fitting"
	| "ceramic_layering"
	| "glaze_finish"
	| "patient_fixation";

export type LabTechnologicalStageId = CanonicalLabTechnologicalStageId | LegacyLabTechnologicalStageId;

export interface LabTechnologicalStageDefinition {
	id: LabTechnologicalStageId;
	stepIndex: number;
	stepNumber: number;
	nameRu: string;
	shortTitleRu: string;
	departmentRu: string;
	descriptionRu: string;
	icon: string;
	colorToken: string;
}

const IMPRESSION: LabTechnologicalStageDefinition = {
	id: "impression_scan",
	stepIndex: 1,
	stepNumber: 1,
	nameRu: "1. Скан/Слепок снят",
	shortTitleRu: "Скан/Слепок снят",
	departmentRu: "Клинический кабинет",
	descriptionRu: "Снятие оттисков или интраоральное цифровое 3D-сканирование.",
	icon: "scan",
	colorToken: "var(--brand-500, #3b82f6)",
};

const IN_LAB: LabTechnologicalStageDefinition = {
	id: "in_lab",
	stepIndex: 2,
	stepNumber: 2,
	nameRu: "2. В лаборатории",
	shortTitleRu: "В лаборатории",
	departmentRu: "Зуботехническая лаборатория",
	descriptionRu: "Изготовление ортопедической конструкции в лаборатории.",
	icon: "settings",
	colorToken: "var(--teal, #0d9488)",
};

const READY_CLINIC: LabTechnologicalStageDefinition = {
	id: "ready_in_clinic",
	stepIndex: 3,
	stepNumber: 3,
	nameRu: "3. Готово в клинике",
	shortTitleRu: "Готово в клинике",
	departmentRu: "Регистратура / Склад клиники",
	descriptionRu: "Работа доставлена в клинику, готова к примерке или фиксации.",
	icon: "truck",
	colorToken: "var(--warn, #f59e0b)",
};

const FITTING: LabTechnologicalStageDefinition = {
	id: "fitting_fixation",
	stepIndex: 4,
	stepNumber: 4,
	nameRu: "4. Примерка / Фиксация",
	shortTitleRu: "Примерка / Фиксация",
	departmentRu: "Клинический кабинет ортопеда",
	descriptionRu: "Клиническая примерка и окончательная фиксация конструкции.",
	icon: "check",
	colorToken: "var(--ok, #10b981)",
};

export const LAB_TECHNOLOGICAL_STAGES: Record<LabTechnologicalStageId, LabTechnologicalStageDefinition> = {
	impression_scan: IMPRESSION,
	in_lab: IN_LAB,
	ready_in_clinic: READY_CLINIC,
	fitting_fixation: FITTING,
	waxup_cad: IN_LAB,
	milling_framework: IN_LAB,
	ceramic_layering: IN_LAB,
	glaze_finish: IN_LAB,
	clinical_fitting: FITTING,
	patient_fixation: FITTING,
};

export const LAB_TECHNOLOGICAL_STAGE_ORDER: readonly LabTechnologicalStageId[] = [
	"impression_scan",
	"in_lab",
	"ready_in_clinic",
	"fitting_fixation",
];

// ─── 4. IMPLANTS & ABUTMENTS ───────────────────────────────────────────────────
export interface LabImplantComponentsManifest {
	hasImplantComponents?: boolean | undefined;
	implantSystemName?: string | undefined;
	transfersCount?: number | undefined;
	transfersType?: "open_tray" | "closed_tray" | "scan_body" | string | undefined;
	analogsCount?: number | undefined;
	healingAbutmentsCount?: number | undefined;
	screwsCount?: number | undefined;
	extraComponentsNotes?: string | undefined;
}

export function formatImplantComponentsSummary(manifest?: LabImplantComponentsManifest): string {
	if (!manifest || (!manifest.hasImplantComponents && !manifest.transfersCount && !manifest.analogsCount && !manifest.healingAbutmentsCount && !manifest.screwsCount)) {
		return "Компоненты имплантационной системы не передавались";
	}
	const parts: string[] = [];
	if (manifest.implantSystemName) parts.push(`Система: ${manifest.implantSystemName}`);
	if (manifest.transfersCount) {
		const typeLabel = manifest.transfersType === "open_tray" ? "открытая ложка" : manifest.transfersType === "closed_tray" ? "закрытая ложка" : manifest.transfersType === "scan_body" ? "скан-боди" : "";
		parts.push(`Трансферы: ${manifest.transfersCount} шт.${typeLabel ? ` (${typeLabel})` : ""}`);
	}
	if (manifest.analogsCount) parts.push(`Аналоги: ${manifest.analogsCount} шт.`);
	if (manifest.healingAbutmentsCount) parts.push(`ФДМ: ${manifest.healingAbutmentsCount} шт.`);
	if (manifest.screwsCount) parts.push(`Винты: ${manifest.screwsCount} шт.`);
	if (manifest.extraComponentsNotes) parts.push(`Доп: ${manifest.extraComponentsNotes}`);
	return parts.join("; ");
}

export type ImplantPlatformType = "conical" | "hex";

export interface ImplantPlatformOption {
	id: ImplantPlatformType;
	nameRu: string;
	descriptionRu: string;
}

export const IMPLANT_PLATFORMS: ImplantPlatformOption[] = [
	{
		id: "conical",
		nameRu: "Conical (Коническое соединение / Morse Taper)",
		descriptionRu: "Конус Морзе с антиротационным элементом (Straumann BLX, Nobel Conical, Astra EV, Osstem TS, Dentium)",
	},
	{
		id: "hex",
		nameRu: "Hex (Шестигранное соединение / Internal/External Hex)",
		descriptionRu: "Внутренний или внешний шестигранник (Zimmer, BioHorizons, MIS, Alpha-Bio)",
	},
];

export type AbutmentCategoryType =
	| "tibase_bonded"
	| "multiunit_straight"
	| "multiunit_17"
	| "multiunit_30"
	| "custom_titanium"
	| "custom_zirconia"
	| "standard_titanium";

export interface AbutmentTypeOption {
	id: AbutmentCategoryType;
	nameRu: string;
	angle: number;
	descriptionRu: string;
	isMultiUnit?: boolean;
	isTiBase?: boolean;
}

export const ABUTMENT_TYPE_OPTIONS: AbutmentTypeOption[] = [
	{
		id: "tibase_bonded",
		nameRu: "Ti-Base вклеиваемое основание",
		angle: 0,
		isTiBase: true,
		descriptionRu: "Титановое основание (Ti-Base) под вклейку циркониевой коронки (3M RelyX Ultimate / Multilink Hybrid Abutment).",
	},
	{
		id: "multiunit_straight",
		nameRu: "Multi-Unit прямой (0°)",
		angle: 0,
		isMultiUnit: true,
		descriptionRu: "Винтовой абатмент Multi-Unit для мостовидных и балочных конструкций при параллельных осях.",
	},
	{
		id: "multiunit_17",
		nameRu: "Multi-Unit угловой 17°",
		angle: 17,
		isMultiUnit: true,
		descriptionRu: "Угловой абатмент Multi-Unit 17° для компенсации наклона имплантатов в протоколах All-on-4 / All-on-6.",
	},
	{
		id: "multiunit_30",
		nameRu: "Multi-Unit угловой 30°",
		angle: 30,
		isMultiUnit: true,
		descriptionRu: "Угловой абатмент Multi-Unit 30° для дистальных наклонных имплантатов в протоколах All-on-4 / All-on-6.",
	},
	{
		id: "custom_titanium",
		nameRu: "Индивидуальный титановый абатмент Grade 5",
		angle: 0,
		descriptionRu: "Фрезерованный индивидуальный абатмент из титана Grade 5 с анатомическим десневым уступом.",
	},
	{
		id: "custom_zirconia",
		nameRu: "Индивидуальный циркониевый абатмент ZrO₂",
		angle: 0,
		descriptionRu: "Безметалловый абатмент из оксида циркония на титановом интерфейсе для фронтальной эстетики.",
	},
	{
		id: "standard_titanium",
		nameRu: "Стандартный прямой титановый абатмент",
		angle: 0,
		descriptionRu: "Фабричный стандартный абатмент для цементной фиксации одиночных коронок.",
	},
];

export type FixationType = "screw_retained" | "cement_retained";

export interface FixationTypeOption {
	id: FixationType;
	nameRu: string;
	descriptionRu: string;
}

export const FIXATION_TYPES: FixationTypeOption[] = [
	{
		id: "screw_retained",
		nameRu: "Винтовая фиксация",
		descriptionRu: "Трансокклюзионная шахта винта, прямое прикручивание к имплантату или Multi-Unit. Безопасность для маргинальной кости.",
	},
	{
		id: "cement_retained",
		nameRu: "Цементная фиксация",
		descriptionRu: "Фиксация коронки на постоянный/временный цемент на индивидуальный абатмент с зазором 30–50 мкм.",
	},
];

// ─── 5. DATE UTILITIES ─────────────────────────────────────────────────────────
export function parseDateToMidnight(input: string | Date): Date {
	const d = typeof input === "string" ? new Date(input) : new Date(input.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function formatDateToIsoDay(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function formatRussianDate(isoString: string): string {
	if (!isoString) return "—";
	const parts = isoString.slice(0, 10).split("-");
	if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
		return `${parts[2]}.${parts[1]}.${parts[0]}`;
	}
	return isoString;
}

export { addWorkingDaysRu };

// ─── 6. FINANCIALS ─────────────────────────────────────────────────────────────
export type WarrantyLiabilityType = "clinic_warranty" | "lab_defect" | "patient_fault";

export interface DentalLabWorkflowFinancials {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks: number;
	readonly costPerUnitKopecks: number;
	readonly patientPriceTotalKopecks: number;
	readonly labCostKopecks: number;
	readonly labCostTotalKopecks: number;
	readonly clinicGrossMarginKopecks: number;
	readonly grossMarginPercent: number;
	readonly doctorPercent: number;
	readonly doctorWageBaseKopecks: number;
	readonly doctorWageKopecks: number;
	readonly clinicNetProfitKopecks: number;
	readonly patientPriceTotalRub: number;
	readonly labCostTotalRub: number;
	readonly clinicGrossMarginRub: number;
	readonly doctorWageRub: number;
	readonly clinicNetProfitRub: number;
	readonly isBalanced: boolean;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
	readonly warrantyLiabilityKopecks?: number | undefined;
	readonly warrantyLiabilityRub?: number | undefined;
	readonly warrantyLiabilityLabelRu?: string | undefined;
}

export interface CalculateLabFinancialsParams {
	readonly unitsCount: number;
	readonly pricePerUnitKopecks?: number | undefined;
	readonly costPerUnitKopecks?: number | undefined;
	readonly pricePerUnitRub?: number | undefined;
	readonly costPerUnitRub?: number | undefined;
	readonly doctorPercent?: number | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
}

export function calculateLabWorkflowFinancials(
	params: CalculateLabFinancialsParams,
): DentalLabWorkflowFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const pricePerUnit = Math.max(
		0,
		Math.round(params.pricePerUnitKopecks ?? (params.pricePerUnitRub ? params.pricePerUnitRub * 100 : 0)),
	);
	const costPerUnit = Math.max(
		0,
		Math.round(params.costPerUnitKopecks ?? (params.costPerUnitRub ? params.costPerUnitRub * 100 : 0)),
	);
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	if (params.isWarrantyRework) {
		const liabilityType: WarrantyLiabilityType = params.warrantyLiabilityType || "clinic_warranty";
		const isLabDefect = liabilityType === "lab_defect";
		const effectiveLabCostKopecks = isLabDefect ? 0 : costPerUnit * count;
		const labelRu = isLabDefect ? "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)" : "Гарантийные обязательства клиники";

		return {
			unitsCount: count, pricePerUnitKopecks: 0, costPerUnitKopecks: costPerUnit, patientPriceTotalKopecks: 0,
			labCostKopecks: effectiveLabCostKopecks, labCostTotalKopecks: effectiveLabCostKopecks,
			clinicGrossMarginKopecks: 0, grossMarginPercent: 0, doctorPercent: doctorPct,
			doctorWageBaseKopecks: 0, doctorWageKopecks: 0,
			clinicNetProfitKopecks: effectiveLabCostKopecks === 0 ? 0 : -effectiveLabCostKopecks,
			patientPriceTotalRub: 0, labCostTotalRub: effectiveLabCostKopecks / 100,
			clinicGrossMarginRub: 0, doctorWageRub: 0,
			clinicNetProfitRub: effectiveLabCostKopecks === 0 ? 0 : -effectiveLabCostKopecks / 100,
			isBalanced: true, isWarrantyRework: true, warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks: effectiveLabCostKopecks, warrantyLiabilityRub: effectiveLabCostKopecks / 100,
			warrantyLiabilityLabelRu: labelRu,
		};
	}

	const patientPriceTotalKopecks = pricePerUnit * count;
	const labCostKopecks = costPerUnit * count;
	const clinicGrossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostKopecks);
	const grossMarginPercent = patientPriceTotalKopecks > 0
		? Number(((clinicGrossMarginKopecks / patientPriceTotalKopecks) * 100).toFixed(1))
		: 0;

	const doctorWageBaseKopecks = clinicGrossMarginKopecks;
	const doctorWageKopecks = Math.round((doctorWageBaseKopecks * doctorPct) / 100);
	const clinicNetProfitKopecks = doctorWageBaseKopecks - doctorWageKopecks;

	return {
		unitsCount: count, pricePerUnitKopecks: pricePerUnit, costPerUnitKopecks: costPerUnit,
		patientPriceTotalKopecks, labCostKopecks, labCostTotalKopecks: labCostKopecks,
		clinicGrossMarginKopecks, grossMarginPercent, doctorPercent: doctorPct,
		doctorWageBaseKopecks, doctorWageKopecks, clinicNetProfitKopecks,
		patientPriceTotalRub: patientPriceTotalKopecks / 100, labCostTotalRub: labCostKopecks / 100,
		clinicGrossMarginRub: clinicGrossMarginKopecks / 100, doctorWageRub: doctorWageKopecks / 100,
		clinicNetProfitRub: clinicNetProfitKopecks / 100,
		isBalanced: doctorWageKopecks + clinicNetProfitKopecks === doctorWageBaseKopecks,
		isWarrantyRework: false,
	};
}

// ─── 7. DEADLINE ALERTS ────────────────────────────────────────────────────────
export type LabDeadlineStatus =
	| "ON_TRACK"
	| "APPROACHING"
	| "URGENT_TODAY"
	| "OVERDUE"
	| "VISIT_CONFLICT";

export interface LabDelayAlert {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly lab_delay_alert: boolean;
	readonly status: LabDeadlineStatus;
	readonly severity: "CRITICAL" | "WARNING" | "INFO" | "OK";
	readonly daysDifference: number;
	readonly expectedLabDateIso: string;
	readonly scheduledVisitDateIso?: string | undefined;
	readonly fittingDateIso?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly alertMessageRu: string;
	readonly detailedReasonRu: string;
	readonly recommendedActionRu: string;
}

export interface CheckLabDeadlineParams {
	readonly expectedLabDate: string | Date;
	readonly scheduledVisitDate?: string | Date | null | undefined;
	readonly fittingDate?: string | Date | null | undefined;
	readonly appointmentId?: string | null | undefined;
	readonly currentDate?: string | Date | undefined;
	readonly isInstalledOrCompleted?: boolean | undefined;
	readonly orderNumber?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly labName?: string | undefined;
}

export function checkLabDeadlineAndAlert(params: CheckLabDeadlineParams): LabDelayAlert {
	const expectedDate = parseDateToMidnight(params.expectedLabDate);
	const expectedIso = formatDateToIsoDay(expectedDate);
	const expectedRu = formatRussianDate(expectedIso);
	const today = params.currentDate ? parseDateToMidnight(params.currentDate) : parseDateToMidnight(new Date());

	const visitDateRaw = params.fittingDate || params.scheduledVisitDate;
	const visitDate = visitDateRaw ? parseDateToMidnight(visitDateRaw) : null;
	const visitIso = visitDate ? formatDateToIsoDay(visitDate) : undefined;
	const visitRu = visitIso ? formatRussianDate(visitIso) : "не назначен";
	const fittingIso = params.fittingDate ? formatDateToIsoDay(parseDateToMidnight(params.fittingDate)) : visitIso;
	const appointmentId = params.appointmentId || undefined;

	if (params.isInstalledOrCompleted) {
		return {
			hasAlert: false, isDelayedAlert: false, lab_delay_alert: false, status: "ON_TRACK", severity: "OK",
			daysDifference: 0, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: "Работа успешно зафиксирована в полости рта.", detailedReasonRu: "Заказ завершен.",
			recommendedActionRu: "Действий не требуется.",
		};
	}

	const daysToLab = Math.round((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (visitDate && expectedDate.getTime() > visitDate.getTime()) {
		const conflictDays = Math.round((expectedDate.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
		return {
			hasAlert: true, isDelayedAlert: true, lab_delay_alert: true, status: "VISIT_CONFLICT", severity: "CRITICAL",
			daysDifference: daysToLab, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: `КРИТИЧЕСКИЙ КОНФЛИКТ: Готовность ЗТЛ (${expectedRu}) позже приема пациента (${visitRu}) на ${conflictDays} дн.!`,
			detailedReasonRu: `Пациент записан на прием ${visitRu}, а готовность только ${expectedRu}.`,
			recommendedActionRu: `Срочно свяжитесь с администратором для переноса визита на дату не ранее ${expectedRu}.`,
		};
	}

	if (daysToLab < 0) {
		const overdueDays = Math.abs(daysToLab);
		return {
			hasAlert: true, isDelayedAlert: true, lab_delay_alert: true, status: "OVERDUE", severity: "CRITICAL",
			daysDifference: daysToLab, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: `ПРОСРОЧЕНО ЗТЛ: Заказ задерживается на ${overdueDays} дн. (план был: ${expectedRu})!`,
			detailedReasonRu: `Лаборатория не доставила конструкцию к нормативному сроку ${expectedRu}.`,
			recommendedActionRu: "Свяжитесь с курьерской службой или лабораторией для выяснения времени доставки.",
		};
	}

	if (daysToLab === 0) {
		return {
			hasAlert: true, isDelayedAlert: false, lab_delay_alert: false, status: "URGENT_TODAY", severity: "WARNING",
			daysDifference: 0, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: `Сдача работы из ЗТЛ сегодня (${expectedRu})! Ожидается доставка курьером.`,
			detailedReasonRu: "Заказ должен поступить в клинику сегодня. Проверьте приемку.",
			recommendedActionRu: "Проконтролируйте приемку коробки с нарядом у администратора.",
		};
	}

	const isApproaching = daysToLab <= 2;
	return {
		hasAlert: false, isDelayedAlert: false, lab_delay_alert: false,
		status: isApproaching ? "APPROACHING" : "ON_TRACK", severity: isApproaching ? "INFO" : "OK",
		daysDifference: daysToLab, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
		appointmentId, alertMessageRu: isApproaching ? `Срок сдачи ЗТЛ через ${daysToLab} дн. (${expectedRu}).` : `В графике. Срок готовности через ${daysToLab} дн. (${expectedRu}).`,
		detailedReasonRu: "Производственный цикл ЗТЛ протекает штатно.", recommendedActionRu: "Действий не требуется.",
	};
}

// ─── 8. RE-EXPORTS FROM MODEL & EXPORT ─────────────────────────────────────────
export * from "./dentalLabWorkflowModel";
export * from "./dentalLabWorkflowExport";
