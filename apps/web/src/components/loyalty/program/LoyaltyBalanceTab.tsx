import type React from "react";
import { CreditCard } from "lucide-react";
import type {
	FamilyMember,
	FamilyPoolResult,
	LoyaltyRedemptionResult,
	LoyaltyTierDefinition,
	TierProgressionResult,
} from "./loyaltyEngine";
import { LoyaltyTierHeroCard } from "./tabs/balance/LoyaltyTierHeroCard";
import { LoyaltyFamilySelectorBar } from "./tabs/balance/LoyaltyFamilySelectorBar";
import { LoyaltyRedemptionInputs } from "./tabs/balance/LoyaltyRedemptionInputs";
import { LoyaltyQuickRedeemButtons } from "./tabs/balance/LoyaltyQuickRedeemButtons";
import { LoyaltyDoctorAutonomyToggle } from "./tabs/balance/LoyaltyDoctorAutonomyToggle";
import { LoyaltyFiscalSplitBox } from "./tabs/balance/LoyaltyFiscalSplitBox";
import { LoyaltyRedemptionSubmitBar } from "./tabs/balance/LoyaltyRedemptionSubmitBar";

export interface LoyaltyBalanceTabProps {
	readonly patientName: string;
	readonly currentTier: LoyaltyTierDefinition;
	readonly effectiveBalanceRub: number;
	readonly tierProgression: TierProgressionResult;
	readonly redemptionSuccessMsg: string | null;
	readonly familyMembers: readonly FamilyMember[];
	readonly selectedFamilyMemberId: string;
	readonly onSelectFamilyMemberId: (id: string) => void;
	readonly activePointsBalance: number;
	readonly familyPool: FamilyPoolResult;
	readonly invoiceAmountRub: number;
	readonly onInvoiceAmountChange: (amount: number) => void;
	readonly excludedAmountRub: number;
	readonly onExcludedAmountChange: (amount: number) => void;
	readonly requestedPointsRub: number;
	readonly onRequestedPointsChange: (points: number) => void;
	readonly redemptionCalc: LoyaltyRedemptionResult;
	readonly onOneClickRedeem: () => void;
	readonly onApplyQuickPoints: (pts: number) => void;
	readonly onApplyMaxPoints: () => void;
	readonly isDoctorOverride: boolean;
	readonly onDoctorOverrideChange: (override: boolean) => void;
	readonly onExecuteRedemption: () => void;
}

export const LoyaltyBalanceTab: React.FC<LoyaltyBalanceTabProps> = (p) => {
	return (
		<div>
			<LoyaltyTierHeroCard
				patientName={p.patientName}
				currentTier={p.currentTier}
				effectiveBalanceRub={p.effectiveBalanceRub}
				tierProgression={p.tierProgression}
			/>
			<div className="loyalty-cashier-card">
				<h4 className="loyalty-section-title">
					<CreditCard size={20} color="var(--teal)" />
					Калькулятор списания бонусов
				</h4>
				<LoyaltyFamilySelectorBar
					familyMembers={p.familyMembers}
					selectedFamilyMemberId={p.selectedFamilyMemberId}
					onSelectFamilyMemberId={p.onSelectFamilyMemberId}
					patientName={p.patientName}
					activePointsBalance={p.activePointsBalance}
					familyPool={p.familyPool}
				/>
				<LoyaltyRedemptionInputs
					invoiceAmountRub={p.invoiceAmountRub}
					onInvoiceAmountChange={p.onInvoiceAmountChange}
					excludedAmountRub={p.excludedAmountRub}
					onExcludedAmountChange={p.onExcludedAmountChange}
					requestedPointsRub={p.requestedPointsRub}
					onRequestedPointsChange={p.onRequestedPointsChange}
					effectiveBalanceRub={p.effectiveBalanceRub}
				/>
				<LoyaltyQuickRedeemButtons
					maxAllowedRedemptionRub={p.redemptionCalc.maxAllowedRedemptionRub}
					onOneClickRedeem={p.onOneClickRedeem}
					onApplyQuickPoints={p.onApplyQuickPoints}
					onApplyMaxPoints={p.onApplyMaxPoints}
				/>
				<LoyaltyDoctorAutonomyToggle
					isDoctorOverride={p.isDoctorOverride}
					onDoctorOverrideChange={p.onDoctorOverrideChange}
				/>
				<LoyaltyFiscalSplitBox redemptionCalc={p.redemptionCalc} />
				<LoyaltyRedemptionSubmitBar
					redemptionSuccessMsg={p.redemptionSuccessMsg}
					actualRedeemedPointsRub={p.redemptionCalc.actualRedeemedPointsRub}
					onExecuteRedemption={p.onExecuteRedemption}
				/>
			</div>
		</div>
	);
};
