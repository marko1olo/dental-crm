import { useState, useMemo } from "react";
import { showToast } from "../../GlobalToast";
import { money } from "../../../AppHelpers";

interface UseToothFamilyLoyaltyStateProps {
	toothNumber: number;
	patientId?: string | undefined;
	patientName?: string | undefined;
	estimatedCostRub?: number | undefined;
	familyBalanceRub?: number | undefined;
	loyaltyPointsBalance?: number | undefined;
	familyMembers?: ReadonlyArray<{ id: string; fullName: string; phone?: string }> | undefined;
	onApplySplit?: ((split: { depositRub: number; bonusRub: number; cardCashRub: number }) => void) | undefined;
}

export function useToothFamilyLoyaltyState({
	toothNumber,
	patientId = "pat-1",
	patientName = "Текущий пациент",
	estimatedCostRub = 4500,
	familyBalanceRub = 12500,
	loyaltyPointsBalance = 1850,
	familyMembers,
	onApplySplit,
}: UseToothFamilyLoyaltyStateProps) {
	const resolvedFamilyMembers = useMemo(() => {
		if (familyMembers && familyMembers.length > 0) return familyMembers;
		return [{ id: patientId, fullName: patientName, phone: "" }];
	}, [familyMembers, patientId, patientName]);

	const [depositDeductionRub, setDepositDeductionRub] = useState<number>(
		Math.min(estimatedCostRub, familyBalanceRub),
	);
	const [bonusDeductionRub, setBonusDeductionRub] = useState<number>(0);
	const [selectedPayerId, setSelectedPayerId] = useState<string>(patientId);

	const maxAllowedBonus = useMemo(() => {
		const maxByCost = Math.round(estimatedCostRub * 0.3);
		return Math.min(maxByCost, loyaltyPointsBalance);
	}, [estimatedCostRub, loyaltyPointsBalance]);

	const remainingCardCashRub = useMemo(() => {
		const totalDeductions = depositDeductionRub + bonusDeductionRub;
		return Math.max(0, estimatedCostRub - totalDeductions);
	}, [estimatedCostRub, depositDeductionRub, bonusDeductionRub]);

	const handleApplyBonusChip = (val: number) => {
		const clamped = Math.min(val, maxAllowedBonus);
		setBonusDeductionRub(clamped);
		showToast(`Применено ${clamped} бонусных баллов к смене!`, "info");
	};

	const handleApplyFullDeposit = () => {
		const needed = Math.max(0, estimatedCostRub - bonusDeductionRub);
		const clamped = Math.min(needed, familyBalanceRub);
		setDepositDeductionRub(clamped);
		showToast(`Списание с депозита: ${money(clamped)}`, "info");
	};

	const handleConfirmSplit = () => {
		onApplySplit?.({
			depositRub: depositDeductionRub,
			bonusRub: bonusDeductionRub,
			cardCashRub: remainingCardCashRub,
		});
		showToast(
			`Сплит-оплата зуба #${toothNumber}: Депозит ${money(depositDeductionRub)}, Бонусы ${bonusDeductionRub} ₽, Доплата ${money(remainingCardCashRub)}`,
			"success",
		);
	};

	return {
		resolvedFamilyMembers,
		depositDeductionRub,
		setDepositDeductionRub,
		bonusDeductionRub,
		setBonusDeductionRub,
		selectedPayerId,
		setSelectedPayerId,
		maxAllowedBonus,
		remainingCardCashRub,
		handleApplyBonusChip,
		handleApplyFullDeposit,
		handleConfirmSplit,
	};
}
