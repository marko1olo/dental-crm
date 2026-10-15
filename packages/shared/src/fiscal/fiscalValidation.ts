/**
 * packages/shared/src/fiscal/fiscalValidation.ts
 *
 * DENTE Dental CRM — Canonical 54-FZ (FFD 1.2) Fiscal Validation SSOT Facade.
 *
 * Consolidates:
 * 1. Line items & marking validation (Order 804n, Chestny ZNAK, Decree 659)
 * 2. Receipt totals & tender parity assertions (Tag 1031, 1081, 1215, 1216, 1217)
 * 3. Canonical tender breakdown verification using CanonicalTenderType SSOT
 * 4. FTS rules, FPD calculation & non-blocking cashier validation (Mandate 8e)
 *
 * Re-exports 100% of the decomposed ./fiscalValidation submodules.
 */

import { z } from "zod";
import {
	type CanonicalTenderType,
	canonicalTenderTypeSchema,
	CANONICAL_TENDER_LABELS_RU,
	calculateCanonicalSplit,
	type CanonicalSplitCalculationResult,
} from "./tenderTypes.js";
import { kopecksToRub, rubToKopecks } from "./kopecksArithmetic.js";

// Re-export decomposed fiscalValidation submodules
export * from "./fiscalValidation/index.js";

// ─── CANONICAL TENDER PARITY VALIDATION SSOT ─────────────────────────────────

/**
 * Input for validating tender parity against a receipt total in kopecks.
 */
export interface ValidateTenderParityInput {
	readonly totalDueKopecks: number;
	readonly cashKopecks?: number | undefined;
	readonly cardKopecks?: number | undefined;
	readonly sbpKopecks?: number | undefined;
	readonly depositKopecks?: number | undefined;
	readonly familyWalletKopecks?: number | undefined;
	readonly insuranceKopecks?: number | undefined;
	readonly creditKopecks?: number | undefined;
	readonly certificateKopecks?: number | undefined;
	readonly receivedCashKopecks?: number | undefined;
}

/**
 * Result of statutory tender parity validation.
 */
export interface ValidateTenderParityResult {
	readonly isValid: boolean;
	readonly totalDueKopecks: number;
	readonly totalAllocatedKopecks: number;
	readonly diffKopecks: number;
	readonly remainingKopecks: number;
	readonly changeKopecks: number;
	readonly isCashShortage: boolean;
	readonly cashShortageKopecks: number;
	readonly isOverallocated: boolean;
	readonly isFullyAllocated: boolean;
	readonly messageRu?: string | undefined;
	readonly warningsRu: readonly string[];
}

/**
 * Pure integer-kopeck validator for tender parity.
 *
 * Invariant (Mandate 8i):
 * TotalAllocatedKopecks === TotalDueKopecks.
 *
 * Mandate 8e (Doctor & Cashier Autonomy):
 * Returns rich diagnostic object with actionable Russian messages.
 * Does not throw — caller decides whether to show soft warnings or block submit.
 */
export function validateTenderParity(input: ValidateTenderParityInput): ValidateTenderParityResult {
	const totalDueKop = Math.max(0, Math.round(input.totalDueKopecks));
	const cashKop = Math.max(0, Math.round(input.cashKopecks ?? 0));
	const cardKop = Math.max(0, Math.round(input.cardKopecks ?? 0));
	const sbpKop = Math.max(0, Math.round(input.sbpKopecks ?? 0));
	const depositKop = Math.max(0, Math.round(input.depositKopecks ?? 0));
	const famKop = Math.max(0, Math.round(input.familyWalletKopecks ?? 0));
	const insKop = Math.max(0, Math.round(input.insuranceKopecks ?? 0));
	const credKop = Math.max(0, Math.round(input.creditKopecks ?? 0));
	const certKop = Math.max(0, Math.round(input.certificateKopecks ?? 0));

	const totalAllocatedKop =
		cashKop + cardKop + sbpKop + depositKop + famKop + insKop + credKop + certKop;

	const diffKop = totalAllocatedKop - totalDueKop;
	const remainingKop = Math.max(0, totalDueKop - totalAllocatedKop);
	const isOverallocated = totalAllocatedKop > totalDueKop;
	const isFullyAllocated = totalAllocatedKop === totalDueKop;

	const receivedCashKop = input.receivedCashKopecks != null
		? Math.max(0, Math.round(input.receivedCashKopecks))
		: cashKop;
	const changeKop = Math.max(0, receivedCashKop - cashKop);
	const isCashShortage = cashKop > 0 && receivedCashKop < cashKop;
	const cashShortageKop = isCashShortage ? cashKop - receivedCashKop : 0;

	const warningsRu: string[] = [];

	if (isOverallocated) {
		warningsRu.push(
			`Сумма способов оплаты превышает чек на ${kopecksToRub(diffKop)} ₽ (${diffKop} коп.).`,
		);
	} else if (remainingKop > 0) {
		warningsRu.push(
			`Осталось распределить ${kopecksToRub(remainingKop)} ₽ (${remainingKop} коп.).`,
		);
	}

	if (isCashShortage) {
		warningsRu.push(
			`Получено наличными меньше положенного: не хватает ${kopecksToRub(cashShortageKop)} ₽.`,
		);
	}

	const isValid = isFullyAllocated && !isCashShortage;

	let messageRu: string | undefined;
	if (!isValid) {
		messageRu = warningsRu.join(" ");
	}

	return {
		isValid,
		totalDueKopecks: totalDueKop,
		totalAllocatedKopecks: totalAllocatedKop,
		diffKopecks: diffKop,
		remainingKopecks: remainingKop,
		changeKopecks: changeKop,
		isCashShortage,
		cashShortageKopecks: cashShortageKop,
		isOverallocated,
		isFullyAllocated,
		messageRu,
		warningsRu,
	};
}

/**
 * Schema for an itemized tender in a multi-tender split.
 */
export const canonicalTenderItemSchema = z.object({
	tenderType: canonicalTenderTypeSchema,
	amountKopecks: z.number().int().min(0, "Сумма в копейках не может быть отрицательной"),
	amountRub: z.number().min(0).optional(),
	metadata: z.record(z.unknown()).optional(),
});
export type CanonicalTenderItem = z.infer<typeof canonicalTenderItemSchema>;

/**
 * Universal Zod Schema for Cashier Multi-Tender Payment Submission.
 *
 * Guarantees:
 * - 100% integer kopeck validation
 * - Sum of tenders equals totalAmountKopecks exactly
 * - Optional individual INN (Mandate 8e: physical person INN is never blocking)
 */
export const canonicalCashierCheckoutPayloadSchema = z
	.object({
		clientMutationId: z.string().trim().min(1).max(128).optional().nullable(),
		invoiceId: z.string().uuid().optional().nullable(),
		visitId: z.string().uuid().optional().nullable(),
		patientId: z.string().uuid("Некорректный UUID пациента"),
		payerType: z
			.enum(["physical_person", "legal_entity", "individual_entrepreneur", "physical", "individual"])
			.optional()
			.default("physical_person"),
		cashierFullName: z.string().trim().min(1).max(120).default("Кассир-администратор"),
		customerContact: z.string().trim().min(5).max(100),
		customerName: z.string().trim().max(256).optional().nullable(),
		customerInn: z
			.preprocess(
				(val) => (typeof val === "string" && val.trim() === "" ? null : val),
				z
					.string()
					.trim()
					.regex(/^(\d{10}|\d{12})$/, "ИНН должен состоять из 10 или 12 цифр")
					.optional()
					.nullable(),
			),
		totalAmountKopecks: z.number().int().positive("Сумма чека должна быть больше нуля"),
		tenders: z.array(canonicalTenderItemSchema).min(1, "Требуется хотя бы один способ оплаты"),
		receivedCashKopecks: z.number().int().min(0).optional().nullable(),
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

		const totalTendersKop = val.tenders.reduce((sum, t) => sum + t.amountKopecks, 0);
		if (totalTendersKop !== val.totalAmountKopecks) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Сумма способов оплаты (${totalTendersKop} коп.) не равна общей сумме чека (${val.totalAmountKopecks} коп.). Расхождение: ${totalTendersKop - val.totalAmountKopecks} коп.`,
				path: ["tenders"],
			});
		}

		const cashTender = val.tenders.find((t) => t.tenderType === "cash");
		if (cashTender && cashTender.amountKopecks > 0 && val.receivedCashKopecks != null) {
			if (val.receivedCashKopecks < cashTender.amountKopecks) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Полученная сумма наличных (${val.receivedCashKopecks} коп.) меньше суммы платежа (${cashTender.amountKopecks} коп.)`,
					path: ["receivedCashKopecks"],
				});
			}
		}
	});

export type CanonicalCashierCheckoutPayload = z.infer<typeof canonicalCashierCheckoutPayloadSchema>;
