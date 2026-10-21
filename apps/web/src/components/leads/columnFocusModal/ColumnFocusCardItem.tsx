/**
 * DENTE Dental CRM — Column Focus Card Single Item
 * Mandate 8b (<= 120 lines)
 */

import { CheckSquare, Clock, Square } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import { ColumnFocusCardActions } from "./ColumnFocusCardActions";
import { ColumnFocusCardMetaRow } from "./ColumnFocusCardMetaRow";
import { ColumnFocusCardPhoneRow } from "./ColumnFocusCardPhoneRow";
import { ColumnFocusPatientBadges } from "./ColumnFocusPatientBadges";

interface ColumnFocusCardItemProps {
	lead: Lead;
	isSelected: boolean;
	nextStageInfo?: { status: Lead["status"]; label: string } | null | undefined;
	onToggleSelectLead: (leadId: string, e: React.MouseEvent) => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (leadId: string, status: Lead["status"]) => void;
	onScheduleLead: (id: string) => void;
	onCreatePatient: (lead: Lead) => void;
	onClose: () => void;
}

export const ColumnFocusCardItem: React.FC<ColumnFocusCardItemProps> = ({
	lead,
	isSelected,
	nextStageInfo,
	onToggleSelectLead,
	onEditLead,
	onStatusChange,
	onScheduleLead,
	onCreatePatient,
	onClose,
}) => {
	const sla = getLeadSlaStatus(lead);

	return (
		<div
			className={`expanded-focus-card ${isSelected ? "is-selected" : ""} ${sla.isBreached ? "has-sla-breach" : ""}`}
			onClick={() => onEditLead(lead)}
		>
			<div className="expanded-focus-card-header">
				<div className="flex items-center gap-2 min-w-0">
					<button
						type="button"
						className="expanded-focus-checkbox-btn"
						onClick={(e) => onToggleSelectLead(lead.id, e)}
						aria-label={isSelected ? "Снять выбор" : "Выбрать лид"}
					>
						{isSelected ? (
							<CheckSquare size={16} className="text-[var(--teal)]" />
						) : (
							<Square size={16} className="text-[var(--muted)] opacity-60" />
						)}
					</button>
					<span className="expanded-focus-card-name" title={lead.name}>
						{lead.name}
					</span>
				</div>
				<div
					className={`expanded-focus-sla-badge ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
					style={{
						background: sla.badgeBg,
						color: sla.badgeColor,
						borderColor: sla.badgeBorder,
					}}
					title={`SLA: ${sla.formattedDuration}`}
				>
					<Clock size={11} className="shrink-0" />
					<span>{sla.label}</span>
				</div>
			</div>

			<ColumnFocusPatientBadges lead={lead} onClose={onClose} />
			<ColumnFocusCardPhoneRow lead={lead} />

			{lead.notes && (
				<div className="expanded-focus-card-notes" title={lead.notes}>
					<span className="text-[var(--muted)] font-medium">Запрос: </span>
					<span className="text-[var(--ink)]">{lead.notes}</span>
				</div>
			)}

			<ColumnFocusCardMetaRow lead={lead} />

			<ColumnFocusCardActions
				lead={lead}
				nextStageInfo={nextStageInfo}
				onStatusChange={onStatusChange}
				onScheduleLead={onScheduleLead}
				onCreatePatient={onCreatePatient}
				onClose={onClose}
			/>
		</div>
	);
};
