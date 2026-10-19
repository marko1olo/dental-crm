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
					className="flex items-center gap-1 px-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold min-h-[44px] h-[44px] sm:min-h-[32px] sm:h-8 touch-manipulation whitespace-nowrap shrink-0"
					data-testid="tp-signed-badge"
				>
					<ShieldCheck size={13} />
					<span>ПОДПИСАНО</span>
				</div>
			) : (
				<button
					type="button"
					onClick={onOpenSignModal}
					className="primary-button min-h-[44px] h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs active:scale-98 shrink-0 whitespace-nowrap touch-manipulation"
					title="Согласовать и подписать смету с пациентом"
					data-testid="tp-sign-btn"
				>
					<PenTool size={13} />
					<span>Согласовать и подписать</span>
				</button>
			)}

			<button
				type="button"
				onClick={onExportCashier}
				className="tp-btn-cashier secondary-button min-h-[44px] h-[44px] sm:min-h-[32px] sm:h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors touch-manipulation whitespace-nowrap shrink-0"
				title="Мгновенно отправить счет кассиру"
				data-testid="tp-quick-cashier-btn"
			>
				<Send size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>В кассу</span>
			</button>
		</div>
	);
};

export default TreatmentPlanPrimaryActions;
