/**
 * DENTE Dental CRM — Column Focus Spreadsheet Table Row
 * Mandate 8b (<= 120 lines)
 */

import { CheckSquare, Square } from "lucide-react";
import type React from "react";
import type { Lead } from "../../../store/leadsStore";
import { CHANNEL_DISPLAY_NAMES } from "../../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import { ColumnFocusTableContactCells } from "./ColumnFocusTableContactCells";
import { ColumnFocusTableNameCell } from "./ColumnFocusTableNameCell";
import { ColumnFocusTableRowActions } from "./ColumnFocusTableRowActions";

interface ColumnFocusTableRowProps {
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

export const ColumnFocusTableRow: React.FC<ColumnFocusTableRowProps> = ({
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
	const dropReasonMatch = lead.dropReason || null;
	const channelKey = lead.source
		? normalizeMarketingChannel(lead.source)
		: null;
	const channelLabel =
		channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
			? CHANNEL_DISPLAY_NAMES[channelKey]
			: lead.source || "—";

	return (
		<tr
			className={`expanded-focus-tr ${isSelected ? "is-selected" : ""} ${sla.isBreached ? "is-breached-row" : ""}`}
			onClick={() => onEditLead(lead)}
		>
			<td style={{ textAlign: "center" }}>
				<button
					type="button"
					className="expanded-focus-checkbox-btn"
					aria-label="Выбрать строку"
					onClick={(e) => {
						e.stopPropagation();
						onToggleSelectLead(lead.id, e);
					}}
				>
					{isSelected ? (
						<CheckSquare size={14} className="text-[var(--teal)]" />
					) : (
						<Square size={14} className="text-[var(--muted)] opacity-60" />
					)}
				</button>
			</td>

			<td>
				<ColumnFocusTableNameCell
					lead={lead}
					onEditLead={onEditLead}
					onClose={onClose}
				/>
			</td>

			<ColumnFocusTableContactCells
				lead={lead}
				channelLabel={channelLabel}
				dropReasonMatch={dropReasonMatch}
			/>

			<td>
				<span
					className={`expanded-focus-table-sla ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
					style={{
						background: sla.badgeBg,
						color: sla.badgeColor,
						borderColor: sla.badgeBorder,
					}}
					title={`SLA: ${sla.formattedDuration}`}
				>
					{sla.label}
				</span>
			</td>

			<td style={{ textAlign: "right" }}>
				{lead.expectedRevenue ? (
					<span className="font-semibold text-[var(--ink)] text-[12px]">
						{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
					</span>
				) : (
					<span className="text-[var(--muted)]">—</span>
				)}
			</td>

			<td style={{ textAlign: "right" }}>
				<ColumnFocusTableRowActions
					lead={lead}
					nextStageInfo={nextStageInfo}
					onStatusChange={onStatusChange}
					onScheduleLead={onScheduleLead}
					onCreatePatient={onCreatePatient}
					onClose={onClose}
				/>
			</td>
		</tr>
	);
};
