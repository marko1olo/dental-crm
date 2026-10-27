import React from "react";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface ReceiptPrintItemsProps {
	readonly items: FiscalReceipt54FzResult["items"];
}

export const ReceiptPrintItems: React.FC<ReceiptPrintItemsProps> = ({ items }) => {
	return (
		<div className="py-3 space-y-2.5 border-b border-dashed border-[var(--border,#cbd5e1)]">
			<div className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
				Предмет расчета (Услуги):
			</div>
			<div className="space-y-2.5">
				{items.map((it, idx) => (
					<div
						key={it.id || idx}
						className="space-y-1 pb-2 border-b border-dotted border-[var(--border,#cbd5e1)] last:border-0 last:pb-0"
					>
						<div className="flex items-start justify-between gap-2">
							<div
								className="font-bold text-xs text-[var(--ink,#0f172a)] leading-snug break-words min-w-0"
								title={it.name}
							>
								{idx + 1}. {it.name}
							</div>
							{it.isMarkedItem && (
								<span
									className="shrink-0 px-2 py-0.5 rounded-md bg-[var(--ink,#0f172a)] text-[var(--paper,#ffffff)] text-xs font-mono font-bold"
									title="Маркированный товар (Честный ЗНАК)"
								>
									[М]
								</span>
							)}
						</div>
						{it.stageCategoryTitle && (
							<div className="text-xs text-[var(--muted,#64748b)]">
								Этап: {it.stageCategoryTitle}
							</div>
						)}
						<div className="flex justify-between text-xs text-[var(--ink,#0f172a)]">
							<span className="text-[var(--muted,#64748b)]">
								{it.quantity} шт. × {it.unitPriceRub.toLocaleString("ru-RU")} ₽
								{it.discountRub > 0 ? ` (- скидка ${it.discountRub} ₽)` : ""}
							</span>
							<span className="font-bold">={it.amountRub.toLocaleString("ru-RU")} ₽</span>
						</div>
						<div className="flex justify-between text-xs text-[var(--muted,#64748b)]">
							<span>
								{it.isRetail || it.vatRate === "vat_20"
									? `НДС 20% = ${(((it.taxRateKopecks || 0) / 100)).toFixed(2)} ₽`
									: "НДС: БЕЗ НДС"}
							</span>
							<span
								className={
									it.isRetail
										? "text-[var(--muted,#64748b)]"
										: "font-semibold text-[var(--brand-primary,#0d9488)]"
								}
							>
								{it.isRetail ? "БЕЗ ВЫЧЕТА" : `ВЫЧЕТ: КОД 0${it.taxDeductionCategory}`}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
