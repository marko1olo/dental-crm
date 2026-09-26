/**
 * apps/web/src/components/finance/modal/payment/usePaymentTendersAndSbp.ts
 *
 * Multi-tender split allocation, SBP QR generator, cash change, and quick presets.
 */

import { useState, useMemo, useEffect } from "react";
import {
	kopecksToRub,
	rubToKopecks,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
} from "@dental/shared";
import {
	allocateRemainderToTender,
	calculateCashChange,
	validate54FzBuyerInn,
	type PayerType,
	type TenderAllocationTarget,
} from "../../cashboxOperations.js";
import {
	applyQuickCheckoutPreset,
	paymentsToSplitState,
} from "../../../payments/checkout/fastCheckoutEngine.js";
import {
	generateDynamicSbpQrPayload,
	generateQrCodeSvg,
} from "@dental/shared/fiscal";
import { showToast } from "../../../GlobalToast.js";
import type { PaymentMethodTab } from "./paymentModalTypes.js";

export interface UsePaymentTendersAndSbpParams {
	readonly isOpen: boolean;
	readonly defaultMethod?: PaymentMethodTab | undefined;
	readonly initialSplit5050?: boolean | undefined;
	readonly totalDueRub: number;
	readonly rawTotalDueRub: number;
	readonly isWarranty100: boolean;
	readonly setIsWarranty100: (val: boolean) => void;
	readonly setDiscountPercent: (val: number) => void;
	readonly setDiscountReason: (val: string) => void;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName: string;
	readonly clinicLegalName: string;
}

export function usePaymentTendersAndSbp(params: UsePaymentTendersAndSbpParams) {
	const {
		isOpen,
		defaultMethod = "card_terminal",
		initialSplit5050 = false,
		totalDueRub,
		rawTotalDueRub,
		isWarranty100,
		setIsWarranty100,
		setDiscountPercent,
		setDiscountReason,
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		invoiceId,
		documentId,
		visitId,
		patientName,
		clinicLegalName,
	} = params;

	const [activeMethod, setActiveMethod] = useState<PaymentMethodTab>(defaultMethod);
	const [selectedCashBoxType, setSelectedCashBoxType] = useState<StomxCashBoxType>("main");
	const [selectedReceiptAlias, setSelectedReceiptAlias] =
		useState<StomxReceiptTypeAlias>("appointment_payment");

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

	// 54-FZ Buyer requisites
	const [payerType, setPayerType] = useState<PayerType>("physical");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerInnError, setBuyerInnError] = useState<string | null>(null);
	const [receivedCashRub, setReceivedCashRub] = useState<number>(totalDueRub);

	const cashChange = useMemo(() => {
		return calculateCashChange(totalDueRub, receivedCashRub);
	}, [receivedCashRub, totalDueRub]);

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

	// SBP QR State & Math
	const [sbpStatus, setSbpStatus] = useState<"pending" | "paid">("pending");
	const [isCheckingSbp, setIsCheckingSbp] = useState<boolean>(false);
	const [sbpCheckMessage, setSbpCheckMessage] = useState<string | null>(null);

	const effectiveSbpAmountRub = activeMethod === "split" ? splitSbpRub : totalDueRub;
	const effectiveSbpKopecks = Math.round(effectiveSbpAmountRub * 100);
	const effectiveSbpOrderId =
		invoiceId?.trim() ||
		documentId?.trim() ||
		(visitId ? `VISIT-${visitId}` : `ORD-${Date.now()}`);

	const sbpQrData = useMemo(() => {
		if (effectiveSbpKopecks <= 0) return null;
		try {
			const payload = generateDynamicSbpQrPayload({
				sumRub: effectiveSbpAmountRub,
				orderId: effectiveSbpOrderId,
				purpose: `Оплата стоматологических услуг (${patientName})`,
				clinicName: clinicLegalName,
				ttlMinutes: 15,
			});
			const svg = generateQrCodeSvg(payload.nspkUrl, {
				size: 160,
				margin: 2,
				colorDark: "#0f172a",
				colorLight: "#ffffff",
				title: `QR-код СБП: ${payload.sumFormattedRu}`,
			});
			return { payload, svg };
		} catch {
			return null;
		}
	}, [effectiveSbpAmountRub, effectiveSbpKopecks, effectiveSbpOrderId, patientName, clinicLegalName]);

	useEffect(() => {
		setSbpStatus("pending");
		setSbpCheckMessage(null);
	}, [activeMethod, splitSbpRub]);

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
			patientFamilyBalanceRub,
		});
		resetSplitTenders({
			card: next.cardRub,
			cash: next.cashRub,
			deposit: next.depositRub + next.familyRub,
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
		showToast(
			`Применен пресет: Без сдачи (Ровно сумма счёта: ${exactRub.toLocaleString("ru-RU")} ₽)`,
			"info",
			2000,
		);
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
			showToast(
				`Применен пресет: Списан весь аванс/бонусы (${totalDueRub.toLocaleString("ru-RU")} ₽)`,
				"info",
				2500,
			);
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
			showToast(
				`Аванс 0 ₽. Применено списание бонусов (${bonusAmount} ₽) + Карта (${cardRest} ₽)`,
				"info",
				2500,
			);
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
		showToast(
			`Применен пресет: Оплата картой 100% (${effectiveTotal.toLocaleString("ru-RU")} ₽)`,
			"info",
			2000,
		);
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

	const totalAllocatedRub = Number(
		(
			splitCardRub +
			splitCashRub +
			splitDepositRub +
			splitSbpRub +
			splitCertificateRub +
			splitBonusRub
		).toFixed(2),
	);
	const isBalanced = Math.abs(totalAllocatedRub - totalDueRub) < 0.009;

	return {
		activeMethod,
		setActiveMethod,
		selectedCashBoxType,
		setSelectedCashBoxType,
		selectedReceiptAlias,
		setSelectedReceiptAlias,
		splitCardRub,
		setSplitCardRub,
		splitCashRub,
		setSplitCashRub,
		splitDepositRub,
		setSplitDepositRub,
		splitSbpRub,
		setSplitSbpRub,
		splitCertificateRub,
		setSplitCertificateRub,
		splitBonusRub,
		setSplitBonusRub,
		payerType,
		setPayerType,
		buyerInn,
		setBuyerInn,
		buyerInnError,
		setBuyerInnError,
		handleInnChange,
		receivedCashRub,
		setReceivedCashRub,
		cashChange,
		resetSplitTenders,
		syncSplitAndCashToTotal,
		applySplitRemainder,
		applyExactCashPreset,
		applySpendAllDepositBonusPreset,
		apply5050CashCardPreset,
		applyFullCardPreset,
		applyDepositPlusCardPreset,
		applyThreeWayCashCardAdvancePreset,
		totalAllocatedRub,
		isBalanced,
		sbpStatus,
		setSbpStatus,
		isCheckingSbp,
		setIsCheckingSbp,
		sbpCheckMessage,
		setSbpCheckMessage,
		effectiveSbpAmountRub,
		effectiveSbpKopecks,
		effectiveSbpOrderId,
		sbpQrData,
	};
}
