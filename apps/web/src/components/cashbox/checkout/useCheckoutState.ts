/**
 * apps/web/src/components/cashbox/checkout/useCheckoutState.ts
 *
 * Canonical SSOT state management, BigInt integer kopeck calculations,
 * and Fastify API connection for DENTE cashbox checkout.
 * Governed by Mandate 8b (Sweet Spot 180-250 lines), Mandate 8e, Mandate 8n.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import {
	kopecksToRub,
	rubToKopecks,
	calculateCashChange,
	calculateSplitBalances,
	generateQrCodeSvg,
} from "@dental/shared";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type {
	CashboxTenderType,
	ClientPayerType,
	ReceiptPrintFormat,
} from "../cashboxCatalogData.js";
import type {
	CashRegisterCheckoutModalProps,
	CheckoutDeliveryMethod,
} from "./types.js";

export function useCheckoutState(props: CashRegisterCheckoutModalProps) {
	const {
		isOpen,
		onClose,
		totalDueRub: propTotalDue,
		amountRub: propAmount,
		totalBillRub: propBillRub,
		totalBillKop: propBillKop,
		amountKopecks: propKop,
		initialAmountKopecks: propInitialKop,
		patientId: propPatId,
		patientPhone: propPatPhone,
		patientEmail: propPatEmail,
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		invoiceId,
		visitId,
		orderId,
		cashierFullName: propCashierFull,
		cashierName: propCashierName,
		doctorFullName: propDocFull,
		doctorName: propDocName,
		attendingDoctorName: propDocAttend,
		defaultMethod = "card",
		initialPaymentMethod,
		initialDiscountPercent = 0,
		initialWarranty100 = false,
		onSuccess,
		onPaymentComplete,
	} = props;

	const patientId = propPatId || "pat-walkin";
	const patientPhone = propPatPhone || "";
	const patientEmail = propPatEmail || "";
	const cashierFullName = (propCashierFull || propCashierName || "Администратор / Кассир") as string;
	const doctorFullName = (propDocFull || propDocName || propDocAttend || undefined) as string | undefined;
	const effectiveDefaultMethod = (initialPaymentMethod || defaultMethod || "card") as CashboxTenderType;
	const splitInputRef = useRef<HTMLInputElement | null>(null);

	// Baseline incoming total in rubles safely resolved
	const rawAmount = useMemo(() => {
		if (typeof propTotalDue === "number") return Math.max(0, propTotalDue);
		if (typeof propAmount === "number") return Math.max(0, propAmount);
		if (typeof propBillRub === "number") return Math.max(0, propBillRub);
		if (typeof propBillKop === "number") return Math.max(0, kopecksToRub(propBillKop));
		if (typeof propKop === "bigint") return Math.max(0, kopecksToRub(Number(propKop)));
		if (typeof propKop === "number") return Math.max(0, kopecksToRub(propKop));
		if (typeof propInitialKop === "bigint") return Math.max(0, kopecksToRub(Number(propInitialKop)));
		if (typeof propInitialKop === "number") return Math.max(0, kopecksToRub(propInitialKop));
		return 0;
	}, [propTotalDue, propAmount, propBillRub, propBillKop, propKop, propInitialKop]);

	const [isWarranty, setIsWarranty] = useState<boolean>(initialWarranty100 ?? false);
	const [discountPercent, setDiscountPercent] = useState<number>(initialDiscountPercent ?? 0);
	const [payerType, setPayerType] = useState<ClientPayerType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");

	// Effective total due after doctor discounts
	const totalDue = useMemo(() => {
		if (isWarranty) return 0;
		if (discountPercent > 0) return Math.max(0, rawAmount - Math.round((rawAmount * discountPercent) / 100));
		return rawAmount;
	}, [rawAmount, isWarranty, discountPercent]);

	const totalKopecks = BigInt(rubToKopecks(totalDue));
	const effectiveDepositLimit = Math.max(0, (patientDepositRub ?? 0) + (patientFamilyBalanceRub ?? 0));

	const [method, setMethod] = useState<CashboxTenderType>(
		["card", "cash", "sbp", "deposit", "split"].includes(effectiveDefaultMethod) ? effectiveDefaultMethod : "card",
	);

	// Cash Tender & Change
	const [cashReceivedRub, setCashReceivedRub] = useState<number>(totalDue);
	// Split Tender allocations
	const [splitCardRub, setSplitCardRub] = useState<number>(totalDue);
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);

	// Fiscalization & delivery
	const [fiscalize, setFiscalize] = useState<boolean>(true);
	const [receiptDelivery, setReceiptDelivery] = useState<CheckoutDeliveryMethod>("print");
	const [printFormat, setPrintFormat] = useState<ReceiptPrintFormat>("tape_80mm");
	const [customerContact, setCustomerContact] = useState<string>(patientPhone || patientEmail || "");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [receiptSuccess, setReceiptSuccess] = useState<any | null>(null);

	// Resync values when total due changes
	useEffect(() => {
		setCashReceivedRub(totalDue);
		setSplitCardRub(totalDue);
		setSplitCashRub(0);
		setSplitSbpRub(0);
		setSplitDepositRub(0);
		setErrorMessage(null);
		setReceiptSuccess(null);
	}, [totalDue, isOpen]);

	// ESC to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isSubmitting) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isSubmitting]);

	// Cash change calculation
	const cashChangeResult = useMemo(
		() => calculateCashChange(method === "cash" ? totalDue : splitCashRub, cashReceivedRub),
		[method, totalDue, splitCashRub, cashReceivedRub],
	);

	// Split breakdown calculation
	const splitBalances = useMemo(
		() =>
			calculateSplitBalances(totalDue, {
				cardRub: splitCardRub,
				cashRub: splitCashRub,
				sbpRub: splitSbpRub,
				depositRub: splitDepositRub,
			}),
		[totalDue, splitCardRub, splitCashRub, splitSbpRub, splitDepositRub],
	);

	// SBP QR generation
	const sbpQrSvg = useMemo(() => {
		if (method !== "sbp" && splitSbpRub <= 0) return null;
		const sbpAmount = method === "sbp" ? totalDue : splitSbpRub;
		const fakeNspkUrl = `https://qr.nspk.ru/AD1000${patientId.slice(0, 6)}?type=02&bank=100000000004&sum=${Math.round(sbpAmount * 100)}&cur=RUB`;
		return generateQrCodeSvg(fakeNspkUrl, { size: 140, margin: 1 });
	}, [method, totalDue, splitSbpRub, patientId]);

	const handleExecutePayment = async () => {
		const isWarrantyCase = isWarranty || totalDue === 0;
		if (totalDue <= 0 && !isWarrantyCase) {
			setErrorMessage("Сумма к оплате должна быть больше 0 ₽.");
			return;
		}

		// Mandate 8e: Non-blocking auto-balance split for cashier autonomy
		if (method === "split" && !isWarrantyCase && !splitBalances.isFullyPaid) {
			const diff = splitBalances.totalDueRub - splitBalances.allocatedRub;
			if (diff > 0) {
				setSplitCardRub((prev) => prev + diff);
			} else {
				setErrorMessage(`Сумма сплита превышает счёт на ${Math.abs(diff)} ₽.`);
				splitInputRef.current?.focus();
				return;
			}
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		const cashKop = isWarrantyCase ? 0 : method === "cash" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitCashRub) : 0;
		const cardKop = isWarrantyCase ? 0 : method === "card" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitCardRub) : 0;
		const sbpKop = isWarrantyCase ? 0 : method === "sbp" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitSbpRub) : 0;
		const depKop = isWarrantyCase ? 0 : method === "deposit" ? rubToKopecks(totalDue) : method === "split" ? rubToKopecks(splitDepositRub) : 0;

		const payload = {
			patientId: patientId && patientId !== "pat-walkin" ? patientId : undefined,
			visitId: visitId || undefined,
			invoiceId: invoiceId || undefined,
			orderId: orderId || undefined,
			amountKopecks: isWarrantyCase ? 0 : Number(totalKopecks),
			amountRub: isWarrantyCase ? 0 : totalDue,
			method: isWarrantyCase ? "warranty" : method === "split" ? "split" : method === "sbp" ? "sbp" : method === "cash" ? "cash" : method === "deposit" ? "deposit" : "card",
			isWarranty: isWarrantyCase,
			cashAmountKopecks: cashKop,
			electronicAmountKopecks: cardKop + sbpKop,
			depositAmountKopecks: depKop,
			cashierFullName,
			isElectronicReceiptOnly: receiptDelivery !== "print",
			customerContact: receiptDelivery !== "print" ? customerContact.trim() : undefined,
			clientType: payerType,
			buyerInn: payerType !== "physical_person" ? buyerInn.trim() || undefined : undefined,
			printFormat,
			clientMutationId: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			note: isWarrantyCase ? "Гарантийный расчёт (скидка 100%)" : undefined,
		};

		try {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const response = await fetch("/api/cashbox/payments", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
			const json = await response.json().catch(() => null);
			if (!response.ok || !json?.success) {
				if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
					const fallbackData = { ...payload, status: isWarrantyCase ? "paid_warranty" : "paid" };
					setReceiptSuccess(fallbackData);
					setIsSubmitting(false);
					onSuccess?.(fallbackData);
					onPaymentComplete?.(fallbackData);
					setTimeout(onClose, 800);
					return;
				}
				setErrorMessage(json?.message || "Ошибка кассового узла при проведении платежа.");
				setIsSubmitting(false);
				return;
			}
			const paymentData = json.data || payload;
			setReceiptSuccess(paymentData);
			setIsSubmitting(false);
			onSuccess?.(paymentData);
			onPaymentComplete?.(paymentData);
			setTimeout(onClose, 800);
		} catch {
			if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
				const fallbackData = { ...payload, status: isWarrantyCase ? "paid_warranty" : "paid" };
				setReceiptSuccess(fallbackData);
				setIsSubmitting(false);
				onSuccess?.(fallbackData);
				onPaymentComplete?.(fallbackData);
				setTimeout(onClose, 800);
				return;
			}
			setErrorMessage("Сетевой сбой при связи с кассой. Проверьте подключение и повторите.");
			setIsSubmitting(false);
		}
	};

	return {
		cashierFullName,
		doctorFullName,
		isWarranty,
		setIsWarranty,
		discountPercent,
		setDiscountPercent,
		payerType,
		setPayerType,
		buyerInn,
		setBuyerInn,
		totalDue,
		totalKopecks,
		effectiveDepositLimit,
		method,
		setMethod,
		cashReceivedRub,
		setCashReceivedRub,
		cashChangeResult,
		splitCardRub,
		setSplitCardRub,
		splitCashRub,
		setSplitCashRub,
		splitSbpRub,
		setSplitSbpRub,
		splitDepositRub,
		setSplitDepositRub,
		splitBalances,
		splitInputRef,
		sbpQrSvg,
		fiscalize,
		setFiscalize,
		receiptDelivery,
		setReceiptDelivery,
		printFormat,
		setPrintFormat,
		customerContact,
		setCustomerContact,
		isSubmitting,
		errorMessage,
		receiptSuccess,
		handleExecutePayment,
	};
}
