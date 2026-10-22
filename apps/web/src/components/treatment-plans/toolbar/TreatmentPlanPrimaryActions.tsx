import React from "react";
import { PenTool, Send, ShieldCheck } from "lucide-react";

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
					className="flex items-center gap-1.5 px-3.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] touch-manipulation whitespace-nowrap shrink-0 shadow-2xs"
					data-testid="tp-signed-badge"
				>
					<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>УТВЕРЖДЁН И ПОДПИСАН</span>
				</div>
			) : (
				<button
					type="button"
					onClick={onOpenSignModal}
					className="primary-button h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold bg-[var(--primary,#0d9488)] text-white hover:bg-[var(--primary-dark,#0f766e)] shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0 whitespace-nowrap touch-manipulation"
					title="Утвердить и подписать смету плана лечения с пациентом"
					data-testid="tp-sign-btn"
				>
					<PenTool size={13} className="shrink-0" />
					<span>Утвердить план</span>
				</button>
			)}

			<button
				type="button"
				onClick={onExportCashier}
				className="tp-btn-cashier secondary-button h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs cursor-pointer transition-colors touch-manipulation whitespace-nowrap shrink-0"
				title="Мгновенно создать счёт кассиру из плана"
				data-testid="tp-quick-cashier-btn"
			>
				<Send size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>В кассу</span>
			</button>
		</div>
	);
};

export default TreatmentPlanPrimaryActions;
