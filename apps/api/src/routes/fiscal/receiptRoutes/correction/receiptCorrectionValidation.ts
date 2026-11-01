/**
 * receiptCorrectionValidation.ts — Layer 1: 54-FZ Correction & Refund Validation Engine.
 *
 * Enforces:
 * - Integer kopecks arithmetic parity (payments tender sum === totalKopecks === items sum).
 * - Taxation systems and operation types validation.
 * - Correction type enforcement: self_initiated vs by_instruction (Prescription).
 * - Tax authority prescription metadata requirement (Tag 1178 doc date, Tag 1179 doc number).
 * - Patient contact resolution without bureaucratic physical person INN locks (Mandate 8n).
 */

import {
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
	type Ffd12CorrectionType,
	ffd12CorrectionTypeSchema,
	ffd12OperationTypeSchema,
	ffd12TaxationSystemSchema,
	fiscalRefundPayloadSchema,
	type FiscalRefundPayloadInput,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withTenantCtx } from "../../../../db/rls.js";
import { patients } from "../../../../db/schema.js";

/**
 * Payload schema for 54-FZ Correction Receipts.
 * Both self-initiated (after power outage / cash register offline) and tax authority prescription.
 */
export const fiscalCorrectionPayloadSchema = createFiscalReceiptPayloadSchema
	.and(
		z.object({
			isCorrection: z.boolean().default(true),
			correctionType: ffd12CorrectionTypeSchema.default("self_initiated"),
			correctionDescription: z.string().trim().max(256).optional().nullable(),
		}),
	)
	.superRefine((val, ctx) => {
	// For prescription from tax inspection (Tag 1173 = 1), document number and date are strictly required
	if (val.correctionType === "by_instruction") {
		if (!val.correctionDocNumber || val.correctionDocNumber.trim().length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Для чека коррекции по предписанию налогового органа укажите номер предписания.",
				path: ["correctionDocNumber"],
			});
		}
		if (!val.correctionDocDate || !/^\d{4}-\d{2}-\d{2}$/.test(val.correctionDocDate.trim())) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Для чека коррекции по предписанию укажите дату предписания в формате ГГГГ-ММ-ДД.",
				path: ["correctionDocDate"],
			});
		}
	}
});

export type FiscalCorrectionPayloadInput = z.infer<typeof fiscalCorrectionPayloadSchema>;

/**
 * Validates integer kopecks amounts and exact tenders parity.
 */
export function validateCorrectionKopecks(payload: {
	totalKopecks: number;
	cashKopecks?: number | null | undefined;
	electronicCardKopecks?: number | null | undefined;
	sbpKopecks?: number | null | undefined;
	prepaidKopecks?: number | null | undefined;
	creditKopecks?: number | null | undefined;
	items?: Array<{ amountKopecks: number }> | undefined;
}): { valid: boolean; error?: string } {
	const total = payload.totalKopecks;
	if (!Number.isInteger(total) || total < 0) {
		return { valid: false, error: "Общая сумма чека коррекции должна быть неотрицательным целым числом копеек." };
	}

	const tenders = [
		payload.cashKopecks ?? 0,
		payload.electronicCardKopecks ?? 0,
		payload.sbpKopecks ?? 0,
		payload.prepaidKopecks ?? 0,
		payload.creditKopecks ?? 0,
	];

	for (const t of tenders) {
		if (!Number.isInteger(t) || t < 0) {
			return { valid: false, error: "Все способы оплаты должны быть неотрицательными целыми числами копеек." };
		}
	}

	const sumTenders = tenders.reduce((acc, v) => acc + v, 0);
	if (sumTenders !== total) {
		return {
			valid: false,
			error: `Сумма оплат (${sumTenders} коп.) не совпадает с итоговой суммой чека коррекции (${total} коп.).`,
		};
	}

	if (payload.items && payload.items.length > 0) {
		const sumItems = payload.items.reduce((acc, it) => acc + (it.amountKopecks || 0), 0);
		if (sumItems !== total) {
			return {
				valid: false,
				error: `Сумма позиций (${sumItems} коп.) не совпадает с итоговой суммой чека коррекции (${total} коп.).`,
			};
		}
	}

	return { valid: true };
}

/**
 * Validates whether the correction requires tax authority prescription metadata.
 */
export function validatePrescriptionRequirements(
	correctionType: Ffd12CorrectionType,
	docNumber?: string | null | undefined,
	docDate?: string | null | undefined,
): { valid: boolean; error?: string } {
	if (correctionType === "by_instruction") {
		if (!docNumber || docNumber.trim().length === 0) {
			return {
				valid: false,
				error: "Укажите номер предписания налогового органа для формирования чека коррекции.",
			};
		}
		if (!docDate || !/^\d{4}-\d{2}-\d{2}$/.test(docDate.trim())) {
			return {
				valid: false,
				error: "Укажите дату предписания налогового органа в формате ГГГГ-ММ-ДД.",
			};
		}
	}
	return { valid: true };
}

/**
 * Resolves the patient's real contact from the medical card (Tag 1008 customer contact).
 * Returns null when the patient card has no phone or email on file.
 * Never blocks the doctor or cashier on missing taxpayer ID (Mandate 8e, Mandate 8n).
 */
export async function resolvePatientCustomerContact(
	orgId: string,
	patientId: string,
): Promise<string | null> {
	return await withTenantCtx(orgId, async (tx) => {
		const [p] = await tx
			.select({ phone: patients.phone })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
			.limit(1);
		return p?.phone?.trim() || null;
	});
}
