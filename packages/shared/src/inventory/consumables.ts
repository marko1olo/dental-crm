import { z } from "zod";

/**
 * Maximum length for a consumable recipe link note.
 */
export const CONSUMABLE_NOTE_MAX_LENGTH = 200;

/**
 * Zod schema for creating a consumable link (Price list service <-> Inventory item BOM recipe).
 */
export const consumableLinkCreateSchema = z.object({
	serviceId: z
		.string({
			required_error: "Необходимо указать услугу из прейскуранта",
			invalid_type_error: "Необходимо указать услугу из прейскуранта",
		})
		.min(1, { message: "Необходимо указать услугу из прейскуранта" }),
	inventoryItemId: z
		.string({
			required_error: "Необходимо указать расходный материал со склада",
			invalid_type_error: "Необходимо указать расходный материал со склада",
		})
		.min(1, { message: "Необходимо указать расходный материал со склада" }),
	quantity: z
		.number({
			required_error: "Укажите количество материала на процедуру",
			invalid_type_error: "Количество материала должно быть числом",
		})
		.finite({ message: "Количество должно быть конечным числом" })
		.positive({ message: "Количество должно быть больше 0" })
		.max(9999, { message: "Количество не может превышать 9999" }),
	note: z
		.string()
		.max(CONSUMABLE_NOTE_MAX_LENGTH, {
			message: `Примечание не может превышать ${CONSUMABLE_NOTE_MAX_LENGTH} символов`,
		})
		.nullable()
		.optional(),
});

export type ConsumableLinkCreate = z.infer<typeof consumableLinkCreateSchema>;

/**
 * Zod schema for updating a consumable recipe link.
 */
export const consumableLinkUpdateSchema = z.object({
	quantity: z
		.number({
			invalid_type_error: "Количество материала должно быть числом",
		})
		.finite({ message: "Количество должно быть конечным числом" })
		.positive({ message: "Количество должно быть больше 0" })
		.max(9999, { message: "Количество не может превышать 9999" })
		.optional(),
	note: z
		.string()
		.max(CONSUMABLE_NOTE_MAX_LENGTH, {
			message: `Примечание не может превышать ${CONSUMABLE_NOTE_MAX_LENGTH} символов`,
		})
		.nullable()
		.optional(),
});

export type ConsumableLinkUpdate = z.infer<typeof consumableLinkUpdateSchema>;

/**
 * Standard response schema for a consumable link.
 */
export const consumableLinkResponseSchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	serviceId: z.string(),
	inventoryItemId: z.string(),
	quantity: z.number(),
	note: z.string().nullable().optional(),
	createdAt: z.string().or(z.date()),
	updatedAt: z.string().or(z.date()).optional(),
});

export type ConsumableLinkResponse = z.infer<typeof consumableLinkResponseSchema>;

/**
 * Enriched consumable link with display names and stock metrics.
 */
export const consumableLinkDetailedSchema = consumableLinkResponseSchema.extend({
	serviceCode: z.string().nullable().optional(),
	serviceTitle: z.string(),
	serviceCategory: z.string().nullable().optional(),
	specialty: z.string().nullable().optional(),
	itemName: z.string(),
	itemCategory: z.string().nullable().optional(),
	itemUnit: z.string().nullable().optional(),
	stockQuantity: z.number(),
	unitCostRub: z.number(),
	criticalThreshold: z.number(),
	totalCostRub: z.number(),
	isLowStock: z.boolean().optional(),
});

export type ConsumableLinkDetailed = z.infer<typeof consumableLinkDetailedSchema>;

/**
 * Picker options for linking services to inventory items.
 */
export const linkOptionsTreatmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	code: z.string().nullable().optional(),
	category: z.string().nullable().optional(),
	priceRub: z.number().optional(),
});

export type LinkOptionsTreatment = z.infer<typeof linkOptionsTreatmentSchema>;

export const linkOptionsItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	unit: z.string().nullable().optional(),
	category: z.string().nullable().optional(),
	stockQuantity: z.number().optional(),
	unitCostRub: z.number().optional(),
	expirationDate: z.string().nullable().optional(),
});

export type LinkOptionsItem = z.infer<typeof linkOptionsItemSchema>;

export const linkOptionsResponseSchema = z.object({
	treatments: z.array(linkOptionsTreatmentSchema),
	items: z.array(linkOptionsItemSchema),
});

export type LinkOptionsResponse = z.infer<typeof linkOptionsResponseSchema>;

/**
 * Stock deduction records and result contracts.
 */
export const stockDeductionRecordSchema = z.object({
	inventoryItemId: z.string(),
	inventoryItemName: z.string(),
	quantityChanged: z.string().or(z.number()),
	unitCostRub: z.string().or(z.number()).nullable().optional(),
	lotNumber: z.string().nullable().optional(),
	remainingStock: z.number().optional(),
});

export type StockDeductionRecord = z.infer<typeof stockDeductionRecordSchema>;

export const stockDeductionWarningSchema = z.object({
	type: z.enum(["low_stock", "out_of_stock", "expired", "expiring_soon"]),
	itemId: z.string(),
	itemName: z.string(),
	message: z.string(),
	currentStock: z.number().optional(),
	criticalThreshold: z.number().optional(),
	expirationDate: z.string().nullable().optional(),
});

export type StockDeductionWarning = z.infer<typeof stockDeductionWarningSchema>;

export const stockDeductionResultSchema = z.object({
	completedTreatmentItems: z.number(),
	deductions: z.array(stockDeductionRecordSchema),
	warnings: z.array(stockDeductionWarningSchema).optional(),
});

export type StockDeductionResult = z.infer<typeof stockDeductionResultSchema>;

/**
 * Batch stock deduction request for visits or tooth procedures.
 */
export const visitStockDeductionRequestSchema = z.object({
	visitId: z.string().min(1, { message: "Укажите ID приёма" }),
	userId: z.string().nullable().optional(),
	transactionType: z
		.enum(["auto_deduct", "manual_writeoff"])
		.default("auto_deduct")
		.optional(),
});

export type VisitStockDeductionRequest = z.infer<
	typeof visitStockDeductionRequestSchema
>;

export const toothTreatmentStockDeductionRequestSchema = z.object({
	treatmentItemId: z.string().min(1, { message: "Укажите ID позиции лечения" }),
	serviceId: z.string().min(1, { message: "Укажите ID услуги" }),
	toothNumber: z.number().int().min(11).max(85).nullable().optional(),
	quantity: z.number().positive().default(1).optional(),
	visitId: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	transactionType: z
		.enum(["auto_deduct", "manual_writeoff"])
		.default("auto_deduct")
		.optional(),
});

export type ToothTreatmentStockDeductionRequest = z.infer<
	typeof toothTreatmentStockDeductionRequestSchema
>;

/**
 * Inventory stock availability check schemas.
 */
export const stockAvailabilityItemRequestSchema = z.object({
	serviceId: z.string().min(1),
	quantity: z.number().positive().default(1),
});

export const stockAvailabilityCheckRequestSchema = z.object({
	items: z.array(stockAvailabilityItemRequestSchema).min(1),
});

export type StockAvailabilityCheckRequest = z.infer<
	typeof stockAvailabilityCheckRequestSchema
>;

export const requiredMaterialItemSchema = z.object({
	inventoryItemId: z.string(),
	itemName: z.string(),
	requiredQty: numberOrZero(),
	availableQty: numberOrZero(),
	isSufficient: z.boolean(),
	deficit: numberOrZero(),
	unit: z.string().nullable().optional(),
	unitCostRub: numberOrZero().optional(),
});

export type RequiredMaterialItem = z.infer<typeof requiredMaterialItemSchema>;

export const stockAvailabilityCheckResponseSchema = z.object({
	sufficient: z.boolean(),
	requiredMaterials: z.array(requiredMaterialItemSchema),
	warnings: z.array(z.string()),
});

export type StockAvailabilityCheckResponse = z.infer<
	typeof stockAvailabilityCheckResponseSchema
>;

/**
 * Inventory alerts (Low stock & Expiration).
 */
export const inventoryAlertItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	category: z.string(),
	unit: z.string(),
	stockQuantity: z.number(),
	criticalThreshold: z.number(),
	unitCostRub: z.number(),
	sku: z.string().nullable().optional(),
	barcode: z.string().nullable().optional(),
	lotNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
	daysUntilExpiration: z.number().nullable().optional(),
});

export type InventoryAlertItem = z.infer<typeof inventoryAlertItemSchema>;

export const inventoryAlertSummarySchema = z.object({
	totalItems: z.number(),
	totalValuationRub: z.number(),
	lowStockCount: z.number(),
	outOfStockCount: z.number(),
	expiredCount: z.number(),
	expiringSoonCount: z.number(),
});

export type InventoryAlertSummary = z.infer<typeof inventoryAlertSummarySchema>;

export const inventoryAlertsResponseSchema = z.object({
	summary: inventoryAlertSummarySchema,
	lowStockItems: z.array(inventoryAlertItemSchema),
	outOfStockItems: z.array(inventoryAlertItemSchema),
	expiredItems: z.array(inventoryAlertItemSchema),
	expiringSoonItems: z.array(inventoryAlertItemSchema),
});

export type InventoryAlertsResponse = z.infer<
	typeof inventoryAlertsResponseSchema
>;

function numberOrZero() {
	return z.number().default(0);
}

/**
 * Helper: validate that a deduction quantity is finite and strictly positive.
 */
export function isDeductibleQuantity(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

/**
 * Helper: calculate estimated cost of recipe materials.
 */
export function calculateRecipeEstimatedCost(
	materials: Array<{ quantity: number; unitCostRub?: number | null }>,
): number {
	let total = 0;
	for (const mat of materials) {
		const qty = Number(mat.quantity);
		const cost = Number(mat.unitCostRub ?? 0);
		if (Number.isFinite(qty) && qty > 0 && Number.isFinite(cost) && cost > 0) {
			total += qty * cost;
		}
	}
	return Number(total.toFixed(2));
}

/**
 * Helper: categorize item expiration status based on expiration date.
 */
export function categorizeInventoryExpiry(
	expirationDate: string | null | undefined,
	referenceDate: Date = new Date(),
): {
	status: "valid" | "expiring_soon" | "expired" | "no_date";
	daysRemaining: number | null;
} {
	if (!expirationDate || !expirationDate.trim()) {
		return { status: "no_date", daysRemaining: null };
	}

	const dateStr = expirationDate.trim().slice(0, 10);
	const expTime = new Date(`${dateStr}T00:00:00Z`).getTime();
	if (Number.isNaN(expTime)) {
		return { status: "no_date", daysRemaining: null };
	}

	const todayStr = referenceDate.toISOString().slice(0, 10);
	const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();

	const diffDays = Math.round((expTime - todayTime) / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return { status: "expired", daysRemaining: diffDays };
	}
	if (diffDays <= 30) {
		return { status: "expiring_soon", daysRemaining: diffDays };
	}
	return { status: "valid", daysRemaining: diffDays };
}

/**
 * Material item classification descriptor for lot/batch and serial number tracking.
 */
export interface InventoryTrackingClassificationItem {
	id?: string | undefined;
	sku?: string | undefined;
	nameRu?: string | undefined;
	category?: string | undefined;
}

/**
 * Determines whether strict lot/batch tracking is required by clinical regulations.
 *
 * MANDATE (Wave 11):
 * General consumables (composites, adhesives, etching gels, cotton rolls, gloves, masks,
 * saliva ejectors, polishing discs, paper points, gutta percha, etc.) are deducted via
 * direct transparent FIFO WITHOUT requiring manual syringe scanning or blocking prompts.
 *
 * Strict lot/batch tracking remains MANDATORY ONLY for:
 * 1. Anesthesia (carpules: Articaine / Ultracain / Septanest / Scandonest / Ubistesin)
 * 2. Implants (titanium dental implants, healing abutments, cover screws)
 * 3. Bone graft & barrier membrane materials (Geistlich Bio-Oss, Bio-Gide, osteoplasty)
 */
export function isStrictLotTrackingRequired(
	item: InventoryTrackingClassificationItem,
): boolean {
	const cat = (item.category ?? "").trim().toLowerCase();
	const name = (item.nameRu ?? "").trim().toLowerCase();
	const sku = (item.sku ?? "").trim().toLowerCase();
	const id = (item.id ?? "").trim().toLowerCase();

	// 1. Anesthesia (Articaine carpules)
	if (
		cat === "anesthesia" ||
		cat === "анестезия" ||
		cat === "carpule" ||
		cat === "карпула" ||
		id.includes("articaine") ||
		id.includes("ultracain") ||
		id.includes("septanest") ||
		id.includes("scandonest") ||
		id.includes("ubistesin") ||
		name.includes("ультракаин") ||
		name.includes("артикаин") ||
		name.includes("септанест") ||
		name.includes("скандонест") ||
		name.includes("убистезин") ||
		name.includes("карпул")
	) {
		// Ignore needles and topical gels (general consumables)
		if (
			id.includes("needle") ||
			id.includes("gel") ||
			name.includes("игла") ||
			name.includes("аппликацион") ||
			name.includes("топикал")
		) {
			return false;
		}
		return true;
	}

	// 2. Implants & surgical components
	if (
		cat === "implant" ||
		cat === "имплантат" ||
		cat === "имплантация" ||
		id.includes("implant") ||
		id.includes("abutment") ||
		name.includes("имплантат") ||
		name.includes("формирователь десны") ||
		name.includes("заглушка винта")
	) {
		return true;
	}

	// 3. Bone graft & barrier membranes (Osteoplasty)
	if (
		id.includes("bio_oss") ||
		id.includes("bio_gide") ||
		name.includes("bio-oss") ||
		name.includes("bio-gide") ||
		name.includes("костнозамещающ") ||
		name.includes("костный графт") ||
		name.includes("барьерная мембрана") ||
		name.includes("остеопластик")
	) {
		return true;
	}

	// All other consumables (composites, gels, rolls, gloves, etc.) -> Direct FIFO
	return false;
}

/**
 * Determines whether Честный ЗНАК / MDLP serialized tracking (GS1 DataMatrix / UDI)
 * is required for this material.
 *
 * Applicable strictly to Anesthesia carpules, Titanium Implants, and Bone/Membrane Grafts.
 */
export function isChestnyZnakMdlpRequired(
	item: InventoryTrackingClassificationItem,
): boolean {
	const cat = (item.category ?? "").trim().toLowerCase();
	const name = (item.nameRu ?? "").trim().toLowerCase();
	const id = (item.id ?? "").trim().toLowerCase();

	// 1. Titanium Implants (UDI Serial Number)
	if (
		cat === "implant" ||
		id.includes("implant") ||
		name.includes("имплантат")
	) {
		return true;
	}

	// 2. Bone graft & collagen membranes (Bio-Oss / Bio-Gide)
	if (
		id.includes("bio_oss") ||
		id.includes("bio_gide") ||
		name.includes("bio-oss") ||
		name.includes("bio-gide") ||
		name.includes("костнозамещающ")
	) {
		return true;
	}

	// 3. Anesthesia carpules with MDLP DataMatrix tracking
	if (
		(cat === "anesthesia" ||
			name.includes("ультракаин") ||
			name.includes("артикаин")) &&
		!id.includes("needle") &&
		!id.includes("gel") &&
		!name.includes("игла") &&
		!name.includes("топикал")
	) {
		return true;
	}

	return false;
}

/**
 * Generic stock batch representation for FIFO deductions.
 */
export interface GenericStockBatch {
	batchId: string;
	quantityAvailable: number;
	expirationDate?: string | undefined;
	manufactureDate?: string | undefined;
	receiptDate?: string | undefined;
	unitCostKopecks?: number | undefined;
	lotNumber?: string | undefined;
}

/**
 * Result of a deterministic FIFO batch deduction.
 */
export interface FifoBatchDeductionResult<T extends GenericStockBatch> {
	deductions: Array<{
		batch: T;
		deductedQuantity: number;
		costKopecks: number;
	}>;
	totalDeductedQuantity: number;
	remainingQuantityNeeded: number;
	fullyCovered: boolean;
	totalCostKopecks: number;
}

/**
 * Deterministic FIFO (First-In, First-Out) stock deduction engine.
 *
 * Sorts available batches by receipt date, manufacture date, or expiration date
 * and deducts required quantities without requiring manual serial scanning.
 */
export function deductBatchStockFifo<T extends GenericStockBatch>(
	batches: readonly T[],
	requiredQuantity: number,
): FifoBatchDeductionResult<T> {
	if (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0) {
		return {
			deductions: [],
			totalDeductedQuantity: 0,
			remainingQuantityNeeded: 0,
			fullyCovered: true,
			totalCostKopecks: 0,
		};
	}

	// Sort batches chronologically (earliest receipt / manufacture / expiration first)
	const sortedBatches = [...batches].filter((b) => b.quantityAvailable > 0).sort((a, b) => {
		const dateA = a.receiptDate || a.manufactureDate || a.expirationDate || "9999-99-99";
		const dateB = b.receiptDate || b.manufactureDate || b.expirationDate || "9999-99-99";
		return dateA.localeCompare(dateB);
	});

	const deductions: Array<{
		batch: T;
		deductedQuantity: number;
		costKopecks: number;
	}> = [];

	let remaining = requiredQuantity;
	let totalCostKopecks = 0;

	for (const batch of sortedBatches) {
		if (remaining <= 0) break;

		const toDeduct = Math.min(batch.quantityAvailable, remaining);
		const unitCost = batch.unitCostKopecks ?? 0;
		const lineCost = Math.round(unitCost * toDeduct);

		deductions.push({
			batch,
			deductedQuantity: Number(toDeduct.toFixed(4)),
			costKopecks: lineCost,
		});

		totalCostKopecks += lineCost;
		remaining -= toDeduct;
	}

	const totalDeducted = Number((requiredQuantity - Math.max(0, remaining)).toFixed(4));
	const remainingNeeded = Number(Math.max(0, remaining).toFixed(4));

	return {
		deductions,
		totalDeductedQuantity: totalDeducted,
		remainingQuantityNeeded: remainingNeeded,
		fullyCovered: remainingNeeded === 0,
		totalCostKopecks,
	};
}

