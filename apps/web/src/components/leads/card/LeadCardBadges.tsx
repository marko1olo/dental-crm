/**
 * DENTE Dental CRM — Lead Card Badges & Indicators
 * SLA Urgency, Existing Patient, Drop Reason, Source, Revenue, Tags, Notes
 */

import React from "react";
import { Clock, FileText, Globe, Tag, UserCheck } from "lucide-react";
import type { Lead } from "../../../store/leadsStore";
import type { LeadSlaInfo } from "../leadsKanbanSla";
import { CHANNEL_BADGE_COLORS, CHANNEL_DISPLAY_NAMES } from "../../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";

interface LeadCardBadgesProps {
	lead: Lead;
	sla: LeadSlaInfo;
	dropReasonMatch: string | null;
	onOpenPatient: (e: React.MouseEvent, patientId: string) => void;
	formatTimestamp: (val?: string | Date | null) => string;
}

export const LeadCardBadges: React.FC<LeadCardBadgesProps> = ({
	lead, sla, dropReasonMatch, onOpenPatient, formatTimestamp,
}) => {
	const channelKey = lead.source ? normalizeMarketingChannel(lead.source) : null;
	const channelBadge = channelKey && CHANNEL_BADGE_COLORS[channelKey]
		? CHANNEL_BADGE_COLORS[channelKey]
		: { bg: "var(--teal-soft)", color: "var(--teal-dark, var(--teal))", border: "var(--teal)" };
	const channelLabel = channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
		? CHANNEL_DISPLAY_NAMES[channelKey]
		: lead.source;

	return (
		<>
			<div className="flex items-center gap-1.5 flex-wrap mb-1.5">
				<div
					className={`lead-card-sla-badge ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
					style={{
						background: sla.badgeBg, color: sla.badgeColor, border: `1px solid ${sla.badgeBorder}`,
						fontSize: 10.5, fontWeight: 600, padding: "1px 6px", borderRadius: 5,
						display: "inline-flex", alignItems: "center", gap: 3.5, width: "fit-content",
					}}
					title={`SLA: ${sla.formattedDuration}`}
					data-testid={`lead-sla-badge-${lead.id}`}
				>
					<Clock size={10} className="shrink-0" />
					<span>{sla.label}</span>
				</div>
				{lead.createdAt && (
					<span className="text-[10.5px] text-[var(--muted)] font-mono flex items-center gap-1 shrink-0" data-testid={`lead-timestamp-${lead.id}`}>
						<span>{formatTimestamp(lead.createdAt)}</span>
					</span>
				)}
			</div>

			{lead.existingPatient && (
				<div
					style={{
						background: "var(--amber-soft, rgba(245, 158, 11, 0.15))",
						color: "var(--amber-dark, var(--ink))",
						border: "1px solid var(--amber, #f59e0b)",
						fontSize: 10.5,
						fontWeight: 700,
						padding: "2px 7px",
						borderRadius: 6,
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						marginBottom: 6,
						width: "fit-content",
						cursor: "pointer",
					}}
					onClick={(e) => onOpenPatient(e, lead.existingPatient!.id)}
					title={`Номер телефона совпадает с базой пациентов: ${lead.existingPatient.fullName}. Нажмите, чтобы открыть карту пациента в 1 клик.`}
					data-testid={`lead-existing-patient-badge-${lead.id}`}
				>
					<UserCheck size={11} className="shrink-0 text-[var(--amber)]" />
					<span>⚠️ Повторный пациент: {lead.existingPatient.fullName}</span>
				</div>
			)}

			{lead.status === "trash" && dropReasonMatch && (
				<div
					style={{
						display: "inline-flex", alignItems: "center", gap: 4, background: "var(--rust-soft, rgba(239, 68, 68, 0.12))",
						color: "var(--rust, #ef4444)", border: "1px solid var(--rust-soft, rgba(239, 68, 68, 0.35))",
						borderRadius: 5, padding: "1px 6px", fontSize: 10.5, fontWeight: 600, marginBottom: 6, marginLeft: 4,
					}}
					title={`Причина срыва: ${dropReasonMatch}`}
					data-testid={`lead-drop-reason-badge-${lead.id}`}
				>
					<span>Срыв: {dropReasonMatch}</span>
				</div>
			)}

			{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 && (
				<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
					{lead.clinicalTags.map((tag) => (
						<span
							key={tag}
							style={{
								fontSize: 10.5,
								fontWeight: 600,
								background: "var(--teal-soft)",
								color: "var(--teal-dark, var(--teal))",
								border: "1px solid var(--teal)",
								padding: "1px 6px",
								borderRadius: 4,
								display: "inline-flex",
								alignItems: "center",
								gap: 3.5,
							}}
							title={`Желаемая услуга / направление: ${tag}`}
						>
							<Tag size={9} />
							<span>Услуга: {tag}</span>
						</span>
					))}
				</div>
			)}

			{lead.notes && (
				<div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)", background: "var(--paper-soft)", padding: "3px 7px", borderRadius: 6, marginBottom: 6, minWidth: 0 }} title={`Примечание: ${lead.notes}`}>
					<FileText size={11} className="shrink-0" style={{ color: "var(--teal)" }} />
					<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{lead.notes}</span>
				</div>
			)}

			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px", marginBottom: "8px", gap: 6 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: channelBadge.color, background: channelBadge.bg, border: `1px solid ${channelBadge.border}`, padding: "2px 6px", borderRadius: 4, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Источник: ${channelLabel || "Прямое обращение"}`} data-testid={`lead-channel-badge-${lead.id}`}>
					<Globe size={10} className="shrink-0" />
					<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channelLabel || "Прямой звонок"}</span>
				</div>
				{lead.expectedRevenue ? (
					<div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", background: "var(--paper-soft)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
						{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
					</div>
				) : null}
			</div>
		</>
	);
};
