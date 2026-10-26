import React from "react";
import { CreditCard } from "lucide-react";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface TenderCardPanelProps {
	readonly cardAmount: number;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
}

export const TenderCardPanel: React.FC<TenderCardPanelProps> = ({
	cardAmount,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
}) => {
	return (
		<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-blue-500/30 space-y-3" data-testid="panel-card-focused">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
						<CreditCard size={20} />
					</div>
					<div>
						<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">Безналичные / Терминал</span>
						<span className="text-xs text-[var(--muted,#64748b)]">POS-терминал готов к приему оплаты</span>
					</div>
				</div>
				<div className="text-center sm:text-right w-full sm:w-auto p-2 sm:p-0 rounded-xl bg-blue-500/5 sm:bg-transparent">
					<span className="text-xs text-[var(--muted,#64748b)] block font-semibold">К списанию:</span>
					<span className="text-2xl sm:text-lg font-black font-mono text-blue-700 dark:text-blue-300">
						{formatMoneyRu(cardAmount)}
					</span>
				</div>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] flex items-center justify-between flex-wrap gap-2 text-xs">
				<span className="text-[var(--muted,#64748b)]">
					Приложите банковскую карту или смартфон к терминалу эквайринга
				</span>
				<button
					type="button"
					onClick={handleManualCardTerminalConfirm}
					disabled={isSubmittingManualCard}
					className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1.5"
				>
					<CreditCard size={13} />
					<span>Подтвердить вручную (автономный POS)</span>
				</button>
			</div>

			<div className="sm:hidden pt-1">
				<button
					type="button"
					onClick={handleManualCardTerminalConfirm}
					disabled={isSubmittingManualCard}
					className="w-full min-h-[52px] h-[52px] rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
					data-testid="btn-mobile-pay-card-terminal"
				>
					<CreditCard size={18} />
					<span>Оплатить через Терминал ({formatMoneyRu(cardAmount)})</span>
				</button>
			</div>
		</div>
	);
};
