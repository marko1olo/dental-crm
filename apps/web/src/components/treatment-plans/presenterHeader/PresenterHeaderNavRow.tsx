import React from "react";
import { Calendar, Clock, Coins, FileText, Layers } from "lucide-react";
import type { PresenterTabId } from "./presenterTabTypes.js";

export interface PresenterHeaderNavRowProps {
	readonly activeTab: PresenterTabId;
	readonly onSelectTab: (tab: PresenterTabId) => void;
	readonly toolsBarSlot?: React.ReactNode | undefined;
}

export const PresenterHeaderNavRow: React.FC<PresenterHeaderNavRowProps> = ({
	activeTab,
	onSelectTab,
	toolsBarSlot,
}) => {
	return (
		<div className="treatment-presenter-nav-row flex items-center justify-between gap-3 px-3 sm:px-6 py-1.5 border-t border-[var(--tp-border)] bg-[var(--tp-surface)] overflow-x-auto scrollbar-none">
			<nav className="treatment-presenter-tabs" aria-label="Режимы просмотра">
				<button
					type="button"
					onClick={() => onSelectTab("comparison")}
					className={"treatment-presenter-tab-btn " + (activeTab === "comparison" ? "active" : "")}
					data-testid="tab-comparison-btn"
				>
					<Layers size={14} />
					<span>3-Tier Сравнение</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("stages")}
					className={"treatment-presenter-tab-btn " + (activeTab === "stages" ? "active" : "")}
					data-testid="tab-stages-btn"
				>
					<Clock size={14} />
					<span>Клинические этапы</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("roadmap")}
					className={"treatment-presenter-tab-btn " + (activeTab === "roadmap" ? "active" : "")}
					data-testid="tab-roadmap-btn"
				>
					<Calendar size={14} />
					<span>Дорожная карта</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("finance")}
					className={"treatment-presenter-tab-btn " + (activeTab === "finance" ? "active" : "")}
					data-testid="tab-finance-btn"
				>
					<Coins size={14} />
					<span>Финансы & НДФЛ</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("print_appendix")}
					className={"treatment-presenter-tab-btn " + (activeTab === "print_appendix" ? "active" : "")}
					data-testid="tab-print-btn"
				>
					<FileText size={14} />
					<span>Приложение №1</span>
				</button>
			</nav>
			{toolsBarSlot && (
				<div className="shrink-0 flex items-center">
					{toolsBarSlot}
				</div>
			)}
		</div>
	);
};
