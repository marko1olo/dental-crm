import React from "react";
import { TierCardDetails } from "./tierCard/TierCardDetails";
import { TierCardFooterActions } from "./tierCard/TierCardFooterActions";
import { TierCardHeader } from "./tierCard/TierCardHeader";
import { TierCardPricing } from "./tierCard/TierCardPricing";
import { TierCardStagesAccordion } from "./tierCard/TierCardStagesAccordion";
import type { TreatmentPlanTierCardProps } from "./tierCard/tierCardTypes";

export { formatServiceLifeYearsText, type TreatmentPlanTierCardProps } from "./tierCard/tierCardTypes";

export const TreatmentPlanTierCard: React.FC<TreatmentPlanTierCardProps> = ({
	tier, isSelected, isMobile, activePaymentMode, installmentMonths,
	showNdflBreakdown, isExpandedStages, copiedMessengerTierId,
	onCardClick, onSignClick, onInstallmentClick, onCopyMessengerClick,
	onPrintClick, onToggleStagesExpand,
}) => {
	return (
		<div
			onClick={() => onCardClick(tier)}
			className={`relative flex flex-col justify-between rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 cursor-pointer bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] ${
				isMobile
					? "w-full min-w-0 shadow-md"
					: "h-full max-h-[620px] min-h-0 overflow-hidden flex-1 min-w-0"
			} ${
				isSelected
					? `${tier.borderClass} shadow-xl ring-2 ring-[var(--teal,var(--brand-primary))]/20 z-10`
					: "border-[var(--line,var(--border,#cbd5e1))] opacity-95 hover:opacity-100 hover:border-[var(--line-strong)] shadow-md"
			}`}
			data-testid={isMobile ? `tier-card-mobile-${tier.tierId}` : `tier-card-${tier.tierId}`}
		>
			<TierCardHeader tier={tier} />

			<div
				className={
					isMobile
						? "space-y-2.5 my-2 pb-[calc(100px+env(safe-area-inset-bottom,0px))]"
						: "flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 sm:space-y-2.5 my-2 overscroll-contain"
				}
			>
				<TierCardPricing
					tier={tier}
					activePaymentMode={activePaymentMode}
					installmentMonths={installmentMonths}
					showNdflBreakdown={showNdflBreakdown}
				/>

				<TierCardDetails tier={tier} />

				<TierCardStagesAccordion
					tier={tier}
					isMobile={isMobile}
					isExpandedStages={isExpandedStages}
					onToggleStagesExpand={onToggleStagesExpand}
				/>
			</div>

			<TierCardFooterActions
				tier={tier}
				isSelected={isSelected}
				isMobile={isMobile}
				copiedMessengerTierId={copiedMessengerTierId}
				onSignClick={onSignClick}
				onInstallmentClick={onInstallmentClick}
				onCopyMessengerClick={onCopyMessengerClick}
				onPrintClick={onPrintClick}
			/>
		</div>
	);
};

export default TreatmentPlanTierCard;
