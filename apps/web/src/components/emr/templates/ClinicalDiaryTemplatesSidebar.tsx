import React from "react";
import { Search, X } from "lucide-react";
import {
	type Clinical1ClickTemplate,
	type ClinicalProtocolCategory,
	CLINICAL_CATEGORY_LABELS,
} from "./clinicalDiaryTemplatesEngine";

export interface ClinicalDiaryTemplatesSidebarProps {
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedCategory: ClinicalProtocolCategory | "all";
	readonly onSelectCategory: (category: ClinicalProtocolCategory | "all") => void;
	readonly allCatalogWithNorm: readonly Clinical1ClickTemplate[];
	readonly filteredTemplates: readonly Clinical1ClickTemplate[];
	readonly selectedTemplateId: string;
	readonly onSelectTemplate: (templateId: string) => void;
	readonly renderTemplateIcon: (iconName: string, className?: string) => React.ReactNode;
}

export const ClinicalDiaryTemplatesSidebar: React.FC<ClinicalDiaryTemplatesSidebarProps> = React.memo(
	function ClinicalDiaryTemplatesSidebar({
		searchQuery,
		onSearchQueryChange,
		selectedCategory,
		onSelectCategory,
		allCatalogWithNorm,
		filteredTemplates,
		selectedTemplateId,
		onSelectTemplate,
		renderTemplateIcon,
	}) {
		return (
			<aside className="cd-templates-sidebar">
				<div className="cd-sidebar-controls">
					{/* Поисковая строка */}
					<div className="cd-search-wrap">
						<Search className="cd-search-icon" aria-hidden="true" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearchQueryChange(e.target.value)}
							placeholder="Поиск протокола, МКБ-10, услуги..."
							className="cd-search-input"
							data-testid="cd-template-search-input"
							aria-label="Поиск клинического протокола"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => onSearchQueryChange("")}
								className="cd-search-clear"
								aria-label="Очистить поиск"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					{/* Чипы категорий (горизонтальный скролл) */}
					<div className="cd-category-scroll dente-filter-chips">
						<button
							type="button"
							onClick={() => onSelectCategory("all")}
							className={`cd-category-chip dente-filter-chip shrink-0 flex-shrink-0 whitespace-nowrap ${selectedCategory === "all" ? "active" : ""}`}
							data-active={selectedCategory === "all"}
						>
							Все ({allCatalogWithNorm.length})
						</button>
						{(Object.keys(CLINICAL_CATEGORY_LABELS) as ClinicalProtocolCategory[]).map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => onSelectCategory(cat)}
								className={`cd-category-chip dente-filter-chip shrink-0 flex-shrink-0 whitespace-nowrap ${selectedCategory === cat ? "active" : ""}`}
								data-active={selectedCategory === cat}
							>
								{CLINICAL_CATEGORY_LABELS[cat].split(" ")[0]}
							</button>
						))}
					</div>
				</div>

				{/* Список карточек протоколов */}
				<div className="cd-template-list" data-testid="cd-templates-catalog-list">
					{filteredTemplates.map((tmpl) => {
						const isSelected = selectedTemplateId === tmpl.id;
						return (
							<button
								key={tmpl.id}
								type="button"
								onClick={() => onSelectTemplate(tmpl.id)}
								className={`cd-template-item-card ${isSelected ? "active" : ""}`}
								data-testid={`catalog-item-${tmpl.id}`}
							>
								<div className="cd-card-top-row">
									<span className="cd-card-title flex items-center gap-1.5 min-w-0 flex-1">
										{renderTemplateIcon(tmpl.icon, "w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0")}
										<span className="truncate">{tmpl.title}</span>
									</span>
									<span className="cd-card-icd-tag shrink-0">{tmpl.icd10Code}</span>
								</div>
								<div className="cd-card-category-tag truncate">
									{CLINICAL_CATEGORY_LABELS[tmpl.category]} · {tmpl.order804nServices.length} услуг
								</div>
							</button>
						);
					})}
					{filteredTemplates.length === 0 && (
						<div className="p-4 text-center text-xs text-[var(--muted,#64748b)]">
							Протоколы по запросу «{searchQuery}» не найдены.
						</div>
					)}
				</div>
			</aside>
		);
	},
);
