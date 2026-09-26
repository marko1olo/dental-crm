import React, { useMemo, useState } from "react";
import {
	kopecksToRub,
	rubToKopecks,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
	type StomxExpenseTypeAlias,
} from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import {
	calculateSplitPaymentAllocation,
	type SplitPaymentInput,
} from "../../order804nFiscalEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface UseFiscalTenderAllocationParams {
	readonly defaultMethod?: any;
	readonly effectiveInitialTotal: number;
	readonly totalSumRub: number;
	readonly totalKopecks: number;
	readonly patientDepositRub: number;
	readonly patientPhone?: string | undefined;
}

export function useFiscalTenderAllocation({
	defaultMethod,
	effectiveInitialTotal,
	totalSumRub,
	totalKopecks,
	patientDepositRub,
	patientPhone = "+7 (___) ___-__-__",
}: UseFiscalTenderAllocationParams) {
	const initialMethod = defaultMethod || "card";

	const [cashAmount, setCashAmount] = useState<number>(() => (initialMethod === "cash" ? effectiveInitialTotal : 0));
	const [receivedCashRub, setReceivedCashRub] = useState<number>(0);
	const [cardAmount, setCardAmount] = useState<number>(() => (initialMethod === "card" ? effectiveInitialTotal : 0));
	const [sbpAmount, setSbpAmount] = useState<number>(() => (initialMethod === "sbp" ? effectiveInitialTotal : 0));
	const [depositAmount, setDepositAmount] = useState<number>(() => {
		if (initialMethod === "advance" || initialMethod === "deposit") {
			return Math.min(effectiveInitialTotal, Math.max(0, patientDepositRub));
		}
		return 0;
	});
	const [paymentMode, setPaymentMode] = useState<"cash" | "card" | "sbp" | "deposit" | "split">(() => {
		if (initialMethod === "cash") return "cash";
		if (initialMethod === "sbp") return "sbp";
		if (initialMethod === "advance" || initialMethod === "deposit") return "deposit";
		return "card";
	});
	const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState<boolean>(false);
	const [showStomxSettings, setShowStomxSettings] = useState<boolean>(false);
	const [certificateAmount, setCertificateAmount] = useState<number>(0);
	const [insuranceAmount, setInsuranceAmount] = useState<number>(0);
	const [guaranteeLetterNumber, setGuaranteeLetterNumber] = useState<string>("");
	const [customerContact, setCustomerContact] = useState<string>(patientPhone);

	// 54-ФЗ Тип плательщика: по умолчанию физлицо (ИНН строго НЕ требуется)
	const [payerType, setPayerType] = useState<"individual" | "legal_entity">("individual");
	const [buyerLegalName, setBuyerLegalName] = useState<string>("");
	const [buyerInn, setBuyerInn] = useState<string>("");

	// StomX Cash Box & 54-FZ Cash Flow Categories (ДДС)
	const [selectedCashBoxType, setSelectedCashBoxType] = useState<StomxCashBoxType>("main");
	const [selectedReceiptAlias, setSelectedReceiptAlias] = useState<StomxReceiptTypeAlias>("appointment_payment");
	const [selectedExpenseAlias, setSelectedExpenseAlias] = useState<StomxExpenseTypeAlias>("return_appointment");

	// Initial default allocation: 100% to initialMethod if all are 0
	React.useEffect(() => {
		if (
			cashAmount === 0 &&
			cardAmount === 0 &&
			sbpAmount === 0 &&
			depositAmount === 0 &&
			certificateAmount === 0 &&
			insuranceAmount === 0 &&
			totalSumRub > 0
		) {
			if (initialMethod === "cash") {
				setCashAmount(totalSumRub);
			} else if (initialMethod === "sbp") {
				setSbpAmount(totalSumRub);
			} else if (initialMethod === "advance" || initialMethod === "deposit") {
				const depUsed = Math.min(patientDepositRub, totalSumRub);
				setDepositAmount(depUsed);
				setCardAmount(totalSumRub - depUsed);
			} else {
				setCardAmount(totalSumRub);
			}
		}
	}, [totalSumRub, initialMethod, patientDepositRub]);

	const splitInput: SplitPaymentInput = useMemo(
		() => ({
			cashRub: cashAmount,
			receivedCashRub: receivedCashRub > 0 ? receivedCashRub : cashAmount,
			cardRub: cardAmount,
			sbpRub: sbpAmount,
			depositRub: depositAmount,
			certificateRub: certificateAmount,
			insuranceRub: insuranceAmount,
			...(guaranteeLetterNumber.trim() ? { guaranteeLetterNumber: guaranteeLetterNumber.trim() } : {}),
		}),
		[
			cashAmount,
			receivedCashRub,
			cardAmount,
			sbpAmount,
			depositAmount,
			certificateAmount,
			insuranceAmount,
			guaranteeLetterNumber,
		],
	);

	const allocation = useMemo(() => {
		return calculateSplitPaymentAllocation(totalKopecks, splitInput);
	}, [totalKopecks, splitInput]);

	const remainingRub = kopecksToRub(allocation.remainingKopecks);
	const patientCoPayRub = allocation.patientCoPayRub;

	// Select 100% to single payment method
	const selectSingleMethod = (
		type: "card" | "sbp" | "cash" | "deposit" | "certificate" | "insurance",
	) => {
		if (type === "insurance") {
			setInsuranceAmount(totalSumRub);
			setCardAmount(0);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана 100% оплата по ДМС: ${formatMoneyRu(totalSumRub)}`, "info", 1500);
		} else if (type === "card") {
			setCardAmount(totalSumRub - insuranceAmount);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана оплата картой: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		} else if (type === "sbp") {
			setSbpAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана оплата СБП QR: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		} else if (type === "cash") {
			setCashAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setSbpAmount(0);
			setDepositAmount(0);
			setCertificateAmount(0);
			showToast(`Выбрана оплата наличными: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		} else if (type === "deposit") {
			const targetTotal = totalSumRub - insuranceAmount;
			const depUsed = Math.min(patientDepositRub, targetTotal);
			setDepositAmount(depUsed);
			const rest = targetTotal - depUsed;
			setCardAmount(rest);
			setSbpAmount(0);
			setCashAmount(0);
			setCertificateAmount(0);
			showToast(
				depUsed === targetTotal
					? `Выбрана 100% оплата с депозита: ${formatMoneyRu(depUsed)}`
					: `Зачет аванса: ${formatMoneyRu(depUsed)} + остаток на карту ${formatMoneyRu(rest)}`,
				"info",
				2000,
			);
		} else if (type === "certificate") {
			setCertificateAmount(totalSumRub - insuranceAmount);
			setCardAmount(0);
			setSbpAmount(0);
			setCashAmount(0);
			setDepositAmount(0);
			showToast(`Выбрана оплата сертификатом: ${formatMoneyRu(totalSumRub - insuranceAmount)}`, "info", 1500);
		}
	};

	// 1-Click Fast Combined Payment (Нал + Карта + Аванс / Депозит) с точностью до копейки
	const applyCombinedPaymentPreset = (
		mode: "advance_card" | "advance_cash" | "split_cash_card" | "advance_cash_card" | "exact_cash" | "full_card",
	) => {
		const targetTotalKop = Math.max(0, rubToKopecks(totalSumRub) - rubToKopecks(insuranceAmount));
		if (targetTotalKop === 0) return;

		const depAvailKop = rubToKopecks(patientDepositRub || 0);

		if (mode === "exact_cash") {
			const cashRub = kopecksToRub(targetTotalKop);
			setCashAmount(cashRub);
			setCardAmount(0);
			setDepositAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Оплата наличными без сдачи: ${formatMoneyRu(cashRub)}`, "success", 2000);
		} else if (mode === "full_card") {
			const cardRub = kopecksToRub(targetTotalKop);
			setCardAmount(cardRub);
			setCashAmount(0);
			setDepositAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Оплата картой 100%: ${formatMoneyRu(cardRub)}`, "success", 2000);
		} else if (mode === "advance_card") {
			const depUsedKop = Math.min(depAvailKop, targetTotalKop);
			const remKop = Math.max(0, targetTotalKop - depUsedKop);
			const depRub = kopecksToRub(depUsedKop);
			const remRub = kopecksToRub(remKop);
			setDepositAmount(depRub);
			setCardAmount(remRub);
			setCashAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата: аванс ${formatMoneyRu(depRub)} + карта ${formatMoneyRu(remRub)}`, "success", 2000);
		} else if (mode === "advance_cash") {
			const depUsedKop = Math.min(depAvailKop, targetTotalKop);
			const remKop = Math.max(0, targetTotalKop - depUsedKop);
			const depRub = kopecksToRub(depUsedKop);
			const remRub = kopecksToRub(remKop);
			setDepositAmount(depRub);
			setCashAmount(remRub);
			setCardAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата: аванс ${formatMoneyRu(depRub)} + наличные ${formatMoneyRu(remRub)}`, "success", 2000);
		} else if (mode === "split_cash_card") {
			const halfKop = Math.floor(targetTotalKop / 2);
			const otherKop = targetTotalKop - halfKop;
			const cashRub = kopecksToRub(halfKop);
			const cardRub = kopecksToRub(otherKop);
			setCashAmount(cashRub);
			setCardAmount(cardRub);
			setDepositAmount(0);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата 50/50: наличные ${formatMoneyRu(cashRub)} + карта ${formatMoneyRu(cardRub)}`, "success", 2000);
		} else if (mode === "advance_cash_card") {
			const depUsedKop = Math.min(depAvailKop, targetTotalKop);
			const remKop = Math.max(0, targetTotalKop - depUsedKop);
			const cashKop = Math.floor(remKop / 2);
			const cardKop = remKop - cashKop;
			const depRub = kopecksToRub(depUsedKop);
			const cashRub = kopecksToRub(cashKop);
			const cardRub = kopecksToRub(cardKop);
			setDepositAmount(depRub);
			setCashAmount(cashRub);
			setCardAmount(cardRub);
			setSbpAmount(0);
			setCertificateAmount(0);
			showToast(`Комбинированная оплата: аванс ${formatMoneyRu(depRub)} + нал ${formatMoneyRu(cashRub)} + карта ${formatMoneyRu(cardRub)}`, "success", 2000);
		}
	};

	const handleFillRemaining = (type: "cash" | "card" | "sbp" | "deposit" | "certificate") => {
		const unallocatedKop = Math.max(0, allocation.remainingKopecks);
		if (unallocatedKop <= 0) return;
		if (type === "cash") setCashAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		if (type === "card") setCardAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		if (type === "sbp") setSbpAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		if (type === "certificate") setCertificateAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		if (type === "deposit") {
			const maxDepositKop = Math.min(rubToKopecks(patientDepositRub), rubToKopecks(depositAmount) + unallocatedKop);
			setDepositAmount(kopecksToRub(maxDepositKop));
		}
	};

	const handleAutoDistributeRemaining = () => {
		const unallocatedKop = Math.max(0, allocation.remainingKopecks);
		if (unallocatedKop <= 0) return;
		if (cardAmount > 0 || (cashAmount === 0 && sbpAmount === 0 && depositAmount === 0 && certificateAmount === 0)) {
			setCardAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		} else if (sbpAmount > 0) {
			setSbpAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		} else if (cashAmount > 0) {
			setCashAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		} else if (certificateAmount > 0) {
			setCertificateAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		} else {
			setCardAmount((prev) => kopecksToRub(rubToKopecks(prev) + unallocatedKop));
		}
		showToast(`Остаток ${formatMoneyRu(kopecksToRub(unallocatedKop))} распределен`, "success", 1500);
	};

	const handleAutoBalanceOverallocation = () => {
		if (!allocation.isOverallocated) return;
		let excessKop = Math.abs(allocation.remainingKopecks);
		if (cardAmount > 0) {
			const cardKop = rubToKopecks(cardAmount);
			const deduct = Math.min(cardKop, excessKop);
			setCardAmount(kopecksToRub(cardKop - deduct));
			excessKop -= deduct;
		}
		if (excessKop > 0 && cashAmount > 0) {
			const cashKop = rubToKopecks(cashAmount);
			const deduct = Math.min(cashKop, excessKop);
			setCashAmount(kopecksToRub(cashKop - deduct));
			excessKop -= deduct;
		}
		if (excessKop > 0 && sbpAmount > 0) {
			const sbpKop = rubToKopecks(sbpAmount);
			const deduct = Math.min(sbpKop, excessKop);
			setSbpAmount(kopecksToRub(sbpKop - deduct));
			excessKop -= deduct;
		}
		showToast("Сумма оплат автоматически сбалансирована без переплаты", "success", 2000);
	};

	return {
		initialMethod,
		cashAmount,
		setCashAmount,
		receivedCashRub,
		setReceivedCashRub,
		cardAmount,
		setCardAmount,
		sbpAmount,
		setSbpAmount,
		depositAmount,
		setDepositAmount,
		paymentMode,
		setPaymentMode,
		isOverflowMenuOpen,
		setIsOverflowMenuOpen,
		showStomxSettings,
		setShowStomxSettings,
		certificateAmount,
		setCertificateAmount,
		insuranceAmount,
		setInsuranceAmount,
		guaranteeLetterNumber,
		setGuaranteeLetterNumber,
		customerContact,
		setCustomerContact,
		payerType,
		setPayerType,
		buyerLegalName,
		setBuyerLegalName,
		buyerInn,
		setBuyerInn,
		selectedCashBoxType,
		setSelectedCashBoxType,
		selectedReceiptAlias,
		setSelectedReceiptAlias,
		selectedExpenseAlias,
		setSelectedExpenseAlias,
		splitInput,
		allocation,
		remainingRub,
		patientCoPayRub,
		selectSingleMethod,
		applyCombinedPaymentPreset,
		handleFillRemaining,
		handleAutoDistributeRemaining,
		handleAutoBalanceOverallocation,
	};
}
