import React from "react";
import { Package, CheckCircle2 } from "lucide-react";
import type { ImplantWarehouseStockItem } from "./implantQuickPresets";

export interface ImplantWarehouseSelectorProps {
	readonly stockItems: readonly ImplantWarehouseStockItem[];
	readonly selectedStockItemId?: string | undefined;
	readonly lotNumber: string;
	readonly catalogArticle: string;
	readonly onSelectStockItem?: ((item: ImplantWarehouseStockItem) => void) | undefined;
	readonly isOverdraftActive?: boolean | undefined;
}


/**
 * Секция выбора физического изделия из складского учета клиники.
 * Обеспечивает прямую привязку LOT, SKU и срока годности без ручного ввода.
 */
export const ImplantWarehouseSelector: React.FC<ImplantWarehouseSelectorProps> = ({
	stockItems,
	selectedStockItemId,
	lotNumber,
	catalogArticle,
	onSelectStockItem,
}) => {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
					<Package size={15} className="text-[var(--teal,#0d9488)]" />
					<span>Партия со склада клиники (реальные LOT и сроки годности):</span>
				</div>
				<span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">
					{stockItems.length} позиций оприходовано
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Складские запасы имплантатов">
				{stockItems.map((item) => {
					const isSelected =
						selectedStockItemId === item.id ||
						(lotNumber === item.lotNumber && catalogArticle === item.sku);
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onSelectStockItem?.(item)}
							className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
								isSelected
									? "bg-[var(--teal-surface,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--ink)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong,#94a3b8)]"
							}`}
							data-testid={`stock-item-${item.id}`}
						>
							<div className="flex items-center justify-between gap-1">
								<strong className="text-xs truncate font-extrabold">{item.name}</strong>
								{isSelected && <CheckCircle2 size={15} className="text-[var(--teal,#0d9488)] shrink-0" />}
							</div>
							<div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted)] mt-1">
								<span>{`LOT: ${item.lotNumber ?? "—"}`}</span>
								<span>{`Годен: ${item.expirationDate ?? "—"}`}</span>
								<span className="font-bold text-[var(--teal,#0d9488)]">
									{`${Number(item.currentQty).toFixed(0)} шт.`}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
