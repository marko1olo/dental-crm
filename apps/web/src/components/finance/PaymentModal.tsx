/**
 * apps/web/src/components/finance/PaymentModal.tsx
 *
 * DENTE Dental CRM — Universal Payment & Sberbank POS Terminal Modal.
 * Supports Cash, Sberbank POS Terminal, SberPay QR, FacePay Biometry, Family Wallet, and Split Payments.
 */

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import {
	type SberPosTransactionResponse,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import {
	calculateCashChange,
	validate54FzBuyerInn,
	type PayerType,
} from "./cashboxOperations.js";
import { SberPayIntegration } from "./SberPayIntegration.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";

export type PaymentMethodTab = "card_terminal" | "sberpay_qr" | "biometry" | "cash" | "family_deposit" | "split";

export interface PaymentModalProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
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

export const PaymentModal: React.FC<PaymentModalProps> = ({
	isOpen,
	patientId,
	patientName,
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
	onPrintInvoice,
	onPrintAct,
	onClose,
	onSuccess = () => {},
}) => {
	const [activeMethod, setActiveMethod] = useState<PaymentMethodTab>(defaultMethod);
	const [isSubmittingCash, setIsSubmittingCash] = useState<boolean>(false);
	const [isSubmittingSplit, setIsSubmittingSplit] = useState<boolean>(false);
	const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);

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

	const [splitCardRub, setSplitCardRub] = useState<number>(totalDueRub);
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitCertificateRub, setSplitCertificateRub] = useState<number>(0);
	const [splitBonusRub, setSplitBonusRub] = useState<number>(0);

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
			const validation = validate54FzBuyerInn(cleaned, payerType);
			if (!validation.isValid) {
				setBuyerInnError(validation.errorMessage || "Некорректный ИНН");
			} else {
				setBuyerInnError(null);
			}
		} else {
			setBuyerInnError(null);
		}
	};

	const applyExactCashPreset = () => {
		if (isWarranty100) {
			setIsWarranty100(false);
			setDiscountPercent(0);
			setDiscountReason("");
		}
		setActiveMethod("cash");
		const effectiveTotal = isWarranty100 ? rawTotalDueRub : totalDueRub;
		setReceivedCashRub(effectiveTotal);
		setSplitCashRub(effectiveTotal);
		setSplitCardRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		showToast(`Применен пресет: Без сдачи (Ровно сумма счёта: ${effectiveTotal.toLocaleString("ru-RU")} ₽)`, "info", 2000);
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
			setSplitDepositRub(totalDueRub);
			setSplitCardRub(0);
			setSplitCashRub(0);
			setSplitSbpRub(0);
			setSplitCertificateRub(0);
			setSplitBonusRub(0);
			showToast(`Применен пресет: Списан весь аванс/бонусы (${totalDueRub.toLocaleString("ru-RU")} ₽)`, "info", 2500);
		} else if (depositKop > 0) {
			const usedDepKop = Math.min(totalKop, depositKop);
			const remKop = Math.max(0, totalKop - usedDepKop);
			const usedRub = kopecksToRub(usedDepKop);
			const remRub = kopecksToRub(remKop);
			setSplitDepositRub(usedRub);
			setSplitCardRub(remRub);
			setSplitCashRub(0);
			setSplitSbpRub(0);
			setSplitCertificateRub(0);
			setSplitBonusRub(0);
			setActiveMethod("split");
			showToast(
				`Применен пресет: Списан весь аванс/бонусы ${usedRub.toLocaleString("ru-RU")} ₽ + остаток ${remRub.toLocaleString("ru-RU")} ₽ картой`,
				"info",
				2500,
			);
		} else {
			setActiveMethod("split");
			const bonusAmount = Math.min(totalDueRub, 500);
			const cardRest = Math.max(0, Number((totalDueRub - bonusAmount).toFixed(2)));
			setSplitBonusRub(bonusAmount);
			setSplitCardRub(cardRest);
			setSplitCashRub(0);
			setSplitDepositRub(0);
			setSplitSbpRub(0);
			setSplitCertificateRub(0);
			showToast(`Аванс 0 ₽. Применено списание бонусов (${bonusAmount} ₽) + Карта (${cardRest} ₽)`, "info", 2500);
		}
	};

	const apply5050CashCardPreset = () => {
		setIsWarranty100(false);
		const totalKop = rubToKopecks(totalDueRub);
		const halfKop = Math.floor(totalKop / 2);
		const remKop = totalKop - halfKop;
		const cashRub = kopecksToRub(halfKop);
		const cardRub = kopecksToRub(remKop);
		setSplitCashRub(cashRub);
		setSplitCardRub(cardRub);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		setActiveMethod("split");
		showToast(
			`Применен пресет: 50/50 Нал (${cashRub.toLocaleString("ru-RU")} ₽) + Карта (${cardRub.toLocaleString("ru-RU")} ₽)`,
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
		setSplitCardRub(effectiveTotal);
		setSplitCashRub(0);
		setSplitDepositRub(0);
		setSplitSbpRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
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
		setSplitDepositRub(available);
		setSplitCardRub(remainder);
		setSplitCashRub(0);
		setSplitSbpRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
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
		const depositKop = Math.min(totalKop, rubToKopecks(maxAvailRub));
		const remKop = Math.max(0, totalKop - depositKop);
		const halfRemKop = Math.floor(remKop / 2);
		const cashKop = halfRemKop;
		const cardKop = remKop - halfRemKop;
		const usedDepRub = kopecksToRub(depositKop);
		const usedCashRub = kopecksToRub(cashKop);
		const usedCardRub = kopecksToRub(cardKop);
		setSplitDepositRub(usedDepRub);
		setSplitCashRub(usedCashRub);
		setSplitCardRub(usedCardRub);
		setSplitSbpRub(0);
		setSplitCertificateRub(0);
		setSplitBonusRub(0);
		setActiveMethod("split");
		showToast(
			`Применен пресет: Аванс ${usedDepRub.toLocaleString("ru-RU")} ₽ + Нал ${usedCashRub.toLocaleString("ru-RU")} ₽ + Карта ${usedCardRub.toLocaleString("ru-RU")} ₽`,
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

		setIsSubmittingCash(true);
		try {
			const clientMutationId = `cash:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const innNote = buyerInn.trim() ? ` [ИНН плательщика: ${buyerInn.trim()}]` : "";
			const changeNote = cashChange.changeRub > 0 ? ` (получено ${receivedCashRub} ₽, сдача ${cashChange.changeRub} ₽)` : "";

			const effectiveAmountRub =
				receivedCashRub > 0 && receivedCashRub < totalDueRub
					? receivedCashRub
					: totalDueRub;

			// Record Cash transaction in backend via canonical billing payments endpoint
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: effectiveAmountRub,
					method: "cash",
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Оплата наличными через кассу (${effectiveAmountRub} ₽ • ${effectiveCashier})${changeNote}${innNote}`,
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
			const clientMutationId = `split:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: totalDueRub,
					method: primaryMethod,
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: `Комбинированная оплата (${effectiveCashier}): ${parts.join(" + ")}${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}${innNote}`,
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
		} finally {
			setIsSubmittingSplit(false);
		}
	};

	const handleDepositSubmit = async (source: "deposit" | "family") => {
		setIsSubmittingDeposit(true);
		try {
			const clientMutationId = `${source}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const amountRubNumber = totalDueRub;
			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub: amountRubNumber,
					method: source === "family" ? "family_deposit" : "deposit",
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					note: source === "family"
						? `Оплата с семейного баланса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}`
						: `Оплата с лицевого счета / аванса (${totalDueRub} ₽)${discountRub > 0 ? ` [Скидка ${discountRub} ₽ (${effectiveDiscountPercent}%${discountReason ? ` — ${discountReason}` : ""})]` : ""}`,
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const errorMsg =
					(errorData && typeof errorData.message === "string" && errorData.message) ||
					`Ошибка списания со счета: HTTP ${res.status}`;
				showToast(errorMsg, "error");
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
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
		>
			<div className="w-full max-w-xl rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Modal Header */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
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
						</p>
					</div>

					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleQuickPrintInvoice}
							className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							title="Быстрая печать счета"
							aria-label="Печать счета"
							data-testid="btn-payment-modal-print-invoice"
						>
							<Printer size={15} className="text-slate-500" />
							<span className="hidden sm:inline">Счет</span>
						</button>
						<button
							type="button"
							onClick={handleQuickPrintAct}
							className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							title="Быстрая печать акта сдачи-приемки (804н)"
							aria-label="Печать акта 804н"
							data-testid="btn-payment-modal-print-act"
						>
							<FileText size={15} className="text-slate-500" />
							<span className="hidden sm:inline">Акт 804н</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-9 sm:w-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* 1-Click Fast Presets & Doctor Discounts Bar (Mandates 8c, 8d, 8e п. 7, 8k, 8n: Frictionless checkout & doctor autonomy discounts) */}
				<div className="p-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] space-y-2">
					{/* Doctor Discounts Row */}
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
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
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={() => applyDiscountPreset(0, "")}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								effectiveDiscountPercent === 0 && !isWarranty100
									? "bg-slate-700 text-white border-slate-700 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-slate-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-discount-0"
							title="Без скидки 0%"
						>
							<span>Без скидки 0%</span>
						</button>

						<button
							type="button"
							onClick={() => applyDiscountPreset(5, "Пенсионная / Утренняя")}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								effectiveDiscountPercent === 5 && !isWarranty100
									? "bg-amber-600 text-white border-amber-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-discount-5"
							title="Скидка 5% (Пенсионная / Утренняя)"
						>
							<Percent size={12} className={effectiveDiscountPercent === 5 && !isWarranty100 ? "text-white" : "text-amber-600"} />
							<span>-5% Пенс/Утро</span>
						</button>

						<button
							type="button"
							onClick={() => applyDiscountPreset(10, "Постоянный пациент / Семейная скидка")}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								effectiveDiscountPercent === 10 && !isWarranty100
									? "bg-amber-600 text-white border-amber-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-discount-10"
							title="Скидка 10% (Постоянный пациент / Семейная скидка)"
						>
							<Percent size={12} className={effectiveDiscountPercent === 10 && !isWarranty100 ? "text-white" : "text-amber-600"} />
							<span>-10% Постоянный</span>
						</button>

						<button
							type="button"
							onClick={() => applyDiscountPreset(15, "Комплексный план лечения")}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								effectiveDiscountPercent === 15 && !isWarranty100
									? "bg-amber-600 text-white border-amber-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-discount-15"
							title="Скидка 15% (Комплексный план лечения)"
						>
							<Percent size={12} className={effectiveDiscountPercent === 15 && !isWarranty100 ? "text-white" : "text-amber-600"} />
							<span>-15% Комплекс</span>
						</button>

						<button
							type="button"
							onClick={() => applyDiscountPreset(20, "Сотрудники клиники / Партнёры")}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								effectiveDiscountPercent === 20 && !isWarranty100
									? "bg-amber-600 text-white border-amber-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-discount-20"
							title="Скидка 20% (Сотрудники клиники / Партнёры)"
						>
							<Percent size={12} className={effectiveDiscountPercent === 20 && !isWarranty100 ? "text-white" : "text-amber-600"} />
							<span>-20% Партнёр</span>
						</button>

						<button
							type="button"
							onClick={() => applyDiscountPreset(50, "Персонал клиники / Близкие родственники")}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								effectiveDiscountPercent === 50 && !isWarranty100
									? "bg-amber-600 text-white border-amber-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-discount-50"
							title="Скидка 50% (Персонал клиники / Близкие родственники)"
						>
							<Percent size={12} className={effectiveDiscountPercent === 50 && !isWarranty100 ? "text-white" : "text-amber-600"} />
							<span>-50% Персонал</span>
						</button>

						<button
							type="button"
							onClick={applyWarranty100Preset}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								isWarranty100
									? "bg-amber-600 text-white border-amber-600 shadow-2xs"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="preset-warranty-100"
							title="Гарантийная переделка 100% (0 ₽, без фискального чека ККТ)"
						>
							<ShieldCheck size={14} className={isWarranty100 ? "text-white" : "text-amber-600"} />
							<span>Гарантия 100% (0 ₽)</span>
						</button>
					</div>

					{/* 1-Click Tender Presets Row */}
					<div className="pt-1.5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted,#64748b)]">
							<Zap size={14} className="text-amber-500 shrink-0" />
							<span>1-клик оплата:</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={applyExactCashPreset}
								className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									activeMethod === "cash" && cashChange.isExact
										? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-exact-cash"
							>
								<Banknote size={14} className={activeMethod === "cash" && cashChange.isExact ? "text-white" : "text-emerald-600"} />
								<span>Без сдачи (Ровно сумма счёта: {totalDueRub.toLocaleString("ru-RU")} ₽)</span>
							</button>
							<button
								type="button"
								onClick={applySpendAllDepositBonusPreset}
								className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									(activeMethod === "family_deposit" || (activeMethod === "split" && (splitDepositRub > 0 || splitBonusRub > 0)))
										? "bg-purple-600 text-white border-purple-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-spend-all-deposit-bonus"
								title="Списать весь доступный аванс или бонусы"
							>
								<Wallet size={14} className={(activeMethod === "family_deposit" || (activeMethod === "split" && (splitDepositRub > 0 || splitBonusRub > 0))) ? "text-white" : "text-purple-600"} />
								<span>Списать весь аванс/бонусы</span>
							</button>
							<button
								type="button"
								onClick={apply5050CashCardPreset}
								className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0
										? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-indigo-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-50-50-cash-card"
								title="50% суммы наличными в кассу + 50% картой через терминал"
							>
								<Coins size={14} className={activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 ? "text-white" : "text-indigo-600"} />
								<span>50/50 Нал + Карта</span>
							</button>
							<button
								type="button"
								onClick={applyThreeWayCashCardAdvancePreset}
								className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub > 0
										? "bg-teal-600 text-white border-teal-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-three-way-split"
								title="Комбинированная оплата в 1 клик: Нал + Карта + Аванс"
							>
								<Users size={14} className={activeMethod === "split" && splitCashRub > 0 && splitCardRub > 0 && splitDepositRub > 0 ? "text-white" : "text-teal-600"} />
								<span>Нал + Карта + Аванс</span>
							</button>
							<button
								type="button"
								onClick={applyFullCardPreset}
								className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									activeMethod === "card_terminal"
										? "bg-blue-600 text-white border-blue-600 shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="preset-full-card"
							>
								<CreditCard size={14} className={activeMethod === "card_terminal" ? "text-white" : "text-blue-600"} />
								<span>Картой 100% ({totalDueRub.toLocaleString("ru-RU")} ₽)</span>
							</button>
							{patientDepositRub > 0 && (
								<button
									type="button"
									onClick={applyDepositPlusCardPreset}
									className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
										activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0
											? "bg-purple-600 text-white border-purple-600 shadow-2xs"
											: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-purple-400 text-[var(--ink,#0f172a)]"
									}`}
									data-testid="preset-deposit-plus-card"
								>
									<Wallet size={14} className={activeMethod === "split" && splitDepositRub > 0 && splitCardRub > 0 ? "text-white" : "text-purple-600"} />
									<span>Весь аванс ({Math.min(totalDueRub, patientDepositRub).toLocaleString("ru-RU")} ₽) + Карта</span>
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Debt Autonomy Banner (Mandates 8e & 8n: Patient debt never blocks receipt or tender) */}
				{(patientDebtRub > 0 || patientDepositRub < 0) && (
					<div
						data-testid="debt-autonomy-banner"
						className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2"
					>
						<AlertTriangle size={14} className="shrink-0 text-amber-600" />
						<span>
							Задолженность пациента: {(patientDebtRub > 0 ? patientDebtRub : Math.abs(patientDepositRub)).toLocaleString("ru-RU")} ₽.
							Мандат 8e: Долг не блокирует приём оплаты на фактически внесённую сумму и фискализацию чека.
						</span>
					</div>
				)}

				{/* Method Selector Tabs */}
				<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center gap-2 overflow-x-auto">
					<button
						type="button"
						onClick={() => setActiveMethod("card_terminal")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "card_terminal"
								? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<CreditCard size={16} className="text-emerald-600" />
						<span>POS Терминал Сбербанк</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("sberpay_qr")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "sberpay_qr"
								? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<QrCode size={16} className="text-teal-600" />
						<span>SberPay QR (СБП)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("cash")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "cash"
								? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<Banknote size={16} className="text-emerald-600" />
						<span>Наличные</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("family_deposit")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "family_deposit"
								? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-2 ring-pink-400"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
						data-testid="tab-payment-family-deposit"
					>
						<Users size={16} className="text-pink-600" />
						<span>Депозит / Семья</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMethod("split")}
						className={`min-h-[44px] px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
							activeMethod === "split"
								? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
						}`}
					>
						<Wallet size={16} className="text-purple-600" />
						<span>Комбинированная (Сплит)</span>
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-4 overflow-y-auto flex-1 space-y-4">
					{/* 54-FZ Buyer Details (Mandates 8e & 8n: Frictionless, optional for physical persons) */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5">
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
											className="min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 truncate"
											data-testid="btn-cash-exact"
											title="Внесено ровно сумма счета без сдачи"
										>
											Без сдачи
										</button>
										<button
											type="button"
											onClick={() => setReceivedCashRub(1000)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
											data-testid="btn-cash-1000"
											title="Внесено 1 000 ₽"
										>
											1 000 ₽
										</button>
										<button
											type="button"
											onClick={() => setReceivedCashRub(2000)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
											data-testid="btn-cash-2000"
											title="Внесено 2 000 ₽"
										>
											2 000 ₽
										</button>
										<button
											type="button"
											onClick={() => setReceivedCashRub(5000)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
											data-testid="btn-cash-5000"
											title="Внесено 5 000 ₽"
										>
											5 000 ₽
										</button>
										<button
											type="button"
											onClick={() => setReceivedCashRub(10000)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-emerald-500 text-[var(--ink,#0f172a)] cursor-pointer transition-all active:scale-95 font-mono truncate"
											data-testid="btn-cash-10000"
											title="Внесено 10 000 ₽"
										>
											10 000 ₽
										</button>
									</div>
									<div className="grid grid-cols-4 gap-1.5 pt-1">
										<button
											type="button"
											onClick={() => setReceivedCashRub((prev) => prev + 1000)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
											data-testid="btn-cash-add-1000"
											title="Добавить 1 000 ₽ к внесенной сумме"
										>
											+1 000 ₽
										</button>
										<button
											type="button"
											onClick={() => setReceivedCashRub((prev) => prev + 2000)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
											data-testid="btn-cash-add-2000"
											title="Добавить 2 000 ₽ к внесенной сумме"
										>
											+2 000 ₽
										</button>
										<button
											type="button"
											onClick={() => setReceivedCashRub((prev) => prev + 5000)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer transition-all active:scale-95 font-mono truncate"
											data-testid="btn-cash-add-5000"
											title="Добавить 5 000 ₽ к внесенной сумме"
										>
											+5 000 ₽
										</button>
										<button
											type="button"
											onClick={() => setReceivedCashRub(totalDueRub)}
											className="min-h-[36px] rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 text-blue-800 dark:text-blue-200 cursor-pointer transition-all active:scale-95 truncate flex items-center justify-center gap-1"
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
								className="min-h-[44px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
								data-testid="btn-cash-submit"
							>
								<CheckCircle size={16} />
								<span>
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
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop =
											rubToKopecks(splitCashRub) +
											rubToKopecks(splitDepositRub) +
											rubToKopecks(splitSbpRub) +
											rubToKopecks(splitCertificateRub) +
											rubToKopecks(splitBonusRub);
										setSplitCardRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-blue-400 cursor-pointer flex items-center"
								>
									Остаток на карту
								</button>
								<button
									type="button"
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop =
											rubToKopecks(splitCardRub) +
											rubToKopecks(splitDepositRub) +
											rubToKopecks(splitSbpRub) +
											rubToKopecks(splitCertificateRub) +
											rubToKopecks(splitBonusRub);
										setSplitCashRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 cursor-pointer flex items-center"
								>
									Остаток наличными
								</button>
								<button
									type="button"
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop =
											rubToKopecks(splitCardRub) +
											rubToKopecks(splitCashRub) +
											rubToKopecks(splitDepositRub) +
											rubToKopecks(splitCertificateRub) +
											rubToKopecks(splitBonusRub);
										setSplitSbpRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-purple-400 cursor-pointer flex items-center"
									data-testid="btn-payment-remainder-sbp"
								>
									Остаток через СБП
								</button>
								<button
									type="button"
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop =
											rubToKopecks(splitCardRub) +
											rubToKopecks(splitCashRub) +
											rubToKopecks(splitDepositRub) +
											rubToKopecks(splitSbpRub) +
											rubToKopecks(splitBonusRub);
										setSplitCertificateRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-amber-400 cursor-pointer flex items-center"
									data-testid="btn-payment-remainder-certificate"
								>
									Остаток сертификатом
								</button>
								<button
									type="button"
									onClick={() => {
										const totalKop = rubToKopecks(totalDueRub);
										const otherKop =
											rubToKopecks(splitCardRub) +
											rubToKopecks(splitCashRub) +
											rubToKopecks(splitDepositRub) +
											rubToKopecks(splitSbpRub) +
											rubToKopecks(splitCertificateRub);
										setSplitBonusRub(kopecksToRub(Math.max(0, totalKop - otherKop)));
									}}
									className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-pink-400 cursor-pointer flex items-center"
									data-testid="btn-payment-remainder-bonus"
								>
									Остаток бонусами
								</button>
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const otherKop =
												rubToKopecks(splitCardRub) +
												rubToKopecks(splitCashRub) +
												rubToKopecks(splitSbpRub) +
												rubToKopecks(splitCertificateRub) +
												rubToKopecks(splitBonusRub);
											const remKop = Math.max(0, totalKop - otherKop);
											setSplitDepositRub(kopecksToRub(Math.min(remKop, rubToKopecks(patientDepositRub))));
										}}
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
								title={!isBalanced ? "Автоматически сбалансирует остаток и проведет оплату" : undefined}
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
			</div>
		</div>
	);
};
