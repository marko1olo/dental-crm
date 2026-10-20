import { useState } from "react";
import {
	validateBuyerInn54Fz,
	process100PercentDiscountCheckout,
	allocateRemainderToTender,
	type PayerLegalType,
	type TenderAllocationTarget,
	type MultiTenderStateRub,
} from "../cashboxOperations.js";

export function useCashboxDiscountsAndTenders(initialAmountRub: number) {
	const [payerType, setPayerType] = useState<PayerLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState("");
	const [grossAmountRub, setGrossAmountRub] = useState<number>(initialAmountRub);
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [isWarranty, setIsWarranty] = useState<boolean>(false);
	const [isStaffColleague, setIsStaffColleague] = useState<boolean>(false);

	const [tenders, setTenders] = useState<MultiTenderStateRub>({
		cardRub: 0,
		cashRub: 0,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
	});

	const innValidation = validateBuyerInn54Fz({ payerType, buyerInn });

	const checkoutResult = process100PercentDiscountCheckout({
		totalGrossRub: grossAmountRub,
		discountPercent,
		isWarrantyRework: isWarranty,
		isStaffColleague,
	});

	const handleAllocateAll = (target: TenderAllocationTarget) => {
		const updated = allocateRemainderToTender({
			totalDueRub: checkoutResult.totalNetRub,
			currentTenders: tenders,
			targetTender: target,
		});
		setTenders(updated);
	};

	const resetDiscount = () => {
		setIsWarranty(false);
		setIsStaffColleague(false);
		setDiscountPercent(0);
	};

	return {
		payerType,
		setPayerType,
		buyerInn,
		setBuyerInn,
		grossAmountRub,
		setGrossAmountRub,
		discountPercent,
		setDiscountPercent,
		isWarranty,
		setIsWarranty,
		isStaffColleague,
		setIsStaffColleague,
		tenders,
		setTenders,
		innValidation,
		checkoutResult,
		handleAllocateAll,
		resetDiscount,
	};
}
