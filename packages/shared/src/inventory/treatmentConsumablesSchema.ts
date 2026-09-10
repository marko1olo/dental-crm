/**
 * treatmentConsumablesSchema.ts — Contracts & Zod Schemas for Procedure Consumable BOM & Auto-Deductions.
 *
 * Implements Mandate 8e (Doctor Autonomy):
 * - clamp_at_zero = true (Soft overdraft: zero-clamp in DB, logs shortage warning, NEVER blocks visit completion)
 * - Idempotency guaranteed via unique treatment_reference_id.
 * - Catalog item code (Order 804n / Clinic price list) <-> Inventory item mapping.
 */

import { z } from "zod";

export const TREATMENT_CONSUMABLE_NOTE_MAX_LENGTH = 500;

/**
 * Zod schema for creating a consumable mapping link (Service catalog code <-> Warehouse material).
 */
export const treatmentConsumableLinkCreateSchema = z.object({
	catalogItemCode: z
		.string({
			required_error: "Код услуги из прейскуранта/804н обязателен",
			invalid_type_error: "Код услуги должен быть строкой",
		})
		.min(1, "Код услуги не может быть пустым"),
	inventoryItemId: z
		.string({
			required_error: "ID расходного материала со склада обязателен",
			invalid_type_error: "ID расходного материала должен быть строкой",
		})
		.min(1, "ID расходного материала обязателен"),
	quantity: z
		.number({
			required_error: "Количество материала на услугу обязательно",
			invalid_type_error: "Количество должно быть числом",
		})
		.positive("Норма расхода должна быть больше 0")
		.max(99999, "Норма расхода не может превышать 99999"),
	note: z
		.string()
		.max(
			TREATMENT_CONSUMABLE_NOTE_MAX_LENGTH,
			`Примечание не должно превышать ${TREATMENT_CONSUMABLE_NOTE_MAX_LENGTH} символов`,
		)
		.nullable()
		.optional(),
});

export type TreatmentConsumableLinkCreate = z.infer<
	typeof treatmentConsumableLinkCreateSchema
>;

/**
 * Zod schema for updating an existing consumable mapping link.
 */
export const treatmentConsumableLinkUpdateSchema = z.object({
	quantity: z
		.number({
			invalid_type_error: "Количество должно быть числом",
		})
		.positive("Норма расхода должна быть больше 0")
		.max(99999, "Норма расхода не может превышать 99999")
		.optional(),
	note: z
		.string()
		.max(
			TREATMENT_CONSUMABLE_NOTE_MAX_LENGTH,
			`Примечание не должно превышать ${TREATMENT_CONSUMABLE_NOTE_MAX_LENGTH} символов`,
		)
		.nullable()
		.optional(),
});

export type TreatmentConsumableLinkUpdate = z.infer<
	typeof treatmentConsumableLinkUpdateSchema
>;

/**
 * Standard database representation for a consumable mapping link.
 */
export const treatmentConsumableLinkResponseSchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	catalogItemCode: z.string(),
	inventoryItemId: z.string(),
	quantity: z.number(),
	note: z.string().nullable().optional(),
	createdAt: z.string().or(z.date()),
	updatedAt: z.string().or(z.date()),
});

export type TreatmentConsumableLinkResponse = z.infer<
	typeof treatmentConsumableLinkResponseSchema
>;

/**
 * Detailed view of consumable mapping link joined with catalog and inventory names.
 */
export const treatmentConsumableLinkDetailedSchema = treatmentConsumableLinkResponseSchema.extend({
	serviceTitle: z.string().optional(),
	itemName: z.string().optional(),
	itemCategory: z.string().optional(),
	unit: z.string().optional(),
	currentStock: z.number().optional(),
	unitCostRub: z.number().optional(),
});

export type TreatmentConsumableLinkDetailed = z.infer<
	typeof treatmentConsumableLinkDetailedSchema
>;

/**
 * Query schema for listing consumable mapping links.
 */
export const listTreatmentConsumablesQuerySchema = z.object({
	catalogItemCode: z.string().optional(),
	inventoryItemId: z.string().optional(),
	search: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
});

export type ListTreatmentConsumablesQuery = z.infer<
	typeof listTreatmentConsumablesQuerySchema
>;

/**
 * Single item inside a procedure consumable deduction request.
 */
export const treatmentDeductionItemSchema = z.object({
	catalogItemCode: z.string().min(1, "Код услуги обязателен"),
	count: z.number().int().positive("Количество оказанных услуг должно быть > 0").default(1),
});

export type TreatmentDeductionItem = z.infer<
	typeof treatmentDeductionItemSchema
>;

/**
 * Request contract for procedure consumable deduction.
 * Mandate 8e: clamp_at_zero defaults to true (soft overdraft, doctor never blocked).
 * treatment_reference_id guarantees idempotency.
 */
export const treatmentConsumableDeductionRequestSchema = z.object({
	organizationId: z.string().optional(),
	treatment_reference_id: z
		.string({
			required_error: "treatment_reference_id обязателен для обеспечения идемпотентности",
		})
		.min(1, "treatment_reference_id не может быть пустым"),
	items: z
		.array(treatmentDeductionItemSchema)
		.min(1, "Список услуг для списания расходников не может быть пустым")
		.optional(),
	catalog_item_codes: z
		.array(z.string().min(1))
		.min(1)
		.optional(),
	visit_id: z.string().nullable().optional(),
	doctor_id: z.string().nullable().optional(),
	clamp_at_zero: z.boolean().default(true),
	notes: z.string().nullable().optional(),
});

export type TreatmentConsumableDeductionRequest = z.infer<
	typeof treatmentConsumableDeductionRequestSchema
>;

/**
 * Record of deduction for a specific inventory item.
 */
export const treatmentConsumableDeductionRecordSchema = z.object({
	inventoryItemId: z.string(),
	itemName: z.string(),
	quantityRequested: z.number(),
	quantityDeducted: z.number(),
	stockBefore: z.number(),
	stockAfter: z.number(),
	deficit: z.number(),
	isDeficit: z.boolean(),
	unit: z.string().default("шт"),
	unitCostRub: z.number().default(0),
});

export type TreatmentConsumableDeductionRecord = z.infer<
	typeof treatmentConsumableDeductionRecordSchema
>;

/**
 * Warning emitted during deduction (e.g. out of stock, deficit soft overdraft).
 */
export const treatmentConsumableDeductionWarningSchema = z.object({
	type: z.enum([
		"deficit",
		"out_of_stock",
		"zero_clamped",
		"low_stock",
		"already_processed",
	]),
	message: z.string(),
	inventoryItemId: z.string().optional(),
	itemName: z.string().optional(),
	deficit: z.number().optional(),
});

export type TreatmentConsumableDeductionWarning = z.infer<
	typeof treatmentConsumableDeductionWarningSchema
>;

/**
 * Response contract for procedure consumable deduction.
 */
export const treatmentConsumableDeductionResponseSchema = z.object({
	success: z.boolean(),
	treatmentReferenceId: z.string(),
	isOverdraft: z.boolean(),
	alreadyProcessed: z.boolean(),
	deductions: z.array(treatmentConsumableDeductionRecordSchema),
	warnings: z.array(treatmentConsumableDeductionWarningSchema),
});

export type TreatmentConsumableDeductionResponse = z.infer<
	typeof treatmentConsumableDeductionResponseSchema
>;
