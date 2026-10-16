import React from "react";
import { FileCheck, FileText, HeartPulse, History, Scan, ShieldCheck, Users, Wallet } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import type { PatientCardTab } from "./patientCardModalTypes";

interface PatientCardModalTabsBarProps {
	readonly activeTab: PatientCardTab;
	readonly onSelectTab: (tab: PatientCardTab) => void;
	readonly onApplyNorm: () => void;
}

const TABS = [
	{ id: "general", testId: "tab-patient-general", label: "Основные", Icon: FileText },
	{ id: "formula", testId: "tab-patient-formula", label: "Формула", Icon: ToothMolar },
	{ id: "anamnesis", testId: "tab-patient-anamnesis", label: "Соматика", Icon: HeartPulse },
	{ id: "visits", testId: "tab-patient-visits", label: "Визиты", Icon: History },
	{ id: "documents", testId: "tab-patient-documents", label: "Документы", Icon: FileCheck },
	{ id: "finance", testId: "tab-patient-finance", label: "Финансы и аванс", Icon: Wallet },
	{ id: "radiology", testId: "tab-patient-radiology", label: "Снимки и КТ", Icon: Scan },
	{ id: "family", testId: "tab-patient-family", label: "Семья", Icon: Users },
] as const;

export const PatientCardModalTabsBar: React.FC<PatientCardModalTabsBarProps> = ({
	activeTab,
	onSelectTab,
	onApplyNorm,
}) => (
	<div className="flex items-center justify-between px-3.5 sm:px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] flex-nowrap overflow-x-auto gap-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth print:hidden">
		<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
			{TABS.map((tab) => {
				const isActive = activeTab === tab.id;
				const Icon = tab.Icon;
				return (
					<button
						key={tab.id}
						type="button"
						data-testid={tab.testId}
						className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
							isActive
								? "border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] shadow-xs font-bold"
								: "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] shadow-2xs font-semibold"
						}`}
						onClick={() => onSelectTab(tab.id as PatientCardTab)}
					>
						<Icon className="w-3.5 h-3.5 shrink-0" />
						<span>{tab.label}</span>
					</button>
				);
			})}
		</div>

		<button
			type="button"
			data-testid="btn-somatic-healthy-norm"
			className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors min-h-[44px] sm:min-h-[32px] h-8 text-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap select-none"
			onClick={onApplyNorm}
			title="Зафиксировать физиологическую норму: соматически здоров"
		>
			<ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
			<span className="shrink-0 whitespace-nowrap">Норма</span>
		</button>
	</div>
);
