import React, { useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import type { SplitCatalogCategoryGroup, SplitCatalogPanelProps } from "./splitCatalogTypes";
import { SplitCatalogToothQuickBar } from "./SplitCatalogToothQuickBar";
import { SplitCatalogCategoryAccordion } from "./SplitCatalogCategoryAccordion";

export const SplitCatalogPanel: React.FC<SplitCatalogPanelProps> = ({
	catalog,
	activeStageNumber,
	activeStageTitle,
	selectedTooth,
	onSelectTooth,
	onAddServiceToStage,
	onApplyBundle,
	stageItemCountsMap,
	className = "",
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");

	const effectiveCatalog = useMemo<CatalogServiceLookupItem[]>(() => {
		if (Array.isArray(catalog) && catalog.length > 0) return catalog;
		return Object.values(DENTAL_SERVICES_CATALOG).map((p) => ({
			id: p.code, title: p.title, category: p.category, basePriceRub: p.defaultPriceRub,
			code: p.code, order804nCode: p.code, active: true,
		}));
	}, [catalog]);

	const availableCategories = useMemo(() => Array.from(new Set(effectiveCatalog.map((it) => it.category).filter(Boolean) as string[])).sort(), [effectiveCatalog]);

	const filteredGroups = useMemo<SplitCatalogCategoryGroup[]>(() => {
		const q = searchQuery.trim().toLowerCase();
		const items = effectiveCatalog.filter((item) => {
			if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
			if (!q) return true;
			return (item.title || "").toLowerCase().includes(q) || (item.code || item.order804nCode || "").toLowerCase().includes(q);
		});
		const map: Record<string, CatalogServiceLookupItem[]> = {};
		items.forEach((it) => {
			const cat = it.category || "Общие услуги";
			if (!map[cat]) map[cat] = [];
			map[cat].push(it);
		});
		return Object.keys(map).sort().map((cat) => ({ categoryName: cat, services: map[cat]! }));
	}, [effectiveCatalog, searchQuery, categoryFilter]);

	return (
		<div className={`split-catalog-panel ${className}`.trim()} data-testid="split-catalog-panel">
			<div className="split-catalog-header">
				<div className="split-catalog-title-row">
					<div className="split-catalog-title">Каталог услуг клиники</div>
					<span className="split-catalog-target-stage-badge" title="Целевой этап для добавления">
						В Этап {activeStageNumber}: {activeStageTitle}
					</span>
				</div>
				<div className="split-catalog-search-wrap">
					<Search size={14} className="split-catalog-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск услуги или кода A16.07..."
						className="split-catalog-search-input"
						data-testid="split-catalog-search-input"
					/>
					{searchQuery && (
						<button type="button" onClick={() => setSearchQuery("")} className="split-catalog-search-clear" aria-label="Очистить поиск">
							<X size={13} />
						</button>
					)}
				</div>
				{availableCategories.length > 0 && (
					<div className="split-catalog-category-chips">
						<button type="button" onClick={() => setCategoryFilter("all")} className={`split-cat-chip ${categoryFilter === "all" ? "active" : ""}`}>
							Все ({effectiveCatalog.length})
						</button>
						{availableCategories.map((cat) => (
							<button key={cat} type="button" onClick={() => setCategoryFilter(cat)} className={`split-cat-chip ${categoryFilter === cat ? "active" : ""}`}>
								{cat}
							</button>
						))}
					</div>
				)}
			</div>

			<SplitCatalogToothQuickBar selectedTooth={selectedTooth} onSelectTooth={onSelectTooth} />

			{onApplyBundle && (
				<div className="split-catalog-bundles-bar">
					<span className="split-bundle-label">Быстрые пакеты:</span>
					<button type="button" onClick={() => onApplyBundle("hygiene_turnkey", selectedTooth ?? undefined)} className="split-bundle-btn" data-testid="bundle-quick-hygiene">
						<Sparkles size={11} /><span>Профгигиена</span>
					</button>
					<button type="button" onClick={() => onApplyBundle("caries_light", selectedTooth ?? undefined)} className="split-bundle-btn" data-testid="bundle-quick-caries">
						<Sparkles size={11} /><span>Кариес под ключ</span>
					</button>
				</div>
			)}

			<div className="split-catalog-scroll-body">
				<SplitCatalogCategoryAccordion
					groups={filteredGroups}
					onAddService={(srv) => onAddServiceToStage(srv, selectedTooth)}
					stageItemCountsMap={stageItemCountsMap}
				/>
			</div>
		</div>
	);
};
