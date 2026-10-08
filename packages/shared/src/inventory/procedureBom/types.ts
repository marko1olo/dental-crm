import { z } from "zod";

/**
 * Supported clinical procedure categories for technological maps.
 */
export const procedureCategorySchema = z.enum([
	"therapy",
	"endo",
	"surgery",
	"implant",
	"hygiene",
	"ortho",
	"perio",
	"whitening",
]);

export type ProcedureCategory = z.infer<typeof procedureCategorySchema>;

/**
 * Unit of measurement for medical and dental consumables (Unified SSOT).
 * Supports both standard international keys and statutory Russian warehouse labels.
 */
export const consumableUnitSchema = z.enum([
	// International units (804n technological maps)
	"pcs",       // штук
	"carpule",   // карпула (1.7 - 1.8 мл)
	"gram",      // грамм (композит)
	"ml",        // миллилитр (ирригация)
	"pack",      // упаковка / саше
	"tube",      // туба
	"dose",      // разовая доза
	"cm",        // сантиметр (лента, шовник)
	// Russian warehouse stock units
	"карпула",
	"шприц_гр",
	"ампула",
	"шт",
	"метр",
	"упак",
]);

export type ConsumableUnit = z.infer<typeof consumableUnitSchema>;

/**
 * Zod schema for a single material item within a standard Procedure BOM.
 */
export const procedureBomItemSchema = z.object({
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	category: z.string().min(1),
	standardQuantity: z.number().positive(),
	unitOfMeasure: consumableUnitSchema,
	estimatedUnitCostKopecks: z.number().int().nonnegative(),
	isOptional: z.boolean().default(false),
	description: z.string().optional(),
});

export type ProcedureBomItem = z.infer<typeof procedureBomItemSchema>;

/**
 * Zod schema for a complete Procedure BOM technological map.
 */
export const procedureBomMapSchema = z.object({
	code804n: z.string().min(1),
	procedureTitleRu: z.string().min(1),
	category: procedureCategorySchema,
	materials: z.array(procedureBomItemSchema),
	defaultDurationMinutes: z.number().int().positive().default(30),
});

export type ProcedureBomMap = z.infer<typeof procedureBomMapSchema>;

/**
 * Completed procedure input descriptor for calculating BOM deductions.
 */
export const completedProcedureInputSchema = z.object({
	procedureCode804n: z.string().min(1),
	procedureNameRu: z.string().optional(),
	quantity: z.number().int().positive().default(1),
	toothNumber: z.number().int().min(11).max(85).optional(),
	doctorId: z.string().optional(),
	cabinetId: z.string().optional(),
});

export type CompletedProcedureInput = z.infer<typeof completedProcedureInputSchema>;

/**
 * Cabinet stock item data contract for inventory checks.
 */
export const cabinetStockItemSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	cabinetId: z.string().min(1),
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	currentQuantity: z.number(),
	minThresholdQuantity: z.number().nonnegative().default(5),
	unitOfMeasure: consumableUnitSchema,
	costKopecks: z.number().int().nonnegative().default(0),
});

export type CabinetStockItem = z.infer<typeof cabinetStockItemSchema>;

/**
 * Resolved material requirement item aggregated across all procedures.
 */
export interface ResolvedMaterialRequirement {
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly totalQuantityRequired: number;
	readonly unitOfMeasure: ConsumableUnit;
	readonly totalEstimatedCostKopecks: number;
	readonly procedureBreakdown: readonly {
		readonly code804n: string;
		readonly procedureTitleRu: string;
		readonly quantity: number;
		readonly toothNumber?: number;
		readonly unitQuantity: number;
	}[];
	readonly isAvailableInStock: boolean;
	readonly currentStockQuantity: number;
	readonly shortfallQuantity: number;
}

/**
 * Complete summary of resolved materials for a treatment visit.
 */
export interface ResolvedMaterialRequirementSummary {
	readonly totalProceduresCount: number;
	readonly recognizedProceduresCount: number;
	readonly unrecognizedProceduresCount: number;
	readonly unrecognizedProcedureCodes: readonly string[];
	readonly totalEstimatedCostKopecks: number;
	readonly materials: readonly ResolvedMaterialRequirement[];
	readonly hasStockShortfall: boolean;
}

/**
 * Low stock warning alert item.
 */
export interface LowStockAlert {
	readonly sku: string;
	readonly nameRu: string;
	readonly cabinetId: string;
	readonly previousQuantity: number;
	readonly remainingQuantity: number;
	readonly minThresholdQuantity: number;
	readonly alertLevel: "warning_low_stock" | "critical_out_of_stock";
	readonly messageRu: string;
}

/**
 * Shortfall record when requested quantity exceeds available cabinet stock.
 */
export interface ShortfallItem {
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly requiredQuantity: number;
	readonly availableQuantity: number;
	readonly deficitQuantity: number;
	readonly unitOfMeasure: ConsumableUnit;
}

/**
 * Result of a stock deduction operation.
 */
export interface DeductionOperationResult {
	readonly success: boolean;
	readonly totalDeductionCostKopecks: number;
	readonly updatedStock: readonly CabinetStockItem[];
	readonly deductedItems: readonly {
		readonly sku: string;
		readonly nameRu: string;
		readonly deductedQuantity: number;
		readonly previousQuantity: number;
		readonly remainingQuantity: number;
		readonly unitOfMeasure: ConsumableUnit;
	}[];
	readonly lowStockAlerts: readonly LowStockAlert[];
	readonly hasShortfall: boolean;
	readonly shortfallItems?: readonly ShortfallItem[] | undefined;
	readonly preventedNegativeStock?: boolean | undefined;
	readonly purchaseOrder?: SupplierPurchaseOrder | null | undefined;
}

/**
 * Options configuring stock deduction behavior.
 */
export interface DeductMaterialsOptions {
	/**
	 * When true, prevents negative stock. If any requested material is insufficient,
	 * the deduction is not committed (stock copy remains untouched), success is false,
	 * and detailed shortfall records are returned.
	 */
	readonly preventNegativeStock?: boolean | undefined;
	/**
	 * Automatically generate a supplier purchase order if any item has a shortfall or breaches critical threshold.
	 */
	readonly autoGeneratePurchaseOrder?: boolean | undefined;
	readonly clinicNameRu?: string | undefined;
	readonly visitId?: string | undefined;
	readonly reorderBufferMultiplier?: number | undefined;
}

/**
 * Supplier purchase order item schema.
 */
export const supplierPurchaseOrderItemSchema = z.object({
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	category: z.string().min(1),
	unitOfMeasure: consumableUnitSchema,
	currentStock: z.number(),
	minThreshold: z.number().nonnegative(),
	shortfallQuantity: z.number().nonnegative(),
	suggestedOrderQuantity: z.number().positive(),
	estimatedUnitCostKopecks: z.number().int().nonnegative(),
	totalCostKopecks: z.number().int().nonnegative(),
	totalCostFormattedRu: z.string().min(1),
});

export type SupplierPurchaseOrderItem = z.infer<typeof supplierPurchaseOrderItemSchema>;

/**
 * Supplier purchase order schema.
 */
export const supplierPurchaseOrderSchema = z.object({
	id: z.string().min(1),
	orderNumber: z.string().min(1),
	orderDate: z.string().min(1),
	visitId: z.string().optional(),
	clinicNameRu: z.string().min(1),
	reason: z.enum(["critical_threshold_breach", "stock_deficit", "scheduled_restock"]),
	items: z.array(supplierPurchaseOrderItemSchema),
	totalItemsCount: z.number().int().positive(),
	totalOrderCostKopecks: z.number().int().nonnegative(),
	totalOrderCostFormattedRu: z.string().min(1),
	status: z.enum(["draft", "submitted", "approved"]),
});

export type SupplierPurchaseOrder = z.infer<typeof supplierPurchaseOrderSchema>;

/**
 * Parameters for high-level automated visit BOM deduction.
 */
export interface ExecuteVisitAutoBomDeductionParams {
	readonly visitId: string;
	readonly procedures: readonly CompletedProcedureInput[];
	readonly currentStock: readonly CabinetStockItem[];
	readonly options?: DeductMaterialsOptions | undefined;
}

/**
 * Result of the end-to-end automated visit material deduction.
 */
export interface VisitAutoBomDeductionSummary {
	readonly success: boolean;
	readonly visitId: string;
	readonly totalCostKopecks: number;
	readonly totalCostFormattedRu: string;
	readonly requirementsSummary: ResolvedMaterialRequirementSummary;
	readonly deductionResult: DeductionOperationResult;
	readonly purchaseOrder: SupplierPurchaseOrder | null;
	readonly hasShortfall: boolean;
	readonly preventedNegativeStock: boolean;
	readonly statusMessageRu: string;
}
