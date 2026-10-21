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
				className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-x-auto max-w-full scrollbar-none shadow-2xs"
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
							className={`min-h-[36px] h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
								isActive
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line-strong,rgba(0,0,0,0.08))] font-bold"
									: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60"
							}`}
						>
							<Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[var(--teal)]" : "opacity-70"}`} />
							<span className="whitespace-nowrap">{tab.label}</span>
							{typeof tab.count === "number" && (
								<span
									className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
										isActive
											? "bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border border-[var(--teal,#0d9488)]/25"
											: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
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
