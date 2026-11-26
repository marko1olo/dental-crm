/**
 * balanceModules/advanceRefundOp.ts — Transactional Personal Advance Refund Operation.
 */

import {
	kopecksToNumericString,
	kopecksToRubles,
	parseKopecks,
} from "@dental/shared";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	payments,
} from "../../../db/schema.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { resolveSafeKopecks } from "./advanceHelpers.js";
import { getDetailedPatientBalance } from "./balanceQueryService.js";
import { PatientBalanceError, type RefundAdvanceParams } from "./types.js";

export async function refundPersonalAdvanceOp(
	tx: TenantDb,
	params: RefundAdvanceParams,
) {
	const {
		organizationId,
		patientId,
		amountKopecks,
		cashBoxId,
		idempotencyKey,
		operatorId,
		reasonText,
	} = params;

	if (amountKopecks <= 0) {
		throw new PatientBalanceError(
			"ValidationError",
			"Сумма возврата аванса должна быть строго больше нуля.",
			400,
		);
	}

	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':patient_balance:' || ${idempotencyKey}))`,
	);

	const amountRub = kopecksToRubles(amountKopecks);

	const [existingPayment] = await tx
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				eq(payments.clientMutationId, idempotencyKey),
			),
		)
		.limit(1);

	if (existingPayment) {
		return {
			success: true,
			payment: existingPayment,
			isDuplicate: true,
		};
	}

	const balance = await getDetailedPatientBalance(tx, organizationId, patientId);
	if (!balance) {
		throw new PatientBalanceError("PatientNotFound", "Пациент не найден.", 404);
	}

	const advanceRows = await tx
		.select()
		.from(advanceDepositTaggings)
		.where(
			and(
				eq(advanceDepositTaggings.organizationId, organizationId),
				or(
					eq(advanceDepositTaggings.patientId, patientId),
					and(
						isNull(advanceDepositTaggings.patientId),
						eq(advanceDepositTaggings.patientName, balance.patientFullName),
					),
				),
				inArray(advanceDepositTaggings.allocationStatus, ["pinned", "unallocated"]),
			),
		)
		.orderBy(advanceDepositTaggings.createdAt)
		.for("update");

	const lockedPersonalAdvanceKop = advanceRows.reduce((acc, row) => {
		const kop =
			row.depositAmountKopecks != null &&
			(row.depositAmountKopecks > 0n || Number(row.depositAmountRub || 0) === 0)
				? Number(row.depositAmountKopecks)
				: parseKopecks(row.depositAmountRub);
		return acc + Math.max(0, kop);
	}, 0);

	if (lockedPersonalAdvanceKop < amountKopecks) {
		throw new PatientBalanceError(
			"InsufficientAdvanceBalance",
			`Недостаточно личного аванса для возврата. Доступно: ${kopecksToRubles(lockedPersonalAdvanceKop)} ₽, запрошено: ${amountRub} ₽.`,
			400,
		);
	}

	const [targetBox] = await tx
		.select()
		.from(cashBoxes)
		.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, organizationId)))
		.for("update")
		.limit(1);

	if (!targetBox) {
		throw new PatientBalanceError("CashBoxNotFound", "Кассовый счет не найден.", 404);
	}

	const beforeKop = resolveSafeKopecks(targetBox.balanceKopecks, targetBox.balanceRub);
	if (beforeKop < amountKopecks) {
		throw new PatientBalanceError(
			"InsufficientFunds",
			`Недостаточно наличных средств в кассе для возврата. В кассе: ${kopecksToRubles(beforeKop)} ₽, запрошено: ${amountRub} ₽.`,
			400,
		);
	}

	const afterKop = beforeKop - amountKopecks;
	const balanceBeforeRub = kopecksToRubles(beforeKop);
	const balanceAfterRub = kopecksToRubles(afterKop);
	const now = new Date();

	const [activeShift] = await tx
		.select()
		.from(cashBoxShifts)
		.where(
			and(
				eq(cashBoxShifts.organizationId, organizationId),
				eq(cashBoxShifts.cashBoxId, targetBox.id),
				eq(cashBoxShifts.status, "open"),
			),
		)
		.for("update")
		.limit(1);

	await tx
		.update(cashBoxes)
		.set({
			balanceRub: balanceAfterRub,
			balanceKopecks: afterKop,
			updatedAt: now,
		})
		.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, organizationId)));

	if (activeShift) {
		const nextExpenseKop =
			resolveSafeKopecks(activeShift.expenseTotalKopecks, activeShift.expenseTotalRub) +
			amountKopecks;
		await tx
			.update(cashBoxShifts)
			.set({
				expenseTotalRub: kopecksToRubles(nextExpenseKop),
				expenseTotalKopecks: nextExpenseKop,
				updatedAt: now,
			})
			.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, organizationId)));
	}

	const note = reasonText?.trim() || "Возврат неиспользованного аванса пациенту";

	const [cashOp] = await tx
		.insert(cashOperations)
		.values({
			organizationId,
			cashBoxId: targetBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "expense",
			amountRub,
			amountKopecks,
			balanceBeforeRub,
			balanceBeforeKopecks: BigInt(beforeKop),
			balanceAfterRub,
			balanceAfterKopecks: BigInt(afterKop),
			reasonText: note,
			patientId,
			operatorId: operatorId ?? null,
			metadata: { idempotencyKey, type: "advance_refund", isDepositRefund: false },
		})
		.returning();

	if (!cashOp) {
		throw new Error("Не удалось зафиксировать кассовую операцию возврата аванса.");
	}

	const refundMethod =
		targetBox.type === "sbp"
			? "online"
			: targetBox.isCashless || targetBox.type === "cashless"
				? "card"
				: "cash";

	const [payment] = await tx
		.insert(payments)
		.values({
			organizationId,
			patientId,
			amountRub: -amountRub,
			amountKopecks: -BigInt(amountKopecks),
			method: refundMethod,
			status: "refunded",
			clientMutationId: idempotencyKey,
			note,
			paidAt: now,
		})
		.returning();

	if (!payment) {
		throw new Error("Не удалось зафиксировать платёж возврата аванса.");
	}

	const refundAdvanceFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
		patientId,
		operationType: "income_return",
		taxationSystem: "usn_income",
		cashierFullName: "Кассир-администратор",
		customerContact: "",
		customerName: balance.patientFullName,
		totalKopecks: amountKopecks,
		cashKopecks: refundMethod === "cash" ? amountKopecks : 0,
		electronicCardKopecks: refundMethod === "card" ? amountKopecks : 0,
		sbpKopecks: refundMethod === "online" ? amountKopecks : 0,
		prepaidKopecks: 0,
		items: [
			{
				name: note || "Возврат неизрасходованного личного аванса",
				priceKopecks: amountKopecks,
				quantity: 1,
				amountKopecks,
				subject: "payment",
				method: "advance",
				vatRate: "vat_none",
				measure: "piece",
			},
		],
	});

	await tx.insert(fiscalReceiptQueue).values({
		organizationId,
		paymentId: payment.id,
		receiptType: "income_return",
		status: "pending_print",
		payloadJson: {
			...refundAdvanceFfdPayload,
			clientMutationId: idempotencyKey,
			method: refundMethod,
			patientId,
			patientName: balance.patientFullName,
			reasonText: note,
		},
		retryCount: 0,
	});

	let refundAcc = amountKopecks;
	for (const row of advanceRows) {
		if (refundAcc <= 0) break;
		const rowKop =
			row.depositAmountKopecks != null &&
			(row.depositAmountKopecks > 0n || Number(row.depositAmountRub || 0) === 0)
				? Number(row.depositAmountKopecks)
				: parseKopecks(row.depositAmountRub);
		if (rowKop <= refundAcc) {
			await tx
				.update(advanceDepositTaggings)
				.set({
					allocationStatus: "spent",
					depositAmountKopecks: 0n,
					depositAmountRub: "0.00",
				})
				.where(
					and(
						eq(advanceDepositTaggings.id, row.id),
						eq(advanceDepositTaggings.organizationId, organizationId),
					),
				);
			refundAcc -= rowKop;
		} else {
			const remainingRowKop = rowKop - refundAcc;
			await tx
				.update(advanceDepositTaggings)
				.set({
					depositAmountRub: kopecksToNumericString(remainingRowKop),
					depositAmountKopecks: BigInt(remainingRowKop),
				})
				.where(
					and(
						eq(advanceDepositTaggings.id, row.id),
						eq(advanceDepositTaggings.organizationId, organizationId),
					),
				);
			refundAcc = 0;
		}
	}

	return {
		success: true,
		payment,
		cashOperation: cashOp,
		refundedAmountRub: amountRub,
		isDuplicate: false,
	};
}
