/**
 * TreatmentPlan3TierToolbar.tsx — Верхняя панель управления 3-Tier сравнения планов (DENTE CRM).
 * Декомпозирована по Мандату 8b (все файлы <= 120 строк).
 * Строго 1 строка высотой 36px без слоеных пирогов (Мандат 8am).
 */

import React from "react";
import { Send } from "lucide-react";
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
	readonly isSendingTelegram?: boolean | undefined;
	readonly onSendTelegramFollowup?: ((e: React.MouseEvent, tier: TreatmentPlanTier) => void) | undefined;
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
	isSendingTelegram = false,
	onSendTelegramFollowup,
	onOpenComparatorStudio,
	onOpenStagePaymentStudio,
	onOpenPriceValidatorStudio,
	initialParamsOpen = false,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 px-3 h-9 min-h-[36px] max-h-[36px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] shadow-2xs max-w-full overflow-hidden flex-nowrap">
			<ToolbarTitleBadge />

			<div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none max-w-full py-0.5 shrink-0">
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

				{onSendTelegramFollowup && (
					<button
						type="button"
						onClick={(e) => onSendTelegramFollowup(e, activeTier)}
						className="secondary-button h-9 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer transition-colors whitespace-nowrap shrink-0"
						title="Отправить интерактивный план лечения пациенту в Telegram"
						data-testid="top-send-telegram-followup-btn"
					>
						<Send className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" aria-hidden="true" />
						<span>{isSendingTelegram ? "Отправка..." : "Telegram"}</span>
					</button>
				)}

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
