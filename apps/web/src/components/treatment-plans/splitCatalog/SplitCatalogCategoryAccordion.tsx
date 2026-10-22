import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import type { SplitCatalogCategoryGroup } from "./splitCatalogTypes";
import { SplitCatalogServiceRow } from "./SplitCatalogServiceRow";

export interface SplitCatalogCategoryAccordionProps {
	readonly groups: readonly SplitCatalogCategoryGroup[];
	readonly onAddService: (service: CatalogServiceLookupItem) => void;
	readonly stageItemCountsMap?: Record<string, number> | undefined;
}

export const SplitCatalogCategoryAccordion: React.FC<SplitCatalogCategoryAccordionProps> = ({
	groups,
	onAddService,
	stageItemCountsMap = {},
}) => {
	const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
		const initial: Record<string, boolean> = {};
		groups.forEach((g, idx) => {
			initial[g.categoryName] = idx < 3;
		});
		return initial;
	});

	const toggleCategory = (catName: string) => {
		setExpandedCategories((prev) => ({
			...prev,
			[catName]: !prev[catName],
		}));
	};

	if (groups.length === 0) {
		return (
			<div className="split-catalog-empty" data-testid="split-catalog-empty">
				Услуги не найдены. Измените параметры поиска или сбросьте фильтр.
			</div>
		);
	}

	return (
		<div className="split-catalog-accordion" data-testid="split-catalog-accordion">
			{groups.map((group) => {
				const isExpanded = expandedCategories[group.categoryName] !== false;
				return (
					<div key={group.categoryName} className="split-category-group">
						<button
							type="button"
							onClick={() => toggleCategory(group.categoryName)}
							className="split-category-header"
							data-testid={`category-header-${group.categoryName}`}
							aria-expanded={isExpanded}
						>
							<div className="split-category-title-wrap">
								{isExpanded ? <ChevronDown size={14} className="split-category-arrow" /> : <ChevronRight size={14} className="split-category-arrow" />}
								<span className="split-category-title">{group.categoryName}</span>
							</div>
							<span className="split-category-count">{group.services.length}</span>
						</button>

						{isExpanded && (
							<div className="split-category-services">
								{group.services.map((service) => {
									const itemCode = service.order804nCode || service.code || service.id;
									const inStageCount = stageItemCountsMap[itemCode] || 0;
									return (
										<SplitCatalogServiceRow
											key={service.id}
											service={service}
											inStageCount={inStageCount}
											onAddService={onAddService}
										/>
									);
								})}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
