import {
	VALID_FDI_TOOTH_NUMBERS,
	isValidVitaShade,
	normalizeVitaShade,
	VITA_SHADE_VALIDATION_MESSAGE,
	nonNegativeMoneyRubSchema,
	restorationTypeSchema,
	restorationMaterialSchema,
	stumpPreparationShadeSchema,
	labOrderMilestoneSchema,
} from "@dental/shared";
import { z } from "zod";
import type { LabOrderStatus } from "../../db/labQuery.js";

/*
 * Цена заказа лаборатории — деньги клиники. Колонка `numeric(12,2)`:
 * Контракт `nonNegativeMoneyRubSchema` исключает копеечный дрейф и дробные части.
 */
export const labOrderPriceRubSchema = nonNegativeMoneyRubSchema
	.refine((value) => value <= 100_000_000, {
		message: "Цена заказа лаборатории не помещается в допустимый лимит (100 млн ₽).",
	})
	.optional()
	.nullable();

/**
 * Валидация нотации зубов по стандарту FDI (ISO 3950).
 * Принимает как одиночный номер (напр. "16"), так и список через запятую ("16, 17", "11-21").
 */
export function validateFdiToothNotation(value: string | null | undefined): boolean {
	if (!value) return true;
	const trimmed = value.trim();
	if (!trimmed) return true;
	// Разрешить общие наряды на челюсть (каппы, сплины, элайнеры, ПСПП) без привязки к одиночным зубам (Мандат 8e/8k)
	if (
		/^(общий|челюст|вч|нч|обе|all|general|full|none|арка|капп|сплинт)/i.test(trimmed) ||
		trimmed.includes("Общий") ||
		trimmed.includes("Челюсть")
	) {
		return true;
	}
	const parts = value.split(/[\s,;-]+/).filter(Boolean);
	if (parts.length === 0) return true;
	for (const part of parts) {
		const num = Number.parseInt(part, 10);
		if (Number.isNaN(num) || !VALID_FDI_TOOTH_NUMBERS.has(num)) {
			return false;
		}
	}
	return true;
}

export const toothFdiSchema = z
	.string()
	.trim()
	.refine(validateFdiToothNotation, {
		message:
			"Недопустимый номер зуба в заказе ЗТЛ. Используйте номера FDI (11–48, 51–85, 91–98).",
	})
	.optional()
	.nullable();

export const colorVitaSchema = z
	.string()
	.trim()
	.transform((val) => normalizeVitaShade(val))
	.refine(
		(val) => !val || isValidVitaShade(val),
		{ message: VITA_SHADE_VALIDATION_MESSAGE },
	)
	.optional()
	.nullable();

export const createLabOrderSchema = z.object({
	patientId: z.string().uuid().optional().nullable(),
	doctorId: z
		.string()
		.optional()
		.nullable()
		.transform((val) => (val && val !== "doc-current" && /^[0-9a-fA-F-]{36}$/.test(val) ? val : null)),
	doctorName: z.string().trim().optional().nullable(),
	toothFdi: toothFdiSchema.optional().nullable(),
	teethFdi: toothFdiSchema.optional().nullable(),
	material: z.string().trim().optional().nullable(),
	materialName: z.string().trim().optional().nullable(),
	construction: z.string().trim().optional().nullable(),
	workTypeId: z.string().trim().optional().nullable(),
	colorVita: colorVitaSchema.optional().nullable(),
	shadeCode: z.string().trim().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	expectedLabDate: z.string().optional().nullable(),
	clinicalNotes: z.string().trim().optional().nullable(),
	doctorNotes: z.string().trim().optional().nullable(),
	priceRub: labOrderPriceRubSchema.optional().nullable(),
	orderNumber: z.string().trim().optional().nullable(),
	status: z.string().trim().optional().nullable(),
	stage: z.string().trim().optional().nullable(),
	techStage: z.string().trim().optional().nullable(),
	overrideActive: z.boolean().optional().nullable(),
	overrideReason: z.string().trim().optional().nullable(),
});

/**
 * Calculates deadline skipping weekends (Saturday & Sunday).
 */
export function calculateBusinessDaysDueDate(startDate: Date, businessDays = 5): Date {
	const result = new Date(startDate);
	let added = 0;
	while (added < businessDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

export const CANONICAL_DENTAL_LAB_PRESETS = [
	{
		id: "zirconia_a2_std",
		nameRu: "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней",
		shortTitle: "Коронка ZrO2 (Katana/Prettau)",
		constructionType: "crown_zirconia",
		material: "Диоксид циркония Multi-Layer (Katana ML)",
		colorVita: "A2",
		stumpShade: "ND2",
		turnaroundBusinessDays: 5,
		isOneClickDefault: true,
		suggestedPriceRub: 24000,
		suggestedCostRub: 7500,
		specialInstructions:
			"Анатомическая форма с выраженными краевыми валиками, микротекстура, режущий край 0.8 мм транслуцентность.",
	},
	{
		id: "emax_a1_aesthetic",
		nameRu: "IPS e.max Press / CAD, цвет А1, высокоэстетичная цельная керамика, срок 5 рабочих дней",
		shortTitle: "IPS e.max Press",
		constructionType: "crown_emax",
		material: "Дисиликат лития IPS e.max Press",
		colorVita: "A1",
		stumpShade: "ND1",
		turnaroundBusinessDays: 5,
		isOneClickDefault: false,
		suggestedPriceRub: 26000,
		suggestedCostRub: 8500,
		specialInstructions: "Фронтальная группа зубов, естественная опалесценция, микрорельеф.",
	},
	{
		id: "metal_ceramic_a3",
		nameRu: "Металлокерамика Co-Cr Noritake, цвет А3, срок 7 рабочих дней",
		shortTitle: "Металлокерамика Co-Cr",
		constructionType: "metal_ceramic",
		material: "КХС каркас с послойным нанесением керамики Noritake EX-3",
		colorVita: "A3",
		stumpShade: null,
		turnaroundBusinessDays: 7,
		isOneClickDefault: false,
		suggestedPriceRub: 15000,
		suggestedCostRub: 5000,
		specialInstructions: "Гирлянда 0.5 мм, промывное пространство под промежуточной частью.",
	},
	{
		id: "clasp_denture_bredent",
		nameRu: "Бюгельный протез с замковыми креплениями Bredent, срок 10 рабочих дней",
		shortTitle: "Бюгельный протез",
		constructionType: "clasp_denture",
		material: "Литой Co-Cr каркас с микрозамками Bredent VKS-SG",
		colorVita: "A2",
		stumpShade: null,
		turnaroundBusinessDays: 10,
		isOneClickDefault: false,
		suggestedPriceRub: 32000,
		suggestedCostRub: 11000,
		specialInstructions: "Оригинальные замки Bredent, гарнитурные зубы Ivoclar.",
	},
	{
		id: "orthodontic_aligners",
		nameRu: "Ортодонтические элайнеры / Каппы / Сплинты, срок 5 рабочих дней",
		shortTitle: "Элайнеры / Сплинт",
		constructionType: "aligners",
		material: "Медицинский термополиуретан Duran / Biolon",
		colorVita: "BL2",
		stumpShade: null,
		turnaroundBusinessDays: 5,
		isOneClickDefault: false,
		suggestedPriceRub: 45000,
		suggestedCostRub: 18000,
		specialInstructions: "Лазерная обрезка по десневому краю, полировка кромок.",
	},
] as const;

export const expressLabOrderSchema = z.object({
	patientId: z.string().uuid({ message: "Некорректный UUID пациента" }),
	doctorId: z.string().uuid().optional().nullable(),
	teethFdi: z
		.union([z.string().trim(), z.array(z.number())])
		.refine(
			(val) => {
				if (Array.isArray(val)) {
					return val.every((num) => VALID_FDI_TOOTH_NUMBERS.has(num));
				}
				return validateFdiToothNotation(val);
			},
			{ message: "Недопустимый номер зуба в нотации FDI (11–48, 51–85, 91–98)" },
		)
		.default("16"),
	construction: z.enum([
		"crown_zirconia",
		"crown_emax",
		"metal_ceramic",
		"clasp_denture",
		"aligners",
		"implant_abutment",
	]).default("crown_zirconia"),
	colorVita: z
		.string()
		.trim()
		.transform((val) => normalizeVitaShade(val))
		.refine((val) => !val || isValidVitaShade(val), {
			message: VITA_SHADE_VALIDATION_MESSAGE,
		})
		.default("A2"),
	stumpShade: z.string().trim().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	priceRub: nonNegativeMoneyRubSchema.optional().nullable(),
	specialInstructions: z.string().trim().optional().nullable(),
	treatmentPlanAgeDays: z.number().int().nonnegative().optional().nullable(),
	isOneClickPreset: z.boolean().optional().default(false),
	doctorClinicalOverride: z.boolean().optional().default(false),
	doctorOverrideReason: z.string().trim().optional().nullable(),
});

export const checkPlanContinuitySchema = z.object({
	patientId: z.string().uuid(),
	treatmentPlanId: z.string().uuid().optional().nullable(),
	planAgeDays: z.number().int().nonnegative().optional().default(0),
});

export function normalizeRestorationType(val: unknown): string {
	if (typeof val !== "string") return "crown_monolithic";
	const clean = val.trim().toLowerCase();
	const map: Record<string, string> = {
		single_crown: "crown_monolithic",
		crown: "crown_monolithic",
		crown_zirconia: "crown_monolithic",
		crown_emax: "crown_layered_cutback",
		bridge: "bridge_retainer",
		bridge_retainer: "bridge_retainer",
		bridge_pontic: "bridge_pontic",
		veneer: "veneer_laminate",
		veneer_laminate: "veneer_laminate",
		inlay_onlay: "inlay",
		inlay: "inlay",
		onlay: "onlay",
		overlay: "overlay",
		all_on_4_6: "screw_retained_crown",
		all_on_arch: "screw_retained_crown",
		implant_abutment: "custom_abutment_tibase",
		custom_abutment_tibase: "custom_abutment_tibase",
		screw_retained_crown: "screw_retained_crown",
		surgical_guide: "surgical_guide",
		aligner_nightguard: "clear_aligner_stage",
		aligners_nightguard: "clear_aligner_stage",
		aligners: "clear_aligner_stage",
		aligner_splint: "clear_aligner_stage",
		clear_aligner_stage: "clear_aligner_stage",
		occlusal_splint: "occlusal_splint_nightguard",
		nightguard_bruxism: "occlusal_splint_nightguard",
		occlusal_splint_nightguard: "occlusal_splint_nightguard",
		endocrown: "endocrown",
		crown_monolithic: "crown_monolithic",
		crown_layered_cutback: "crown_layered_cutback",
		digital_waxup_mockup: "digital_waxup_mockup",
	};
	return map[clean] || (restorationTypeSchema.options.includes(val as any) ? val : "crown_monolithic");
}

export function normalizeRestorationMaterial(val: unknown): string {
	if (typeof val !== "string") return "zirconia_multilayer_gradient";
	const clean = val.trim().toLowerCase();
	const map: Record<string, string> = {
		zirconia_multilayer: "zirconia_multilayer_gradient",
		zirconia: "zirconia_multilayer_gradient",
		zirconia_multilayer_gradient: "zirconia_multilayer_gradient",
		zirconia_3y: "zirconia_3y_high_strength",
		zirconia_3y_high_strength: "zirconia_3y_high_strength",
		zirconia_4y: "zirconia_4y_high_translucent",
		zirconia_4y_high_translucent: "zirconia_4y_high_translucent",
		zirconia_5y: "zirconia_5y_ultra_translucent",
		zirconia_5y_ultra_translucent: "zirconia_5y_ultra_translucent",
		emax_lithium_disilicate: "emax_lithium_disilicate_press",
		emax_press: "emax_lithium_disilicate_press",
		emax_lithium_disilicate_press: "emax_lithium_disilicate_press",
		emax_cad: "emax_lithium_disilicate_cad",
		emax_lithium_disilicate_cad: "emax_lithium_disilicate_cad",
		emax: "emax_lithium_disilicate_press",
		pfm_cocr: "cocr_milled_cast",
		metal_ceramic: "cocr_milled_cast",
		cocr_milled_cast: "cocr_milled_cast",
		pmma_temporary: "pmma_cad_provisional",
		pmma: "pmma_cad_provisional",
		pmma_cad_provisional: "pmma_cad_provisional",
		titanium_custom_abutment: "titanium_grade_5",
		titanium: "titanium_grade_5",
		titanium_grade_5: "titanium_grade_5",
		composite_lab_nanohybrid: "composite_lab_nanohybrid",
		peek_biohpp: "peek_biohpp",
		resin_3d_surgical_guide: "resin_3d_surgical_guide",
		resin_3d_splint_biocompatible: "resin_3d_splint_biocompatible",
	};
	return map[clean] || (restorationMaterialSchema.options.includes(val as any) ? val : "zirconia_multilayer_gradient");
}

export function normalizeShadeSystem(val: unknown): "VITA_CLASSICAL" | "VITA_3D_MASTER" | "BLEACH" {
	if (typeof val !== "string") return "VITA_CLASSICAL";
	const clean = val.trim().toUpperCase();
	if (clean === "CLASSICAL" || clean === "VITA_CLASSICAL") return "VITA_CLASSICAL";
	if (clean === "3D_MASTER" || clean === "VITA_3D_MASTER") return "VITA_3D_MASTER";
	if (clean === "BLEACH") return "BLEACH";
	return "VITA_CLASSICAL";
}

export function normalizeStumpShade(val: unknown): string | null {
	if (!val || typeof val !== "string") return null;
	const clean = val.trim().toUpperCase();
	if (stumpPreparationShadeSchema.options.includes(clean as any)) return clean;
	return null;
}

export const createLabItemSchema = z.object({
	toothFdi: z
		.number()
		.int()
		.refine((val) => VALID_FDI_TOOTH_NUMBERS.has(val), {
			message:
				"Недопустимый биологический номер зуба по стандарту FDI (разрешены только 11–18, 21–28, 31–38, 41–48, 51–55, 61–65, 71–75, 81–85).",
		}),
	restorationType: z
		.preprocess(normalizeRestorationType, restorationTypeSchema)
		.default("crown_monolithic"),
	material: z
		.preprocess(normalizeRestorationMaterial, restorationMaterialSchema)
		.default("zirconia_multilayer_gradient"),
	shadeSystem: z
		.preprocess(normalizeShadeSystem, z.enum(["VITA_CLASSICAL", "VITA_3D_MASTER", "BLEACH"]))
		.default("VITA_CLASSICAL"),
	shadeFinal: z.string().trim().default("A2"),
	shadeStump: z.preprocess(normalizeStumpShade, stumpPreparationShadeSchema.optional().nullable()),
	shadeGingiva: z.string().trim().optional().nullable(),
	translucencyLevel: z.enum(["HT", "ST", "UT", "MO", "LT"]).default("HT"),
	cementGapMicrons: z.number().int().min(0).max(200).default(30),
	extraMarginGapMicrons: z.number().int().min(0).max(100).default(10),
	minimalThicknessMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.default("0.60"),
	implantSystem: z.string().trim().optional().nullable(),
	implantPlatformDiameterMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	tiBaseHeightMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshTriangleCount: z.number().int().optional().nullable(),
	meshSurfaceAreaMm2: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshVolumeMm3: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshBboxMm: z.record(z.unknown()).optional().nullable(),
	isManifold: z.boolean().default(true),
	priceRub: labOrderPriceRubSchema,
});

export const createLabOrderEventSchema = z.object({
	milestone: labOrderMilestoneSchema.default("submitted"),
	actorType: z
		.enum(["clinic_doctor", "dental_technician", "courier", "administrator"])
		.default("clinic_doctor"),
	actorId: z.string().uuid().optional().nullable(),
	actorName: z.string().trim().default("Сотрудник клиники"),
	notes: z.string().trim().max(1000).optional().nullable(),
	barcodeScanned: z.string().trim().optional().nullable(),
	photoUrls: z
		.array(z.string().url().or(z.string().startsWith("/")))
		.default([]),
	cadPreviewGlbUrl: z.string().trim().optional().nullable(),
});

/**
 * Вспомогательное сопоставление клинического этапа ЗТЛ на допустимый статус lab_orders.status (0042 CHECK).
 */
export function mapStageToLabOrderStatus(stage: string): LabOrderStatus | null {
	switch (stage) {
		case "sent_to_lab":
		case "sent":
		case "impression_scan":
		case "impression":
		case "scan":
		case "Слепок/Скан":
			return "sent";
		case "in_progress":
		case "model_cad_design":
		case "framework_wax_milling":
		case "sintering_ceramic_layering":
		case "final_glaze":
		case "framework_fitting":
		case "framework":
		case "Каркас/Примерка":
		case "ceramic_layering":
		case "ceramic":
		case "Нанесение керамики":
			return "in_progress";
		case "shipped":
		case "shipped_to_clinic":
			return "shipped";
		case "delivered_to_clinic":
		case "received":
		case "clinic_received":
		case "ready_in_clinic":
		case "ready":
		case "ready_work":
		case "Готовая работа":
			return "received";
		case "fitting_scheduled":
		case "fitting_in_mouth":
		case "correction_remake":
		case "warranty_rework":
		case "refitting":
			return "refitting";
		case "delivered_completed":
		case "completed":
		case "patient_fixation":
		case "fixation":
		case "Фиксация":
			return "completed";
		case "cancelled":
			return "cancelled";
		case "draft":
			return "draft";
		default:
			return null;
	}
}

/**
 * Сопоставление этапа или статуса на майлстоун для таблицы аудита labOrderEvents.
 */
export function mapStageOrStatusToMilestone(stageOrStatus: string): z.infer<typeof labOrderMilestoneSchema> {
	switch (stageOrStatus) {
		case "draft":
			return "draft";
		case "sent":
		case "sent_to_lab":
			return "submitted";
		case "in_progress":
			return "cad_intake_verified";
		case "model_cad_design":
		case "digital_design_cad":
			return "digital_design_cad";
		case "framework_wax_milling":
		case "cam_production":
			return "cam_production";
		case "sintering_ceramic_layering":
		case "sintering_crystallization":
			return "sintering_crystallization";
		case "final_glaze":
		case "ceramic_glaze_finish":
			return "ceramic_glaze_finish";
		case "shipped":
		case "shipped_courier":
			return "shipped_courier";
		case "received":
		case "delivered_to_clinic":
		case "clinic_received":
			return "clinic_received";
		case "fitting_scheduled":
		case "fitting_in_mouth":
		case "clinical_try_in":
			return "clinical_try_in";
		case "refitting":
		case "correction_remake":
		case "warranty_rework":
		case "refitting_remake":
			return "refitting_remake";
		case "delivered_completed":
		case "completed":
		case "final_cementation":
			return "final_cementation";
		case "closed_warranty":
			return "closed_warranty";
		case "cancelled":
			return "cancelled";
		default:
			return "submitted";
	}
}
