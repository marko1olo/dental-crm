/**
 * apps/api/src/routes/cashbox/paymentStages/splitAllocationStage.ts
 *
 * Stage 7: Split Tender Allocation, Payment Records Insertion (with amountKopecks).
 * Governed by Mandate 8e, 8bm, 8bo (Strict Integer Kopeck Math & Split Balance).
 */

import { kopecksToRubles, normalizePaymentMethod, rublesToKopecks } from "@dental/shared";
import { payments } from "../../../db/schema.js";
import type { PaymentProcessingContext, StageStepResult, TenantTransaction } from "./types.js";

const isValidUuid = (val?: string | null): boolean =>
	Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function processSplitAllocationStage(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (ctx.isWarrantyPayment) {
		return { success: true };
	}

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
		effectiveTaxCode,
		resolvedPatientId,
		effectiveVisitId,
	} = ctx;

	const receiptNumber =
		typeof body.fiscalReceiptNumber === "string" && body.fiscalReceiptNumber.trim()
			? body.fiscalReceiptNumber.trim()
			: null;
	const issuedAt =
		typeof body.fiscalReceiptIssuedAt === "string" && body.fiscalReceiptIssuedAt.trim()
			? body.fiscalReceiptIssuedAt.trim()
			: null;

	ctx.receiptNumber = receiptNumber;
	ctx.issuedAt = issuedAt;

	let resolvedCashKop = 0;
	let resolvedElecKop = 0;

	if (body.splitTenders && body.splitTenders.length > 0) {
		for (const tender of body.splitTenders) {
			const tk = tender.amountKopecks ?? rublesToKopecks(tender.amountRub ?? 0);
			const norm = normalizePaymentMethod(tender.method);
			if (norm === "cash") {
				resolvedCashKop += tk;
			} else if (["card", "sbp", "online"].includes(norm)) {
				resolvedElecKop += tk;
			}
		}
	} else {
		resolvedCashKop =
			body.cashAmountKopecks ??
			(body.cashAmountRub !== undefined ? rublesToKopecks(body.cashAmountRub) : undefined) ??
			(body.method === "cash" ? Number(totalKopecks) : 0);
		resolvedElecKop =
			body.electronicAmountKopecks ??
			(body.electronicAmountRub !== undefined
				? rublesToKopecks(body.electronicAmountRub)
				: undefined) ??
			(["card", "sbp", "online"].includes(body.method || "")
				? Number(totalKopecks)
				: 0);
	}

	ctx.resolvedCashKop = resolvedCashKop;
	ctx.resolvedElecKop = resolvedElecKop;

	const splitTenderCount =
		(resolvedCashKop > 0 ? 1 : 0) +
		(resolvedElecKop > 0 ? 1 : 0) +
		(requiredDepositKopecks > 0n ? 1 : 0) +
		(requiredBonusKopecks > 0n ? 1 : 0) +
		(requiredCertificateKopecks > 0n ? 1 : 0) +
		(requiredDmsKopecks > 0n ? 1 : 0);
	ctx.splitTenderCount = splitTenderCount;

	let newPayment: typeof payments.$inferSelect;
	const recordCreatedPaymentId = (paymentRow: typeof payments.$inferSelect | undefined) => {
		if (paymentRow?.id && !ctx.createdPaymentIds.includes(paymentRow.id)) {
			ctx.createdPaymentIds.push(paymentRow.id);
		}
	};

	if (splitTenderCount > 1) {
		let elecPayment: typeof payments.$inferSelect | undefined;
		let cashPayment: typeof payments.$inferSelect | undefined;
		let depositPayment: typeof payments.$inferSelect | undefined;
		let bonusPayment: typeof payments.$inferSelect | undefined;
		let certPayment: typeof payments.$inferSelect | undefined;
		let dmsPayment: typeof payments.$inferSelect | undefined;

		if (resolvedElecKop > 0) {
			const [ep] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: effectiveVisitId,
					documentId: body.invoiceId || null,
					clientMutationId: effectiveMutationId ? `${effectiveMutationId}:card` : null,
					amountRub: kopecksToRubles(resolvedElecKop),
					amountKopecks: BigInt(resolvedElecKop),
					method: "card",
					status: "paid",
					paidAt: new Date(),
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: issuedAt,
					payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
					payerInn: body.payerInn || body.buyerInn || null,
					payerBirthDate: body.payerBirthDate || null,
					payerIdentityDocument: body.payerIdentityDocument || null,
					payerRelationship: body.payerRelationship || null,
					taxDeductionCode: effectiveTaxCode,
					note: body.note ? `${body.note} (безналичные)` : "Сплит-оплата (безналичные)",
				})
				.returning();
			elecPayment = ep;
		}

		if (resolvedCashKop > 0) {
			const [cp] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: effectiveVisitId,
					documentId: body.invoiceId || null,
					clientMutationId: effectiveMutationId ? `${effectiveMutationId}:cash` : null,
					amountRub: kopecksToRubles(resolvedCashKop),
					amountKopecks: BigInt(resolvedCashKop),
					method: "cash",
					status: "paid",
					paidAt: new Date(),
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: issuedAt,
					payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
					payerInn: body.payerInn || body.buyerInn || null,
					payerBirthDate: body.payerBirthDate || null,
					payerIdentityDocument: body.payerIdentityDocument || null,
					payerRelationship: body.payerRelationship || null,
					taxDeductionCode: effectiveTaxCode,
					note: body.note ? `${body.note} (наличные)` : "Сплит-оплата (наличные)",
				})
				.returning();
			cashPayment = cp;
		}

		if (requiredDepositKopecks > 0n) {
			const [dp] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: effectiveVisitId,
					documentId: body.invoiceId || null,
					clientMutationId: effectiveMutationId ? `${effectiveMutationId}:deposit` : null,
					amountRub: kopecksToRubles(Number(requiredDepositKopecks)),
					amountKopecks: requiredDepositKopecks,
					method: "family_wallet",
					status: "paid",
					paidAt: new Date(),
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: issuedAt,
					payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
					payerInn: body.payerInn || body.buyerInn || null,
					payerBirthDate: body.payerBirthDate || null,
					payerIdentityDocument: body.payerIdentityDocument || null,
					payerRelationship: body.payerRelationship || null,
					taxDeductionCode: effectiveTaxCode,
					note: body.note ? `${body.note} (депозит)` : "Сплит-оплата (депозит)",
				})
				.returning();
			depositPayment = dp;
		}

		if (requiredBonusKopecks > 0n) {
			const [bp] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: effectiveVisitId,
					documentId: body.invoiceId || null,
					clientMutationId: effectiveMutationId ? `${effectiveMutationId}:bonus` : null,
					amountRub: kopecksToRubles(Number(requiredBonusKopecks)),
					amountKopecks: requiredBonusKopecks,
					method: "other",
					status: "paid",
					paidAt: new Date(),
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: issuedAt,
					payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
					payerInn: body.payerInn || body.buyerInn || null,
					payerBirthDate: body.payerBirthDate || null,
					payerIdentityDocument: body.payerIdentityDocument || null,
					payerRelationship: body.payerRelationship || null,
					taxDeductionCode: effectiveTaxCode,
					note: body.note ? `${body.note} (бонусы)` : "Сплит-оплата (бонусы)",
				})
				.returning();
			bonusPayment = bp;
		}

		if (requiredCertificateKopecks > 0n) {
			const [certP] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: effectiveVisitId,
					documentId: body.invoiceId || null,
					clientMutationId: effectiveMutationId ? `${effectiveMutationId}:certificate` : null,
					amountRub: kopecksToRubles(Number(requiredCertificateKopecks)),
					amountKopecks: requiredCertificateKopecks,
					method: "certificate",
					status: "paid",
					paidAt: new Date(),
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: issuedAt,
					payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
					payerInn: body.payerInn || body.buyerInn || null,
					payerBirthDate: body.payerBirthDate || null,
					payerIdentityDocument: body.payerIdentityDocument || null,
					payerRelationship: body.payerRelationship || null,
					taxDeductionCode: effectiveTaxCode,
					note: body.note ? `${body.note} (сертификат)` : "Сплит-оплата (сертификат)",
				})
				.returning();
			certPayment = certP;
		}

		if (requiredDmsKopecks > 0n) {
			const effectiveDmsDocId =
				(isValidUuid(ctx.guaranteeLetterId) ? ctx.guaranteeLetterId : null) ||
				(ctx.lockedDmsLetter?.id && isValidUuid(ctx.lockedDmsLetter.id) ? ctx.lockedDmsLetter.id : null) ||
				body.invoiceId ||
				null;
			const letterRef = ctx.lockedDmsLetter?.letterNumber
				? ` (ГП №${ctx.lockedDmsLetter.letterNumber})`
				: ctx.guaranteeLetterId
					? ` (ГП: ${ctx.guaranteeLetterId})`
					: "";

			const [dmsp] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: effectiveVisitId,
					documentId: effectiveDmsDocId,
					clientMutationId: effectiveMutationId ? `${effectiveMutationId}:dms` : null,
					amountRub: kopecksToRubles(Number(requiredDmsKopecks)),
					amountKopecks: requiredDmsKopecks,
					method: "insurance",
					status: "paid",
					paidAt: new Date(),
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: issuedAt,
					payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
					payerInn: body.payerInn || body.buyerInn || null,
					payerBirthDate: body.payerBirthDate || null,
					payerIdentityDocument: body.payerIdentityDocument || null,
					payerRelationship: body.payerRelationship || null,
					taxDeductionCode: effectiveTaxCode,
					note: body.note
						? `${body.note} (ДМС${letterRef})`
						: `Сплит-оплата (ДМС${letterRef})`,
				})
				.returning();
			dmsPayment = dmsp;
		}

		for (const createdRow of [
			elecPayment,
			cashPayment,
			depositPayment,
			bonusPayment,
			certPayment,
			dmsPayment,
		]) {
			recordCreatedPaymentId(createdRow);
		}

		const primaryCandidate =
			elecPayment ||
			cashPayment ||
			depositPayment ||
			bonusPayment ||
			certPayment ||
			dmsPayment;
		if (!primaryCandidate) {
			throw new Error("Не удалось создать запись платежа в базе данных.");
		}
		newPayment = primaryCandidate;
	} else {
		const isSingleInsurance = normalizePaymentMethod(body.method) === "insurance";
		const effectiveSingleDocId = isSingleInsurance
			? (isValidUuid(ctx.guaranteeLetterId) ? ctx.guaranteeLetterId : null) ||
				(ctx.lockedDmsLetter?.id && isValidUuid(ctx.lockedDmsLetter.id) ? ctx.lockedDmsLetter.id : null) ||
				body.invoiceId ||
				body.familyGroupId ||
				null
			: body.invoiceId || body.familyGroupId || null;

		const singleLetterRef = isSingleInsurance
			? ctx.lockedDmsLetter?.letterNumber
				? ` (ГП №${ctx.lockedDmsLetter.letterNumber})`
				: ctx.guaranteeLetterId
					? ` (ГП: ${ctx.guaranteeLetterId})`
					: ""
			: "";

		const [np] = await tx
			.insert(payments)
			.values({
				organizationId: orgId,
				patientId: resolvedPatientId,
				visitId: effectiveVisitId,
				documentId: effectiveSingleDocId,
				clientMutationId: effectiveMutationId,
				amountRub: amountRubNumber,
				amountKopecks: totalKopecks,
				method: normalizePaymentMethod(body.method),
				status: "paid",
				paidAt: new Date(),
				fiscalReceiptNumber: receiptNumber,
				fiscalReceiptIssuedAt: issuedAt,
				payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
				payerInn: body.payerInn || body.buyerInn || null,
				payerBirthDate: body.payerBirthDate || null,
				payerIdentityDocument: body.payerIdentityDocument || null,
				payerRelationship: body.payerRelationship || null,
				taxDeductionCode: effectiveTaxCode,
				note:
					body.note
						? isSingleInsurance && !body.note.includes("ДМС")
							? `${body.note} (ДМС${singleLetterRef})`
							: body.note
						: (body.isAdvanceDeposit
								? body.familyGroupId
									? "Внесение аванса (семейный депозит)"
									: "Внесение авансового депозита"
								: isSingleInsurance
									? `Оплата ДМС${singleLetterRef}`
									: `Оплата через кассу (${body.method || "card"})`),
			})
			.returning();

		if (!np) {
			throw new Error("Не удалось создать запись платежа в базе данных.");
		}
		newPayment = np;
	}

	ctx.newPayment = newPayment;
	recordCreatedPaymentId(newPayment);
	return { success: true };
}
