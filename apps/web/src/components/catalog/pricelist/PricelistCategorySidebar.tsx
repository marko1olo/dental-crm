import { ShieldCheck } from "lucide-react";
import type React from "react";
import {
	CATEGORY_LABELS,
	type ServiceCategory,
} from "./servicePricelistPresets";

export interface PricelistCategorySidebarProps {
	readonly selectedCategory: ServiceCategory | "all";
	readonly onSelectCategory: (category: ServiceCategory | "all") => void;
	readonly categoryCounts: Record<string, number>;
}

export const PricelistCategorySidebar: React.FC<
	PricelistCategorySidebarProps
> = ({ selectedCategory, onSelectCategory, categoryCounts }) => {
	return (
		<nav
			className="pricelist-category-sidebar"
			aria-label="Разделы каталога услуг"
		>
			<div className="pricelist-sidebar-section-title">
				Разделы каталога
			</div>

			<div className="pricelist-sidebar-categories-list">
				<button
					type="button"
					className={`category-nav-btn ${selectedCategory === "all" ? "active" : ""}`}
					onClick={() => onSelectCategory("all")}
				>
					<span>Все разделы</span>
					<span className="category-nav-count">{categoryCounts.all || 0}</span>
				</button>

				{(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map((catKey) => {
					const count = categoryCounts[catKey] || 0;
					if (count === 0 && selectedCategory !== catKey) return null;
					return (
						<button
							key={catKey}
							type="button"
							className={`category-nav-btn ${selectedCategory === catKey ? "active" : ""}`}
							onClick={() => onSelectCategory(catKey)}
						>
							<span>{CATEGORY_LABELS[catKey]}</span>
							<span className="category-nav-count">{count}</span>
						</button>
					);
				})}
			</div>

			<div className="pricelist-sidebar-footer-card">
				<div className="pricelist-sidebar-card-title">
					<ShieldCheck size={14} className="pricelist-sidebar-card-icon" />
					<span>Номенклатура услуг</span>
				</div>
				<div className="pricelist-sidebar-card-text">
					Прейскурант сформирован в соответствии со стандартами Минздрава РФ
				</div>
				<div className="pricelist-sidebar-card-badge">
					НДС 0% · ст. 149 НК РФ
				</div>
			</div>
		</nav>
	);
};
