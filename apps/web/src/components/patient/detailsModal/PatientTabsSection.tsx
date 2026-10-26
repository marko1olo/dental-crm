import { FileText, HeartPulse, Users, Wallet } from "lucide-react";
import React from "react";
import type { PatientDetailsTab } from "./patientDetailsTypes";

export interface PatientTabsSectionProps {
	readonly activeTab: PatientDetailsTab;
	readonly onSelectTab: (tab: PatientDetailsTab) => void;
}

export const PatientTabsSection: React.FC<PatientTabsSectionProps> = ({
	activeTab,
	onSelectTab,
}) => {
	const tabs = [
		{ id: "general" as const, testId: "tab-details-general", label: "Основные данные", icon: FileText },
		{ id: "anamnesis" as const, testId: "tab-details-anamnesis", label: "Анамнез и аллергии", icon: HeartPulse },
		{ id: "family" as const, testId: "tab-details-family", label: "Семья и кошелек", icon: Users },
		{ id: "finance" as const, testId: "tab-details-finance", label: "Финансы и аванс", icon: Wallet },
	];

	return (
		<div className="flex items-center px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--paper)] gap-2 overflow-x-auto scrollbar-none shrink-0 print:hidden">
			{tabs.map((tab) => {
				const Icon = tab.icon;
				const isActive = activeTab === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						data-testid={tab.testId}
						onClick={() => onSelectTab(tab.id)}
						className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
							isActive
								? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
								: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<Icon className="w-3.5 h-3.5 shrink-0" />
						<span>{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
};
