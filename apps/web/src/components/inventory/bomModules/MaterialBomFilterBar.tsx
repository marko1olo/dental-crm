import { Search, X } from "lucide-react";
import React from "react";

export interface MaterialBomFilterBarProps {
	readonly searchQuery: string;
	readonly selectedCategory: string;
	readonly onSearchChange: (query: string) => void;
	readonly onCategoryChange: (category: string) => void;
}

const CATEGORY_TABS = [
	{ id: "all", label: "Все услуги" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "hygiene", label: "Гигиена" },
	{ id: "orthodontics", label: "Ортодонтия" },
] as const;

export function MaterialBomFilterBar({
	searchQuery,
	selectedCategory,
	onSearchChange,
	onCategoryChange,
}: MaterialBomFilterBarProps) {
	return (
		<div className="material-boms-filter-bar">
			<div className="material-boms-search-wrap">
				<Search size={18} color="var(--muted)" />
				<input
					type="text"
					className="material-boms-search-input"
					placeholder="Поиск по коду услуги (напр. A16.07.002), названию услуги или материалу..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				{searchQuery && (
					<button
						type="button"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
						}}
						onClick={() => onSearchChange("")}
					>
						<X size={16} />
					</button>
				)}
			</div>

			<div className="material-boms-category-tabs">
				{CATEGORY_TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						className={`material-boms-cat-btn ${selectedCategory === tab.id ? "active" : ""}`}
						onClick={() => onCategoryChange(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>
		</div>
	);
}
