import React from "react";

export const RUBRIC_FILTER_TABS = [
	{ id: "ALL", label: "Все диагнозы" },
	{ id: "K02", label: "Кариес (K02)" },
	{ id: "K04", label: "Пульпит / Периодонтит (K04)" },
	{ id: "K05", label: "Пародонт (K05)" },
	{ id: "K08", label: "Адентия / Корни (K08)" },
	{ id: "K07", label: "Прикус / ВНЧС (K07)" },
	{ id: "K03", label: "Некариозные (K03)" },
	{ id: "K01", label: "Ретенция / Дистопия (K01)" },
	{ id: "K10", label: "Челюсти (K10)" },
	{ id: "K12", label: "Стоматиты (K12)" },
] as const;

interface Icd10RubricTabsProps {
	activeRubricTab: string;
	onSelectTab: (tabId: string) => void;
}

export const Icd10RubricTabs: React.FC<Icd10RubricTabsProps> = ({
	activeRubricTab,
	onSelectTab,
}) => {
	return (
		<div className="icd10-rubric-tabs dente-filter-chips" role="tablist" aria-label="Рубрики МКБ-10">
			{RUBRIC_FILTER_TABS.map((tab) => {
				const isActive = activeRubricTab === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						data-active={isActive}
						className={`icd10-rubric-tab dente-filter-chip ${isActive ? "is-active active" : ""}`}
						onClick={() => onSelectTab(tab.id)}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
};
