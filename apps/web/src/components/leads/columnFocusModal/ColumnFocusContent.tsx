/**
 * DENTE Dental CRM — Column Focus Content Router (Cards or Table)
 * Mandate 8b (<= 120 lines)
 */

import { Filter } from "lucide-react";
import React from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";
import { ColumnFocusCardsList } from "./ColumnFocusCardsList";
import { ColumnFocusTableView } from "./ColumnFocusTableView";
import type { NextStageInfo } from "./types";

interface ColumnFocusContentProps {
	displayLeads: Lead[];
	visibleLeads: Lead[];
	columnLeads: Lead[];
	viewMode: "cards" | "table";
	selectedLeadIds: Set<string>;
	nextStageInfo?: NextStageInfo | undefined;
	visibleLimit: number;
	onToggleSelectLead: (id: string) => void;
	onToggleSelectAll: () => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (
		leadId: string,
		status: LeadStatus,
	) => Promise<void> | void;
	onScheduleLead: (id: string) => void;
	onCreatePatient: (lead: Lead) => void;
	onClose: () => void;
	onLoadMore: () => void;
}

export const ColumnFocusContent: React.FC<ColumnFocusContentProps> = ({
	displayLeads,
	visibleLeads,
	columnLeads,
	viewMode,
	selectedLeadIds,
	nextStageInfo,
	visibleLimit,
	onToggleSelectLead,
	onToggleSelectAll,
	onEditLead,
	onStatusChange,
	onScheduleLead,
	onCreatePatient,
	onClose,
	onLoadMore,
}) => {
	if (displayLeads.length === 0) {
		return (
			<div className="expanded-focus-empty-state">
				<Filter size={32} className="text-[var(--muted)] opacity-40 mb-2" />
				<p className="text-[14px] font-semibold text-[var(--ink)]">
					{columnLeads.length === 0
						? "В этом этапе пока нет обращений"
						: "По заданным фильтрам ничего не найдено"}
				</p>
				<p className="text-[12px] text-[var(--muted)] mt-1">
					{columnLeads.length === 0
						? "Новые лиды появятся здесь автоматически"
						: "Попробуйте сбросить поисковый запрос"}
				</p>
			</div>
		);
	}

	if (viewMode === "cards") {
		return (
			<ColumnFocusCardsList
				displayLeads={displayLeads}
				visibleLeads={visibleLeads}
				selectedLeadIds={selectedLeadIds}
				onToggleSelectLead={onToggleSelectLead}
				onEditLead={onEditLead}
				onStatusChange={onStatusChange}
				onScheduleLead={onScheduleLead}
				onCreatePatient={onCreatePatient}
				onClose={onClose}
				nextStageInfo={nextStageInfo}
				visibleLimit={visibleLimit}
				onLoadMore={onLoadMore}
			/>
		);
	}

	return (
		<ColumnFocusTableView
			displayLeads={displayLeads}
			visibleLeads={visibleLeads}
			selectedLeadIds={selectedLeadIds}
			onToggleSelectLead={onToggleSelectLead}
			onToggleSelectAll={onToggleSelectAll}
			onEditLead={onEditLead}
			onStatusChange={onStatusChange}
			onScheduleLead={onScheduleLead}
			onCreatePatient={onCreatePatient}
			onClose={onClose}
			nextStageInfo={nextStageInfo}
			visibleLimit={visibleLimit}
			onLoadMore={onLoadMore}
		/>
	);
};
