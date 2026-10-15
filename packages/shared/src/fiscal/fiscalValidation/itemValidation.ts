/**
 * Line item validation for 54-FZ FFD 1.2 fiscal receipts.
 * Layer 1: Item schemas, calculation verification, 425-FZ / Chestny ZNAK marking checks.
 */

import { z } from "zod";
import {
	ffd12AgentSignSchema,
	ffd12PaymentMethodSchema,
	ffd12PaymentSubjectSchema,
	ffd12QuantityMeasureSchema,
	ffd12VatRateSchema,
	taxDeductionCategorySchema,
} from "../ffd12Types.js";
import { parseChestnyZnakDataMatrix } from "../markingValidation.js";

/**
 * Single line item schema in a 54-FZ FFD 1.2 Fiscal Receipt.
 */
export const fiscalReceiptItemSchema = z
	.object({
		id: z.string().uuid().optional(),
		serviceId: z.string().uuid().optional().nullable(),
		catalogItemId: z.string().uuid().optional().nullable(),
		name: z.string().trim().min(1, "Наименование позиции обязательно").max(128, "Максимум 128 символов по ФФД 1.2 (Тег 1030)"),
		priceKopecks: z.number().int().min(0, "Цена в копейках должна быть неотрицательным числом"),
		quantity: z.number().positive("Количество должно быть больше нуля").default(1),
		discountKopecks: z.number().int().min(0).optional().nullable(),
		discountPercent: z.number().min(0).max(100).optional().nullable(),
		amountKopecks: z.number().int().min(0, "Сумма в копейках должна быть неотрицательным числом"),
		subject: ffd12PaymentSubjectSchema.default("service"),
		method: ffd12PaymentMethodSchema.default("full_payment"),
		vatRate: ffd12VatRateSchema.default("vat_none"),
		measure: ffd12QuantityMeasureSchema.default("piece"),
		taxDeductionCode: taxDeductionCategorySchema.default("code_1_standard"),
		agentSign: ffd12AgentSignSchema.optional().nullable(),
		medicalServiceCode804n: z.string().trim().max(32).optional().nullable(),
		medicalServiceCodeMzk: z.string().trim().max(32).optional().nullable(),
		toothFdiNumber: z.number().int().min(11).max(85).optional().nullable(),
		/** Честный ЗНАК / МДЛП DataMatrix marking barcode (Тег 1162 / Тег 1163 / Тег 2000) */
		markingCode: z.string().trim().max(200).optional().nullable(),
		/** Decree 659: Upsell Consent Shield attributes (Rules of 2026) */
		isUpsell: z.boolean().optional().default(false),
		requiresAddendum: z.boolean().optional().default(false),
		addendumId: z.string().uuid().optional().nullable(),
		addendumConfirmed: z.boolean().optional().default(false),
	})
	.superRefine((item, ctx) => {
		// Verify exact integer kopecks arithmetic: priceKopecks * quantity == amountKopecks (or with discount)
		const rawAmount = Math.round(item.priceKopecks * item.quantity);
		const discount =
			item.discountKopecks ??
			(item.discountPercent != null
				? Math.round((rawAmount * item.discountPercent) / 100)
				: 0);
		const expectedAmount = Math.max(0, rawAmount - discount);
		if (Math.abs(expectedAmount - item.amountKopecks) > 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Сумма позиции «${item.name}» (${item.amountKopecks} коп.) не соответствует расчёту цена × количество (${expectedAmount} коп.).`,
				path: ["amountKopecks"],
			});
		}

		// If marking code is provided, validate DataMatrix format
		if (item.markingCode && item.markingCode.trim().length > 0) {
			const parsed = parseChestnyZnakDataMatrix(item.markingCode);
			if (!parsed.isValid) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Некорректный код маркировки DataMatrix Честный ЗНАК: ${parsed.errorMessage || "ошибка формата"}`,
					path: ["markingCode"],
				});
			}
		}
	})
	.transform((item) => ({
		...item,
		medicalServiceCode804n: item.medicalServiceCode804n ?? item.medicalServiceCodeMzk ?? null,
	}));

export type FiscalReceiptItemInput = z.infer<typeof fiscalReceiptItemSchema>;
