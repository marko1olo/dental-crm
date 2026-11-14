/**
 * Dental Laboratory Work Orders & Prosthodontic Job Tracking Engine.
 * Shared domain models, typed Zod schemas, VITA & Natural Die shade catalogs,
 * turnaround SLA calculations, and integer-kopeck financial clearing.
 */

import { z } from "zod";
import { generateSecureAlphanumericId } from "../utils/idGenerators.js";

// ─── WORK TYPES & PROSTHETIC CONSTRUCTIONS ────────────────────────────────────

export const labWorkTypeSchema = z.enum([
	"crown",
	"bridge",
	"denture",
	"implant",
	"veneer",
	"orthodontic",
	"inlay_onlay",
	"splint_nightguard",
	"repair",
	"other",
]);
export type LabWorkType = z.infer<typeof labWorkTypeSchema>;

export const prostheticConstructionTypeSchema = z.enum([
	"single_crown",
	"bridge",
	"veneer",
	"inlay_onlay",
	"all_on_4_6",
	"all_on_arch",
	"implant_abutment",
	"clasp_denture",
	"aligner_nightguard",
	"aligners_nightguard",
	"endocrown",
	"custom",
]);
export type ProstheticConstructionType = z.infer<typeof prostheticConstructionTypeSchema>;

export const prostheticMaterialSchema = z.enum([
	"zirconia_multilayer",
	"emax_lithium_disilicate",
	"pfm_cocr",
	"pmma_temporary",
	"titanium_custom_abutment",
	"peek_biohpp",
	"biocompatible_3d_resin",
	"other",
]);
export type ProstheticMaterial = z.infer<typeof prostheticMaterialSchema>;

// ─── ORDER STATUSES & 7-STAGE PIPELINE ────────────────────────────────────────

export const labOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"in_progress",
	"shipped",
	"received",
	"ready",
	"ready_in_clinic",
	"refitting",
	"fitted",
	"completed",
	"cancelled",
	"rejected_remake",
]);
export type LabOrderStatus = z.infer<typeof labOrderStatusSchema>;

export const labWorkflowStageSchema = z.enum([
	"impression_sent",
	"sent_to_lab",
	"cad_design",
	"model_cad_design",
	"milling_wax_up",
	"framework_wax_milling",
	"sintering_ceramic_layering",
	"try_in_fitting",
	"fitting_in_mouth",
	"glaze_finish",
	"final_glaze",
	"delivered_to_clinic",
	"installed_in_mouth",
]);
export type LabWorkflowStage = z.infer<typeof labWorkflowStageSchema>;

export const impressionTypeSchema = z.enum([
	"a_silicone",
	"c_silicone",
	"polyether",
	"hydrocolloid",
	"alginate",
	"digital_scan",
	"digital_scan_stl_ply",
	"pvs_silicone",
	"other",
]);
export type ImpressionType = z.infer<typeof impressionTypeSchema>;

export const IMPRESSION_MATERIALS_RU: Record<ImpressionType, { nameRu: string; category: string; descriptionRu: string }> = {
	a_silicone: {
		nameRu: "А-силикон (Винилполисилоксан / VPS)",
		category: "Эластомерные оттиски",
		descriptionRu: "Высокоточный А-силикон (база + корригирующий слой) с минимальной усадкой (<0.1%) и гидрофильностью.",
	},
	c_silicone: {
		nameRu: "С-силикон (Конденсационный силикон)",
		category: "Эластомерные оттиски",
		descriptionRu: "Стандартный поликонденсационный силикон для базовых двухэтапных и одноэтапных оттисков.",
	},
	polyether: {
		nameRu: "Полиэфир (Impregum / Permadyne)",
		category: "Полиэфирные оттиски",
		descriptionRu: "Истинная гидрофильность во влажной среде зубодесневой борозды, идеален для протезирования на имплантатах.",
	},
	hydrocolloid: {
		nameRu: "Обратимый гидроколлоид (Агар-агар)",
		category: "Гидроколлоидные массы",
		descriptionRu: "Сверхточная передача поддесневых уступов и микрорельефа витальных культей.",
	},
	alginate: {
		nameRu: "Альгинатная масса (Необратимый гидроколлоид)",
		category: "Диагностические оттиски",
		descriptionRu: "Альгинат высокой стабильности для диагностических моделей, антагонистов и капп.",
	},
	digital_scan: {
		nameRu: "Интраоральный цифровой 3D-скан (STL / PLY / OBJ)",
		category: "Цифровой протокол CAD/CAM",
		descriptionRu: "Прямой оптический скан челюстей сканером (Medit / 3Shape TRIOS / Shining3D / PrimeScan).",
	},
	digital_scan_stl_ply: {
		nameRu: "Интраоральный цифровой 3D-скан (STL / PLY)",
		category: "Цифровой протокол CAD/CAM",
		descriptionRu: "Файлы оптического сканирования челюстей с текстурой в цвете (PLY) и полигональной сеткой (STL).",
	},
	pvs_silicone: {
		nameRu: "PVS-силикон (Поливинилсилоксан)",
		category: "Эластомерные оттиски",
		descriptionRu: "Эластомерный слепочный материал длительной размерной стабильности.",
	},
	other: {
		nameRu: "Прочий слепочный материал",
		category: "Индивидуальный",
		descriptionRu: "Комбинированная или индивидуальная методика снятия оттиска.",
	},
};

// ─── VITA SHADES & NATURAL DIE STUMP SCALES ───────────────────────────────────

export const vitaClassicalShadeSchema = z.enum([
	"A1",
	"A2",
	"A3",
	"A3.5",
	"A4",
	"B1",
	"B2",
	"B3",
	"B4",
	"C1",
	"C2",
	"C3",
	"C4",
	"D2",
	"D3",
	"D4",
	"OM1",
	"OM2",
	"OM3",
	"BL1",
	"BL2",
	"BL3",
	"BL4",
]);
export type VitaClassicalShade = z.infer<typeof vitaClassicalShadeSchema>;

export const vitaBleachShadeSchema = z.enum([
	"BL1",
	"BL2",
	"BL3",
	"BL4",
	"0M1",
	"0M2",
	"0M3",
]);
export type VitaBleachShade = z.infer<typeof vitaBleachShadeSchema>;

export const vita3dMasterShadeSchema = z.enum([
	"1M1", "1M2",
	"2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5",
	"3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5",
	"4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5",
	"5M1", "5M2", "5M3",
]);
export type Vita3dMasterShade = z.infer<typeof vita3dMasterShadeSchema>;

export const stumpNaturalDieShadeSchema = z.enum([
	"ND1",
	"ND2",
	"ND3",
	"ND4",
	"ND5",
	"ND6",
	"ND7",
	"ND8",
	"ND9",
]);
export type StumpNaturalDieShade = z.infer<typeof stumpNaturalDieShadeSchema>;

export const anyVitaShadeSchema = z.union([
	vitaClassicalShadeSchema,
	vitaBleachShadeSchema,
	vita3dMasterShadeSchema,
	z.string(),
]);
export type AnyVitaShade = z.infer<typeof anyVitaShadeSchema>;

// ─── MAIN LAB ORDER SCHEMA ───────────────────────────────────────────────────

export const labOrderSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional().nullable(),
	labContactId: z.string().uuid(),
	orderNumber: z.string().min(1).max(50),
	workType: labWorkTypeSchema,
	toothReference: z.string().max(50).optional().nullable(),
	impressionType: impressionTypeSchema.optional().nullable(),
	antagonistInfo: z.string().max(500).optional().nullable(),
	shade: anyVitaShadeSchema.optional().nullable(),
	status: labOrderStatusSchema.default("sent"),
	sentDate: z.string(), // YYYY-MM-DD
	expectedDate: z.string().optional().nullable(), // YYYY-MM-DD
	receivedDate: z.string().optional().nullable(), // YYYY-MM-DD
	fittedDate: z.string().optional().nullable(), // YYYY-MM-DD
	costKopecks: z.number().int().nonnegative().default(0),
	notes: z.string().max(2000).optional().nullable(),
	isRemake: z.boolean().default(false),
	remakeReason: z.string().max(500).optional().nullable(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});
export type LabOrder = z.infer<typeof labOrderSchema>;

// ─── TURNAROUND SLA CALCULATIONS ─────────────────────────────────────────────

/**
 * Standard turnaround SLA days for common lab work types.
 */
export const DEFAULT_LAB_TURNAROUND_DAYS: Record<LabWorkType, number> = {
	crown: 7,
	bridge: 10,
	denture: 14,
	implant: 10,
	veneer: 7,
	orthodontic: 10,
	inlay_onlay: 5,
	splint_nightguard: 5,
	repair: 2,
	other: 7,
};

/**
 * Adds business working days to a start date, skipping weekends (Saturday & Sunday).
 */
export function addBusinessDays(startDate: Date | string, daysToAdd: number): Date {
	const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
	const safeDays = Math.max(0, Math.round(daysToAdd));
	const result = new Date(start.getTime());
	let added = 0;
	while (added < safeDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		// Skip weekends (0 = Sunday, 6 = Saturday)
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

/**
 * Calculates default expected delivery date based on work type and business days.
 */
export function calculateExpectedDeliveryDate(
	sentDate: Date | string,
	workType: LabWorkType,
	customTurnaroundDays?: number,
): Date {
	const daysToAdd = customTurnaroundDays ?? DEFAULT_LAB_TURNAROUND_DAYS[workType] ?? 7;
	return addBusinessDays(sentDate, daysToAdd);
}

/**
 * Evaluates whether a lab order is delayed based on current date.
 */
export function isLabOrderDelayed(order: LabOrder, now: Date = new Date()): boolean {
	if (
		order.status === "received" ||
		order.status === "ready" ||
		order.status === "ready_in_clinic" ||
		order.status === "fitted" ||
		order.status === "completed" ||
		order.status === "cancelled"
	) {
		return false;
	}
	if (!order.expectedDate) return false;
	const expected = new Date(order.expectedDate);
	return now.getTime() > expected.getTime();
}

/**
 * Validates allowed state transitions for lab orders.
 */
export function canTransitionLabOrderStatus(
	current: LabOrderStatus,
	target: LabOrderStatus,
): boolean {
	if (current === target) return true;

	const transitions: Record<LabOrderStatus, LabOrderStatus[]> = {
		draft: ["sent", "cancelled"],
		sent: ["in_progress", "ready", "ready_in_clinic", "shipped", "received", "cancelled"],
		in_progress: ["ready", "ready_in_clinic", "shipped", "received", "cancelled", "rejected_remake", "refitting"],
		shipped: ["received", "ready", "ready_in_clinic", "cancelled", "rejected_remake", "refitting"],
		ready: ["received", "ready_in_clinic", "fitted", "completed", "cancelled", "rejected_remake"],
		ready_in_clinic: ["received", "ready", "fitted", "completed", "cancelled", "rejected_remake", "refitting"],
		received: ["fitted", "in_progress", "ready", "ready_in_clinic", "completed", "rejected_remake", "refitting", "cancelled"],
		refitting: ["in_progress", "shipped", "received", "ready", "ready_in_clinic", "completed", "cancelled"],
		fitted: ["completed", "in_progress", "received", "rejected_remake", "refitting", "cancelled"],
		completed: ["rejected_remake", "refitting"],
		cancelled: ["draft", "sent"],
		rejected_remake: ["draft", "sent", "cancelled"],
	};

	return transitions[current]?.includes(target) ?? false;
}

// ─── KOPECK-EXACT FINANCIAL CLEARING (NO FLOATS) ─────────────────────────────

export interface LabFinancialSplitKopecksResult {
	clinicKopecks: number;
	doctorKopecks: number;
	totalKopecks: number;
	clinicAmountRub: number;
	doctorAmountRub: number;
	isBalanced: boolean;
}

/**
 * Strict kopeck-exact calculation of clinic vs doctor split.
 * Invariant: clinicKopecks + doctorKopecks === totalKopecks (Zero penny-drift).
 */
export function calculateLabFinancialSplitKopecks(
	totalKopecks: number,
	doctorSharePct: number,
): LabFinancialSplitKopecksResult {
	const safeTotalKopecks = Math.max(0, Math.round(Number.isFinite(totalKopecks) ? totalKopecks : 0));
	const safeDoctorPct = Math.min(100, Math.max(0, Number.isFinite(doctorSharePct) ? doctorSharePct : 50));

	const doctorKopecks = Math.round((safeTotalKopecks * safeDoctorPct) / 100);
	const clinicKopecks = safeTotalKopecks - doctorKopecks;

	return {
		clinicKopecks,
		doctorKopecks,
		totalKopecks: safeTotalKopecks,
		clinicAmountRub: Number((clinicKopecks / 100).toFixed(2)),
		doctorAmountRub: Number((doctorKopecks / 100).toFixed(2)),
		isBalanced: clinicKopecks + doctorKopecks === safeTotalKopecks,
	};
}

export interface LabOrderFinancialClearingResult {
	patientPriceTotalKopecks: number;
	labCostTotalKopecks: number;
	grossMarginKopecks: number;
	grossMarginPercent: number;
	doctorCommissionKopecks: number;
	doctorPercent: number;
	clinicNetProfitKopecks: number;
	unitsCount: number;
	pricePerUnitKopecks: number;
	costPerUnitKopecks: number;
	isBalanced: boolean;
	isWarrantyRework?: boolean;
	warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault";
	warrantyLiabilityKopecks?: number;
	warrantyLiabilityLabelRu?: string;
}

/**
 * Calculates complete order financial clearing in integer kopecks.
 * Includes warranty rework protocol: patient strictly 0 ₽, costs tracked as clinic liability or lab defect.
 */
export function calculateLabOrderFinancialsKopecks(params: {
	unitsCount: number;
	pricePerUnitKopecks: number;
	costPerUnitKopecks: number;
	doctorPercent?: number;
	isWarrantyRework?: boolean;
	warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault";
}): LabOrderFinancialClearingResult {
	const count = Math.max(1, Math.round(params.unitsCount || 1));
	const pricePerUnit = Math.max(0, Math.round(params.pricePerUnitKopecks || 0));
	const costPerUnit = Math.max(0, Math.round(params.costPerUnitKopecks || 0));
	const doctorPct = Math.max(0, Math.min(100, params.doctorPercent ?? 20));

	const isWarranty = Boolean(params.isWarrantyRework);
	const liabilityType = params.warrantyLiabilityType || "clinic_warranty";

	if (isWarranty) {
		let effectiveLabCostKop = costPerUnit * count;
		let warrantyLiabilityKopecks = effectiveLabCostKop;
		let liabilityLabelRu = "Гарантийные обязательства клиники";

		if (liabilityType === "lab_defect") {
			effectiveLabCostKop = 0;
			warrantyLiabilityKopecks = 0;
			liabilityLabelRu = "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)";
		}

		return {
			patientPriceTotalKopecks: 0,
			labCostTotalKopecks: effectiveLabCostKop,
			grossMarginKopecks: 0,
			grossMarginPercent: 0,
			doctorCommissionKopecks: 0,
			doctorPercent: doctorPct,
			clinicNetProfitKopecks: -effectiveLabCostKop,
			unitsCount: count,
			pricePerUnitKopecks: 0,
			costPerUnitKopecks: costPerUnit,
			isBalanced: true,
			isWarrantyRework: true,
			warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks,
			warrantyLiabilityLabelRu: liabilityLabelRu,
		};
	}

	const patientPriceTotalKopecks = pricePerUnit * count;
	const labCostTotalKopecks = costPerUnit * count;
	const grossMarginKopecks = Math.max(0, patientPriceTotalKopecks - labCostTotalKopecks);

	const grossMarginPercent = patientPriceTotalKopecks > 0
		? Number(((grossMarginKopecks / patientPriceTotalKopecks) * 100).toFixed(1))
		: 0;

	const doctorCommissionKopecks = grossMarginKopecks > 0
		? Math.round((grossMarginKopecks * doctorPct) / 100)
		: 0;

	const clinicNetProfitKopecks = grossMarginKopecks - doctorCommissionKopecks;

	return {
		patientPriceTotalKopecks,
		labCostTotalKopecks,
		grossMarginKopecks,
		grossMarginPercent,
		doctorCommissionKopecks,
		doctorPercent: doctorPct,
		clinicNetProfitKopecks,
		unitsCount: count,
		pricePerUnitKopecks: pricePerUnit,
		costPerUnitKopecks: costPerUnit,
		isBalanced: (doctorCommissionKopecks + clinicNetProfitKopecks) === grossMarginKopecks,
		isWarrantyRework: false,
	};
}

// ─── CANONICAL 5-STAGE DENTAL LAB PIPELINE ───────────────────────────────────

export const labPipeline5StageKeySchema = z.enum([
	"impression_scan",      // 1. Слепок / Интраоральный скан (отправка STL/PLY скана или слепка с указанием массы)
	"cad_modeling",        // 2. 3D-моделирование / CAD (согласование виртуального wax-up)
	"framework_fitting",   // 3. Примерка каркаса (диоксид циркония, титан, КХС, примерка во рту)
	"ceramic_layering",    // 4. Нанесение керамики (глазурь, индивидуализация, расцветка Vita Classical / 3D-Master / Bleach)
	"ready_fixation",      // 5. Готово к фиксации (прибыло в клинику, дата и время сдачи, гарантийный паспорт)
]);
export type LabPipeline5StageKey = z.infer<typeof labPipeline5StageKeySchema>;

export interface LabPipeline5StageDefinition {
	id: LabPipeline5StageKey;
	step: number;
	titleRu: string;
	shortTitleRu: string;
	descriptionRu: string;
	badgeClass: string;
	iconName: string;
}

export const CANONICAL_5STAGE_LAB_PIPELINE: Record<LabPipeline5StageKey, LabPipeline5StageDefinition> = {
	impression_scan: {
		id: "impression_scan",
		step: 1,
		titleRu: "1. Слепок / Интраоральный скан",
		shortTitleRu: "Слепок/Скан",
		descriptionRu: "Отправка STL/PLY цифрового скана или физического слепка с указанием оттискной массы (А-силикон, С-силикон, полиэфир, гидроколлоид, альгинат).",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
		iconName: "scan",
	},
	cad_modeling: {
		id: "cad_modeling",
		step: 2,
		titleRu: "2. 3D-моделирование / CAD",
		shortTitleRu: "CAD-моделирование",
		descriptionRu: "Цифровое моделирование анатомической формы, согласование виртуального wax-up, проверка окклюзионных контактов.",
		badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
		iconName: "layers",
	},
	framework_fitting: {
		id: "framework_fitting",
		step: 3,
		titleRu: "3. Примерка каркаса",
		shortTitleRu: "Примерка каркаса",
		descriptionRu: "Фрезерование или литье каркаса (диоксид циркония ZrO₂, фрезерованный титан, КХС / CoCr), клиническая примерка в полости рта.",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
		iconName: "tool",
	},
	ceramic_layering: {
		id: "ceramic_layering",
		step: 4,
		titleRu: "4. Нанесение керамики",
		shortTitleRu: "Облицовка & Глазурь",
		descriptionRu: "Послойное нанесение керамических масс, индивидуализация (мамелоны, кальцификаты), расцветка VITA Classical / 3D-Master / Bleach, глазурование.",
		badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
		iconName: "palette",
	},
	ready_fixation: {
		id: "ready_fixation",
		step: 5,
		titleRu: "5. Готово к фиксации",
		shortTitleRu: "Готово / Фиксация",
		descriptionRu: "Работа прибыла в клинику, назначена дата и время сдачи, оформлен гарантийный паспорт ортопедической конструкции.",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
		iconName: "check-circle",
	},
};

// ─── CANONICAL 5-STAGE CLINICAL LAB STATUSES (USER MANDATE 8S, 8E) ────────────

export const canonical5LabStatusSchema = z.enum([
	"sent",        // 1. Отправлен в ЗТЛ
	"in_progress", // 2. В работе у техника
	"fitting",     // 3. Примерка
	"ready",       // 4. Готов в клинике
	"completed",   // 5. Сдан / Зафиксирован
]);
export type Canonical5LabStatus = z.infer<typeof canonical5LabStatusSchema>;

export interface Canonical5LabStatusItem {
	readonly id: Canonical5LabStatus;
	readonly step: number;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descRu: string;
	readonly badgeClass: string;
}

export const CANONICAL_5_CLINICAL_LAB_STATUSES: readonly Canonical5LabStatusItem[] = [
	{
		id: "sent",
		step: 1,
		labelRu: "1. Отправлен в ЗТЛ",
		shortLabelRu: "Отправлен",
		descRu: "Оттиски (силикон/скан) и клиническое задание переданы в лабораторию",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "in_progress",
		step: 2,
		labelRu: "2. В работе у техника",
		shortLabelRu: "В работе",
		descRu: "3D-моделирование CAD/CAM, фрезеровка каркаса или нанесение керамики",
		badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
	},
	{
		id: "fitting",
		step: 3,
		labelRu: "3. Примерка у пациента",
		shortLabelRu: "Примерка",
		descRu: "Клиническая примерка каркаса, восковой моделировки или бисквита",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
	},
	{
		id: "ready",
		step: 4,
		labelRu: "4. Готов в клинике",
		shortLabelRu: "Готов",
		descRu: "Работа завершена лабораторией, проверена и ожидает визита пациента на сдачу",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
	},
	{
		id: "completed",
		step: 5,
		labelRu: "5. Сдан / Зафиксирован",
		shortLabelRu: "Сдан",
		descRu: "Конструкция окончательно зафиксирована в полости рта, выдан паспорт изделия",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
] as const;

/**
 * Maps any granular raw status / stage key into the canonical 5-step clinical progression.
 * Progression: Отправлен -> В работе -> Примерка -> Готов -> Сдан
 */
export function mapTo5StageLabStatus(rawStatus?: string | null): Canonical5LabStatus {
	if (!rawStatus) return "sent";
	const s = rawStatus.toLowerCase().trim();
	if (s === "draft" || s === "sent" || s === "sent_to_lab" || s === "impression_sent" || s === "impression_scan") {
		return "sent";
	}
	if (
		s === "in_progress" ||
		s === "cad_design" ||
		s === "model_cad_design" ||
		s === "cad_modeling" ||
		s === "milling_wax_up" ||
		s === "framework_wax_milling" ||
		s === "sintering_ceramic_layering" ||
		s === "ceramic_layering"
	) {
		return "in_progress";
	}
	if (
		s === "fitting" ||
		s === "refitting" ||
		s === "try_in_fitting" ||
		s === "fitting_in_mouth" ||
		s === "fitting_scheduled" ||
		s === "framework_fitting"
	) {
		return "fitting";
	}
	if (
		s === "ready" ||
		s === "shipped" ||
		s === "received" ||
		s === "delivered" ||
		s === "final_glaze" ||
		s === "glaze_finish" ||
		s === "delivered_to_clinic" ||
		s === "ready_fixation"
	) {
		return "ready";
	}
	if (s === "completed" || s === "fitted" || s === "installed_in_mouth" || s === "delivered_completed") {
		return "completed";
	}
	return "sent";
}

// ─── STATUTORY FORM ZTL-1 METADATA (STaR / GOST R 51087-97) ─────────────────

export const FORM_ZTL_1_METADATA = {
	code: "Форма № ЗТЛ-1",
	titleRu: "Форма № ЗТЛ-1: Наряд-заказ в зуботехническую лабораторию (СтАР / ГОСТ)",
	blankHeaderRu: "Наряд-заказ в зуботехническую лабораторию (Форма № ЗТЛ-1)",
	subtitleRu: "Официальное клиническое задание на изготовление зубных протезов (ГОСТ Р 51087-97 / Стандарты СтАР)",
	clinicalDecisionRu: "Клинический регламент: Срок плана лечения актуален и подтвержден лечащим врачом.",
	treatmentPlanTermsNoticeRu: "Клинический регламент: Срок плана лечения актуален и подтвержден лечащим врачом.",
	sanpinClauseRu: "СанПиН 3.3686-21: Дезинфекция оттисков, прикусных валиков и протезов проведена перед отправкой.",
	warrantyGostRu: "2 года гарантии (ГОСТ Р 51087-97 / ГОСТ 31576-2012 / Рекомендации СтАР)",
} as const;

// ─── PROSTHETIC WARRANTY PASSPORT & STAR PRINT BLANK ─────────────────────────

export const prostheticWarrantyPassportSchema = z.object({
	orderNumber: z.string().min(1),
	batchCode: z.string().min(1),
	patientFullName: z.string().min(1),
	clinicName: z.string().min(1),
	doctorFullName: z.string().min(1),
	technicianLabName: z.string().min(1),
	toothFdi: z.string().min(1),
	restorationType: z.string().min(1),
	frameworkMaterial: z.string().min(1),
	shade: z.string().min(1),
	shadeStump: z.string().optional().nullable(),
	cementationProtocol: z.string().min(1),
	warrantyYears: z.number().int().min(1).max(10).default(2),
	fixationDate: z.string(), // YYYY-MM-DD
	expirationDate: z.string(), // YYYY-MM-DD
	gostStandard: z.string().default("ГОСТ Р 51087-97 / Стандарты СтАР"),
	sanpinDisinfectionMark: z.string().default("СанПиН 3.3686-21: Дезинфекция оттисков и протезов выполнена"),
});
export type ProstheticWarrantyPassport = z.infer<typeof prostheticWarrantyPassportSchema>;

export function generateProstheticWarrantyPassport(params: {
	orderNumber: string;
	batchCode?: string;
	patientFullName: string;
	clinicName?: string;
	doctorFullName: string;
	technicianLabName?: string;
	toothFdi: string;
	restorationType: string;
	frameworkMaterial: string;
	shade: string;
	shadeStump?: string | null;
	cementationProtocol?: string;
	warrantyYears?: number;
	fixationDate?: string;
}): ProstheticWarrantyPassport {
	const fixation = params.fixationDate ? new Date(params.fixationDate) : new Date();
	const years = params.warrantyYears ?? 2;
	const expiration = new Date(fixation.getTime());
	expiration.setFullYear(expiration.getFullYear() + years);

	const batchCode =
		params.batchCode ||
		`LOT-${fixation.getFullYear()}-${generateSecureAlphanumericId(6, false).toUpperCase()}`;

	return {
		orderNumber: params.orderNumber,
		batchCode,
		patientFullName: params.patientFullName,
		clinicName: params.clinicName || "Стоматологическая клиника",
		doctorFullName: params.doctorFullName,
		technicianLabName: params.technicianLabName || "Цифровая зуботехническая лаборатория CAD/CAM",
		toothFdi: params.toothFdi,
		restorationType: params.restorationType,
		frameworkMaterial: params.frameworkMaterial,
		shade: params.shade,
		shadeStump: params.shadeStump ?? null,
		cementationProtocol: params.cementationProtocol || "Адгезивный протокол двойного отверждения (композитный цемент)",
		warrantyYears: years,
		fixationDate: fixation.toISOString().slice(0, 10),
		expirationDate: expiration.toISOString().slice(0, 10),
		gostStandard: "ГОСТ Р 51087-97 / ГОСТ 31576-2012 / Клинические рекомендации СтАР",
		sanpinDisinfectionMark: "СанПиН 3.3686-21: Оттиски, прикусные блоки и конструкции дезинфицированы",
	};
}

// ─── CANONICAL RUSSIAN LABELS & STATUTORY A4 PRESCRIPTION ENGINE ────────────

export const LAB_WORK_TYPE_LABELS_RU: Record<LabWorkType, string> = {
	crown: "Коронка",
	bridge: "Мостовидный протез",
	denture: "Съемный протез",
	implant: "Протезирование на имплантате",
	veneer: "Винир",
	orthodontic: "Ортодонтический аппарат",
	inlay_onlay: "Вкладка / Накладка",
	splint_nightguard: "Каппа / Сплинт",
	repair: "Ремонт протеза",
	other: "Прочее",
};

export const LAB_ORDER_STATUS_LABELS_RU: Record<LabOrderStatus, string> = {
	draft: "Черновик",
	sent: "Отправлен в ЗТЛ",
	in_progress: "В работе у техника",
	shipped: "Отправлен лабораторией",
	received: "Доставлен в клинику",
	ready: "Готов в ЗТЛ",
	ready_in_clinic: "Готов в клинике",
	refitting: "На переделке / коррекции",
	fitted: "Припасован / Сдан пациенту",
	completed: "Завершен / Установлен",
	cancelled: "Отменен",
	rejected_remake: "Брак / На переделку",
};

export const labImpressionTypeSchema = impressionTypeSchema;
export type LabImpressionType = ImpressionType;

export const LAB_IMPRESSION_LABELS_RU: Record<ImpressionType, string> = {
	digital_scan: "Цифровой скан IOS",
	digital_scan_stl_ply: "Цифровой 3D-скан (STL/PLY)",
	alginate: "Альгинатный слепок",
	pvs_silicone: "А-Силикон / C-Силикон",
	a_silicone: "А-силикон (VPS)",
	c_silicone: "С-силикон",
	polyether: "Полиэфирный оттиск",
	hydrocolloid: "Гидроколлоидная масса",
	other: "Прочее",
};

export const vitaShadeSchema = z.enum([
	"A1",
	"A2",
	"A3",
	"A3.5",
	"A4",
	"B1",
	"B2",
	"B3",
	"B4",
	"C1",
	"C2",
	"C3",
	"C4",
	"D2",
	"D3",
	"D4",
	"bleach_1",
	"bleach_2",
	"bleach_3",
	"bleach_4",
	"BL1",
	"BL2",
	"BL3",
	"BL4",
	"0M1",
	"0M2",
	"0M3",
	"OM1",
	"OM2",
	"OM3",
	"1M1",
	"1M2",
	"2L1.5",
	"2L2.5",
	"2M1",
	"2M2",
	"2M3",
	"2R1.5",
	"2R2.5",
	"3L1.5",
	"3L2.5",
	"3M1",
	"3M2",
	"3M3",
	"3R1.5",
	"3R2.5",
	"4L1.5",
	"4L2.5",
	"4M1",
	"4M2",
	"4M3",
	"4R1.5",
	"4R2.5",
	"5M1",
	"5M2",
	"5M3",
]);
export type VitaShade = z.infer<typeof vitaShadeSchema>;

export const labOrderRecordSchema = z.object({
	id: z.string().uuid().optional(),
	patientId: z.string().min(1, "ID пациента обязателен"),
	patientName: z.string().min(1, "ФИО пациента обязательно"),
	labContactId: z.string().min(1, "ID контакта лаборатории обязателен"),
	labName: z.string().min(1, "Наименование лаборатории обязательно"),
	workType: labWorkTypeSchema,
	toothReference: z.string().max(50).nullable().optional(),
	impressionType: impressionTypeSchema.nullable().optional(),
	antagonistInfo: z.string().max(500).nullable().optional(),
	shade: anyVitaShadeSchema.nullable().optional(),
	status: labOrderStatusSchema.default("sent"),
	sentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата отправки должна быть в формате YYYY-MM-DD"),
	expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Плановая дата должна быть в формате YYYY-MM-DD").nullable().optional(),
	receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата доставки должна быть в формате YYYY-MM-DD").nullable().optional(),
	priceRub: z.number().nonnegative("Стоимость не может быть отрицательной").nullable().optional(),
	notes: z.string().max(2000).nullable().optional(),
	createdAt: z.string().optional(),
});
export type LabOrderRecord = z.infer<typeof labOrderRecordSchema>;

export function isLabOrderOverdue(
	order: LabOrderRecord,
	referenceDate: Date = new Date(),
): boolean {
	if (
		order.status === "received" ||
		order.status === "ready" ||
		order.status === "ready_in_clinic" ||
		order.status === "fitted" ||
		order.status === "completed" ||
		order.status === "cancelled"
	) {
		return false;
	}

	if (!order.expectedDate) {
		return false;
	}

	const [expY, expM, expD] = order.expectedDate.split("-").map(Number);
	if (!expY || !expM || !expD) {
		return false;
	}

	const expectedEndOfDayUtc = Date.UTC(expY, expM - 1, expD, 23, 59, 59, 999);
	return referenceDate.getTime() > expectedEndOfDayUtc;
}

export function calculateLabTurnaroundDays(
	sentDate: string,
	receivedDate: string,
): number {
	const [sY, sM, sD] = sentDate.split("-").map(Number);
	const [rY, rM, rD] = receivedDate.split("-").map(Number);

	if (!sY || !sM || !sD || !rY || !rM || !rD) {
		return 0;
	}

	const sentUtc = Date.UTC(sY, sM - 1, sD);
	const recvUtc = Date.UTC(rY, rM - 1, rD);

	if (recvUtc < sentUtc) {
		return 0;
	}

	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.round((recvUtc - sentUtc) / msPerDay);
}

export function formatLabOrderPrescriptionA4(
	order: LabOrderRecord,
	clinicName: string,
	doctorName: string,
): string {
	const workLabel = LAB_WORK_TYPE_LABELS_RU[order.workType] || order.workType;
	const statusLabel = LAB_ORDER_STATUS_LABELS_RU[order.status] || order.status;
	const impressionLabel = order.impressionType
		? LAB_IMPRESSION_LABELS_RU[order.impressionType]
		: "Не указан / По согласованию";
	const shadeLabel = order.shade ? `VITA ${order.shade}` : "Не указан / Индивидуально";
	const priceFormatted =
		typeof order.priceRub === "number" && order.priceRub >= 0
			? `${order.priceRub.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} руб.`
			: "По прейскуранту ЗТЛ";

	const orderNum = order.id ? `ЗТЛ-${order.id.slice(0, 8).toUpperCase()}` : "Б/Н";

	return [
		"================================================================================",
		"            НАРЯД-ЗАКАЗ В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ (ФОРМА № ЗТЛ-1)           ",
		"             (Официальное клиническое задание на изготовление протеза)           ",
		"================================================================================",
		"",
		`Клиника:     ${clinicName}`,
		`Врач:        ${doctorName}`,
		`Лаборатория: ${order.labName} (ID контакта: ${order.labContactId})`,
		`Номер заказа: ${orderNum}`,
		`Дата выдачи: ${order.sentDate}`,
		"",
		"--------------------------------------------------------------------------------",
		"1. ДАННЫЕ ПАЦИЕНТА",
		"--------------------------------------------------------------------------------",
		`ФИО пациента:        ${order.patientName}`,
		`Идентификатор (ID):  ${order.patientId}`,
		"",
		"--------------------------------------------------------------------------------",
		"2. КЛИНИЧЕСКИЕ И ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ КОНСТРУКЦИИ",
		"--------------------------------------------------------------------------------",
		`Вид конструкции:     ${workLabel} (${order.workType})`,
		`Зубная формула (FDI): ${order.toothReference || "Не указана"}`,
		`Расцветка / оттенок: ${shadeLabel}`,
		`Тип оттиска / скана: ${impressionLabel}`,
		`Антагонисты:         ${order.antagonistInfo || "Оттиск / цифровой скан антагонистов приложен"}`,
		"",
		"--------------------------------------------------------------------------------",
		"3. СРОКИ ИЗГОТОВЛЕНИЯ И ФИНАНСОВЫЕ УСЛОВИЯ",
		"--------------------------------------------------------------------------------",
		`Дата отправки в ЗТЛ: ${order.sentDate}`,
		`Плановая дата сдачи: ${order.expectedDate || "По согласованию"}`,
		`Фактическая сдача:   ${order.receivedDate || "В производстве"}`,
		`Текущий статус:      ${statusLabel}`,
		`Оценочная стоимость: ${priceFormatted}`,
		"",
		"--------------------------------------------------------------------------------",
		"4. ОСОБЫЕ КЛИНИЧЕСКИЕ УКАЗАНИЯ И ПРИМЕЧАНИЯ ТЕХНИКУ",
		"--------------------------------------------------------------------------------",
		order.notes && order.notes.trim().length > 0
			? order.notes.trim()
			: "Стандартный клинический протокол. Изготовление строго по анатомическим ориентирам.",
		"",
		"--------------------------------------------------------------------------------",
		"5. РЕГЛАМЕНТНЫЕ ТРЕБОВАНИЯ И САНИТАРНЫЙ КОНТРОЛЬ",
		"--------------------------------------------------------------------------------",
		"- СанПиН 3.3686-21: Дезинфекция оттисков, прикусных валиков и регистратов окклюзии",
		"  проведена в клинике перед отправкой в зуботехническую лабораторию.",
		"- ГОСТ Р 51087-97 / ГОСТ 31576-2012: Требования к совместимости стоматологических материалов.",
		"- Клинические рекомендации СтАР по ортопедической стоматологии.",
		"- Клиническое решение: срок плана лечения (>30 дней) подтвержден врачом и не препятствует",
		"  изготовлению наряда ЗТЛ, оказанию услуг или оплате.",
		"",
		"--------------------------------------------------------------------------------",
		"6. ПОДПИСИ СТОРОН",
		"--------------------------------------------------------------------------------",
		`Врач-стоматолог-ортопед:     ____________________ / ${doctorName} /`,
		"",
		`Зубной техник / приемщик:    ____________________ / ${order.labName} /`,
		"",
		'Дата приемки работы в ЗТЛ:   "____" ____________ 20___ г.',
		"================================================================================",
	].join("\n");
}

export interface FormZtl1OrderInput {
	id?: string | null | undefined;
	patientId?: string | null | undefined;
	patientFullName?: string | null | undefined;
	patientName?: string | null | undefined;
	labName?: string | null | undefined;
	labId?: string | null | undefined;
	labContactId?: string | null | undefined;
	workType?: string | null | undefined;
	toothNumbers?: readonly (string | number)[] | null | undefined;
	toothReference?: string | null | undefined;
	antagonistInfo?: string | null | undefined;
	sentDate?: string | null | undefined;
	expectedDate?: string | null | undefined;
	receivedDate?: string | null | undefined;
	labCostKopecks?: number | null | undefined;
	priceRub?: number | null | undefined;
	notes?: string | null | undefined;
	doctorFullName?: string | null | undefined;
}

export const formatLabOrderFormZtl1A4Protocol = (
	order: FormZtl1OrderInput | null | undefined,
	clinicName?: string,
): string => {
	if (!order) return "";
	const safeWorkType: LabWorkType =
		order.workType && (labWorkTypeSchema.options as readonly string[]).includes(order.workType)
			? (order.workType as LabWorkType)
			: "other";
	return formatLabOrderPrescriptionA4(
		{
			id: typeof order.id === "string" && order.id.length === 36 ? order.id : undefined,
			patientId: String(order.patientId || "patient-1"),
			patientName: String(order.patientFullName || order.patientName || "Пациент"),
			labName: String(order.labName || "Зуботехническая лаборатория"),
			labContactId: String(order.labId || order.labContactId || "lab-default"),
			workType: safeWorkType,
			toothReference: Array.isArray(order.toothNumbers) ? order.toothNumbers.join(", ") : (order.toothReference || undefined),
			antagonistInfo: order.antagonistInfo || undefined,
			impressionType: "digital_scan",
			sentDate: order.sentDate || new Date().toISOString().slice(0, 10),
			expectedDate: order.expectedDate || undefined,
			receivedDate: order.receivedDate || undefined,
			status: "sent",
			priceRub: typeof order.labCostKopecks === "number" ? Math.round(order.labCostKopecks / 100) : (order.priceRub || undefined),
			notes: order.notes || undefined,
		},
		clinicName || "Стоматологическая клиника DENTE",
		String(order.doctorFullName || "Лечащий врач-ортопед")
	);
};

export const labOrdersEngine = {
	formatLabOrderPrescriptionA4,
	formatLabOrderFormZtl1A4Protocol,
};

