import { Printer, Receipt, ShieldCheck, Zap } from "lucide-react";
import type React from "react";

export interface LiveInvoiceSummaryFooterProps {
	readonly grossTotalPrice: number;
	readonly totalDiscountRub: number;
	readonly netTotalPrice: number;
	readonly discountPercent: number;
	readonly onCreateInvoice: () => void;
	readonly onOpenFiscalModal: () => void;
	readonly onExportToPlan: () => void;
	readonly onPrint: () => void;
}

export const LiveInvoiceSummaryFooter: React.FC<
	LiveInvoiceSummaryFooterProps
> = ({
	grossTotalPrice,
	totalDiscountRub,
	netTotalPrice,
	discountPercent,
	onCreateInvoice,
	onOpenFiscalModal,
	onExportToPlan,
	onPrint,
}) => {
	return (
		<div className="p-3.5 border-t border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
			<div className="space-y-1">
				{totalDiscountRub > 0 && (
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] font-medium">
						<span>Сумма без скидки:</span>
						<span className="line-through font-mono">
							{grossTotalPrice.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				)}
				{totalDiscountRub > 0 && (
					<div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
						<span>Скидка ({discountPercent}%):</span>
						<span className="font-mono">
							−{totalDiscountRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				)}
				<div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-[var(--border,#cbd5e1)]">
					<span className="text-[var(--ink,#0f172a)]">Итого к оплате:</span>
					<span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
						{netTotalPrice.toLocaleString("ru-RU")} ₽
					</span>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<button
					type="button"
					onClick={onCreateInvoice}
					className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
					title="Создать официальный счет на оплату в кассу"
				>
					<Receipt size={15} />
					<span>В кассу</span>
				</button>
				<button
					type="button"
					onClick={onOpenFiscalModal}
					className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-md shadow-teal-600/20 cursor-pointer transition-all active:scale-95"
					title="Принять оплату и выдать кассовый чек"
				>
					<ShieldCheck size={15} />
					<span>Кассовый чек</span>
				</button>
				<button
					type="button"
					onClick={onExportToPlan}
					className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-md shadow-teal-600/20 cursor-pointer transition-all active:scale-95"
					title="Перенести услуги сметы в комплексный план лечения пациента"
				>
					<Zap size={15} />
					<span>В план</span>
				</button>
				<button
					type="button"
					onClick={onPrint}
					className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-all active:scale-95"
					title="Распечатать смету или сохранить в PDF"
				>
					<Printer size={15} />
					<span>Печать</span>
				</button>
			</div>
		</div>
	);
};
