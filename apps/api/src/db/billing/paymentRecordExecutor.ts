/**
 * paymentRecordExecutor.ts — Layer 2: Payment Insertions & Wallet/Insurance Deductions.
 *
 * Implements:
 * - Atomic insertions into schema.payments (single or multi-tender split items)
 * - DMS insurance guarantee letter coverage tracking (schema.dmsGuaranteeLetters)
 * - Family wallet deposit deduction with relationship verification & permissions ([LOY-06])
 * - Atomic bonus balance deduction via Two-Phase Hold/Commit in transaction ([LOY-02 & LOY-03])
 *
 * Mandatory /decomposer invariant:
 * - Transaction client tx passed as FIRST argument to ensure single ACID boundary.
 */

import { type CreatePaymentInput, normalizePaymentMethod } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { TenantDb } from "../client.js";
import * as schema from "../schema.js";
import { deductUnspentPointsFifo, processPatientExpiredBonuses } from "../../routes/loyaltyModules/bonusBalanceService.js";
import { buildPatientLedgers, patientAccountBalanceKopecks } from "../../money/patientDebt.js";
import { verifyFamilySpendAuthorization } from "../../services/familyWallet/modules/familySpendAuthorization.js";
import type { ResolvedPaymentSplit } from "./paymentSplitValidation.js";
import type { LockedPatientForBilling } from "./types.js";

export async function executePaymentInsertAndBalanceDeductions(
	tx: TenantDb,
	params: {
		readonly organizationId: string;
		readonly input: CreatePaymentInput;
		readonly lockedPatient: LockedPatientForBilling;
		readonly split: ResolvedPaymentSplit;
		readonly effectivePaymentNote: string | null;
	},
): Promise<typeof schema.payments.$inferSelect> {
	const { organizationId, input, lockedPatient, split, effectivePaymentNote } = params;
	const patientId = lockedPatient.id;
	const {
		isSplit,
		resolvedCashKop,
		resolvedElectronicKop,
		resolvedDmsKop,
		resolvedDepositKop,
		resolvedBonusKop,
	} = split;

	const tenderCount =
		(resolvedCashKop > 0 ? 1 : 0) +
		(resolvedElectronicKop > 0 ? 1 : 0) +
		(resolvedDmsKop > 0 ? 1 : 0) +
		(resolvedDepositKop > 0 ? 1 : 0) +
		((resolvedBonusKop ?? 0) > 0 ? 1 : 0);

	if (isSplit && tenderCount > 1) {
		// Phase 1 (Hold & Pre-validation): Pre-verify family and bonus funds before creating payment records
		if (resolvedDepositKop > 0) {
			await verifyFamilySpendPermission(tx, {
				organizationId,
				familyGroupId: lockedPatient.familyGroupId,
				patientId,
				deductionKop: resolvedDepositKop,
			});
		}

		let preLockedBonusBalance: typeof schema.patientBonusBalances.$inferSelect | null = null;
		if ((resolvedBonusKop ?? 0) > 0) {
			preLockedBonusBalance = await holdAndVerifyBonusBalance(tx, {
				organizationId,
				patientId,
				bonusKopecks: resolvedBonusKop,
			});
		}

		let cashPayment: typeof schema.payments.$inferSelect | undefined;
		let electronicPayment: typeof schema.payments.$inferSelect | undefined;
		let dmsPayment: typeof schema.payments.$inferSelect | undefined;
		let depositPayment: typeof schema.payments.$inferSelect | undefined;
		let bonusPayment: typeof schema.payments.$inferSelect | undefined;

		if (resolvedCashKop > 0) {
			const cashAmountRub = Number((resolvedCashKop / 100).toFixed(2));
			const [cp] = await tx
				.insert(schema.payments)
				.values({
					organizationId,
					patientId,
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
					patientId,
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
					patientId,
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
					const curUsedKop = Math.round(Number(letter.usedAmountRub || 0) * 100);
					const maxCovKop = Math.round(Number(letter.maxCoverageRub || 0) * 100);
					const isOverdraftAllowed = Boolean(
						input.allowOverdraft ||
						input.isUrgentCare ||
						input.isEmergency ||
						input.hasAcutePain ||
						(input.note && /(острая боль|экстрен|неотлож|urgent|emergency|overdraft)/i.test(input.note)),
					);
					if (maxCovKop > 0 && curUsedKop + resolvedDmsKop > maxCovKop && !isOverdraftAllowed) {
						const availableRub = ((maxCovKop - curUsedKop) / 100).toFixed(2);
						throw new Error(
							`Превышен лимит покрытия гарантийного письма ДМС (доступно: ${availableRub} ₽, запрошено: ${dmsAmountRub.toFixed(2)} ₽). Оформите доплату пациентом.`,
						);
					}
					const nextUsed = Number(((curUsedKop + resolvedDmsKop) / 100).toFixed(2));
					const nextStatus = (maxCovKop > 0 && curUsedKop + resolvedDmsKop >= maxCovKop) ? "exhausted" : letter.status;
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
					patientId,
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
				patientId,
				deductionKop: resolvedDepositKop,
			});
		}

		if ((resolvedBonusKop ?? 0) > 0) {
			const bonusAmountRub = Number((resolvedBonusKop / 100).toFixed(2));
			const [bp] = await tx
				.insert(schema.payments)
				.values({
					organizationId,
					patientId,
					visitId: input.visitId || null,
					documentId: input.documentId || null,
					amountRub: bonusAmountRub,
					method: "other", // Canonical Postgres enum for loyalty bonus payments
					fiscalReceiptNumber: input.fiscalReceiptNumber || null,
					fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
					fiscalReceiptUrl: input.fiscalReceiptUrl || null,
					fiscalReceipt: input.fiscalReceipt || null,
					clientMutationId: input.clientMutationId
						? `${input.clientMutationId}:bonus`
						: null,
					payerFullName: input.payerFullName || null,
					payerInn: input.payerInn || null,
					payerBirthDate: input.payerBirthDate || null,
					payerIdentityDocument: input.payerIdentityDocument || null,
					payerRelationship: input.payerRelationship || null,
					taxDeductionCode: input.taxDeductionCode || null,
					note: effectivePaymentNote
						? `${effectivePaymentNote} (списание бонусов: ${bonusAmountRub} б.)`
						: `Смешанная оплата (списание бонусов: ${bonusAmountRub} б.)`,
					status: "paid",
				})
				.returning();
			bonusPayment = bp;

			// Phase 2 (Commit): Commit bonus deduction
			await commitBonusDeduction(tx, {
				organizationId,
				patientId,
				bonusKopecks: resolvedBonusKop,
				lockedBalance: preLockedBonusBalance,
				invoiceId: input.documentId,
				clientMutationId: input.clientMutationId,
				effectivePaymentNote,
				paymentId: bp?.id,
			});
		}

		const chosenPrimary = electronicPayment ?? cashPayment ?? depositPayment ?? bonusPayment ?? dmsPayment;
		if (!chosenPrimary) {
			throw new Error("Не удалось создать записи смешанной оплаты в базе данных.");
		}
		return chosenPrimary;
	}

	const isBonusMethod =
		(input.method as string) === "bonus" ||
		input.method === "loyalty_points" ||
		((input.method === "split" || input.method === "mixed") &&
			(resolvedBonusKop ?? 0) > 0 &&
			resolvedCashKop === 0 &&
			resolvedElectronicKop === 0 &&
			resolvedDepositKop === 0 &&
			resolvedDmsKop === 0);

	const effectiveMethod = (input.method === "split" || input.method === "mixed")
		? (resolvedDmsKop > 0
			? "insurance"
			: resolvedCashKop > 0
				? "cash"
				: resolvedDepositKop > 0
					? "family_wallet"
					: isBonusMethod
						? "other"
						: "card")
		: isBonusMethod
			? "other"
			: normalizePaymentMethod(input.method as string);

	if (effectiveMethod === "family_wallet") {
		const singleDepositKop = Math.round(input.amountRub * 100);
		await verifyFamilySpendPermission(tx, {
			organizationId,
			familyGroupId: lockedPatient.familyGroupId,
			patientId,
			deductionKop: singleDepositKop,
		});
		await deductFamilyWalletBalance(tx, {
			organizationId,
			familyGroupId: lockedPatient.familyGroupId,
			patientId,
			deductionKop: singleDepositKop,
		});
	}

	let singleLockedBonus: typeof schema.patientBonusBalances.$inferSelect | null = null;
	if (isBonusMethod) {
		const singleBonusKop = (resolvedBonusKop && resolvedBonusKop > 0)
			? resolvedBonusKop
			: Math.round(input.amountRub * 100);
		singleLockedBonus = await holdAndVerifyBonusBalance(tx, {
			organizationId,
			patientId,
			bonusKopecks: singleBonusKop,
		});
	}

	const [singlePayment] = await tx
		.insert(schema.payments)
		.values({
			organizationId,
			patientId,
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

	if (isBonusMethod && singleLockedBonus) {
		const singleBonusKop = (resolvedBonusKop && resolvedBonusKop > 0)
			? resolvedBonusKop
			: Math.round(input.amountRub * 100);
		await commitBonusDeduction(tx, {
			organizationId,
			patientId,
			bonusKopecks: singleBonusKop,
			lockedBalance: singleLockedBonus,
			invoiceId: input.documentId,
			clientMutationId: input.clientMutationId,
			effectivePaymentNote,
			paymentId: singlePayment.id,
		});
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
			const curUsedKop = Math.round(Number(letter.usedAmountRub || 0) * 100);
			const maxCovKop = Math.round(Number(letter.maxCoverageRub || 0) * 100);
			const requestedKop = Math.round(input.amountRub * 100);
			const isOverdraftAllowed = Boolean(
				input.allowOverdraft ||
				input.isUrgentCare ||
				input.isEmergency ||
				input.hasAcutePain ||
				(input.note && /(острая боль|экстрен|неотлож|urgent|emergency|overdraft)/i.test(input.note)),
			);
			if (maxCovKop > 0 && curUsedKop + requestedKop > maxCovKop && !isOverdraftAllowed) {
				const availableRub = ((maxCovKop - curUsedKop) / 100).toFixed(2);
				throw new Error(
					`Превышен лимит покрытия гарантийного письма ДМС (доступно: ${availableRub} ₽, запрошено: ${input.amountRub.toFixed(2)} ₽). Оформите доплату пациентом.`,
				);
			}
			const nextUsed = Number(((curUsedKop + requestedKop) / 100).toFixed(2));
			const nextStatus = (maxCovKop > 0 && curUsedKop + requestedKop >= maxCovKop) ? "exhausted" : letter.status;
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

/**
 * verifyFamilySpendPermission
 *
 * Implements strict BOLA/IDOR protection ([LOY-06]):
 * Delegates to centralized `verifyFamilySpendAuthorization` (SSOT) for family wallet authorization.
 * For solo patients without family group, verifies personal advance deposit.
 */
async function verifyFamilySpendPermission(
	tx: TenantDb,
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

	// Соло-пациент без семейной группы: оплата производится с индивидуального депозитного счета пациента (Мандат 8e, 8n)
	if (!targetFamilyGroupId) {
		const [chargeRows, paymentRows] = await Promise.all([
			tx
				.select({
					patientId: schema.treatmentItems.patientId,
					status: schema.treatmentItems.status,
					unitPriceRub: schema.treatmentItems.unitPriceRub,
					quantity: schema.treatmentItems.quantity,
					discountRub: schema.treatmentItems.discountRub,
				})
				.from(schema.treatmentItems)
				.where(
					and(
						eq(schema.treatmentItems.organizationId, organizationId),
						eq(schema.treatmentItems.patientId, patientId),
					),
				),
			tx
				.select({
					patientId: schema.payments.patientId,
					status: schema.payments.status,
					amountRub: schema.payments.amountRub,
				})
				.from(schema.payments)
				.where(
					and(
						eq(schema.payments.organizationId, organizationId),
						eq(schema.payments.patientId, patientId),
					),
				),
		]);

		const ledger = buildPatientLedgers(chargeRows, paymentRows).get(patientId);
		const personalBalanceKop = ledger ? patientAccountBalanceKopecks(ledger) : 0;

		const advanceTaggings = await tx
			.select({ depositAmountRub: schema.advanceDepositTaggings.depositAmountRub })
			.from(schema.advanceDepositTaggings)
			.where(
				and(
					eq(schema.advanceDepositTaggings.organizationId, organizationId),
					eq(schema.advanceDepositTaggings.patientId, patientId),
					eq(schema.advanceDepositTaggings.allocationStatus, "unallocated"),
				),
			);
		const taggedAdvanceKop = advanceTaggings.reduce(
			(acc, t) => acc + Math.round(Number(t.depositAmountRub || 0) * 100),
			0,
		);

		const effectiveAvailableKop = Math.max(personalBalanceKop, taggedAdvanceKop);

		if (effectiveAvailableKop < deductionKop && personalBalanceKop < deductionKop) {
			const availableRub = ((effectiveAvailableKop > 0 ? effectiveAvailableKop : 0) / 100).toFixed(2);
			const requiredRub = (deductionKop / 100).toFixed(2);
			throw new Error(
				`Недостаточно средств на личном депозите пациента. Доступно: ${availableRub} ₽, требуется: ${requiredRub} ₽.`,
			);
		}
		// Индивидуальный депозит соло-пациента успешно проверен
		return;
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

	// [LOY-06] & Mandate 8bf: Delegated to canonical SSOT verifyFamilySpendAuthorization
	await verifyFamilySpendAuthorization({
		tx,
		organizationId,
		family: famGroup,
		patientId,
		debitKopecks: deductionKop,
	});
}

async function deductFamilyWalletBalance(
	tx: TenantDb,
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

	// Для соло-пациента без семейной группы: списываем строки из advanceDepositTaggings (защита от Double-Spend)
	if (!targetFamilyGroupId) {
		const activeTaggings = await tx
			.select()
			.from(schema.advanceDepositTaggings)
			.where(
				and(
					eq(schema.advanceDepositTaggings.organizationId, organizationId),
					eq(schema.advanceDepositTaggings.patientId, patientId),
					eq(schema.advanceDepositTaggings.allocationStatus, "unallocated"),
				),
			)
			.for("update");

		let remainingToDeductKop = deductionKop;
		for (const tag of activeTaggings) {
			if (remainingToDeductKop <= 0) break;
			const tagKop = Math.round(Number(tag.depositAmountRub || 0) * 100);
			if (tagKop <= remainingToDeductKop) {
				remainingToDeductKop -= tagKop;
				await tx
					.update(schema.advanceDepositTaggings)
					.set({ allocationStatus: "spent" })
					.where(eq(schema.advanceDepositTaggings.id, tag.id));
			} else {
				const nextTagKop = tagKop - remainingToDeductKop;
				remainingToDeductKop = 0;
				await tx
					.update(schema.advanceDepositTaggings)
					.set({ depositAmountRub: (nextTagKop / 100).toFixed(2) })
					.where(eq(schema.advanceDepositTaggings.id, tag.id));
			}
		}

		if (remainingToDeductKop > 0) {
			const [pat] = await tx
				.select({ fullName: schema.patients.fullName })
				.from(schema.patients)
				.where(and(eq(schema.patients.id, patientId), eq(schema.patients.organizationId, organizationId)))
				.limit(1);

			// Если аванс был зафиксирован через общий леджер без предварительного тегирования,
			// фиксируем списание аванса через advanceDepositTaggings со статусом spent
			await tx.insert(schema.advanceDepositTaggings).values({
				organizationId,
				patientId,
				patientName: pat?.fullName || "Пациент клиники",
				depositAmountRub: (remainingToDeductKop / 100).toFixed(2),
				taggedTargetType: "treatment_plan",
				taggedTargetName: "Списание личного аванса по платежу",
				allocationStatus: "spent",
			});
		}
		return;
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

	if (!famGroup) return;

	const currentFamKop = Math.round(Number(famGroup.balance || 0) * 100);
	const newFamKop = currentFamKop - deductionKop;
	const newFamRub = (newFamKop / 100).toFixed(2);
	await tx
		.update(schema.familyGroups)
		.set({
			balance: newFamRub,
			updatedAt: new Date(),
		})
		.where(eq(schema.familyGroups.id, famGroup.id));
}

/**
 * holdAndVerifyBonusBalance (Phase 1 of Two-Phase Hold/Commit)
 */
async function holdAndVerifyBonusBalance(
	tx: TenantDb,
	params: {
		readonly organizationId: string;
		readonly patientId: string;
		readonly bonusKopecks: number;
	},
): Promise<typeof schema.patientBonusBalances.$inferSelect> {
	const { organizationId, patientId, bonusKopecks } = params;
	const pointsToDeduct = Number((bonusKopecks / 100).toFixed(2));

	// JIT TTL: expire any overdue bonuses before locking balance
	await processPatientExpiredBonuses(tx, organizationId, patientId);

	const [balance] = await tx
		.select()
		.from(schema.patientBonusBalances)
		.where(
			and(
				eq(schema.patientBonusBalances.organizationId, organizationId),
				eq(schema.patientBonusBalances.patientId, patientId),
			),
		)
		.for("update")
		.limit(1);

	if (!balance) {
		throw new Error("Счет бонусов пациента не найден.");
	}

	const activePoints = Number(balance.activePoints ?? 0);
	if (activePoints < pointsToDeduct) {
		throw new Error(
			`Недостаточно бонусов на счете пациента. Доступно: ${activePoints} б., требуется: ${pointsToDeduct} б.`,
		);
	}

	return balance;
}

/**
 * commitBonusDeduction (Phase 2 of Two-Phase Hold/Commit)
 */
async function commitBonusDeduction(
	tx: TenantDb,
	params: {
		readonly organizationId: string;
		readonly patientId: string;
		readonly bonusKopecks: number;
		readonly lockedBalance?: typeof schema.patientBonusBalances.$inferSelect | null | undefined;
		readonly invoiceId?: string | null | undefined;
		readonly clientMutationId?: string | null | undefined;
		readonly effectivePaymentNote?: string | null | undefined;
		readonly paymentId?: string | null | undefined;
	},
): Promise<void> {
	const { organizationId, patientId, bonusKopecks, lockedBalance, invoiceId, clientMutationId, effectivePaymentNote, paymentId } = params;
	if (bonusKopecks <= 0) return;

	const pointsToDeduct = Number((bonusKopecks / 100).toFixed(2));
	const balance = lockedBalance ?? (await holdAndVerifyBonusBalance(tx, { organizationId, patientId, bonusKopecks }));

	const activePoints = Number(balance.activePoints ?? 0);
	const newActivePoints = Number((activePoints - pointsToDeduct).toFixed(2));
	const newLifetimeSpent = Number((Number(balance.lifetimeSpentPoints ?? 0) + pointsToDeduct).toFixed(2));

	await tx
		.update(schema.patientBonusBalances)
		.set({
			activePoints: String(newActivePoints),
			lifetimeSpentPoints: String(newLifetimeSpent),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(schema.patientBonusBalances.organizationId, organizationId),
				eq(schema.patientBonusBalances.patientId, patientId),
			),
		);

	await tx.insert(schema.bonusTransactions).values({
		organizationId,
		patientId,
		amountPoints: String(-pointsToDeduct),
		balanceAfterPoints: String(newActivePoints),
		type: "redemption_payment",
		relatedPaymentId: paymentId || null,
		relatedInvoiceId: invoiceId || null,
		clientMutationId: clientMutationId ? `${clientMutationId}:bonus` : null,
		description: effectivePaymentNote || `Списание бонусов в кассе (${pointsToDeduct} б.)`,
	});

	// FIFO: Deduct from earliest expiring accrual batches first
	await deductUnspentPointsFifo(tx, { orgId: organizationId, patientId, pointsToDeduct });
}

