import { CheckCircle2, PackageX, Search, X } from "lucide-react";
import type React from "react";
import type { InventoryAuditTotals } from "../warehouseInventoryEngine.js";

export interface WarehouseAuditToolbarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly filterTab: "all" | "discrepancies" | "expired" | "risk";
	readonly onFilterTabChange: (tab: "all" | "discrepancies" | "expired" | "risk") => void;
	readonly totalItemsCount: number;
	readonly totals: InventoryAuditTotals;
	readonly sortOrder: "default" | "fefo" | "discrepancy" | "name";
	readonly onSortOrderChange: (order: "default" | "fefo" | "discrepancy" | "name") => void;
	readonly onAutofillFactByBook: () => void;
	readonly onCreateTorg16: () => void;
}

export const WarehouseAuditToolbar: React.FC<WarehouseAuditToolbarProps> = ({
	searchQuery, onSearchChange, filterTab, onFilterTabChange, totalItemsCount,
	totals, sortOrder, onSortOrderChange, onAutofillFactByBook, onCreateTorg16,
}) => {
	return (
		<div className="warehouse-inventory-toolbar">
			<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
				<div className="dente-search-wrap" style={{ maxWidth: 320 }}>
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						className="dente-search-input"
						placeholder="Поиск по названию, артикулу, LOT..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => onSearchChange("")}
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>

				<div className="dente-segmented-bar" role="tablist">
					<button type="button" role="tab" aria-selected={filterTab === "all"} className={`dente-segmented-item ${filterTab === "all" ? "active" : ""}`} onClick={() => onFilterTabChange("all")}>
						Все ({totalItemsCount})
					</button>
					<button type="button" role="tab" aria-selected={filterTab === "discrepancies"} className={`dente-segmented-item ${filterTab === "discrepancies" ? "active" : ""}`} onClick={() => onFilterTabChange("discrepancies")}>
						Расхождения ({totals.surplusItemsCount + totals.shortageItemsCount})
					</button>
					<button type="button" role="tab" aria-selected={filterTab === "expired"} className={`dente-segmented-item ${filterTab === "expired" ? "active" : ""}`} onClick={() => onFilterTabChange("expired")}>
						Просрочено ({totals.expiredItemsCount})
					</button>
					<button type="button" role="tab" aria-selected={filterTab === "risk"} className={`dente-segmented-item ${filterTab === "risk" ? "active" : ""}`} onClick={() => onFilterTabChange("risk")}>
						Риск &lt;60д ({totals.warningItemsCount})
					</button>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
					<span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Сортировка:</span>
					<select
						value={sortOrder}
						onChange={(e) => onSortOrderChange(e.target.value as any)}
						style={{
							fontSize: "0.8125rem",
							padding: "4px 8px",
							borderRadius: 6,
							border: "1px solid var(--border)",
							background: "var(--paper-strong)",
							color: "var(--ink)",
						}}
					>
						<option value="default">По умолчанию</option>
						<option value="fefo">Сначала истекающие (FEFO)</option>
						<option value="discrepancy">По сумме расхождения</option>
						<option value="name">По наименованию</option>
					</select>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<button
					type="button"
					className="warehouse-btn warehouse-btn-secondary"
					onClick={onAutofillFactByBook}
					title="Приравнять фактическое количество к учетному (все совпадают с учётом)"
					data-testid="btn-match-all-book-quantities"
				>
					<CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
					<span>✓ Все совпадают с учётом</span>
				</button>

				{totals.expiredItemsCount > 0 && (
					<button
						type="button"
						className="warehouse-btn warehouse-btn-danger"
						onClick={onCreateTorg16}
						title="Сформировать акт списания просроченных материалов"
					>
						<PackageX size={14} />
						<span>Акт списания просрочки ({totals.expiredItemsCount})</span>
					</button>
				)}
			</div>
		</div>
	);
};

export default WarehouseAuditToolbar;
