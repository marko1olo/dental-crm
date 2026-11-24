/**
 * balanceModules/advanceOperationsService.ts — Transactional Credit, Debit & Refund Operations.
 *
 * Enforces advisory locks, row-level .for("update") locking on advanceDepositTaggings,
 * canonical verifyFamilySpendAuthorization BOLA/spend-limit checks, shift *Kopecks parity,
 * and 54-FZ fiscal queue consistency.
 */

import {
	kopecksToNumericString,
	kopecksToRubles,
	normalizePaymentMethod,
	parseKopecks,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	patients,
	payments,
} from "../../../db/schema.js";
import { FamilyWalletError } from "../../../services/familyWallet/familyWalletTypes.js";
import { verifyFamilySpendAuthorization } from "../../../services/familyWallet/modules/familySpendAuthorization.js";
import { getDetailedPatientBalance } from "./balanceQueryService.js";
import {
	type CreditAdvanceParams,
	type DebitAdvanceParams,
	PatientBalanceError,
	type RefundAdvanceParams,
} from "./types.js";

function resolveSafeKopecks(
	kopecksVal: number | bigint | null | undefined,
	rubVal: number | string | null | undefined,
): number {
	const kop = kopecksVal != null ? Number(kopecksVal) : 0;
	const rub = Number(rubVal || 0);
	return kop !== 0 || rub === 0 ? kop : rublesToKopecks(rub);
}

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

	await tx.insert(fiscalReceiptQueue).values({
		organizationId,
		paymentId: payment.id,
		receiptType: "income",
		status: "pending_print",
		payloadJson: {
			clientMutationId: idempotencyKey,
			amountRub,
			amountKopecks,
			method: statutoryMethod,
			cashRub: statutoryMethod === "cash" ? amountRub : 0,
			cashKopecks: statutoryMethod === "cash" ? amountKopecks : 0,
			electronicRub: statutoryMethod !== "cash" ? amountRub : 0,
			electronicKopecks: statutoryMethod !== "cash" ? amountKopecks : 0,
			electronicCardKopecks:
				statutoryMethod !== "cash" && statutoryMethod !== "online" ? amountKopecks : 0,
			sbpKopecks: statutoryMethod === "online" ? amountKopecks : 0,
			advanceOffsetRub: 0,
			certificateOffsetRub: 0,
			bonusOffsetRub: 0,
			dmsOffsetRub: 0,
			patientId,
			patientName: patient.fullName || "Пациент клиники",
			note: operationNote,
			calculationSign: 3, // Аванс (Тег 1214 = 3)
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

export async function debitAdvanceOp(tx: TenantDb, params: DebitAdvanceParams) {
	const {
		organizationId,
		patientId,
		amountKopecks,
		idempotencyKey,
		visitId,
		invoiceId,
		allowFamilyFallback,
		notes,
	} = params;

	if (amountKopecks <= 0) {
		throw new PatientBalanceError(
			"ValidationError",
			"Сумма списания аванса должна быть строго больше нуля.",
			400,
		);
	}

	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':patient_balance:' || ${idempotencyKey}))`,
	);

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

	let remainingNeededKop = amountKopecks;
	let personalDebitedKop = 0;
	let familyDebitedKop = 0;

	// 1. Списание из личного аванса advanceDepositTaggings под блокировкой FOR UPDATE
	if (balance.personalAdvanceKopecks > 0) {
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

		const lockedPersonalKop = advanceRows.reduce((acc, row) => {
			const kop =
				row.depositAmountKopecks != null &&
				(row.depositAmountKopecks > 0n || Number(row.depositAmountRub || 0) === 0)
					? Number(row.depositAmountKopecks)
					: parseKopecks(row.depositAmountRub);
			return acc + Math.max(0, kop);
		}, 0);

		const canDebitPersonal = Math.min(lockedPersonalKop, remainingNeededKop);
		personalDebitedKop = canDebitPersonal;
		remainingNeededKop -= canDebitPersonal;

		let debitAcc = canDebitPersonal;
		for (const row of advanceRows) {
			if (debitAcc <= 0) break;
			const rowKop =
				row.depositAmountKopecks != null &&
				(row.depositAmountKopecks > 0n || Number(row.depositAmountRub || 0) === 0)
					? Number(row.depositAmountKopecks)
					: parseKopecks(row.depositAmountRub);
			if (rowKop <= debitAcc) {
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
				debitAcc -= rowKop;
			} else {
				const remainingRowKop = rowKop - debitAcc;
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
				debitAcc = 0;
			}
		}
	}

	// 2. Если личного аванса не хватило, списываем из семейного кошелька через канонический шлюз BOLA/лимитов
	if (remainingNeededKop > 0) {
		if (!allowFamilyFallback) {
			throw new PatientBalanceError(
				"InsufficientPersonalAdvance",
				`Недостаточно личного аванса для зачета. Доступно лично: ${balance.personalAdvanceRub} ₽, требуется: ${kopecksToRubles(amountKopecks)} ₽.`,
				400,
			);
		}

		const targetFamilyGroupId = balance.familyWallet.familyGroupId;
		if (!targetFamilyGroupId) {
			throw new PatientBalanceError(
				"FamilyGroupNotFound",
				"Семейный кошелек для пациента не найден.",
				403,
			);
		}

		const [family] = await tx
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, targetFamilyGroupId),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);

		if (!family) {
			throw new PatientBalanceError("FamilyGroupNotFound", "Семейная группа не найдена.", 404);
		}

		try {
			await verifyFamilySpendAuthorization({
				tx,
				organizationId,
				family,
				patientId,
				debitKopecks: remainingNeededKop,
			});
		} catch (err: unknown) {
			if (err instanceof FamilyWalletError) {
				throw new PatientBalanceError(err.code, err.message, err.statusCode);
			}
			throw err;
		}

		familyDebitedKop = remainingNeededKop;
		const lockedFamilyGroupId = family.id;

		const currentFamilyBalKop =
			family.balanceKopecks != null &&
			(family.balanceKopecks !== 0 || Number(family.balance || 0) === 0)
				? Number(family.balanceKopecks)
				: parseKopecks(family.balance || "0.00");
		const newFamilyBalKop = Math.max(0, currentFamilyBalKop - familyDebitedKop);
		await tx
			.update(familyGroups)
			.set({
				balance: kopecksToNumericString(newFamilyBalKop),
				balanceKopecks: newFamilyBalKop,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(familyGroups.id, lockedFamilyGroupId),
					eq(familyGroups.organizationId, organizationId),
				),
			);
	}

	const totalAmountRub = kopecksToRubles(amountKopecks);
	const now = new Date();
	const defaultNote = "Зачет ранее внесенного аванса (депозит)";
	const operationNote = notes?.trim() || defaultNote;

	const [payment] = await tx
		.insert(payments)
		.values({
			organizationId,
			patientId,
			visitId: visitId ?? null,
			documentId: invoiceId ?? null,
			amountRub: totalAmountRub,
			amountKopecks: BigInt(amountKopecks),
			method: "family_wallet",
			status: "paid",
			clientMutationId: idempotencyKey,
			note: operationNote,
			paidAt: now,
		})
		.returning();

	if (!payment) {
		throw new Error("Не удалось создать платёж зачёта аванса.");
	}

	await tx.insert(fiscalReceiptQueue).values({
		organizationId,
		paymentId: payment.id,
		visitId: visitId ?? null,
		receiptType: "income",
		status: "pending_print",
		payloadJson: {
			clientMutationId: idempotencyKey,
			amountRub: totalAmountRub,
			amountKopecks,
			method: "family_wallet",
			cashRub: 0,
			electronicRub: 0,
			advanceOffsetRub: totalAmountRub,
			advanceOffsetKopecks: amountKopecks,
			certificateOffsetRub: 0,
			bonusOffsetRub: 0,
			dmsOffsetRub: 0,
			patientId,
			patientName: balance.patientFullName,
			note: operationNote,
			personalDebitedRub: kopecksToRubles(personalDebitedKop),
			familyDebitedRub: kopecksToRubles(familyDebitedKop),
		},
		retryCount: 0,
	});

	return {
		success: true,
		payment,
		personalDebitedKopecks: personalDebitedKop,
		familyDebitedKopecks: familyDebitedKop,
		totalDebitedKopecks: amountKopecks,
		isDuplicate: false,
	};
}

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

	await tx.insert(fiscalReceiptQueue).values({
		organizationId,
		paymentId: payment.id,
		receiptType: "income_return",
		status: "pending_print",
		payloadJson: {
			receiptType: "income_return",
			tag1054: 2,
			operationType: "income_return",
			amountRub,
			amountKopecks,
			method: refundMethod,
			cashRub: refundMethod === "cash" ? amountRub : 0,
			cashKopecks: refundMethod === "cash" ? amountKopecks : 0,
			electronicRub: refundMethod !== "cash" ? amountRub : 0,
			electronicKopecks: refundMethod !== "cash" ? amountKopecks : 0,
			electronicCardKopecks: refundMethod === "card" ? amountKopecks : 0,
			sbpKopecks: refundMethod === "online" ? amountKopecks : 0,
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
