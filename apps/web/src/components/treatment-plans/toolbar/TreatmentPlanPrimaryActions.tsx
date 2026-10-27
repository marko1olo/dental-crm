import React from "react";
import { Check, Send, ShieldCheck } from "lucide-react";

export interface TreatmentPlanPrimaryActionsProps {
	readonly signedAgreement?: unknown;
	readonly onOpenSignModal: () => void;
	readonly onExportCashier: () => void;
}

export const TreatmentPlanPrimaryActions: React.FC<TreatmentPlanPrimaryActionsProps> = ({
	signedAgreement,
	onOpenSignModal,
	onExportCashier,
}) => {
	return (
		<div className="flex items-center gap-1.5 shrink-0">
			{signedAgreement ? (
				<div
					className="flex items-center gap-1.5 px-3.5 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 text-xs font-semibold h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] touch-manipulation whitespace-nowrap shrink-0 shadow-2xs"
					data-testid="tp-signed-badge"
				>
					<ShieldCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Утверждён и подписан</span>
				</div>
			) : (
				<button
					type="button"
					onClick={onOpenSignModal}
					className="primary-button dente-btn dente-btn-primary h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] hover:brightness-105 text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0 whitespace-nowrap touch-manipulation"
					title="Утвердить и подписать смету плана лечения с пациентом"
					data-testid="tp-sign-btn"
				>
					<Check size={14} className="shrink-0" />
					<span>Утвердить план лечения</span>
				</button>
			)}

			<button
				type="button"
				onClick={onExportCashier}
				className="tp-btn-cashier secondary-button dente-btn dente-btn-secondary h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs cursor-pointer transition-colors touch-manipulation whitespace-nowrap shrink-0"
				title="Мгновенно создать счёт кассиру из плана"
				data-testid="tp-quick-cashier-btn"
			>
				<Send size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
				<span>В кассу</span>
			</button>
		</div>
	);
};

export default TreatmentPlanPrimaryActions;
