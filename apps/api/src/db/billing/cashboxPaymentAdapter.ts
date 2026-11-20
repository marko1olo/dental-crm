/**
 * cashboxPaymentAdapter.ts — Canonical Facade delegating to processCashboxPayment SSOT engine.
 * Eliminates duplicate legacy payment pipelines (Mandate 8bf, Mandate 8e).
 */

import { and, eq } from "drizzle-orm";
import {
	type CreatePaymentInput,
	type Payment,
	rublesToKopecks,
	formatKopecksRu,
} from "@dental/shared";
import { db } from "../client.js";
import { payments } from "../schema.js";
import { toKopecks } from "../../money/patientDebt.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
import { narrowTaxDeductionCode } from "./types.js";

export type PaymentWithReplay = Payment & { isReplay?: boolean | undefined };

export async function createPaymentInDb(
	organizationId: string,
	input: CreatePaymentInput,
): Promise<PaymentWithReplay> {
	const effectiveMutationId = input.clientMutationId?.trim();
	const inputWithInvoice = input as CreatePaymentInput & { invoiceId?: string };
	const outcome = await processCashboxPayment(
		organizationId,
		{
			...input,
			invoiceId: input.documentId ?? inputWithInvoice.invoiceId,
		},
		effectiveMutationId,
	);

	if (outcome.statusCode !== 200) {
		const errBody = outcome.body as { message?: string; error?: string };
		throw new Error(errBody.message || errBody.error || "Ошибка проведения платежа в кассе");
	}

	const responseData = outcome.body.data as Record<string, unknown>;
	const paymentId = typeof responseData.id === "string" ? responseData.id : "";
	const isReplay = typeof responseData.isReplay === "boolean" ? responseData.isReplay : undefined;
	const [row] = await db
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				eq(payments.id, paymentId),
			),
		)
		.limit(1);

	if (!row) {
		throw new Error(`Платеж ${paymentId} не найден после проведения`);
	}

	return {
		id: row.id,
		organizationId: row.organizationId,
		patientId: row.patientId,
		visitId: row.visitId,
		documentId: row.documentId,
		amountRub: Number(row.amountRub),
		method: row.method === "split" ? "card" : (row.method as Payment["method"]),
		clientMutationId: row.clientMutationId,
		fiscalReceiptNumber: row.fiscalReceiptNumber,
		fiscalReceiptIssuedAt: row.fiscalReceiptIssuedAt,
		fiscalReceiptUrl: row.fiscalReceiptUrl,
		fiscalReceipt: row.fiscalReceipt as Payment["fiscalReceipt"],
		payerFullName: row.payerFullName,
		payerInn: row.payerInn,
		payerBirthDate: row.payerBirthDate,
		payerIdentityDocument: row.payerIdentityDocument,
		payerRelationship: row.payerRelationship,
		taxDeductionCode: narrowTaxDeductionCode(row.taxDeductionCode),
		note: row.note,
		createdAt: row.createdAt.toISOString(),
		paidAt: row.paidAt.toISOString(),
		status: row.status as Payment["status"],
		isReplay,
	};
}

export interface ResolvedPaymentSplit {
	readonly incomingPaymentKopecks: number;
	readonly rawCashKop: number;
	readonly rawElectronicKop: number;
	readonly rawDmsKop: number;
	readonly rawDepositKop: number;
	readonly rawBonusKop: number;
	readonly isSplit: boolean;
	readonly resolvedCashKop: number;
	readonly resolvedElectronicKop: number;
	readonly resolvedDmsKop: number;
	readonly resolvedDepositKop: number;
	readonly resolvedBonusKop: number;
	readonly isWarrantyOrFullDiscount: boolean;
}

export function validateAndResolvePaymentSplit(
	input: CreatePaymentInput,
): ResolvedPaymentSplit {
	const incomingPaymentKopecks = toKopecks(input.amountRub, "сумма оплаты");
	if (incomingPaymentKopecks < 0) {
		throw new Error("Сумма оплаты не может быть отрицательной.");
	}

	const rawCashKop =
		input.cashAmountKopecks ??
		(input.cashAmountRub != null ? rublesToKopecks(input.cashAmountRub) : 0);
	const rawElectronicKop =
		(input.electronicAmountKopecks ??
			(input.electronicAmountRub != null ? rublesToKopecks(input.electronicAmountRub) : 0)) +
		(input.sbpAmountKopecks ??
			(input.sbpAmountRub != null ? rublesToKopecks(input.sbpAmountRub) : 0));
	const rawDmsKop =
		input.dmsAmountKopecks ??
		(input.dmsAmountRub != null ? rublesToKopecks(input.dmsAmountRub) : 0);
	const rawDepositKop =
		input.depositAmountKopecks ??
		input.familyDepositAmountKopecks ??
		(input.depositAmountRub != null
			? rublesToKopecks(input.depositAmountRub)
			: input.familyDepositAmountRub != null
				? rublesToKopecks(input.familyDepositAmountRub)
				: 0);
	const rawBonusKop =
		input.bonusAmountKopecks ??
		(input.bonusAmountRub != null
			? rublesToKopecks(input.bonusAmountRub)
			: input.pointsToRedeem != null
				? rublesToKopecks(input.pointsToRedeem)
				: 0);
	const rawCertificateKop =
		(input.certificateAmountKopecks ??
			(input.certificateAmountRub != null ? rublesToKopecks(input.certificateAmountRub) : 0)) +
		(input.installmentAmountKopecks ??
			(input.installmentAmountRub != null ? rublesToKopecks(input.installmentAmountRub) : 0));

	const isSplit =
		(rawCashKop > 0 && rawElectronicKop > 0) ||
		(rawDmsKop > 0 && (rawCashKop > 0 || rawElectronicKop > 0 || rawDepositKop > 0 || rawBonusKop > 0)) ||
		(rawDepositKop > 0 && (rawCashKop > 0 || rawElectronicKop > 0 || rawDmsKop > 0 || rawBonusKop > 0)) ||
		(rawBonusKop > 0 && (rawCashKop > 0 || rawElectronicKop > 0 || rawDmsKop > 0 || rawDepositKop > 0)) ||
		rawCertificateKop > 0 ||
		input.method === "split" ||
		input.method === "mixed";

	let resolvedCashKop = rawCashKop;
	let resolvedElectronicKop = rawElectronicKop;
	let resolvedDmsKop = rawDmsKop;
	let resolvedDepositKop = rawDepositKop;
	let resolvedBonusKop = rawBonusKop;

	if (isSplit) {
		const nonCashElectronicKop = resolvedDmsKop + resolvedDepositKop + resolvedBonusKop + rawCertificateKop;
		const netIncomingKop = incomingPaymentKopecks - nonCashElectronicKop;

		if (resolvedCashKop === 0 && resolvedElectronicKop > 0 && resolvedElectronicKop < netIncomingKop) {
			resolvedCashKop = netIncomingKop - resolvedElectronicKop;
		} else if (resolvedElectronicKop === 0 && resolvedCashKop > 0 && resolvedCashKop < netIncomingKop) {
			resolvedElectronicKop = netIncomingKop - resolvedCashKop;
		}

		const totalAllocatedKop = resolvedCashKop + resolvedElectronicKop + resolvedDmsKop + resolvedDepositKop + resolvedBonusKop + rawCertificateKop;
		if (totalAllocatedKop !== incomingPaymentKopecks) {
			throw new Error(
				`Сумма частей смешанной оплаты (${formatKopecksRu(totalAllocatedKop)}) не совпадает с общей суммой (${formatKopecksRu(incomingPaymentKopecks)}).`,
			);
		}
		if (resolvedCashKop < 0 || resolvedElectronicKop < 0 || resolvedDmsKop < 0 || resolvedDepositKop < 0 || resolvedBonusKop < 0) {
			throw new Error("Части смешанной оплаты не могут быть отрицательными.");
		}
	}

	const isWarrantyOrFullDiscount =
		incomingPaymentKopecks === 0 &&
		(input.discountPercent === 100 ||
			input.amountRub === 0 ||
			Boolean(
				input.note &&
					/(гаранти|передел|скидк.*100|100%|безвозмездн|warranty|персонал|бесплатн)/i.test(
						input.note,
					),
			));

	if (incomingPaymentKopecks === 0 && !isWarrantyOrFullDiscount) {
		throw new Error("Сумма оплаты должна быть строго больше нуля.");
	}

	return {
		incomingPaymentKopecks,
		rawCashKop,
		rawElectronicKop,
		rawDmsKop,
		rawDepositKop,
		rawBonusKop,
		isSplit,
		resolvedCashKop,
		resolvedElectronicKop,
		resolvedDmsKop,
		resolvedDepositKop,
		resolvedBonusKop,
		isWarrantyOrFullDiscount,
	};
}
