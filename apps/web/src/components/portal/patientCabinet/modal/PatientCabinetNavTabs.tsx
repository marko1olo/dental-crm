/**
 * Patient Personal Portal - Navigation Bars
 * (LAYER 4: PRESENTATION SUBCOMPONENT)
 *
 * Provides desktop segmented navigation and mobile bottom navigation (390px PWA)
 * with badge counters for active plans, unpaid invoices, and pending consents.
 */

import React from "react";
import { Activity, Calendar, CreditCard, FileText, Layers, User } from "lucide-react";
import type { PatientCabinetTab } from "./types.js";

export interface PatientCabinetNavTabsProps {
	readonly activeTab: PatientCabinetTab;
	readonly onSelectTab: (tab: PatientCabinetTab) => void;
	readonly activePlansCount?: number | undefined;
	readonly unpaidInvoicesCount?: number | undefined;
	readonly pendingConsentsCount?: number | undefined;
}

export const PatientCabinetNavTabs: React.FC<PatientCabinetNavTabsProps> = ({
	activeTab,
	onSelectTab,
	activePlansCount = 0,
	unpaidInvoicesCount = 0,
	pendingConsentsCount = 0,
}) => {
	const desktopNavItems = [
		{ tab: "overview" as const, label: "Обзор", icon: Activity },
		{ tab: "appointments" as const, label: "Записи", icon: Calendar },
		{
			tab: "plans" as const,
			label: "План лечения",
			icon: Layers,
			isMatch: (t: string) => t === "plans" || t === "passport" || t === "treatment_plan" || t === "treatmentPlans",
			count: activePlansCount,
		},
		{
			tab: "invoices" as const,
			label: "Счета и оплата",
			icon: CreditCard,
			count: unpaidInvoicesCount,
			countBg: "var(--pc-danger)",
		},
		{
			tab: "documents" as const,
			label: "Документы",
			icon: FileText,
			isMatch: (t: string) => t === "documents" || t === "care",
			count: pendingConsentsCount,
			countBg: "var(--pc-warning)",
		},
		{ tab: "family" as const, label: "Семья", icon: User },
	];

	return (
		<nav className="pc-nav-bar" aria-label="Разделы личного кабинета">
			{desktopNavItems.map((item) => {
				const Icon = item.icon;
				const active = item.isMatch ? item.isMatch(activeTab) : activeTab === item.tab;
				return (
					<button
						key={item.tab}
						type="button"
						className={`pc-tab-btn ${active ? "active" : ""}`}
						onClick={() => onSelectTab(item.tab)}
					>
						<Icon size={16} />
						<span>{item.label}</span>
						{typeof item.count === "number" && item.count > 0 && (
							<span
								className="pc-tab-counter"
								style={item.countBg ? { background: item.countBg } : undefined}
							>
								{item.count}
							</span>
						)}
					</button>
				);
			})}
		</nav>
	);
};

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
			label: "Документы",
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

export default PatientCabinetNavTabs;
