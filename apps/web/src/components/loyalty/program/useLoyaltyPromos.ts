import { useState } from "react";
import { evaluatePromoCode, type Fiscal54FzSplitResult } from "./loyaltyEngine";

export interface UseLoyaltyPromosProps {
	readonly invoiceAmountRub: number;
	readonly setInvoiceAmountRub: (val: number) => void;
	readonly onRedeemSuccess?: (
		redeemedPointsRub: number,
		fiscalSplit: Fiscal54FzSplitResult
	) => void;
	readonly setRedemptionSuccessMsg: (msg: string | null) => void;
	readonly setActiveTab: (tab: any) => void;
}

export function useLoyaltyPromos({
	invoiceAmountRub,
	setInvoiceAmountRub,
	onRedeemSuccess,
	setRedemptionSuccessMsg,
	setActiveTab,
}: UseLoyaltyPromosProps) {
	const [promoInput, setPromoInput] = useState<string>("");
	const [promoResult, setPromoResult] = useState<ReturnType<typeof evaluatePromoCode> | null>(null);

	const handleEvaluatePromo = () => {
		const res = evaluatePromoCode(
			promoInput,
			Math.round(invoiceAmountRub * 100),
			["hygiene", "therapy"],
			[]
		);
		setPromoResult(res);
	};

	const handleApplyPromoDirectly = (code: string) => {
		setPromoInput(code);
		const res = evaluatePromoCode(
			code,
			Math.round(invoiceAmountRub * 100),
			["hygiene", "therapy"],
			[]
		);
		setPromoResult(res);
	};

	const handleApplyPromoResultToInvoice = () => {
		if (!promoResult || !promoResult.isValid) return;
		const discountRub = promoResult.discountRub;
		const remainingRub = promoResult.finalPayableKop / 100;
		setInvoiceAmountRub(remainingRub);
		if (onRedeemSuccess) {
			onRedeemSuccess(discountRub, {
				tag1031CashKop: 0,
				tag1081ElectronicCardKop: promoResult.finalPayableKop,
				tag1215AdvancePrepaymentBonusKop: discountRub * 100,
				tag1043DiscountKop: discountRub * 100,
				totalGrossKop: Math.round(invoiceAmountRub * 100),
				totalNetPayableKop: promoResult.finalPayableKop,
			});
		}
		setRedemptionSuccessMsg(
			`Промокод «${promoResult.code}» применен: скидка ${discountRub} ₽ добавлена к чеку. К оплате: ${remainingRub.toLocaleString("ru-RU")} ₽`
		);
		setActiveTab("balance");
	};

	return {
		promoInput,
		setPromoInput,
		promoResult,
		setPromoResult,
		handleEvaluatePromo,
		handleApplyPromoDirectly,
		handleApplyPromoResultToInvoice,
	};
}
