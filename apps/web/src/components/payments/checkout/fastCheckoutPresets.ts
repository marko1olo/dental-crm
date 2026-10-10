/**
 * DENTE Dental CRM — 1-Click Fast Checkout & 54-FZ Split Payment Presets
 */

export type CheckoutPaymentMethodType =
	| "sbp_qr"
	| "bank_card"
	| "cash"
	| "patient_deposit"
	| "dms_insurance"
	| "loyalty_points";

export interface CheckoutPaymentMethodInfo {
	readonly id: CheckoutPaymentMethodType;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly ffdTag: number;
	readonly commissionRatePercent: number;
	readonly isInstantFiscal: boolean;
	readonly accentColor: string;
}

export const CHECKOUT_PAYMENT_METHODS: readonly CheckoutPaymentMethodInfo[] = [
	{
		id: "sbp_qr",
		titleRu: "СБП (QR)",
		subtitleRu: "Динамический QR НСПК (0.4–0.7% комиссия)",
		ffdTag: 1081,
		commissionRatePercent: 0.4,
		isInstantFiscal: true,
		accentColor: "teal",
	},
	{
		id: "bank_card",
		titleRu: "Карта (POS)",
		subtitleRu: "Безналичная оплата через терминал",
		ffdTag: 1081,
		commissionRatePercent: 1.5,
		isInstantFiscal: true,
		accentColor: "blue",
	},
	{
		id: "cash",
		titleRu: "Наличные",
		subtitleRu: "Купюры в кассу с автокалькулятором сдачи",
		ffdTag: 1031,
		commissionRatePercent: 0.0,
		isInstantFiscal: true,
		accentColor: "emerald",
	},
	{
		id: "patient_deposit",
		titleRu: "Депозит",
		subtitleRu: "Списание с баланса пациента",
		ffdTag: 1215,
		commissionRatePercent: 0.0,
		isInstantFiscal: true,
		accentColor: "amber",
	},
	{
		id: "dms_insurance",
		titleRu: "ДМС (Страховка)",
		subtitleRu: "Гарантийное письмо с доплатой",
		ffdTag: 1081,
		commissionRatePercent: 0.0,
		isInstantFiscal: false,
		accentColor: "purple",
	},
	{
		id: "loyalty_points",
		titleRu: "Баллы",
		subtitleRu: "Списание бонусов клиники (до 30%)",
		ffdTag: 1216,
		commissionRatePercent: 0.0,
		isInstantFiscal: true,
		accentColor: "indigo",
	},
];
