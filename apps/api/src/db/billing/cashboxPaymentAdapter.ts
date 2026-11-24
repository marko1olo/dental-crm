/**
 * cashboxPaymentAdapter.ts — Canonical Facade delegating to processCashboxPayment SSOT engine.
 * Eliminates duplicate legacy payment pipelines (Mandate 8bf, Mandate 8e).
 */

import crypto from "node:crypto";
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
	validateAndResolvePaymentSplit(input);
	const effectiveMutationId = input.clientMutationId?.trim();
	if (!effectiveMutationId) {
		const err = new Error(
			"IdempotencyKeyRequired: Для проведения оплаты требуется clientMutationId (Мандат 8bo / RFC 9562).",
		);
		(err as { code?: string; statusCode?: number }).code = "IdempotencyKeyRequired";
		(err as { code?: string; statusCode?: number }).statusCode = 400;
		throw err;
	}
	const inputWithExtra = input as CreatePaymentInput & {
		invoiceId?: string | null;
		orderId?: string;
		isRetailSale?: boolean;
		discountKopecks?: number | null;
		isWarranty?: boolean;
		familyGroupId?: string | null;
		allowOverdraft?: boolean;
		isUrgentCare?: boolean;
		isEmergency?: boolean;
		hasAcutePain?: boolean;
		dmsAmountKopecks?: number;
		dmsAmountRub?: number;
		certificateNumber?: string;
		certificateAmountKopecks?: number;
		certificateAmountRub?: number;
		cashAmountKopecks?: number;
		electronicAmountKopecks?: number;
		sbpAmountKopecks?: number;
		depositAmountKopecks?: number;
		familyDepositAmountKopecks?: number;
		bonusAmountKopecks?: number;
		cashAmountRub?: number;
		electronicAmountRub?: number;
		sbpAmountRub?: number;
		depositAmountRub?: number;
		familyDepositAmountRub?: number;
		bonusAmountRub?: number;
		carpulesCount?: number;
		drugName?: string;
		cashierFullName?: string;
		cashierUserId?: string;
		operatorId?: string;
		isElectronicReceiptOnly?: boolean;
		customerContact?: string;
		isAdvanceDeposit?: boolean;
		advanceDepositTarget?: "family" | "patient";
		clientType?: string | null;
		buyerInn?: string | null;
		printFormat?: string;
		splitTenders?: unknown;
		taxCategory?: string | null;
	};
	const mappedPayload: Record<string, unknown> = {
		clientMutationId: effectiveMutationId,
		method: input.method,
	};
	const assignIfDefined = (key: string, value: unknown) => {
		if (value !== undefined) mappedPayload[key] = value;
	};
	assignIfDefined("patientId", input.patientId);
	assignIfDefined("visitId", input.visitId);
	assignIfDefined("invoiceId", input.documentId ?? inputWithExtra.invoiceId);
	assignIfDefined("documentId", input.documentId);
	assignIfDefined("serviceId", input.serviceId);
	assignIfDefined("catalogItemId", input.catalogItemId);
	assignIfDefined("orderId", inputWithExtra.orderId);
	assignIfDefined("isRetailSale", inputWithExtra.isRetailSale);
	assignIfDefined("amountKopecks", input.amountKopecks);
	assignIfDefined("amountRub", input.amountRub);
	assignIfDefined("discountPercent", input.discountPercent);
	assignIfDefined("discountRub", input.discountRub);
	assignIfDefined("discountKopecks", inputWithExtra.discountKopecks);
	assignIfDefined("isWarranty", inputWithExtra.isWarranty);
	assignIfDefined("familyGroupId", inputWithExtra.familyGroupId);
	assignIfDefined("payerFullName", input.payerFullName);
	assignIfDefined("payerInn", input.payerInn);
	assignIfDefined("payerBirthDate", input.payerBirthDate);
	assignIfDefined("payerIdentityDocument", input.payerIdentityDocument);
	assignIfDefined("payerRelationship", input.payerRelationship);
	assignIfDefined("guaranteeLetterId", input.guaranteeLetterId);
	assignIfDefined("allowOverdraft", inputWithExtra.allowOverdraft);
	assignIfDefined("isUrgentCare", inputWithExtra.isUrgentCare);
	assignIfDefined("isEmergency", inputWithExtra.isEmergency);
	assignIfDefined("hasAcutePain", inputWithExtra.hasAcutePain);
	assignIfDefined("dmsAmountKopecks", inputWithExtra.dmsAmountKopecks);
	assignIfDefined("dmsAmountRub", inputWithExtra.dmsAmountRub);
	assignIfDefined("certificateNumber", inputWithExtra.certificateNumber);
	assignIfDefined("certificateAmountKopecks", inputWithExtra.certificateAmountKopecks);
	assignIfDefined("certificateAmountRub", inputWithExtra.certificateAmountRub);
	assignIfDefined("cashAmountKopecks", inputWithExtra.cashAmountKopecks);
	assignIfDefined("electronicAmountKopecks", inputWithExtra.electronicAmountKopecks);
	assignIfDefined("sbpAmountKopecks", inputWithExtra.sbpAmountKopecks);
	assignIfDefined("depositAmountKopecks", inputWithExtra.depositAmountKopecks);
	assignIfDefined("familyDepositAmountKopecks", inputWithExtra.familyDepositAmountKopecks);
	assignIfDefined("bonusAmountKopecks", inputWithExtra.bonusAmountKopecks);
	assignIfDefined("cashAmountRub", inputWithExtra.cashAmountRub);
	assignIfDefined("electronicAmountRub", inputWithExtra.electronicAmountRub);
	assignIfDefined("sbpAmountRub", inputWithExtra.sbpAmountRub);
	assignIfDefined("depositAmountRub", inputWithExtra.depositAmountRub);
	assignIfDefined("familyDepositAmountRub", inputWithExtra.familyDepositAmountRub);
	assignIfDefined("bonusAmountRub", inputWithExtra.bonusAmountRub);
	assignIfDefined("carpulesCount", inputWithExtra.carpulesCount);
	assignIfDefined("drugName", inputWithExtra.drugName);
	assignIfDefined("splitTenders", inputWithExtra.splitTenders);
	assignIfDefined("taxCategory", inputWithExtra.taxCategory);
	assignIfDefined("taxDeductionCode", input.taxDeductionCode);
	assignIfDefined("cashierFullName", inputWithExtra.cashierFullName);
	assignIfDefined("cashierUserId", inputWithExtra.cashierUserId);
	assignIfDefined("operatorId", inputWithExtra.operatorId);
	assignIfDefined("note", input.note);
	assignIfDefined("isElectronicReceiptOnly", inputWithExtra.isElectronicReceiptOnly);
	assignIfDefined("customerContact", inputWithExtra.customerContact);
	assignIfDefined("isAdvanceDeposit", inputWithExtra.isAdvanceDeposit);
	assignIfDefined("advanceDepositTarget", inputWithExtra.advanceDepositTarget);
	assignIfDefined("clientType", inputWithExtra.clientType);
	assignIfDefined("buyerInn", inputWithExtra.buyerInn);
	assignIfDefined("fiscalReceiptNumber", input.fiscalReceiptNumber);
	assignIfDefined("fiscalReceiptIssuedAt", input.fiscalReceiptIssuedAt);
	assignIfDefined("printFormat", inputWithExtra.printFormat);

	const outcome = await processCashboxPayment(
		organizationId,
		mappedPayload,
		effectiveMutationId,
	);

	if (outcome.statusCode !== 200) {
		const errBody = (outcome.body || {}) as { message?: string; error?: string };
		throw new Error(errBody.message || errBody.error || "Ошибка проведения платежа в кассе");
	}

	const responseData = outcome.body.data as Record<string, unknown>;
	const paymentId = typeof responseData.id === "string" ? responseData.id : "";
	const isReplay = typeof responseData.isReplay === "boolean" ? responseData.isReplay : undefined;

	return {
		id: paymentId,
		organizationId: (responseData.organizationId as string) || organizationId,
		patientId: (responseData.patientId as string) || (input.patientId ?? ""),
		visitId: (responseData.visitId as string) ?? input.visitId ?? null,
		documentId: (responseData.documentId as string) ?? input.documentId ?? inputWithExtra.invoiceId ?? null,
		amountRub: Number(responseData.amountRub ?? (input.amountRub ?? 0)),
		method: (input.method === "split" || responseData.method === "split" ? "split" : responseData.method) as Payment["method"],
		clientMutationId: (responseData.clientMutationId as string) || effectiveMutationId || null,
		fiscalReceiptNumber: (responseData.fiscalReceiptNumber as string) || null,
		fiscalReceiptIssuedAt: (responseData.fiscalReceiptIssuedAt as string) || null,
		fiscalReceiptUrl: (responseData.fiscalReceiptUrl as string) || null,
		fiscalReceipt: (responseData.fiscalReceipt as Payment["fiscalReceipt"]) || null,
		payerFullName: (responseData.payerFullName as string) || input.payerFullName || null,
		payerInn: (responseData.payerInn as string) || input.payerInn || null,
		payerBirthDate: (responseData.payerBirthDate as string) || input.payerBirthDate || null,
		payerIdentityDocument: (responseData.payerIdentityDocument as string) || input.payerIdentityDocument || null,
		payerRelationship: (responseData.payerRelationship as string) || input.payerRelationship || null,
		taxDeductionCode: narrowTaxDeductionCode(typeof responseData.taxDeductionCode === "string" ? responseData.taxDeductionCode : null) ?? narrowTaxDeductionCode(typeof input.taxDeductionCode === "string" ? input.taxDeductionCode : null),
		note: (responseData.note as string) || input.note || null,
		createdAt: (responseData.createdAt as string) || new Date().toISOString(),
		paidAt: (responseData.paidAt as string) || new Date().toISOString(),
		status: (responseData.status as Payment["status"]) || "paid",
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
	const incomingPaymentKopecks =
		input.amountKopecks !== undefined && input.amountKopecks !== null
			? Number(input.amountKopecks)
			: toKopecks(input.amountRub, "сумма оплаты");
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
