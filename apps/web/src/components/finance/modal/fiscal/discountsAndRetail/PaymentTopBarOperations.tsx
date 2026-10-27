import React from "react";
import { Coins, Copy, CreditCard, FileText, MoreHorizontal, Printer, Settings2 } from "lucide-react";

export interface PaymentTopBarOperationsProps {
	readonly isOverflowMenuOpen: boolean;
	readonly setIsOverflowMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handlePrintSalesSlip: () => Promise<void>;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly handleRetryFiscalizationWithoutBalanceImpact: () => Promise<void>;
	readonly isFiscalizing: boolean;
	readonly showSettings: boolean;
	readonly toggleSettings: () => void;
	readonly handleCopyActData: () => void;
	readonly handleCopyCertData: () => void;
}

export const PaymentTopBarOperations: React.FC<PaymentTopBarOperationsProps> = ({
	isOverflowMenuOpen,
	setIsOverflowMenuOpen,
	handlePrintSalesSlip,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleRetryFiscalizationWithoutBalanceImpact,
	isFiscalizing,
	showSettings,
	toggleSettings,
	handleCopyActData,
	handleCopyCertData,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap pb-1">
			<div className="text-xs text-[var(--muted,#64748b)] font-bold flex items-center gap-1.5">
				<Coins size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Кассовая операция</span>
			</div>

			<div className="relative">
				<button
					type="button"
					onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
					className="h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
					title="Дополнительные операции: товарный чек, ручное подтверждение, статья ДДС"
					data-testid="btn-payment-overflow-menu"
				>
					<MoreHorizontal size={15} />
					<span>Опции...</span>
				</button>

				{isOverflowMenuOpen && (
					<div className="absolute right-0 top-full mt-1.5 w-72 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] shadow-2xl p-2 z-40 space-y-1 text-xs">
						<div className="px-2.5 py-1 text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							Дополнительные операции
						</div>
						<button
							type="button"
							onClick={() => { setIsOverflowMenuOpen(false); void handlePrintSalesSlip(); }}
							className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
							data-testid="overflow-print-sales-slip"
						>
							<FileText size={14} className="text-teal-600 shrink-0" />
							<span>Товарный чек (без фискализации)</span>
						</button>
						<button
							type="button"
							onClick={() => { setIsOverflowMenuOpen(false); void handleManualCardTerminalConfirm(); }}
							disabled={isSubmittingManualCard}
							className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 cursor-pointer transition-colors"
							data-testid="overflow-manual-card-confirm"
						>
							<CreditCard size={14} className="text-blue-600 shrink-0" />
							<span>Подтвердить терминал вручную</span>
						</button>
						<button
							type="button"
							onClick={() => { setIsOverflowMenuOpen(false); void handleRetryFiscalizationWithoutBalanceImpact(); }}
							disabled={isFiscalizing}
							className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer transition-colors"
							data-testid="overflow-retry-fiscal"
						>
							<Printer size={14} className="text-emerald-600 shrink-0" />
							<span>Повторить чек без баланса</span>
						</button>
						<button
							type="button"
							onClick={() => { toggleSettings(); setIsOverflowMenuOpen(false); }}
							className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
						>
							<Settings2 size={14} className="text-amber-600 shrink-0" />
							<span>{showSettings ? "Скрыть кассу и ДДС" : "Настроить кассу и ДДС"}</span>
						</button>
						<button
							type="button"
							onClick={() => { setIsOverflowMenuOpen(false); handleCopyActData(); }}
							className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
						>
							<Copy size={14} className="text-slate-500 shrink-0" />
							<span>Копировать текст акта</span>
						</button>
						<button
							type="button"
							onClick={() => { setIsOverflowMenuOpen(false); handleCopyCertData(); }}
							className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
						>
							<Copy size={14} className="text-indigo-500 shrink-0" />
							<span>Копировать данные справки ФНС</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
