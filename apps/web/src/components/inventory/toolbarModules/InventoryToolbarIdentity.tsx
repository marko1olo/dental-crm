import { ClipboardCheck, Clock, FileText, Package, Truck } from "lucide-react";
import React from "react";
import type { InventorySubTab } from "../useInventoryRules.js";

export interface InventoryToolbarIdentityProps {
	readonly activeSubTab: InventorySubTab;
	readonly setActiveSubTab: (tab: InventorySubTab) => void;
	readonly stockViewMode: "standard" | "fefo";
	readonly setStockViewMode: (mode: "standard" | "fefo") => void;
	readonly itemsCount: number;
	readonly rulesCount: number;
}

export const InventoryToolbarIdentity: React.FC<InventoryToolbarIdentityProps> = ({
	activeSubTab, setActiveSubTab, stockViewMode, setStockViewMode, itemsCount, rulesCount,
}) => {
	return (
		<div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0">
			<div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[var(--ink)] shrink-0">
				<Package className="w-4 h-4 text-[var(--primary)] shrink-0" />
				<span>Склад</span>
			</div>

			<div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 select-none" role="tablist">
				<button
					type="button"
					onClick={() => { setActiveSubTab("inventory"); setStockViewMode("standard"); }}
					className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
						activeSubTab === "inventory" && stockViewMode === "standard"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
					}`}
					role="tab"
					aria-selected={activeSubTab === "inventory" && stockViewMode === "standard"}
					data-testid="tab-inventory-items"
				>
					<Package className="w-3.5 h-3.5 shrink-0" />
					<span>Остатки</span>
					<span className="text-[11px] opacity-70 font-mono">({itemsCount})</span>
				</button>

				<button
					type="button"
					onClick={() => { setActiveSubTab("inventory"); setStockViewMode("fefo"); }}
					className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
						activeSubTab === "inventory" && stockViewMode === "fefo"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
					}`}
					role="tab"
					aria-selected={activeSubTab === "inventory" && stockViewMode === "fefo"}
					data-testid="tab-inventory-fefo"
				>
					<Clock className="w-3.5 h-3.5 shrink-0" />
					<span>Сроки годности</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubTab("waybills")}
					className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
						activeSubTab === "waybills"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
					}`}
					role="tab"
					aria-selected={activeSubTab === "waybills"}
					data-testid="tab-inventory-waybills"
				>
					<Truck className="w-3.5 h-3.5 shrink-0" />
					<span>Приходные накладные</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubTab("audit")}
					className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
						activeSubTab === "audit"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
					}`}
					role="tab"
					aria-selected={activeSubTab === "audit"}
					data-testid="tab-inventory-audit"
				>
					<ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
					<span>Инвентаризация</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubTab("rules")}
					className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
						activeSubTab === "rules"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
							: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
					}`}
					role="tab"
					aria-selected={activeSubTab === "rules"}
					data-testid="tab-inventory-rules"
				>
					<FileText className="w-3.5 h-3.5 shrink-0" />
					<span>Списание по приёму</span>
					<span className="text-[11px] opacity-70 font-mono">({rulesCount})</span>
				</button>
			</div>
		</div>
	);
};

export default InventoryToolbarIdentity;
