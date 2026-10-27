import { useState, useMemo, useEffect } from "react";
import { kopecksToRub, rubToKopecks, type CashBoxType, type CashReceiptTypeAlias } from "@dental/shared";
import { calculateCashChange, validate54FzBuyerInn, type PayerType } from "../../../cashboxOperations.js";
import { applyQuickCheckoutPreset, paymentsToSplitState } from "../../../../payments/checkout/fastCheckoutEngine.js";
import type { PaymentMethodTab } from "../paymentModalTypes.js";

export interface PaymentTenderStateParams {
	readonly isOpen: boolean;
	readonly defaultMethod?: PaymentMethodTab | undefined;
	readonly initialSplit5050?: boolean | undefined;
	readonly totalDueRub: number;
	readonly initialSplitDmsRub?: number | undefined;
}

export function usePaymentTenderState(params: PaymentTenderStateParams) {
	const { isOpen, defaultMethod = "card_terminal", initialSplit5050 = false, totalDueRub, initialSplitDmsRub = 0 } = params;

	const [activeMethod, setActiveMethod] = useState<PaymentMethodTab>(defaultMethod);
	const [selectedCashBoxType, setSelectedCashBoxType] = useState<CashBoxType>("main");
	const [selectedReceiptAlias, setSelectedReceiptAlias] = useState<CashReceiptTypeAlias>("appointment_payment");

	const initialCash = initialSplit5050 ? kopecksToRub(Math.floor(rubToKopecks(totalDueRub) / 2)) : 0;
	const initialCard = initialSplit5050 ? kopecksToRub(rubToKopecks(totalDueRub) - rubToKopecks(initialCash)) : totalDueRub;

	const [splitCardRub, setSplitCardRub] = useState<number>(initialCard);
	const [splitCashRub, setSplitCashRub] = useState<number>(initialCash);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitCertificateRub, setSplitCertificateRub] = useState<number>(0);
	const [splitBonusRub, setSplitBonusRub] = useState<number>(0);
	const [splitDmsRub, setSplitDmsRub] = useState<number>(initialSplitDmsRub);

	const [payerType, setPayerType] = useState<PayerType>("physical");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerInnError, setBuyerInnError] = useState<string | null>(null);
	const [receivedCashRub, setReceivedCashRub] = useState<number>(totalDueRub);

	const cashChange = useMemo(() => calculateCashChange(totalDueRub, receivedCashRub), [receivedCashRub, totalDueRub]);

	const handleInnChange = (value: string) => {
		const cleaned = value.replace(/\D/g, "").slice(0, 12);
		setBuyerInn(cleaned);
		if (cleaned.length > 0 && payerType !== "physical") {
			const validation = validate54FzBuyerInn(cleaned, payerType);
			setBuyerInnError(validation.isValid ? null : validation.errorMessage || "Некорректный ИНН");
		} else {
			setBuyerInnError(null);
		}
	};

	const resetSplitTenders = (overrides: Partial<{ card: number; cash: number; deposit: number; sbp: number; certificate: number; bonus: number; dms: number }> = {}) => {
		setSplitCardRub(overrides.card ?? 0);
		setSplitCashRub(overrides.cash ?? 0);
		setSplitDepositRub(overrides.deposit ?? 0);
		setSplitSbpRub(overrides.sbp ?? 0);
		setSplitCertificateRub(overrides.certificate ?? 0);
		setSplitBonusRub(overrides.bonus ?? 0);
		setSplitDmsRub(overrides.dms ?? 0);
	};

	const syncSplitAndCashToTotal = (newTotalRub: number) => {
		setReceivedCashRub(newTotalRub);
		if (newTotalRub === 0) return resetSplitTenders();
		const other = splitDepositRub + splitSbpRub + splitCertificateRub + splitBonusRub + splitDmsRub;
		if (splitCashRub > 0 && splitCardRub === 0) {
			setSplitCashRub(Math.max(0, Number((newTotalRub - other).toFixed(2))));
		} else {
			setSplitCardRub(Math.max(0, Number((newTotalRub - (other + splitCashRub)).toFixed(2))));
		}
	};

	useEffect(() => {
		if (!isOpen) return;
		setReceivedCashRub(totalDueRub);
		if (initialSplit5050 && totalDueRub > 0) {
			const res = applyQuickCheckoutPreset({ totalBillKop: rubToKopecks(totalDueRub), preset: "split_50_50" });
			const splitState = paymentsToSplitState(res.payments);
			resetSplitTenders({ cash: splitState.cashRub, card: splitState.cardRub });
			setActiveMethod("split");
		} else if ([splitCardRub, splitCashRub, splitDepositRub, splitSbpRub, splitCertificateRub, splitBonusRub, splitDmsRub].every(v => v === 0)) {
			setSplitCardRub(totalDueRub);
		}
	}, [isOpen, initialSplit5050, totalDueRub]);

	const totalAllocatedRub = Number((splitCardRub + splitCashRub + splitDepositRub + splitSbpRub + splitCertificateRub + splitBonusRub + splitDmsRub).toFixed(2));
	const isBalanced = Math.abs(totalAllocatedRub - totalDueRub) < 0.009;

	return {
		activeMethod, setActiveMethod, selectedCashBoxType, setSelectedCashBoxType,
		selectedReceiptAlias, setSelectedReceiptAlias, splitCardRub, setSplitCardRub,
		splitCashRub, setSplitCashRub, splitDepositRub, setSplitDepositRub,
		splitSbpRub, setSplitSbpRub, splitCertificateRub, setSplitCertificateRub,
		splitBonusRub, setSplitBonusRub, splitDmsRub, setSplitDmsRub,
		payerType, setPayerType, buyerInn, setBuyerInn, buyerInnError, setBuyerInnError,
		handleInnChange, receivedCashRub, setReceivedCashRub, cashChange,
		resetSplitTenders, syncSplitAndCashToTotal, totalAllocatedRub, isBalanced,
	};
}
