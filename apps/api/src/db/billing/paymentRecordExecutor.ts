/**
 * paymentRecordExecutor.ts — Layer 2: Payment Insertions & Wallet/Insurance Deductions.
 *
 * Implements:
 * - Atomic insertions into schema.payments (single or multi-tender split items)
 * - DMS insurance guarantee letter coverage tracking (schema.dmsGuaranteeLetters)
 * - Family wallet deposit deduction with atomic balance update (schema.familyGroups)
 *
 * Mandatory /decomposer invariant:
 * - Transaction client tx passed as FIRST argument to ensure single ACID boundary.
 */

import { type CreatePaymentInput, normalizePaymentMethod } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import * as schema from "../schema.js";
import type { ResolvedPaymentSplit } from "./paymentSplitValidation.js";
import type { LockedPatientForBilling } from "./types.js";

export async function executePaymentInsertAndBalanceDeductions(
	tx: any,
	params: {
		readonly organizationId: string;
		readonly input: CreatePaymentInput;
		readonly lockedPatient: LockedPatientForBilling;
		readonly split: ResolvedPaymentSplit;
		readonly effectivePaymentNote: string | null;
	},
): Promise<typeof schema.payments.$inferSelect> {
	const { organizationId, input, lockedPatient, split, effectivePaymentNote } = params;
	const { isSplit, resolvedCashKop, resolvedElectronicKop, resolvedDmsKop, resolvedDepositKop } = split;

	const tenderCount =
		(resolvedCashKop > 0 ? 1 : 0) +
		(resolvedElectronicKop > 0 ? 1 : 0) +
		(resolvedDmsKop > 0 ? 1 : 0) +
		(resolvedDepositKop > 0 ? 1 : 0);

	if (isSplit && tenderCount > 1) {
		let cashPayment: typeof schema.payments.$inferSelect | undefined;
		let electronicPayment: typeof schema.payments.$inferSelect | undefined;
		let dmsPayment: typeof schema.payments.$inferSelect | undefined;
		let depositPayment: typeof schema.payments.$inferSelect | undefined;

		if (resolvedCashKop > 0) {
			const cashAmountRub = Number((resolvedCashKop / 100).toFixed(2));
			const [cp] = await tx
				.insert(schema.payments)
				.values({
					organizationId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					documentId: input.documentId || null,
					amountRub: cashAmountRub,
					method: "cash",
					fiscalReceiptNumber: input.fiscalReceiptNumber || null,
					fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
					fiscalReceiptUrl: input.fiscalReceiptUrl || null,
					fiscalReceipt: input.fiscalReceipt || null,
					clientMutationId: input.clientMutationId
						? `${input.clientMutationId}:cash`
						: null,
					payerFullName: input.payerFullName || null,
					payerInn: input.payerInn || null,
					payerBirthDate: input.payerBirthDate || null,
					payerIdentityDocument: input.payerIdentityDocument || null,
					payerRelationship: input.payerRelationship || null,
					taxDeductionCode: input.taxDeductionCode || null,
					note: effectivePaymentNote
						? `${effectivePaymentNote} (наличные: ${cashAmountRub} ₽)`
						: `Смешанная оплата (наличные: ${cashAmountRub} ₽)`,
					status: "paid",
				})
				.returning();
			cashPayment = cp;
		}

		if (resolvedElectronicKop > 0) {
			const electronicAmountRub = Number((resolvedElectronicKop / 100).toFixed(2));
			const [ep] = await tx
				.insert(schema.payments)
				.values({
					organizationId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					documentId: input.documentId || null,
					amountRub: electronicAmountRub,
					method: "card",
					fiscalReceiptNumber: input.fiscalReceiptNumber || null,
					fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
					fiscalReceiptUrl: input.fiscalReceiptUrl || null,
					fiscalReceipt: input.fiscalReceipt || null,
					clientMutationId: input.clientMutationId
						? `${input.clientMutationId}:electronic`
						: null,
					payerFullName: input.payerFullName || null,
					payerInn: input.payerInn || null,
					payerBirthDate: input.payerBirthDate || null,
					payerIdentityDocument: input.payerIdentityDocument || null,
					payerRelationship: input.payerRelationship || null,
					taxDeductionCode: input.taxDeductionCode || null,
					note: effectivePaymentNote
						? `${effectivePaymentNote} (безналичные: ${electronicAmountRub} ₽)`
						: `Смешанная оплата (безналичные: ${electronicAmountRub} ₽)`,
					status: "paid",
				})
				.returning();
			electronicPayment = ep;
		}

		if (resolvedDmsKop > 0) {
			const dmsAmountRub = Number((resolvedDmsKop / 100).toFixed(2));
			const [dp] = await tx
				.insert(schema.payments)
				.values({
					organizationId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					documentId: input.documentId || null,
					amountRub: dmsAmountRub,
					method: "insurance",
					fiscalReceiptNumber: input.fiscalReceiptNumber || null,
					fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
					fiscalReceiptUrl: input.fiscalReceiptUrl || null,
					fiscalReceipt: input.fiscalReceipt || null,
					clientMutationId: input.clientMutationId
						? `${input.clientMutationId}:dms`
						: null,
					payerFullName: input.payerFullName || null,
					payerInn: input.payerInn || null,
					payerBirthDate: input.payerBirthDate || null,
					payerIdentityDocument: input.payerIdentityDocument || null,
					payerRelationship: input.payerRelationship || null,
					taxDeductionCode: input.taxDeductionCode || null,
					note: effectivePaymentNote
						? `${effectivePaymentNote} (страховая часть ДМС: ${dmsAmountRub} ₽)`
						: `Смешанная оплата (страховая часть ДМС: ${dmsAmountRub} ₽)`,
					status: "paid",
				})
				.returning();
			dmsPayment = dp;

			if (input.guaranteeLetterId && input.guaranteeLetterId !== "emergency" && input.guaranteeLetterId !== "none") {
				const [letter] = await tx
					.select()
					.from(schema.dmsGuaranteeLetters)
					.where(
						and(
							eq(schema.dmsGuaranteeLetters.id, input.guaranteeLetterId),
							eq(schema.dmsGuaranteeLetters.organizationId, organizationId),
						),
					)
					.for("update")
					.limit(1);

				if (letter) {
					const nextUsed = Number(letter.usedAmountRub) + dmsAmountRub;
					const nextStatus = nextUsed >= Number(letter.maxCoverageRub) ? "exhausted" : letter.status;
					await tx
						.update(schema.dmsGuaranteeLetters)
						.set({
							usedAmountRub: nextUsed,
							status: nextStatus,
							updatedAt: new Date(),
						})
						.where(eq(schema.dmsGuaranteeLetters.id, letter.id));
				}
			}
		}

		if (resolvedDepositKop > 0) {
			const depositAmountRub = Number((resolvedDepositKop / 100).toFixed(2));
			const [depP] = await tx
				.insert(schema.payments)
				.values({
					organizationId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					documentId: input.documentId || null,
					amountRub: depositAmountRub,
					method: "family_wallet",
					fiscalReceiptNumber: input.fiscalReceiptNumber || null,
					fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
					fiscalReceiptUrl: input.fiscalReceiptUrl || null,
					fiscalReceipt: input.fiscalReceipt || null,
					clientMutationId: input.clientMutationId
						? `${input.clientMutationId}:deposit`
						: null,
					payerFullName: input.payerFullName || null,
					payerInn: input.payerInn || null,
					payerBirthDate: input.payerBirthDate || null,
					payerIdentityDocument: input.payerIdentityDocument || null,
					payerRelationship: input.payerRelationship || null,
					taxDeductionCode: input.taxDeductionCode || null,
					note: effectivePaymentNote
						? `${effectivePaymentNote} (зачёт аванса / семейный депозит: ${depositAmountRub} ₽)`
						: `Смешанная оплата (зачёт аванса / семейный депозит: ${depositAmountRub} ₽)`,
					status: "paid",
				})
				.returning();
			depositPayment = depP;

			await deductFamilyWalletBalance(tx, {
				organizationId,
				familyGroupId: lockedPatient.familyGroupId,
				patientId: input.patientId,
				deductionKop: resolvedDepositKop,
			});
		}

		const chosenPrimary = electronicPayment ?? cashPayment ?? depositPayment ?? dmsPayment;
		if (!chosenPrimary) {
			throw new Error("Не удалось создать записи смешанной оплаты в базе данных.");
		}
		return chosenPrimary;
	}

	const effectiveMethod = (input.method === "split" || input.method === "mixed")
		? (resolvedDmsKop > 0 ? "insurance" : resolvedCashKop > 0 ? "cash" : resolvedDepositKop > 0 ? "family_wallet" : "card")
		: normalizePaymentMethod(input.method as string);

	if (effectiveMethod === "family_wallet") {
		const singleDepositKop = Math.round(input.amountRub * 100);
		await deductFamilyWalletBalance(tx, {
			organizationId,
			familyGroupId: lockedPatient.familyGroupId,
			patientId: input.patientId,
			deductionKop: singleDepositKop,
		});
	}

	const [singlePayment] = await tx
		.insert(schema.payments)
		.values({
			organizationId,
			patientId: input.patientId,
			visitId: input.visitId || null,
			documentId: input.documentId || null,
			amountRub: input.amountRub,
			method: effectiveMethod,
			fiscalReceiptNumber: input.fiscalReceiptNumber || null,
			fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
			fiscalReceiptUrl: input.fiscalReceiptUrl || null,
			fiscalReceipt: input.fiscalReceipt || null,
			clientMutationId: input.clientMutationId || null,
			payerFullName: input.payerFullName || null,
			payerInn: input.payerInn || null,
			payerBirthDate: input.payerBirthDate || null,
			payerIdentityDocument: input.payerIdentityDocument || null,
			payerRelationship: input.payerRelationship || null,
			taxDeductionCode: input.taxDeductionCode || null,
			note: effectivePaymentNote,
			status: "paid",
		})
		.returning();

	if (!singlePayment) {
		throw new Error("Не удалось создать запись платежа в базе данных.");
	}

	if (
		effectiveMethod === "insurance" &&
		input.guaranteeLetterId &&
		input.guaranteeLetterId !== "emergency" &&
		input.guaranteeLetterId !== "none"
	) {
		const [letter] = await tx
			.select()
			.from(schema.dmsGuaranteeLetters)
			.where(
				and(
					eq(schema.dmsGuaranteeLetters.id, input.guaranteeLetterId),
					eq(schema.dmsGuaranteeLetters.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);

		if (letter) {
			const nextUsed = Number(letter.usedAmountRub) + input.amountRub;
			const nextStatus = nextUsed >= Number(letter.maxCoverageRub) ? "exhausted" : letter.status;
			await tx
				.update(schema.dmsGuaranteeLetters)
				.set({
					usedAmountRub: nextUsed,
					status: nextStatus,
					updatedAt: new Date(),
				})
				.where(eq(schema.dmsGuaranteeLetters.id, letter.id));
		}
	}

	return singlePayment;
}

async function deductFamilyWalletBalance(
	tx: any,
	params: {
		readonly organizationId: string;
		readonly familyGroupId: string | null;
		readonly patientId: string;
		readonly deductionKop: number;
	},
): Promise<void> {
	const { organizationId, familyGroupId, patientId, deductionKop } = params;
	if (deductionKop <= 0) return;

	let targetFamilyGroupId = familyGroupId;
	if (!targetFamilyGroupId) {
		const [foundFamily] = await tx
			.select({ id: schema.familyGroups.id })
			.from(schema.familyGroups)
			.where(
				and(
					eq(schema.familyGroups.organizationId, organizationId),
					eq(schema.familyGroups.headPatientId, patientId),
				),
			)
			.limit(1);
		if (foundFamily) {
			targetFamilyGroupId = foundFamily.id;
		}
	}

	if (!targetFamilyGroupId) {
		throw new Error("Не найдена семейная группа для списания средств с семейного депозита.");
	}

	const [famGroup] = await tx
		.select()
		.from(schema.familyGroups)
		.where(
			and(
				eq(schema.familyGroups.id, targetFamilyGroupId),
				eq(schema.familyGroups.organizationId, organizationId),
			),
		)
		.for("update")
		.limit(1);

	if (!famGroup) {
		throw new Error("Семейная группа не найдена или заблокирована другой операцией.");
	}

	const currentFamKop = Math.round(Number(famGroup.balance || 0) * 100);
	if (currentFamKop < deductionKop) {
		throw new Error(
			`Недостаточно средств на семейном счете. Доступно: ${(currentFamKop / 100).toFixed(2)} ₽, требуется: ${(deductionKop / 100).toFixed(2)} ₽.`,
		);
	}

	const newFamKop = currentFamKop - deductionKop;
	const newFamRub = (newFamKop / 100).toFixed(2);
	await tx
		.update(schema.familyGroups)
		.set({
			balance: newFamRub,
		})
		.where(eq(schema.familyGroups.id, famGroup.id));
}
