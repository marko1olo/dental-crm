/**
 * warehouseSchemas.ts — Layer 0: Zod validation schemas for warehouse stock operations.
 */

import { z } from "zod";

export const quickCarpuleDisposalSchema = z.object({
	drugName: z.string().min(1, "Название анестетика обязательно").default("Артикаин 4%"),
	carpulesCount: z.number().int().positive("Количество карпул должно быть > 0").default(1),
	nurseName: z.string().min(1).default("Дежурная медсестра"),
	doctorName: z.string().min(1).default("Лечащий врач"),
	anestheticItemId: z.string().optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	organizationId: z.string().optional(),
});

export const softOverdraftDeductSchema = z.object({
	itemId: z.string().optional(),
	inventoryItemId: z.string().optional(),
	name: z.string().optional(),
	itemName: z.string().optional(),
	quantity: z.number().positive("Количество должно быть больше нуля"),
	reason: z.string().optional(),
	visitId: z.string().nullable().optional(),
	organizationId: z.string().optional(),
});

export const warehouseDeductItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	itemId: z.string().optional(),
	id: z.string().optional(),
	name: z.string().optional(),
	itemName: z.string().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для списания",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество для списания должно быть больше 0" }),
	unitCostRub: z.union([z.number(), z.string()]).optional(),
	allowOverdraft: z.boolean().default(true).optional(),
	reason: z.string().optional(),
	notes: z.string().optional(),
});

export const warehouseDeductBatchBodySchema = z.union([
	z.array(warehouseDeductItemSchema),
	z.object({
		items: z.array(warehouseDeductItemSchema).optional(),
		materials: z.array(warehouseDeductItemSchema).optional(),
		organizationId: z.string().optional(),
		reason: z.string().optional(),
		notes: z.string().optional(),
		operationTitle: z.string().optional(),
		hasWarehouseDelay: z.boolean().optional(),
		visitId: z.string().optional(),
		allowOverdraft: z.boolean().default(true).optional(),
	}),
	warehouseDeductItemSchema,
]);
