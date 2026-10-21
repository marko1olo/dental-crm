/**
 * DENTE Dental CRM — Leads Conversion Channel Row
 * Mandate 8b (<= 120 lines)
 */

import { FileText, Globe, ShieldCheck, Tag } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { CHANNEL_BADGE_COLORS } from "../../telephony/telephonyAttribution";
import type { extractLeadAttribution } from "../leadsFunnelEngine";

interface LeadConvertChannelRowProps {
	attribution: ReturnType<typeof extractLeadAttribution>;
	lead: Lead;
}

export const LeadConvertChannelRow: React.FC<LeadConvertChannelRowProps> = ({
	attribution,
	lead,
}) => {
	const channelBadge =
		attribution && CHANNEL_BADGE_COLORS[attribution.channelKey]
			? CHANNEL_BADGE_COLORS[attribution.channelKey]
			: {
					bg: "var(--teal-soft)",
					color: "var(--teal-dark, var(--teal))",
					border: "var(--teal)",
				};

	return (
		<>
			<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						fontSize: 11,
						fontWeight: 600,
						color: channelBadge.color,
						background: channelBadge.bg,
						border: `1px solid ${channelBadge.border}`,
						padding: "2px 7px",
						borderRadius: 5,
					}}
					data-testid="lead-convert-channel-badge"
					title={`Рекламный канал: ${attribution?.channelLabel || lead.source || "Прямое обращение"}`}
				>
					<Globe size={11} className="shrink-0" />
					<span>Канал: {attribution?.channelLabel || lead.source || "Прямое обращение"}</span>
				</div>

				{attribution?.hasUtmTags && (
					<span
						style={{
							fontSize: 10,
							fontWeight: 600,
							background: "var(--teal-soft)",
							color: "var(--teal)",
							border: "1px solid var(--teal)",
							padding: "1px 6px",
							borderRadius: 4,
							display: "inline-flex",
							alignItems: "center",
							gap: 3,
						}}
						title={`UTM Campaign: ${attribution.utm.utm_campaign || "активна"}`}
						data-testid="lead-convert-utm-badge"
					>
						<Tag size={10} />
						<span>UTM сохранены</span>
					</span>
				)}
			</div>

			{attribution?.primaryInquiry && (
				<div
					style={{
						fontSize: 11.5,
						color: "var(--muted)",
						display: "flex",
						alignItems: "flex-start",
						gap: 5,
						marginTop: 2,
					}}
					data-testid="lead-convert-primary-inquiry"
				>
					<FileText size={12} className="shrink-0" style={{ color: "var(--teal)", marginTop: 2 }} />
					<span>
						<strong>Первичный запрос:</strong> {attribution.primaryInquiry}
					</span>
				</div>
			)}

			<div
				style={{
					fontSize: 10.5,
					color: "var(--ok-fg)",
					display: "flex",
					alignItems: "center",
					gap: 4,
					marginTop: 2,
				}}
			>
				<ShieldCheck size={12} className="shrink-0" />
				<span>Источник обращения и первичные жалобы прикрепляются к карте</span>
			</div>
		</>
	);
};
