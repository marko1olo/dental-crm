/**
 * Zod Schemas & Statutory Validation for 54-FZ FFD 1.2 Fiscal Receipts & Operations.
 * Compliant with Order of FTS Russia No. ED-7-20/662@ and Order of Minzdrav 804n.
 */

import { z } from "zod";
import {
	ffd12CorrectionTypeSchema,
	ffd12OperationTypeSchema,
	ffd12PaymentMethodSchema,
	ffd12PaymentSubjectSchema,
	ffd12QuantityMeasureSchema,
	ffd12TaxationSystemSchema,
	ffd12VatRateSchema,
	taxDeductionCategorySchema,
} from "./ffd12Types.js";
import { isValidGs1Checksum, parseChestnyZnakDataMatrix } from "./markingValidation.js";

/**
 * Single line item schema in a 54-FZ FFD 1.2 Fiscal Receipt.
 */
export const fiscalReceiptItemSchema = z
	.object({
		id: z.string().uuid().optional(),
		name: z.string().trim().min(1, "Наименование позиции обязательно").max(128, "Максимум 128 символов по ФФД 1.2 (Тег 1030)"),
		priceKopecks: z.number().int().positive("Цена в копейках должна быть положительным числом"),
		quantity: z.number().positive("Количество должно быть больше нуля").default(1),
		amountKopecks: z.number().int().positive("Сумма в копейках должна быть положительным числом"),
		subject: ffd12PaymentSubjectSchema.default("service"),
		method: ffd12PaymentMethodSchema.default("full_payment"),
		vatRate: ffd12VatRateSchema.default("vat_none"),
		measure: ffd12QuantityMeasureSchema.default("piece"),
		taxDeductionCode: taxDeductionCategorySchema.default("code_1_standard"),
		medicalServiceCode804n: z.string().trim().max(32).optional().nullable(),
		medicalServiceCodeMzk: z.string().trim().max(32).optional().nullable(),
		toothFdiNumber: z.number().int().min(11).max(85).optional().nullable(),
		/** Честный ЗНАК / МДЛП DataMatrix marking barcode (Тег 1162 / Тег 1163 / Тег 2000) */
		markingCode: z.string().trim().max(200).optional().nullable(),
	})
	.transform((item) => ({
		...item,
		medicalServiceCode804n: item.medicalServiceCode804n ?? item.medicalServiceCodeMzk ?? null,
	}))
	.superRefine((item, ctx) => {
		// Verify exact integer kopecks arithmetic: priceKopecks * quantity == amountKopecks
		const expectedAmount = Math.round(item.priceKopecks * item.quantity);
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
	});

export type FiscalReceiptItemInput = z.infer<typeof fiscalReceiptItemSchema>;

/**
 * Schema for creating and queueing an FFD 1.2 fiscal receipt.
 */
export const createFiscalReceiptPayloadSchema = z
	.object({
		clientMutationId: z.string().trim().min(1).max(128).optional().nullable(),
		invoiceId: z.string().uuid().optional().nullable(),
		visitId: z.string().uuid().optional().nullable(),
		documentId: z.string().uuid().optional().nullable(),
		patientId: z.string().uuid("Некорректный UUID пациента"),
		operationType: ffd12OperationTypeSchema.default("income"),
		taxationSystem: ffd12TaxationSystemSchema.default("usn_income"),
		customerContact: z
			.string()
			.trim()
			.min(5, "Укажите телефон или email для отправки чека")
			.max(100, "Контакт клиента не может превышать 100 символов"),
		cashierFullName: z
			.string()
			.trim()
			.min(1, "ФИО кассира обязательно")
			.max(120, "ФИО кассира не может превышать 120 символов")
			.default("Кассир-администратор"),
		cashierInn: z.string().trim().max(12).optional().nullable(),
		paymentAddress: z.string().trim().max(256).optional().nullable(),
		paymentPlace: z.string().trim().max(256).optional().nullable(),
		items: z.array(fiscalReceiptItemSchema).min(1, "Чек должен содержать хотя бы одну позицию"),
		cashKopecks: z.number().int().min(0).default(0),
		electronicCardKopecks: z.number().int().min(0).default(0),
		sbpKopecks: z.number().int().min(0).default(0),
		prepaidKopecks: z.number().int().min(0).default(0),
		creditKopecks: z.number().int().min(0).default(0),
		totalKopecks: z.number().int().positive("Общая сумма чека должна быть больше нуля"),
		taxDeductionSummaryCode: taxDeductionCategorySchema.default("code_1_standard"),
		/** Optional 54-FZ correction attributes */
		isCorrection: z.boolean().optional().default(false),
		correctionType: ffd12CorrectionTypeSchema.optional().nullable(),
		correctionDocDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты коррекции: ГГГГ-ММ-ДД").optional().nullable(),
		correctionDocNumber: z.string().trim().max(64).optional().nullable(),
	})
	.superRefine((val, ctx) => {
		// Strict parity: Sum of payment tenders MUST EQUAL total receipt amount
		const paymentsSum =
			val.cashKopecks +
			val.electronicCardKopecks +
			val.sbpKopecks +
			val.prepaidKopecks +
			val.creditKopecks;

		if (paymentsSum > 0 && paymentsSum !== val.totalKopecks) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Сумма способов оплаты (${paymentsSum} коп.) не совпадает с общей суммой чека (${val.totalKopecks} коп.)`,
				path: ["totalKopecks"],
			});
		}

		// Strict parity: Sum of line items MUST EQUAL total receipt amount
		const itemsSum = val.items.reduce((sum, item) => sum + item.amountKopecks, 0);
		if (itemsSum !== val.totalKopecks) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Сумма позиций чека (${itemsSum} коп.) не совпадает с общей суммой чека (${val.totalKopecks} коп.)`,
				path: ["items"],
			});
		}

		// If correction receipt is requested, base document data is mandatory
		if (val.isCorrection && (!val.correctionDocDate || !val.correctionDocNumber)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Для чека коррекции по 54-ФЗ обязательно указание даты и номера документа-основания (Теги 1178, 1179).",
				path: ["isCorrection"],
			});
		}
	});

export type CreateFiscalReceiptPayloadInput = z.infer<typeof createFiscalReceiptPayloadSchema>;

/**
 * Schema for 54-FZ Return Receipt (Возврат прихода / Возврат расхода).
 */
export const fiscalRefundPayloadSchema = z
	.object({
		clientMutationId: z.string().trim().min(1).max(128).optional().nullable(),
		originalPaymentId: z.string().uuid("Некорректный UUID исходного платежа"),
		originalReceiptNumber: z.string().trim().min(1, "Номер исходного чека обязателен"),
		originalFiscalSign: z.string().trim().max(32).optional().nullable(),
		patientId: z.string().uuid("Некорректный UUID пациента"),
		refundCashKopecks: z.number().int().min(0).default(0),
		refundElectronicKopecks: z.number().int().min(0).default(0),
		refundPrepaidKopecks: z.number().int().min(0).default(0),
		totalRefundKopecks: z.number().int().positive("Сумма возврата должна быть больше нуля"),
		reason: z.string().trim().min(1, "Причина возврата обязательна").max(256),
		cashierFullName: z.string().trim().min(1).max(120).default("Кассир-администратор"),
		items: z.array(fiscalReceiptItemSchema).min(1, "Укажите возвращаемые позиции"),
	})
	.superRefine((val, ctx) => {
		const tenderSum = val.refundCashKopecks + val.refundElectronicKopecks + val.refundPrepaidKopecks;
		if (tenderSum !== val.totalRefundKopecks) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Сумма возвращаемых средств по типам оплат (${tenderSum} коп.) не равна общей сумме возврата (${val.totalRefundKopecks} коп.).`,
				path: ["totalRefundKopecks"],
			});
		}
		const itemsSum = val.items.reduce((sum, item) => sum + item.amountKopecks, 0);
		if (itemsSum !== val.totalRefundKopecks) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Сумма позиций чека возврата (${itemsSum} коп.) не совпадает с общей суммой (${val.totalRefundKopecks} коп.).`,
				path: ["items"],
			});
		}
	});

export type FiscalRefundPayloadInput = z.infer<typeof fiscalRefundPayloadSchema>;
