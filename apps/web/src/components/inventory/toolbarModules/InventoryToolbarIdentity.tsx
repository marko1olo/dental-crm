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
	const isItemsActive = activeSubTab === "inventory" && stockViewMode === "standard";
	const isFefoActive = activeSubTab === "inventory" && stockViewMode === "fefo";
	const isWaybillsActive = activeSubTab === "waybills";
	const isAuditActive = activeSubTab === "audit";
	const isRulesActive = activeSubTab === "rules";

	const getTabClass = (isActive: boolean) =>
		`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0 select-none border ${
			isActive
				? "bg-[var(--paper)] text-[var(--teal,#0d9488)] dark:text-[#2dd4bf] border-[var(--teal,#0d9488)]/30 dark:border-[var(--teal,#0d9488)]/50 shadow-xs font-bold"
				: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-hover,rgba(0,0,0,0.04))] dark:hover:bg-[rgba(255,255,255,0.06)] border-transparent"
		}`;

	return (
		<div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0">
			<div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[var(--ink)] shrink-0">
				<Package className="w-4 h-4 text-[var(--primary)] shrink-0" />
				<span>Склад</span>
			</div>

			<div className="dente-segmented-bar inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 select-none" role="tablist">
				<button
					type="button"
					onClick={() => { setActiveSubTab("inventory"); setStockViewMode("standard"); }}
					className={getTabClass(isItemsActive)}
					role="tab"
					aria-selected={isItemsActive}
					data-testid="tab-inventory-items"
				>
					<Package className="w-3.5 h-3.5 shrink-0" />
					<span>Остатки</span>
					<span className="text-[11px] opacity-75 font-mono">({itemsCount})</span>
				</button>

				<button
					type="button"
					onClick={() => { setActiveSubTab("inventory"); setStockViewMode("fefo"); }}
					className={getTabClass(isFefoActive)}
					role="tab"
					aria-selected={isFefoActive}
					data-testid="tab-inventory-fefo"
				>
					<Clock className="w-3.5 h-3.5 shrink-0" />
					<span>Сроки годности</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubTab("waybills")}
					className={getTabClass(isWaybillsActive)}
					role="tab"
					aria-selected={isWaybillsActive}
					data-testid="tab-inventory-waybills"
				>
					<Truck className="w-3.5 h-3.5 shrink-0" />
					<span>Приходные накладные</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubTab("audit")}
					className={getTabClass(isAuditActive)}
					role="tab"
					aria-selected={isAuditActive}
					data-testid="tab-inventory-audit"
				>
					<ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
					<span>Инвентаризация</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveSubTab("rules")}
					className={getTabClass(isRulesActive)}
					role="tab"
					aria-selected={isRulesActive}
					data-testid="tab-inventory-rules"
				>
					<FileText className="w-3.5 h-3.5 shrink-0" />
					<span>Списание по приёму</span>
					<span className="text-[11px] opacity-75 font-mono">({rulesCount})</span>
				</button>
			</div>
		</div>
	);
};

export default InventoryToolbarIdentity;
