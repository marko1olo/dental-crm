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
		<div className="treatment-presenter-nav-row flex items-center justify-between gap-2 px-0 py-1 border-t border-[var(--tp-border)] bg-[var(--tp-surface)] overflow-x-auto scrollbar-none">
			<nav className="treatment-presenter-tabs shrink-0" aria-label="Режимы просмотра">
				<button
					type="button"
					onClick={() => onSelectTab("comparison")}
					className={"treatment-presenter-tab-btn " + (activeTab === "comparison" ? "active" : "")}
					data-testid="tab-comparison-btn"
				>
					<Layers size={14} className="shrink-0" />
					<span className="hidden sm:inline">3-Tier Сравнение</span>
					<span className="sm:hidden">Сравнение</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("stages")}
					className={"treatment-presenter-tab-btn " + (activeTab === "stages" ? "active" : "")}
					data-testid="tab-stages-btn"
				>
					<Clock size={14} className="shrink-0" />
					<span className="hidden sm:inline">Клинические этапы</span>
					<span className="sm:hidden">Этапы</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("roadmap")}
					className={"treatment-presenter-tab-btn " + (activeTab === "roadmap" ? "active" : "")}
					data-testid="tab-roadmap-btn"
				>
					<Calendar size={14} className="shrink-0" />
					<span className="hidden sm:inline">Маршрут</span>
					<span className="sm:hidden">Маршрут</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("finance")}
					className={"treatment-presenter-tab-btn " + (activeTab === "finance" ? "active" : "")}
					data-testid="tab-finance-btn"
				>
					<Coins size={14} className="shrink-0" />
					<span className="hidden sm:inline">Финансы & НДФЛ</span>
					<span className="sm:hidden">Финансы</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("print_appendix")}
					className={"treatment-presenter-tab-btn " + (activeTab === "print_appendix" ? "active" : "")}
					data-testid="tab-print-btn"
				>
					<FileText size={14} className="shrink-0" />
					<span className="hidden sm:inline">Договор (Акт)</span>
					<span className="sm:hidden">Договор</span>
				</button>
			</nav>
			{toolsBarSlot && (
				<div className="shrink-0 flex items-center pr-3">
					{toolsBarSlot}
				</div>
			)}
		</div>
	);
};
