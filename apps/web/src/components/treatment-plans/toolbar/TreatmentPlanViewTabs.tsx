import React from "react";

export interface TreatmentPlanViewTabsProps {
	readonly activeViewTab: "3tier" | "stages" | "phased4" | "roadmap";
	readonly setActiveViewTab: (tab: "3tier" | "stages" | "phased4" | "roadmap") => void;
}

export const TreatmentPlanViewTabs: React.FC<TreatmentPlanViewTabsProps> = ({
	activeViewTab,
	setActiveViewTab,
}) => {
	return (
		<div className="tp-segmented-bar shrink-0" role="tablist" aria-label="Представление плана лечения">
			<button
				type="button"
				onClick={() => setActiveViewTab("3tier")}
				data-testid="tp-tab-3tier"
				className={`tp-tab-btn ${activeViewTab === "3tier" ? "active" : ""}`}
				title="3 Варианта комплексного лечения (Эконом, Оптимум, Премиум)"
			>
				<span>3 Варианта</span>
			</button>
			<button
				type="button"
				onClick={() => setActiveViewTab("stages")}
				data-testid="tp-tab-stages"
				className={`tp-tab-btn ${activeViewTab === "stages" ? "active" : ""}`}
				title="Поэтапный (I, II, III)"
			>
				<span className="hidden sm:inline">Поэтапный (I, II, III)</span>
				<span className="sm:hidden">Этапы</span>
			</button>
			<button
				type="button"
				onClick={() => setActiveViewTab("phased4")}
				data-testid="tp-tab-phased4"
				className={`tp-tab-btn ${activeViewTab === "phased4" ? "active" : ""}`}
				title="4 клинические фазы лечения"
			>
				<span>4 Фазы</span>
			</button>
			<button
				type="button"
				onClick={() => setActiveViewTab("roadmap")}
				data-testid="tp-tab-roadmap"
				className={`tp-tab-btn ${activeViewTab === "roadmap" ? "active" : ""}`}
				title="Дорожная карта и таймлайн визитов"
			>
				<span>Дорожная карта</span>
			</button>
		</div>
	);
};

export default TreatmentPlanViewTabs;
