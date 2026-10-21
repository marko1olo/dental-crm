/**
 * DENTE Dental CRM — Column Focus Card Meta Row
 * Mandate 8b (<= 120 lines)
 */

import { Globe, Tag } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";

interface ColumnFocusCardMetaRowProps {
	lead: Lead;
}

export const ColumnFocusCardMetaRow: React.FC<ColumnFocusCardMetaRowProps> = ({ lead }) => {
	const channelKey = lead.source ? normalizeMarketingChannel(lead.source) : null;
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
	);
};
