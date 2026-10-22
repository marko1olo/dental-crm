/**
 * paymentSplitValidation.ts — Layer 1: Split & Tender Validation for Payment Creation Pipeline.
 *
 * Implements:
 * - Integer kopecks parsing and non-negativity checks
 * - Multi-tender split calculation (Cash, Card/Electronic, Insurance/DMS, Family Deposit)
 * - Remainder auto-balancing across cash and electronic tenders
 * - 100% warranty discount and free doctor care detection (Mandates 8e п. 7, 8n)
 */

import {
	formatKopecksRu,
	type CreatePaymentInput,
} from "@dental/shared";
import { toKopecks } from "../../money/patientDebt.js";

export interface ResolvedPaymentSplit {
	readonly incomingPaymentKopecks: number;
	readonly rawCashKop: number;
	readonly rawElectronicKop: number;
	readonly rawDmsKop: number;
	readonly rawDepositKop: number;
	readonly isSplit: boolean;
	readonly resolvedCashKop: number;
	readonly resolvedElectronicKop: number;
	readonly resolvedDmsKop: number;
	readonly resolvedDepositKop: number;
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
		(input.cashAmountRub != null ? Math.round(input.cashAmountRub * 100) : 0);
	const rawElectronicKop =
		(input.electronicAmountKopecks ??
			(input.electronicAmountRub != null ? Math.round(input.electronicAmountRub * 100) : 0)) +
		(input.sbpAmountKopecks ??
			(input.sbpAmountRub != null ? Math.round(input.sbpAmountRub * 100) : 0));
	const rawDmsKop =
		input.dmsAmountKopecks ??
		(input.dmsAmountRub != null ? Math.round(input.dmsAmountRub * 100) : 0);
	const rawDepositKop =
		input.depositAmountKopecks ??
		input.familyDepositAmountKopecks ??
		(input.depositAmountRub != null
			? Math.round(input.depositAmountRub * 100)
			: input.familyDepositAmountRub != null
				? Math.round(input.familyDepositAmountRub * 100)
				: 0);
	const rawCertificateKop =
		(input.certificateAmountKopecks ??
			(input.certificateAmountRub != null ? Math.round(input.certificateAmountRub * 100) : 0)) +
		(input.installmentAmountKopecks ??
			(input.installmentAmountRub != null ? Math.round(input.installmentAmountRub * 100) : 0));

	const isSplit =
		(rawCashKop > 0 && rawElectronicKop > 0) ||
		(rawDmsKop > 0 && (rawCashKop > 0 || rawElectronicKop > 0 || rawDepositKop > 0)) ||
		(rawDepositKop > 0 && (rawCashKop > 0 || rawElectronicKop > 0 || rawDmsKop > 0)) ||
		rawCertificateKop > 0 ||
		input.method === "split" ||
		input.method === "mixed";

	let resolvedCashKop = rawCashKop;
	let resolvedElectronicKop = rawElectronicKop;
	let resolvedDmsKop = rawDmsKop;
	let resolvedDepositKop = rawDepositKop;

	if (isSplit) {
		const nonCashElectronicKop = resolvedDmsKop + resolvedDepositKop + rawCertificateKop;
		const netIncomingKop = incomingPaymentKopecks - nonCashElectronicKop;

		if (resolvedCashKop === 0 && resolvedElectronicKop > 0 && resolvedElectronicKop < netIncomingKop) {
			resolvedCashKop = netIncomingKop - resolvedElectronicKop;
		} else if (resolvedElectronicKop === 0 && resolvedCashKop > 0 && resolvedCashKop < netIncomingKop) {
			resolvedElectronicKop = netIncomingKop - resolvedCashKop;
		}

		if (resolvedCashKop + resolvedElectronicKop + resolvedDmsKop + resolvedDepositKop + rawCertificateKop !== incomingPaymentKopecks) {
			const hasOtherMentionedTenders = Boolean(
				input.note && /(аванс|депозит|family|сертификат|бонус|дмс|dms)/i.test(input.note),
			);
			if (!hasOtherMentionedTenders) {
				throw new Error(
					`Сумма частей смешанной оплаты (${formatKopecksRu(resolvedCashKop + resolvedElectronicKop + resolvedDmsKop + resolvedDepositKop + rawCertificateKop)}) не совпадает с общей суммой (${formatKopecksRu(incomingPaymentKopecks)}).`,
				);
			}
		}
		if (resolvedCashKop < 0 || resolvedElectronicKop < 0 || resolvedDmsKop < 0 || resolvedDepositKop < 0) {
			throw new Error("Части смешанной оплаты не могут быть отрицательными.");
		}
	}

	// Мандаты 8e п. 7 и 8n: Свобода скидок и переделок соло-врача (до 100%).
	// Если скидка 100% (гарантийная переделка, персонал, бесплатный прием), incomingPaymentKopecks === 0
	// НЕ выбрасывает ошибку, а фиксирует гарантийный платеж / акт со статусом 100% скидки.
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
		isSplit,
		resolvedCashKop,
		resolvedElectronicKop,
		resolvedDmsKop,
		resolvedDepositKop,
		isWarrantyOrFullDiscount,
	};
}
