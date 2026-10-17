import { Calendar, Camera, Clock, FileText, Wallet } from "lucide-react";
import React from "react";
import type { WorkspaceTabKey } from "./types";

export interface PatientWorkspaceTabsNavProps {
	readonly activeTab: WorkspaceTabKey;
	readonly setActiveTab: (tab: WorkspaceTabKey) => void;
	readonly plansCount: number;
	readonly visitsCount: number;
	readonly scansCount: number;
}

interface TabDef {
	id: WorkspaceTabKey;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	count?: number;
	testId: string;
}

export const PatientWorkspaceTabsNav: React.FC<PatientWorkspaceTabsNavProps> = React.memo(
	({ activeTab, setActiveTab, plansCount, visitsCount, scansCount }) => {
		const tabs: TabDef[] = [
			{ id: "timeline", label: "Обзор и анамнез", icon: Clock, testId: "patient-tab-overview" },
			{ id: "visits", label: "Визиты и ЭМК", icon: Calendar, count: visitsCount, testId: "patient-tab-visits" },
			{ id: "plans", label: "Планы лечения", icon: FileText, count: plansCount, testId: "tab-patient-plans" },
			{ id: "finance", label: "Счета и оплата", icon: Wallet, testId: "patient-tab-finance" },
			{ id: "scans", label: "Снимки и КТ", icon: Camera, count: scansCount, testId: "patient-tab-scans" },
		];

		return (
			<nav
				className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-x-auto max-w-full scrollbar-none"
				aria-label="Вкладки клинической карты"
			>
				{tabs.map((tab) => {
					const isActive = activeTab === tab.id;
					const Icon = tab.icon;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							data-testid={tab.testId}
							className={`min-h-[34px] h-8.5 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
								isActive
									? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
						>
							<Icon className="w-3.5 h-3.5 shrink-0" />
							<span>{tab.label}</span>
							{typeof tab.count === "number" && (
								<span
									className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
										isActive
											? "bg-white/20 text-white"
											: "bg-[var(--line)] text-[var(--ink)]"
									}`}
								>
									{tab.count}
								</span>
							)}
						</button>
					);
				})}
			</nav>
		);
	},
);

PatientWorkspaceTabsNav.displayName = "PatientWorkspaceTabsNav";
