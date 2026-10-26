/**
 * Patient Personal Portal - Mobile Bottom Navigation
 * (LAYER 4: PRESENTATION SUBCOMPONENT <= 120 lines)
 */

import React from "react";
import { Activity, Calendar, CreditCard, FileText, Layers, User } from "lucide-react";
import type { PatientCabinetTab } from "./types.js";

export interface PatientCabinetMobileNavProps {
	readonly activeTab: PatientCabinetTab;
	readonly onSelectTab: (tab: PatientCabinetTab) => void;
}

export const PatientCabinetMobileNav: React.FC<PatientCabinetMobileNavProps> = ({
	activeTab,
	onSelectTab,
}) => {
	const mobileNavItems = [
		{ tab: "overview" as const, label: "Обзор", icon: Activity },
		{ tab: "appointments" as const, label: "Записи", icon: Calendar },
		{
			tab: "plans" as const,
			label: "План",
			icon: Layers,
			isMatch: (t: string) => t === "plans" || t === "passport" || t === "treatment_plan" || t === "treatmentPlans",
		},
		{ tab: "invoices" as const, label: "Счета", icon: CreditCard },
		{
			tab: "documents" as const,
			label: "Справки",
			icon: FileText,
			isMatch: (t: string) => t === "documents" || t === "care",
		},
		{ tab: "family" as const, label: "Семья", icon: User },
	];

	return (
		<nav className="pc-mobile-tab-bar" aria-label="Мобильная навигация">
			{mobileNavItems.map((item) => {
				const Icon = item.icon;
				const active = item.isMatch ? item.isMatch(activeTab) : activeTab === item.tab;
				return (
					<button
						key={item.tab}
						type="button"
						className={`pc-mobile-tab-btn ${active ? "active" : ""}`}
						onClick={() => onSelectTab(item.tab)}
					>
						<Icon size={18} />
						<span>{item.label}</span>
					</button>
				);
			})}
		</nav>
	);
};
