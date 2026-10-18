/**
 * TreatmentPlan3TierToolbar.tsx — Верхняя панель управления 3-Tier сравнения планов (DENTE CRM).
 * Декомпозирована по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./types";
import { ToolbarTitleBadge } from "./threeTierToolbar/ToolbarTitleBadge";
import { ToolbarPaymentModeSelector } from "./threeTierToolbar/ToolbarPaymentModeSelector";
import { ToolbarTermSelector } from "./threeTierToolbar/ToolbarTermSelector";
import { ToolbarMessengerButton } from "./threeTierToolbar/ToolbarMessengerButton";
import { ToolbarParamsDropdown } from "./threeTierToolbar/ToolbarParamsDropdown";

export interface TreatmentPlan3TierToolbarProps {
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly onPaymentModeChange: (mode: "installment" | "staged" | "discount") => void;
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly onInstallmentMonthsChange: (months: 3 | 6 | 12 | 24) => void;
	readonly showNdflBreakdown: boolean;
	readonly onToggleNdflBreakdown: () => void;
	readonly activeTier: TreatmentPlanTier;
	readonly copiedMessengerTierId: TreatmentPlanTierId | null;
	readonly onCopyEstimateToMessenger: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onOpenComparatorStudio?: (() => void) | undefined;
	readonly onOpenStagePaymentStudio?: (() => void) | undefined;
	readonly onOpenPriceValidatorStudio?: (() => void) | undefined;
	readonly initialParamsOpen?: boolean;
}

export const TreatmentPlan3TierToolbar: React.FC<TreatmentPlan3TierToolbarProps> = ({
	activePaymentMode,
	onPaymentModeChange,
	installmentMonths,
	onInstallmentMonthsChange,
	showNdflBreakdown,
	onToggleNdflBreakdown,
	activeTier,
	copiedMessengerTierId,
	onCopyEstimateToMessenger,
	onOpenComparatorStudio,
	onOpenStagePaymentStudio,
	onOpenPriceValidatorStudio,
	initialParamsOpen = false,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-xs text-[var(--ink,#0f172a)] shadow-2xs max-w-full overflow-x-clip">
			<ToolbarTitleBadge />

			<div className="flex items-center gap-1.5 flex-wrap max-w-full py-0.5">
				<ToolbarPaymentModeSelector
					activePaymentMode={activePaymentMode}
					onPaymentModeChange={onPaymentModeChange}
				/>

				{activePaymentMode === "installment" && (
					<ToolbarTermSelector
						installmentMonths={installmentMonths}
						onInstallmentMonthsChange={onInstallmentMonthsChange}
					/>
				)}

				<ToolbarMessengerButton
					activeTier={activeTier}
					copiedMessengerTierId={copiedMessengerTierId}
					onCopyEstimateToMessenger={onCopyEstimateToMessenger}
				/>

				<ToolbarParamsDropdown
					showNdflBreakdown={showNdflBreakdown}
					onToggleNdflBreakdown={onToggleNdflBreakdown}
					onOpenComparatorStudio={onOpenComparatorStudio}
					onOpenStagePaymentStudio={onOpenStagePaymentStudio}
					onOpenPriceValidatorStudio={onOpenPriceValidatorStudio}
					initialParamsOpen={initialParamsOpen}
				/>
			</div>
		</div>
	);
};

export default TreatmentPlan3TierToolbar;
