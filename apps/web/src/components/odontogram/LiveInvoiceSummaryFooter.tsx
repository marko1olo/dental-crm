import { formatKopecksToRub } from "@dental/shared";
import { Printer, Receipt, ShieldCheck, Zap } from "lucide-react";
import type React from "react";

export interface LiveInvoiceSummaryFooterProps {
	readonly grossTotalPrice: number;
	readonly totalDiscountKopecks: number;
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
	totalDiscountKopecks,
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
				{totalDiscountKopecks > 0 && (
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] font-medium">
						<span>Сумма без скидки:</span>
						<span className="line-through font-mono">
							{grossTotalPrice.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				)}
				{totalDiscountKopecks > 0 && (
					<div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
						<span>Скидка ({discountPercent}%):</span>
						<span className="font-mono">
							−{formatKopecksToRub(totalDiscountKopecks)}
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
					className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer transition-all"
					title="Создать официальный счет на оплату в кассу"
				>
					<Receipt className="w-4 h-4 shrink-0" />
					<span>В кассу</span>
				</button>
				<button
					type="button"
					onClick={onOpenFiscalModal}
					className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-sm cursor-pointer transition-all"
					title="Принять оплату и выдать кассовый чек"
				>
					<ShieldCheck className="w-4 h-4 shrink-0" />
					<span>Кассовый чек</span>
				</button>
				<button
					type="button"
					onClick={onExportToPlan}
					className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer transition-all"
					title="Перенести услуги сметы в комплексный план лечения пациента"
				>
					<Zap className="w-4 h-4 shrink-0" />
					<span>В план</span>
				</button>
				<button
					type="button"
					onClick={onPrint}
					className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer transition-all"
					title="Распечатать смету или сохранить в PDF"
				>
					<Printer className="w-4 h-4 shrink-0" />
					<span>Печать</span>
				</button>
			</div>
		</div>
	);
};
