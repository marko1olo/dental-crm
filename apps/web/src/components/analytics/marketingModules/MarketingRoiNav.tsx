import React from "react";
import { BarChart3, Layers, Tag } from "lucide-react";
import type { MarketingTabType } from "./marketingTypes";

export interface MarketingRoiNavProps {
	readonly activeTab: MarketingTabType;
	readonly onSelectTab: (t: MarketingTabType) => void;
	readonly channelsCount: number;
	readonly attributionsCount: number;
}

export const MarketingRoiNav: React.FC<MarketingRoiNavProps> = ({
	activeTab,
	onSelectTab,
	channelsCount,
	attributionsCount,
}) => {
	return (
		<nav className="marketing-roi-nav" aria-label="Вкладки аналитики">
			<button
				type="button"
				onClick={() => onSelectTab("funnel")}
				className={`marketing-roi-tab ${activeTab === "funnel" ? "active" : ""}`}
				data-testid="tab-funnel"
			>
				<Layers className="w-4 h-4" />
				<span>Сквозная воронка (5 этапов)</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectTab("channels")}
				className={`marketing-roi-tab ${activeTab === "channels" ? "active" : ""}`}
				data-testid="tab-channels"
			>
				<BarChart3 className="w-4 h-4" />
				<span>Рекламные каналы ({channelsCount})</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectTab("attributions")}
				className={`marketing-roi-tab ${activeTab === "attributions" ? "active" : ""}`}
				data-testid="tab-attributions"
			>
				<Tag className="w-4 h-4" />
				<span>Сквозная атрибуция пациентов ({attributionsCount})</span>
			</button>
		</nav>
	);
};
