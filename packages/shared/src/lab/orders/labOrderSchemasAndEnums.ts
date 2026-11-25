import { z } from "zod";
import { normalizeVitaShade } from "./labOrderLabelsAndShades.js";

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
	"fitting",
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

// ─── CANONICAL 7-STAGE DENTAL LAB PIPELINE (MANDATE 8S, 8E & TASK-LAB-04) ────

export const labPipeline7StageKeySchema = z.enum([
	"impression_scan",      // 1. Слепок / Интраоральный скан (отправка STL/PLY скана или слепка с указанием массы)
	"cad_modeling",        // 2. 3D-моделирование / CAD (согласование виртуального wax-up)
	"framework_production", // 3. Производство каркаса (фрезеровка ZrO2, титановый абатмент, литье CoCr)
	"framework_fitting",   // 4. Примерка каркаса (клиническая примерка каркаса в полости рта)
	"ceramic_glazing",     // 5. Облицовка & Глазурование (нанесение керамики, индивидуализация VITA, глазурь)
	"otk_control",         // 6. Контроль качества ОТК (лабораторный аудит прилегания, окклюзии и цвета перед сдачей)
	"clinic_delivery",     // 7. Доставка в клинику (готово к фиксации, оформлен гарантийный паспорт)
]);
export type LabPipeline7StageKey = z.infer<typeof labPipeline7StageKeySchema>;

export interface LabPipeline7StageDefinition {
	id: LabPipeline7StageKey;
	step: number;
	titleRu: string;
	shortTitleRu: string;
	descriptionRu: string;
	badgeClass: string;
	iconName: string;
}


// ─── CANONICAL 5-STAGE DENTAL LAB PIPELINE (COMPATIBILITY) ───────────────────

export const labPipeline5StageKeySchema = z.enum([
	"impression_scan",      // 1. Слепок / Интраоральный скан (отправка STL/PLY скана или слепка с указанием массы)
	"cad_modeling",        // 2. 3D-моделирование / CAD (согласование виртуального wax-up)
	"framework_fitting",   // 3. Примерка каркаса (диоксид циркония, титан, КХС, примерка во рту)
	"ceramic_layering",    // 4. Нанесение керамики (глазурь, индивидуализация, расцветка Vita Classical / 3D-Master / Bleach)
	"ready_fixation",      // 5. Готово к фиксации (прибыло в клинику, дата и время сдачи, гарантийный паспорт)
]);
export type LabPipeline5StageKey = z.infer<typeof labPipeline5StageKeySchema>;

export const labPipelineStageKeySchema = z.union([
	labPipeline7StageKeySchema,
	labPipeline5StageKeySchema,
]);
export type LabPipelineStageKey = z.infer<typeof labPipelineStageKeySchema>;

export interface LabPipeline5StageDefinition {
	id: LabPipeline5StageKey;
	step: number;
	titleRu: string;
	shortTitleRu: string;
	descriptionRu: string;
	badgeClass: string;
	iconName: string;
}


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


// ─── CANONICAL 8 POSTGRESQL CHECK-CONSTRAINT LAB STATUSES (MIGRATION 0042) ──

export const CANONICAL_PG_LAB_STATUSES = [
	"draft",
	"sent",
	"in_progress",
	"ready",
	"ready_in_clinic",
	"fitting",
	"fitted",
	"refitting",
	"shipped",
	"received",
	"completed",
	"cancelled",
	"rejected_remake",
] as const;

export const canonicalPgLabStatusSchema = z.enum(CANONICAL_PG_LAB_STATUSES);
export type CanonicalPgLabStatus = z.infer<typeof canonicalPgLabStatusSchema>;



export const labImpressionTypeSchema = impressionTypeSchema;
export type LabImpressionType = ImpressionType;



export const rawVitaShadeEnum = z.enum([
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

export const vitaShadeSchema = z.preprocess((val) => {
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (/^bleach_[1-4]$/i.test(trimmed)) {
			return trimmed.toLowerCase();
		}
		return normalizeVitaShade(trimmed);
	}
	return val;
}, rawVitaShadeEnum);

export type VitaShade = z.infer<typeof rawVitaShadeEnum>;

export const labOrderRecordSchema = z.object({
	id: z.string().uuid().optional(),
	patientId: z.string().min(1, "ID пациента обязателен"),
	patientName: z.string().min(1, "ФИО пациента обязательно"),
	labContactId: z.string().min(1, "ID контакта лаборатории обязателен"),
	labName: z.string().min(1, "Наименование лаборатории обязательно"),
	workType: labWorkTypeSchema,
	toothReference: z.string().max(50).nullable().optional(),
	abutmentTeethFdi: z.array(z.number().int()).optional().nullable(),
	ponticTeethFdi: z.array(z.number().int()).optional().nullable(),
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


export interface PatientLabOrderDto {
	id: string;
	patientId: string;
	patientName?: string | null;
	doctorId?: string | null;
	doctorName?: string | null;
	secureToken: string;
	toothFdi?: string | null;
	teethFdi?: string | null;
	abutmentTeethFdi?: readonly number[] | null;
	ponticTeethFdi?: readonly number[] | null;
	material?: string | null;
	colorVita?: string | null;
	shadeCode?: string | null;
	constructionType?: string | null;
	status: string;
	stage?: string | null;
	techStage?: string | null;
	dueDate?: string | null;
	clinicalNotes?: string | null;
	labComments?: string | null;
	attachedImageUrl?: string | null;
	/** Канонические финансовые поля в целочисленных копейках (Мандат 8bm) */
	priceKopecks?: number | null;
	patientPriceKopecks?: number | null | undefined;
	amountKopecks?: number | null;
	labCostKopecks?: number | null;
	costKopecks?: number | null;
	/** Устаревшие рублёвые поля (поддерживаются для совместимости) */
	priceRub?: number | null;
	labCostRub?: number | null;
	costRub?: number | null;
	isWarranty?: boolean | null;
	isLockedInstalled?: boolean | null;
	orderNumber?: string | null;
	gostOrderNumber?: string | null;
	createdAt: string;
	updatedAt?: string;
}

export type LabOrderFilterKey = "all" | "active" | "fitting" | "ready" | "completed";

// ─── SSOT EXTENSIONS & CANONICAL SCHEMAS (MANDATE 8bf) ─────────────────────────
