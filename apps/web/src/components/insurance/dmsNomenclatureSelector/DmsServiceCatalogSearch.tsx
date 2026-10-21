/**
 * DmsServiceCatalogSearch.tsx — Панель категорий и строка поиска по каталогу услуг
 */

import { Search, X } from "lucide-react";
import React from "react";

const CATEGORIES = [
	{ key: "all", label: "Все категории" },
	{ key: "therapy", label: "Терапия" },
	{ key: "surgery", label: "Хирургия" },
	{ key: "diagnostics", label: "Диагностика" },
	{ key: "hygiene", label: "Профгигиена" },
	{ key: "xray", label: "Рентген" },
];

export interface DmsServiceCatalogSearchProps {
	readonly selectedCategoryTab: string;
	readonly onSelectCategoryTab: (tab: string) => void;
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly serviceSearchInputId: string;
}

export function DmsServiceCatalogSearch({
	selectedCategoryTab,
	onSelectCategoryTab,
	searchQuery,
	onSearchQueryChange,
	serviceSearchInputId,
}: DmsServiceCatalogSearchProps) {
	return (
		<>
			<div className="dente-segmented-bar mb-3 overflow-x-auto max-w-full" role="tablist" aria-label="Категории медицинских услуг">
				{CATEGORIES.map((cat) => {
					const isActive = selectedCategoryTab === cat.key;
					return (
						<button
							key={cat.key}
							type="button"
							className={`dente-segmented-item ${isActive ? "active" : ""}`}
							data-active={isActive}
							onClick={() => onSelectCategoryTab(cat.key)}
						>
							{cat.label}
						</button>
					);
				})}
			</div>
			<div className="dms-field-group" style={{ marginBottom: "12px" }}>
				<label htmlFor={serviceSearchInputId} className="dms-label">Поиск услуг для добавления в гарантийное письмо</label>
				<div className="dente-search-wrap flex-1">
					<Search size={14} className="dente-search-icon" />
					<input
						id={serviceSearchInputId}
						type="text"
						placeholder="Поиск по коду (A16.07...) или названию (пломба, эндодонтия, удаление)..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						className="dente-search-input"
					/>
					{searchQuery && (
						<button type="button" onClick={() => onSearchQueryChange("")} className="dente-search-clear" aria-label="Очистить поиск">
							<X size={13} />
						</button>
					)}
				</div>
			</div>
		</>
	);
}
