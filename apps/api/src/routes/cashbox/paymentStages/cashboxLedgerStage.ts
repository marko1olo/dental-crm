/**
 * apps/api/src/routes/cashbox/paymentStages/cashboxLedgerStage.ts
 *
 * Stage 9: Cash Desk / Cashless Ledger Postings, Shift 24h Verification & Balance Updates.
 * Governed by Mandate 8e, 8n, 8bm, 8bo (54-FZ & Cashbox Shifts).
 */

import { and, eq, sql } from "drizzle-orm";
import {
	kopecksToRub,
	kopecksToRubles,
	rubToKopecks,
} from "@dental/shared";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
} from "../../../db/schema.js";
import { withSavepoint } from "../../../db/rls.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import type { PaymentProcessingContext, StageStepResult, TenantDb } from "./types.js";

export async function processCashboxLedgerStage(
	tx: TenantDb,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (ctx.isWarrantyPayment) {
		return { success: true };
	}

	const {
		orgId,
		body,
		effectiveMutationId,
		resolvedPatientId,
		receiptNumber,
		resolvedCashKop,
		resolvedElecKop,
		requiredDepositKopecks,
		requiredBonusKopecks,
		requiredCertificateKopecks,
		requiredDmsKopecks,
		certificateNumber,
		lockedDmsLetter,
		isEmergencyLetterAlias,
	} = ctx;

	// 1. Поиск и блокировка касс клиники
	let boxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId))
		.orderBy(cashBoxes.id)
		.for("update");

	if (boxes.length === 0) {
		const isRealTransaction =
			"rollback" in tx ||
			"query" in tx ||
			"_" in tx;
		if (isRealTransaction) {
			try {
				await withSavepoint(tx, async (spTx) => {
					const seeded = await ensureOrganizationCashBoxes(spTx, orgId);
					boxes = seeded.boxes;
				});
			} catch (err) {
				ctx.logger?.error({ err, orgId }, "[cashboxLedgerStage] Failed to ensure cash boxes");
			}
		}
	}

	if (boxes.length === 0) {
		ctx.logger?.error({ orgId }, "[cashboxLedgerStage] Cashbox ledger unavailable: no cash boxes found for organization");
		throw new Error("CASHBOX_LEDGER_UNAVAILABLE");
	}

	const cashDeskBox =
		boxes.find((b) => b.type === "main" || b.type === "cash_desk") ||
		boxes.find((b) => b.isMain && !b.isCashless) ||
		boxes.find((b) => !b.isCashless) ||
		boxes[0];
	const cashlessBox =
		boxes.find((b) => b.type === "cashless" || b.type === "bank_account") ||
		boxes.find((b) => b.isCashless) ||
		boxes[1] ||
		cashDeskBox;
	const dmsBox =
		boxes.find((b) => b.type === "dms" || b.type === "insurance") ||
		cashlessBox;

	ctx.cashDeskBox = cashDeskBox;
	ctx.cashlessBox = cashlessBox;
	ctx.dmsBox = dmsBox;

	// 2. Поиск активных кассовых смен и проверка лимита 24ч (п. 1 ст. 4.3 54-ФЗ)
	const openShifts = await tx
		.select()
		.from(cashBoxShifts)
		.where(
			and(
				eq(cashBoxShifts.organizationId, orgId),
				eq(cashBoxShifts.status, "open"),
			),
		)
		.for("update");

	const nowForShiftCheck = new Date();
	for (const shift of openShifts) {
		if (shift.openedAt) {
			const durationMs = nowForShiftCheck.getTime() - new Date(shift.openedAt).getTime();
			if (durationMs > 24 * 60 * 60 * 1000) {
				return {
					failure: {
						kind: "shift_expired",
						shiftNumber: shift.shiftNumber,
						openedAt: shift.openedAt,
					},
				};
			}
		}
	}

	const cashDeskShift =
		openShifts.find((s) => s.cashBoxId === cashDeskBox?.id) ??
		(!cashDeskBox ? (openShifts[0] ?? null) : null);
	const cashlessShift =
		openShifts.find((s) => s.cashBoxId === cashlessBox?.id) ?? null;
	const dmsShift =
		openShifts.find((s) => s.cashBoxId === dmsBox?.id) ?? null;

	ctx.cashDeskShift = cashDeskShift;
	ctx.cashlessShift = cashlessShift;
	ctx.dmsShift = dmsShift;

	// 3. Кассовые проводки в cashOperations (целые копейки без float-дрейфа)
	let currentCashDeskBalKop = BigInt(
		cashDeskBox?.balanceKopecks !== undefined && cashDeskBox?.balanceKopecks !== null
			? cashDeskBox.balanceKopecks
			: rubToKopecks(cashDeskBox?.balanceRub || 0),
	);
	let currentCashDeskBalRub = kopecksToRub(Number(currentCashDeskBalKop));
	if (resolvedCashKop > 0 && cashDeskBox) {
		const curBalKop = Number(currentCashDeskBalKop);
		const newBalKop = curBalKop + resolvedCashKop;
		const curBal = kopecksToRub(curBalKop);
		const addRub = kopecksToRub(resolvedCashKop);
		const newBal = kopecksToRub(newBalKop);

		const reasonTextCash = body.isAdvanceDeposit
			? body.familyGroupId
				? "Приход наличных: внесение семейного депозита"
				: "Приход наличных: внесение аванса пациента"
			: receiptNumber
				? `Приход наличных в кассу: оплата стоматологических услуг (${receiptNumber})`
				: "Приход наличных в кассу: оплата стоматологических услуг";

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashDeskBox.id,
			shiftId: cashDeskShift?.id ?? null,
			operationType: "income",
			amountRub: addRub,
			amountKopecks: resolvedCashKop,
			balanceBeforeRub: curBal,
			balanceBeforeKopecks: BigInt(curBalKop),
			balanceAfterRub: newBal,
			balanceAfterKopecks: BigInt(newBalKop),
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: reasonTextCash,
			operatorName: body.cashierFullName || "Кассир",
			metadata: {
				clientMutationId: effectiveMutationId,
				cashKopecks: resolvedCashKop,
			},
		});

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: newBal,
				balanceKopecks: newBalKop,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(cashBoxes.id, cashDeskBox.id),
					eq(cashBoxes.organizationId, orgId),
				),
			);
		currentCashDeskBalKop = BigInt(newBalKop);
		currentCashDeskBalRub = newBal;

		if (cashDeskShift && resolvedCashKop > 0) {
			const prevIncomeKop =
				cashDeskShift.incomeTotalKopecks !== undefined && cashDeskShift.incomeTotalKopecks !== null
					? Number(cashDeskShift.incomeTotalKopecks)
					: rubToKopecks(Number(cashDeskShift.incomeTotalRub || 0));
			const newIncomeKop = prevIncomeKop + resolvedCashKop;
			const newIncomeRub = kopecksToRubles(newIncomeKop);
			cashDeskShift.incomeTotalKopecks = newIncomeKop;
			cashDeskShift.incomeTotalRub = newIncomeRub;

			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: newIncomeRub,
					incomeTotalKopecks: newIncomeKop,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(cashBoxShifts.id, cashDeskShift.id),
						eq(cashBoxShifts.organizationId, orgId),
					),
				);
		}
	}

	if (resolvedElecKop > 0 && cashlessBox) {
		const curBalKop =
			cashlessBox.balanceKopecks !== undefined && cashlessBox.balanceKopecks !== null
				? Number(cashlessBox.balanceKopecks)
				: rubToKopecks(cashlessBox.balanceRub || 0);
		const newBalKop = curBalKop + resolvedElecKop;
		const curBal = kopecksToRub(curBalKop);
		const addRub = kopecksToRub(resolvedElecKop);
		const newBal = kopecksToRub(newBalKop);

		const reasonTextElec = body.isAdvanceDeposit
			? body.familyGroupId
				? "Безналичное поступление: внесение семейного депозита"
				: "Безналичное поступление: внесение аванса пациента"
			: receiptNumber
				? `Безналичное поступление: оплата стоматологических услуг (${receiptNumber})`
				: "Безналичное поступление: оплата стоматологических услуг";

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashlessBox.id,
			shiftId: cashlessShift?.id ?? null,
			operationType: "income",
			amountRub: addRub,
			amountKopecks: resolvedElecKop,
			balanceBeforeRub: curBal,
			balanceBeforeKopecks: BigInt(curBalKop),
			balanceAfterRub: newBal,
			balanceAfterKopecks: BigInt(newBalKop),
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: reasonTextElec,
			operatorName: body.cashierFullName || "Кассир",
			metadata: {
				clientMutationId: effectiveMutationId,
				electronicCardKopecks: resolvedElecKop,
			},
		});

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: newBal,
				balanceKopecks: newBalKop,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(cashBoxes.id, cashlessBox.id),
					eq(cashBoxes.organizationId, orgId),
				),
			);
		if (cashlessBox.id === cashDeskBox?.id) {
			currentCashDeskBalKop = BigInt(newBalKop);
			currentCashDeskBalRub = newBal;
		}

		if (cashlessShift && resolvedElecKop > 0) {
			const prevIncomeKop =
				cashlessShift.incomeTotalKopecks !== undefined && cashlessShift.incomeTotalKopecks !== null
					? Number(cashlessShift.incomeTotalKopecks)
					: rubToKopecks(Number(cashlessShift.incomeTotalRub || 0));
			const newIncomeKop = prevIncomeKop + resolvedElecKop;
			const newIncomeRub = kopecksToRubles(newIncomeKop);
			cashlessShift.incomeTotalKopecks = newIncomeKop;
			cashlessShift.incomeTotalRub = newIncomeRub;

			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: newIncomeRub,
					incomeTotalKopecks: newIncomeKop,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(cashBoxShifts.id, cashlessShift.id),
						eq(cashBoxShifts.organizationId, orgId),
					),
				);
		}
	}

	if (requiredDepositKopecks > 0n && cashDeskBox) {
		const depositRub = kopecksToRubles(Number(requiredDepositKopecks));
		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashDeskBox.id,
			shiftId: cashDeskShift?.id ?? null,
			operationType: "income",
			amountRub: depositRub,
			amountKopecks: Number(requiredDepositKopecks),
			balanceBeforeRub: currentCashDeskBalRub,
			balanceBeforeKopecks: currentCashDeskBalKop,
			balanceAfterRub: currentCashDeskBalRub,
			balanceAfterKopecks: currentCashDeskBalKop,
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Зачёт аванса/депозита пациента: оплата стоматологических услуг (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
			metadata: {
				clientMutationId: effectiveMutationId,
				tenderType: "deposit",
				isAdvanceOffset: true,
				depositKopecks: Number(requiredDepositKopecks),
			},
		});
	}

	if (requiredBonusKopecks > 0n && cashDeskBox) {
		const bonusRub = kopecksToRubles(Number(requiredBonusKopecks));
		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashDeskBox.id,
			shiftId: cashDeskShift?.id ?? null,
			operationType: "income",
			amountRub: bonusRub,
			amountKopecks: Number(requiredBonusKopecks),
			balanceBeforeRub: currentCashDeskBalRub,
			balanceBeforeKopecks: currentCashDeskBalKop,
			balanceAfterRub: currentCashDeskBalRub,
			balanceAfterKopecks: currentCashDeskBalKop,
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Зачёт бонусов лояльности пациента: оплата стоматологических услуг (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
			metadata: {
				clientMutationId: effectiveMutationId,
				tenderType: "bonus",
				isAdvanceOffset: true,
				bonusKopecks: Number(requiredBonusKopecks),
			},
		});
	}

	if (requiredCertificateKopecks > 0n && cashDeskBox) {
		const certRub = kopecksToRubles(Number(requiredCertificateKopecks));
		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashDeskBox.id,
			shiftId: cashDeskShift?.id ?? null,
			operationType: "income",
			amountRub: certRub,
			amountKopecks: Number(requiredCertificateKopecks),
			balanceBeforeRub: currentCashDeskBalRub,
			balanceBeforeKopecks: currentCashDeskBalKop,
			balanceAfterRub: currentCashDeskBalRub,
			balanceAfterKopecks: currentCashDeskBalKop,
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Зачёт аванса (сертификат №${certificateNumber}): оплата стоматологических услуг (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
			metadata: {
				clientMutationId: effectiveMutationId,
				tenderType: "certificate",
				isAdvanceOffset: true,
				certificateNumber,
				certificateKopecks: Number(requiredCertificateKopecks),
			},
		});
	}

	if (requiredDmsKopecks > 0n && dmsBox) {
		const dmsKop = Number(requiredDmsKopecks);
		const dmsRub = kopecksToRubles(dmsKop);
		const dmsBeforeKop =
			dmsBox.balanceKopecks != null
				? Number(dmsBox.balanceKopecks)
				: rubToKopecks(dmsBox.balanceRub || 0);
		const dmsAfterKop = dmsBeforeKop + dmsKop;
		const dmsBeforeRub = kopecksToRub(dmsBeforeKop);
		const dmsAfterRub = kopecksToRub(dmsAfterKop);

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: dmsBox.id,
			shiftId: dmsShift?.id ?? null,
			operationType: "income",
			amountRub: dmsRub,
			amountKopecks: dmsKop,
			balanceBeforeRub: dmsBeforeRub,
			balanceBeforeKopecks: BigInt(dmsBeforeKop),
			balanceAfterRub: dmsAfterRub,
			balanceAfterKopecks: BigInt(dmsAfterKop),
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Оплата по гарантийному письму ДМС (${lockedDmsLetter?.letterNumber || (isEmergencyLetterAlias ? "ЭКСТРЕННО (досылка)" : "б/н")}): стоматологические услуги (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
			metadata: {
				clientMutationId: effectiveMutationId,
				tenderType: "dms",
				dmsKopecks: dmsKop,
			},
		});

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: dmsAfterRub,
				balanceKopecks: dmsAfterKop,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, dmsBox.id), eq(cashBoxes.organizationId, orgId)));

		if (dmsShift) {
			const prevDmsIncomeKop =
				dmsShift.incomeTotalKopecks != null
					? Number(dmsShift.incomeTotalKopecks)
					: rubToKopecks(Number(dmsShift.incomeTotalRub || 0));
			const newDmsIncomeKop = prevDmsIncomeKop + dmsKop;
			const newDmsIncomeRub = kopecksToRubles(newDmsIncomeKop);
			dmsShift.incomeTotalKopecks = newDmsIncomeKop;
			dmsShift.incomeTotalRub = newDmsIncomeRub;

			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: newDmsIncomeRub,
					incomeTotalKopecks: newDmsIncomeKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, dmsShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}
	}

	return { success: true };
}
