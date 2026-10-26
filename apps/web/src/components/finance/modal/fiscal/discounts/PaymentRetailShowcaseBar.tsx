import React from "react";
import { ShoppingBag, X } from "lucide-react";
import {
	RECEPTION_RETAIL_CATALOG,
	type RetailProductItem,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface PaymentRetailShowcaseBarProps {
	readonly setIsRetailModalOpen: (v: boolean) => void;
	readonly handleAddRetailProduct: (product: RetailProductItem, qty: number) => void;
	readonly additionalRetailItems: readonly TreatmentPlanItem[];
	readonly handleRemoveRetailItem: (id: string) => void;
}

export const PaymentRetailShowcaseBar: React.FC<PaymentRetailShowcaseBarProps> = ({
	setIsRetailModalOpen,
	handleAddRetailProduct,
	additionalRetailItems,
	handleRemoveRetailItem,
}) => {
	const handleQuickAdd = (productId: string) => {
		const item = RECEPTION_RETAIL_CATALOG.find((p) => p.id === productId);
		if (item) handleAddRetailProduct(item, 1);
	};

	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2.5" data-testid="reception-retail-showcase-bar">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
					<ShoppingBag size={14} className="text-teal-600 dark:text-teal-400" />
					<span>Сопутствующие товары (зубные пасты, щетки):</span>
				</div>
				<button
					type="button"
					onClick={() => setIsRetailModalOpen(true)}
					className="h-7 px-3 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs"
					data-testid="btn-open-retail-showcase"
				>
					<ShoppingBag size={13} />
					<span>+ Добавить товар / сертификат</span>
				</button>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold mr-0.5">Быстро:</span>
				<button
					type="button"
					onClick={() => handleQuickAdd("curaprox-cs-5460")}
					className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 cursor-pointer transition-all"
					data-testid="btn-quick-add-curaprox"
				>
					+ Curaprox 5460 (1200 ₽)
				</button>
				<button
					type="button"
					onClick={() => handleQuickAdd("marvis-mint-85")}
					className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 cursor-pointer transition-all"
					data-testid="btn-quick-add-marvis"
				>
					+ Marvis Mint (1150 ₽)
				</button>
				<button
					type="button"
					onClick={() => handleQuickAdd("biorepair-total-75")}
					className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 cursor-pointer transition-all"
					data-testid="btn-quick-add-biorepair"
				>
					+ Biorepair (950 ₽)
				</button>
				<button
					type="button"
					onClick={() => handleQuickAdd("gift-cert-5000")}
					className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer transition-all"
					data-testid="btn-quick-add-cert-5000"
				>
					+ Сертификат 5000 ₽
				</button>
			</div>

			{additionalRetailItems.length > 0 && (
				<div className="pt-2 border-t border-[var(--border,#cbd5e1)] space-y-1">
					<div className="text-[11px] font-semibold text-[var(--muted,#64748b)]">
						Добавлено в текущий чек с витрины ({additionalRetailItems.length}):
					</div>
					<div className="space-y-1">
						{additionalRetailItems.map((rItem) => (
							<div
								key={rItem.id}
								className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)]"
							>
								<span className="truncate pr-2 font-medium">
									{rItem.name} ({rItem.quantity} шт. × {rItem.unitPriceRub} ₽)
								</span>
								<div className="flex items-center gap-2 shrink-0">
									<span className="font-bold font-mono">{formatMoneyRu(rItem.priceRub)}</span>
									<button
										type="button"
										onClick={() => handleRemoveRetailItem(rItem.id)}
										className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5"
										data-testid={`btn-remove-retail-${rItem.id}`}
									>
										<X size={14} />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
