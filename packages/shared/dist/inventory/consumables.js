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
export const linkOptionsItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    unit: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    stockQuantity: z.number().optional(),
    unitCostRub: z.number().optional(),
    expirationDate: z.string().nullable().optional(),
});
export const linkOptionsResponseSchema = z.object({
    treatments: z.array(linkOptionsTreatmentSchema),
    items: z.array(linkOptionsItemSchema),
});
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
export const stockDeductionWarningSchema = z.object({
    type: z.enum(["low_stock", "out_of_stock", "expired", "expiring_soon"]),
    itemId: z.string(),
    itemName: z.string(),
    message: z.string(),
    currentStock: z.number().optional(),
    criticalThreshold: z.number().optional(),
    expirationDate: z.string().nullable().optional(),
});
export const stockDeductionResultSchema = z.object({
    completedTreatmentItems: z.number(),
    deductions: z.array(stockDeductionRecordSchema),
    warnings: z.array(stockDeductionWarningSchema).optional(),
});
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
export const stockAvailabilityCheckResponseSchema = z.object({
    sufficient: z.boolean(),
    requiredMaterials: z.array(requiredMaterialItemSchema),
    warnings: z.array(z.string()),
});
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
export const inventoryAlertSummarySchema = z.object({
    totalItems: z.number(),
    totalValuationRub: z.number(),
    lowStockCount: z.number(),
    outOfStockCount: z.number(),
    expiredCount: z.number(),
    expiringSoonCount: z.number(),
});
export const inventoryAlertsResponseSchema = z.object({
    summary: inventoryAlertSummarySchema,
    lowStockItems: z.array(inventoryAlertItemSchema),
    outOfStockItems: z.array(inventoryAlertItemSchema),
    expiredItems: z.array(inventoryAlertItemSchema),
    expiringSoonItems: z.array(inventoryAlertItemSchema),
});
function numberOrZero() {
    return z.number().default(0);
}
/**
 * Helper: validate that a deduction quantity is finite and strictly positive.
 */
export function isDeductibleQuantity(value) {
    return Number.isFinite(value) && value > 0;
}
/**
 * Helper: calculate estimated cost of recipe materials.
 */
export function calculateRecipeEstimatedCost(materials) {
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
export function categorizeInventoryExpiry(expirationDate, referenceDate = new Date()) {
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
