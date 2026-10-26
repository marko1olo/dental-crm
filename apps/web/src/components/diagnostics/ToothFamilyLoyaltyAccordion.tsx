import React from "react";
import { ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { money } from "../../AppHelpers";
import { ToothFamilyWalletKpi } from "./family/ToothFamilyWalletKpi";
import { ToothFamilySplitSetup } from "./family/ToothFamilySplitSetup";
import { useToothFamilyLoyaltyState } from "./family/useToothFamilyLoyaltyState";

export interface ToothFamilyLoyaltyAccordionProps {
	toothNumber: number;
	patientId?: string | undefined;
	patientName?: string | undefined;
	estimatedCostRub?: number | undefined;
	familyBalanceRub?: number | undefined;
	loyaltyPointsBalance?: number | undefined;
	familyMembers?: ReadonlyArray<{ id: string; fullName: string; phone?: string }> | undefined;
	onApplySplit?: ((split: { depositRub: number; bonusRub: number; cardCashRub: number }) => void) | undefined;
	onOpenFullFamilyBilling?: (() => void) | undefined;
}

export const BONUS_PRESET_CHIPS: readonly number[] = [500, 1000, 2000, 5000];

export const ToothFamilyLoyaltyAccordion: React.FC<ToothFamilyLoyaltyAccordionProps> = ({
	toothNumber,
	patientId = "pat-1",
	patientName = "Текущий пациент",
	estimatedCostRub = 4500,
	familyBalanceRub = 12500,
	loyaltyPointsBalance = 1850,
	familyMembers,
	onApplySplit,
	onOpenFullFamilyBilling,
}) => {
	const {
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
	} = useToothFamilyLoyaltyState({
		toothNumber,
		patientId,
		patientName,
		estimatedCostRub,
		familyBalanceRub,
		loyaltyPointsBalance,
		familyMembers,
		onApplySplit,
	});

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-family-loyalty-accordion">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Wallet size={18} color="var(--brand-primary, var(--teal))" />
					<h3 className="dente-warm-tool-title">
						Семейный депозит и бонусы лояльности (Сплит-оплата)
					</h3>
				</div>
				<span className="dente-warm-tag ok">
					Смета: {money(estimatedCostRub)}
				</span>
			</div>

			<ToothFamilyWalletKpi
				familyBalanceRub={familyBalanceRub}
				loyaltyPointsBalance={loyaltyPointsBalance}
				maxAllowedBonus={maxAllowedBonus}
				resolvedFamilyMembers={resolvedFamilyMembers}
				selectedPayerId={selectedPayerId}
				onSelectPayerId={setSelectedPayerId}
			/>

			<ToothFamilySplitSetup
				toothNumber={toothNumber}
				estimatedCostRub={estimatedCostRub}
				familyBalanceRub={familyBalanceRub}
				depositDeductionRub={depositDeductionRub}
				bonusDeductionRub={bonusDeductionRub}
				remainingCardCashRub={remainingCardCashRub}
				maxAllowedBonus={maxAllowedBonus}
				bonusPresets={BONUS_PRESET_CHIPS}
				onChangeDeposit={setDepositDeductionRub}
				onApplyFullDeposit={handleApplyFullDeposit}
				onApplyBonusChip={handleApplyBonusChip}
				onApplyMaxBonus={() => setBonusDeductionRub(maxAllowedBonus)}
			/>

			<div className="dente-wallet-footer">
				<button type="button" onClick={handleConfirmSplit} className="dente-primary-action-btn">
					<ShieldCheck size={16} />
					<span>Применить сплит к чеку</span>
				</button>
				<button type="button" onClick={() => onOpenFullFamilyBilling?.()} className="dente-secondary-btn">
					<Sparkles size={14} />
					<span>Семейный расчет оплаты...</span>
				</button>
			</div>
		</div>
	);
};

export default ToothFamilyLoyaltyAccordion;
