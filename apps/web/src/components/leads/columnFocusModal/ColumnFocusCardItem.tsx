/**
 * DENTE Dental CRM — Column Focus Card Single Item
 * Mandate 8b (<= 120 lines)
 */

import {
	CheckSquare,
	Clock,
	Globe,
	MessageSquare,
	Phone,
	Square,
	Tag,
} from "lucide-react";
import type React from "react";
import type { Lead } from "../../../store/leadsStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../../telephony/telephonyAttribution";
import { LeadAudioPlayerWidget } from "../LeadAudioPlayerWidget";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import { ColumnFocusCardActions } from "./ColumnFocusCardActions";
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
	const channelKey = lead.source
		? normalizeMarketingChannel(lead.source)
		: null;
	const channelBadge =
		channelKey && CHANNEL_BADGE_COLORS[channelKey]
			? CHANNEL_BADGE_COLORS[channelKey]
			: {
					bg: "var(--teal-soft)",
					color: "var(--teal-dark, var(--teal))",
					border: "var(--teal)",
				};
	const channelLabel =
		channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
			? CHANNEL_DISPLAY_NAMES[channelKey]
			: lead.source;

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

			{lead.notes && (
				<div className="expanded-focus-card-notes" title={lead.notes}>
					<span className="text-[var(--muted)] font-medium">Запрос: </span>
					<span className="text-[var(--ink)]">{lead.notes}</span>
				</div>
			)}

			<div className="expanded-focus-card-meta-row">
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					{lead.source && (
						<span
							className="expanded-focus-channel-badge"
							style={{
								background: channelBadge.bg,
								color: channelBadge.color,
								borderColor: channelBadge.border,
							}}
						>
							<Globe size={10} className="shrink-0" />
							<span>{channelLabel}</span>
						</span>
					)}
					{Array.isArray(lead.clinicalTags) &&
						lead.clinicalTags.map((tag) => (
							<span key={tag} className="expanded-focus-clinical-tag">
								<Tag size={10} className="shrink-0" />
								<span>{tag}</span>
							</span>
						))}
				</div>
				{lead.expectedRevenue ? (
					<span className="expanded-focus-revenue-badge">
						{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
					</span>
				) : null}
			</div>

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
