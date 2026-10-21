/**
 * DENTE Dental CRM — Lead Card Source & Expected Revenue Indicator
 * Mandate 8b (<= 120 lines)
 */

import { Globe } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";

interface LeadCardSourceRevenueProps {
	lead: Lead;
}

export const LeadCardSourceRevenue: React.FC<LeadCardSourceRevenueProps> = ({
	lead,
}) => {
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
		<div className="flex items-center justify-between mt-1 mb-2 gap-1.5">
			<div
				className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded max-w-[150px] truncate"
				style={{
					color: channelBadge.color,
					background: channelBadge.bg,
					border: `1px solid ${channelBadge.border}`,
				}}
				title={`Источник: ${channelLabel || "Прямое обращение"}`}
				data-testid={`lead-channel-badge-${lead.id}`}
			>
				<Globe size={10} className="shrink-0" />
				<span className="truncate">{channelLabel || "Прямой звонок"}</span>
			</div>
			{lead.expectedRevenue ? (
				<div className="text-[12px] font-semibold text-[var(--ink)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded shrink-0 font-mono">
					{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
				</div>
			) : null}
		</div>
	);
};
