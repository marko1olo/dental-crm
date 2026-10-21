import type React from "react";
import type { InventoryCategoryFilter } from "./useWarehouseAuditState.js";

export interface WarehouseAuditCategoryBarProps {
	readonly categoryFilter: InventoryCategoryFilter;
	readonly onSelectCategory: (cat: InventoryCategoryFilter) => void;
	readonly categoryCounts: {
		all: number;
		anesthetics: number;
		filling: number;
		sterilization: number;
		disposables: number;
	};
}

export const WarehouseAuditCategoryBar: React.FC<WarehouseAuditCategoryBarProps> = ({
	categoryFilter,
	onSelectCategory,
	categoryCounts,
}) => {
	return (
		<div className="warehouse-inventory-category-bar">
			<span className="warehouse-inventory-category-label">Категории ТМЦ:</span>
			<div className="warehouse-category-pills" role="radiogroup" aria-label="Фильтр по категориям ТМЦ">
				<button
					type="button"
					className={`warehouse-category-pill ${categoryFilter === "all" ? "active" : ""}`}
					onClick={() => onSelectCategory("all")}
					data-testid="filter-category-all"
				>
					<span>Все категории</span>
					<span className="warehouse-category-badge">{categoryCounts.all}</span>
				</button>
				<button
					type="button"
					className={`warehouse-category-pill ${categoryFilter === "anesthetics" ? "active" : ""}`}
					onClick={() => onSelectCategory("anesthetics")}
					data-testid="filter-category-anesthetics"
				>
					<span>Анестетики</span>
					<span className="warehouse-category-badge">{categoryCounts.anesthetics}</span>
				</button>
				<button
					type="button"
					className={`warehouse-category-pill ${categoryFilter === "filling" ? "active" : ""}`}
					onClick={() => onSelectCategory("filling")}
					data-testid="filter-category-filling"
				>
					<span>Пломбировочные</span>
					<span className="warehouse-category-badge">{categoryCounts.filling}</span>
				</button>
				<button
					type="button"
					className={`warehouse-category-pill ${categoryFilter === "sterilization" ? "active" : ""}`}
					onClick={() => onSelectCategory("sterilization")}
					data-testid="filter-category-sterilization"
				>
					<span>Стерилизация</span>
					<span className="warehouse-category-badge">{categoryCounts.sterilization}</span>
				</button>
				<button
					type="button"
					className={`warehouse-category-pill ${categoryFilter === "disposables" ? "active" : ""}`}
					onClick={() => onSelectCategory("disposables")}
					data-testid="filter-category-disposables"
				>
					<span>Одноразовые</span>
					<span className="warehouse-category-badge">{categoryCounts.disposables}</span>
				</button>
			</div>
		</div>
	);
};

export default WarehouseAuditCategoryBar;
