import React from "react";
import { Clock } from "lucide-react";
import { ToothShadeGuide, DentalBridge, DentalLabOrder } from "../../icons/DentalIcons";
import type { LabModalTabKey } from "../useDentalLabOrderForm";

export interface DentalLabOrderModalTabsProps {
	activeTab: LabModalTabKey;
	setActiveTab: (tab: LabModalTabKey) => void;
}

const TABS = [
	{ id: "main" as const, label: "1. Зубы и Конструкция", short: "1. Зубы", icon: DentalBridge },
	{ id: "shades" as const, label: "2. Цвет зуба (шкала оттенков)", short: "2. Цвет", icon: ToothShadeGuide },
	{ id: "stages" as const, label: "3. Этапы и Сроки", short: "3. Сроки", icon: Clock },
	{ id: "print" as const, label: "4. Бланк наряда", short: "4. Бланк", icon: DentalLabOrder },
];

export function DentalLabOrderModalTabs({ activeTab, setActiveTab }: DentalLabOrderModalTabsProps) {
	return (
		<div className="flex items-center gap-1 px-3 sm:px-6 py-1.5 border-b border-[var(--line)] bg-[var(--paper-soft)] text-xs shrink-0 overflow-x-auto whitespace-nowrap">
			{TABS.map((t) => {
				const Icon = t.icon;
				const isActive = activeTab === t.id;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => setActiveTab(t.id)}
						className={`min-h-[34px] h-[34px] px-3 rounded-lg flex items-center gap-1.5 font-bold transition cursor-pointer ${
							isActive
								? "bg-[var(--paper)] text-[var(--primary)] border border-[var(--line)] shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
					>
						<Icon className="w-4 h-4 shrink-0" />
						<span className="hidden sm:inline">{t.label}</span>
						<span className="sm:hidden">{t.short}</span>
					</button>
				);
			})}
		</div>
	);
}
