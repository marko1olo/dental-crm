/**
 * DENTE Dental CRM — Column Focus Spreadsheet Table Contact Cells
 * Mandate 8b (<= 120 lines)
 */

import { MessageSquare } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";

interface ColumnFocusTableContactCellsProps {
	lead: Lead;
	channelLabel: string;
	dropReasonMatch: string | null;
}

export const ColumnFocusTableContactCells: React.FC<
	ColumnFocusTableContactCellsProps
> = ({ lead, channelLabel, dropReasonMatch }) => {
	return (
		<>
			<td>
				{lead.phone ? (
					<div className="flex items-center gap-1.5">
						<a
							href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
							onClick={(e) => e.stopPropagation()}
							className="expanded-focus-phone-link"
						>
							{lead.phone}
						</a>
						<a
							href={formatWhatsAppUrl(
								lead.phone,
								`Здравствуйте, ${lead.name}! Вас беспокоит DENTE.`,
							)}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) => e.stopPropagation()}
							className="expanded-focus-whatsapp-link"
							title="Написать в WhatsApp"
						>
							<MessageSquare size={11} />
						</a>
					</div>
				) : (
					<span className="text-[var(--muted)]">—</span>
				)}
			</td>

			<td>
				<span
					className="expanded-focus-table-source"
					title={`Канал: ${channelLabel}`}
				>
					{channelLabel}
				</span>
			</td>

			<td>
				<div className="expanded-focus-table-notes" title={lead.notes || ""}>
					{lead.status === "trash" && dropReasonMatch && (
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/30 mr-1 shrink-0">
							Срыв: {dropReasonMatch}
						</span>
					)}
					{lead.notes || <span className="text-[var(--muted)]">—</span>}
				</div>
			</td>

			<td>
				<LeadAudioPlayerWidget
					audioUrl={lead.audioRecordUrl}
					transcriptionSnippet={lead.transcriptionSnippet}
					durationSeconds={lead.audioDurationSeconds}
					compact
				/>
			</td>
		</>
	);
};
