import type React from "react";
import type { ReportSectionTab } from "./ManagerReportsTypes";

export interface ManagerReportsTabsProps {
	readonly activeSection: ReportSectionTab;
	readonly onSelectSection: (section: ReportSectionTab) => void;
}

const REPORT_TABS: readonly { id: ReportSectionTab; label: string }[] = [
	{ id: "all", label: "Все разделы" },
	{ id: "executive", label: "Дашборд KPI" },
	{ id: "revenue", label: "Выручка" },
	{ id: "doctors", label: "Врачи" },
	{ id: "chairs", label: "Кресла" },
	{ id: "services", label: "Услуги" },
	{ id: "schedule", label: "Загрузка" },
	{ id: "receivables", label: "Должники" },
];

export const ManagerReportsTabs: React.FC<ManagerReportsTabsProps> = ({
	activeSection,
	onSelectSection,
}) => {
	return (
		<div
			className="ops-section-tabs mb-3 flex flex-wrap gap-1.5"
			role="tablist"
			aria-label="Разделы отчёта"
		>
			{REPORT_TABS.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={activeSection === tab.id}
					className={`secondary-button ${activeSection === tab.id ? "ops-tab-active font-bold" : ""}`}
					onClick={() => onSelectSection(tab.id)}
					data-testid={`reports-tab-${tab.id}`}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
};
