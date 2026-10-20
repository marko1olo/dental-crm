/**
 * Receipt totals, tender parity, refunds, cash change & composite idempotency validation.
 * Layer 2: Mathematical verification of receipt totals and payment distribution.
 */

import { z } from "zod";
import {
	ffd12AgentSignSchema,
	ffd12CorrectionTypeSchema,
	ffd12OperationTypeSchema,
	ffd12TaxationSystemSchema,
	taxDeductionCategorySchema,
} from "../ffd12Types.js";
import { computePayloadHash, parseIdempotencyKey } from "../../sync/hashing.js";
import { fiscalReceiptItemSchema } from "./itemValidation.js";
import type { CashChangeResult } from "./types.js";

/**
 * Schema for creating and queueing an FFD 1.2 fiscal receipt.
 */
export const createFiscalReceiptPayloadSchema = z
	.object({
		clientMutationId: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z.string().trim().min(1).max(128).optional().nullable()
			),
		invoiceId: z.string().uuid().optional().nullable(),
		visitId: z.string().uuid().optional().nullable(),
		documentId: z.string().uuid().optional().nullable(),
		cashBoxId: z.string().uuid("Некорректный UUID кассового счёта").optional().nullable(),
		patientId: z.string().uuid("Некорректный UUID пациента"),
		payerType: z
			.enum(["physical_person", "legal_entity", "individual_entrepreneur", "physical", "individual"])
			.optional()
			.default("physical_person"),
		operationType: ffd12OperationTypeSchema.default("income"),
		taxationSystem: ffd12TaxationSystemSchema.default("usn_income"),
		agentSign: ffd12AgentSignSchema.optional().nullable(),
		customerContact: z
			.string()
			.trim()
			.min(5, "Укажите телефон или email для отправки чека")
			.max(100, "Контакт клиента не может превышать 100 символов"),
		customerName: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z.string().trim().max(256).optional().nullable()
			),
		customerInn: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z.string().trim().regex(/^(\d{10}|\d{12})$/, "ИНН покупателя должен содержать 10 (для ЮЛ) или 12 (для ИП/ФЛ) цифр").optional().nullable()
			),
		cashierFullName: z
			.string()
			.trim()
			.min(1, "ФИО кассира обязательно")
			.max(120, "ФИО кассира не может превышать 120 символов")
			.default("Кассир-администратор"),
		cashierInn: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z.string().trim().max(12).optional().nullable()
			),
		paymentAddress: z.string().trim().max(256).optional().nullable(),
		paymentPlace: z.string().trim().max(256).optional().nullable(),
		items: z.array(fiscalReceiptItemSchema).min(1, "Чек должен содержать хотя бы одну позицию"),
		cashKopecks: z.number().int().min(0).default(0),
		electronicCardKopecks: z.number().int().min(0).default(0),
		sbpKopecks: z.number().int().min(0).default(0),
		prepaidKopecks: z.number().int().min(0).default(0),
		creditKopecks: z.number().int().min(0).default(0),
		totalKopecks: z.number().int().min(0, "Общая сумма чека не может быть отрицательной"),
		taxDeductionSummaryCode: taxDeductionCategorySchema.default("code_1_standard"),
		/** Decree 659: Upsell Consent Shield attributes (Rules of 2026) */
		treatmentPlanId: z.string().uuid().optional().nullable(),
		addendumNumber: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z.string().trim().max(64).optional().nullable()
			),
		addendumConfirmed: z.boolean().optional().default(false),
		/** Optional 54-FZ correction attributes */
		isCorrection: z.boolean().optional().default(false),
		correctionType: ffd12CorrectionTypeSchema.optional().nullable(),
		correctionDocDate: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты коррекции: ГГГГ-ММ-ДД").optional().nullable()
			),
		correctionDocNumber: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z.string().trim().max(64).optional().nullable()
			),
	})
	.superRefine((val, ctx) => {
		// 54-FZ Tag 1228: Buyer INN enforcement for B2B (Legal Entities and Sole Proprietors / IP)
		// For physical persons (Mandate 8e), INN is strictly optional and never blocking.
		if (val.payerType === "legal_entity") {
			if (!val.customerInn) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Для юридического лица обязателен ИНН (10 цифр) по 54-ФЗ",
					path: ["customerInn"],
				});
			} else if (val.customerInn.length !== 10) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "ИНН юридического лица должен содержать ровно 10 цифр",
					path: ["customerInn"],
				});
			}
		} else if (val.payerType === "individual_entrepreneur") {
			if (!val.customerInn) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Для ИП обязателен ИНН (12 цифр) по 54-ФЗ",
					path: ["customerInn"],
				});
			} else if (val.customerInn.length !== 12) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "ИНН индивидуального предпринимателя должен содержать ровно 12 цифр",
					path: ["customerInn"],
				});
			}
		}

		// Strict parity: Sum of payment tenders MUST EQUAL total receipt amount
		const paymentsSum =
			val.cashKopecks +
			val.electronicCardKopecks +
			val.sbpKopecks +
			val.prepaidKopecks +
			val.creditKopecks;

		if (paymentsSum !== val.totalKopecks) {
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

export type CreateFiscalReceiptPayloadInput = z.input<typeof createFiscalReceiptPayloadSchema>;
export type CreateFiscalReceiptPayloadOutput = z.infer<typeof createFiscalReceiptPayloadSchema>;

/**
 * Schema for 54-FZ Return Receipt (Возврат прихода / Возврат расхода).
 */
export const fiscalRefundPayloadSchema = z
	.object({
		clientMutationId: z.string().trim().min(1).max(128).optional().nullable(),
		originalPaymentId: z.string().trim().optional().nullable(),
		originalReceiptNumber: z.string().trim().optional().nullable(),
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
	.transform((val) => {
		let { refundCashKopecks, refundElectronicKopecks, refundPrepaidKopecks, totalRefundKopecks } = val;
		if (refundCashKopecks === 0 && refundElectronicKopecks === 0 && refundPrepaidKopecks === 0 && totalRefundKopecks > 0) {
			refundElectronicKopecks = totalRefundKopecks;
		}
		const originalReceiptNumber = val.originalReceiptNumber?.trim() || "CHK-1";
		return {
			...val,
			originalReceiptNumber,
			refundCashKopecks,
			refundElectronicKopecks,
			refundPrepaidKopecks,
		};
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE IDEMPOTENCY KEY BUILDERS (<UUID>#<SHA256(PAYLOAD)>) FOR 54-FZ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a deterministic canonical signature for a 54-FZ receipt payload.
 * Normalizes all fields to prevent key ordering or whitespace discrepancies.
 */
export function buildFiscalReceiptPayloadSignature(input: {
	patientId: string;
	cashBoxId?: string | null | undefined;
	operationType?: string | undefined;
	taxationSystem?: string | undefined;
	totalKopecks: number;
	cashKopecks?: number | undefined;
	electronicCardKopecks?: number | undefined;
	sbpKopecks?: number | undefined;
	prepaidKopecks?: number | undefined;
	creditKopecks?: number | undefined;
	items: readonly {
		serviceId?: string | null | undefined;
		catalogItemId?: string | null | undefined;
		name: string;
		priceKopecks: number;
		quantity: number;
		discountKopecks?: number | null | undefined;
		discountPercent?: number | null | undefined;
		amountKopecks: number;
		subject?: string | undefined;
		method?: string | undefined;
		vatRate?: string | undefined;
		measure?: string | undefined;
		markingCode?: string | null | undefined;
		medicalServiceCode804n?: string | null | undefined;
	}[];
}): Record<string, unknown> {
	return {
		patientId: input.patientId,
		cashBoxId: input.cashBoxId ?? null,
		operationType: input.operationType ?? "income",
		taxationSystem: input.taxationSystem ?? "usn_income",
		totalKopecks: input.totalKopecks,
		cashKopecks: input.cashKopecks ?? 0,
		electronicCardKopecks: input.electronicCardKopecks ?? 0,
		sbpKopecks: input.sbpKopecks ?? 0,
		prepaidKopecks: input.prepaidKopecks ?? 0,
		creditKopecks: input.creditKopecks ?? 0,
		items: input.items.map((it) => ({
			serviceId: it.serviceId || it.catalogItemId || null,
			name: it.name.trim(),
			priceKopecks: it.priceKopecks,
			quantity: it.quantity,
			discountKopecks: it.discountKopecks ?? null,
			discountPercent: it.discountPercent ?? null,
			amountKopecks: it.amountKopecks,
			subject: it.subject ?? "service",
			method: it.method ?? "full_payment",
			vatRate: it.vatRate ?? "vat_none",
			measure: it.measure ?? "piece",
			markingCode: it.markingCode ? it.markingCode.trim() : null,
			medicalServiceCode804n: it.medicalServiceCode804n ? it.medicalServiceCode804n.trim() : null,
		})),
	};
}

/**
 * Builds a deterministic canonical signature for a 54-FZ refund receipt payload.
 */
export function buildFiscalRefundPayloadSignature(input: {
	originalPaymentId?: string | null | undefined;
	originalReceiptNumber?: string | undefined;
	patientId: string;
	totalRefundKopecks: number;
	refundCashKopecks?: number | undefined;
	refundElectronicKopecks?: number | undefined;
	refundPrepaidKopecks?: number | undefined;
	reason?: string | undefined;
	items: readonly {
		name: string;
		priceKopecks: number;
		quantity: number;
		amountKopecks: number;
	}[];
}): Record<string, unknown> {
	return {
		originalPaymentId: input.originalPaymentId ?? null,
		originalReceiptNumber: input.originalReceiptNumber ?? null,
		patientId: input.patientId,
		totalRefundKopecks: input.totalRefundKopecks,
		refundCashKopecks: input.refundCashKopecks ?? 0,
		refundElectronicKopecks: input.refundElectronicKopecks ?? 0,
		refundPrepaidKopecks: input.refundPrepaidKopecks ?? 0,
		reason: input.reason ? input.reason.trim() : "",
		items: input.items.map((it) => ({
			name: it.name.trim(),
			priceKopecks: it.priceKopecks,
			quantity: it.quantity,
			amountKopecks: it.amountKopecks,
		})),
	};
}

/**
 * Creates a statutory composite Idempotency-Key: `<uuid>#<sha256(canonicalPayload)>`.
 */
export function createFiscalCompositeIdempotencyKey(
	uuid: string,
	payloadSignature: Record<string, unknown>,
): string {
	const hash = computePayloadHash(payloadSignature);
	return `${uuid}#${hash}`;
}

/**
 * Verifies if an incoming composite idempotency key matches the computed payload signature.
 */
export function verifyFiscalCompositeIdempotencyKey(
	compositeKey: string,
	payloadSignature: Record<string, unknown>,
): {
	isValid: boolean;
	uuid: string;
	expectedHash: string | null;
	actualHash: string;
} {
	const parsed = parseIdempotencyKey(compositeKey);
	const actualHash = computePayloadHash(payloadSignature);
	const isValid = parsed.embeddedHash === null || parsed.embeddedHash === actualHash;
	return {
		isValid,
		uuid: parsed.uuid,
		expectedHash: parsed.embeddedHash,
		actualHash,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// FAST CASHIER: CHANGE CALCULATION & DENOMINATION PRESET HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes exact kopeck cash change or shortage for rapid cashier counter.
 */
export function calculateCashChange(
	cashRequiredRub: number,
	receivedCashRub: number,
): CashChangeResult {
	const requiredKopecks = Math.max(0, Math.round(cashRequiredRub * 100));
	const receivedKopecks = Math.max(0, Math.round(receivedCashRub * 100));

	if (receivedKopecks >= requiredKopecks) {
		const changeKop = receivedKopecks - requiredKopecks;
		return {
			cashRequiredRub,
			receivedCashRub,
			changeRub: Number((changeKop / 100).toFixed(2)),
			changeKopecks: changeKop,
			isShortage: false,
			shortageRub: 0,
			shortageKopecks: 0,
		};
	}

	const shortageKop = requiredKopecks - receivedKopecks;
	return {
		cashRequiredRub,
		receivedCashRub,
		changeRub: 0,
		changeKopecks: 0,
		isShortage: true,
		shortageRub: Number((shortageKop / 100).toFixed(2)),
		shortageKopecks: shortageKop,
	};
}

/**
 * Returns rapid cash preset suggestions for common banknotes and exact amounts.
 */
export function getCashPresetSuggestions(cashRequiredRub: number): number[] {
	const req = Math.ceil(cashRequiredRub);
	if (req <= 0) return [100, 500, 1000, 5000];

	const presets = new Set<number>();
	presets.add(req);

	const standardBills = [50, 100, 200, 500, 1000, 2000, 5000];
	for (const bill of standardBills) {
		if (bill >= req) {
			presets.add(bill);
		}
	}

	const nextHundred = Math.ceil(req / 100) * 100;
	if (nextHundred > req) presets.add(nextHundred);

	const nextFiveHundred = Math.ceil(req / 500) * 500;
	if (nextFiveHundred > req) presets.add(nextFiveHundred);

	const nextThousand = Math.ceil(req / 1000) * 1000;
	if (nextThousand > req) presets.add(nextThousand);

	return Array.from(presets).sort((a, b) => a - b).slice(0, 5);
}
