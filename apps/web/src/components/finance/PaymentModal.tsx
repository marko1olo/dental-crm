/**
 * apps/web/src/components/finance/PaymentModal.tsx
 *
 * DENTE Dental CRM — Universal Payment & Sberbank POS Terminal Modal.
 * Supports Cash, Sberbank POS Terminal, SberPay QR, FacePay Biometry, Family Wallet, and Split Payments.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	X,
	CreditCard,
	Banknote,
	QrCode,
	Smile,
	Wallet,
	Printer,
	ShieldCheck,
	CheckCircle,
	CheckCircle2,
	AlertCircle,
	AlertTriangle,
	Coins,
	Building2,
	User,
	FileText,
	Users,
	Sparkles,
	Zap,
	Percent,
	Tag,
	MoreHorizontal,
	Send,
	RotateCcw,
} from "lucide-react";
import {
	type SberPosTransactionResponse,
	kopecksToRub,
	rubToKopecks,
	createCompositeIdempotencyKey,
	STOMX_CASH_RECEIPT_CATEGORIES,
	STOMX_CASH_BOXES,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
} from "@dental/shared";
import {
	allocateRemainderToTender,
	calculateCashChange,
	validate54FzBuyerInn,
	type PayerType,
	type TenderAllocationTarget,
} from "./cashboxOperations.js";
import {
	applyQuickCheckoutPreset,
	paymentsToSplitState,
} from "../payments/checkout/fastCheckoutEngine";
import { SberPayIntegration } from "./SberPayIntegration.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { SbpPaymentQrModal } from "../messaging/SbpPaymentQrModal.js";

let paymentMutationSeq = 0;

export type PaymentMethodTab = "card_terminal" | "sberpay_qr" | "sbp_qr" | "biometry" | "cash" | "family_deposit" | "split";

export interface PaymentModalProps {
	readonly isOpen: boolean;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly amountKopecks?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly defaultMethod?: PaymentMethodTab | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly patientDebtRub?: number | undefined;
	readonly cashierName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialDiscountPercent?: number | undefined;
	readonly initialCustomDiscountRub?: number | undefined;
	readonly initialDiscountReason?: string | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly initialSplit5050?: boolean | undefined;
	readonly onPrintInvoice?: (() => void) | undefined;
	readonly onPrintAct?: (() => void) | undefined;
	readonly onClose: () => void;
	readonly onSuccess?: ((paymentData: {
		method: string;
		amountKopecks: number;
		rrn?: string | undefined;
		authCode?: string | undefined;
		discountRub?: number | undefined;
		discountPercent?: number | undefined;
		rawTotalRub?: number | undefined;
		discountReason?: string | undefined;
		[key: string]: unknown;
	}) => void) | undefined;
}

export interface PaymentDiscountCalculation {
	readonly rawTotalDueRub: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
	readonly totalDueRub: number;
	readonly totalDueKopecks: number;
	readonly effectiveDiscountPercent: number;
	readonly discountPercent: number;
	readonly isWarranty100: boolean;
}

/**
 * Wave 66 (Feature 255): Doctor Autonomy & Multi-Tier Discounts calculation (Mandates 8b, 8e п. 7, 8k, 8n).
 * Guarantees penny-exact integer kopeck calculations without IEEE-754 float drift.
 */
export function calculatePaymentDiscount(
	rawTotalDueRub: number,
	options: {
		isWarranty100?: boolean;
		customDiscountRub?: number;
		discountPercent?: number;
	} = {},
): PaymentDiscountCalculation {
	const rawKop = rubToKopecks(rawTotalDueRub);
	if (options.isWarranty100) {
		return {
			rawTotalDueRub,
			discountRub: rawTotalDueRub,
			discountKopecks: rawKop,
			totalDueRub: 0,
			totalDueKopecks: 0,
			effectiveDiscountPercent: 100,
			discountPercent: 100,
			isWarranty100: true,
		};
	}
	if (options.customDiscountRub !== undefined && options.customDiscountRub > 0) {
		const customKop = rubToKopecks(options.customDiscountRub);
		const cappedDiscountKop = Math.min(rawKop, customKop);
		const dueKop = Math.max(0, rawKop - cappedDiscountKop);
		const effPercent = rawKop > 0 ? Number(((cappedDiscountKop / rawKop) * 100).toFixed(2)) : 0;
		return {
			rawTotalDueRub,
			discountRub: kopecksToRub(cappedDiscountKop),
			discountKopecks: cappedDiscountKop,
			totalDueRub: kopecksToRub(dueKop),
			totalDueKopecks: dueKop,
			effectiveDiscountPercent: effPercent,
			discountPercent: effPercent,
			isWarranty100: false,
		};
	}
	if (options.discountPercent !== undefined && options.discountPercent > 0) {
		const discountKop = Math.round((rawKop * options.discountPercent) / 100);
		const cappedDiscountKop = Math.min(rawKop, discountKop);
		const dueKop = Math.max(0, rawKop - cappedDiscountKop);
		return {
			rawTotalDueRub,
			discountRub: kopecksToRub(cappedDiscountKop),
			discountKopecks: cappedDiscountKop,
			totalDueRub: kopecksToRub(dueKop),
			totalDueKopecks: dueKop,
			effectiveDiscountPercent: options.discountPercent,
			discountPercent: options.discountPercent,
			isWarranty100: false,
		};
	}
	return {
		rawTotalDueRub,
		discountRub: 0,
		discountKopecks: 0,
		totalDueRub: rawTotalDueRub,
		totalDueKopecks: rawKop,
		effectiveDiscountPercent: 0,
		discountPercent: 0,
		isWarranty100: false,
	};
}

export function generateInvoicePrintHtml(params: {
	invoiceNumber: string;
	clinicLegalName: string;
	patientName: string;
	effectiveCashier: string;
	rawTotalDueRub: number;
	discountRub: number;
	effectiveDiscountPercent: number;
	discountReason: string;
	totalDueRub: number;
	isWarranty100?: boolean;
	dateStr?: string;
}): string {
	const discountInfoHtml =
		params.discountRub > 0
			? `<div class="discount-block" style="margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
  <div>Сумма без скидки: <strong>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</strong></div>
  <div style="color: #b45309; font-weight: 600; margin-top: 4px;">Скидка: ${params.discountRub.toLocaleString("ru-RU")} ₽ (${params.effectiveDiscountPercent}%${params.discountReason ? ` — ${params.discountReason}` : ""})</div>
</div>`
			: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Счёт на оплату ${params.invoiceNumber}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f8fafc; font-weight: 700; }
.total { text-align: right; font-size: 16px; font-weight: 800; margin-top: 20px; }
.footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>СЧЁТ НА ОПЛАТУ № ${params.invoiceNumber}</h1>
  <div class="clinic">${params.clinicLegalName} • Стоматологические услуги • Без НДС (пп. 2 п. 2 ст. 149 НК РФ)</div>
</div>
<div class="patient">
  <div><strong>Плательщик:</strong> ${params.patientName}</div>
  <div><strong>Врач / Кассир:</strong> ${params.effectiveCashier}</div>
  <div><strong>Дата:</strong> ${params.dateStr || new Date().toLocaleDateString("ru-RU")}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Наименование медицинской услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Стоматологическое лечение по наряду-заказу</td><td>1</td><td>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</td></tr>
  </tbody>
</table>
${discountInfoHtml}
<div class="total">Итого к оплате: ${params.isWarranty100 ? "0 ₽ (Скидка 100% — Гарантия)" : `${params.totalDueRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Врач-стоматолог: ________________ / ${params.effectiveCashier} /</div>
  <div>М.П.</div>
</div>
</body>
</html>`;
}

export function generateActPrintHtml(params: {
	actNumber: string;
	clinicLegalName: string;
	patientName: string;
	effectiveCashier: string;
	rawTotalDueRub: number;
	discountRub: number;
	effectiveDiscountPercent: number;
	discountReason: string;
	totalDueRub: number;
	isWarranty100?: boolean;
	dateStr?: string;
}): string {
	const discountInfoHtml =
		params.discountRub > 0
			? `<div class="discount-block" style="margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
  <div>Сумма без скидки: <strong>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</strong></div>
  <div style="color: #b45309; font-weight: 600; margin-top: 4px;">Скидка: ${params.discountRub.toLocaleString("ru-RU")} ₽ (${params.effectiveDiscountPercent}%${params.discountReason ? ` — ${params.discountReason}` : ""})</div>
</div>`
			: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт выполненных работ ${params.actNumber}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f8fafc; font-weight: 700; }
.total { text-align: right; font-size: 16px; font-weight: 800; margin-top: 20px; }
.footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ СТОМАТОЛОГИЧЕСКИХ РАБОТ № ${params.actNumber}</h1>
  <div class="clinic">${params.clinicLegalName} • Приказ Минздрава РФ № 804н • Закон РФ № 2300-1</div>
</div>
<div class="patient">
  <div><strong>Пациент (Заказчик):</strong> ${params.patientName}</div>
  <div><strong>Лечащий врач (Исполнитель):</strong> ${params.effectiveCashier}</div>
  <div><strong>Дата:</strong> ${params.dateStr || new Date().toLocaleDateString("ru-RU")}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Код услуги (804н)</th><th>Наименование услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>A16.07.002</td><td>Стоматологический прием и лечение</td><td>1</td><td>${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</td></tr>
  </tbody>
</table>
${discountInfoHtml}
<div class="total">Всего оказано услуг на сумму: ${params.rawTotalDueRub.toLocaleString("ru-RU")} ₽</div>
<div class="total" style="margin-top: 6px; font-size: 16px;">Итого к оплате: ${params.isWarranty100 ? "0 ₽ (Скидка 100% — Гарантия)" : `${params.totalDueRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Заказчик: ________________ / ${params.patientName} /</div>
  <div>Исполнитель: ________________ / ${params.effectiveCashier} /</div>
</div>
</body>
</html>`;
}

const DISCOUNT_PRESETS = [
	{ percent: 0, label: "Без скидки 0%", title: "Без скидки 0%", testId: "preset-discount-0", reason: "" },
	{ percent: 5, label: "-5% Пенс/Утро", title: "Скидка 5% (Пенсионная / Утренняя)", testId: "preset-discount-5", reason: "Пенсионная / Утренняя" },
	{ percent: 10, label: "-10% Постоянный", title: "Скидка 10% (Постоянный пациент / Семейная скидка)", testId: "preset-discount-10", reason: "Постоянный пациент / Семейная скидка" },
	{ percent: 15, label: "-15% Комплекс", title: "Скидка 15% (Комплексный план лечения)", testId: "preset-discount-15", reason: "Комплексный план лечения" },
	{ percent: 20, label: "-20% Партнёр", title: "Скидка 20% (Сотрудники клиники / Партнёры)", testId: "preset-discount-20", reason: "Сотрудники клиники / Партнёры" },
	{ percent: 50, label: "-50% Персонал", title: "Скидка 50% (Персонал клиники / Близкие родственники)", testId: "preset-discount-50", reason: "Персонал клиники / Близкие родственники" },
] as const;

const CASH_DENOMINATIONS = [
	{ amount: 1000, testId: "btn-cash-1000", label: "1 000 ₽" },
	{ amount: 2000, testId: "btn-cash-2000", label: "2 000 ₽" },
	{ amount: 5000, testId: "btn-cash-5000", label: "5 000 ₽" },
	{ amount: 10000, testId: "btn-cash-10000", label: "10 000 ₽" },
] as const;

const CASH_ADD_BUTTONS = [
	{ amount: 1000, testId: "btn-cash-add-1000", label: "+1 000 ₽" },
	{ amount: 2000, testId: "btn-cash-add-2000", label: "+2 000 ₽" },
	{ amount: 5000, testId: "btn-cash-add-5000", label: "+5 000 ₽" },
] as const;

export const PaymentModal: React.FC<PaymentModalProps> = ({
	isOpen,
	patientId = "pat-walkin",
	patientName = "Пациент",
	patientPhone = "",
	amountKopecks,
	amountRub: propAmountRub,
	invoiceId,
	visitId,
	documentId,
	defaultMethod = "card_terminal",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	patientDebtRub = 0,
	cashierName,
	doctorName,
	clinicLegalName = "ООО «ДЕНТЕ»",
	initialDiscountPercent = 0,
	initialCustomDiscountRub = 0,
	initialDiscountReason = "",
	initialWarranty100 = false,
	initialSplit5050 = false,
	onPrintInvoice,
	onPrintAct,
	onClose,
	onSuccess = () => {},
}) => {
	const [activeMethod, setActiveMethod] = useState<PaymentMethodTab>(defaultMethod);
	const [isSubmittingCash, setIsSubmittingCash] = useState<boolean>(false);
	const [isSubmittingSplit, setIsSubmittingSplit] = useState<boolean>(false);
	const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

	// StomX Cash Box and Cash Flow Categories (Mandates 8e, 8n)
	const [selectedCashBoxType, setSelectedCashBoxType] = useState<StomxCashBoxType>("main");
	const [selectedReceiptAlias, setSelectedReceiptAlias] = useState<StomxReceiptTypeAlias>("appointment_payment");

	// Solo Doctor & Cashier Autonomy: fallback to doctor name or default solo clinic (Mandates 8e & 8n)
	const effectiveCashier = (cashierName || "").trim() || (doctorName || "").trim() || "Врач-стоматолог";

	// Multi-tender split payment state
	const rawTotalDueRub =
		propAmountRub !== undefined
			? propAmountRub
			: amountKopecks !== undefined
				? Number((amountKopecks / 100).toFixed(2))
				: 0;

	// Doctor Autonomy Discounts (Mandate 8e Item 7)
	const [isWarranty100, setIsWarranty100] = useState<boolean>(initialWarranty100);
	const [discountPercent, setDiscountPercent] = useState<number>(initialDiscountPercent || (initialWarranty100 ? 100 : 0));
	const [customDiscountRub, setCustomDiscountRub] = useState<number>(initialCustomDiscountRub);
	const [discountReason, setDiscountReason] = useState<string>(
		initialDiscountReason || (initialWarranty100 ? "Гарантийная переделка" : "")
	);

	const discountCalc = useMemo(() => {
		return calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100,
			customDiscountRub,
			discountPercent,
		});
	}, [rawTotalDueRub, isWarranty100, customDiscountRub, discountPercent]);

	const { discountRub, totalDueRub, effectiveDiscountPercent } = discountCalc;

	const initialSplit5050Cash = initialSplit5050
		? kopecksToRub(Math.floor(rubToKopecks(totalDueRub) / 2))
		: 0;
	const initialSplit5050Card = initialSplit5050
		? kopecksToRub(rubToKopecks(totalDueRub) - rubToKopecks(initialSplit5050Cash))
		: totalDueRub;
	const [splitCardRub, setSplitCardRub] = useState<number>(initialSplit5050Card);
	const [splitCashRub, setSplitCashRub] = useState<number>(initialSplit5050Cash);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitCertificateRub, setSplitCertificateRub] = useState<number>(0);
	const [splitBonusRub, setSplitBonusRub] = useState<number>(0);

	// Acquiring & 54-FZ Emergency Collision Resolution (Mandates 8e, 8n)
	const [interruptedPaymentState, setInterruptedPaymentState] = useState<{
		isInterrupted: boolean;
		reason: string;
		method: string;
		amountRub: number;
		lastMutationId?: string;
	} | null>(null);
	const [isSubmittingManualCard, setIsSubmittingManualCard] = useState<boolean>(false);
	const [fiscalizationRetryPending, setFiscalizationRetryPending] = useState<boolean>(false);
	const [isRetryingFiscalization, setIsRetryingFiscalization] = useState<boolean>(false);

	// 54-FZ Buyer Details & Cashier Autonomy state (Mandates 8e & 8n)
	const [payerType, setPayerType] = useState<PayerType>("physical");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerInnError, setBuyerInnError] = useState<string | null>(null);
	const [receivedCashRub, setReceivedCashRub] = useState<number>(totalDueRub);

	const cashChange = useMemo(() => {
		return calculateCashChange(totalDueRub, receivedCashRub);
	}, [receivedCashRub, totalDueRub]);

	const syncSplitAndCashToTotal = (newTotalRub: number) => {
		setReceivedCashRub(newTotalRub);
		if (newTotalRub === 0) {
			setSplitCardRub(0);
			setSplitCashRub(0);
			setSplitDepositRub(0);
			setSplitSbpRub(0);
			setSplitCertificateRub(0);
			setSplitBonusRub(0);
			return;
		}
		if (splitCashRub > 0 && splitCardRub === 0) {
			const other = splitDepositRub + splitSbpRub + splitCertificateRub + splitBonusRub;
			const cashRemainder = Math.max(0, Number((newTotalRub - other).toFixed(2)));
			setSplitCashRub(cashRemainder);
		} else {
			const other = splitCashRub + splitDepositRub + splitSbpRub + splitCertificateRub + splitBonusRub;
			const cardRemainder = Math.max(0, Number((newTotalRub - other).toFixed(2)));
			setSplitCardRub(cardRemainder);
		}
	};

	const applyDiscountPreset = (percent: number, reason: string) => {
		const newPercent = Math.max(0, Math.min(100, percent));
		const isWarranty = newPercent === 100 && (reason.includes("Гарант") || isWarranty100);
		setIsWarranty100(isWarranty);
		setDiscountPercent(newPercent);
		setCustomDiscountRub(0);
		setDiscountReason(reason);

		const calc = calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100: isWarranty,
			customDiscountRub: 0,
			discountPercent: newPercent,
		});
		syncSplitAndCashToTotal(calc.totalDueRub);

		if (newPercent === 0) {
			showToast("Скидка сброшена (Без скидки 0%)", "info", 1500);
		} else {
			showToast(
				`Применена скидка ${newPercent}% (${reason}): к оплате ${calc.totalDueRub.toLocaleString("ru-RU")} ₽`,
				"info",
				2500,
			);
		}
	};

	const applyWarranty100Preset = () => {
		setIsWarranty100(true);
		setDiscountPercent(100);
		setCustomDiscountRub(0);
		setDiscountReason("Гарантийная переделка");
		syncSplitAndCashToTotal(0);
		showToast("Применена скидка 100% (Гарантийная переделка • 0 ₽)", "info", 2500);
	};

	const handleCustomPercentChange = (val: number) => {
		const clamped = Math.max(0, Math.min(100, val));
		const isWarranty = clamped === 100;
		setIsWarranty100(isWarranty);
		setDiscountPercent(clamped);
		setCustomDiscountRub(0);
		setDiscountReason(clamped > 0 ? "Индивидуальная скидка врача" : "");

		const calc = calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100: isWarranty,
			customDiscountRub: 0,
			discountPercent: clamped,
		});
		syncSplitAndCashToTotal(calc.totalDueRub);
	};

	const handleCustomDiscountRubChange = (val: number) => {
		const clamped = Math.max(0, val);
		setIsWarranty100(false);
		setDiscountPercent(0);
		setCustomDiscountRub(clamped);
		setDiscountReason(clamped > 0 ? "Индивидуальная скидка врача (в рублях)" : "");

		const calc = calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100: false,
			customDiscountRub: clamped,
			discountPercent: 0,
		});
		syncSplitAndCashToTotal(calc.totalDueRub);
	};

	const handleInnChange = (value: string) => {
		const cleaned = value.replace(/\D/g, "").slice(0, 12);
		setBuyerInn(cleaned);
		if (cleaned.length > 0) {
			if (payerType === "physical") {
				// 54-ФЗ: Для физлиц ИНН строго опционален и никогда не блокирует оплату
				setBuyerInnError(null);
			} else {
				const validation = validate54FzBuyerInn(cleaned, payerType);
				if (!validation.isValid) {
					setBuyerInnError(validation.errorMessage || "Некорректный ИНН");
				} else {
					setBuyerInnError(null);
				}
			}
		} else {
			setBuyerInnError(null);
		}
	};

	const resetSplitTenders = (
		overrides: Partial<{
			card: number;
			cash: number;
			deposit: number;
			sbp: number;
			certificate: number;
			bonus: number;
		}> = {},
	) => {
		setSplitCardRub(overrides.card ?? 0);
		setSplitCashRub(overrides.cash ?? 0);
		setSplitDepositRub(overrides.deposit ?? 0);
		setSplitSbpRub(overrides.sbp ?? 0);
		setSplitCertificateRub(overrides.certificate ?? 0);
		setSplitBonusRub(overrides.bonus ?? 0);
	};

	useEffect(() => {
		if (!isOpen) return;
		setReceivedCashRub(totalDueRub);

		if (initialSplit5050 && totalDueRub > 0) {
			const totalKop = rubToKopecks(totalDueRub);
			const res = applyQuickCheckoutPreset({
				totalBillKop: totalKop,
				preset: "split_50_50",
			});
			const splitState = paymentsToSplitState(res.payments);
			resetSplitTenders({ cash: splitState.cashRub, card: splitState.cardRub });
			setActiveMethod("split");
		} else if (
			splitCardRub === 0 &&
			splitCashRub === 0 &&
			splitDepositRub === 0 &&
			splitSbpRub === 0 &&
			splitCertificateRub === 0 &&
			splitBonusRub === 0
		) {
			setSplitCardRub(totalDueRub);
		}
	}, [isOpen, initialSplit5050, totalDueRub]);

	const applySplitRemainder = (targetTender: TenderAllocationTarget) => {
		const next = allocateRemainderToTender({
			totalDueRub,
			currentTenders: {
				cardRub: splitCardRub,
				cashRub: splitCashRub,
				sbpRub: splitSbpRub,
				depositRub: splitDepositRub,
				familyRub: 0,
				certificateRub: splitCertificateRub,
				bonusRub: splitBonusRub,
			},
			targetTender,
			patientDepositRub,
		});
		resetSplitTenders({
			card: next.cardRub,
			cash: next.cashRub,
			deposit: next.depositRub,
			sbp: next.sbpRub,
			certificate: next.certificateRub || 0,
			bonus: next.bonusRub || 0,
		});
	};

	const applyExactCashPreset = () => {
		if (isWarranty100) {
			setIsWarranty100(false);
			setDiscountPercent(0);
			setDiscountReason("");
		}
		setActiveMethod("cash");
		const effectiveTotal = isWarranty100 ? rawTotalDueRub : totalDueRub;
		const res = applyQuickCheckoutPreset({
			totalBillKop: rubToKopecks(effectiveTotal),
			preset: "100_cash",
		});
		const splitState = paymentsToSplitState(res.payments);
		const exactRub = splitState.cashRub > 0 ? splitState.cashRub : effectiveTotal;
		setReceivedCashRub(exactRub);
		resetSplitTenders({ cash: exactRub });
		showToast(`Применен пресет: Без сдачи (Ровно сумма счёта: ${exactRub.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const applySpendAllDepositBonusPreset = () => {
		setIsWarranty100(false);
		const totalKop = rubToKopecks(totalDueRub);
		const availDepositRub = patientDepositRub > 0 ? patientDepositRub : 0;
		const availFamilyRub = patientFamilyBalanceRub > 0 ? patientFamilyBalanceRub : 0;
		const maxAvailRub = Math.max(availDepositRub, availFamilyRub);
		const depositKop = rubToKopecks(maxAvailRub);

		if (depositKop >= totalKop && totalKop > 0) {
			setActiveMethod("family_deposit");
			resetSplitTenders({ deposit: totalDueRub });
			showToast(`Применен пресет: Списан весь аванс/бонусы (${totalDueRub.toLocaleString("ru-RU")} ₽)`, "info", 2500);
		} else if (depositKop > 0) {
			const res = applyQuickCheckoutPreset({
				totalBillKop: totalKop,
				preset: "use_deposit",
				availableDepositKop: depositKop,
			});
			const splitState = paymentsToSplitState(res.payments);
			resetSplitTenders({ deposit: splitState.depositRub, card: splitState.cardRub });
			setActiveMethod("split");
			showToast(
				`Применен пресет: Списан весь аванс/бонусы ${splitState.depositRub.toLocaleString("ru-RU")} ₽ + остаток ${splitState.cardRub.toLocaleString("ru-RU")} ₽ картой`,
				"info",
				2500,
			);
		} else {
			setActiveMethod("split");
			const bonusAmount = Math.min(totalDueRub, 500);
			const cardRest = Math.max(0, Number((totalDueRub - bonusAmount).toFixed(2)));
			resetSplitTenders({ bonus: bonusAmount, card: cardRest });
			showToast(`Аванс 0 ₽. Применено списание бонусов (${bonusAmount} ₽) + Карта (${cardRest} ₽)`, "info", 2500);
		}
	};

	const apply5050CashCardPreset = () => {
		setIsWarranty100(false);
		const totalKop = rubToKopecks(totalDueRub);
		const res = applyQuickCheckoutPreset({
			totalBillKop: totalKop,
			preset: "split_50_50",
		});
		const splitState = paymentsToSplitState(res.payments);
		resetSplitTenders({ cash: splitState.cashRub, card: splitState.cardRub });
		setActiveMethod("split");
		showToast(
			`Применен пресет: 50/50 Нал (${splitState.cashRub.toLocaleString("ru-RU")} ₽) + Карта (${splitState.cardRub.toLocaleString("ru-RU")} ₽)`,
			"info",
			2500,
		);
	};

	const applyFullCardPreset = () => {
		if (isWarranty100) {
			setIsWarranty100(false);
			setDiscountPercent(0);
			setDiscountReason("");
		}
		setActiveMethod("card_terminal");
		const effectiveTotal = isWarranty100 ? rawTotalDueRub : totalDueRub;
		const res = applyQuickCheckoutPreset({
			totalBillKop: rubToKopecks(effectiveTotal),
			preset: "100_card",
		});
		const splitState = paymentsToSplitState(res.payments);
		resetSplitTenders({ card: splitState.cardRub > 0 ? splitState.cardRub : effectiveTotal });
		showToast(`Применен пресет: Оплата картой 100% (${effectiveTotal.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const applyDepositPlusCardPreset = () => {
		if (isWarranty100) {
			setIsWarranty100(false);
			setDiscountPercent(0);
			setDiscountReason("");
		}
		const available = Math.min(totalDueRub, Math.max(0, patientDepositRub));
		const remainder = Number((totalDueRub - available).toFixed(2));
		resetSplitTenders({ deposit: available, card: remainder });
		setActiveMethod("split");
		showToast(
			`Применен пресет: Аванс ${available.toLocaleString("ru-RU")} ₽ + Карта ${remainder.toLocaleString("ru-RU")} ₽`,
			"info",
			3000,
		);
	};

	const applyThreeWayCashCardAdvancePreset = () => {
		if (isWarranty100) {
			setIsWarranty100(false);
			setDiscountPercent(0);
			setDiscountReason("");
		}
		const totalKop = rubToKopecks(totalDueRub);
		const availDepositRub = patientDepositRub > 0 ? patientDepositRub : 0;
		const availFamilyRub = patientFamilyBalanceRub > 0 ? patientFamilyBalanceRub : 0;
		const maxAvailRub = Math.max(availDepositRub, availFamilyRub);
		const res = applyQuickCheckoutPreset({
			totalBillKop: totalKop,
			preset: "split_three_way",
			availableDepositKop: rubToKopecks(maxAvailRub),
		});
		const splitState = paymentsToSplitState(res.payments);
		resetSplitTenders({
			deposit: splitState.depositRub,
			cash: splitState.cashRub,
			card: splitState.cardRub,
		});
		setActiveMethod("split");
		showToast(
			`Применен пресет: Аванс ${splitState.depositRub.toLocaleString("ru-RU")} ₽ + Нал ${splitState.cashRub.toLocaleString("ru-RU")} ₽ + Карта ${splitState.cardRub.toLocaleString("ru-RU")} ₽`,
			"info",
			2500,
		);
	};

	const handleQuickPrintInvoice = () => {
		if (onPrintInvoice) {
			onPrintInvoice();
			return;
		}
		const invoiceNumber = invoiceId ? `СЧ-${invoiceId.slice(0, 8).toUpperCase()}` : `СЧ-${Date.now().toString().slice(-6)}`;
		const invoiceHtml = generateInvoicePrintHtml({
			invoiceNumber,
			clinicLegalName,
			patientName,
			effectiveCashier,
			rawTotalDueRub,
			discountRub,
			effectiveDiscountPercent,
			discountReason,
			totalDueRub,
			isWarranty100,
		});
		void hardwarePrinter.printHtmlWithPopupFallback(invoiceHtml, {
			title: `Счет № ${invoiceNumber}`,
			downloadFilename: `Schet_${invoiceNumber}.html`,
		}).then(() => {
			showToast("Печать счета отправлена на принтер", "success");
		}).catch(() => {
			showToast("Ошибка отправки счета на печать", "error");
		});
	};

	const handleQuickPrintAct = () => {
		if (onPrintAct) {
			onPrintAct();
			return;
		}
		const actNumber = invoiceId ? `АКТ-${invoiceId.slice(0, 8).toUpperCase()}` : `АКТ-${Date.now().toString().slice(-6)}`;
		const actHtml = generateActPrintHtml({
			actNumber,
			clinicLegalName,
			patientName,
			effectiveCashier,
			rawTotalDueRub,
			discountRub,
			effectiveDiscountPercent,
			discountReason,
			totalDueRub,
			isWarranty100,
		});
		void hardwarePrinter.printHtmlWithPopupFallback(actHtml, {
			title: `Акт № ${actNumber}`,
			downloadFilename: `Akt_${actNumber}.html`,
		}).then(() => {
			showToast("Печать акта отправлена на принтер", "success");
		}).catch(() => {
			showToast("Ошибка отправки акта на печать", "error");
		});
	};

	if (!isOpen) return null;

	const effectiveAmountKopecks = amountKopecks !== undefined ? amountKopecks : Math.round((propAmountRub || 0) * 100);
	const amountRub = (effectiveAmountKopecks / 100).toFixed(2);

	const handleCashSubmit = async () => {
		if (isWarranty100 || totalDueRub <= 0) {
			showToast(`Визит/счёт оформлен по 100% гарантии (0 ₽) (${effectiveCashier})`, "success");
			onSuccess({
				method: "warranty_discount_100",
				amountKopecks: 0,
				discountRub: discountCalc.discountRub,
				discountPercent: discountCalc.discountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || "Гарантийная переделка / скидка 100%",
			});
			onClose();
			return;
		}

		if (payerType === "legal_entity") {
			const validation = validate54FzBuyerInn(buyerInn, payerType);
			if (!validation.isValid) {
				setBuyerInnError(validation.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
				showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
				return;
			}
		}

		const effectiveAmountRub =
			receivedCashRub > 0 && receivedCashRub < totalDueRub
				? receivedCashRub
				: totalDueRub;

		setIsSubmittingCash(true);
		try {
			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name || "Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const clientMutationId = createCompositeIdempotencyKey(
				`cash:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: effectiveAmountRub, method: "cash", cashBoxType: selectedCashBoxType }
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
			const changeNote = cashChange.changeRub > 0 ? ` (получено ${receivedCashRub} ₽, сдача ${cashChange.changeRub} ₽)` : "";
			const stomxNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;

			// Record Cash transaction in backend via canonical billing payments endpoint
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: effectiveAmountRub,
					method: "cash",
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Оплата наличными через кассу (${effectiveAmountRub} ₽ • ${effectiveCashier})${changeNote}${innNote}${stomxNote}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					(errorData && typeof errorData.error === "string" && errorData.error) ||
					`Ошибка приёма наличных: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(`Оплата ${effectiveAmountRub} ₽ наличными принята в кассу (${effectiveCashier})`, "success");
			onSuccess({
				method: "cash",
				amountKopecks: isWarranty100 ? 0 : rubToKopecks(effectiveAmountRub),
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg =
				err instanceof Error ? err.message : "Сбой соединения при приёме оплаты наличными";
			showToast(errorMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errorMsg,
				method: "cash",
				amountRub: effectiveAmountRub,
			});
		} finally {
			setIsSubmittingCash(false);
		}
	};

	const totalAllocatedRub = Number(
		(splitCardRub + splitCashRub + splitDepositRub + splitSbpRub + splitCertificateRub + splitBonusRub).toFixed(2),
	);
	const isBalanced = Math.abs(totalAllocatedRub - totalDueRub) < 0.009;

	const handleSplitSubmit = async () => {
		if (isWarranty100 || totalDueRub <= 0) {
			showToast(`Визит/счёт оформлен по 100% гарантии (0 ₽) (${effectiveCashier})`, "success");
			onSuccess({
				method: "warranty_discount_100",
				amountKopecks: 0,
				discountRub: discountCalc.discountRub,
				discountPercent: discountCalc.discountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || "Гарантийная переделка / скидка 100%",
			});
			onClose();
			return;
		}

		if (payerType === "legal_entity") {
			const validation = validate54FzBuyerInn(buyerInn, payerType);
			if (!validation.isValid) {
				setBuyerInnError(validation.errorMessage || "Для юрлица/ИП требуется валидный ИНН");
				showToast("Для юрлица/ИП требуется корректный ИНН (10 или 12 цифр)", "error");
				return;
			}
		}

		let effectiveCardRub = splitCardRub;
		let effectiveCashRub = splitCashRub;
		const effectiveDepositRub = splitDepositRub;
		const effectiveSbpRub = splitSbpRub;
		const effectiveCertificateRub = splitCertificateRub;
		const effectiveBonusRub = splitBonusRub;

		// Автоматически распределяем остаток до копейки без ошибок и блокировок кассы
		if (!isBalanced) {
			const remainder = Math.max(
				0,
				Number(
					(
						totalDueRub -
						(effectiveDepositRub + effectiveSbpRub + effectiveCertificateRub + effectiveBonusRub)
					).toFixed(2),
				),
			);
			if (effectiveCashRub > 0 && effectiveCardRub === 0) {
				effectiveCashRub = remainder;
			} else {
				effectiveCardRub = Math.max(0, Number((remainder - effectiveCashRub).toFixed(2)));
			}
			setSplitCardRub(effectiveCardRub);
			setSplitCashRub(effectiveCashRub);
		}

		setIsSubmittingSplit(true);
		try {
			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name || "Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const clientMutationId = createCompositeIdempotencyKey(
				`split:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: totalDueRub, method: "split", cashBoxType: selectedCashBoxType }
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const parts: string[] = [];
			if (effectiveCardRub > 0) parts.push(`карта ${effectiveCardRub} ₽`);
			if (effectiveCashRub > 0) parts.push(`нал ${effectiveCashRub} ₽`);
			if (effectiveDepositRub > 0) parts.push(`аванс ${effectiveDepositRub} ₽`);
			if (effectiveSbpRub > 0) parts.push(`СБП ${effectiveSbpRub} ₽`);
			if (effectiveCertificateRub > 0) parts.push(`сертификат ${effectiveCertificateRub} ₽`);
			if (effectiveBonusRub > 0) parts.push(`бонусы ${effectiveBonusRub} ₽`);

			const primaryMethod = effectiveCashRub > effectiveCardRub ? "cash" : "card";
			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
			const stomxNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: totalDueRub,
					method: primaryMethod,
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Комбинированная оплата (${effectiveCashier}): ${parts.join(" + ")}${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${innNote}${stomxNote}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка записи комбинированной оплаты: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(`Комбинированная оплата ${totalDueRub} ₽ успешно принята (${effectiveCashier})`, "success");
			onSuccess({
				method: "split",
				amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Сбой соединения при приёме комбинированной оплаты";
			showToast(errorMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errorMsg,
				method: "split",
				amountRub: totalDueRub,
			});
		} finally {
			setIsSubmittingSplit(false);
		}
	};

	const handleDepositSubmit = async (source: "deposit" | "family") => {
		setIsSubmittingDeposit(true);
		try {
			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name || "Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const amountRubNumber = totalDueRub;
			const clientMutationId = createCompositeIdempotencyKey(
				`${source}:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: amountRubNumber, method: source === "family" ? "family_deposit" : "deposit", cashBoxType: selectedCashBoxType }
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const stomxNote = ` [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`;
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: amountRubNumber,
					method: source === "family" ? "family_deposit" : "deposit",
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: source === "family"
						? `Оплата с семейного баланса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${stomxNote}`
						: `Оплата с лицевого счета / аванса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${stomxNote}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка списания со счета: HTTP ${res.status}`;
				showToast(errorMsg, "error");
				setInterruptedPaymentState({
					isInterrupted: true,
					reason: errorMsg,
					method: source,
					amountRub: totalDueRub,
				});
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(
				source === "family"
					? `Оплата ${totalDueRub} ₽ с семейного баланса успешно списана`
					: `Оплата ${totalDueRub} ₽ с аванса/депозита успешно списана`,
				"success",
			);
			onSuccess({
				method: source,
				amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : "Сбой соединения при списании со счета";
			showToast(errorMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errorMsg,
				method: source,
				amountRub: totalDueRub,
			});
		} finally {
			setIsSubmittingDeposit(false);
		}
	};

	const handleDepositOrPartialCombo = (source: "deposit" | "family") => {
		const availableBalance = source === "deposit" ? patientDepositRub : patientFamilyBalanceRub;
		if (availableBalance <= 0) {
			showToast(
				source === "deposit"
					? "На личном депозите пациента нет средств (0 ₽). Пополните аванс или выберите другой способ оплаты."
					: "Семейный баланс пуст (0 ₽). Пополните семейный кошелек или выберите другой способ оплаты.",
				"warning",
				4000,
			);
			return;
		}
		if (availableBalance >= totalDueRub) {
			handleDepositSubmit(source);
		} else if (availableBalance > 0) {
			const totalKop = rubToKopecks(totalDueRub);
			const balKop = Math.min(totalKop, rubToKopecks(availableBalance));
			const remKop = Math.max(0, totalKop - balKop);
			if (source === "deposit") {
				setSplitDepositRub(kopecksToRub(balKop));
				setSplitCardRub(kopecksToRub(remKop));
				setSplitCashRub(0);
				setSplitSbpRub(0);
			} else {
				setSplitDepositRub(kopecksToRub(balKop));
				setSplitCardRub(kopecksToRub(remKop));
				setSplitCashRub(0);
				setSplitSbpRub(0);
			}
			setActiveMethod("split");
			showToast(
				`Зачтено ${kopecksToRub(balKop)} ₽ ${source === "family" ? "из семьи" : "с аванса"}. Остаток ${kopecksToRub(remKop)} ₽ перенесён на карту.`,
				"info",
				3500,
			);
		}
	};

	// Acquiring Emergency Collision Resolver: Manual Card Terminal Confirmation (Mandates 8e, 8n)
	const handleManualCardTerminalConfirm = async (overrideAmountRub?: number) => {
		const amountToConfirm = overrideAmountRub ?? (interruptedPaymentState?.amountRub || totalDueRub);
		setIsSubmittingManualCard(true);
		try {
			const clientMutationId = createCompositeIdempotencyKey(
				`manual-card:${Date.now()}-${++paymentMutationSeq}`,
				{ patientId, amountRub: amountToConfirm, method: "card", manualConfirmed: true }
			);
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const activeCategoryTitle =
				STOMX_CASH_RECEIPT_CATEGORIES.find((c) => c.alias === selectedReceiptAlias)?.name || "Оплата услуг";
			const activeBoxTitle =
				STOMX_CASH_BOXES.find((b) => b.type === selectedCashBoxType)?.name || "Основная касса";

			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: amountToConfirm,
					method: "card",
					cashBoxType: selectedCashBoxType,
					receiptTypeAlias: selectedReceiptAlias,
					cashFlowCategory: activeCategoryTitle,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Оплата картой подтверждена на терминале вручную (${amountToConfirm} ₽ • ${effectiveCashier}) [Без повторного списания с карты] [ДДС: ${activeCategoryTitle} | Касса: ${activeBoxTitle}]`,
				}),
			});

			if (!res.ok) {
				const errData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errMsg =
					(errData && typeof errData.message === "string" && errData.message) ||
					`Ошибка фиксации ручного подтверждения: HTTP ${res.status}`;
				showToast(errMsg, "error");
				setInterruptedPaymentState({
					isInterrupted: true,
					reason: errMsg,
					method: "card",
					amountRub: amountToConfirm,
					lastMutationId: clientMutationId,
				});
				return;
			}

			const paymentData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			showToast(`Оплата картой подтверждена на терминале вручную (${amountToConfirm} ₽). Платеж сохранен!`, "success", 5000);
			setInterruptedPaymentState(null);
			setFiscalizationRetryPending(true);
			onSuccess({
				method: "card",
				amountKopecks: rubToKopecks(amountToConfirm),
				cardChargedManually: true,
				discountRub,
				discountPercent: effectiveDiscountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || undefined,
				...paymentData,
			});
			onClose();
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Сбой связи при ручном подтверждении терминала";
			showToast(errMsg, "error");
			setInterruptedPaymentState({
				isInterrupted: true,
				reason: errMsg,
				method: "card",
				amountRub: amountToConfirm,
			});
		} finally {
			setIsSubmittingManualCard(false);
		}
	};

	// 54-FZ Fiscalization Retry: Resends receipt to KKT/OFD without altering account balance or ledger (Mandate 8e)
	const handleRetryFiscalization = async () => {
		setIsRetryingFiscalization(true);
		try {
			const printRes = await hardwarePrinter.printFiscalReceipt({
				clinicName: clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: effectiveCashier,
				customerContact: patientPhone || patientName || "",
				operationType: "income",
				items: [
					{
						name: "Стоматологические услуги по плану лечения",
						priceRub: totalDueRub,
						quantity: 1,
						amountRub: totalDueRub,
						vatRate: "vat_0",
					},
				],
				totalRub: totalDueRub,
				electronicRub: activeMethod === "cash" ? 0 : totalDueRub,
				cashRub: activeMethod === "cash" ? totalDueRub : 0,
			});

			if (printRes && (printRes.status === "failed" || !printRes.success)) {
				showToast(`Ошибка фискализации на ККТ: ${printRes.error || "Устройство недоступно"}`, "error");
				setFiscalizationRetryPending(true);
			} else {
				showToast("Чек повторно отправлен на фискализацию в ККТ (баланс пациента не затронут)!", "success", 5000);
				setFiscalizationRetryPending(false);
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Ошибка повторной фискализации чека";
			showToast(errMsg, "error");
			setFiscalizationRetryPending(true);
		} finally {
			setIsRetryingFiscalization(false);
		}
	};

	const handleSberSuccess = (posRes: SberPosTransactionResponse) => {
		onSuccess({
			method: posRes.operationType,
			amountKopecks: posRes.amountKop,
			rrn: posRes.rrn,
			authCode: posRes.authCode,
			discountRub,
			discountPercent: effectiveDiscountPercent,
			rawTotalRub: rawTotalDueRub,
			discountReason: discountReason || undefined,
		});
		setTimeout(() => {
			onClose();
		}, 1200);
	};

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
		>
			<div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] min-h-0">
				{/* Modal Header */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div>
						<h2 id="payment-modal-title" className="text-base sm:text-lg font-bold m-0 flex items-center gap-2 flex-wrap">
							<ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
							<span>Прием оплаты • {totalDueRub.toLocaleString("ru-RU")} ₽</span>
							{discountRub > 0 && (
								<span
									className="text-xs font-normal line-through text-[var(--muted,#64748b)]"
									data-testid="text-payment-original-total"
								>
									{rawTotalDueRub.toLocaleString("ru-RU")} ₽
								</span>
							)}
							<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
								<CheckCircle2 size={12} />
								<span>54-ФЗ</span>
							</span>
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
							<span className="ml-2 text-[var(--muted,#64748b)]">• Врач / Кассир: <strong className="text-[var(--ink,#0f172a)]">{effectiveCashier}</strong></span>
						</p>
					</div>

					<div className="flex items-center gap-1.5 relative shrink-0">
						<button
							type="button"
							onClick={handleQuickPrintInvoice}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:h-8 sm:min-w-0 px-2.5 py-1 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
							title="Быстрая печать счета"
							aria-label="Печать счета"
							data-testid="btn-payment-modal-print-invoice"
						>
							<Printer size={14} className="text-slate-500 shrink-0" />
							<span className="hidden sm:inline whitespace-nowrap shrink-0">Счет</span>
						</button>
						<button
							type="button"
							onClick={handleQuickPrintAct}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:h-8 sm:min-w-0 px-2.5 py-1 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
							title="Быстрая печать акта сдачи-приемки (804н)"
							aria-label="Печать акта 804н"
							data-testid="btn-payment-modal-print-act"
						>
							<FileText size={14} className="text-slate-500 shrink-0" />
							<span className="hidden sm:inline whitespace-nowrap shrink-0">Акт 804н</span>
						</button>
						<button
							type="button"
							onClick={() => setIsMoreMenuOpen((prev) => !prev)}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:h-8 sm:w-8 sm:min-w-0 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer"
							title="Дополнительные операции (копия чека, SMS, возврат)"
							aria-label="Дополнительные действия"
							data-testid="btn-payment-more-actions"
						>
							<MoreHorizontal size={16} />
						</button>
						{isMoreMenuOpen && (
							<div
								className="absolute right-10 top-10 z-50 w-56 rounded-xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-xl p-1.5 text-xs text-[var(--ink,#0f172a)] space-y-1 animate-in fade-in zoom-in-95 duration-100"
								data-testid="menu-payment-more-options"
							>
								<button
									type="button"
									onClick={() => {
										setIsMoreMenuOpen(false);
										handleQuickPrintInvoice();
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
								>
									<Printer size={13} className="text-slate-500 shrink-0" />
									<span className="truncate">Печать копии счёта</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsMoreMenuOpen(false);
										handleQuickPrintAct();
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
								>
									<FileText size={13} className="text-slate-500 shrink-0" />
									<span className="truncate">Печать копии акта (804н)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsMoreMenuOpen(false);
										showToast(
											`Электронный чек 54-ФЗ отправлен на контакт: ${patientPhone || "телефон пациента"}`,
											"success",
											3000
										);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
								>
									<Send size={13} className="text-teal-600 shrink-0" />
									<span className="truncate">Отправить чек по SMS</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsMoreMenuOpen(false);
										showToast(
											"Для оформления возврата прихода откройте модуль фискализации 54-ФЗ (вкладка Возврат).",
											"info",
											4000
										);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 text-rose-600 cursor-pointer border-t border-[var(--line,#e2e8f0)] pt-1.5"
								>
									<RotateCcw size={13} className="shrink-0" />
									<span className="truncate">Чек возврата прихода (54-ФЗ)</span>
								</button>
							</div>
						)}
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
							aria-label="Закрыть"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* Method Selector Tabs */}
				<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center gap-2 overflow-x-auto flex-nowrap shrink-0 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<button
						type="button"
						onClick={() => setActiveMethod("card_terminal")}
						data-testid="tab-payment-card-terminal"
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMethod === "card_terminal"
								? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<CreditCard size={16} className="text-emerald-600 shrink-0" />
						<span className="whitespace-nowrap shrink-0">POS Терминал Сбербанк</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("sberpay_qr")}
						data-testid="tab-payment-sberpay-qr"
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMethod === "sberpay_qr"
								? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<QrCode size={16} className="text-teal-600 shrink-0" />
						<span className="whitespace-nowrap shrink-0">SberPay QR (СБП)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("sbp_qr")}
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMethod === "sbp_qr"
								? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-2 ring-teal-400"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-teal-400"
						}`}
						data-testid="tab-payment-sbp-qr"
						title="Оплата СБП по QR (НСПК / ГОСТ Р 56042-2014)"
					>
						<QrCode size={16} className="text-teal-600 shrink-0" />
						<span className="whitespace-nowrap shrink-0">Оплата СБП по QR</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("cash")}
						data-testid="tab-payment-cash"
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMethod === "cash"
								? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<Banknote size={16} className="text-emerald-600 shrink-0" />
						<span className="whitespace-nowrap shrink-0">Наличные</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("family_deposit")}
						data-testid="tab-payment-family-deposit"
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMethod === "family_deposit"
								? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-2 ring-pink-400"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<Users size={16} className="text-pink-600 shrink-0" />
						<span className="whitespace-nowrap shrink-0">Депозит / Семья</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("split")}
						data-testid="tab-payment-split"
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMethod === "split"
								? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<Wallet size={16} className="text-purple-600 shrink-0" />
						<span className="whitespace-nowrap shrink-0">Комбинированная (Сплит)</span>
					</button>
				</div>

				{/* Debt Autonomy Banner (Mandates 8e & 8n: Patient debt never blocks receipt or tender) */}
				{(patientDebtRub > 0 || patientDepositRub < 0) && (
					<div
						data-testid="debt-autonomy-banner"
						className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2 shrink-0"
					>
						<AlertTriangle size={14} className="shrink-0 text-amber-600" />
						<span>
							Задолженность пациента: {(patientDebtRub > 0 ? patientDebtRub : Math.abs(patientDepositRub)).toLocaleString("ru-RU")} ₽.
							Долг не блокирует приём оплаты на фактически внесённую сумму и фискализацию чека.
						</span>
					</div>
				)}

				{/* Modal Body */}
				<div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
					{/* 1-Click Fast Presets & Doctor Discounts Bar (Mandates 8c, 8d, 8e п. 7, 8k, 8n: Frictionless checkout & doctor autonomy discounts) */}
					<div
						className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5 text-xs"
						data-testid="payment-modal-presets-bar"
					>
						{/* Doctor Discounts Row */}
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
								<Percent size={14} className="text-amber-500 shrink-0" />
								<span>Скидки врача:</span>
								{discountRub > 0 && (
									<span
										className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
										data-testid="badge-discount-active"
									>
										-{effectiveDiscountPercent}% ({discountRub.toLocaleString("ru-RU")} ₽)
										{discountReason ? ` • ${discountReason}` : ""}
									</span>
								)}
							</div>
							<div className="flex items-center gap-1.5">
								<label htmlFor="input-discount-custom-percent" className="text-[11px] font-medium text-[var(--muted,#64748b)]">
									Своя скидка, %:
								</label>
								<div className="relative">
									<input
										id="input-discount-custom-percent"
										type="number"
										min={0}
										max={100}
										step="1"
										value={discountPercent || ""}
										onChange={(e) => handleCustomPercentChange(parseFloat(e.target.value) || 0)}
										placeholder="0%"
										data-testid="input-discount-custom-percent"
										className="h-8 w-20 px-2 text-xs font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-amber-500"
									/>
									<span className="absolute right-2 top-2 text-[10px] text-[var(--muted,#64748b)] pointer-events-none">%</span>
								</div>
							</div>
						</div>

						{/* 1-Click Discount Preset Buttons */}
						<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
							{DISCOUNT_PRESETS.map((p) => {
								const isActive = effectiveDiscountPercent === p.percent && !isWarranty100;
								const isZero = p.percent === 0;
								const activeClass = isZero
									? "bg-slate-700 text-white border-slate-700 shadow-2xs"
									: "bg-amber-600 text-white border-amber-600 shadow-2xs";
								const inactiveClass = isZero
									? "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-slate-400 text-[var(--ink,#0f172a)]"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]";
								return (
									<button
										key={p.percent}
										type="button"
										onClick={() => applyDiscountPreset(p.percent, p.reason)}
										className={`h-8 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
											isActive ? activeClass : inactiveClass
										}`}
										data-testid={p.testId}
										title={p.title}
									>
										{!isZero && (
											<Percent
												size={12}
												className={isActive ? "text-white" : "text-amber-600"}
											/>
										)}
										<span className="truncate">{p.label}</span>
									</button>
								);
							})}

							<button
								type="button"
								onClick={applyWarranty100Preset}
								className={`h-8 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
									isWarranty100
										? "bg-amber-600 text-white border-amber-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-warranty-100"
								title="Гарантийная переделка 100% (0 ₽, без фискального чека ККТ)"
							>
								<ShieldCheck size={14} className={isWarranty100 ? "text-white" : "text-amber-600"} />
								<span className="truncate">Гарантия 100% (0 ₽)</span>
							</button>
						</div>

						{/* 1-Click Tender Presets Row */}
						<div className="pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-1.5 font-bold text-[var(--muted,#64748b)]">
								<Zap size={14} className="text-amber-500 shrink-0" />
								<span>1-клик оплата:</span>
							</div>
						</div>
						<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
							<button
								type="button"
								onClick={applyExactCashPreset}
								className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
									activeMethod === "cash" && cashChange.isExact
										? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-exact-cash"
							>
								<Banknote size={14} className={activeMethod === "cash" && cashChange.isExact ? "text-white" : "text-emerald-600"} />
								<span className="truncate">Без сдачи (Ровно: {totalDueRub.toLocaleString("ru-RU")} ₽)</span>
							</button>
							<button
								type="button"
								onClick={applySpendAllDepositBonusPreset}
								className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
									(activeMethod === "family_deposit" || (activeMethod === "split" && (splitDepositRub > 0 || splitBonusRub > 0)))
										? "bg-purple-600 text-white border-purple-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-spend-all-deposit-bonus"
								title="Списать весь доступный аванс или бонусы"
							>
								<Wallet size={14} className={(activeMethod === "family_deposit" || (activeMethod === "split" && (splitDepositRub > 0 || splitBonusRub > 0))) ? "text-white" : "text-purple-600"} />
								<span className="truncate">Списать аванс/бонусы</span>
							</button>
							<button
								type="button"
								onClick={apply5050CashCardPreset}
								className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
									activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0
										? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-indigo-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-50-50-cash-card"
								title="50% суммы наличными в кассу + 50% картой через терминал"
							>
								<Coins size={14} className={activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 ? "text-white" : "text-indigo-600"} />
								<span className="truncate">50/50 Нал + Карта</span>
							</button>
							<button
								type="button"
								onClick={applyThreeWayCashCardAdvancePreset}
								className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
									activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub > 0
										? "bg-teal-600 text-white border-teal-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-three-way-split"
								title="Комбинированная оплата в 1 клик: Нал + Карта + Аванс"
							>
								<Users size={14} className={activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub > 0 ? "text-white" : "text-teal-600"} />
								<span className="truncate">Нал + Карта + Аванс</span>
							</button>
							<button
								type="button"
								onClick={applyFullCardPreset}
								className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
									activeMethod === "card_terminal"
										? "bg-blue-600 text-white border-blue-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-full-card"
							>
								<CreditCard size={14} className={activeMethod === "card_terminal" ? "text-white" : "text-blue-600"} />
								<span className="truncate">Картой 100% ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
							</button>
							{patientDepositRub > 0 && (
								<button
									type="button"
									onClick={applyDepositPlusCardPreset}
									className={`h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
										activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0
											? "bg-purple-600 text-white border-purple-600 shadow-2xs"
											: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
									}`}
									data-testid="preset-deposit-plus-card"
								>
									<Wallet size={14} className={activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0 ? "text-white" : "text-purple-600"} />
									<span className="truncate">Весь аванс ({Math.min(totalDueRub, patientDepositRub).toLocaleString("ru-RU")} ₽) + Карта</span>
								</button>
							)}
							<button
								type="button"
								onClick={() => setActiveMethod("sbp_qr")}
								className="h-8 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)] shrink-0"
								data-testid="preset-sbp-qr"
								title="Сформировать QR СБП для быстрой оплаты пациентом"
							>
								<QrCode size={14} className="text-teal-600" />
								<span className="truncate">Оплата СБП по QR ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
							</button>
						</div>
					</div>

					{/* StomX 6 Cash Boxes & Cash Flow Category (ДДС) Selector (Mandates 8e, 8n) */}
					<div
						className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5 text-xs"
						data-testid="payment-modal-stomx-bar"
					>
						{/* Cash Box Selection */}
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
								<Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
								<span>Касса клиники:</span>
							</div>
							<div className="flex flex-wrap items-center gap-1">
								{STOMX_CASH_BOXES.slice(0, 3).map((box) => (
									<button
										key={box.type}
										type="button"
										onClick={() => setSelectedCashBoxType(box.type)}
										className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
											selectedCashBoxType === box.type
												? "bg-teal-600 text-white shadow-2xs"
												: "bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
										}`}
										data-testid={`payment-box-${box.type}`}
									>
										{box.name}
									</button>
								))}
								<select
									value={selectedCashBoxType}
									onChange={(e) => setSelectedCashBoxType(e.target.value as StomxCashBoxType)}
									className="px-2 py-1 rounded-lg text-xs bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-medium cursor-pointer"
									aria-label="Все кассы"
									data-testid="select-payment-cashbox"
								>
									{STOMX_CASH_BOXES.map((b) => (
										<option key={b.type} value={b.type}>
											{b.name}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Cash Flow (ДДС) Receipt Category Selection */}
						<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
							<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
								<Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
								<span>Статья ДДС:</span>
							</div>
							<div className="flex flex-wrap items-center gap-1">
								{STOMX_CASH_RECEIPT_CATEGORIES.slice(0, 3).map((cat) => (
									<button
										key={cat.alias}
										type="button"
										onClick={() => setSelectedReceiptAlias(cat.alias)}
										className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
											selectedReceiptAlias === cat.alias
												? "bg-indigo-600 text-white shadow-2xs"
												: "bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
										}`}
										data-testid={`payment-cat-${cat.alias}`}
									>
										{cat.name}
									</button>
								))}
								<select
									value={selectedReceiptAlias}
									onChange={(e) => setSelectedReceiptAlias(e.target.value as StomxReceiptTypeAlias)}
									className="px-2 py-1 rounded-lg text-xs bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-medium cursor-pointer"
									aria-label="Все статьи поступлений"
									data-testid="select-payment-receipt-alias"
								>
									{STOMX_CASH_RECEIPT_CATEGORIES.map((cat) => (
										<option key={cat.alias} value={cat.alias}>
											{cat.name}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* 54-FZ Buyer Details (Mandates 8e & 8n: Frictionless, optional for physical persons) */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5" data-testid="payer-type-section">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
								<Building2 size={14} className="text-indigo-600" />
								<span>Чек 54-ФЗ: Данные покупателя</span>
							</div>
							<div className="flex items-center gap-1 p-0.5 bg-[var(--paper,#ffffff)] rounded-lg border border-[var(--line,#e2e8f0)]">
								<button
									type="button"
									onClick={() => {
										setPayerType("physical");
										setBuyerInnError(null);
									}}
									className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										payerType === "physical"
											? "bg-emerald-600 text-white shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									data-testid="tab-payer-physical"
								>
									<User size={12} />
									<span>Физлицо (Гражданин)</span>
								</button>
								<button
									type="button"
									onClick={() => setPayerType("legal_entity")}
									className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										payerType === "legal_entity"
											? "bg-indigo-600 text-white shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									data-testid="tab-payer-legal"
								>
									<Building2 size={12} />
									<span>Юрлицо / ИП</span>
								</button>
							</div>
						</div>

						{payerType === "physical" ? (
							<div className="space-y-1">
								<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
									<span className="flex items-center gap-1">
										<FileText size={12} className="text-emerald-600" />
										<span>ИНН пациента (необязательно, для справки НДФЛ 13%):</span>
									</span>
									<span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium" data-testid="inn-physical-not-required-badge">
										По 54-ФЗ для физлиц не требуется
									</span>
								</div>
								<div className="relative">
									<input
										type="text"
										value={buyerInn}
										onChange={(e) => handleInnChange(e.target.value)}
										placeholder="Необязательно (12 цифр для налогового вычета)"
										maxLength={12}
										className="h-8.5 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
										data-testid="input-buyer-inn-physical"
									/>
									{buyerInn && (
										<span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted,#64748b)]">
											{buyerInn.length}/12
										</span>
									)}
								</div>
								{buyerInnError && (
									<p className="text-[10px] text-amber-600 dark:text-amber-400 m-0 flex items-center gap-1">
										<AlertCircle size={10} />
										<span>{buyerInnError} (оплата не блокируется)</span>
									</p>
								)}
							</div>
						) : (
							<div className="space-y-1">
								<label className="text-[11px] font-bold text-[var(--ink,#0f172a)] flex items-center justify-between">
									<span>ИНН юридического лица / ИП (10 или 12 цифр):</span>
									<span className="text-[10px] text-indigo-600 font-bold">* Обязательно по 54-ФЗ</span>
								</label>
								<div className="relative">
									<input
										type="text"
										value={buyerInn}
										onChange={(e) => handleInnChange(e.target.value)}
										placeholder="Введите 10 цифр (ООО) или 12 цифр (ИП)"
										maxLength={12}
										className={`h-8.5 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border rounded-lg text-[var(--ink,#0f172a)] outline-none ${
											buyerInnError
												? "border-rose-500 focus:border-rose-600"
												: "border-[var(--line,#e2e8f0)] focus:border-indigo-500"
										}`}
										data-testid="input-buyer-inn-legal"
									/>
									{buyerInn && (
										<span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted,#64748b)]">
											{buyerInn.length} знаков
										</span>
									)}
								</div>
								{buyerInnError ? (
									<p className="text-[10px] text-rose-600 dark:text-rose-400 m-0 flex items-center gap-1">
										<AlertCircle size={10} />
										<span>{buyerInnError}</span>
									</p>
								) : buyerInn.length === 10 || buyerInn.length === 12 ? (
									<p className="text-[10px] text-emerald-600 dark:text-emerald-400 m-0 flex items-center gap-1">
										<CheckCircle2 size={10} />
										<span>ИНН валиден по формату 54-ФЗ для B2B расчетов</span>
									</p>
								) : null}
							</div>
						)}
					</div>

					{/* Acquiring & 54-FZ Emergency Collision Resolution Banner (Mandates 8e, 8n) */}
					{interruptedPaymentState?.isInterrupted && (
						<div
							className="p-3.5 rounded-xl bg-amber-500/15 dark:bg-amber-950/50 border border-amber-500/40 space-y-2.5"
							data-testid="banner-interrupted-payment-recovery"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-2">
									<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
									<div>
										<h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 m-0">
											Аварийная ситуация: обрыв связи / тайм-аут эквайринга
										</h4>
										<p className="text-[11px] text-amber-800 dark:text-amber-300 m-0 leading-tight">
											{interruptedPaymentState.reason}. Если терминал уже списал средства с карты или выдал слип-чек, подтвердите оплату вручную без повторного списания с карты!
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setInterruptedPaymentState(null)}
									className="text-amber-600 dark:text-amber-400 hover:text-amber-800 text-xs font-bold cursor-pointer"
								>
									Скрыть
								</button>
							</div>
							<div className="flex items-center gap-2 flex-wrap pt-1">
								<button
									type="button"
									onClick={() => handleManualCardTerminalConfirm(interruptedPaymentState.amountRub)}
									disabled={isSubmittingManualCard}
									title={isSubmittingManualCard ? "Идет фиксация..." : "Зафиксировать оплату в CRM без повторного списания с карты"}
									className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
									data-testid="btn-recovery-manual-card-confirm"
								>
									<CheckCircle size={14} />
									<span>Оплата картой подтверждена на терминале вручную</span>
								</button>
								<button
									type="button"
									onClick={handleRetryFiscalization}
									disabled={isRetryingFiscalization}
									title={isRetryingFiscalization ? "Идет отправка на ККТ..." : "Повторно отправить чек на фискализацию в ККТ/ОФД без изменения баланса"}
									className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
									data-testid="btn-recovery-retry-fiscalization"
								>
									<RotateCcw size={14} className={isRetryingFiscalization ? "animate-spin" : ""} />
									<span>Повторить фискализацию чека</span>
								</button>
							</div>
						</div>
					)}

					{/* 54-FZ Fiscalization Retry Banner */}
					{fiscalizationRetryPending && !interruptedPaymentState?.isInterrupted && (
						<div
							className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between flex-wrap gap-2 text-xs"
							data-testid="banner-fiscalization-pending"
						>
							<div className="flex items-center gap-2">
								<Printer size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<span className="font-semibold text-blue-950 dark:text-blue-200">
									Платёж сохранён в базе CRM. Требуется повторить печать фискального чека 54-ФЗ?
								</span>
							</div>
							<button
								type="button"
								onClick={handleRetryFiscalization}
								disabled={isRetryingFiscalization}
								title={isRetryingFiscalization ? "Печать..." : "Отправить чек на фискализатор ККТ без повторного изменения баланса пациента"}
								className="min-h-[32px] px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
								data-testid="btn-fiscalization-retry-direct"
							>
								<RotateCcw size={13} className={isRetryingFiscalization ? "animate-spin" : ""} />
								<span>Повторить фискализацию чека</span>
							</button>
						</div>
					)}

					{totalDueRub === 0 && (
						<div
							className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap"
							data-testid="banner-payment-zero-warranty"
						>
							<div className="flex items-center gap-2">
								<CheckCircle size={18} className="text-emerald-600" />
								<span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
									Гарантийный прием / 100% скидка (к оплате 0 ₽)
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
									onSuccess({
										method: "warranty_discount_100",
										amountKopecks: 0,
										discountRub: discountCalc.discountRub,
										discountPercent: discountCalc.discountPercent,
										rawTotalRub: rawTotalDueRub,
										discountReason: discountReason || "Гарантийная переделка / скидка 100%",
									});
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
								data-testid="btn-payment-close-warranty-zero"
							>
								<Sparkles size={14} />
								<span>Закрыть визит в 1 клик (0 ₽)</span>
							</button>
						</div>
					)}

					{activeMethod === "card_terminal" || activeMethod === "sberpay_qr" || activeMethod === "biometry" ? (
						<div className="space-y-3">
							<SberPayIntegration
								patientId={patientId}
								patientName={patientName}
								amountKopecks={discountCalc.totalDueKopecks}
								invoiceId={invoiceId}
								visitId={visitId}
								documentId={documentId}
								onPaymentSuccess={handleSberSuccess}
								onSelectAlternativeMethod={(alt) => {
									if (alt === "cash") setActiveMethod("cash");
									if (alt === "deposit") setActiveMethod("family_deposit");
								}}
							/>
							{/* Standalone manual terminal fallback (Mandates 8e, 8n) */}
							<div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between flex-wrap gap-2 text-xs">
								<div className="flex items-center gap-2">
									<ShieldCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
									<span className="font-medium text-[var(--ink,#0f172a)]">
										Карта списана на автономном терминале или эквайринг подвис?
									</span>
								</div>
								<button
									type="button"
									onClick={() => handleManualCardTerminalConfirm()}
									disabled={isSubmittingManualCard}
									title={isSubmittingManualCard ? "Идет фиксация..." : "Зафиксировать оплату в CRM без повторного списания с карты"}
									className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
									data-testid="btn-manual-terminal-confirm"
								>
									<CheckCircle size={14} />
									<span>Оплата картой подтверждена на терминале вручную</span>
								</button>
							</div>
						</div>
					) : activeMethod === "sbp_qr" ? (
						<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-3" data-testid="sbp-qr-embedded-container">
							<SbpPaymentQrModal
								isOpen={true}
								embedded={true}
								onClose={() => setActiveMethod("card_terminal")}
								invoice={{
									orderId: invoiceId || documentId || `ORD-${Date.now()}`,
									patientId,
									patientName,
									phone: patientPhone || "",
									sumRub: totalDueRub,
									sumKopecks: discountCalc.totalDueKopecks,
									purpose: `Оплата стоматологических услуг: ${patientName}`,
									clinicName: clinicLegalName,
								}}
								onPaymentSuccess={(res) => {
									onSuccess({
										method: "sbp_qr",
										amountKopecks: isWarranty100 ? 0 : discountCalc.totalDueKopecks,
										discountRub,
										discountPercent: effectiveDiscountPercent,
										rawTotalRub: rawTotalDueRub,
										discountReason: discountReason || undefined,
										rrn: res.orderId,
										fiscalReceiptId: res.fiscalReceiptId,
									});
									onClose();
								}}
							/>
						</div>
					) : activeMethod === "cash" ? (
						<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
									<Banknote size={20} />
								</div>
								<div>
									<h3 className="text-sm font-bold m-0 text-[var(--ink,#0f172a)]">
										Прием наличных денежных средств
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)] m-0">
										Сумма к внесению в кассу: <strong className="text-[var(--ink,#0f172a)]">{totalDueRub.toLocaleString("ru-RU")} ₽</strong>
									</p>
								</div>
							</div>

							<div className="space-y-2 p-3 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)]">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center justify-between">
									<span>Получено от пациента наличными, ₽:</span>
									<button
										type="button"
										onClick={() => setReceivedCashRub(totalDueRub)}
										className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
										data-testid="btn-cash-exact-amount"
									>
										<Coins size={12} />
										<span>Ровно без сдачи ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
									</button>
								</label>
								<div className="flex items-center gap-2">
									<input
										type="number"
										min={0}
										step="1"
										value={receivedCashRub || ""}
										onChange={(e) => setReceivedCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-10 w-full px-3 text-base font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink,#0f172a)] outline-none focus:border-emerald-500"
										data-testid="input-cash-received"
									/>
									<button
										type="button"
										onClick={() => setReceivedCashRub(totalDueRub)}
										className="h-10 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
									>
										<Zap size={14} />
										<span>Без сдачи</span>
									</button>
								</div>

								{/* Quick denomination bill buttons (Мандаты 8e, 8k, 8n) */}
								<div className="space-y-1 pt-1">
									<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted,#64748b)]">
										<span>Быстрый ввод внесенной суммы:</span>
										<button
											type="button"
											onClick={() => setReceivedCashRub(0)}
											className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
											data-testid="btn-cash-reset"
										>
											Сброс (0 ₽)
										</button>
									</div>
									<div className="grid grid-cols-5 gap-1.5">
										<button
											type="button"
											onClick={() => setReceivedCashRub(totalDueRub)}
											className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 truncate"
											data-testid="btn-cash-exact"
											title="Внесено ровно сумма счета без сдачи"
										>
											Без сдачи
										</button>
										{CASH_DENOMINATIONS.map((denom) => (
											<button
												key={denom.amount}
												type="button"
												onClick={() => setReceivedCashRub(denom.amount)}
												className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
												data-testid={denom.testId}
												title={`Внесено ${denom.label}`}
											>
												{denom.label}
											</button>
										))}
									</div>
									<div className="grid grid-cols-4 gap-1.5 pt-1">
										{CASH_ADD_BUTTONS.map((addBtn) => (
											<button
												key={addBtn.amount}
												type="button"
												onClick={() => setReceivedCashRub((prev) => prev + addBtn.amount)}
												className="min-h-[44px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
												data-testid={addBtn.testId}
												title={`Добавить ${addBtn.label.replace("+", "")} к внесенной сумме`}
											>
												{addBtn.label}
											</button>
										))}
										<button
											type="button"
											onClick={() => setReceivedCashRub(totalDueRub)}
											className="min-h-[44px] rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 text-blue-800 dark:text-blue-200 cursor-pointer transition-all active:scale-95 truncate flex items-center justify-center gap-1"
											data-testid="btn-cash-exact-rounded"
											title="Внести ровно без сдачи"
										>
											<Coins size={12} />
											<span>Ровно</span>
										</button>
									</div>
								</div>

								{/* Change Calculation Box */}
								{cashChange.changeRub > 0 ? (
									<div
										className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs min-w-0"
										data-testid="cash-change-display"
									>
										<span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 truncate">
											<Coins size={14} className="shrink-0" />
											<span>Сдача пациенту:</span>
										</span>
										<span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300 shrink-0 ml-2" data-testid="cash-change-amount">
											{cashChange.changeRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</span>
									</div>
								) : cashChange.isExact ? (
									<div
										className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 min-w-0"
										data-testid="cash-exact-display"
									>
										<CheckCircle2 size={14} className="shrink-0" />
										<span className="truncate">Внесено ровно, без сдачи</span>
									</div>
								) : cashChange.shortageRub > 0 ? (
									<div
										className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between min-w-0"
										data-testid="cash-shortage-display"
									>
										<span className="flex items-center gap-1.5 truncate">
											<AlertCircle size={14} className="shrink-0" />
											<span>Недостает до полной суммы:</span>
										</span>
										<span className="font-mono font-bold shrink-0 ml-2">
											{cashChange.shortageRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</span>
									</div>
								) : null}
							</div>

							<button
								type="button"
								onClick={handleCashSubmit}
								disabled={isSubmittingCash}
								title={isSubmittingCash ? "Идет фиксация наличных в кассе..." : undefined}
								className="min-h-[44px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all min-w-0"
								data-testid="btn-cash-submit"
							>
								<CheckCircle size={16} className="shrink-0" />
								<span className="truncate">
									{isSubmittingCash
										? "Фиксация..."
										: `Подтвердить прием ${
												receivedCashRub > 0 && receivedCashRub < totalDueRub
													? receivedCashRub.toLocaleString("ru-RU")
													: totalDueRub.toLocaleString("ru-RU")
											} ₽ в кассу`}
								</span>
							</button>
						</div>
					) : activeMethod === "split" ? (
						<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-4">
							<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line,#e2e8f0)] pb-2">
								<div className="flex items-center gap-2">
									<Wallet size={18} className="text-purple-600" />
									<h3 className="text-sm font-bold m-0">Комбинированная оплата (Сплит)</h3>
								</div>
								<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
									К оплате: <strong className="text-[var(--ink,#0f172a)]">{totalDueRub.toLocaleString("ru-RU")} ₽</strong>
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<CreditCard size={14} className="text-blue-600" />
										<span>Банковская карта (Терминал), ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitCardRub || ""}
										onChange={(e) => setSplitCardRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<Banknote size={14} className="text-emerald-600" />
										<span>Наличные (Касса), ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitCashRub || ""}
										onChange={(e) => setSplitCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<QrCode size={14} className="text-teal-600" />
										<span>SberPay QR / СБП, ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitSbpRub || ""}
										onChange={(e) => setSplitSbpRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<Wallet size={14} className="text-purple-600" />
										<span>Депозит / Аванс, ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitDepositRub || ""}
										onChange={(e) => setSplitDepositRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<Coins size={14} className="text-amber-600" />
										<span>Подарочный сертификат, ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitCertificateRub || ""}
										onChange={(e) => setSplitCertificateRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										data-testid="input-split-certificate"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<Sparkles size={14} className="text-pink-600" />
										<span>Бонусные баллы, ₽:</span>
									</label>
									<input
										type="number"
										min={0}
										step="1"
										value={splitBonusRub || ""}
										onChange={(e) => setSplitBonusRub(Math.max(0, parseFloat(e.target.value) || 0))}
										placeholder="0 ₽"
										data-testid="input-split-bonus"
										className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
									/>
								</div>
							</div>

							{/* 1-Click Fast Auto-Balance Chips */}
							<div className="flex items-center gap-1.5 flex-wrap pt-1">
								<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">1-клик:</span>
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
											const remKop = Math.max(0, totalKop - depKop);
											setSplitDepositRub(kopecksToRub(depKop));
											setSplitCardRub(kopecksToRub(remKop));
											setSplitCashRub(0);
											setSplitSbpRub(0);
											setSplitCertificateRub(0);
											setSplitBonusRub(0);
										}}
										className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 cursor-pointer flex items-center gap-1"
									>
										<Zap size={12} />
										<span>Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Карта</span>
									</button>
								)}
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
											const remKop = Math.max(0, totalKop - depKop);
											setSplitDepositRub(kopecksToRub(depKop));
											setSplitCashRub(kopecksToRub(remKop));
											setSplitCardRub(0);
											setSplitSbpRub(0);
											setSplitCertificateRub(0);
											setSplitBonusRub(0);
										}}
										className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 cursor-pointer flex items-center gap-1"
									>
										<Zap size={12} />
										<span>Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Нал</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										setSplitCardRub(totalDueRub);
										setSplitCashRub(0);
										setSplitDepositRub(0);
										setSplitSbpRub(0);
										setSplitCertificateRub(0);
										setSplitBonusRub(0);
									}}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-blue-400 cursor-pointer flex items-center"
								>
									Всё на карту
								</button>
								<button
									type="button"
									onClick={() => {
										setSplitCashRub(totalDueRub);
										setSplitCardRub(0);
										setSplitDepositRub(0);
										setSplitSbpRub(0);
										setSplitCertificateRub(0);
										setSplitBonusRub(0);
									}}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 cursor-pointer flex items-center"
								>
									Всё наличными
								</button>
								<button
									type="button"
									onClick={() => applySplitRemainder("card")}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-blue-400 cursor-pointer flex items-center"
								>
									Остаток на карту
								</button>
								<button
									type="button"
									onClick={() => applySplitRemainder("cash")}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 cursor-pointer flex items-center"
								>
									Остаток наличными
								</button>
								<button
									type="button"
									onClick={() => applySplitRemainder("sbp")}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-purple-400 cursor-pointer flex items-center"
									data-testid="btn-payment-remainder-sbp"
								>
									Остаток через СБП
								</button>
								<button
									type="button"
									onClick={() => applySplitRemainder("certificate")}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-amber-400 cursor-pointer flex items-center"
									data-testid="btn-payment-remainder-certificate"
								>
									Остаток сертификатом
								</button>
								<button
									type="button"
									onClick={() => applySplitRemainder("bonus")}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-pink-400 cursor-pointer flex items-center"
									data-testid="btn-payment-remainder-bonus"
								>
									Остаток бонусами
								</button>
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => applySplitRemainder("deposit")}
										className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-indigo-400 cursor-pointer flex items-center"
										data-testid="btn-payment-remainder-deposit"
									>
										Остаток из аванса
									</button>
								)}
							</div>

							{/* Parity indicator */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs font-bold">
								<span>Всего распределено:</span>
								<span className={`font-mono text-sm flex items-center gap-1 ${isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
									<span>{totalAllocatedRub.toLocaleString("ru-RU")} / {totalDueRub.toLocaleString("ru-RU")} ₽</span>
									{isBalanced ? (
										<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">
											<CheckCircle2 size={13} /> Совпадает
										</span>
									) : (
										<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-amber-600 dark:text-amber-400">
											<AlertCircle size={13} /> Не сходится
										</span>
									)}
								</span>
							</div>

							<button
								type="button"
								onClick={handleSplitSubmit}
								disabled={isSubmittingSplit}
								title={
									isSubmittingSplit
										? "Идет фиксация комбинированной оплаты..."
										: !isBalanced
											? "Автоматически сбалансирует остаток и проведет оплату"
											: undefined
								}
								className="min-h-[44px] w-full rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all bg-purple-600 hover:bg-purple-700 active:scale-98 disabled:opacity-50"
							>
								<CheckCircle size={16} />
								<span>{isSubmittingSplit ? "Фиксация..." : `Подтвердить комбинированную оплату ${totalDueRub} ₽`}</span>
							</button>
						</div>
					) : (
						<div className="space-y-4" data-testid="payment-family-deposit-view">
							<div className="space-y-3">
								<div className="flex items-center justify-between pb-1">
									<div className="flex items-center gap-2">
										<Wallet className="w-5 h-5 text-pink-600" />
										<h3 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
											Оплата с депозита / семейного баланса
										</h3>
									</div>
									<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
										К списанию: {amountRub} ₽
									</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
									{/* Personal Deposit Card */}
									<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)]">
												<Wallet size={14} className="text-indigo-600" />
												<span>Лицевой счет (Аванс)</span>
											</div>
											<span className="font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
												{patientDepositRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-tight">
											{patientDepositRub >= totalDueRub
												? "Средств на лицевом счете достаточно для полной оплаты."
												: patientDepositRub > 0
													? `Доступно ${patientDepositRub} ₽. Недостает ${(totalDueRub - patientDepositRub).toFixed(2)} ₽.`
													: "На лицевом счете пациента нет авансовых средств."}
										</p>
										<button
											type="button"
											disabled={isSubmittingDeposit}
											onClick={() => handleDepositOrPartialCombo("deposit")}
											title={
												isSubmittingDeposit
													? "Выполняется списание с депозита..."
													: patientDepositRub >= totalDueRub
													? `Списать ${amountRub} ₽ с личного депозита пациента`
													: patientDepositRub > 0
													? `Зачесть ${patientDepositRub} ₽ с аванса + остаток ${(totalDueRub - patientDepositRub).toFixed(2)} ₽ оплатить картой (в 1 клик)`
													: "Нажмите для проверки баланса или пополнения"
											}
											className="w-full min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
											data-testid="btn-pay-deposit-full"
										>
											{patientDepositRub >= totalDueRub ? (
												<>
													<CheckCircle size={14} />
													<span>Списать {amountRub} ₽ с депозита</span>
												</>
											) : patientDepositRub > 0 ? (
												<>
													<Zap size={14} />
													<span>Зачесть аванс {patientDepositRub} ₽ + остаток картой</span>
												</>
											) : (
												<span>На депозите нет средств (0 ₽)</span>
											)}
										</button>
									</div>

									{/* Family Wallet Card */}
									<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)]">
												<Users size={14} className="text-pink-600" />
												<span>Семейный общий баланс</span>
											</div>
											<span className="font-mono text-xs font-extrabold text-pink-700 dark:text-pink-300">
												{patientFamilyBalanceRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-tight">
											{patientFamilyBalanceRub >= totalDueRub
												? "Семейный баланс покрывает 100% стоимости счета."
												: patientFamilyBalanceRub > 0
													? `Доступно ${patientFamilyBalanceRub} ₽. Недостает ${(totalDueRub - patientFamilyBalanceRub).toFixed(2)} ₽.`
													: "Семейный баланс пуст или не подключен."}
										</p>
										<button
											type="button"
											disabled={isSubmittingDeposit}
											onClick={() => handleDepositOrPartialCombo("family")}
											title={
												isSubmittingDeposit
													? "Выполняется списание с семейного баланса..."
													: patientFamilyBalanceRub >= totalDueRub
													? `Списать ${amountRub} ₽ с семейного баланса`
													: patientFamilyBalanceRub > 0
													? `Зачесть ${patientFamilyBalanceRub} ₽ из семьи + остаток ${(totalDueRub - patientFamilyBalanceRub).toFixed(2)} ₽ оплатить картой (в 1 клик)`
													: "Нажмите для проверки семейного счета или пополнения"
											}
											className="w-full min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
											data-testid="btn-pay-family-full"
										>
											{patientFamilyBalanceRub >= totalDueRub ? (
												<>
													<CheckCircle size={14} />
													<span>Списать {amountRub} ₽ с семейного счета</span>
												</>
											) : patientFamilyBalanceRub > 0 ? (
												<>
													<Zap size={14} />
													<span>Зачесть из семьи {patientFamilyBalanceRub} ₽ + остаток картой</span>
												</>
											) : (
												<span>Семейный баланс пуст (0 ₽)</span>
											)}
										</button>
									</div>
								</div>

								{/* Insufficient Balance 1-Click Combo Resolver */}
								{(patientDepositRub < totalDueRub && patientFamilyBalanceRub < totalDueRub) && (patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
									<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
										<div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
											<Sparkles size={14} className="shrink-0" />
											<span>Недостаточно средств для 100% оплаты со счета. Примените 1-клик комбо:</span>
										</div>
										<div className="flex items-center gap-2 flex-wrap">
											{patientDepositRub > 0 && (
												<button
													type="button"
													onClick={() => {
														const totalKop = rubToKopecks(totalDueRub);
														const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
														const remKop = Math.max(0, totalKop - depKop);
														setSplitDepositRub(kopecksToRub(depKop));
														setSplitCardRub(kopecksToRub(remKop));
														setSplitCashRub(0);
														setSplitSbpRub(0);
														setActiveMethod("split");
													}}
													className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
												>
													<CreditCard size={13} />
													<span>Зачесть аванс {patientDepositRub} ₽ + остаток Картой</span>
												</button>
											)}
											{patientDepositRub > 0 && (
												<button
													type="button"
													onClick={() => {
														const totalKop = rubToKopecks(totalDueRub);
														const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
														const remKop = Math.max(0, totalKop - depKop);
														setSplitDepositRub(kopecksToRub(depKop));
														setSplitCashRub(kopecksToRub(remKop));
														setSplitCardRub(0);
														setSplitSbpRub(0);
														setActiveMethod("split");
													}}
													className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
												>
													<Banknote size={13} />
													<span>Зачесть аванс {patientDepositRub} ₽ + остаток Наличными</span>
												</button>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Dedicated Fixed Footer (Mandates 8c, 8d, 8e: Fitts's Law, always visible total due & primary fiscalization trigger) */}
				<div
					className="p-3 sm:px-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center justify-between gap-3 shrink-0 select-none shadow-md"
					data-testid="payment-modal-fixed-footer"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-xs text-[var(--muted,#64748b)] hidden sm:inline">К оплате:</span>
						<span className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)] truncate" data-testid="payment-modal-footer-total">
							{totalDueRub.toLocaleString("ru-RU")} ₽
						</span>
						{discountRub > 0 && (
							<span className="text-xs text-amber-600 dark:text-amber-400 font-bold truncate">
								(-{discountRub.toLocaleString("ru-RU")} ₽)
							</span>
						)}
					</div>
					<div className="flex items-center gap-2 min-w-0">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors shrink-0"
						>
							Отмена
						</button>
						{activeMethod === "cash" ? (
							<button
								type="button"
								onClick={handleCashSubmit}
								disabled={isSubmittingCash}
								title={isSubmittingCash ? "Идет фиксация наличных в кассе..." : undefined}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all min-w-0 truncate"
								data-testid="btn-cash-submit-footer"
							>
								<CheckCircle size={16} className="shrink-0" />
								<span className="truncate">
									{isSubmittingCash
										? "Фиксация..."
										: `Принять наличные (${
												receivedCashRub > 0 && receivedCashRub < totalDueRub
													? receivedCashRub.toLocaleString("ru-RU")
													: totalDueRub.toLocaleString("ru-RU")
											} ₽)`}
								</span>
							</button>
						) : activeMethod === "split" ? (
							<button
								type="button"
								onClick={handleSplitSubmit}
								disabled={isSubmittingSplit}
								title={isSubmittingSplit ? "Идет фиксация комбинированной оплаты..." : undefined}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 sm:px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all min-w-0 truncate"
								data-testid="btn-split-submit-footer"
							>
								<CheckCircle size={16} className="shrink-0" />
								<span className="truncate">
									{isSubmittingSplit ? "Фиксация..." : `Пробить сплит (${totalDueRub.toLocaleString("ru-RU")} ₽)`}
								</span>
							</button>
						) : activeMethod === "family_deposit" ? (
							<button
								type="button"
								disabled={isSubmittingDeposit || (patientDepositRub === 0 && patientFamilyBalanceRub === 0)}
								onClick={() => handleDepositOrPartialCombo(patientDepositRub >= totalDueRub ? "deposit" : "family")}
								title={
									isSubmittingDeposit
										? "Идет списание со счета..."
										: patientDepositRub === 0 && patientFamilyBalanceRub === 0
											? "На лицевом и семейном счетах пациента нет средств (0 ₽)"
											: undefined
								}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 sm:px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50 min-w-0 truncate"
								data-testid="btn-deposit-submit-footer"
							>
								<Wallet size={16} className="shrink-0" />
								<span className="truncate">
									{isSubmittingDeposit
										? "Списание..."
										: patientDepositRub >= totalDueRub
										? `Списать с депозита (${totalDueRub.toLocaleString("ru-RU")} ₽)`
										: `Зачесть баланс (${Math.min(totalDueRub, patientDepositRub + patientFamilyBalanceRub).toLocaleString("ru-RU")} ₽)`}
								</span>
							</button>
						) : activeMethod === "card_terminal" || activeMethod === "sberpay_qr" || activeMethod === "biometry" ? (
							<button
								type="button"
								onClick={() => handleManualCardTerminalConfirm()}
								disabled={isSubmittingManualCard}
								title={isSubmittingManualCard ? "Идет фиксация в CRM..." : "Зафиксировать оплату в CRM, если терминал уже списал средства"}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 sm:px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all min-w-0 truncate"
								data-testid="btn-manual-terminal-confirm-footer"
							>
								<CheckCircle size={16} className="shrink-0" />
								<span className="truncate">
									{isSubmittingManualCard ? "Фиксация..." : `Подтвердить оплату картой (${totalDueRub.toLocaleString("ru-RU")} ₽)`}
								</span>
							</button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
};
