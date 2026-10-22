import React from "react";
import { Check, Share2 } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";

export interface ToolbarMessengerButtonProps {
	readonly activeTier: TreatmentPlanTier;
	readonly copiedMessengerTierId: TreatmentPlanTierId | null;
	readonly onCopyEstimateToMessenger: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
}

export const ToolbarMessengerButton: React.FC<ToolbarMessengerButtonProps> = ({
	activeTier,
	copiedMessengerTierId,
	onCopyEstimateToMessenger,
}) => {
	const isCopied = copiedMessengerTierId === activeTier.tierId;

	return (
		<button
			type="button"
			onClick={(e) => onCopyEstimateToMessenger(e, activeTier)}
			className="secondary-button h-9 flex items-center gap-1.5 px-4 rounded-lg text-[13px] font-medium text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer transition-colors whitespace-nowrap shrink-0 shadow-2xs touch-manipulation"
			title="Скопировать смету выбранного тарифа для WhatsApp / Telegram (понятный пациенту формат)"
			data-testid="top-copy-messenger-btn"
		>
			{isCopied ? (
				<>
					<Check size={14} className="text-emerald-600 shrink-0" />
					<span className="text-emerald-600 font-bold">Скопировано!</span>
				</>
			) : (
				<>
					<Share2 size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Смета (WhatsApp)</span>
				</>
			)}
		</button>
	);
};
