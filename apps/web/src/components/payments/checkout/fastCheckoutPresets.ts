/**
 * DENTE Dental CRM — 1-Click Fast Checkout & 54-FZ Split Payment Presets
 * Wired to @dental/shared CanonicalTenderType & CANONICAL_TENDER_FFD12_TAGS SSOT.
 */

import {
	type CanonicalTenderType,
	CANONICAL_TENDER_FFD12_TAGS,
	normalizeTenderType,
} from "@dental/shared";

export type CheckoutPaymentMethodType =
	| "sbp_qr"
	| "bank_card"
	| "cash"
	| "patient_deposit"
	| "dms_insurance"
	| "loyalty_points";

export interface CheckoutPaymentMethodInfo {
	readonly id: CheckoutPaymentMethodType;
	readonly canonicalTender: CanonicalTenderType;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly ffdTag: number;
	readonly commissionRatePercent: number;
	readonly isInstantFiscal: boolean;
	readonly accentColor: string;
}

export function toCanonicalCheckoutTender(method: CheckoutPaymentMethodType): CanonicalTenderType {
	return normalizeTenderType(method);
}

export const CHECKOUT_PAYMENT_METHODS: readonly CheckoutPaymentMethodInfo[] = [
	{
		id: "sbp_qr",
		canonicalTender: "sbp",
		titleRu: "СБП (QR)",
		subtitleRu: "Динамический QR НСПК (0.4–0.7% комиссия)",
		ffdTag: CANONICAL_TENDER_FFD12_TAGS.sbp,
		commissionRatePercent: 0.4,
		isInstantFiscal: true,
		accentColor: "teal",
	},
	{
		id: "bank_card",
		canonicalTender: "card",
		titleRu: "Карта (POS)",
		subtitleRu: "Безналичная оплата через терминал",
		ffdTag: CANONICAL_TENDER_FFD12_TAGS.card,
		commissionRatePercent: 1.5,
		isInstantFiscal: true,
		accentColor: "blue",
	},
	{
		id: "cash",
		canonicalTender: "cash",
		titleRu: "Наличные",
		subtitleRu: "Купюры в кассу с автокалькулятором сдачи",
		ffdTag: CANONICAL_TENDER_FFD12_TAGS.cash,
		commissionRatePercent: 0.0,
		isInstantFiscal: true,
		accentColor: "emerald",
	},
	{
		id: "patient_deposit",
		canonicalTender: "deposit",
		titleRu: "Депозит",
		subtitleRu: "Списание с баланса пациента",
		ffdTag: CANONICAL_TENDER_FFD12_TAGS.deposit,
		commissionRatePercent: 0.0,
		isInstantFiscal: true,
		accentColor: "amber",
	},
	{
		id: "dms_insurance",
		canonicalTender: "insurance",
		titleRu: "ДМС (Страховка)",
		subtitleRu: "Гарантийное письмо с доплатой",
		ffdTag: CANONICAL_TENDER_FFD12_TAGS.insurance,
		commissionRatePercent: 0.0,
		isInstantFiscal: false,
		accentColor: "purple",
	},
	{
		id: "loyalty_points",
		canonicalTender: "loyalty_points",
		titleRu: "Баллы",
		subtitleRu: "Списание бонусов клиники (до 30%)",
		ffdTag: CANONICAL_TENDER_FFD12_TAGS.loyalty_points,
		commissionRatePercent: 0.0,
		isInstantFiscal: true,
		accentColor: "indigo",
	},
];
