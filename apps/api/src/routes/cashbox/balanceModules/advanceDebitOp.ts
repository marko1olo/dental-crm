/**
 * balanceModules/advanceDebitOp.ts — Transactional Personal Advance & Family Wallet Debit Operation.
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
	familyGroups,
	fiscalReceiptQueue,
	patientInvoices,
	patients,
	payments,
} from "../../../db/schema.js";
import { FamilyWalletError } from "../../../services/familyWallet/familyWalletTypes.js";
import { verifyFamilySpendAuthorization } from "../../../services/familyWallet/modules/familySpendAuthorization.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { reconcileInvoiceBalanceInDb } from "../../billingRoutes/invoiceBalanceReconciler.js";
import { getDetailedPatientBalance } from "./balanceQueryService.js";
import { type DebitAdvanceParams, PatientBalanceError } from "./types.js";

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

	if (invoiceId) {
		const [lockedInvoice] = await tx
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.id, invoiceId),
					eq(patientInvoices.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);
		if (!lockedInvoice) {
			throw new PatientBalanceError("InvoiceNotFound", "Счёт на оплату не найден.", 404);
		}
		if (
			lockedInvoice.status === "paid" ||
			lockedInvoice.status === "refunded" ||
			lockedInvoice.status === "voided" ||
			lockedInvoice.status === "cancelled"
		) {
			throw new PatientBalanceError(
				"InvoiceAlreadyPaid",
				"Счёт уже оплачен или закрыт.",
				409,
			);
		}
		if (lockedInvoice.patientId && lockedInvoice.patientId !== patientId) {
			const allowedFamilyId = balance.familyWallet.familyGroupId;
			if (!allowedFamilyId) {
				throw new PatientBalanceError(
					"InvoiceNotFound",
					"Счёт не принадлежит данному пациенту.",
					404,
				);
			}
			const [invPatient] = await tx
				.select({ familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(
					and(
						eq(patients.id, lockedInvoice.patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!invPatient || invPatient.familyGroupId !== allowedFamilyId) {
				throw new PatientBalanceError(
					"InvoiceNotFound",
					"Счёт не принадлежит пациенту или его семье.",
					404,
				);
			}
		}
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

	const debitMethod = familyDebitedKop > 0 ? ("family_wallet" as const) : ("other" as const);
	const debitSource =
		familyDebitedKop > 0 && personalDebitedKop > 0
			? "mixed_advance"
			: familyDebitedKop > 0
				? "family_wallet"
				: "personal_advance";
	const totalAmountRub = kopecksToRubles(amountKopecks);
	const now = new Date();
	const defaultNote =
		debitSource === "family_wallet"
			? "Зачет средств семейного депозита"
			: debitSource === "mixed_advance"
				? "Зачет личного аванса и семейного депозита"
				: "Зачет ранее внесенного личного аванса (депозит)";
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
			method: debitMethod,
			status: "paid",
			clientMutationId: idempotencyKey,
			fiscalReceipt: {
				operationType: "income",
				calculationMethod: "full_payment",
				calculationSubject: "service",
				advancePaymentRub: totalAmountRub,
				advanceOffsetKopecks: amountKopecks,
			},
			note: operationNote,
			paidAt: now,
		})
		.returning();

	if (!payment) {
		throw new Error("Не удалось создать платёж зачёта аванса.");
	}

	if (invoiceId) {
		await reconcileInvoiceBalanceInDb(tx, organizationId, invoiceId);
	}

	const debitFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
		patientId,
		operationType: "income",
		taxationSystem: "usn_income",
		cashierFullName: "Кассир-администратор",
		customerContact: "",
		customerName: balance.patientFullName,
		totalKopecks: amountKopecks,
		cashKopecks: 0,
		electronicCardKopecks: 0,
		sbpKopecks: 0,
		prepaidKopecks: amountKopecks,
		items: [
			{
				name: operationNote || "Зачёт аванса при окончательном расчёте",
				priceKopecks: amountKopecks,
				quantity: 1,
				amountKopecks,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		],
	});

	await tx.insert(fiscalReceiptQueue).values({
		organizationId,
		paymentId: payment.id,
		visitId: visitId ?? null,
		receiptType: "income",
		status: "pending_print",
		payloadJson: {
			...debitFfdPayload,
			clientMutationId: idempotencyKey,
			method: debitMethod,
			debitSource,
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
