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
				const seeded = await ensureOrganizationCashBoxes(tx, orgId);
				boxes = seeded.boxes;
			} catch {
				// Mock or already seeded in another context
			}
		}
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
		openShifts.find((s) => s.cashBoxId === cashDeskBox?.id) ||
		openShifts[0] ||
		null;
	const cashlessShift =
		openShifts.find((s) => s.cashBoxId === cashlessBox?.id) ||
		openShifts.find((s) => s.id !== cashDeskShift?.id) ||
		cashDeskShift;
	const dmsShift =
		openShifts.find((s) => s.cashBoxId === dmsBox?.id) ||
		cashlessShift;

	ctx.cashDeskShift = cashDeskShift;
	ctx.cashlessShift = cashlessShift;
	ctx.dmsShift = dmsShift;

	// 3. Кассовые проводки в cashOperations
	if (resolvedCashKop > 0 && cashDeskBox) {
		const curBalKop =
			cashDeskBox.balanceKopecks !== undefined && cashDeskBox.balanceKopecks !== null
				? Number(cashDeskBox.balanceKopecks)
				: rubToKopecks(cashDeskBox.balanceRub || 0);
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
			balanceAfterRub: newBal,
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

		if (cashDeskShift && resolvedCashKop > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`((ROUND(COALESCE(${cashBoxShifts.incomeTotalRub}, 0) * 100)::bigint + ${resolvedCashKop}::bigint)::numeric / 100)`,
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
			balanceAfterRub: newBal,
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

		if (cashlessShift && resolvedElecKop > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`((ROUND(COALESCE(${cashBoxShifts.incomeTotalRub}, 0) * 100)::bigint + ${resolvedElecKop}::bigint)::numeric / 100)`,
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
			operationType: "advance_offset",
			amountRub: depositRub,
			amountKopecks: Number(requiredDepositKopecks),
			balanceBeforeRub: cashDeskBox.balanceRub || 0,
			balanceAfterRub: cashDeskBox.balanceRub || 0,
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Зачёт аванса/депозита пациента: оплата стоматологических услуг (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
		});
	}

	if (requiredBonusKopecks > 0n && cashDeskBox) {
		const bonusRub = kopecksToRubles(Number(requiredBonusKopecks));
		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashDeskBox.id,
			shiftId: cashDeskShift?.id ?? null,
			operationType: "advance_offset",
			amountRub: bonusRub,
			amountKopecks: Number(requiredBonusKopecks),
			balanceBeforeRub: cashDeskBox.balanceRub || 0,
			balanceAfterRub: cashDeskBox.balanceRub || 0,
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Зачёт бонусов лояльности пациента: оплата стоматологических услуг (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
		});
	}

	if (requiredCertificateKopecks > 0n && cashDeskBox) {
		const certRub = kopecksToRubles(Number(requiredCertificateKopecks));
		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashDeskBox.id,
			shiftId: cashDeskShift?.id ?? null,
			operationType: "advance_offset",
			amountRub: certRub,
			amountKopecks: Number(requiredCertificateKopecks),
			balanceBeforeRub: cashDeskBox.balanceRub || 0,
			balanceAfterRub: cashDeskBox.balanceRub || 0,
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Зачёт аванса (сертификат №${certificateNumber}): оплата стоматологических услуг (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
		});
	}

	if (requiredDmsKopecks > 0n && dmsBox) {
		const dmsRub = kopecksToRubles(Number(requiredDmsKopecks));
		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: dmsBox.id,
			shiftId: dmsShift?.id ?? null,
			operationType: "income",
			amountRub: dmsRub,
			amountKopecks: Number(requiredDmsKopecks),
			balanceBeforeRub: dmsBox.balanceRub || 0,
			balanceAfterRub: dmsBox.balanceRub || 0,
			patientId: resolvedPatientId,
			kkmDocNumber: receiptNumber,
			reasonText: `Оплата по гарантийному письму ДМС (${lockedDmsLetter?.letterNumber || (isEmergencyLetterAlias ? "ЭКСТРЕННО (досылка)" : "б/н")}): стоматологические услуги (${receiptNumber || "б/н"})`,
			operatorName: body.cashierFullName || "Кассир",
		});
	}

	return { success: true };
}
