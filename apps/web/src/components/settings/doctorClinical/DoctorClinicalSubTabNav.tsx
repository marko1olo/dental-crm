import { FileText, Pill, ShieldCheck, Sparkles, Syringe } from "lucide-react";
import React from "react";

export type DoctorClinicalSubTabKey =
	| "materials"
	| "anesthesia"
	| "templates_043"
	| "prescriptions_107"
	| "standards";

interface DoctorClinicalSubTabNavProps {
	activeTab: DoctorClinicalSubTabKey;
	onTabChange: (tab: DoctorClinicalSubTabKey) => void;
}

const TABS = [
	{ key: "materials" as const, label: "Материалы и протокол", icon: Sparkles },
	{ key: "anesthesia" as const, label: "Анестезия и иглы", icon: Syringe, testId: "doctor-clinical-subtab-anesthesia" },
	{ key: "templates_043" as const, label: "Шаблоны медицинской карты", icon: FileText },
	{ key: "prescriptions_107" as const, label: "Шаблоны рецептов", icon: Pill },
	{ key: "standards" as const, label: "ЭЦП и стандарты врача", icon: ShieldCheck, testId: "doctor-clinical-subtab-standards" },
] as const;

export function DoctorClinicalSubTabNav({ activeTab, onTabChange }: DoctorClinicalSubTabNavProps) {
	return (
		<div className="flex items-center gap-1.5 border-b border-[var(--line)] pb-2 overflow-x-auto">
			{TABS.map((tab) => {
				const Icon = tab.icon;
				const isActive = activeTab === tab.key;
				return (
					<button
						key={tab.key}
						type="button"
						onClick={() => onTabChange(tab.key)}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
							isActive
								? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-2xs"
								: "bg-[var(--paper-card)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
						}`}
						{...("testId" in tab ? { "data-testid": tab.testId } : {})}
					>
						<Icon size={14} />
						<span>{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
}
