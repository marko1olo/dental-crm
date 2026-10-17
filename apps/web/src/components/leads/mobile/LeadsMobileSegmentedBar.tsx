/**
 * DENTE Dental CRM — Leads Mobile Segmented Stage Control & SLA Banner
 * Mandate 8b (<= 120 lines), Apple HIG
 */

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { LeadStatus } from "../../../store/leadsStore";

interface LeadsMobileSegmentedBarProps {
	activeTab: LeadStatus | "all";
	setActiveTab: (tab: LeadStatus | "all") => void;
	counts: Record<string, number>;
	breachedCount: number;
}

const TABS: { id: LeadStatus | "all"; label: string; testId: string }[] = [
	{ id: "new", label: "Новый", testId: "mobile-tab-new" },
	{ id: "contacted", label: "Думает", testId: "mobile-tab-contacted" },
	{ id: "consult_booked", label: "Записан", testId: "mobile-tab-consult_booked" },
	{ id: "showed_up", label: "Дошли", testId: "mobile-tab-showed_up" },
	{ id: "no_answer", label: "Недозвон", testId: "mobile-tab-no_answer" },
	{ id: "trash", label: "Отказ", testId: "mobile-tab-trash" },
	{ id: "all", label: "Все", testId: "mobile-tab-all" },
];

export const LeadsMobileSegmentedBar: React.FC<LeadsMobileSegmentedBarProps> = ({
	activeTab, setActiveTab, counts, breachedCount,
}) => {
	return (
		<>
			<div className="leads-mobile-segmented-wrap dente-segmented-bar" role="tablist" aria-label="Статусы воронки">
				<div className="leads-mobile-segmented-scroller">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							role="tab"
							aria-selected={activeTab === t.id}
							onClick={() => setActiveTab(t.id)}
							className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === t.id ? "is-active active" : ""}`}
							data-testid={t.testId}
						>
							<span>{t.label}</span>
							<span className="leads-mobile-seg-count">{counts[t.id] || 0}</span>
						</button>
					))}
				</div>
			</div>

			{breachedCount > 0 && (
				<div
					onClick={() => setActiveTab("new")}
					className="leads-mobile-sla-alert"
					title="Нажмите для перехода к просроченным обращениям"
					data-testid="mobile-sla-alert-banner"
				>
					<div className="leads-mobile-sla-alert-text">
						<AlertTriangle size={16} className="shrink-0" />
						<span>Внимание: {breachedCount} обр. ждут ответа {">"} 15 мин!</span>
					</div>
					<span className="text-[12px] underline shrink-0">Открыть →</span>
				</div>
			)}
		</>
	);
};
