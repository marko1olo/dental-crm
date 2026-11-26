/**
 * balanceModules/advanceCreditOp.ts — Transactional Personal Advance Credit Operation.
 */

import {
	kopecksToNumericString,
	kopecksToRubles,
	normalizePaymentMethod,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	patients,
	payments,
} from "../../../db/schema.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { resolveSafeKopecks } from "./advanceHelpers.js";
import { type CreditAdvanceParams, PatientBalanceError } from "./types.js";

export async function creditPersonalAdvanceOp(
	tx: TenantDb,
	params: CreditAdvanceParams,
) {
	const {
		organizationId,
		patientId,
		amountKopecks,
		method,
		idempotencyKey,
		cashBoxId,
		operatorId,
		notes,
	} = params;

	if (amountKopecks <= 0) {
		throw new PatientBalanceError(
			"ValidationError",
			"Сумма пополнения аванса должна быть строго больше нуля.",
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

	const [patient] = await tx
		.select()
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) {
		throw new PatientBalanceError("PatientNotFound", "Пациент не найден.", 404);
	}

	let lockedBox: typeof cashBoxes.$inferSelect | undefined;
	if (cashBoxId) {
		const [targetBox] = await tx
			.select()
			.from(cashBoxes)
			.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, organizationId)))
			.for("update")
			.limit(1);
		if (!targetBox) {
			throw new PatientBalanceError("CashBoxNotFound", "Кассовый счет не найден.", 404);
		}
		lockedBox = targetBox;
	}

	const now = new Date();
	const defaultNote = `Внесение аванса на лечение (${method === "cash" ? "наличные" : "безналичные"})`;
	const operationNote = notes?.trim() || defaultNote;
	const statutoryMethod = normalizePaymentMethod(method);

	const [payment] = await tx
		.insert(payments)
		.values({
			organizationId,
			patientId,
			amountRub,
			amountKopecks: BigInt(amountKopecks),
			method: statutoryMethod,
			status: "paid",
			clientMutationId: idempotencyKey,
			note: operationNote,
			paidAt: now,
		})
		.returning();

	if (!payment) {
		throw new Error("Не удалось создать платёж аванса.");
	}

	const [depositTag] = await tx
		.insert(advanceDepositTaggings)
		.values({
			organizationId,
			patientId,
			patientName: patient.fullName || "Пациент клиники",
			depositAmountRub: kopecksToNumericString(amountKopecks),
			depositAmountKopecks: BigInt(amountKopecks),
			taggedTargetType: "deposit",
			taggedTargetName: "Аванс на лечение",
			allocationStatus: "unallocated",
		})
		.returning();

	if (!depositTag) {
		throw new Error("Не удалось зафиксировать авансовый депозит.");
	}

	let cashOp: typeof cashOperations.$inferSelect | undefined;
	if (lockedBox) {
		const beforeKop = resolveSafeKopecks(lockedBox.balanceKopecks, lockedBox.balanceRub);
		const balanceBeforeRub = kopecksToRubles(beforeKop);
		const afterKop = beforeKop + amountKopecks;
		const balanceAfterRub = kopecksToRubles(afterKop);

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, organizationId),
					eq(cashBoxShifts.cashBoxId, lockedBox.id),
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
			.where(and(eq(cashBoxes.id, lockedBox.id), eq(cashBoxes.organizationId, organizationId)));

		if (activeShift) {
			const nextIncomeKop =
				resolveSafeKopecks(activeShift.incomeTotalKopecks, activeShift.incomeTotalRub) +
				amountKopecks;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: kopecksToRubles(nextIncomeKop),
					incomeTotalKopecks: nextIncomeKop,
					updatedAt: now,
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, organizationId)));
		}

		const [op] = await tx
			.insert(cashOperations)
			.values({
				organizationId,
				cashBoxId: lockedBox.id,
				shiftId: activeShift?.id ?? null,
				operationType: "income",
				amountRub,
				amountKopecks,
				balanceBeforeRub,
				balanceBeforeKopecks: BigInt(beforeKop),
				balanceAfterRub,
				balanceAfterKopecks: BigInt(afterKop),
				reasonText: operationNote,
				patientId,
				operatorId: operatorId ?? null,
				metadata: { idempotencyKey, depositTagId: depositTag.id },
			})
			.returning();
		cashOp = op;
	}

	const creditFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
		patientId,
		operationType: "income",
		taxationSystem: "usn_income",
		cashierFullName: "Кассир-администратор",
		customerContact: "",
		customerName: patient.fullName || "Пациент клиники",
		totalKopecks: amountKopecks,
		cashKopecks: statutoryMethod === "cash" ? amountKopecks : 0,
		electronicCardKopecks:
			statutoryMethod !== "cash" && statutoryMethod !== "online" ? amountKopecks : 0,
		sbpKopecks: statutoryMethod === "online" ? amountKopecks : 0,
		prepaidKopecks: 0,
		items: [
			{
				name: operationNote || "Внесение личного авансового депозита",
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
		receiptType: "income",
		status: "pending_print",
		payloadJson: {
			...creditFfdPayload,
			clientMutationId: idempotencyKey,
			method: statutoryMethod,
			patientId,
			patientName: patient.fullName || "Пациент клиники",
			note: operationNote,
		},
		retryCount: 0,
	});

	return {
		success: true,
		payment,
		depositTag,
		cashOperation: cashOp,
		isDuplicate: false,
	};
}
