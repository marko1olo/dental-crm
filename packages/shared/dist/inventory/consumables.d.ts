import { z } from "zod";
/**
 * Maximum length for a consumable recipe link note.
 */
export declare const CONSUMABLE_NOTE_MAX_LENGTH = 200;
/**
 * Zod schema for creating a consumable link (Price list service <-> Inventory item BOM recipe).
 */
export declare const consumableLinkCreateSchema: z.ZodObject<{
    serviceId: z.ZodString;
    inventoryItemId: z.ZodString;
    quantity: z.ZodNumber;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    serviceId: string;
    inventoryItemId: string;
    note?: string | null | undefined;
}, {
    quantity: number;
    serviceId: string;
    inventoryItemId: string;
    note?: string | null | undefined;
}>;
export type ConsumableLinkCreate = z.infer<typeof consumableLinkCreateSchema>;
/**
 * Zod schema for updating a consumable recipe link.
 */
export declare const consumableLinkUpdateSchema: z.ZodObject<{
    quantity: z.ZodOptional<z.ZodNumber>;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    quantity?: number | undefined;
    note?: string | null | undefined;
}, {
    quantity?: number | undefined;
    note?: string | null | undefined;
}>;
export type ConsumableLinkUpdate = z.infer<typeof consumableLinkUpdateSchema>;
/**
 * Standard response schema for a consumable link.
 */
export declare const consumableLinkResponseSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    serviceId: z.ZodString;
    inventoryItemId: z.ZodString;
    quantity: z.ZodNumber;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    quantity: number;
    organizationId: string;
    createdAt: string | Date;
    serviceId: string;
    inventoryItemId: string;
    updatedAt?: string | Date | undefined;
    note?: string | null | undefined;
}, {
    id: string;
    quantity: number;
    organizationId: string;
    createdAt: string | Date;
    serviceId: string;
    inventoryItemId: string;
    updatedAt?: string | Date | undefined;
    note?: string | null | undefined;
}>;
export type ConsumableLinkResponse = z.infer<typeof consumableLinkResponseSchema>;
/**
 * Enriched consumable link with display names and stock metrics.
 */
export declare const consumableLinkDetailedSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    serviceId: z.ZodString;
    inventoryItemId: z.ZodString;
    quantity: z.ZodNumber;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
} & {
    serviceCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    serviceTitle: z.ZodString;
    serviceCategory: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    specialty: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemName: z.ZodString;
    itemCategory: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemUnit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    stockQuantity: z.ZodNumber;
    unitCostRub: z.ZodNumber;
    criticalThreshold: z.ZodNumber;
    totalCostRub: z.ZodNumber;
    isLowStock: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    quantity: number;
    organizationId: string;
    createdAt: string | Date;
    serviceId: string;
    inventoryItemId: string;
    serviceTitle: string;
    itemName: string;
    stockQuantity: number;
    unitCostRub: number;
    criticalThreshold: number;
    totalCostRub: number;
    updatedAt?: string | Date | undefined;
    note?: string | null | undefined;
    serviceCode?: string | null | undefined;
    serviceCategory?: string | null | undefined;
    specialty?: string | null | undefined;
    itemCategory?: string | null | undefined;
    itemUnit?: string | null | undefined;
    isLowStock?: boolean | undefined;
}, {
    id: string;
    quantity: number;
    organizationId: string;
    createdAt: string | Date;
    serviceId: string;
    inventoryItemId: string;
    serviceTitle: string;
    itemName: string;
    stockQuantity: number;
    unitCostRub: number;
    criticalThreshold: number;
    totalCostRub: number;
    updatedAt?: string | Date | undefined;
    note?: string | null | undefined;
    serviceCode?: string | null | undefined;
    serviceCategory?: string | null | undefined;
    specialty?: string | null | undefined;
    itemCategory?: string | null | undefined;
    itemUnit?: string | null | undefined;
    isLowStock?: boolean | undefined;
}>;
export type ConsumableLinkDetailed = z.infer<typeof consumableLinkDetailedSchema>;
/**
 * Picker options for linking services to inventory items.
 */
export declare const linkOptionsTreatmentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priceRub: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    code?: string | null | undefined;
    category?: string | null | undefined;
    priceRub?: number | undefined;
}, {
    id: string;
    name: string;
    code?: string | null | undefined;
    category?: string | null | undefined;
    priceRub?: number | undefined;
}>;
export type LinkOptionsTreatment = z.infer<typeof linkOptionsTreatmentSchema>;
export declare const linkOptionsItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    stockQuantity: z.ZodOptional<z.ZodNumber>;
    unitCostRub: z.ZodOptional<z.ZodNumber>;
    expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    category?: string | null | undefined;
    unit?: string | null | undefined;
    stockQuantity?: number | undefined;
    unitCostRub?: number | undefined;
    expirationDate?: string | null | undefined;
}, {
    id: string;
    name: string;
    category?: string | null | undefined;
    unit?: string | null | undefined;
    stockQuantity?: number | undefined;
    unitCostRub?: number | undefined;
    expirationDate?: string | null | undefined;
}>;
export type LinkOptionsItem = z.infer<typeof linkOptionsItemSchema>;
export declare const linkOptionsResponseSchema: z.ZodObject<{
    treatments: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        priceRub: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        code?: string | null | undefined;
        category?: string | null | undefined;
        priceRub?: number | undefined;
    }, {
        id: string;
        name: string;
        code?: string | null | undefined;
        category?: string | null | undefined;
        priceRub?: number | undefined;
    }>, "many">;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        stockQuantity: z.ZodOptional<z.ZodNumber>;
        unitCostRub: z.ZodOptional<z.ZodNumber>;
        expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        category?: string | null | undefined;
        unit?: string | null | undefined;
        stockQuantity?: number | undefined;
        unitCostRub?: number | undefined;
        expirationDate?: string | null | undefined;
    }, {
        id: string;
        name: string;
        category?: string | null | undefined;
        unit?: string | null | undefined;
        stockQuantity?: number | undefined;
        unitCostRub?: number | undefined;
        expirationDate?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        name: string;
        category?: string | null | undefined;
        unit?: string | null | undefined;
        stockQuantity?: number | undefined;
        unitCostRub?: number | undefined;
        expirationDate?: string | null | undefined;
    }[];
    treatments: {
        id: string;
        name: string;
        code?: string | null | undefined;
        category?: string | null | undefined;
        priceRub?: number | undefined;
    }[];
}, {
    items: {
        id: string;
        name: string;
        category?: string | null | undefined;
        unit?: string | null | undefined;
        stockQuantity?: number | undefined;
        unitCostRub?: number | undefined;
        expirationDate?: string | null | undefined;
    }[];
    treatments: {
        id: string;
        name: string;
        code?: string | null | undefined;
        category?: string | null | undefined;
        priceRub?: number | undefined;
    }[];
}>;
export type LinkOptionsResponse = z.infer<typeof linkOptionsResponseSchema>;
/**
 * Stock deduction records and result contracts.
 */
export declare const stockDeductionRecordSchema: z.ZodObject<{
    inventoryItemId: z.ZodString;
    inventoryItemName: z.ZodString;
    quantityChanged: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    unitCostRub: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    lotNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    remainingStock: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    inventoryItemId: string;
    inventoryItemName: string;
    quantityChanged: string | number;
    unitCostRub?: string | number | null | undefined;
    lotNumber?: string | null | undefined;
    remainingStock?: number | undefined;
}, {
    inventoryItemId: string;
    inventoryItemName: string;
    quantityChanged: string | number;
    unitCostRub?: string | number | null | undefined;
    lotNumber?: string | null | undefined;
    remainingStock?: number | undefined;
}>;
export type StockDeductionRecord = z.infer<typeof stockDeductionRecordSchema>;
export declare const stockDeductionWarningSchema: z.ZodObject<{
    type: z.ZodEnum<["low_stock", "out_of_stock", "expired", "expiring_soon"]>;
    itemId: z.ZodString;
    itemName: z.ZodString;
    message: z.ZodString;
    currentStock: z.ZodOptional<z.ZodNumber>;
    criticalThreshold: z.ZodOptional<z.ZodNumber>;
    expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "expired" | "expiring_soon" | "low_stock" | "out_of_stock";
    itemName: string;
    itemId: string;
    criticalThreshold?: number | undefined;
    expirationDate?: string | null | undefined;
    currentStock?: number | undefined;
}, {
    message: string;
    type: "expired" | "expiring_soon" | "low_stock" | "out_of_stock";
    itemName: string;
    itemId: string;
    criticalThreshold?: number | undefined;
    expirationDate?: string | null | undefined;
    currentStock?: number | undefined;
}>;
export type StockDeductionWarning = z.infer<typeof stockDeductionWarningSchema>;
export declare const stockDeductionResultSchema: z.ZodObject<{
    completedTreatmentItems: z.ZodNumber;
    deductions: z.ZodArray<z.ZodObject<{
        inventoryItemId: z.ZodString;
        inventoryItemName: z.ZodString;
        quantityChanged: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        unitCostRub: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
        lotNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        remainingStock: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        inventoryItemId: string;
        inventoryItemName: string;
        quantityChanged: string | number;
        unitCostRub?: string | number | null | undefined;
        lotNumber?: string | null | undefined;
        remainingStock?: number | undefined;
    }, {
        inventoryItemId: string;
        inventoryItemName: string;
        quantityChanged: string | number;
        unitCostRub?: string | number | null | undefined;
        lotNumber?: string | null | undefined;
        remainingStock?: number | undefined;
    }>, "many">;
    warnings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["low_stock", "out_of_stock", "expired", "expiring_soon"]>;
        itemId: z.ZodString;
        itemName: z.ZodString;
        message: z.ZodString;
        currentStock: z.ZodOptional<z.ZodNumber>;
        criticalThreshold: z.ZodOptional<z.ZodNumber>;
        expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        type: "expired" | "expiring_soon" | "low_stock" | "out_of_stock";
        itemName: string;
        itemId: string;
        criticalThreshold?: number | undefined;
        expirationDate?: string | null | undefined;
        currentStock?: number | undefined;
    }, {
        message: string;
        type: "expired" | "expiring_soon" | "low_stock" | "out_of_stock";
        itemName: string;
        itemId: string;
        criticalThreshold?: number | undefined;
        expirationDate?: string | null | undefined;
        currentStock?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    completedTreatmentItems: number;
    deductions: {
        inventoryItemId: string;
        inventoryItemName: string;
        quantityChanged: string | number;
        unitCostRub?: string | number | null | undefined;
        lotNumber?: string | null | undefined;
        remainingStock?: number | undefined;
    }[];
    warnings?: {
        message: string;
        type: "expired" | "expiring_soon" | "low_stock" | "out_of_stock";
        itemName: string;
        itemId: string;
        criticalThreshold?: number | undefined;
        expirationDate?: string | null | undefined;
        currentStock?: number | undefined;
    }[] | undefined;
}, {
    completedTreatmentItems: number;
    deductions: {
        inventoryItemId: string;
        inventoryItemName: string;
        quantityChanged: string | number;
        unitCostRub?: string | number | null | undefined;
        lotNumber?: string | null | undefined;
        remainingStock?: number | undefined;
    }[];
    warnings?: {
        message: string;
        type: "expired" | "expiring_soon" | "low_stock" | "out_of_stock";
        itemName: string;
        itemId: string;
        criticalThreshold?: number | undefined;
        expirationDate?: string | null | undefined;
        currentStock?: number | undefined;
    }[] | undefined;
}>;
export type StockDeductionResult = z.infer<typeof stockDeductionResultSchema>;
/**
 * Batch stock deduction request for visits or tooth procedures.
 */
export declare const visitStockDeductionRequestSchema: z.ZodObject<{
    visitId: z.ZodString;
    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    transactionType: z.ZodOptional<z.ZodDefault<z.ZodEnum<["auto_deduct", "manual_writeoff"]>>>;
}, "strip", z.ZodTypeAny, {
    visitId: string;
    userId?: string | null | undefined;
    transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
}, {
    visitId: string;
    userId?: string | null | undefined;
    transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
}>;
export type VisitStockDeductionRequest = z.infer<typeof visitStockDeductionRequestSchema>;
export declare const toothTreatmentStockDeductionRequestSchema: z.ZodObject<{
    treatmentItemId: z.ZodString;
    serviceId: z.ZodString;
    toothNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    quantity: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    visitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    transactionType: z.ZodOptional<z.ZodDefault<z.ZodEnum<["auto_deduct", "manual_writeoff"]>>>;
}, "strip", z.ZodTypeAny, {
    serviceId: string;
    treatmentItemId: string;
    quantity?: number | undefined;
    visitId?: string | null | undefined;
    toothNumber?: number | null | undefined;
    userId?: string | null | undefined;
    transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
}, {
    serviceId: string;
    treatmentItemId: string;
    quantity?: number | undefined;
    visitId?: string | null | undefined;
    toothNumber?: number | null | undefined;
    userId?: string | null | undefined;
    transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
}>;
export type ToothTreatmentStockDeductionRequest = z.infer<typeof toothTreatmentStockDeductionRequestSchema>;
/**
 * Inventory stock availability check schemas.
 */
export declare const stockAvailabilityItemRequestSchema: z.ZodObject<{
    serviceId: z.ZodString;
    quantity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    serviceId: string;
}, {
    serviceId: string;
    quantity?: number | undefined;
}>;
export declare const stockAvailabilityCheckRequestSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        serviceId: z.ZodString;
        quantity: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        serviceId: string;
    }, {
        serviceId: string;
        quantity?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        quantity: number;
        serviceId: string;
    }[];
}, {
    items: {
        serviceId: string;
        quantity?: number | undefined;
    }[];
}>;
export type StockAvailabilityCheckRequest = z.infer<typeof stockAvailabilityCheckRequestSchema>;
export declare const requiredMaterialItemSchema: z.ZodObject<{
    inventoryItemId: z.ZodString;
    itemName: z.ZodString;
    requiredQty: z.ZodDefault<z.ZodNumber>;
    availableQty: z.ZodDefault<z.ZodNumber>;
    isSufficient: z.ZodBoolean;
    deficit: z.ZodDefault<z.ZodNumber>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    unitCostRub: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    inventoryItemId: string;
    itemName: string;
    requiredQty: number;
    availableQty: number;
    isSufficient: boolean;
    deficit: number;
    unit?: string | null | undefined;
    unitCostRub?: number | undefined;
}, {
    inventoryItemId: string;
    itemName: string;
    isSufficient: boolean;
    unit?: string | null | undefined;
    unitCostRub?: number | undefined;
    requiredQty?: number | undefined;
    availableQty?: number | undefined;
    deficit?: number | undefined;
}>;
export type RequiredMaterialItem = z.infer<typeof requiredMaterialItemSchema>;
export declare const stockAvailabilityCheckResponseSchema: z.ZodObject<{
    sufficient: z.ZodBoolean;
    requiredMaterials: z.ZodArray<z.ZodObject<{
        inventoryItemId: z.ZodString;
        itemName: z.ZodString;
        requiredQty: z.ZodDefault<z.ZodNumber>;
        availableQty: z.ZodDefault<z.ZodNumber>;
        isSufficient: z.ZodBoolean;
        deficit: z.ZodDefault<z.ZodNumber>;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unitCostRub: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        inventoryItemId: string;
        itemName: string;
        requiredQty: number;
        availableQty: number;
        isSufficient: boolean;
        deficit: number;
        unit?: string | null | undefined;
        unitCostRub?: number | undefined;
    }, {
        inventoryItemId: string;
        itemName: string;
        isSufficient: boolean;
        unit?: string | null | undefined;
        unitCostRub?: number | undefined;
        requiredQty?: number | undefined;
        availableQty?: number | undefined;
        deficit?: number | undefined;
    }>, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    warnings: string[];
    sufficient: boolean;
    requiredMaterials: {
        inventoryItemId: string;
        itemName: string;
        requiredQty: number;
        availableQty: number;
        isSufficient: boolean;
        deficit: number;
        unit?: string | null | undefined;
        unitCostRub?: number | undefined;
    }[];
}, {
    warnings: string[];
    sufficient: boolean;
    requiredMaterials: {
        inventoryItemId: string;
        itemName: string;
        isSufficient: boolean;
        unit?: string | null | undefined;
        unitCostRub?: number | undefined;
        requiredQty?: number | undefined;
        availableQty?: number | undefined;
        deficit?: number | undefined;
    }[];
}>;
export type StockAvailabilityCheckResponse = z.infer<typeof stockAvailabilityCheckResponseSchema>;
/**
 * Inventory alerts (Low stock & Expiration).
 */
export declare const inventoryAlertItemSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    category: z.ZodString;
    unit: z.ZodString;
    stockQuantity: z.ZodNumber;
    criticalThreshold: z.ZodNumber;
    unitCostRub: z.ZodNumber;
    sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lotNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    daysUntilExpiration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    category: string;
    unit: string;
    stockQuantity: number;
    unitCostRub: number;
    criticalThreshold: number;
    barcode?: string | null | undefined;
    expirationDate?: string | null | undefined;
    lotNumber?: string | null | undefined;
    sku?: string | null | undefined;
    daysUntilExpiration?: number | null | undefined;
}, {
    id: string;
    name: string;
    category: string;
    unit: string;
    stockQuantity: number;
    unitCostRub: number;
    criticalThreshold: number;
    barcode?: string | null | undefined;
    expirationDate?: string | null | undefined;
    lotNumber?: string | null | undefined;
    sku?: string | null | undefined;
    daysUntilExpiration?: number | null | undefined;
}>;
export type InventoryAlertItem = z.infer<typeof inventoryAlertItemSchema>;
export declare const inventoryAlertSummarySchema: z.ZodObject<{
    totalItems: z.ZodNumber;
    totalValuationRub: z.ZodNumber;
    lowStockCount: z.ZodNumber;
    outOfStockCount: z.ZodNumber;
    expiredCount: z.ZodNumber;
    expiringSoonCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalItems: number;
    totalValuationRub: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    expiringSoonCount: number;
}, {
    totalItems: number;
    totalValuationRub: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    expiringSoonCount: number;
}>;
export type InventoryAlertSummary = z.infer<typeof inventoryAlertSummarySchema>;
export declare const inventoryAlertsResponseSchema: z.ZodObject<{
    summary: z.ZodObject<{
        totalItems: z.ZodNumber;
        totalValuationRub: z.ZodNumber;
        lowStockCount: z.ZodNumber;
        outOfStockCount: z.ZodNumber;
        expiredCount: z.ZodNumber;
        expiringSoonCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalItems: number;
        totalValuationRub: number;
        lowStockCount: number;
        outOfStockCount: number;
        expiredCount: number;
        expiringSoonCount: number;
    }, {
        totalItems: number;
        totalValuationRub: number;
        lowStockCount: number;
        outOfStockCount: number;
        expiredCount: number;
        expiringSoonCount: number;
    }>;
    lowStockItems: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
        unit: z.ZodString;
        stockQuantity: z.ZodNumber;
        criticalThreshold: z.ZodNumber;
        unitCostRub: z.ZodNumber;
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lotNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        daysUntilExpiration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }>, "many">;
    outOfStockItems: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
        unit: z.ZodString;
        stockQuantity: z.ZodNumber;
        criticalThreshold: z.ZodNumber;
        unitCostRub: z.ZodNumber;
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lotNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        daysUntilExpiration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }>, "many">;
    expiredItems: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
        unit: z.ZodString;
        stockQuantity: z.ZodNumber;
        criticalThreshold: z.ZodNumber;
        unitCostRub: z.ZodNumber;
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lotNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        daysUntilExpiration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }>, "many">;
    expiringSoonItems: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
        unit: z.ZodString;
        stockQuantity: z.ZodNumber;
        criticalThreshold: z.ZodNumber;
        unitCostRub: z.ZodNumber;
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lotNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expirationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        daysUntilExpiration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }, {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    summary: {
        totalItems: number;
        totalValuationRub: number;
        lowStockCount: number;
        outOfStockCount: number;
        expiredCount: number;
        expiringSoonCount: number;
    };
    lowStockItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
    outOfStockItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
    expiredItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
    expiringSoonItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
}, {
    summary: {
        totalItems: number;
        totalValuationRub: number;
        lowStockCount: number;
        outOfStockCount: number;
        expiredCount: number;
        expiringSoonCount: number;
    };
    lowStockItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
    outOfStockItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
    expiredItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
    expiringSoonItems: {
        id: string;
        name: string;
        category: string;
        unit: string;
        stockQuantity: number;
        unitCostRub: number;
        criticalThreshold: number;
        barcode?: string | null | undefined;
        expirationDate?: string | null | undefined;
        lotNumber?: string | null | undefined;
        sku?: string | null | undefined;
        daysUntilExpiration?: number | null | undefined;
    }[];
}>;
export type InventoryAlertsResponse = z.infer<typeof inventoryAlertsResponseSchema>;
/**
 * Helper: validate that a deduction quantity is finite and strictly positive.
 */
export declare function isDeductibleQuantity(value: number): boolean;
/**
 * Helper: calculate estimated cost of recipe materials.
 */
export declare function calculateRecipeEstimatedCost(materials: Array<{
    quantity: number;
    unitCostRub?: number | null;
}>): number;
/**
 * Helper: categorize item expiration status based on expiration date.
 */
export declare function categorizeInventoryExpiry(expirationDate: string | null | undefined, referenceDate?: Date): {
    status: "valid" | "expiring_soon" | "expired" | "no_date";
    daysRemaining: number | null;
};
