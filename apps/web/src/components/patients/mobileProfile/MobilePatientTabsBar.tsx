/**
 * DENTE CRM — Mobile Patient Tabs Bar
 * (Apple HIG & Anti-Desktop-Squeeze Mandate, Segmented Bar >= 44x44px Touch Targets)
 *
 * Layer 4: Segmented Bar Navigation for Sovereign Mobile Patient Profile Tabs.
 */

import {
	Activity,
	Calendar,
	Camera,
	CreditCard,
	FileText,
	Printer,
} from "lucide-react";
import React from "react";
import type { MobilePatientTab } from "./types";

export interface MobilePatientTabsBarProps {
	activeTab: MobilePatientTab;
	onTabChange: (tab: MobilePatientTab) => void;
	visitsCount: number;
	scansCount: number;
	plansCount?: number | undefined;
}

export const MobilePatientTabsBar: React.FC<MobilePatientTabsBarProps> = ({
	activeTab,
	onTabChange,
	visitsCount,
	scansCount,
	plansCount,
}) => {
	return (
		<nav
			className="mobile-profile-chips-scroller"
			role="tablist"
			aria-label="Вкладки профиля пациента"
			data-testid="mobile-profile-tabs-nav"
		>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "card"}
				className={`mobile-tab-chip ${activeTab === "card" ? "active" : ""}`}
				onClick={() => onTabChange("card")}
				data-testid="mobile-tab-card"
			>
				<FileText size={16} />
				<span>Медкарта</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "visits"}
				className={`mobile-tab-chip ${activeTab === "visits" ? "active" : ""}`}
				onClick={() => onTabChange("visits")}
				data-testid="mobile-tab-visits"
			>
				<Calendar size={16} />
				<span>Визиты ({visitsCount})</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "finance"}
				className={`mobile-tab-chip ${activeTab === "finance" ? "active" : ""}`}
				onClick={() => onTabChange("finance")}
				data-testid="mobile-tab-finance"
			>
				<CreditCard size={16} />
				<span>Финансы</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "documents"}
				className={`mobile-tab-chip ${activeTab === "documents" ? "active" : ""}`}
				onClick={() => onTabChange("documents")}
				data-testid="mobile-tab-documents"
			>
				<Printer size={16} />
				<span>Документы</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "scans"}
				className={`mobile-tab-chip ${activeTab === "scans" ? "active" : ""}`}
				onClick={() => onTabChange("scans")}
				data-testid="mobile-tab-scans"
			>
				<Camera size={16} />
				<span>Снимки ({scansCount})</span>
			</button>

			{typeof plansCount === "number" && (
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "plans"}
					className={`mobile-tab-chip ${activeTab === "plans" ? "active" : ""}`}
					onClick={() => onTabChange("plans")}
					data-testid="mobile-tab-plans"
				>
					<Activity size={16} />
					<span>Планы ({plansCount})</span>
				</button>
			)}
		</nav>
	);
};
