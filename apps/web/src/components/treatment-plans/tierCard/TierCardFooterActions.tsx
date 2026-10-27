import React from "react";
import { Check, CreditCard, PenTool, Printer, Share2 } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";

export interface TierCardFooterActionsProps {
	readonly tier: TreatmentPlanTier;
	readonly isSelected: boolean;
	readonly isMobile: boolean;
	readonly copiedMessengerTierId: TreatmentPlanTierId | null;
	readonly onSignClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onInstallmentClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onCopyMessengerClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onPrintClick?: ((e: React.MouseEvent, tier: TreatmentPlanTier) => void) | undefined;
}

export const TierCardFooterActions: React.FC<TierCardFooterActionsProps> = ({
	tier,
	isSelected,
	isMobile,
	copiedMessengerTierId,
	onSignClick,
	onInstallmentClick,
	onCopyMessengerClick,
	onPrintClick,
}) => {
	return (
		<div
			className={
				isMobile
					? "mt-3 pt-2.5 border-t border-[var(--line-subtle)] space-y-1.5 shrink-0"
					: "sticky bottom-0 bg-[var(--paper-soft,var(--paper,#ffffff))] border-t border-[var(--line,var(--border,#cbd5e1))] p-3 -mx-3.5 sm:-mx-4 -mb-3.5 sm:-mb-4 rounded-b-2xl mt-auto z-10 space-y-1.5 shadow-xs shrink-0"
			}
		>
			{!isMobile && (
				<button
					type="button"
					onClick={(e) => onSignClick(e, tier)}
					className={`w-full h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center gap-1.5 px-3 rounded-xl text-[13px] font-semibold shadow-xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--teal)] active:scale-[0.99] ${
						isSelected
							? "primary-button dente-btn dente-btn-primary bg-[var(--teal,var(--brand-primary))] hover:brightness-105 text-white font-bold"
							: "secondary-button dente-btn dente-btn-secondary bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))]"
					}`}
					data-testid={`approve-tier-btn-${tier.tierId}`}
				>
					<PenTool size={14} />
					<span>{isSelected ? "Утвердить план" : "Выбрать этот вариант"}</span>
				</button>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={(e) => onInstallmentClick(e, tier)}
					className="secondary-button dente-btn dente-btn-secondary flex-1 h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center gap-1.5 px-3 rounded-xl text-[13px] font-medium bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap min-w-0"
					title="Оформить рассрочку 0% по данному варианту"
				>
					<CreditCard size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span className="truncate">Рассрочка 0%</span>
				</button>

				<button
					type="button"
					onClick={(e) => onCopyMessengerClick(e, tier)}
					className="secondary-button dente-btn dente-btn-secondary h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-2.5 rounded-xl text-[13px] font-medium bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap"
					title="Скопировать смету для WhatsApp / Telegram (понятный пациенту формат)"
					aria-label="Скопировать смету"
					data-testid={`copy-estimate-messenger-btn-${tier.tierId}`}
				>
					{copiedMessengerTierId === tier.tierId ? (
						<>
							<Check size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span className="text-[12.5px] text-[var(--teal,var(--brand-primary))] font-semibold">Скопировано</span>
						</>
					) : (
						<>
							<Share2 size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span className="hidden sm:inline text-[13px]">Смета</span>
						</>
					)}
				</button>

				{onPrintClick && (
					<button
						type="button"
						onClick={(e) => onPrintClick(e, tier)}
						className="secondary-button dente-btn dente-btn-secondary h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-xl text-[13px] font-medium bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap"
						title="Распечатать договор и смету"
						aria-label="Договор и смета (QR)"
					>
						<Printer size={13} className="shrink-0" />
						<span className="hidden sm:inline text-[13px]">Договор</span>
					</button>
				)}
			</div>
		</div>
	);
};
