import { Calendar, Camera, Clock, FileText } from "lucide-react";
import React from "react";
import type { WorkspaceTabKey } from "./types";

export interface PatientWorkspaceTabsNavProps {
	activeTab: WorkspaceTabKey;
	setActiveTab: (tab: WorkspaceTabKey) => void;
	plansCount: number;
	visitsCount: number;
	scansCount: number;
}

export const PatientWorkspaceTabsNav: React.FC<PatientWorkspaceTabsNavProps> = React.memo(
	({
		activeTab,
		setActiveTab,
		plansCount,
		visitsCount,
		scansCount,
	}) => {
		return (
			<div className="flex items-center gap-0.5 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] flex-nowrap overflow-x-auto h-8 sm:h-9 max-w-full">
				<button
					type="button"
					className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
						activeTab === "timeline"
							? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
							: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
					}`}
					onClick={() => setActiveTab("timeline")}
				>
					<Clock className="w-3 h-3 inline mr-1" />
					Лента
				</button>
				<button
					type="button"
					className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
						activeTab === "plans"
							? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
							: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
					}`}
					onClick={() => setActiveTab("plans")}
					data-testid="tab-patient-plans"
				>
					<FileText className="w-3 h-3 inline mr-1" />
					Планы лечения ({plansCount})
				</button>
				<button
					type="button"
					className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
						activeTab === "visits"
							? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
							: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
					}`}
					onClick={() => setActiveTab("visits")}
				>
					<Calendar className="w-3 h-3 inline mr-1" />
					Визиты ({visitsCount})
				</button>
				<button
					type="button"
					className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
						activeTab === "scans"
							? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
							: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
					}`}
					onClick={() => setActiveTab("scans")}
					data-testid="patient-tab-scans"
				>
					<Camera className="w-3 h-3 inline mr-1" />
					Снимки и КТ ({scansCount})
				</button>
			</div>
		);
	},
);
PatientWorkspaceTabsNav.displayName = "PatientWorkspaceTabsNav";
