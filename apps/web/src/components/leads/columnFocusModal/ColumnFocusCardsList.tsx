/**
 * DENTE Dental CRM — Column Focus Cards Grid View (Layer 2)
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import { ColumnFocusCardItem } from "./ColumnFocusCardItem";
import type { ColumnFocusCardsListProps } from "./types";

export const ColumnFocusCardsList: React.FC<ColumnFocusCardsListProps> = ({
	displayLeads,
	visibleLeads,
	selectedLeadIds,
	onToggleSelectLead,
	onEditLead,
	onStatusChange,
	onScheduleLead,
	onCreatePatient,
	onClose,
	nextStageInfo,
	visibleLimit,
	onLoadMore,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div className="expanded-focus-cards-grid">
				{visibleLeads.map((lead) => (
					<ColumnFocusCardItem
						key={lead.id}
						lead={lead}
						isSelected={selectedLeadIds.has(lead.id)}
						nextStageInfo={nextStageInfo}
						onToggleSelectLead={onToggleSelectLead}
						onEditLead={onEditLead}
						onStatusChange={onStatusChange}
						onScheduleLead={onScheduleLead}
						onCreatePatient={onCreatePatient}
						onClose={onClose}
					/>
				))}
			</div>
			{visibleLimit < displayLeads.length && (
				<div className="flex justify-center p-3">
					<button
						type="button"
						onClick={onLoadMore}
						className="secondary-button h-8 min-h-[32px] px-4 rounded-lg text-[13px] font-medium cursor-pointer"
					>
						Показать ещё 60 (показано {visibleLeads.length} из{" "}
						{displayLeads.length})
					</button>
				</div>
			)}
		</div>
	);
};
