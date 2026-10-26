import React from "react";
import { Plus, FileText } from "lucide-react";

export type AutoclaveModalTab = "new_cycle" | "sterilization_log" | "journal_257";

export interface AutoclaveLogModalTabsProps {
	readonly activeTab: AutoclaveModalTab;
	readonly onSelectTab: (tab: AutoclaveModalTab) => void;
	readonly recordsCount: number;
}

export const AutoclaveLogModalTabs: React.FC<AutoclaveLogModalTabsProps> = ({
	activeTab,
	onSelectTab,
	recordsCount,
}) => {
	const isLogActive = activeTab === "sterilization_log" || activeTab === "journal_257";

	return (
		<div className="px-6 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center shrink-0">
			<div className="dente-segmented-bar" role="tablist" aria-label="Вкладки журнала контроля автоклавирования">
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "new_cycle"}
					className={`dente-segmented-item ${activeTab === "new_cycle" ? "active" : ""}`}
					onClick={() => onSelectTab("new_cycle")}
				>
					<Plus size={14} className="shrink-0" />
					<span>Новый цикл</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={isLogActive}
					className={`dente-segmented-item ${isLogActive ? "active" : ""}`}
					onClick={() => onSelectTab("sterilization_log")}
					data-testid="tab-sterilization-log-btn"
				>
					<FileText size={14} className="shrink-0" />
					<span>Журнал автоклавирования ({recordsCount})</span>
				</button>
			</div>
		</div>
	);
};

export default AutoclaveLogModalTabs;
