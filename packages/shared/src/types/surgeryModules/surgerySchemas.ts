import { z } from "zod";
import { permanentToothNumberFdiSchema } from "../../schemas/implantologyAndPrescriptionSchemas.js";

export const SURGICAL_OPERATION_CATEGORIES = [
	"implant",
	"extraction",
	"perio_surgery",
	"sinus_gbr",
	"emergency",
] as const;

export type SurgicalOperationCategory = (typeof SURGICAL_OPERATION_CATEGORIES)[number];

export const surgicalOperationCategorySchema = z.enum(SURGICAL_OPERATION_CATEGORIES);

export interface SurgicalServiceItem {
	readonly code: string;
	readonly nameRu: string;
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly suggestedPriceRub?: number | undefined;
	readonly toothNumber?: number | undefined;
	readonly stageKind?: string | undefined;
	readonly isPrimary?: boolean | undefined;
	readonly priceKopecks?: bigint | number | undefined;
}

export type SurgicalService804n = SurgicalServiceItem;

export const surgicalServiceItemSchema = z
	.object({
		code: z.string().min(1),
		nameRu: z.string().min(1).optional(),
		name: z.string().min(1).optional(),
		priceRub: z.number().nonnegative(),
		quantity: z.number().positive().default(1),
		suggestedPriceRub: z.number().nonnegative().optional(),
		toothNumber: z.number().int().optional(),
		stageKind: z.string().optional(),
		isPrimary: z.boolean().optional(),
		priceKopecks: z.union([z.bigint(), z.number()]).optional(),
	})
	.strict()
	.transform((val) => ({
		...val,
		nameRu: val.nameRu || val.name || "Хирургическая манипуляция",
		name: val.name || val.nameRu || "Хирургическая манипуляция",
	}));

export const surgicalService804nSchema = surgicalServiceItemSchema;

export interface SurgicalMaterialItem {
	readonly name: string;
	readonly unit: string;
	readonly quantity: number;
	readonly isWarehouseCritical: boolean;
}

export const surgicalMaterialItemSchema = z
	.object({
		name: z.string().min(1),
		unit: z.string().min(1),
		quantity: z.number().positive(),
		isWarehouseCritical: z.boolean().default(false),
	})
	.strict();

export interface SurgicalOperationNorm {
	readonly id: string;
	readonly title: string;
	readonly shortBadge: string;
	readonly category: SurgicalOperationCategory;
	readonly icd10: string;
	readonly icd10Label: string;
	readonly serviceCode?: string;
	readonly serviceSubcode?: string;
	readonly serviceTitle?: string;
	readonly code804n?: string;
	readonly code804nSubcode?: string;
	readonly service804nTitle?: string;
	readonly defaultToothFdi?: number;
	readonly defaultPriceRub?: number;
	readonly priceRub?: number;
	readonly priceKopecks?: bigint;
	readonly standardProtocolTextRu: string;
	readonly anesthesiaDefaultRu: string;
	readonly postOpRecommendationsRu: string;
	readonly catalogServices?: readonly SurgicalServiceItem[];
	readonly order804nServices?: readonly SurgicalServiceItem[];
	readonly requiredMaterials: readonly SurgicalMaterialItem[];
}

export const surgicalOperationNormSchema = z
	.object({
		id: z.string().min(1),
		title: z.string().min(1),
		shortBadge: z.string().min(1),
		category: surgicalOperationCategorySchema,
		icd10: z.string().min(1),
		icd10Label: z.string().min(1),
		serviceCode: z.string().optional(),
		serviceSubcode: z.string().optional(),
		serviceTitle: z.string().optional(),
		code804n: z.string().optional(),
		code804nSubcode: z.string().optional(),
		service804nTitle: z.string().optional(),
		defaultToothFdi: z.number().int().optional(),
		defaultPriceRub: z.number().nonnegative().optional(),
		priceRub: z.number().nonnegative().optional(),
		priceKopecks: z.union([z.bigint(), z.number()]).optional(),
		standardProtocolTextRu: z.string().min(1),
		anesthesiaDefaultRu: z.string().min(1),
		postOpRecommendationsRu: z.string().min(1),
		catalogServices: z.array(surgicalServiceItemSchema).optional(),
		order804nServices: z.array(surgicalServiceItemSchema).optional(),
		requiredMaterials: z.array(surgicalMaterialItemSchema),
	})
	.strict();

/**
 * Статус мягкого овердрафта склада (клинический регламент):
 * canProceed ВСЕГДА true — операция врача не блокируется.
 */
export interface SurgicalWarehouseOverdraftStatus {
	readonly hasOverdraft: boolean;
	readonly warningRu: string;
	readonly detailsRu: string;
	readonly pendingItems: readonly string[];
	readonly canProceed: true;
}

export const surgicalWarehouseOverdraftStatusSchema = z
	.object({
		hasOverdraft: z.boolean(),
		warningRu: z.string(),
		detailsRu: z.string(),
		pendingItems: z.array(z.string()),
		canProceed: z.literal(true),
	})
	.strict();

export type MischBoneDensity = "D1" | "D2" | "D3" | "D4" | "D5";
export type ImplantCapKind = "fdm" | "plug";

export interface FastImplantPassportData {
	readonly passportId?: string | undefined;
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly catalogArticle?: string | undefined;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly isqDay0?: number | undefined;
	readonly baselineIsq?: number | undefined;
	readonly isqMean?: number | undefined;
	readonly boneDensity: MischBoneDensity;
	readonly capType?: ImplantCapKind | undefined;
	readonly lotNumber?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly isWarehouseOverdraft?: boolean | undefined;
	readonly inventoryItemId?: string | undefined;
	readonly expirationDate?: string | undefined;
	readonly operationPriceRub?: number | undefined;
	readonly implantCostRub?: number | undefined;
	readonly consumablesCostRub?: number | undefined;
	readonly doctorGrossMarginRub?: number | undefined;
	readonly netDoctorIncomeRub?: number | undefined;
	readonly operationPriceKopecks?: bigint | number | undefined;
	readonly implantCostKopecks?: bigint | number | undefined;
	readonly consumablesCostKopecks?: bigint | number | undefined;
	readonly doctorGrossMarginKopecks?: bigint | number | undefined;
	readonly netDoctorIncomeKopecks?: bigint | number | undefined;
	readonly isImmediateLoadingFeasible?: boolean | undefined;
	readonly osteointegrationExpectedDate?: string | undefined;
	readonly boneGraftMaterial?: string | undefined;
	readonly membraneUsed?: string | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly notes?: string | undefined;
}

export const fastImplantPassportDataSchema = z
	.object({
		passportId: z.string().optional(),
		toothFdi: permanentToothNumberFdiSchema,
		brand: z.string().min(1),
		model: z.string().min(1),
		catalogArticle: z.string().optional(),
		diameterMm: z.number().positive(),
		lengthMm: z.number().positive(),
		torqueNcm: z.number().positive(),
		isqDay0: z.number().int().positive().optional(),
		boneDensity: z.enum(["D1", "D2", "D3", "D4", "D5"]),
		capType: z.enum(["fdm", "plug"]).optional(),
		lotNumber: z.string().optional(),
		serialNumber: z.string().optional(),
		dateIso: z.string().optional(),
		patientName: z.string().optional(),
		patientId: z.string().optional(),
		doctorName: z.string().optional(),
		doctorId: z.string().optional(),
		isWarehouseOverdraft: z.boolean().optional(),
		inventoryItemId: z.string().optional(),
		expirationDate: z.string().optional(),
		operationPriceRub: z.number().optional(),
		implantCostRub: z.number().optional(),
		consumablesCostRub: z.number().optional(),
		doctorGrossMarginRub: z.number().optional(),
		netDoctorIncomeRub: z.number().optional(),
		operationPriceKopecks: z.union([z.bigint(), z.number()]).optional(),
		implantCostKopecks: z.union([z.bigint(), z.number()]).optional(),
		consumablesCostKopecks: z.union([z.bigint(), z.number()]).optional(),
		doctorGrossMarginKopecks: z.union([z.bigint(), z.number()]).optional(),
		netDoctorIncomeKopecks: z.union([z.bigint(), z.number()]).optional(),
		isImmediateLoadingFeasible: z.boolean().optional(),
		osteointegrationExpectedDate: z.string().optional(),
		boneGraftMaterial: z.string().optional(),
		membraneUsed: z.string().optional(),
		sutureMaterial: z.string().optional(),
		notes: z.string().optional(),
	})
	.strict();

export interface StandardImplantationParams {
	readonly toothFdi?: number | undefined;
	readonly brand?: string | undefined;
	readonly model?: string | undefined;
	readonly diameterMm?: number | undefined;
	readonly lengthMm?: number | undefined;
	readonly torqueNcm?: number | undefined;
	readonly isq?: number | undefined;
	readonly capType?: ImplantCapKind | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly postOpXray?: boolean | undefined;
}

export const standardImplantationParamsSchema = z
	.object({
		toothFdi: z.number().int().optional(),
		brand: z.string().optional(),
		model: z.string().optional(),
		diameterMm: z.number().positive().optional(),
		lengthMm: z.number().positive().optional(),
		torqueNcm: z.number().positive().optional(),
		isq: z.number().int().positive().optional(),
		capType: z.enum(["fdm", "plug"]).optional(),
		sutureMaterial: z.string().optional(),
		postOpXray: z.boolean().optional(),
	})
	.strict();

/**
 * Zod-схема создания протокола операции (Форма 043/у)
 */
export const createSurgicalProtocolSchema = z
	.object({
		visitId: z.string().uuid().optional().nullable(),
		patientId: z.string().uuid(),
		doctorId: z.string().uuid().optional().nullable(),
		normId: z.string().default("surgery_implant_standard"),
		toothNumberFdi: z.number().int().min(11).max(85).optional().nullable(),
		teeth: z.array(z.number().int().min(11).max(85)).optional().default([]),
		protocolText: z.string().min(10),
		anesthesiaText: z.string().optional().nullable(),
		recommendationsText: z.string().optional().nullable(),
		services: z.array(surgicalServiceItemSchema).default([]),
		services804n: z.array(surgicalServiceItemSchema).default([]),
		materialsUsed: z.array(surgicalMaterialItemSchema).default([]),
		bundleType: z.enum(["surgery", "implant", "sinus_gbr"]).optional(),
		deductMaterials: z.boolean().optional(),
		isOverdraftActive: z.boolean().default(false),
		notes: z.string().optional().nullable(),
	})
	.strict()
	.superRefine((data, ctx) => {
		const isImplant =
			data.normId.toLowerCase().includes("implant") ||
			data.normId === "scen-implant" ||
			data.normId === "surgery_implant_standard";

		if (isImplant) {
			if (
				data.toothNumberFdi != null &&
				data.toothNumberFdi >= 51 &&
				data.toothNumberFdi <= 85
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Установка дентального имплантата в область молочного зуба (#${data.toothNumberFdi}) категорически запрещена анатомическим протоколом`,
					path: ["toothNumberFdi"],
				});
			}

			if (data.teeth && Array.isArray(data.teeth)) {
				for (let i = 0; i < data.teeth.length; i++) {
					const t = data.teeth[i];
					if (t != null && t >= 51 && t <= 85) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Установка дентального имплантата в область молочного зуба (#${t}) категорически запрещена анатомическим протоколом`,
							path: ["teeth", i],
						});
					}
				}
			}
		}
	});

export type CreateSurgicalProtocolInput = z.infer<typeof createSurgicalProtocolSchema>;

/**
 * Zod-схема быстрого списания расходников у стоматологического кресла (клинический регламент).
 * Для карпул анестетиков — отходы Класса Б (СанПиН 3.3686-21) фиксируются медсестрой без комиссий.
 */
export const surgicalQuickDeductSchema = z
	.object({
		visitId: z.string().uuid().optional().nullable(),
		bundleType: z.enum([
			"surgery",
			"implant",
			"sinus_gbr",
			"surgery_extraction",
			"surgery_apicoectomy",
			"anesthesia_carpule",
		]),
		toothNumberFdi: z.number().int().min(11).max(85).optional().nullable(),
		carpulesCount: z.number().int().positive().default(1),
		drugBrandName: z.string().default("Артикаин 1:100 000"),
		isNurseAction: z.boolean().default(true),
		notes: z.string().optional().nullable(),
	})
	.strict();

export type SurgicalQuickDeductInput = z.infer<typeof surgicalQuickDeductSchema>;
