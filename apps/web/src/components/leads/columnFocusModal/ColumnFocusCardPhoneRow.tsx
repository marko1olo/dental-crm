/**
 * DENTE Dental CRM — Column Focus Card Phone Row
 * Mandate 8b (<= 120 lines)
 */

import { MessageSquare, Phone } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";

interface ColumnFocusCardPhoneRowProps {
	lead: Lead;
}

export const ColumnFocusCardPhoneRow: React.FC<ColumnFocusCardPhoneRowProps> = ({ lead }) => {
	return (
		<div className="expanded-focus-card-phone-row">
			{lead.phone ? (
				<div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
					<Phone size={12} className="shrink-0" />
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
							`Здравствуйте, ${lead.name}! Вас беспокоит клиника DENTE.`,
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
				<div />
			)}
			<LeadAudioPlayerWidget
				audioUrl={lead.audioRecordUrl}
				transcriptionSnippet={lead.transcriptionSnippet}
				durationSeconds={lead.audioDurationSeconds}
			/>
		</div>
	);
};
