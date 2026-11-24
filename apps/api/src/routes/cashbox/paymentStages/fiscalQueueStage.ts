/**
 * apps/api/src/routes/cashbox/paymentStages/fiscalQueueStage.ts
 *
 * Stage 10: Fiscal Receipt Queue Spooling (54-FZ) & Final Response Assembly.
 * Governed by Mandate 8e, 8n, 8bm, 8bo (54-FZ Physical/Cloud KKT Queue & Response Contract).
 */

import {
	kopecksToRub,
	kopecksToRubles,
	normalizePaymentMethod,
} from "@dental/shared";
import { fiscalReceiptQueue } from "../../../db/schema.js";
import type { CashboxPaymentOutcome, PaymentProcessingContext, TenantTransaction } from "./types.js";

export async function processFiscalQueueStage(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<CashboxPaymentOutcome> {
	const {
		orgId,
		body,
		effectiveMutationId,
		totalKopecks,
		amountRubNumber,
		requiredDepositKopecks,
		requiredBonusKopecks,
		requiredCertificateKopecks,
		requiredDmsKopecks,
		certificateNumber,
		guaranteeLetterId,
		lockedDmsLetter,
		isEmergencyLetterAlias,
		resolvedPatientId,
		patientName,
		patientRow,
		effectiveVisitId,
		newPayment,
		resolvedCashKop,
		resolvedCardKop,
		resolvedSbpKop,
		resolvedElecKop,
		patientCoPayKopecks,
		splitTenderCount,
		receiptNumber,
		issuedAt,
		lockedTopupFamilyGroup,
		topupPrevBalKop,
		topupNewBalKop,
	} = ctx;

	if (!newPayment) {
		throw new Error("Не удалось сформировать фискальный чек: платеж не был создан.");
	}

	const effectiveTotalKopecks =
		patientCoPayKopecks && patientCoPayKopecks > 0n
			? totalKopecks > patientCoPayKopecks
				? totalKopecks - patientCoPayKopecks
				: 0n
			: totalKopecks;
	const effectiveAmountRub = kopecksToRub(Number(effectiveTotalKopecks));

	let enqueuedReceiptId: string | null = null;

	if (effectiveTotalKopecks > 0n) {
		const totalAdvanceOffsetKop = requiredDepositKopecks + requiredCertificateKopecks;
		const [enqueued] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				paymentId: newPayment.id,
				visitId: effectiveVisitId,
				receiptType: "income",
				status: "pending_print",
				payloadJson: {
					clientMutationId: effectiveMutationId,
					amountRub: effectiveAmountRub,
					amountKopecks: Number(effectiveTotalKopecks),
					method: normalizePaymentMethod(body.method),
					isAdvanceDeposit: body.isAdvanceDeposit ?? false,
					calculationMethodTag1214: body.isAdvanceDeposit ? 3 : undefined,
					calculationSubjectTag1212: body.isAdvanceDeposit ? 10 : undefined,
					advanceDepositTarget:
						body.advanceDepositTarget ||
						(body.familyGroupId ? "family" : "patient"),
					advancePaymentRub: body.isAdvanceDeposit ? effectiveAmountRub : undefined,
					advancePaymentKopecks: body.isAdvanceDeposit
						? Number(effectiveTotalKopecks)
						: undefined,
					cashRub: kopecksToRub(resolvedCashKop),
					cashKopecks: resolvedCashKop,
					electronicRub: kopecksToRub(resolvedElecKop),
					electronicKopecks: resolvedElecKop,
					electronicCardKopecks: resolvedCardKop,
					sbpKopecks: resolvedSbpKop,
					advanceOffsetRub: kopecksToRub(Number(totalAdvanceOffsetKop)),
					advanceOffsetKopecks: Number(totalAdvanceOffsetKop),
					depositKopecks: Number(requiredDepositKopecks),
					certificateOffsetRub: kopecksToRub(Number(requiredCertificateKopecks)),
					certificateKopecks: Number(requiredCertificateKopecks),
					certificateNumber: certificateNumber || null,
					bonusOffsetRub: kopecksToRub(Number(requiredBonusKopecks)),
					bonusKopecks: Number(requiredBonusKopecks),
					dmsOffsetRub: kopecksToRub(Number(requiredDmsKopecks)),
					dmsKopecks: Number(requiredDmsKopecks),
					guaranteeLetterNumber:
						lockedDmsLetter?.letterNumber ||
						(isEmergencyLetterAlias ? "ЭКСТРЕННО (досылка)" : null),
					guaranteeLetterId:
						lockedDmsLetter?.id || (isEmergencyLetterAlias ? guaranteeLetterId : null),
					fiscalReceiptNumber: receiptNumber,
					patientId: resolvedPatientId,
					patientName: patientRow?.fullName || patientName,
					cashierFullName: body.cashierFullName || "Кассир",
					invoiceId: body.invoiceId || null,
					note: newPayment.note,
					splitTenders: body.splitTenders ?? null,
					createdPaymentIds: ctx.createdPaymentIds,
				},
				retryCount: 0,
			})
			.returning({ id: fiscalReceiptQueue.id });

		if (enqueued) {
			enqueuedReceiptId = enqueued.id;
		}
	}

	return {
		statusCode: 200,
		body: {
			success: true,
			data: {
				id: newPayment.id,
				organizationId: newPayment.organizationId,
				patientId: newPayment.patientId,
				visitId: newPayment.visitId,
				documentId: newPayment.documentId,
				amountKopecks: Number(effectiveTotalKopecks),
				amountRub: effectiveAmountRub,
				patientCoPayKopecks: patientCoPayKopecks && patientCoPayKopecks > 0n ? Number(patientCoPayKopecks) : undefined,
				patientCoPayRub: patientCoPayKopecks && patientCoPayKopecks > 0n ? kopecksToRub(Number(patientCoPayKopecks)) : undefined,
				bonusAmountKopecks: Number(requiredBonusKopecks),
				certificateAmountKopecks: Number(requiredCertificateKopecks),
				dmsAmountKopecks: Number(requiredDmsKopecks),
				guaranteeLetterId:
					lockedDmsLetter?.id || (isEmergencyLetterAlias ? guaranteeLetterId : null),
				method:
					splitTenderCount > 1 || body.method === "split"
						? "split"
						: newPayment.method,
				status: newPayment.status,
				paidAt: newPayment.paidAt
					? newPayment.paidAt.toISOString()
					: new Date().toISOString(),
				createdAt: newPayment.createdAt
					? newPayment.createdAt.toISOString()
					: new Date().toISOString(),
				fiscalReceiptNumber: receiptNumber,
				fiscalReceiptIssuedAt: issuedAt,
				fiscalReceiptUrl: newPayment.fiscalReceiptUrl,
				fiscalReceipt: newPayment.fiscalReceipt,
				payerFullName: newPayment.payerFullName,
				payerInn: newPayment.payerInn,
				payerBirthDate: newPayment.payerBirthDate,
				payerIdentityDocument: newPayment.payerIdentityDocument,
				payerRelationship: newPayment.payerRelationship,
				taxDeductionCode: newPayment.taxDeductionCode,
				note: newPayment.note,
				fiscalReceiptQueueId: enqueuedReceiptId,
				clientMutationId: effectiveMutationId,
				isAdvanceDeposit: body.isAdvanceDeposit ?? false,
				previousFamilyBalanceRub: lockedTopupFamilyGroup
					? kopecksToRubles(Number(topupPrevBalKop))
					: undefined,
				newFamilyBalanceRub: lockedTopupFamilyGroup
					? kopecksToRubles(Number(topupNewBalKop))
					: undefined,
				previousFamilyBalanceKopecks: lockedTopupFamilyGroup
					? Number(topupPrevBalKop)
					: undefined,
				newFamilyBalanceKopecks: lockedTopupFamilyGroup
					? Number(topupNewBalKop)
					: undefined,
				creditedRub: lockedTopupFamilyGroup ? amountRubNumber : undefined,
				creditedKopecks: lockedTopupFamilyGroup ? Number(totalKopecks) : undefined,
			},
		},
	};
}
