/**
 * DENTE Dental CRM — Lead Card Contact Bar (Direct Call, WhatsApp, Audio)
 * Mandate 8b (<= 120 lines)
 */

import { MessageSquare, Phone, PhoneCall } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";

interface LeadCardContactBarProps {
	lead: Lead;
}

export const LeadCardContactBar: React.FC<LeadCardContactBarProps> = ({
	lead,
}) => {
	return (
		<div className="flex items-center justify-between mb-1.5 gap-1.5 min-w-0">
			{lead.phone ? (
				<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] min-w-0">
					<Phone size={12} className="shrink-0" />
					<a
						href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
						onClick={(e) => e.stopPropagation()}
						className="truncate text-inherit no-underline hover:text-[var(--teal)] transition-colors"
						title="Позвонить контакту"
					>
						{lead.phone}
					</a>
					<a
						href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
						onClick={(e) => e.stopPropagation()}
						className="icon-button h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg text-[var(--teal)] hover:bg-[var(--teal-soft)] transition-colors inline-flex items-center justify-center shrink-0"
						title="1-клик перезвон"
						aria-label="1-клик перезвон"
						data-testid={`lead-callback-btn-${lead.id}`}
					>
						<PhoneCall size={14} />
					</a>
					<a
						href={formatWhatsAppUrl(
							lead.phone,
							`Здравствуйте, ${lead.name}! Вас беспокоит стоматологическая клиника DENTE.`,
						)}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => e.stopPropagation()}
						className="icon-button h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft)] border border-[var(--teal)] text-[12px] inline-flex items-center justify-center shrink-0 ml-0.5"
						title="Написать пациенту в WhatsApp"
						aria-label="Написать пациенту в WhatsApp"
						data-testid={`lead-whatsapp-btn-${lead.id}`}
					>
						<MessageSquare size={13} />
					</a>
				</div>
			) : (
				<div />
			)}

			<LeadAudioPlayerWidget
				audioUrl={lead.audioRecordUrl}
				transcriptionSnippet={lead.transcriptionSnippet}
				durationSeconds={lead.audioDurationSeconds}
				compact
			/>
		</div>
	);
};
